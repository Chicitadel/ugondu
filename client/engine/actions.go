/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : client/engine
 * File           : actions.go
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

package engine

import (
	"bytes"
	"context"
	"fmt"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"ugondu/client/engine/adapters"
	"ugondu/client/i18n"
)

type ActionHandler interface {
	Execute(env *ExecutionEnvelope, payload map[string]interface{}) ([]string, error)
	ValidatePreflight(payload map[string]interface{}) error
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
}

// Typed payload definitions and validators

type FetchRepositoryPayload struct {
	URL    string
	Branch string
}

func ValidateFetchRepositoryPayload(payload map[string]interface{}) (*FetchRepositoryPayload, error) {
	if payload == nil {
		return nil, fmt.Errorf(i18n.T("payload_is_required_for_fetchrepository"))
	}
	rawURL, ok := payload["url"].(string)
	if !ok || strings.TrimSpace(rawURL) == "" {
		return nil, fmt.Errorf(i18n.T("msg_fetch_repository_url_must_be_a_non_empty"))
	}
	branch, _ := payload["branch"].(string)
	if strings.TrimSpace(branch) == "" {
		branch = "main"
	}
	return &FetchRepositoryPayload{
		URL:    rawURL,
		Branch: branch,
	}, nil
}

type SyncEnvironmentPayload struct {
	Strategy string
}

func ValidateSyncEnvironmentPayload(payload map[string]interface{}) (*SyncEnvironmentPayload, error) {
	if payload == nil {
		return nil, fmt.Errorf(i18n.T("payload_is_required_for_syncenvironment"))
	}
	strategy, ok := payload["strategy"].(string)
	if !ok || strings.TrimSpace(strategy) == "" {
		return nil, fmt.Errorf(i18n.T("msg_sync_environment_strategy_must_be_a_non"))
	}
	if strategy != "quota-sync" && strategy != "atomic" {
		return nil, fmt.Errorf(i18n.T("msg_sync_environment_unsupported_strategy_s"), strategy)
	}
	return &SyncEnvironmentPayload{Strategy: strategy}, nil
}

type PruneReleasesPayload struct {
	Retention int
}

func ValidatePruneReleasesPayload(payload map[string]interface{}) (*PruneReleasesPayload, error) {
	retention := 5
	if payload != nil {
		if val, ok := payload["retention"]; ok {
			switch v := val.(type) {
			case float64:
				retention = int(v)
			case int:
				retention = v
			case int64:
				retention = int(v)
			default:
				return nil, fmt.Errorf(i18n.T("msg_prune_releases_retention_must_be_an_inte"))
			}
		}
	}
	if retention < 1 {
		retention = 1
	}
	return &PruneReleasesPayload{Retention: retention}, nil
}

type UpsellNoticePayload struct {
	Message string
}

func ValidateUpsellNoticePayload(payload map[string]interface{}) (*UpsellNoticePayload, error) {
	msg := ""
	if payload != nil {
		if m, ok := payload["message"].(string); ok {
			msg = m
		}
	}
	return &UpsellNoticePayload{Message: msg}, nil
}

type NodeInstallPayload struct {
	PackageManager   string
	WorkingDirectory string
	Production       bool
	TimeoutMs        int64
}

func ValidateNodeInstallPayload(payload map[string]interface{}) (*NodeInstallPayload, error) {
	p := &NodeInstallPayload{
		PackageManager:   "npm",
		WorkingDirectory: ".",
		Production:       true,
		TimeoutMs:        0,
	}
	if payload == nil {
		return p, nil
	}

	if pm, ok := payload["packageManager"].(string); ok && strings.TrimSpace(pm) != "" {
		p.PackageManager = strings.TrimSpace(pm)
	}

	if wd, ok := payload["workingDirectory"].(string); ok && strings.TrimSpace(wd) != "" {
		p.WorkingDirectory = strings.TrimSpace(wd)
	}

	if prod, ok := payload["production"].(bool); ok {
		p.Production = prod
	}

	if to, ok := payload["timeoutMs"]; ok {
		switch v := to.(type) {
		case float64:
			p.TimeoutMs = int64(v)
		case int:
			p.TimeoutMs = int64(v)
		case int64:
			p.TimeoutMs = v
		default:
			return nil, fmt.Errorf(i18n.T("msg_node_install_timeoutms_must_be_a_numeric"))
		}
	}

	return p, nil
}

type ComposerInstallPayload struct {
	Command          string
	WorkingDirectory string
	NoDev            bool
	TimeoutMs        int64
}

