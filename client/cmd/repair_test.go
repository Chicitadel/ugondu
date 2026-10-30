/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : client/cmd
 * File           : repair_test.go
 * Version        : 3.0.0
 * Author         : Ignatus Chika Ujomor
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-30
 * Last Modified  : 2026-10-30
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Corporate Policy Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 * - Zero String Hardcoding Law (C22)
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

package cmd

import (
	"bytes"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"ugondu/client/i18n"
)

func captureRepairStdout(t *testing.T, fn func() int) (int, string) {
	t.Helper()
	origStdout := os.Stdout
	r, w, err := os.Pipe()
	if err != nil {
		t.Fatalf("failed to create stdout pipe: %v", err)
	}
	os.Stdout = w

	code := fn()

	_ = w.Close()
	os.Stdout = origStdout

	var buf bytes.Buffer
	_, _ = io.Copy(&buf, r)
	_ = r.Close()
	return code, buf.String()
}

func TestRepairCommandLocalizedExecution(t *testing.T) {
	i18n.SetLocale("en-US")

	// 1. Missing arguments returns ExitInvalidInput and localized usage via i18n.T
	codeUsage, outUsage := captureRepairStdout(t, func() int {
		return RunRepairCommand([]string{"run"})
	})
	if codeUsage != ExitInvalidInput {
		t.Fatalf("expected ExitInvalidInput (%d), got %d", ExitInvalidInput, codeUsage)
	}
	if !strings.Contains(outUsage, "[en-US]") || !strings.Contains(outUsage, i18n.T("repair_usage")) {
		t.Fatalf("expected localized repair_usage output, got: %s", outUsage)
	}

	// 2. Positive dry-run against local test recovery endpoint
	var capturedAuth string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedAuth = r.Header.Get("Authorization")
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"DRY_RUN_VALIDATED","transactionId":"tx-c22-001","message":"Validated"}`))
	}))
	defer srv.Close()

	t.Setenv("UGONDU_API_URL", srv.URL)
	t.Setenv("UGONDU_TOKEN", "ugp_test_token_c22")

	codeDry, outDry := captureRepairStdout(t, func() int {
		return RunRepairCommand([]string{"run", "cap-reconcile", "--target", "directadmin", "--dry-run"})
	})
	if codeDry != ExitSuccess {
		t.Fatalf("expected ExitSuccess (%d), got %d (output: %s)", ExitSuccess, codeDry, outDry)
	}
	if !strings.Contains(capturedAuth, i18n.T("bearer")) {
		t.Fatalf("expected Authorization header to use localized bearer token, got: %s", capturedAuth)
	}
	for _, line := range strings.Split(strings.TrimSpace(outDry), "\n") {
		trimmed := strings.TrimSpace(line)
		if trimmed != "" && !strings.HasPrefix(trimmed, "[en-US] ") {
			t.Fatalf("expected every output line to be localized via i18n.T with [en-US] prefix, got: %s", trimmed)
		}
	}

	// 3. Adversarial unauthorized response returns ExitCredentialsInvalid with localized error
	unauthSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		_, _ = w.Write([]byte(`{"error":"invalid_token"}`))
	}))
	defer unauthSrv.Close()
	t.Setenv("UGONDU_API_URL", unauthSrv.URL)

	codeUnauth, outUnauth := captureRepairStdout(t, func() int {
		return RunRepairCommand([]string{"run", "cap-reconcile"})
	})
	if codeUnauth != ExitCredentialsInvalid {
		t.Fatalf("expected ExitCredentialsInvalid (%d), got %d", ExitCredentialsInvalid, codeUnauth)
	}
	if !strings.Contains(outUnauth, "[en-US]") {
		t.Fatalf("expected localized unauthorized error output, got: %s", outUnauth)
	}
}
