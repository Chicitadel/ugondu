/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : client/i18n
 * File           : i18n_test.go
 * Version        : 2.2.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-10-18
 * Last Modified  : 2026-10-18
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Corporate Policy Governed
 * - Air Roofers Global Localization Standard (STREAM AA / Tests)
 * - Cryptographic Pack Integrity Validation
 *
 * Standards:
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS
 * - NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

package i18n

import (
	"crypto/ed25519"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"os"
	"testing"
)

func TestTrustedPublicKeyHexOverride(t *testing.T) {
	pub, priv, err := ed25519.GenerateKey(nil)
	if err != nil {
		t.Fatalf("failed to generate ed25519 key: %v", err)
	}
	customHex := hex.EncodeToString(pub)

	os.Setenv("UGONDU_PACK_PUBLIC_KEY_HEX", customHex)
	defer os.Unsetenv("UGONDU_PACK_PUBLIC_KEY_HEX")

	if got := ResolveTrustedPublicKeyHex(); got != customHex {
		t.Fatalf("expected ResolveTrustedPublicKeyHex() = %s, got %s", customHex, got)
	}

	tokens := map[string]string{
		"err_not_repo":              "not a repo",
		"auth_missing":              "auth missing",
		"plugin_sig_invalid":        "sig invalid",
		"path_traversal_err":        "traversal",
		"locked_error":              "locked",
		"prompt_destructive":        "confirm?",
		"aborting":                  "aborting",
		"exec_failed":               "failed",
		"dep_complete":              "complete",
		"persistence_failure_error": "persist fail",
	}
	digest := ComputeArtifactDigest(tokens)
	pack := &LanguagePack{
		PackId:         "custom-signed-pack",
		Locale:         "de-DE",
		Version:        "1.0.0",
		SchemaVersion:  "1",
		ArtifactDigest: digest,
		Tokens:         tokens,
	}
	payload := fmt.Sprintf("%s:%s:%s:%s", pack.PackId, pack.Locale, pack.Version, pack.ArtifactDigest)
	sig := ed25519.Sign(priv, []byte(payload))
	pack.Signature = base64.StdEncoding.EncodeToString(sig)

	if err := pack.ValidateIntegrity("1.2.0"); err != nil {
		t.Fatalf("expected custom key-signed pack to pass ValidateIntegrity with UGONDU_PACK_PUBLIC_KEY_HEX set: %v", err)
	}
}

func TestNormalizeLocaleVariants(t *testing.T) {
	cases := map[string]string{
		"fr_FR.UTF-8": "fr-FR",
		"de_DE@euro":  "de-DE",
		"ar":          "ar-SA",
		"en":          "en-US",
		"C.UTF-8":     "en-US",
		"POSIX":       "en-US",
		"":            "en-US",
		"pt_br.utf8":  "pt-BR",
	}
	for input, expected := range cases {
		if got := NormalizeLocale(input); got != expected {
			t.Errorf("NormalizeLocale(%q) = %q, want %q", input, got, expected)
		}
	}
}
