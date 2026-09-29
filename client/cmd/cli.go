package cmd

import (
	"bufio"
	"fmt"
	"os"
	"os/exec"
	"strings"

	"ugondu/client/engine"
	"ugondu/client/i18n"
)

// Levenshtein computes the edit distance between two strings
func Levenshtein(a, b string) int {
	d := make([][]int, len(a)+1)
	for i := range d {
		d[i] = make([]int, len(b)+1)
		d[i][0] = i
	}
	for j := range d[0] {
		d[0][j] = j
	}
	for i := 1; i <= len(a); i++ {
		for j := 1; j <= len(b); j++ {
			cost := 1
			if a[i-1] == b[j-1] {
				cost = 0
			}
			min := d[i-1][j] + 1
			if d[i][j-1]+1 < min {
				min = d[i][j-1] + 1
			}
			if d[i-1][j-1]+cost < min {
				min = d[i-1][j-1] + cost
			}
			d[i][j] = min
		}
	}
	return d[len(a)][len(b)]
}

// SuggestCommand finds the closest matching command if the user made a typo
func SuggestCommand(input string, valid []string) string {
	bestMatch := ""
	minDist := 999
	for _, cmd := range valid {
		dist := Levenshtein(input, cmd)
		if dist < minDist && dist <= 2 { // threshold
			minDist = dist
			bestMatch = cmd
		}
	}
	return bestMatch
}

// PromptDestructive asks the user for confirmation before wiping data unless --force is passed
func PromptDestructive(targetPath string, force bool) bool {
	if force {
		return true
	}
	fmt.Printf(i18n.T("prompt_destructive", targetPath))
	reader := bufio.NewReader(os.Stdin)
	response, _ := reader.ReadString('\n')
	response = strings.TrimSpace(strings.ToLower(response))
	return response == "y" || response == "yes"
}

// PrintHelp outputs the CLI documentation
func PrintHelp() {
	fmt.Println(i18n.T("cli_title"))
	fmt.Println(i18n.T("cli_subtitle"))
	fmt.Println("─────────────────────────────────────────────────────────────")
	fmt.Println(i18n.T("cmd_usage"))
	fmt.Println("  deploy    - " + i18n.T("cmd_deploy_desc"))
	fmt.Println("  rollback  - " + i18n.T("cmd_rollback_desc"))
	fmt.Println("  plugins   - " + i18n.T("cmd_plugins_desc"))
	fmt.Println("  version   - " + i18n.T("cmd_version_desc"))
	fmt.Println("  help      - " + i18n.T("cmd_help_desc"))
	fmt.Println("\n" + i18n.T("env_vars"))
	fmt.Println("  " + i18n.T("env_token"))
	fmt.Println("  " + i18n.T("env_api_url"))
	fmt.Println("  " + i18n.T("env_target_env"))
	fmt.Println("  " + i18n.T("env_locale"))
}

// ParseAndRun interprets the arguments and routes to the engine
func ParseAndRun(args []string) {
	validCommands := []string{"deploy", "rollback", "plugins", "version", "help"}

	if len(args) < 2 {
		fmt.Println(i18n.T("err_no_command"))
		PrintHelp()
		os.Exit(1)
	}

	command := args[1]

	// Fuzzy Matching Auto-Correct
	isValid := false
	for _, v := range validCommands {
		if command == v {
			isValid = true
			break
		}
	}

	if !isValid {
		suggestion := SuggestCommand(command, validCommands)
		fmt.Println(i18n.T("err_unknown_cmd", command))
		if suggestion != "" {
			fmt.Println(i18n.T("did_you_mean", suggestion))
		}
		os.Exit(1)
	}

	// Environment variable gathering
	token := os.Getenv("UGONDU_TOKEN")
	if token == "" {
		fmt.Println(i18n.T("community_fallback"))
	}
	apiURL := os.Getenv("UGONDU_API_URL")
	if apiURL == "" {
		apiURL = "https://api.ugondu.airroofers.eu/v1"
	}
	targetEnv := os.Getenv("UGONDU_TARGET_ENV")
	if targetEnv == "" {
		targetEnv = "cpanel" // Default
	}

	force := false
	for _, arg := range args {
		if arg == "--force" || arg == "-f" {
			force = true
		}
	}

	switch command {
	case "deploy":
		if _, err := os.Stat(".git"); os.IsNotExist(err) {
			fmt.Println(i18n.T("err_not_repo"))
			os.Exit(1)
		}

		// Simple destructive prompt test for demo
		if !PromptDestructive("public_html", force) {
			fmt.Println(i18n.T("aborting"))
			os.Exit(0)
		}

		ctx := &engine.DeploymentContext{
			RepositoryUrl:     getGitRemoteUrl(),
			Branch:            getGitBranch(),
			TargetEnvironment: targetEnv,
			Token:             token,
			FileMap:           make(map[string]string),
		}

		fmt.Println("─────────────────────────────────────────────────────────────")
		fmt.Println(i18n.T("repo_info", ctx.RepositoryUrl, ctx.Branch, ctx.TargetEnvironment))
		fmt.Println("─────────────────────────────────────────────────────────────")

		recipe, err := engine.FetchExecutionRecipe(apiURL, ctx)
		if err != nil {
			fmt.Printf("%v\n", err)
			os.Exit(1)
		}

		fmt.Println(i18n.T("recipe_resolved", recipe.TransactionId, recipe.Edition, recipe.Strategy))
		
		logs, err := engine.ExecuteRecipe(recipe)
		if err != nil {
			fmt.Println(i18n.T("exec_failed", err))
			engine.ReportTelemetry(apiURL, recipe.TransactionId, "FAILED", append(logs, err.Error()))
			os.Exit(1)
		}

		engine.ReportTelemetry(apiURL, recipe.TransactionId, "SUCCESS", logs)
		fmt.Println(i18n.T("dep_complete"))

	case "rollback":
		// Mock implementation just to show the CLI upgrade hint interception
		fmt.Println(i18n.T("upsell_notice", "Upgrade to Ugondu Professional to enable one-click atomic rollbacks."))
	case "plugins":
		fmt.Println(i18n.T("upsell_notice", "Upgrade to Ugondu Professional to remotely manage plugins via CLI."))
	case "version":
		fmt.Println(i18n.T("cli_title"))
	case "help":
		PrintHelp()
	}
}

// Helpers for git
func getGitRemoteUrl() string {
	out, err := runGit("config", "--get", "remote.origin.url")
	if err != nil {
		return "local-repo"
	}
	return strings.TrimSpace(out)
}

func getGitBranch() string {
	out, err := runGit("rev-parse", "--abbrev-ref", "HEAD")
	if err != nil {
		return "main"
	}
	return strings.TrimSpace(out)
}

func runGit(args ...string) (string, error) {
	cmd := exec.Command("git", args...)
	out, err := cmd.Output()
	return string(out), err
}
