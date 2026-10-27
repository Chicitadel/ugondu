/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Client / Engine / Test Suite
 * File           : executor_test.go
 * Version        : 2.1.0
 * Author         : Engine Execution Engineering Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Last Modified  : 2026-10-27
 * Classification : ENTERPRISE | INTERNAL
 *
 * Standards: ISO 27001, SOC 2, OWASP ASVS, NIST SP 800-53
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

func TestVerifyCryptographicBindings(t *testing.T) {
	state := &ExecutionState{
		ExecutionId:   "exec-12345",
		TransactionId: "tx-abcde",
		PlanHash:      "7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
		PolicyHash:    "9f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
		StateSequence: 1,
		Status:        "RUNNING",
	}

	env := &ExecutionEnvelope{
		ExecutionId:   "exec-12345",
		TransactionId: "tx-abcde",
		PlanHash:      "7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
		PolicyHash:    "9f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
	}

	// 1. Valid Matching Hashes
	if err := VerifyCryptographicBindings(state, env); err != nil {
		t.Fatalf(i18n.T("expected_cryptographic_bindin"), err)
	}

	// 2. Mismatched Execution ID
	stateBadExec := *state
	stateBadExec.ExecutionId = "exec-hijacked"
	if err := VerifyCryptographicBindings(&stateBadExec, env); err == nil {
		t.Errorf(i18n.T("expected_executionid_mismatch_"))
	}

	// 3. Mismatched Transaction ID
	stateBadTx := *state
	stateBadTx.TransactionId = "tx-hijacked"
	if err := VerifyCryptographicBindings(&stateBadTx, env); err == nil {
		t.Errorf(i18n.T("expected_transactionid_mismat"))
	}

	// 4. Mismatched Plan Hash (Tampered Plan)
	stateBadPlan := *state
	stateBadPlan.PlanHash = "tampered_plan_hash_00000000000000000000000000000000000000000000"
	if err := VerifyCryptographicBindings(&stateBadPlan, env); err == nil {
		t.Errorf(i18n.T("expected_planhash_mismatch_err"))
	}

	// 5. Mismatched Policy Hash (Tampered Policy Enforcement)
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
		RepositoryUrl:     "https://example.invalid/repo",
		Branch:            "main",
		TargetEnvironment: "test",
	})
	if err == nil {
		t.Fatal("expected non-200 control-plane response to return an error")
	}
	if env != nil || steps != nil || raw != nil {
		t.Fatalf("expected empty recipe outputs on error, got env=%v steps=%v raw=%q", env, steps, raw)
	}
}

func TestVerifyCryptographicBindingsFailsClosedOnMissingInputs(t *testing.T) {
	state := &ExecutionState{ExecutionId: "exec-bound", TransactionId: "tx-bound"}
	env := &ExecutionEnvelope{ExecutionId: "exec-bound", TransactionId: "tx-bound"}

	if err := VerifyCryptographicBindings(nil, env); err == nil {
		t.Fatal("expected nil state to fail closed")
	}
	if err := VerifyCryptographicBindings(state, nil); err == nil {
		t.Fatal("expected nil envelope to fail closed")
	}

	missingExecution := *env
	missingExecution.ExecutionId = ""
	if err := VerifyCryptographicBindings(state, &missingExecution); err == nil {
		t.Fatal("expected missing envelope executionId to fail closed")
	}
	missingTransaction := *env
	missingTransaction.TransactionId = ""
	if err := VerifyCryptographicBindings(state, &missingTransaction); err == nil {
		t.Fatal("expected missing envelope transactionId to fail closed")
	}
}