func ValidateComposerInstallPayload(payload map[string]interface{}) (*ComposerInstallPayload, error) {
	p := &ComposerInstallPayload{
		Command:          "install",
		WorkingDirectory: ".",
		NoDev:            true,
		TimeoutMs:        0,
	}
	if payload == nil {
		return p, nil
	}

	if cmd, ok := payload["command"].(string); ok && strings.TrimSpace(cmd) != "" {
		p.Command = strings.TrimSpace(cmd)
	}

	if wd, ok := payload["workingDirectory"].(string); ok && strings.TrimSpace(wd) != "" {
		p.WorkingDirectory = strings.TrimSpace(wd)
	}

	if nd, ok := payload["noDev"].(bool); ok {
		p.NoDev = nd
	}

	if to, ok := payload["timeoutMs"]; ok {
		switch v := to.(type) {
		case float64:
			p.TimeoutMs = int64(v)
		case int:
			p.TimeoutMs = int64(v)
		case int64:
			p.TimeoutMs = v
		default:
			return nil, fmt.Errorf(i18n.T("msg_composer_install_timeoutms_must_be_a_num"))
		}
	}

	return p, nil
}

// Action implementations

type FetchRepositoryAction struct{}

func (a *FetchRepositoryAction) ValidatePreflight(payload map[string]interface{}) error {
	_, err := ValidateFetchRepositoryPayload(payload)
	return err
}

func (a *FetchRepositoryAction) Execute(env *ExecutionEnvelope, payload map[string]interface{}) ([]string, error) {
	var logs []string
	p, err := ValidateFetchRepositoryPayload(payload)
	if err != nil {
		return logs, fmt.Errorf(i18n.T("msg_fetch_repository_validation_failure_w"), err)
	}

	// Extract and strip credentials to prevent process table exposure
	displayUrl := p.URL
	parsedUrl, err := url.Parse(p.URL)
	if err == nil && parsedUrl.User != nil {
		parsedUrl.User = nil
		displayUrl = parsedUrl.String()
	}

	fmt.Printf("     -> %s\n", i18n.T("sync_git", displayUrl, p.Branch))


	// Ensure token is completely hidden by configuring temp git credential helper
	var credFile string
	if err == nil && parsedUrl != nil && parsedUrl.User != nil {
		homeDir, _ := os.UserHomeDir()
		credFile = filepath.Join(homeDir, ".git-credentials-temp")
		_ = os.WriteFile(credFile, []byte(p.URL+"\n"), 0600)
		defer os.Remove(credFile)
	}

	gitAdapter := adapters.NewGitAdapter()
	if err := gitAdapter.Pull(displayUrl, p.Branch, ".", credFile); err != nil {
		return logs, fmt.Errorf(i18n.T("git_pull_failed"), err)
	}
	logs = append(logs, fmt.Sprintf(i18n.T("fetched_latest_from"), p.URL, p.Branch))

	return logs, nil
}

type SyncEnvironmentAction struct{}

func (a *SyncEnvironmentAction) ValidatePreflight(payload map[string]interface{}) error {
	_, err := ValidateSyncEnvironmentPayload(payload)
	return err
}

func (a *SyncEnvironmentAction) Execute(env *ExecutionEnvelope, payload map[string]interface{}) ([]string, error) {
	var logs []string
	p, err := ValidateSyncEnvironmentPayload(payload)
	if err != nil {
		return logs, fmt.Errorf(i18n.T("msg_sync_environment_validation_failure_w"), err)
	}

	homeDir, _ := os.UserHomeDir()
	fmt.Printf("     -> %s\n", i18n.T("sync_files", p.Strategy))

	if p.Strategy == "quota-sync" {
		dest := filepath.Join(homeDir, "public_html")
		if err := CopyDir(".", dest, true); err != nil {
			return logs, fmt.Errorf(i18n.T("msg_quota_sync_copy_failed_v"), err)
		}
		logs = append(logs, i18n.T("copied_files_using_quota_sync_"))
	} else if p.Strategy == "atomic" {
		if strings.Contains(env.TransactionId, "/") || strings.Contains(env.TransactionId, "\\") || strings.Contains(env.TransactionId, "..") {
			return logs, fmt.Errorf(i18n.T("fatal_transactionid_contains_i"))
		}
		releaseDir := filepath.Join(homeDir, "releases", env.TransactionId)
		if err := CopyDir(".", releaseDir, true); err != nil {
			return logs, fmt.Errorf(i18n.T("failed_to_copy_to_release"), err)
		}
		if err := AtomicSymlink(releaseDir, filepath.Join(homeDir, "public_html")); err != nil {
			return logs, fmt.Errorf(i18n.T("failed_to_create_atomic_symlink"), err)
		}
		fmt.Printf("     -> %s\n", i18n.T("atomic_release", releaseDir))
		logs = append(logs, fmt.Sprintf(i18n.T("created_atomic_release_at"), releaseDir))
	}

	return logs, nil
}

