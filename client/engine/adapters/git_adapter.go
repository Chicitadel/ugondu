/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : client/engine/adapters
 * File           : git_adapter.go
 * Version        : 1.2.0
 * Author         : Air Roofers
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
 * Classification : ENTERPRISE
 *
 * Governance:
 * - AI Governed
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

package adapters

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"runtime"
	"strings"
	"time"
)

type GitAdapter struct {
	BinaryPath string
	Timeout    time.Duration
}

func NewGitAdapter() *GitAdapter {
	a := &GitAdapter{
		Timeout: 10 * time.Minute,
	}
	a.BinaryPath = a.resolveGitBinary()
	return a
}

func (a *GitAdapter) resolveGitBinary() string {
	if bin := os.Getenv("UGONDU_GIT_BIN"); bin != "" {
		return bin
	}
	if runtime.GOOS == "windows" {
		return "git.exe"
	}
	return "/usr/bin/git"
}

func (a *GitAdapter) Pull(repoURL, branch, workDir, credentialFile string) error {
	if !strings.HasPrefix(repoURL, "https://") && !strings.HasPrefix(repoURL, "git@") {
		return fmt.Errorf(i18n.T("invalid_repo_url_scheme"), repoURL)
	}

	args := []string{"pull", repoURL, branch}
	ctx, cancel := context.WithTimeout(context.Background(), a.Timeout)
	defer cancel()

	cmd := exec.CommandContext(ctx, a.BinaryPath, args...)
	cmd.Dir = workDir
	cmd.Env = []string{
		"HOME=" + os.Getenv("HOME"),
		"PATH=" + os.Getenv("PATH"),
		"GIT_SSH_COMMAND=" + os.Getenv("GIT_SSH_COMMAND"),
	}

	if credentialFile != "" {
		cmd.Env = append(cmd.Env, "GIT_ASKPASS="+credentialFile)
	}

	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf(i18n.T("git_pull_failed"), err)
	}
	return nil
}

func (a *GitAdapter) Clone(repoURL, branch, targetDir string) error {
	if !strings.HasPrefix(repoURL, "https://") && !strings.HasPrefix(repoURL, "git@") {
		return fmt.Errorf(i18n.T("invalid_repo_url_scheme"), repoURL)
	}

	args := []string{"clone", "-b", branch, repoURL, targetDir}
	ctx, cancel := context.WithTimeout(context.Background(), a.Timeout)
	defer cancel()

	cmd := exec.CommandContext(ctx, a.BinaryPath, args...)
	cmd.Env = []string{
		"HOME=" + os.Getenv("HOME"),
		"PATH=" + os.Getenv("PATH"),
		"GIT_SSH_COMMAND=" + os.Getenv("GIT_SSH_COMMAND"),
	}

	if err := cmd.Run(); err != nil {
		return fmt.Errorf(i18n.T("git_clone_failed"), err)
	}
	return nil
}

func (a *GitAdapter) GetRemoteURL(workDir string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), a.Timeout)
	defer cancel()
	cmd := exec.CommandContext(ctx, a.BinaryPath, "config", "--get", "remote.origin.url")
	cmd.Dir = workDir
	out, err := cmd.Output()
	return string(out), err
}

func (a *GitAdapter) GetBranch(workDir string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), a.Timeout)
	defer cancel()
	cmd := exec.CommandContext(ctx, a.BinaryPath, "rev-parse", "--abbrev-ref", "HEAD")
	cmd.Dir = workDir
	out, err := cmd.Output()
	return string(out), err
}

