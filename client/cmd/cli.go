/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : client/cmd
 * File           : cli.go
 * Version        : 1.2.0
 * Author         : Ujomor Systems Engineering Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Last Modified  : 2026-09-30
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Corporate Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS
 * - NIST
 *
 * Signatures:
 * - Architecture Authority
 * - Security Authority
 * - Governance Authority
 * - Deployment Authority
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

package cmd

import (
	"bufio"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"ugondu/client/engine"
	"ugondu/client/engine/adapters"
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
		if dist < minDist && dist <= 2 {
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
	fmt.Println(i18n.T("cli_divider"))
	fmt.Println(i18n.T("cmd_usage"))
	fmt.Println(i18n.T("cmd_deploy_help"))
	fmt.Println(i18n.T("cmd_resume_help"))
	fmt.Println(i18n.T("cmd_status_help"))
	fmt.Println(i18n.T("cmd_rollback_help"))
	fmt.Println(i18n.T("cmd_plugins_help"))
	fmt.Println(i18n.T("cmd_locale_help"))
	fmt.Println(i18n.T("cmd_version_help"))
	fmt.Println(i18n.T("cmd_help_help"))
	fmt.Println("\n" + i18n.T("env_vars"))
	fmt.Println("  " + i18n.T("env_token"))
	fmt.Println("  " + i18n.T("env_api_url"))
	fmt.Println("  " + i18n.T("env_target_env"))
	fmt.Println("  " + i18n.T("env_locale"))
}

// SaveTransactionRecipe persists recipe under ~/.ugondu/transactions/<txId>/recipe.json
func SaveTransactionRecipe(txId string, recipeData []byte) error {
	txDir, err := engine.GetTransactionDir(txId)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(txDir, 0700); err != nil {
		return err
	}
	_ = os.Chmod(txDir, 0700)
	recipePath := filepath.Join(txDir, "recipe.json")
	return os.WriteFile(recipePath, recipeData, 0600)
}

// LoadTransactionRecipe reads recipe from ~/.ugondu/transactions/<txId>/recipe.json
func LoadTransactionRecipe(txId string) ([]byte, error) {
	txDir, err := engine.GetTransactionDir(txId)
	if err != nil {
		return nil, err
	}
	recipePath := filepath.Join(txDir, "recipe.json")
	return os.ReadFile(recipePath)
}

// FindLatestTransactionId scans ~/.ugondu/transactions/ for the latest transaction directory
func FindLatestTransactionId() (string, error) {
	txBaseDir, err := engine.GetTransactionsDir()
	if err != nil {
		return "", err
	}
	entries, err := os.ReadDir(txBaseDir)
	if err != nil {
		return "", fmt.Errorf(i18n.T("unable_to_read_transactions_directory"), err)
	}

	var latestTxId string
	var latestModTime time.Time

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		txName := entry.Name()
		txPath := filepath.Join(txBaseDir, txName)

		var modTime time.Time
		statePath := filepath.Join(txPath, "state.json")
		recipePath := filepath.Join(txPath, "recipe.json")

		if sInfo, err := os.Stat(statePath); err == nil {
			modTime = sInfo.ModTime()
		} else if rInfo, err := os.Stat(recipePath); err == nil {
			modTime = rInfo.ModTime()
		} else if dInfo, err := entry.Info(); err == nil {
			modTime = dInfo.ModTime()
		}

		if latestTxId == "" || modTime.After(latestModTime) {
			latestTxId = txName
			latestModTime = modTime
		}
	}

	if latestTxId == "" {
		return "", fmt.Errorf(i18n.T("no_transactions_found_in"), txBaseDir)
	}

	return latestTxId, nil
}

