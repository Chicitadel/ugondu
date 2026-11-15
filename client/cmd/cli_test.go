/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : client/cmd
 * File           : cli_test.go
 * Version        : 3.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-10-18
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
 * - NIST SP 800-53
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
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestGlobalFlagParsingAndJSONEnvelope(t *testing.T) {
	tmpOut, err := os.MkdirTemp("", "ugondu_cli_out_*")
	if err != nil {
		t.Fatalf("MkdirTemp failed: %v", err)
	}
	defer os.RemoveAll(tmpOut)
	outFile := filepath.Join(tmpOut, "envelope.json")

	args := []string{
		"ugondu",
		"policy", "inspect",
		"--target", "aws-prod-eu",
		"--provider", "aws",
		"--region", "eu-central-1",
		"--pack", "least-privilege-pack-v1",
		"--profile", "enterprise-sec",
		"--operation", "op-custom-101",
		"--plan", "plan-custom-202",
		"--timeout", "30s",
		"--json",
		"--output", outFile,
	}

	code, env := ExecuteCommand(args)
	if code != ExitSuccess {
		t.Fatalf("expected ExitSuccess (0), got %d", code)
	}
	if env == nil {
		t.Fatalf("expected non-nil CLIOutputEnvelope")
	}
	if env.Status != "VERIFIED" || env.OperationID != "op-custom-101" || env.PlanID != "plan-custom-202" || env.Target != "aws-prod-eu" {
		t.Errorf("unexpected envelope fields: %+v", env)
	}

	// Verify output file has all required JSON envelope keys
	rawBytes, err := os.ReadFile(outFile)
	if err != nil {
		t.Fatalf("expected output file at %s: %v", outFile, err)
	}
	var parsed map[string]interface{}
	if err := json.Unmarshal(rawBytes, &parsed); err != nil {
		t.Fatalf("failed to unmarshal JSON output envelope: %v", err)
	}
	requiredKeys := []string{
		"status", "operationId", "target", "planId",
		"blockedReasons", "requiredApprovals", "actions",
		"verification", "evidenceRef", "retryable", "exitCode",
	}
	for _, k := range requiredKeys {
		if _, ok := parsed[k]; !ok {
			t.Errorf("missing required JSON envelope key %q in output", k)
		}
	}
}

func TestNonInteractiveApprovalRequiredExitCode5(t *testing.T) {
	// Mutating policy attach in --non-interactive mode without --yes or --force must return ExitApprovalRequired (5)
	code, env := ExecuteCommand([]string{"ugondu", "policy", "attach", "--target", "prod", "--non-interactive", "--json"})
	if code != ExitApprovalRequired {
		t.Fatalf("expected ExitApprovalRequired (5), got %d", code)
	}
	if env == nil || env.Status != "APPROVAL_REQUIRED" || env.ExitCode != ExitApprovalRequired {
		t.Errorf("expected APPROVAL_REQUIRED envelope with exitCode 5, got %+v", env)
	}

	// Passing --yes allows mutating policy attach to succeed with ExitSuccess (0)
	codeYes, envYes := ExecuteCommand([]string{"ugondu", "policy", "attach", "--target", "prod", "--non-interactive", "--yes", "--json"})
	if codeYes != ExitSuccess || envYes.Status != "VERIFIED" {
		t.Errorf("expected ExitSuccess (0) when --yes is passed, got code=%d, status=%s", codeYes, envYes.Status)
	}
}

func TestUPLMCommandSurfaceCompleteness(t *testing.T) {
	policySubcommands := []string{
		"inspect", "list", "show", "attachments", "trust", "boundaries",
		"ownership", "drift", "bootstrap", "apply", "install", "repair",
		"attach", "detach", "replace", "rollback", "verify", "retire", "uninstall",
	}
	for _, sub := range policySubcommands {
		code, env := ExecuteCommand([]string{"ugondu", "policy", sub, "--yes", "--json"})
		if code != ExitSuccess || env == nil {
			t.Errorf("policy %s failed: code=%d", sub, code)
		}
	}

	accessSubcommands := []string{
		"diagnose", "gaps", "bootstrap-options", "bootstrap-plan",
		"approval-status", "resume", "verify",
	}
	for _, sub := range accessSubcommands {
		code, env := ExecuteCommand([]string{"ugondu", "access", sub, "--yes", "--json"})
		if code != ExitSuccess || env == nil {
			t.Errorf("access %s failed: code=%d", sub, code)
		}
	}

	operationSubcommands := []string{"list", "status", "events", "resume", "cancel"}
	for _, sub := range operationSubcommands {
		code, env := ExecuteCommand([]string{"ugondu", "operation", sub, "--yes", "--json"})
		if code != ExitSuccess || env == nil {
			t.Errorf("operation %s failed: code=%d", sub, code)
		}
	}

	otherCommands := [][]string{
		{"ugondu", "capability", "list", "--json"},
		{"ugondu", "capability", "describe", "FETCH_REPOSITORY", "--json"},
		{"ugondu", "capability", "matrix", "--json"},
		{"ugondu", "environment", "list", "--json"},
		{"ugondu", "environment", "inspect", "production", "--json"},
		{"ugondu", "identity", "inspect", "--json"},
		{"ugondu", "provider", "capabilities", "--json"},
		{"ugondu", "providers", "--json"},
		{"ugondu", "models", "--json"},
		{"ugondu", "config", "validate", "--json"},
		{"ugondu", "doctor", "--json"},
		{"ugondu", "plan", "--json"},
		{"ugondu", "plugins", "list", "--json"},
		{"ugondu", "plugins", "verify", "--json"},
		{"ugondu", "evidence", "show", "--json"},
		{"ugondu", "evidence", "export", "--json"},
		{"ugondu", "rollback", "--dry-run", "--json"},
	}

	for _, cmdArgs := range otherCommands {
		code, env := ExecuteCommand(cmdArgs)
		if code != ExitSuccess || env == nil {
			t.Errorf("command %v failed: code=%d", cmdArgs, code)
		}
	}

	// Unsupported capability returns ExitUnsupportedCap (6)
	codeUnsup, _ := ExecuteCommand([]string{"ugondu", "capability", "describe", "NONEXISTENT_CAPABILITY", "--json"})
	if codeUnsup != ExitUnsupportedCap {
		t.Errorf("expected ExitUnsupportedCap (6), got %d", codeUnsup)
	}

	// Unknown command returns ExitInvalidInput (2)
	codeInvalid, _ := ExecuteCommand([]string{"ugondu", "unknown-command-xyz", "--json"})
	if codeInvalid != ExitInvalidInput {
		t.Errorf("expected ExitInvalidInput (2), got %d", codeInvalid)
	}
}