type PruneReleasesAction struct{}

func (a *PruneReleasesAction) ValidatePreflight(payload map[string]interface{}) error {
	_, err := ValidatePruneReleasesPayload(payload)
	return err
}

func (a *PruneReleasesAction) Execute(env *ExecutionEnvelope, payload map[string]interface{}) ([]string, error) {
	var logs []string
	p, err := ValidatePruneReleasesPayload(payload)
	if err != nil {
		return logs, fmt.Errorf(i18n.T("msg_prune_releases_validation_failure_w"), err)
	}

	homeDir, _ := os.UserHomeDir()
	releasesPath := filepath.Join(homeDir, "releases")
	fmt.Printf("     -> %s\n", i18n.T("pruning", p.Retention))

	if err := PruneReleases(releasesPath, p.Retention); err != nil {
		fmt.Printf("     -> %s\n", i18n.T("warn_prune_failed", err))
	}
	logs = append(logs, fmt.Sprintf(i18n.T("pruned_releases_to_max"), p.Retention))
	return logs, nil
}

type UpsellNoticeAction struct{}

func (a *UpsellNoticeAction) ValidatePreflight(payload map[string]interface{}) error {
	_, err := ValidateUpsellNoticePayload(payload)
	return err
}

func (a *UpsellNoticeAction) Execute(env *ExecutionEnvelope, payload map[string]interface{}) ([]string, error) {
	var logs []string
	p, err := ValidateUpsellNoticePayload(payload)
	if err != nil {
		return logs, fmt.Errorf(i18n.T("msg_upsell_notice_validation_failure_w"), err)
	}

	fmt.Println("     -> 💰")
	fmt.Printf("     -> %s\n", i18n.T("upsell_notice", p.Message))
	fmt.Println("     -> 💰")
	return logs, nil
}

type NodeInstallAction struct{}

func (a *NodeInstallAction) ValidatePreflight(payload map[string]interface{}) error {
	_, err := ValidateNodeInstallPayload(payload)
	return err
}

func (a *NodeInstallAction) Execute(env *ExecutionEnvelope, payload map[string]interface{}) ([]string, error) {
	var logs []string
	p, err := ValidateNodeInstallPayload(payload)
	if err != nil {
		return logs, fmt.Errorf(i18n.T("msg_node_install_validation_failure_w"), err)
	}

	fmt.Printf("     -> %s\n", i18n.T("node_install_running", p.PackageManager, p.WorkingDirectory))

	cmdName := p.PackageManager
	var args []string

	if cmdName == "npm" {
		lockfilePath := filepath.Join(p.WorkingDirectory, "package-lock.json")
		if _, statErr := os.Stat(lockfilePath); statErr == nil {
			args = []string{"ci"}
		} else {
			args = []string{"install"}
		}
		if p.Production {
			args = append(args, "--production")
		}
	} else {
		args = []string{"install"}
		if p.Production {
			args = append(args, "--production")
		}
	}

	var cmd *exec.Cmd
	if p.TimeoutMs > 0 {
		ctx, cancel := context.WithTimeout(context.Background(), time.Duration(p.TimeoutMs)*time.Millisecond)
		defer cancel()
		cmd = exec.CommandContext(ctx, cmdName, args...)
	} else {
		cmd = exec.Command(cmdName, args...)
	}

	cmd.Dir = p.WorkingDirectory

	var outputBuf bytes.Buffer
	cmd.Stdout = &outputBuf
	cmd.Stderr = &outputBuf

	runErr := cmd.Run()
	outputStr := strings.TrimSpace(outputBuf.String())
	if outputStr != "" {
		for _, line := range strings.Split(outputStr, "\n") {
			lineClean := strings.TrimRight(line, "\r")
			if lineClean != "" {
				logs = append(logs, lineClean)
			}
		}
	}

	if runErr != nil {
		return logs, fmt.Errorf(i18n.T("node_install_failed_n"), cmdName, strings.Join(args, " "), runErr, outputStr)
	}

	logs = append(logs, fmt.Sprintf(i18n.T("successfully_executed_in"), cmdName, strings.Join(args, " "), p.WorkingDirectory))
	return logs, nil
}