func TestExecuteRecipeRobustnessFailClosed(t *testing.T) {
	// 1. Nil envelope must fail closed without panic
	if _, err := ExecuteRecipe(nil, nil); err == nil {
		t.Fatal("expected ExecuteRecipe(nil, ...) to fail closed")
	}

	// 2. Empty TransactionId must fail closed without panic
	envEmptyTx := &ExecutionEnvelope{
		TransactionId: "",
		ExecutionId:   "exec-1",
		KeyId:         "key-1",
	}
	if _, err := ExecuteRecipe(envEmptyTx, nil); err == nil {
		t.Fatal("expected empty TransactionId to fail closed")
	}

	// 3. Whitespace TransactionId must fail closed without panic
	envWhitespaceTx := &ExecutionEnvelope{
		TransactionId: "   ",
		ExecutionId:   "exec-1",
		KeyId:         "key-1",
	}
	if _, err := ExecuteRecipe(envWhitespaceTx, nil); err == nil {
		t.Fatal("expected whitespace TransactionId to fail closed")
	}

	// 4. Missing ExecutionId must fail closed without panic
	envEmptyExec := &ExecutionEnvelope{
		TransactionId: "tx-1",
		ExecutionId:   "",
		KeyId:         "key-1",
	}
	if _, err := ExecuteRecipe(envEmptyExec, nil); err == nil {
		t.Fatal("expected empty ExecutionId to fail closed")
	}

	// 5. Missing public key must fail closed without panic
	envMissingKey := &ExecutionEnvelope{
		TransactionId:     "tx-1",
		ExecutionId:       "exec-1",
		KeyId:             "non-existent-key-9999",
		Signature:         "dGVzdA==",
		CanonicalEnvelope: `{"transactionId":"tx-1"}`,
	}
	os.Unsetenv("UGONDU_RECIPE_PUBLIC_KEY")
	if _, err := ExecuteRecipe(envMissingKey, nil); err == nil {
		t.Fatal("expected missing public key to fail closed")
	}

	// 6. Corrupted signature must fail closed without panic
	pub, _, err := ed25519.GenerateKey(nil)
	if err != nil {
		t.Fatalf("failed to generate key: %v", err)
	}
	pubKeyBytes, _ := x509.MarshalPKIXPublicKey(pub)
	pubKeyPem := pem.EncodeToMemory(&pem.Block{
		Type:  "PUBLIC KEY",
		Bytes: pubKeyBytes,
	})
	os.Setenv("UGONDU_RECIPE_PUBLIC_KEY", string(pubKeyPem))
	defer os.Unsetenv("UGONDU_RECIPE_PUBLIC_KEY")

	envCorruptedSig := &ExecutionEnvelope{
		TransactionId:     "tx-1",
		ExecutionId:       "exec-1",
		KeyId:             "key-1",
		Signature:         "not-valid-base64!!!",
		CanonicalEnvelope: `{"transactionId":"tx-1"}`,
	}
	if _, err := ExecuteRecipe(envCorruptedSig, nil); err == nil {
		t.Fatal("expected corrupted signature to fail closed")
	}
}

func TestParseRecipeLocallyCorruptedInputs(t *testing.T) {
	// 1. Empty body must fail closed
	if _, _, err := ParseRecipeLocally([]byte(""), ""); err == nil {
		t.Fatal("expected empty recipe body to fail closed")
	}

	// 2. Corrupted JSON body must fail closed
	if _, _, err := ParseRecipeLocally([]byte("{not-json"), ""); err == nil {
		t.Fatal("expected corrupted JSON recipe body to fail closed")
	}

	// 3. Corrupted CanonicalEnvelope JSON must fail closed
	recipeBadEnvelope := ExecutionRecipe{
		CanonicalEnvelope: "{not-valid-envelope-json",
		CanonicalSteps:    "[]",
		Signature:         "dGVzdA==",
	}
	rawBadEnv, _ := json.Marshal(recipeBadEnvelope)
	if _, _, err := ParseRecipeLocally(rawBadEnv, ""); err == nil {
		t.Fatal("expected corrupted canonical envelope to fail closed")
	}

	// 4. Missing key and empty apiURL must fail closed
	recipeNoKey := ExecutionRecipe{
		CanonicalEnvelope: `{"keyId":"non-existent-key-offline"}`,
		CanonicalSteps:    "[]",
		Signature:         "dGVzdA==",
	}
	rawNoKey, _ := json.Marshal(recipeNoKey)
	if _, _, err := ParseRecipeLocally(rawNoKey, ""); err == nil {
		t.Fatal("expected missing key without apiURL to fail closed")
	}
}
