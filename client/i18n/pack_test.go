/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : client/i18n
 * File           : pack_test.go
 * Version        : 2.2.0
 * Author         : Ujomor Systems Engineering Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Last Modified  : 2026-09-30
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Air Roofers Global Localization Standard (STREAM AA / Tests)
 * - Cryptographic Pack Integrity Validation
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

package i18n

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLanguagePackVerification(t *testing.T) {
	packPath := filepath.Join("..", "..", "packs", "ugondu-lang-fr-FR.upl.json")
	if _, err := os.Stat(packPath); os.IsNotExist(err) {
		packPath = filepath.Join("packs", "ugondu-lang-fr-FR.upl.json")
	}

	pack, err := LoadPackFromFile(packPath, "1.2.0")
	if err != nil {
		t.Fatalf("Failed to load and verify authentic Language Pack: %v", err)
	}

	if pack.Locale != "fr-FR" {
		t.Errorf("Expected locale fr-FR, got %s", pack.Locale)
	}

	// Adversarial test: Tampered token must fail digest verification
	tampered := *pack
	tampered.Tokens = make(map[string]string)
	for k, v := range pack.Tokens {
		tampered.Tokens[k] = v
	}
	tampered.Tokens["cli_title"] = i18n.T("tampered_title")

	if err := tampered.ValidateIntegrity("1.2.0"); err == nil {
		t.Error(i18n.T("tampered_pack_should_have_fail"))
	}

	// Adversarial test: Forged signature must fail signature verification
	forged := *pack
	forged.Signature = "A" + pack.Signature[1:]
	if err := forged.VerifySignature(); err == nil {
		t.Error(i18n.T("forged_signature_should_have_f"))
	}
}

func TestCriticalTokenCompleteness(t *testing.T) {
	pack := &LanguagePack{
		PackId:         "incomplete-pack",
		Locale:         "xx-XX",
		Version:        "1.0.0",
		SchemaVersion:  "1",
		ArtifactDigest: "sha256:dummy",
		Tokens: map[string]string{
			"cli_title": "Title",
			// Missing critical tokens like auth_missing, prompt_destructive
		},
	}
	pack.ArtifactDigest = ComputeArtifactDigest(pack.Tokens)

	err := pack.ValidateIntegrity("1.2.0")
	if err == nil {
		t.Error(i18n.T("pack_with_missing_critical_tok"))
	}
}

func TestLocalePrecedenceHierarchy(t *testing.T) {
	// 1. Explicit CLI flag wins
	loc, src := ResolveEffectiveLocale("de-DE")
	if loc != "de-DE" || src != SourceCliFlag {
		t.Errorf("Expected de-DE from %s, got %s from %s", SourceCliFlag, loc, src)
	}

	// 2. Environment variable
	os.Setenv("UGONDU_LOCALE", "es-ES")
	defer os.Unsetenv("UGONDU_LOCALE")
	loc2, src2 := ResolveEffectiveLocale("")
	if loc2 != "es-ES" || src2 != SourceEnvVar {
		t.Errorf("Expected es-ES from %s, got %s from %s", SourceEnvVar, loc2, src2)
	}
}

func TestRTLMetadataPreservation(t *testing.T) {
	arPath := filepath.Join("..", "..", "packs", "ugondu-lang-ar-SA.upl.json")
	if _, err := os.Stat(arPath); os.IsNotExist(err) {
		arPath = filepath.Join("packs", "ugondu-lang-ar-SA.upl.json")
	}

	pack, err := LoadPackFromFile(arPath, "1.2.0")
	if err != nil {
		t.Fatalf("Failed to load Arabic language pack: %v", err)
	}

	if pack.Direction != "rtl" {
		t.Errorf("Expected direction rtl, got %s", pack.Direction)
	}
}
