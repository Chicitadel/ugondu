/******************************************************************************
 * Project        : Ugondu
 * Module         : Client Engine
 * File           : actions_extended.go
 * Version        : 3.0.0
 * Author         : Ujomor Systems Engineering Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Last Modified  : 2026-09-30
 * Classification : ENTERPRISE
 *
 * Governance:
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
 * Copyright (c) 2026 Air Roofers Ltd
 * All Rights Reserved.
 ******************************************************************************/

package engine

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"strings"
	"time"

	"ugondu/client/engine/adapters"
	"ugondu/client/i18n"
)

func init() {
	RegisterAction("COPY_FILE", &CopyFileAction{})
	RegisterAction("CREATE_DIRECTORY", &CreateDirectoryAction{})
	RegisterAction("SYMLINK", &SymlinkAction{})
	RegisterAction("SERVICE_RESTART", &ServiceRestartAction{})
}

// COPY_FILE
type CopyFilePayload struct {
	Source      string
	Destination string
}

func ValidateCopyFilePayload(payload map[string]interface{}) (*CopyFilePayload, error) {
	if payload == nil {
		return nil, fmt.Errorf("ERR_PAYLOAD_REQUIRED")
	}
	src, ok1 := payload["source"].(string)
	dst, ok2 := payload["destination"].(string)
	if !ok1 || !ok2 || strings.TrimSpace(src) == "" || strings.TrimSpace(dst) == "" {
		return nil, fmt.Errorf("ERR_INVALID_COPY_FILE_PAYLOAD")
	}
	return &CopyFilePayload{Source: src, Destination: dst}, nil
}

type CopyFileAction struct{}
func (a *CopyFileAction) ValidatePreflight(payload map[string]interface{}) error {
	_, err := ValidateCopyFilePayload(payload)
	return err
}
func (a *CopyFileAction) Execute(env *ExecutionEnvelope, payload map[string]interface{}) ([]string, error) {
	p, err := ValidateCopyFilePayload(payload)
	if err != nil {
		return nil, err
	}
	err = copyFile(p.Source, p.Destination, 0644)
	if err != nil {
		return nil, fmt.Errorf("ERR_COPY_FAILED: %w", err)
	}
	return []string{fmt.Sprintf("Copied %s to %s", p.Source, p.Destination)}, nil
}

// CREATE_DIRECTORY
type CreateDirectoryPayload struct {
	Path string
}

func ValidateCreateDirectoryPayload(payload map[string]interface{}) (*CreateDirectoryPayload, error) {
	if payload == nil {
		return nil, fmt.Errorf("ERR_PAYLOAD_REQUIRED")
	}
	path, ok := payload["path"].(string)
	if !ok || strings.TrimSpace(path) == "" {
		return nil, fmt.Errorf("ERR_INVALID_CREATE_DIRECTORY_PAYLOAD")
	}
	return &CreateDirectoryPayload{Path: path}, nil
}

type CreateDirectoryAction struct{}
func (a *CreateDirectoryAction) ValidatePreflight(payload map[string]interface{}) error {
	_, err := ValidateCreateDirectoryPayload(payload)
	return err
}
func (a *CreateDirectoryAction) Execute(env *ExecutionEnvelope, payload map[string]interface{}) ([]string, error) {
	p, err := ValidateCreateDirectoryPayload(payload)
	if err != nil {
		return nil, err
	}
	err = os.MkdirAll(p.Path, 0755)
	if err != nil {
		return nil, fmt.Errorf("ERR_MKDIR_FAILED: %w", err)
	}
	return []string{fmt.Sprintf("Created directory %s", p.Path)}, nil
}

// SYMLINK
type SymlinkPayload struct {
	Target string
	Link   string
}

func ValidateSymlinkPayload(payload map[string]interface{}) (*SymlinkPayload, error) {
	if payload == nil {
		return nil, fmt.Errorf("ERR_PAYLOAD_REQUIRED")
	}
	target, ok1 := payload["target"].(string)
	link, ok2 := payload["link"].(string)
	if !ok1 || !ok2 || strings.TrimSpace(target) == "" || strings.TrimSpace(link) == "" {
		return nil, fmt.Errorf("ERR_INVALID_SYMLINK_PAYLOAD")
	}
	return &SymlinkPayload{Target: target, Link: link}, nil
}

type SymlinkAction struct{}
func (a *SymlinkAction) ValidatePreflight(payload map[string]interface{}) error {
	_, err := ValidateSymlinkPayload(payload)
	return err
}
func (a *SymlinkAction) Execute(env *ExecutionEnvelope, payload map[string]interface{}) ([]string, error) {
	p, err := ValidateSymlinkPayload(payload)
	if err != nil {
		return nil, err
	}
	err = AtomicSymlink(p.Target, p.Link)
	if err != nil {
		return nil, fmt.Errorf("ERR_SYMLINK_FAILED: %w", err)
	}
	return []string{fmt.Sprintf("Created symlink %s -> %s", p.Link, p.Target)}, nil
}

// SERVICE_RESTART
type ServiceRestartPayload struct {
	ServiceName string
}

func ValidateServiceRestartPayload(payload map[string]interface{}) (*ServiceRestartPayload, error) {
	if payload == nil {
		return nil, fmt.Errorf("ERR_PAYLOAD_REQUIRED")
	}
	name, ok := payload["serviceName"].(string)
	if !ok || strings.TrimSpace(name) == "" {
		return nil, fmt.Errorf("ERR_INVALID_SERVICE_RESTART_PAYLOAD")
	}
	return &ServiceRestartPayload{ServiceName: name}, nil
}

type ServiceRestartAction struct{}
func (a *ServiceRestartAction) ValidatePreflight(payload map[string]interface{}) error {
	_, err := ValidateServiceRestartPayload(payload)
	return err
}
func (a *ServiceRestartAction) Execute(env *ExecutionEnvelope, payload map[string]interface{}) ([]string, error) {
	p, err := ValidateServiceRestartPayload(payload)
	if err != nil {
		return nil, err
	}
	adapter := adapters.NewServiceRestartAdapter()
	err = adapter.Restart(p.ServiceName)
	if err != nil {
		return nil, fmt.Errorf("ERR_SERVICE_RESTART_FAILED: %w", err)
	}
	return []string{fmt.Sprintf("Restarted service %s", p.ServiceName)}, nil
}

// COMPOSER_INSTALL
type ComposerInstallAction struct{}

func (a *ComposerInstallAction) ValidatePreflight(payload map[string]interface{}) error {
	_, err := ValidateComposerInstallPayload(payload)
	return err
}

func (a *ComposerInstallAction) Execute(env *ExecutionEnvelope, payload map[string]interface{}) ([]string, error) {
	var logs []string
	p, err := ValidateComposerInstallPayload(payload)
	if err != nil {
		return logs, fmt.Errorf("COMPOSER_INSTALL validation failure: %w", err)
	}

	fmt.Printf("     -> %s\n", i18n.T("composer_install_running", p.Command, p.WorkingDirectory))

	cmdName := "composer"
	args := []string{p.Command}
	if p.NoDev {
		args = append(args, "--no-dev", "--optimize-autoloader")
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
		return logs, fmt.Errorf("composer %s failed: %w\n%s", strings.Join(args, " "), runErr, outputStr)
	}

	logs = append(logs, fmt.Sprintf("Successfully executed composer %s in %s", strings.Join(args, " "), p.WorkingDirectory))
	return logs, nil
}
