/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : client/engine
 * File           : executor_test.go
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
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
)

func TestPublicKeyCaching(t *testing.T) {
	keyId := "key_test_cache_789"
	fakePem := "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAtestfakekey\n-----END PUBLIC KEY-----\n"

	// Cleanup
	cachePath, _ := GetKeyCachePath(keyId)
	_ = os.Remove(cachePath)
	defer os.Remove(cachePath)

	// Save
	if err := SaveCachedPublicKey(keyId, fakePem); err != nil {
		t.Fatalf("SaveCachedPublicKey failed: %v", err)
	}

	// Verify file exists
	if _, err := os.Stat(cachePath); err != nil {
		t.Fatalf("Cached public key not found at %s", cachePath)
	}

	// Load
	loadedPem, err := LoadCachedPublicKey(keyId)
	if err != nil {
		t.Fatalf("LoadCachedPublicKey failed: %v", err)
	}
	if loadedPem != fakePem {
		t.Errorf("Loaded PEM mismatch. Expected %s, got %s", fakePem, loadedPem)
	}
}

func TestVerifyCryptographicBindings(t *testing.T) {
	env := &ExecutionEnvelope{
		TransactionId: "tx_999",
		PlanHash:      "hash_plan_1",
		TenantId:      "tenant_a",
		ProjectId:     "project_b",
		EnvironmentId: "cpanel",
		PolicyHash:    "policy_c",
	}

	// Case 1: Matching bindings
	state := &ExecutionState{
		TransactionId: "tx_999",
		PlanHash:      "hash_plan_1",
		TenantId:      "tenant_a",
		ProjectId:     "project_b",
		EnvironmentId: "cpanel",
		PolicyHash:    "policy_c",
	}
	if err := VerifyCryptographicBindings(state, env); err != nil {
		t.Errorf("Expected matching bindings to pass, got: %v", err)
	}

	// Case 2: PlanHash mismatch
	stateBadPlan := *state
	stateBadPlan.PlanHash = "tampered_plan_hash"
	if err := VerifyCryptographicBindings(&stateBadPlan, env); err == nil {
		t.Errorf("Expected PlanHash mismatch error, got nil")
	}

	// Case 3: TenantId mismatch
	stateBadTenant := *state
	stateBadTenant.TenantId = "tenant_attacker"
	if err := VerifyCryptographicBindings(&stateBadTenant, env); err == nil {
		t.Errorf("Expected TenantId mismatch error, got nil")
	}

	// Case 4: ProjectId mismatch
	stateBadProj := *state
	stateBadProj.ProjectId = "project_tampered"
	if err := VerifyCryptographicBindings(&stateBadProj, env); err == nil {
		t.Errorf("Expected ProjectId mismatch error, got nil")
	}

	// Case 5: EnvironmentId mismatch
	stateBadEnv := *state
	stateBadEnv.EnvironmentId = "kubernetes"
	if err := VerifyCryptographicBindings(&stateBadEnv, env); err == nil {
		t.Errorf("Expected EnvironmentId mismatch error, got nil")
	}

	// Case 6: PolicyHash mismatch
	stateBadPolicy := *state
	stateBadPolicy.PolicyHash = "policy_bypass"
	if err := VerifyCryptographicBindings(&stateBadPolicy, env); err == nil {
		t.Errorf("Expected PolicyHash mismatch error, got nil")
	}
}

func TestFetchExecutionRecipeHTTPErrorReturnsFourValuesSafely(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/deploy/resolve" {
			http.NotFound(w, r)
			return
		}
		http.Error(w, "deployment rejected", http.StatusForbidden)
	}))
	defer server.Close()

	env, steps, raw, err := FetchExecutionRecipe(server.URL, &DeploymentContext{
		RepositoryUrl: "https://example.invalid/repo",
		Branch:        "main",
		TargetEnvironment: "test",
	})
	if err == nil {
		t.Fatal("expected non-200 control-plane response to return an error")
	}
	if env != nil || steps != nil || raw != nil {
		t.Fatalf("expected empty recipe outputs on error, got env=%v steps=%v raw=%q", env, steps, raw)
	}
}
