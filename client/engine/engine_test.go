/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : client/engine
 * File           : engine_test.go
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
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestAuthConfigResolution(t *testing.T) {
	os.Unsetenv("UGONDU_AUTH_URL")
	os.Unsetenv("UGONDU_AUTH_CALLBACK_ADDR")

	defaultURL := ResolveAuthBaseURL()
	if !strings.Contains(defaultURL, ".eu") || strings.Contains(defaultURL, ".com") {
		t.Errorf("expected default auth URL to use sovereign .eu domain, got %s", defaultURL)
	}

	os.Setenv("UGONDU_AUTH_URL", "https://sso.custom.airroofers.eu/oauth")
	defer os.Unsetenv("UGONDU_AUTH_URL")
	if got := ResolveAuthBaseURL(); got != "https://sso.custom.airroofers.eu/oauth" {
		t.Errorf("expected custom UGONDU_AUTH_URL, got %s", got)
	}

	os.Setenv("UGONDU_AUTH_CALLBACK_ADDR", "127.0.0.1:9091")
	defer os.Unsetenv("UGONDU_AUTH_CALLBACK_ADDR")
	if got := ResolveAuthCallbackAddr(); got != "127.0.0.1:9091" {
		t.Errorf("expected custom UGONDU_AUTH_CALLBACK_ADDR, got %s", got)
	}
}

func TestRollbackAndPluginVerification(t *testing.T) {
	tmpRoot, err := os.MkdirTemp("", "ugondu_rollback_test_*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpRoot)

	releasesDir := filepath.Join(tmpRoot, "releases")
	pubHtml := filepath.Join(tmpRoot, "public_html")
	pluginsDir := filepath.Join(tmpRoot, "plugins")

	rel1 := filepath.Join(releasesDir, "tx_release_001")
	rel2 := filepath.Join(releasesDir, "tx_release_002")
	_ = os.MkdirAll(rel1, 0755)
	_ = os.MkdirAll(rel2, 0755)
	_ = os.WriteFile(filepath.Join(rel1, "index.html"), []byte("v1"), 0644)
	_ = os.WriteFile(filepath.Join(rel2, "index.html"), []byte("v2"), 0644)

	os.Setenv("UGONDU_RELEASES_DIR", releasesDir)
	os.Setenv("UGONDU_PUBLIC_HTML_PATH", pubHtml)
	os.Setenv("UGONDU_PLUGINS_DIR", pluginsDir)
	defer func() {
		os.Unsetenv("UGONDU_RELEASES_DIR")
		os.Unsetenv("UGONDU_PUBLIC_HTML_PATH")
		os.Unsetenv("UGONDU_PLUGINS_DIR")
	}()

	res, err := Rollback("tx_release_001")
	if err != nil {
		t.Fatalf("Rollback failed: %v", err)
	}
	if !res.Verified || res.TransactionId != "tx_release_001" {
		t.Errorf("unexpected rollback result: %+v", res)
	}

	// Verify plugin install and verification
	manifest, err := InstallPlugin("ugondu-plugin-custom-check")
	if err != nil {
		t.Fatalf("InstallPlugin failed: %v", err)
	}
	if manifest.Status != "VERIFIED" {
		t.Errorf("expected plugin status VERIFIED, got %s", manifest.Status)
	}

	verifiedList, err := VerifyPlugins("ugondu-plugin-custom-check")
	if err != nil || len(verifiedList) != 1 {
		t.Fatalf("VerifyPlugins failed: %v, len=%d", err, len(verifiedList))
	}
}
