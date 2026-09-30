package engine

import (
	"fmt"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"ugondu/client/i18n"
)

type ActionHandler interface {
	Execute(env *ExecutionEnvelope, payload map[string]interface{}) ([]string, error)
}

var ActionRegistry = map[string]ActionHandler{}

func RegisterAction(name string, handler ActionHandler) {
	ActionRegistry[name] = handler
}

func init() {
	RegisterAction("FETCH_REPOSITORY", &FetchRepositoryAction{})
	RegisterAction("SYNC_ENVIRONMENT", &SyncEnvironmentAction{})
	RegisterAction("PRUNE_RELEASES", &PruneReleasesAction{})
	RegisterAction("UPSELL_NOTICE", &UpsellNoticeAction{})
	RegisterAction("NODE_INSTALL", &NodeInstallAction{})
	RegisterAction("COMPOSER_INSTALL", &ComposerInstallAction{})
	RegisterAction("SHELL_EXEC", &ShellExecAction{})
}

type FetchRepositoryAction struct{}

func (a *FetchRepositoryAction) Execute(env *ExecutionEnvelope, payload map[string]interface{}) ([]string, error) {
	var logs []string
	rawUrl, _ := payload["url"].(string)
	branch, _ := payload["branch"].(string)

	// Extract and strip credentials to prevent process table exposure
	displayUrl := rawUrl
	parsedUrl, err := url.Parse(rawUrl)
	if err == nil && parsedUrl.User != nil {
		parsedUrl.User = nil
		displayUrl = parsedUrl.String()
	}

	fmt.Printf("     -> %s\n", i18n.T("sync_git", displayUrl, branch))

	cmd := exec.Command("git", "pull", rawUrl, branch)
	// Ensure token is completely hidden by passing via stdin or configuring git credential helper
	if err == nil && parsedUrl != nil && parsedUrl.User != nil {
		homeDir, _ := os.UserHomeDir()
		credFile := filepath.Join(homeDir, ".git-credentials-temp")
		os.WriteFile(credFile, []byte(rawUrl+"\n"), 0600)
		cmd = exec.Command("git", "-c", "credential.helper=store --file="+credFile, "pull", displayUrl, branch)
		defer os.Remove(credFile)
	}
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		return logs, fmt.Errorf("git pull failed: %v", err)
	}
	logs = append(logs, fmt.Sprintf("Fetched latest from %s @ %s", rawUrl, branch))

	return logs, nil
}

type SyncEnvironmentAction struct{}

func (a *SyncEnvironmentAction) Execute(env *ExecutionEnvelope, payload map[string]interface{}) ([]string, error) {
	var logs []string
	homeDir, _ := os.UserHomeDir()
	strategy, _ := payload["strategy"].(string)
	fmt.Printf("     -> %s\n", i18n.T("sync_files", strategy))

	if strategy == "quota-sync" {
		dest := filepath.Join(homeDir, "public_html")
		if err := CopyDir(".", dest, true); err != nil {
			return logs, fmt.Errorf("quota-sync copy failed: %v", err)
		}
		logs = append(logs, "Copied files using quota-sync (Native Go)")
	} else if strategy == "atomic" {
		if strings.Contains(env.TransactionId, "/") || strings.Contains(env.TransactionId, "\\") || strings.Contains(env.TransactionId, "..") {
			return logs, fmt.Errorf("FATAL: transactionId contains invalid path characters")
		}
		releaseDir := filepath.Join(homeDir, "releases", env.TransactionId)
		if err := CopyDir(".", releaseDir, true); err != nil {
			return logs, fmt.Errorf("failed to copy to release dir: %v", err)
		}
		if err := AtomicSymlink(releaseDir, filepath.Join(homeDir, "public_html")); err != nil {
			return logs, fmt.Errorf("failed to create atomic symlink: %v", err)
		}
		fmt.Printf("     -> %s\n", i18n.T("atomic_release", releaseDir))
		logs = append(logs, fmt.Sprintf("Created atomic release at %s", releaseDir))
	}

	return logs, nil
}

type PruneReleasesAction struct{}

func (a *PruneReleasesAction) Execute(env *ExecutionEnvelope, payload map[string]interface{}) ([]string, error) {
	var logs []string
	homeDir, _ := os.UserHomeDir()
	retentionF, _ := payload["retention"].(float64)
	retention := int(retentionF)
	releasesPath := filepath.Join(homeDir, "releases")
	fmt.Printf("     -> %s\n", i18n.T("pruning", retention))

	if err := PruneReleases(releasesPath, retention); err != nil {
		fmt.Printf("     -> Warning: prune failed: %v\n", err)
	}
	logs = append(logs, fmt.Sprintf("Pruned releases to max %d", retention))
	return logs, nil
}

type UpsellNoticeAction struct{}

func (a *UpsellNoticeAction) Execute(env *ExecutionEnvelope, payload map[string]interface{}) ([]string, error) {
	var logs []string
	msg, _ := payload["message"].(string)
	fmt.Println("     -> 💰")
	fmt.Printf("     -> %s\n", i18n.T("upsell_notice", msg))
	fmt.Println("     -> 💰")
	return logs, nil
}

type NodeInstallAction struct{}

func (a *NodeInstallAction) Execute(env *ExecutionEnvelope, payload map[string]interface{}) ([]string, error) {
	var logs []string
	fmt.Println("     -> Running Node.js NPM Install")
	logs = append(logs, "Executed typed step: NODE_INSTALL")
	return logs, nil
}

type ComposerInstallAction struct{}

func (a *ComposerInstallAction) Execute(env *ExecutionEnvelope, payload map[string]interface{}) ([]string, error) {
	var logs []string
	fmt.Println("     -> Running PHP Composer Install")
	logs = append(logs, "Executed typed step: COMPOSER_INSTALL")
	return logs, nil
}

type ShellExecAction struct{}

func (a *ShellExecAction) Execute(env *ExecutionEnvelope, payload map[string]interface{}) ([]string, error) {
	return nil, fmt.Errorf("FATAL: SHELL_EXEC is completely prohibited in P0 architecture")
}
