/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Client / Engine / Test Suite
 * File           : executor_test.go
 * Version        : 2.2.0
 * Author         : Enterprise Architecture Council / Ujomor Systems Engineering Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-09-30
 * Last Modified  : 2026-10-27
 * Classification : ENTERPRISE | INTERNAL
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
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
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
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"ugondu/client/i18n"
)

func getPersistedField(s *ExecutionState, token string) string {
	switch token {
	case "msg_cryptographic_binding_mismatch_executionid":
		return s.ExecutionId
	case "msg_cryptographic_binding_mismatch_transactionid":
		return s.TransactionId
	case "msg_cryptographic_binding_mismatch_planhash":
		return s.PlanHash
	case "msg_cryptographic_binding_mismatch_tenantid":
		return s.TenantId
	case "msg_cryptographic_binding_mismatch_projectid":
		return s.ProjectId
	case "msg_cryptographic_binding_mismatch_environme":
		return s.EnvironmentId
	case "msg_cryptographic_binding_mismatch_policyhas":
		return s.PolicyHash
	default:
		return ""
	}
}

func TestVerifyCryptographicBindings(t *testing.T) {
	state := &ExecutionState{
		ExecutionId:   "exec-12345",
		TransactionId: "tx-abcde",
		PlanHash:      "7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
		PolicyHash:    "9f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
		TenantId:      "tenant-alpha",
		ProjectId:     "project-beta",
		EnvironmentId: "env-gamma",
		StateSequence: 1,
		Status:        "RUNNING",
	}

	env := &ExecutionEnvelope{
		ExecutionId:   "exec-12345",
		TransactionId: "tx-abcde",
		PlanHash:      "7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
		PolicyHash:    "9f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
		TenantId:      "tenant-alpha",
		ProjectId:     "project-beta",
		EnvironmentId: "env-gamma",
	}

	// 1. Valid Matching Hashes
	if err := VerifyCryptographicBindings(state, env); err != nil {
		t.Fatalf(i18n.T("expected_cryptographic_bindin"), err)
	}

	// 2. Mismatched individual fields
	mismatches := []struct {
		token    string
		badState func() *ExecutionState
	}{
		{"expected_executionid_mismatch_", func() *ExecutionState { s := *state; s.ExecutionId = "exec-hijacked"; return &s }},
		{"expected_transactionid_mismat", func() *ExecutionState { s := *state; s.TransactionId = "tx-hijacked"; return &s }},
		{"expected_planhash_mismatch_err", func() *ExecutionState { s := *state; s.PlanHash = "tampered_plan_hash"; return &s }},
		{"expected_policyhash_mismatch_e", func() *ExecutionState { s := *state; s.PolicyHash = "policy_bypass"; return &s }},
		{"expected_tenantid_mismatch", func() *ExecutionState { s := *state; s.TenantId = "tenant-hijacked"; return &s }},
		{"expected_projectid_mismatch", func() *ExecutionState { s := *state; s.ProjectId = "project-hijacked"; return &s }},
		{"expected_environmentid_mismatch", func() *ExecutionState { s := *state; s.EnvironmentId = "env-hijacked"; return &s }},
	}
	for _, m := range mismatches {
		if err := VerifyCryptographicBindings(m.badState(), env); err == nil {
			t.Errorf(i18n.T(m.token))
		}
	}
}

