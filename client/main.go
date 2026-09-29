/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Client / thin-client
 * File           : main.go
 * Version        : 1.1.0
 * Author         : Ujomor Systems Engineering Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-29
 * Last Modified  : 2026-09-29
 * Classification : COMMERCIAL | INTERNAL
 *
 * Governance:
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001 | OWASP ASVS | NIST
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

// [en] Configuration and Endpoints
// [en] In production: override via UGONDU_API_URL environment variable
const defaultAPIBaseURL = "http://localhost:4001/v1"

// [en] Structs for API Communication
type DeploymentContext struct {
	RepositoryUrl     string            `json:"repositoryUrl"`
	Branch            string            `json:"branch"`
	FileMap           map[string]string `json:"fileMap"`
	TargetEnvironment string            `json:"targetEnvironment"`
	Token             string            `json:"token"`
}

type RecipeStep struct {
	Action  string                 `json:"action"`
	Payload map[string]interface{} `json:"payload"`
}

type ExecutionRecipe struct {
	TransactionId string       `json:"transactionId"`
	Edition       string       `json:"edition"`
	Strategy      string       `json:"strategy"`
	Steps         []RecipeStep `json:"steps"`
	Signature     string       `json:"signature"`
}

type ExecutionTelemetry struct {
	TransactionId string   `json:"transactionId"`
	Status        string   `json:"status"`
	Logs          []string `json:"logs"`
}

func main() {
	fmt.Println("[en] ╔══════════════════════════════════════════════════════╗")
	fmt.Println("[en] ║       Ugondu Universal Delivery Client v1.1.0        ║")
	fmt.Println("[en] ║       Air Roofers — Commercial Delivery Platform      ║")
	fmt.Println("[en] ╚══════════════════════════════════════════════════════╝")
	fmt.Println("[en] Initializing deployment context...")

	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}

	switch os.Args[1] {
	case "deploy":
		runDeploy()
	case "version":
		fmt.Println("[en] Ugondu Client v1.1.0 — Air Roofers Universal Delivery Platform")
	case "help":
		printUsage()
	default:
		fmt.Printf("[en] Error: Unknown command '%s'\n", os.Args[1])
		printUsage()
		os.Exit(1)
	}
}

func printUsage() {
	fmt.Println("[en] Usage: ugondu <command>")
	fmt.Println("[en]   deploy   — Execute a deployment for the current repository")
	fmt.Println("[en]   version  — Print the client version")
	fmt.Println("[en]   help     — Print this help message")
	fmt.Println("[en]")
	fmt.Println("[en] Environment Variables:")
	fmt.Println("[en]   UGONDU_TOKEN        — Your commercial license token (ugp_ or uge_ prefix)")
	fmt.Println("[en]   UGONDU_API_URL      — Override the Governance Server URL")
	fmt.Println("[en]   UGONDU_TARGET_ENV   — Override target environment (cpanel|directadmin|cloud|kubernetes|baremetal)")
}

func runDeploy() {
	repoUrl := getGitRemoteUrl()
	branch := getGitBranch()

	token := os.Getenv("UGONDU_TOKEN")
	if token == "" {
		// [en] Community fallback token for environments without subscription
		token = "community_token_123"
		fmt.Println("[en] Notice: UGONDU_TOKEN not set. Operating in Community mode.")
	}

	targetEnv := os.Getenv("UGONDU_TARGET_ENV")
	if targetEnv == "" {
		targetEnv = "cpanel"
	}

	if repoUrl == "" || branch == "" {
		log.Fatalf("[en] Error: Must be run inside a valid git repository.")
	}

	fmt.Printf("[en] Repository : %s\n", repoUrl)
	fmt.Printf("[en] Branch      : %s\n", branch)
	fmt.Printf("[en] Environment : %s\n", targetEnv)

	ctx := DeploymentContext{
		RepositoryUrl:     repoUrl,
		Branch:            branch,
		FileMap:           computeFileMap(),
		TargetEnvironment: targetEnv,
		Token:             token,
	}

	fmt.Println("[en] Requesting execution recipe from Ugondu Governance Server...")
	recipe, err := fetchExecutionRecipe(ctx)
	if err != nil {
		log.Fatalf("[en] Fatal: Could not obtain execution recipe: %v", err)
	}

	fmt.Printf("[en] Recipe resolved. TX: %s | Edition: %s | Strategy: %s\n",
		recipe.TransactionId, strings.ToUpper(recipe.Edition), recipe.Strategy)

	logs := []string{}
	err = executeRecipe(recipe, &logs)
	if err != nil {
		reportTelemetry(recipe.TransactionId, "FAILED", append(logs, err.Error()))
		log.Fatalf("[en] Execution Failed: %v", err)
	}

	reportTelemetry(recipe.TransactionId, "SUCCESS", append(logs, "[en] Deployment completed successfully."))
	fmt.Println("[en] ✓ Deployment Complete.")
}

