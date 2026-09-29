package engine

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"

	"ugondu/client/i18n"
)

type DeploymentContext struct {
	RepositoryUrl     string            `json:"repositoryUrl"`
	Branch            string            `json:"branch"`
	FileMap           map[string]string `json:"fileMap"`
	TargetEnvironment string            `json:"targetEnvironment"`
	Token             string            `json:"token"`
}

type ExecutionRecipe struct {
	TransactionId string                   `json:"transactionId"`
	Edition       string                   `json:"edition"`
	Strategy      string                   `json:"strategy"`
	Steps         []map[string]interface{} `json:"steps"`
	Signature     string                   `json:"signature"`
}

// FetchExecutionRecipe submits context to the API and returns the signed recipe
func FetchExecutionRecipe(apiURL string, ctx *DeploymentContext) (*ExecutionRecipe, error) {
	fmt.Println(i18n.T("req_recipe"))

	payload, err := json.Marshal(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to serialize deployment context: %v", err)
	}

	resp, err := http.Post(apiURL+"/deploy/resolve", "application/json", bytes.NewBuffer(payload))
	if err != nil {
		return nil, fmt.Errorf("cannot reach Governance Server at %s: %v", apiURL, err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("server rejected deployment. HTTP %d: %s", resp.StatusCode, string(body))
	}

	var recipe ExecutionRecipe
	if err := json.Unmarshal(body, &recipe); err != nil {
		return nil, fmt.Errorf("failed to parse execution recipe: %v", err)
	}

	return &recipe, nil
}

// ExecuteRecipe iterates through the steps and runs them natively
func ExecuteRecipe(recipe *ExecutionRecipe) ([]string, error) {
	homeDir, _ := os.UserHomeDir()
	var logs []string

	for i, step := range recipe.Steps {
		action, _ := step["action"].(string)
		payload, _ := step["payload"].(map[string]interface{})
		
		fmt.Printf("%s\n", i18n.T("step_info", i+1, len(recipe.Steps), action))

		switch action {
		case "FETCH_REPOSITORY":
			url, _ := payload["url"].(string)
			branch, _ := payload["branch"].(string)
			fmt.Printf("     -> %s\n", i18n.T("sync_git", url, branch))
			
			// Git is the only required external binary for fetching source
			cmd := exec.Command("git", "pull", url, branch)
			cmd.Stdout = os.Stdout
			cmd.Stderr = os.Stderr
			if err := cmd.Run(); err != nil {
				return logs, fmt.Errorf("git pull failed: %v", err)
			}
			logs = append(logs, fmt.Sprintf("Fetched latest from %s @ %s", url, branch))

		case "SYNC_ENVIRONMENT":
			strategy, _ := payload["strategy"].(string)
			fmt.Printf("     -> %s\n", i18n.T("sync_files", strategy))

			if strategy == "quota-sync" {
				dest := filepath.Join(homeDir, "public_html")
				if err := CopyDir(".", dest, true); err != nil {
					return logs, fmt.Errorf("quota-sync copy failed: %v", err)
				}
				logs = append(logs, "Copied files using quota-sync (Native Go)")
			} else if strategy == "atomic" {
				releaseDir := filepath.Join(homeDir, "releases", recipe.TransactionId)
				if err := CopyDir(".", releaseDir, true); err != nil {
					return logs, fmt.Errorf("failed to copy to release dir: %v", err)
				}
				if err := AtomicSymlink(releaseDir, filepath.Join(homeDir, "public_html")); err != nil {
					return logs, fmt.Errorf("failed to create atomic symlink: %v", err)
				}
				fmt.Printf("     -> %s\n", i18n.T("atomic_release", releaseDir))
				logs = append(logs, fmt.Sprintf("Created atomic release at %s", releaseDir))
			}

		case "PRUNE_RELEASES":
			retentionF, _ := payload["retention"].(float64)
			retention := int(retentionF)
			releasesPath := filepath.Join(homeDir, "releases")
			fmt.Printf("     -> %s\n", i18n.T("pruning", retention))
			
			if err := PruneReleases(releasesPath, retention); err != nil {
				fmt.Printf("     -> Warning: prune failed: %v\n", err)
			}
			logs = append(logs, fmt.Sprintf("Pruned releases to max %d", retention))

		case "SHELL_EXEC":
			// Sandboxed plugins inject shell_exec commands (cross-platform compatible ideally)
			command, _ := payload["command"].(string)
			description, _ := payload["description"].(string)
			if description != "" {
				fmt.Printf("     -> [Plugin] %s\n", description)
			}
			
			// Simple shell execution cross-platform wrapper
			var cmd *exec.Cmd
			if os.PathSeparator == '\\' {
				cmd = exec.Command("cmd", "/C", command)
			} else {
				cmd = exec.Command("sh", "-c", command)
			}
			cmd.Stdout = os.Stdout
			cmd.Stderr = os.Stderr
			if err := cmd.Run(); err != nil {
				return logs, fmt.Errorf("plugin execution failed: %v", err)
			}
			logs = append(logs, fmt.Sprintf("Executed plugin step: %s", description))

		case "UPSELL_NOTICE":
			msg, _ := payload["message"].(string)
			fmt.Println("     -> ───────────────")
			fmt.Printf("     -> %s\n", i18n.T("upsell_notice", msg))
			fmt.Println("     -> ───────────────")

		default:
			return logs, fmt.Errorf("unknown action in recipe: %s", action)
		}
	}

	return logs, nil
}

// ReportTelemetry sends execution outcome back to the audit ledger
func ReportTelemetry(apiURL, transactionId, status string, logs []string) {
	payload := map[string]interface{}{
		"transactionId": transactionId,
		"status":        status,
		"logs":          logs,
	}
	body, err := json.Marshal(payload)
	if err != nil {
		fmt.Printf("%s\n", i18n.T("telemetry_warn", err.Error()))
		return
	}

	resp, err := http.Post(apiURL+"/telemetry/report", "application/json", bytes.NewBuffer(body))
	if err != nil || resp.StatusCode != 201 {
		errStr := "unknown error"
		if err != nil {
			errStr = err.Error()
		}
		fmt.Printf("%s\n", i18n.T("telemetry_warn", errStr))
		return
	}

	fmt.Printf("%s\n", i18n.T("telemetry_ok", status))
}