func TestVerifyCryptographicBindingsFailsClosedOnMissingInputs(t *testing.T) {
	state := &ExecutionState{
		ExecutionId:   "exec-bound",
		TransactionId: "tx-bound",
		PlanHash:      "plan-bound",
		TenantId:      "tenant-bound",
		ProjectId:     "project-bound",
		EnvironmentId: "env-bound",
		PolicyHash:    "policy-bound",
	}
	env := &ExecutionEnvelope{
		ExecutionId:   "exec-bound",
		TransactionId: "tx-bound",
		PlanHash:      "plan-bound",
		TenantId:      "tenant-bound",
		ProjectId:     "project-bound",
		EnvironmentId: "env-bound",
		PolicyHash:    "policy-bound",
	}

	// 1. Nil state must fail closed with localized token invalid_envelope_format
	if err := VerifyCryptographicBindings(nil, env); err == nil {
		t.Fatal(i18n.T("expected_nil_state_to_fail_closed"))
	} else if err.Error() != i18n.T("invalid_envelope_format") {
		t.Fatalf(i18n.T("expected_invalid_envelope_format_token"), err)
	}

	// 2. Nil envelope must fail closed with localized token invalid_envelope_format
	if err := VerifyCryptographicBindings(state, nil); err == nil {
		t.Fatal(i18n.T("expected_nil_envelope_to_fail_closed"))
	} else if err.Error() != i18n.T("invalid_envelope_format") {
		t.Fatalf(i18n.T("expected_invalid_envelope_format_token"), err)
	}

	// 3. Both nil must fail closed with localized token invalid_envelope_format
	if err := VerifyCryptographicBindings(nil, nil); err == nil {
		t.Fatal(i18n.T("expected_nil_both_to_fail_closed"))
	} else if err.Error() != i18n.T("invalid_envelope_format") {
		t.Fatalf(i18n.T("expected_invalid_envelope_format_token"), err)
	}

	// 4. Empty envelope fields for populated persisted state trigger mismatch
	fields := []struct {
		token string
		empty func() *ExecutionEnvelope
	}{
		{"msg_cryptographic_binding_mismatch_executionid", func() *ExecutionEnvelope { e := *env; e.ExecutionId = ""; return &e }},
		{"msg_cryptographic_binding_mismatch_transactionid", func() *ExecutionEnvelope { e := *env; e.TransactionId = ""; return &e }},
		{"msg_cryptographic_binding_mismatch_planhash", func() *ExecutionEnvelope { e := *env; e.PlanHash = ""; return &e }},
		{"msg_cryptographic_binding_mismatch_tenantid", func() *ExecutionEnvelope { e := *env; e.TenantId = ""; return &e }},
		{"msg_cryptographic_binding_mismatch_projectid", func() *ExecutionEnvelope { e := *env; e.ProjectId = ""; return &e }},
		{"msg_cryptographic_binding_mismatch_environme", func() *ExecutionEnvelope { e := *env; e.EnvironmentId = ""; return &e }},
		{"msg_cryptographic_binding_mismatch_policyhas", func() *ExecutionEnvelope { e := *env; e.PolicyHash = ""; return &e }},
	}

	for _, f := range fields {
		err := VerifyCryptographicBindings(state, f.empty())
		if err == nil {
			t.Fatalf(i18n.T("expected_binding_mismatch_on_empty_envelope_field"), f.token)
		}
		expectedErr := fmt.Sprintf(i18n.T(f.token), getPersistedField(state, f.token), "")
		if err.Error() != expectedErr {
			t.Fatalf(i18n.T("expected_matching_cryptographic_mismatch_error"), err.Error(), expectedErr)
		}
	}
}

func TestSignatureEnforcedDirectCall(t *testing.T) {
	pub, priv, err := ed25519.GenerateKey(nil)
	if err != nil {
		t.Fatalf(i18n.T("expected_failed_key_generation"), err)
	}

	pubKeyBytes, _ := x509.MarshalPKIXPublicKey(pub)
	pubKeyPem := pem.EncodeToMemory(&pem.Block{
		Type:  "PUBLIC KEY",
		Bytes: pubKeyBytes,
	})

	validEnv := &ExecutionEnvelope{
		TransactionId:     "txn-direct-test",
		PlanHash:          "dummyhash",
		CanonicalEnvelope: `{"transactionId":"txn-direct-test"}`,
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
		t.Errorf(i18n.T("expected_empty_logs"), logs)
	}

	// Test 2: Tampered signature
	os.Setenv("UGONDU_RECIPE_PUBLIC_KEY", string(pubKeyPem))
	defer os.Unsetenv("UGONDU_RECIPE_PUBLIC_KEY")

	tamperedEnv := &ExecutionEnvelope{
		TransactionId:     "txn-direct-test",
		PlanHash:          "dummyhash",
		CanonicalEnvelope: `{"transactionId":"txn-direct-test"}`,
		Signature:         base64.StdEncoding.EncodeToString([]byte("bad_signature")),
	}

	logs, err = ExecuteRecipe(tamperedEnv, steps)
	if err == nil {
		t.Errorf(i18n.T("expected_error_due_to_invalid_"))
	}
	if len(logs) > 0 {
		t.Errorf(i18n.T("expected_empty_logs"), logs)
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
		t.Fatalf(i18n.T("expected_capability_intersection_to_pass"), err)
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
		t.Errorf(i18n.T("expected_cap_fail_closed_target_missing"))
	}

	// 3. Step requires capability not in envelope -> fail closed
	stepsUnprivileged := []map[string]interface{}{
		{"action": "SERVICE_RESTART", "payload": map[string]interface{}{"serviceName": "nginx"}},
	}
	if err := ValidateCapabilityIntersection(envGranted, stepsUnprivileged); err == nil {
		t.Errorf(i18n.T("expected_cap_fail_closed_action_not_granted"))
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
		t.Fatalf(i18n.T("failed_fetch_execution_recipe"), err)
	}
	if env.TransactionId != "tx_headers_1" || len(steps) != 1 {
		t.Fatalf(i18n.T("unexpected_recipe_result"), env, len(steps))
	}
	if capturedPassport != "passport-sovereign-99" {
		t.Errorf(i18n.T("expected_passport_header_mismatch"), capturedPassport)
	}
	if capturedTraceparent == "" {
		t.Errorf(i18n.T("expected_traceparent_header_missing"))
	}
	if capturedCorrId == "" {
		t.Errorf(i18n.T("expected_correlation_header_missing"))
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
		t.Fatal(i18n.T("expected_error_on_non_200"))
	}
	if env != nil || steps != nil || raw != nil {
		t.Fatalf(i18n.T("expected_empty_recipe_outputs"), env, steps, raw)
	}
}

