/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : client/engine
 * File           : executor_test.go
 * Version        : 1.2.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
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
	"crypto/ed25519"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"encoding/pem"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"ugondu/client/i18n"
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
		t.Errorf(i18n.T("expected_planhash_mismatch_err"))
	}

	// Case 3: TenantId mismatch
	stateBadTenant := *state
	stateBadTenant.TenantId = "tenant_attacker"
	if err := VerifyCryptographicBindings(&stateBadTenant, env); err == nil {
		t.Errorf(i18n.T("expected_tenantid_mismatch_err"))
	}

	// Case 4: ProjectId mismatch
	stateBadProj := *state
	stateBadProj.ProjectId = "project_tampered"
	if err := VerifyCryptographicBindings(&stateBadProj, env); err == nil {
		t.Errorf(i18n.T("expected_projectid_mismatch_er"))
	}

	// Case 5: EnvironmentId mismatch
	stateBadEnv := *state
	stateBadEnv.EnvironmentId = "kubernetes"
	if err := VerifyCryptographicBindings(&stateBadEnv, env); err == nil {
		t.Errorf(i18n.T("expected_environmentid_mismatc"))
	}

	// Case 6: PolicyHash mismatch
	stateBadPolicy := *state
	stateBadPolicy.PolicyHash = "policy_bypass"
	if err := VerifyCryptographicBindings(&stateBadPolicy, env); err == nil {
		t.Errorf(i18n.T("expected_policyhash_mismatch_e"))
	}
}

func TestSignatureEnforcedDirectCall(t *testing.T) {
	pub, priv, err := ed25519.GenerateKey(nil)
	if err != nil {
		t.Fatalf("failed to generate key: %v", err)
	}

	pubKeyBytes, _ := x509.MarshalPKIXPublicKey(pub)
	pubKeyPem := pem.EncodeToMemory(&pem.Block{
		Type:  "PUBLIC KEY",
		Bytes: pubKeyBytes,
	})

	validEnv := &ExecutionEnvelope{
		TransactionId:     "txn-direct-test",
		PlanHash:          "dummyhash",
		CanonicalEnvelope: "{\"transactionId\":\"txn-direct-test\"}",
	}
	validSig := ed25519.Sign(priv, []byte(validEnv.CanonicalEnvelope))
	validEnv.Signature = base64.StdEncoding.EncodeToString(validSig)

	steps := []map[string]interface{}{}

	// Test 1: Missing env var
	os.Unsetenv("UGONDU_RECIPE_PUBLIC_KEY")
	logs, err := ExecuteRecipe(validEnv, steps)
	if err == nil {
		t.Errorf(i18n.T("expected_error_due_to_missing_"))
	}
	if len(logs) > 0 {
		t.Errorf("Expected logs to be empty, got %v", logs)
	}

	// Test 2: Tampered signature
	os.Setenv("UGONDU_RECIPE_PUBLIC_KEY", string(pubKeyPem))
	defer os.Unsetenv("UGONDU_RECIPE_PUBLIC_KEY")

	tamperedEnv := &ExecutionEnvelope{
		TransactionId:     "txn-direct-test",
		PlanHash:          "dummyhash",
		CanonicalEnvelope: "{\"transactionId\":\"txn-direct-test\"}",
		Signature:         base64.StdEncoding.EncodeToString([]byte("bad_signature")),
	}

	logs, err = ExecuteRecipe(tamperedEnv, steps)
	if err == nil {
		t.Errorf(i18n.T("expected_error_due_to_invalid_"))
	}
	if len(logs) > 0 {
		t.Errorf("Expected logs to be empty, got %v", logs)
	}
}

