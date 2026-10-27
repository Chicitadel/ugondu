/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : client/engine
 * File           : hardening_test.go
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
	"errors"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestSafePathResolverHardening(t *testing.T) {
	tmpBase, err := os.MkdirTemp("", "ugondu_safepath_*")
	if err != nil {
		t.Fatalf("MkdirTemp failed: %v", err)
	}
	defer os.RemoveAll(tmpBase)

	resolver := &SafePathResolver{}

	if _, err := resolver.ResolveSafePath(tmpBase, "../etc/shadow"); !errors.Is(err, ErrPathTraversal) {
		t.Errorf("expected ErrPathTraversal, got %v", err)
	}
	if _, err := resolver.ResolveSafePath(tmpBase, "/etc/passwd"); !errors.Is(err, ErrAbsolutePath) {
		t.Errorf("expected ErrAbsolutePath, got %v", err)
	}
	if _, err := resolver.ResolveSafePath(tmpBase, "\\\\evil\\share\\file"); !errors.Is(err, ErrUNCPath) {
		t.Errorf("expected ErrUNCPath, got %v", err)
	}
	if _, err := resolver.ResolveSafePath(tmpBase, "file.txt:zone.identifier"); !errors.Is(err, ErrNTFSStream) {
		t.Errorf("expected ErrNTFSStream, got %v", err)
	}
	if _, err := resolver.ResolveSafePath(tmpBase, "CON.txt"); !errors.Is(err, ErrDeviceName) {
		t.Errorf("expected ErrDeviceName, got %v", err)
	}

	safe, err := resolver.ResolveSafePath(tmpBase, filepath.Join("subdir", "app.js"))
	if err != nil || safe == "" {
		t.Errorf("expected valid safe path, got %q, err=%v", safe, err)
	}
}

func TestTrustRegistryHardening(t *testing.T) {
	if err := GlobalTrustRegistry.VerifyKey("key_recipe_v1", PurposeRecipe); !errors.Is(err, ErrKeyRevoked) {
		t.Errorf("expected ErrKeyRevoked for key_recipe_v1, got %v", err)
	}
	if err := GlobalTrustRegistry.VerifyKey("key_recipe_v2", PurposeRecipe); err != nil {
		t.Errorf("expected active key_recipe_v2 to verify, got %v", err)
	}
	if err := GlobalTrustRegistry.VerifyKey("key_recipe_v2", PurposePlugin); !errors.Is(err, ErrKeyPurpose) {
		t.Errorf("expected ErrKeyPurpose when purpose mismatched, got %v", err)
	}
	if err := GlobalTrustRegistry.VerifyKey("nonexistent_key", PurposeRecipe); !errors.Is(err, ErrKeyNotFound) {
		t.Errorf("expected ErrKeyNotFound, got %v", err)
	}
}

func TestReplayProtectionHardening(t *testing.T) {
	nonce := "nonce_" + randomHex(8)
	exp := time.Now().Add(5 * time.Minute).UnixMilli()

	if err := CheckAndRecordReplay("ugondu-cp", "key_recipe_v2", "tx_replay_1", "exec_1", nonce, exp); err != nil {
		t.Fatalf("expected first replay ledger entry to pass, got %v", err)
	}
	if err := CheckAndRecordReplay("ugondu-cp", "key_recipe_v2", "tx_replay_1", "exec_1", nonce, exp); !errors.Is(err, ErrReplayDetected) {
		t.Errorf("expected ErrReplayDetected on duplicate tuple, got %v", err)
	}
	if err := CheckAndRecordReplay("ugondu-cp", "key_recipe_v2", "tx_replay_exp", "exec_2", "nonce_exp", time.Now().Add(-1*time.Minute).UnixMilli()); !errors.Is(err, ErrExpired) {
		t.Errorf("expected ErrExpired on expired envelope, got %v", err)
	}
}