func TestExecuteRecipeRobustnessFailClosed(t *testing.T) {
	// 1. Nil envelope must fail closed without panic
	if _, err := ExecuteRecipe(nil, nil); err == nil {
		t.Fatal(i18n.T("expected_execute_recipe_nil_to_fail_closed"))
	}

	// 2. Empty TransactionId must fail closed without panic
	envEmptyTx := &ExecutionEnvelope{
		TransactionId: "",
		ExecutionId:   "exec-1",
		KeyId:         "key-1",
	}
	if _, err := ExecuteRecipe(envEmptyTx, nil); err == nil {
		t.Fatal(i18n.T("expected_empty_transactionid_to_fail_closed"))
	}

	// 3. Whitespace TransactionId must fail closed without panic
	envWhitespaceTx := &ExecutionEnvelope{
		TransactionId: "   ",
		ExecutionId:   "exec-1",
		KeyId:         "key-1",
	}
	if _, err := ExecuteRecipe(envWhitespaceTx, nil); err == nil {
		t.Fatal(i18n.T("expected_whitespace_transactionid_to_fail_closed"))
	}

	// 4. Missing ExecutionId must fail closed without panic
	envEmptyExec := &ExecutionEnvelope{
		TransactionId: "tx-1",
		ExecutionId:   "",
		KeyId:         "key-1",
	}
	if _, err := ExecuteRecipe(envEmptyExec, nil); err == nil {
		t.Fatal(i18n.T("expected_empty_executionid_to_fail_closed"))
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
		t.Fatal(i18n.T("expected_missing_public_key_to_fail_closed"))
	}

	// 6. Corrupted signature must fail closed without panic
	pub, _, err := ed25519.GenerateKey(nil)
	if err != nil {
		t.Fatalf(i18n.T("expected_failed_key_generation"), err)
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
		t.Fatal(i18n.T("expected_corrupted_signature_to_fail_closed"))
	}
}

func TestParseRecipeLocallyCorruptedInputs(t *testing.T) {
	// 1. Empty body must fail closed
	if _, _, err := ParseRecipeLocally([]byte(""), ""); err == nil {
		t.Fatal(i18n.T("expected_empty_recipe_body_to_fail_closed"))
	}

	// 2. Corrupted JSON body must fail closed
	if _, _, err := ParseRecipeLocally([]byte("{not-json"), ""); err == nil {
		t.Fatal(i18n.T("expected_corrupted_json_recipe_body_to_fail_closed"))
	}

	// 3. Corrupted CanonicalEnvelope JSON must fail closed
	recipeBadEnvelope := ExecutionRecipe{
		CanonicalEnvelope: "{not-valid-envelope-json",
		CanonicalSteps:    "[]",
		Signature:         "dGVzdA==",
	}
	rawBadEnv, _ := json.Marshal(recipeBadEnvelope)
	if _, _, err := ParseRecipeLocally(rawBadEnv, ""); err == nil {
		t.Fatal(i18n.T("expected_corrupted_canonical_envelope_to_fail_closed"))
	}

	// 4. Missing key and empty apiURL must fail closed
	recipeNoKey := ExecutionRecipe{
		CanonicalEnvelope: `{"keyId":"non-existent-key-offline"}`,
		CanonicalSteps:    "[]",
		Signature:         "dGVzdA==",
	}
	rawNoKey, _ := json.Marshal(recipeNoKey)
	if _, _, err := ParseRecipeLocally(rawNoKey, ""); err == nil {
		t.Fatal(i18n.T("expected_missing_key_without_apiurl_to_fail_closed"))
	}
}
