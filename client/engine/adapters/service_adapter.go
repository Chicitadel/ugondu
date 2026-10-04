/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : client/engine/adapters
 * File           : service_adapter.go
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
	"regexp"
	"runtime"
	"time"

	"ugondu/client/i18n"
)

type ServiceRestartAdapter struct {
	Timeout time.Duration
}

func NewServiceRestartAdapter() *ServiceRestartAdapter {
	return &ServiceRestartAdapter{
		Timeout: 30 * time.Second,
	}
}

func (a *ServiceRestartAdapter) Restart(serviceName string) error {
	matched, _ := regexp.MatchString(`^[a-zA-Z0-9_.@-]+$`, serviceName)
	if !matched {
		return fmt.Errorf(i18n.T("invalid_service_name"), serviceName)
	}

	var cmdName string
	var args []string

	if _, err := os.Stat("/run/systemd/private"); err == nil {
		cmdName = "systemctl"
		args = []string{"restart", serviceName}
	} else if runtime.GOOS == "windows" {
		cmdName = "sc.exe"
		args = []string{"stop", serviceName}
	} else {
		cmdName = "service"
		args = []string{serviceName, "restart"}
	}

	ctx, cancel := context.WithTimeout(context.Background(), a.Timeout)
	defer cancel()

	cmd := exec.CommandContext(ctx, cmdName, args...)
	if err := cmd.Run(); err != nil {
		return fmt.Errorf(i18n.T("service_stoprestart_failed"), err)
	}

	if runtime.GOOS == "windows" {
		ctxStart, cancelStart := context.WithTimeout(context.Background(), a.Timeout)
		defer cancelStart()
		cmdStart := exec.CommandContext(ctxStart, cmdName, "start", serviceName)
		if err := cmdStart.Run(); err != nil {
			return fmt.Errorf(i18n.T("service_start_failed"), err)
		}
	}

	return nil
}