func TestCapabilityIntersectionFailClosed(t *testing.T) {
	steps := []map[string]interface{}{
		{"action": "FETCH_REPOSITORY", "payload": map[string]interface{}{"url": "https://example.com/repo.git"}},
	}

	// 1. Grant FETCH_REPOSITORY across all 5 scopes (server ∩ tenant ∩ target ∩ agent ∩ action)
	envGranted := &ExecutionEnvelope{
		TransactionId: "tx-cap-granted",
		Capabilities: map[string]interface{}{
			"server":   []string{"FETCH_REPOSITORY", "SYNC_ENVIRONMENT"},
			"tenant":   []string{"FETCH_REPOSITORY", "SYNC_ENVIRONMENT"},
			"target":   []string{"FETCH_REPOSITORY"},
			"agent":    []string{"FETCH_REPOSITORY", "SYNC_ENVIRONMENT"},
			"action":   []string{"FETCH_REPOSITORY"},
			"required": []string{"FETCH_REPOSITORY"},
		},
	}
	if err := ValidateCapabilityIntersection(envGranted, steps); err != nil {
		t.Fatalf("expected capability intersection to pass when granted across all 5 scopes, got: %v", err)
	}

	// 2. Remove FETCH_REPOSITORY from target scope -> intersection must be empty -> fail closed
	envDeniedByTarget := &ExecutionEnvelope{
		TransactionId: "tx-cap-denied",
		Capabilities: map[string]interface{}{
			"server":   []string{"FETCH_REPOSITORY", "SYNC_ENVIRONMENT"},
			"tenant":   []string{"FETCH_REPOSITORY", "SYNC_ENVIRONMENT"},
			"target":   []string{"PRUNE_RELEASES"},
			"agent":    []string{"FETCH_REPOSITORY", "SYNC_ENVIRONMENT"},
			"action":   []string{"FETCH_REPOSITORY"},
			"required": []string{"FETCH_REPOSITORY"},
		},
	}
	if err := ValidateCapabilityIntersection(envDeniedByTarget, steps); err == nil {
		t.Errorf("expected ValidateCapabilityIntersection to fail closed when capability missing from target scope")
	}

	// 3. Step requires capability not in envelope -> fail closed
	stepsUnprivileged := []map[string]interface{}{
		{"action": "SERVICE_RESTART", "payload": map[string]interface{}{"serviceName": "nginx"}},
	}
	if err := ValidateCapabilityIntersection(envGranted, stepsUnprivileged); err == nil {
		t.Errorf("expected ValidateCapabilityIntersection to fail closed when step action SERVICE_RESTART is not in intersection")
	}
}

func TestFetchExecutionRecipeSendsPassportAndTraceHeaders(t *testing.T) {
	pub, priv, _ := ed25519.GenerateKey(nil)
	pubBytes, _ := x509.MarshalPKIXPublicKey(pub)
	pubPem := string(pem.EncodeToMemory(&pem.Block{Type: "PUBLIC KEY", Bytes: pubBytes}))

	var capturedPassport, capturedTraceparent, capturedCorrId string

	stepsJSON := `[{"action":"UPSELL_NOTICE","payload":{"message":"ok"}}]`
	planHashBytes := sha256.Sum256([]byte(stepsJSON))
	planHash := hex.EncodeToString(planHashBytes[:])

	envObj := map[string]interface{}{
		"keyId":         "key_test_headers_1",
		"transactionId": "tx_headers_1",
		"executionId":   "exec_headers_1",
		"nonce":         "nonce_headers_1",
		"expiresAt":     time.Now().Add(10 * time.Minute).UnixMilli(),
		"planHash":      planHash,
	}
	envBytes, _ := json.Marshal(envObj)
	canonicalEnv := string(envBytes)
	sig := ed25519.Sign(priv, envBytes)

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/deploy/resolve" {
			capturedPassport = r.Header.Get("X-Ugondu-Passport-Id")
			capturedTraceparent = r.Header.Get("traceparent")
			capturedCorrId = r.Header.Get("X-Correlation-Id")
			resp := ExecutionRecipe{
				CanonicalEnvelope: canonicalEnv,
				CanonicalSteps:    stepsJSON,
				Signature:         base64.StdEncoding.EncodeToString(sig),
			}
			_ = json.NewEncoder(w).Encode(resp)
			return
		}
		if r.URL.Path == "/keys" {
			_ = json.NewEncoder(w).Encode(map[string]interface{}{
				"keys": []map[string]string{
					{"id": "key_test_headers_1", "publicKey": pubPem},
				},
			})
			return
		}
		http.NotFound(w, r)
	}))
	defer server.Close()

	os.Setenv("UGONDU_PASSPORT_ID", "passport-sovereign-99")
	defer os.Unsetenv("UGONDU_PASSPORT_ID")

	ctx := &DeploymentContext{
		RepositoryUrl:     "https://example.com/repo.git",
		Branch:            "main",
		TargetEnvironment: "production",
	}
	env, steps, _, err := FetchExecutionRecipe(server.URL, ctx)
	if err != nil {
		t.Fatalf("FetchExecutionRecipe failed: %v", err)
	}
	if env.TransactionId != "tx_headers_1" || len(steps) != 1 {
		t.Fatalf("unexpected recipe result: %+v, steps=%d", env, len(steps))
	}
	if capturedPassport != "passport-sovereign-99" {
		t.Errorf("expected X-Ugondu-Passport-Id='passport-sovereign-99', got %q", capturedPassport)
	}
	if capturedTraceparent == "" {
		t.Errorf("expected W3C traceparent header to be sent")
	}
	if capturedCorrId == "" {
		t.Errorf("expected X-Correlation-Id header to be sent")
	}
}