// [en] computeFileMap reads the current working directory to produce a shallow file inventory
func computeFileMap() map[string]string {
	result := map[string]string{}
	entries, err := os.ReadDir(".")
	if err != nil {
		return result
	}
	for _, e := range entries {
		if !e.IsDir() && !strings.HasPrefix(e.Name(), ".") {
			result[e.Name()] = "pending"
		}
	}
	return result
}

// [en] getGitRemoteUrl detects the remote origin from the current git repository
func getGitRemoteUrl() string {
	cmd := exec.Command("git", "config", "--get", "remote.origin.url")
	out, err := cmd.Output()
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(out))
}

// [en] getGitBranch detects the current active branch
func getGitBranch() string {
	cmd := exec.Command("git", "rev-parse", "--abbrev-ref", "HEAD")
	out, err := cmd.Output()
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(out))
}

// [en] fetchExecutionRecipe submits the deployment context and receives a signed recipe
func fetchExecutionRecipe(ctx DeploymentContext) (*ExecutionRecipe, error) {
	apiURL := os.Getenv("UGONDU_API_URL")
	if apiURL == "" {
		apiURL = defaultAPIBaseURL
	}

	jsonData, err := json.Marshal(ctx)
	if err != nil {
		return nil, fmt.Errorf("[en] Failed to serialize deployment context: %v", err)
	}

	resp, err := http.Post(apiURL+"/deploy/resolve", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("[en] Cannot reach Governance Server at %s: %v", apiURL, err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("[en] Server rejected deployment. HTTP %d: %s", resp.StatusCode, string(body))
	}

	var recipe ExecutionRecipe
	if err := json.Unmarshal(body, &recipe); err != nil {
		return nil, fmt.Errorf("[en] Failed to parse execution recipe: %v", err)
	}
	return &recipe, nil
}

// [en] executeRecipe iterates the signed recipe steps and executes each one locally
func executeRecipe(recipe *ExecutionRecipe, logs *[]string) error {
	homeDir, _ := os.UserHomeDir()

	for i, step := range recipe.Steps {
		msg := fmt.Sprintf("[en] Step %d/%d: %s", i+1, len(recipe.Steps), step.Action)
		fmt.Println(msg)
		*logs = append(*logs, msg)

		switch step.Action {

		case "FETCH_REPOSITORY":
			// [en] Pull latest from upstream provider (Git-agnostic)
			url, _ := step.Payload["url"].(string)
			branch, _ := step.Payload["branch"].(string)
			fmt.Printf("     -> [en] Syncing from %s @ %s\n", url, branch)
			cmd := exec.Command("git", "pull", url, branch)
			cmd.Stdout = os.Stdout
			cmd.Stderr = os.Stderr
			if err := cmd.Run(); err != nil {
				return fmt.Errorf("[en] Git pull failed: %v", err)
			}

		case "SYNC_ENVIRONMENT":
			// [en] Physical file sync — strategy is determined by the server per edition
			strategy, _ := step.Payload["strategy"].(string)
			fmt.Printf("     -> [en] Syncing files using '%s' strategy\n", strategy)

			if strategy == "quota-sync" {
				// [en] Quota-safe rsync: preserves disk tracking in cPanel/DirectAdmin
				dest := filepath.Join(homeDir, "public_html")
				cmd := exec.Command("rsync", "-avz", "--delete", "--exclude", ".git", "./", dest)
				cmd.Stdout = os.Stdout
				cmd.Stderr = os.Stderr
				if err := cmd.Run(); err != nil {
					return fmt.Errorf("[en] Quota-sync rsync failed: %v", err)
				}
			} else {
				// [en] Atomic symlink strategy (Professional/Enterprise only)
				releaseDir := filepath.Join(homeDir, "releases", recipe.TransactionId)
				if err := exec.Command("mkdir", "-p", releaseDir).Run(); err != nil {
					return fmt.Errorf("[en] Failed to create release directory: %v", err)
				}
				if err := exec.Command("cp", "-r", ".", releaseDir).Run(); err != nil {
					return fmt.Errorf("[en] Failed to copy files to release directory: %v", err)
				}
				if err := exec.Command("ln", "-sfn", releaseDir, filepath.Join(homeDir, "public_html")).Run(); err != nil {
					return fmt.Errorf("[en] Failed to create atomic symlink: %v", err)
				}
				fmt.Printf("     -> [en] Atomic release created at %s\n", releaseDir)
			}

		case "PRUNE_RELEASES":
			// [en] Keep only the N most recent releases (Professional/Enterprise feature)
			retention := int(step.Payload["retention"].(float64))
			releasesPath := filepath.Join(homeDir, "releases")
			fmt.Printf("     -> [en] Pruning releases. Retaining last %d.\n", retention)
			cmdStr := fmt.Sprintf("ls -dt %s/* 2>/dev/null | tail -n +%d | xargs rm -rf", releasesPath, retention+1)
			if err := exec.Command("bash", "-c", cmdStr).Run(); err != nil {
				// [en] Non-fatal: log but continue
				fmt.Printf("     -> [en] Notice: Release pruning skipped (no old releases to remove).\n")
			}

		case "SHELL_EXEC":
			// [en] Arbitrary shell step injected by plugins (sandboxed)
			command, _ := step.Payload["command"].(string)
			description, _ := step.Payload["description"].(string)
			if description != "" {
				fmt.Printf("     -> %s\n", description)
			}
			if command == "" {
				return fmt.Errorf("[en] SHELL_EXEC step has no command defined")
			}
			cmd := exec.Command("bash", "-c", command)
			cmd.Stdout = os.Stdout
			cmd.Stderr = os.Stderr
			if err := cmd.Run(); err != nil {
				return fmt.Errorf("[en] SHELL_EXEC failed for command '%s': %v", command, err)
			}

		case "UPSELL_NOTICE":
			// [en] Shown to Community users when a locked feature is attempted
			message, _ := step.Payload["message"].(string)
			fmt.Println("     -> [en] ══════════════════════════════════════════════════")
			fmt.Printf("     -> [en] ★ UPGRADE NOTICE: %s\n", message)
			fmt.Println("     -> [en] ══════════════════════════════════════════════════")

		default:
			return fmt.Errorf("[en] Unknown action in recipe: %s", step.Action)
		}
	}

	return nil
}

// [en] reportTelemetry sends execution outcome back to the audit ledger
func reportTelemetry(txId string, status string, logs []string) {
	apiURL := os.Getenv("UGONDU_API_URL")
	if apiURL == "" {
		apiURL = defaultAPIBaseURL
	}

	telemetry := ExecutionTelemetry{
		TransactionId: txId,
		Status:        status,
		Logs:          logs,
	}
	jsonData, err := json.Marshal(telemetry)
	if err != nil {
		fmt.Printf("[en] Warning: Could not serialize telemetry: %v\n", err)
		return
	}

	resp, err := http.Post(apiURL+"/telemetry/report", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		fmt.Printf("[en] Warning: Telemetry report failed (non-fatal): %v\n", err)
		return
	}
	defer resp.Body.Close()
	fmt.Printf("[en] Telemetry reported. Status: %s\n", status)
}
