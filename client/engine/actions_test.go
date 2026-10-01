/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : client/engine
 * File           : actions_test.go
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
	"testing"
	"ugondu/client/engine/adapters"
)

func TestActionsRegistry(t *testing.T) {
	// SHELL_EXEC must be completely removed
	if _, exists := ActionRegistry["SHELL_EXEC"]; exists {
		t.Errorf("Security Violation: SHELL_EXEC must not be registered in ActionRegistry")
	}

	expectedActions := []string{
		"FETCH_REPOSITORY",
		"SYNC_ENVIRONMENT",
		"PRUNE_RELEASES",
		"UPSELL_NOTICE",
		"NODE_INSTALL",
		"COMPOSER_INSTALL",
	}

	for _, act := range expectedActions {
		if _, exists := ActionRegistry[act]; !exists {
			t.Errorf("Expected action %s to be registered in ActionRegistry", act)
		}
	}
}

func TestPayloadValidators(t *testing.T) {
	// NodeInstallPayload defaults
	pNode, err := ValidateNodeInstallPayload(nil)
	if err != nil {
		t.Fatalf("ValidateNodeInstallPayload(nil) failed: %v", err)
	}
	if pNode.PackageManager != "npm" || pNode.WorkingDirectory != "." || !pNode.Production {
		t.Errorf("Unexpected default NodeInstallPayload: %+v", pNode)
	}

	// ComposerInstallPayload defaults
	pComposer, err := ValidateComposerInstallPayload(nil)
	if err != nil {
		t.Fatalf("ValidateComposerInstallPayload(nil) failed: %v", err)
	}
	if pComposer.Command != "install" || pComposer.WorkingDirectory != "." || !pComposer.NoDev {
		t.Errorf("Unexpected default ComposerInstallPayload: %+v", pComposer)
	}

	// FetchRepositoryPayload validation
	_, err = ValidateFetchRepositoryPayload(nil)
	if err == nil {
		t.Errorf("Expected validation error for nil FETCH_REPOSITORY payload")
	}
	_, err = ValidateFetchRepositoryPayload(map[string]interface{}{"url": ""})
	if err == nil {
		t.Errorf("Expected validation error for empty URL")
	}
	pFetch, err := ValidateFetchRepositoryPayload(map[string]interface{}{"url": "https://example.com/repo.git"})
	if err != nil || pFetch.Branch != "main" {
		t.Errorf("Expected default branch 'main', got branch: %s, err: %v", pFetch.Branch, err)
	}

	// SyncEnvironmentPayload validation
	_, err = ValidateSyncEnvironmentPayload(map[string]interface{}{"strategy": "invalid-strategy"})
	if err == nil {
		t.Errorf("Expected validation error for invalid strategy")
	}
	pSync, err := ValidateSyncEnvironmentPayload(map[string]interface{}{"strategy": "quota-sync"})
	if err != nil || pSync.Strategy != "quota-sync" {
		t.Errorf("Expected valid strategy quota-sync, err: %v", err)
	}
}

func TestGitAdapterArgSanitization(t *testing.T) {
	adapter := adapters.NewGitAdapter()
	err := adapter.Pull("https://github.com/repo.git", "../../../etc/passwd", ".", "")
	if err == nil {
		t.Errorf("Expected error for branch name with path traversal")
	}
	err = adapter.Pull("file:///etc/passwd", "main", ".", "")
	if err == nil {
		t.Errorf("Expected error for invalid repo URL scheme")
	}
}

func TestServiceAdapterNameValidation(t *testing.T) {
	adapter := adapters.NewServiceRestartAdapter()
	err := adapter.Restart("my-service; rm -rf /")
	if err == nil {
		t.Errorf("Expected error for service name with semicolon")
	}
	err = adapter.Restart("my service")
	if err == nil {
		t.Errorf("Expected error for service name with spaces")
	}
}

