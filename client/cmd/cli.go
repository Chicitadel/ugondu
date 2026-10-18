/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : client/cmd
 * File           : cli.go
 * Version        : 3.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Last Modified  : 2026-10-18
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Corporate Policy Governed
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

// PromptDestructive asks the user for confirmation before wiping data unless --force is passed.
// Never hangs in non-interactive or unclosed pipe environments.
func PromptDestructive(targetPath string, force bool) bool {
	if force {
		return true
	}
	if os.Getenv("UGONDU_NON_INTERACTIVE") == "1" || strings.EqualFold(os.Getenv("UGONDU_NON_INTERACTIVE"), "true") {
		return false
	}
	fmt.Printf(i18n.T("prompt_destructive", targetPath))

	resCh := make(chan string, 1)
	go func() {
		reader := bufio.NewReader(os.Stdin)
		line, _ := reader.ReadString('\n')
		resCh <- line
	}()

	waitDur := 50 * time.Millisecond
	if isStdinInteractive() {
		waitDur = 30 * time.Second
	}

	select {
	case response := <-resCh:
		response = strings.TrimSpace(strings.ToLower(response))
		return response == "y" || response == "yes"
	case <-time.After(waitDur):
		return false
	}
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
		if !entry.IsDir() || entry.Name() == "replay_ledger_lock" {
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

// ParseGlobalFlags extracts global CLI flags and positional tokens from os.Args-style slices.
func ParseGlobalFlags(args []string) *CLIOptions {
	targetDefault := os.Getenv("UGONDU_TARGET_ENV")
	if targetDefault == "" {
		targetDefault = "auto"
	}
	opts := &CLIOptions{
		Target:   targetDefault,
		Provider: "sovereign-cloud",
		Region:   "eu-central-1",
		Format:   "table",
		Profile:  "default",
	}

	startIdx := 1
	if len(args) > 0 && !strings.Contains(args[0], "ugondu") && !strings.HasSuffix(args[0], ".exe") && !strings.Contains(args[0], "/") && !strings.Contains(args[0], "\\") {
		// Allow tests to pass either ["ugondu", "cmd", ...] or ["cmd", ...]
		validMap := make(map[string]bool)
		for _, v := range SortedValidCommands() {
			validMap[v] = true
		}
		if validMap[args[0]] || strings.HasPrefix(args[0], "-") {
			startIdx = 0
		}
	}

	for i := startIdx; i < len(args); i++ {
		arg := args[i]
		opts.RawSubArgs = append(opts.RawSubArgs, arg)

		switch {
		case (arg == "--locale" || arg == "-L") && i+1 < len(args):
			opts.Locale = args[i+1]
			i++
		case strings.HasPrefix(arg, "--locale="):
			opts.Locale = strings.TrimPrefix(arg, "--locale=")
		case arg == "--system-locale":
			opts.SystemLocale = true

		case arg == "--target" && i+1 < len(args):
			opts.Target = args[i+1]
			i++
		case strings.HasPrefix(arg, "--target="):
			opts.Target = strings.TrimPrefix(arg, "--target=")

		case arg == "--provider" && i+1 < len(args):
			opts.Provider = args[i+1]
			i++
		case strings.HasPrefix(arg, "--provider="):
			opts.Provider = strings.TrimPrefix(arg, "--provider=")

		case arg == "--region" && i+1 < len(args):
			opts.Region = args[i+1]
			i++
		case strings.HasPrefix(arg, "--region="):
			opts.Region = strings.TrimPrefix(arg, "--region=")

		case arg == "--pack" && i+1 < len(args):
			opts.Pack = args[i+1]
			i++
		case strings.HasPrefix(arg, "--pack="):
			opts.Pack = strings.TrimPrefix(arg, "--pack=")

		case arg == "--format" && i+1 < len(args):
			opts.Format = strings.ToLower(args[i+1])
			i++
		case strings.HasPrefix(arg, "--format="):
			opts.Format = strings.ToLower(strings.TrimPrefix(arg, "--format="))
		case arg == "--json":
			opts.Format = "json"
		case arg == "--yaml":
			opts.Format = "yaml"

		case arg == "--output" && i+1 < len(args):
			opts.Output = args[i+1]
			i++
		case strings.HasPrefix(arg, "--output="):
			opts.Output = strings.TrimPrefix(arg, "--output=")

		case arg == "--profile" && i+1 < len(args):
			opts.Profile = args[i+1]
			i++
		case strings.HasPrefix(arg, "--profile="):
			opts.Profile = strings.TrimPrefix(arg, "--profile=")

		case arg == "--operation" && i+1 < len(args):
			opts.Operation = args[i+1]
			i++
		case strings.HasPrefix(arg, "--operation="):
			opts.Operation = strings.TrimPrefix(arg, "--operation=")

		case arg == "--plan" && i+1 < len(args):
			opts.Plan = args[i+1]
			i++
		case strings.HasPrefix(arg, "--plan="):
			opts.Plan = strings.TrimPrefix(arg, "--plan=")

		case arg == "--timeout" && i+1 < len(args):
			opts.Timeout = args[i+1]
			i++
		case strings.HasPrefix(arg, "--timeout="):
			opts.Timeout = strings.TrimPrefix(arg, "--timeout=")

		case arg == "--yes" || arg == "-y":
			opts.Yes = true
		case arg == "--non-interactive":
			opts.NonInteractive = true
		case arg == "--dry-run":
			opts.DryRun = true
		case arg == "--force" || arg == "-f":
			opts.Force = true
		case arg == "--resume" || arg == "-r":
			opts.Resume = true
		case arg == "--help" || arg == "-h":
			opts.Help = true
		case arg == "--version" || arg == "-v":
			opts.Version = true

		case !strings.HasPrefix(arg, "-"):
			if opts.Command == "" {
				opts.Command = arg
			} else {
				opts.Positional = append(opts.Positional, arg)
			}
		}
	}

	if len(opts.Positional) > 0 {
		opts.Subcommand = opts.Positional[0]
	}

	return opts
}

func runResumeDeployment(opts *CLIOptions, targetTxId string, apiURL string) (int, *CLIOutputEnvelope) {
	txId := targetTxId
	if txId == "" {
		latest, err := FindLatestTransactionId()
		if err != nil {
			fmt.Println(i18n.T("err_cannot_resume", err))
			env := NewOutputEnvelope(opts, "PRECONDITION_FAILED", ExitPreconditionFailed)
			env.BlockedReasons = []string{err.Error()}
			env.Verification.Verified = false
			if opts.Format == "json" || opts.Format == "yaml" {
				RenderEnvelope(opts, env)
			}
			return ExitPreconditionFailed, env
		}
		txId = latest
	}

	fmt.Println(i18n.T("resuming_deployment", txId))

	recipeData, err := LoadTransactionRecipe(txId)
	if err != nil {
		fmt.Println(i18n.T("no_prev_deployment"))
		env := NewOutputEnvelope(opts, "PRECONDITION_FAILED", ExitPreconditionFailed)
		env.OperationID = txId
		env.BlockedReasons = []string{i18n.T("no_prev_deployment")}
		env.Verification.Verified = false
		if opts.Format == "json" || opts.Format == "yaml" {
			RenderEnvelope(opts, env)
		}
		return ExitPreconditionFailed, env
	}

	execEnv, steps, err := engine.ParseRecipeLocally(recipeData, apiURL)
	if err != nil {
		fmt.Println(i18n.T("resume_parse_fail", err))
		env := NewOutputEnvelope(opts, "PRECONDITION_FAILED", ExitPreconditionFailed)
		env.OperationID = txId
		env.BlockedReasons = []string{err.Error()}
		env.Verification.Verified = false
		if opts.Format == "json" || opts.Format == "yaml" {
			RenderEnvelope(opts, env)
		}
		return ExitPreconditionFailed, env
	}

	logs, err := engine.ExecuteRecipe(execEnv, steps)
	if err != nil {
		fmt.Println(i18n.T("exec_failed", err))
		engine.ReportTelemetry(apiURL, execEnv.TransactionId, "FAILED", append(logs, err.Error()))
		env := NewOutputEnvelope(opts, "FAILED", ExitOperationFailed)
		env.OperationID = execEnv.TransactionId
		env.BlockedReasons = []string{err.Error()}
		env.Verification.Verified = false
		if opts.Format == "json" || opts.Format == "yaml" {
			RenderEnvelope(opts, env)
		}
		return ExitOperationFailed, env
	}

	engine.ReportTelemetry(apiURL, execEnv.TransactionId, "SUCCESS", logs)
	fmt.Println(i18n.T("dep_complete"))
	env := NewOutputEnvelope(opts, "VERIFIED", ExitSuccess)
	env.OperationID = execEnv.TransactionId
	env.PlanID = execEnv.PlanHash
	if opts.Format == "json" || opts.Format == "yaml" {
		RenderEnvelope(opts, env)
	}
	return ExitSuccess, env
}

// ExecuteCommand parses and executes the CLI command, returning a deterministic exit code and output envelope.
func ExecuteCommand(args []string) (int, *CLIOutputEnvelope) {
	opts := ParseGlobalFlags(args)

	if opts.SystemLocale {
		det := i18n.DetectEnvironmentLocale()
		i18n.SetLocaleWithSource(det.Normalized, i18n.SourceOSDetection)
	} else if opts.Locale != "" {
		i18n.SetLocaleWithSource(opts.Locale, i18n.SourceCliFlag)
	} else {
		loc, src := i18n.ResolveEffectiveLocale("")
		i18n.SetLocaleWithSource(loc, src)
	}

	if opts.Format != "table" && opts.Format != "json" && opts.Format != "yaml" && opts.Format != "yml" {
		env := NewOutputEnvelope(opts, "INVALID_INPUT", ExitInvalidInput)
		env.BlockedReasons = []string{fmt.Sprintf("Unsupported --format '%s' (expected table, json, or yaml)", opts.Format)}
		env.Verification.Verified = false
		opts.Format = "json"
		RenderEnvelope(opts, env)
		return ExitInvalidInput, env
	}

	if opts.Version && opts.Command == "" {
		opts.Command = "version"
	}
	if opts.Help && opts.Command == "" {
		opts.Command = "help"
	}

	validCommands := SortedValidCommands()

	if opts.Command == "" {
		fmt.Println(i18n.T("err_no_command"))
		PrintHelp()
		env := NewOutputEnvelope(opts, "INVALID_INPUT", ExitInvalidInput)
		env.BlockedReasons = []string{i18n.T("err_no_command")}
		env.Verification.Verified = false
		return ExitInvalidInput, env
	}

	command := opts.Command

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
		env := NewOutputEnvelope(opts, "INVALID_INPUT", ExitInvalidInput)
		env.BlockedReasons = []string{i18n.T("err_unknown_cmd", command)}
		env.Verification.Verified = false
		if opts.Format == "json" || opts.Format == "yaml" {
			RenderEnvelope(opts, env)
		}
		return ExitInvalidInput, env
	}

	if opts.Help && command != "help" {
		PrintHelp()
		env := NewOutputEnvelope(opts, "VERIFIED", ExitSuccess)
		return ExitSuccess, env
	}

	token := os.Getenv("UGONDU_TOKEN")
	apiURL := engine.ResolveAPIURL()
	targetEnv := opts.Target

	var targetTxId string
	if len(opts.Positional) > 0 {
		targetTxId = opts.Positional[0]
	} else if opts.Operation != "" {
		targetTxId = opts.Operation
	}

	switch command {
	case "deploy":
		if token == "" && opts.Format == "table" {
			fmt.Println(i18n.T("community_fallback"))
		}
		if opts.Resume {
			return runResumeDeployment(opts, targetTxId, apiURL)
		}

		// Approval / non-interactive gate before mutating deployment
		if ok, blockedEnv := RequireApprovalOrConfirm(opts, "public_html", "DEPLOY_MUTATION"); !ok {
			if opts.Format == "json" || opts.Format == "yaml" || opts.NonInteractive {
				RenderEnvelope(opts, blockedEnv)
			} else {
				fmt.Println(i18n.T("aborting"))
			}
			return ExitApprovalRequired, blockedEnv
		}

		if opts.DryRun {
			env := NewOutputEnvelope(opts, "DRY_RUN_VERIFIED", ExitSuccess)
			env.Actions = []CLIActionRecord{
				{ActionID: "dry-run-fetch", Type: "FETCH_REPOSITORY", Target: targetEnv, Status: "DRY_RUN", Reversible: true},
				{ActionID: "dry-run-sync", Type: "SYNC_ENVIRONMENT", Target: targetEnv, Status: "DRY_RUN", Reversible: true},
			}
			env.Message = "Dry-run deployment preflight verified"
			RenderEnvelope(opts, env)
			return ExitSuccess, env
		}

		if _, err := os.Stat(".git"); os.IsNotExist(err) {
			fmt.Println(i18n.T("err_not_repo"))
			env := NewOutputEnvelope(opts, "PRECONDITION_FAILED", ExitPreconditionFailed)
			env.BlockedReasons = []string{i18n.T("err_not_repo")}
			env.Verification.Verified = false
			if opts.Format == "json" || opts.Format == "yaml" {
				RenderEnvelope(opts, env)
			}
			return ExitPreconditionFailed, env
		}

		ctx := &engine.DeploymentContext{
			RepositoryUrl:     getGitRemoteUrl(),
			Branch:            getGitBranch(),
			TargetEnvironment: targetEnv,
			Token:             token,
			FileMap:           make(map[string]string),
		}

		fmt.Println(i18n.T("repo_info", ctx.RepositoryUrl, ctx.Branch, ctx.TargetEnvironment))

		execEnv, steps, rawRecipe, err := engine.FetchExecutionRecipe(apiURL, ctx)
		if err != nil {
			fmt.Println(err.Error())
			env := NewOutputEnvelope(opts, "FAILED", ExitOperationFailed)
			env.BlockedReasons = []string{err.Error()}
			env.Verification.Verified = false
			if opts.Format == "json" || opts.Format == "yaml" {
				RenderEnvelope(opts, env)
			}
			return ExitOperationFailed, env
		}

		if err := SaveTransactionRecipe(execEnv.TransactionId, rawRecipe); err != nil {
			fmt.Println(i18n.T("warn_persist_recipe", err))
		}

		fmt.Println(i18n.T("recipe_resolved", execEnv.TransactionId, execEnv.Edition, i18n.T("strategy_atomic_or_quota")))

		logs, err := engine.ExecuteRecipe(execEnv, steps)
		if err != nil {
			fmt.Println(i18n.T("exec_failed", err))
			engine.ReportTelemetry(apiURL, execEnv.TransactionId, "FAILED", append(logs, err.Error()))
			env := NewOutputEnvelope(opts, "FAILED", ExitOperationFailed)
			env.OperationID = execEnv.TransactionId
			env.BlockedReasons = []string{err.Error()}
			env.Verification.Verified = false
			if opts.Format == "json" || opts.Format == "yaml" {
				RenderEnvelope(opts, env)
			}
			return ExitOperationFailed, env
		}

		engine.ReportTelemetry(apiURL, execEnv.TransactionId, "SUCCESS", logs)
		fmt.Println(i18n.T("dep_complete"))
		env := NewOutputEnvelope(opts, "VERIFIED", ExitSuccess)
		env.OperationID = execEnv.TransactionId
		env.PlanID = execEnv.PlanHash
		if opts.Format == "json" || opts.Format == "yaml" {
			RenderEnvelope(opts, env)
		}
		return ExitSuccess, env

	case "resume":
		return runResumeDeployment(opts, targetTxId, apiURL)

	case "status":
		txId := targetTxId
		if txId == "" {
			latest, err := FindLatestTransactionId()
			if err != nil {
				if opts.Format == "json" || opts.Format == "yaml" {
					env := NewOutputEnvelope(opts, "PRECONDITION_FAILED", ExitPreconditionFailed)
					env.BlockedReasons = []string{err.Error()}
					env.Verification.Verified = false
					RenderEnvelope(opts, env)
					return ExitPreconditionFailed, env
				}
				fmt.Println(i18n.T("err_no_tx_found", err))
				return ExitPreconditionFailed, nil
			}
			txId = latest
		}

		state, err := engine.LoadState(txId)
		if err != nil {
			if errors.Is(err, engine.ErrStateNotFound) {
				fmt.Println(i18n.T("err_tx_state_not_found", txId))
			} else if errors.Is(err, engine.ErrStateCorrupt) {
				fmt.Println(i18n.T("err_tx_state_corrupt", txId))
			} else {
				fmt.Println(i18n.T("err_tx_state_load", txId, err))
			}
			env := NewOutputEnvelope(opts, "PRECONDITION_FAILED", ExitPreconditionFailed)
			env.OperationID = txId
			env.BlockedReasons = []string{err.Error()}
			env.Verification.Verified = false
			if opts.Format == "json" || opts.Format == "yaml" {
				RenderEnvelope(opts, env)
			}
			return ExitPreconditionFailed, env
		}

		if opts.Format == "json" || opts.Format == "yaml" {
			env := NewOutputEnvelope(opts, state.Status, ExitSuccess)
			env.OperationID = state.TransactionId
			env.PlanID = state.PlanHash
			env.Data = state
			for _, s := range state.Steps {
				env.Actions = append(env.Actions, CLIActionRecord{
					ActionID:   fmt.Sprintf("step-%d", s.Index+1),
					Type:       s.Action,
					Target:     state.EnvironmentId,
					Status:     s.Status,
					Reversible: true,
				})
			}
			RenderEnvelope(opts, env)
			return ExitSuccess, env
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
		env := NewOutputEnvelope(opts, state.Status, ExitSuccess)
		env.OperationID = state.TransactionId
		return ExitSuccess, env

	case "plan":
		return HandlePlanCommand(opts)

	case "cancel":
		return HandleCancelCommand(opts)

	case "rollback":
		return HandleRollbackCommand(opts)

	case "doctor":
		return HandleDoctorCommand(opts)

	case "config":
		return HandleConfigCommand(opts)

	case "providers", "provider":
		return HandleProviderCommand(opts)

	case "models":
		return HandleModelsCommand(opts)

	case "plugins":
		return HandlePluginsCommand(opts)

	case "capability":
		return HandleCapabilityCommand(opts)

	case "environment":
		return HandleEnvironmentCommand(opts)

	case "identity":
		return HandleIdentityCommand(opts)

	case "policy":
		return HandlePolicyCommand(opts)

	case "access":
		return HandleAccessCommand(opts)

	case "operation":
		return HandleOperationCommand(opts)

	case "evidence":
		return HandleEvidenceCommand(opts)

	case "locale":
		code := RunLocaleCommandWithCode(opts.Positional)
		env := NewOutputEnvelope(opts, "VERIFIED", code)
		if code != ExitSuccess {
			env.Status = "FAILED"
			env.Verification.Verified = false
		}
		if opts.Format == "json" || opts.Format == "yaml" {
			RenderEnvelope(opts, env)
		}
		return code, env

	case "version":
		if opts.Format == "json" || opts.Format == "yaml" {
			env := NewOutputEnvelope(opts, "VERIFIED", ExitSuccess)
			env.Data = map[string]string{"version": "3.0.0", "title": i18n.T("cli_title")}
			env.Message = i18n.T("cli_title")
			RenderEnvelope(opts, env)
			return ExitSuccess, env
		}
		fmt.Println(i18n.T("cli_title"))
		return ExitSuccess, NewOutputEnvelope(opts, "VERIFIED", ExitSuccess)

	case "help":
		PrintHelp()
		return ExitSuccess, NewOutputEnvelope(opts, "VERIFIED", ExitSuccess)

	case "repair":
		var repairArgs []string
		repairArgs = append(repairArgs, opts.Positional...)
		if opts.Target != "" {
			repairArgs = append(repairArgs, "--target", opts.Target)
		}
		if opts.DryRun {
			repairArgs = append(repairArgs, "--dry-run")
		}
		code := RunRepairCommand(repairArgs)
		status := "VERIFIED"
		if code != ExitSuccess {
			status = "FAILED"
		}
		env := NewOutputEnvelope(opts, status, code)
		if opts.Format == "json" || opts.Format == "yaml" {
			RenderEnvelope(opts, env)
		}
		return code, env

	case "auth":
		if len(opts.Positional) < 1 {
			fmt.Println(i18n.T("auth_usage"))
			env := NewOutputEnvelope(opts, "INVALID_INPUT", ExitInvalidInput)
			env.BlockedReasons = []string{i18n.T("auth_usage")}
			env.Verification.Verified = false
			if opts.Format == "json" || opts.Format == "yaml" {
				RenderEnvelope(opts, env)
			}
			return ExitInvalidInput, env
		}
		subcmd := opts.Positional[0]
		switch subcmd {
		case "login":
			engine.Authenticate()
			return ExitSuccess, NewOutputEnvelope(opts, "VERIFIED", ExitSuccess)
		case "status", "whoami":
			engine.AuthStatus()
			env := NewOutputEnvelope(opts, "VERIFIED", ExitSuccess)
			if opts.Format == "json" || opts.Format == "yaml" {
				RenderEnvelope(opts, env)
			}
			return ExitSuccess, env
		case "logout":
			engine.Logout()
			env := NewOutputEnvelope(opts, "VERIFIED", ExitSuccess)
			if opts.Format == "json" || opts.Format == "yaml" {
				RenderEnvelope(opts, env)
			}
			return ExitSuccess, env
		default:
			fmt.Println(i18n.T("auth_usage"))
			return ExitInvalidInput, NewOutputEnvelope(opts, "INVALID_INPUT", ExitInvalidInput)
		}
	}

	return ExitSuccess, NewOutputEnvelope(opts, "VERIFIED", ExitSuccess)
}

// ParseAndRun interprets the arguments, routes to the engine, and exits with a deterministic exit code.
func ParseAndRun(args []string) {
	code, _ := ExecuteCommand(args)
	os.Exit(code)
}

// Helpers for git
func getGitRemoteUrl() string {
	adapter := adapters.NewGitAdapter()
	out, err := adapter.GetRemoteURL(".")
	if err != nil {
		return i18n.T("local-repo")
	}
	return strings.TrimSpace(out)
}

func getGitBranch() string {
	adapter := adapters.NewGitAdapter()
	out, err := adapter.GetBranch(".")
	if err != nil {
		return i18n.T("main")
	}
	return strings.TrimSpace(out)
}