func resumeDeployment(targetTxId string, apiURL string) {
	txId := targetTxId
	if txId == "" {
		latest, err := FindLatestTransactionId()
		if err != nil {
			fmt.Println(i18n.T("err_cannot_resume", err))
			os.Exit(1)
		}
		txId = latest
	}

	fmt.Println(i18n.T("resuming_deployment", txId))

	recipeData, err := LoadTransactionRecipe(txId)
	if err != nil {
		fmt.Println(i18n.T("no_prev_deployment"))
		os.Exit(1)
	}

	env, steps, err := engine.ParseRecipeLocally(recipeData, apiURL)
	if err != nil {
		fmt.Println(i18n.T("resume_parse_fail", err))
		os.Exit(1)
	}

	logs, err := engine.ExecuteRecipe(env, steps)
	if err != nil {
		fmt.Println(i18n.T("exec_failed", err))
		engine.ReportTelemetry(apiURL, env.TransactionId, "FAILED", append(logs, err.Error()))
		os.Exit(1)
	}

	engine.ReportTelemetry(apiURL, env.TransactionId, "SUCCESS", logs)
	fmt.Println(i18n.T("dep_complete"))
	os.Exit(0)
}

// ParseAndRun interprets the arguments and routes to the engine
func ParseAndRun(args []string) {
	var cleanedArgs []string
	var cliLocale string
	systemLocaleMode := false

	for i := 1; i < len(args); i++ {
		arg := args[i]
		if (arg == "--locale" || arg == "-L") && i+1 < len(args) {
			cliLocale = args[i+1]
			i++
		} else if strings.HasPrefix(arg, "--locale=") {
			cliLocale = strings.TrimPrefix(arg, "--locale=")
		} else if arg == "--system-locale" {
			systemLocaleMode = true
		} else {
			cleanedArgs = append(cleanedArgs, arg)
		}
	}

	if systemLocaleMode {
		det := i18n.DetectEnvironmentLocale()
		i18n.SetLocaleWithSource(det.Normalized, i18n.SourceOSDetection)
	} else if cliLocale != "" {
		i18n.SetLocaleWithSource(cliLocale, i18n.SourceCliFlag)
	} else {
		loc, src := i18n.ResolveEffectiveLocale("")
		i18n.SetLocaleWithSource(loc, src)
	}

	validCommands := []string{"deploy", "resume", "status", "rollback", "plugins", "locale", "version", "help", "auth"}

	if len(cleanedArgs) < 1 {
		fmt.Println(i18n.T("err_no_command"))
		PrintHelp()
		os.Exit(1)
	}

	command := cleanedArgs[0]

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
		targetEnv = "cpanel"
	}

	force := false
	resume := false
	var positional []string

	for _, arg := range cleanedArgs[1:] {
		if arg == "--force" || arg == "-f" {
			force = true
		} else if arg == "--resume" || arg == "-r" {
			resume = true
		} else if !strings.HasPrefix(arg, "-") {
			positional = append(positional, arg)
		}
	}

	var targetTxId string
	if len(positional) > 0 {
		targetTxId = positional[0]
	}

	switch command {
	case "deploy":
		if resume {
			resumeDeployment(targetTxId, apiURL)
			return
		}

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

		fmt.Println("💡")
		fmt.Println(i18n.T("repo_info", ctx.RepositoryUrl, ctx.Branch, ctx.TargetEnvironment))
		fmt.Println("💡")

		env, steps, rawRecipe, err := engine.FetchExecutionRecipe(apiURL, ctx)
		if err != nil {
			fmt.Printf("%v\n", err)
			os.Exit(1)
		}

		// Save recipe under ~/.ugondu/transactions/<txId>/recipe.json for future resume
		if err := SaveTransactionRecipe(env.TransactionId, rawRecipe); err != nil {
			fmt.Println(i18n.T("warn_persist_recipe", err))
		}

		fmt.Println(i18n.T("recipe_resolved", env.TransactionId, env.Edition, i18n.T("strategy_atomic_or_quota")))

		logs, err := engine.ExecuteRecipe(env, steps)
		if err != nil {
			fmt.Println(i18n.T("exec_failed", err))
			engine.ReportTelemetry(apiURL, env.TransactionId, "FAILED", append(logs, err.Error()))
			os.Exit(1)
		}

		engine.ReportTelemetry(apiURL, env.TransactionId, "SUCCESS", logs)
		fmt.Println(i18n.T("dep_complete"))

	case "resume":
		resumeDeployment(targetTxId, apiURL)

	case "status":
		txId := targetTxId
		if txId == "" {
			latest, err := FindLatestTransactionId()
			if err != nil {
				fmt.Println(i18n.T("err_no_tx_found", err))
				os.Exit(1)
			}
			txId = latest
		}

		state, err := engine.LoadState(txId)
		if err != nil {
			if errors.Is(err, engine.ErrStateNotFound) {
				fmt.Println(i18n.T("err_tx_state_not_found", txId))
				os.Exit(1)
			} else if errors.Is(err, engine.ErrStateCorrupt) {
				fmt.Println(i18n.T("err_tx_state_corrupt", txId))
				os.Exit(1)
			}
			fmt.Println(i18n.T("err_tx_state_load", txId, err))
			os.Exit(1)
		}

		fmt.Println(i18n.T("status_border"))
		fmt.Println(i18n.T("status_lbl_tx_id", state.TransactionId))
		fmt.Println(i18n.T("status_lbl_status", state.Status))
		fmt.Println(i18n.T("status_lbl_tenant_id", state.TenantId))
		fmt.Println(i18n.T("status_lbl_project_id", state.ProjectId))
		fmt.Println(i18n.T("status_lbl_env_id", state.EnvironmentId))
		fmt.Println(i18n.T("status_lbl_plan_hash", state.PlanHash))
		fmt.Println(i18n.T("status_lbl_policy_hash", state.PolicyHash))
		fmt.Println(i18n.T("status_lbl_state_hash", state.StateHash))
		if state.UpdatedAt > 0 {
			fmt.Println(i18n.T("status_lbl_last_updated", time.Unix(state.UpdatedAt, 0).UTC().Format(time.RFC3339)))
		}
		fmt.Println(i18n.T("status_divider"))
		fmt.Println(i18n.T("status_lbl_steps"))
		if len(state.Steps) == 0 {
			fmt.Println(i18n.T("status_lbl_no_steps"))
		}
		for _, s := range state.Steps {
			fmt.Println(i18n.T("status_lbl_step_item", s.Index+1, s.Action, s.Status))
			for _, logLine := range s.Logs {
				fmt.Println(i18n.T("status_lbl_log_item", logLine))
			}
		}
		fmt.Println(i18n.T("status_border"))

	case "rollback":
		fmt.Println(i18n.T("upsell_notice", i18n.T("upsell_rollback")))
	case "plugins":
		fmt.Println(i18n.T("upsell_notice", i18n.T("upsell_plugins")))
	case "locale":
		RunLocaleCommand(positional)
	case "version":
		fmt.Println(i18n.T("cli_title"))
	case "help":
		PrintHelp()
	case "auth":
		if len(cleanedArgs) < 2 {
			fmt.Println("Usage: ugondu auth <login|status|logout>")
			os.Exit(1)
		}
		subcmd := cleanedArgs[1]
		if subcmd == "login" {
			engine.Authenticate()
		} else if subcmd == "status" {
			engine.AuthStatus()
		} else if subcmd == "logout" {
			engine.Logout()
		}

	}
}

// Helpers for git
func getGitRemoteUrl() string {
	adapter := adapters.NewGitAdapter()
	out, err := adapter.GetRemoteURL(".")
	if err != nil {
		return "local-repo"
	}
	return strings.TrimSpace(out)
}

func getGitBranch() string {
	adapter := adapters.NewGitAdapter()
	out, err := adapter.GetBranch(".")
	if err != nil {
		return "main"
	}
	return strings.TrimSpace(out)
}
