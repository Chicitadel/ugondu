/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : client/engine
 * File           : lock_test.go
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
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestTransactionLock(t *testing.T) {
	txId := "tx_test_lock_456"

	txDir, err := GetTransactionDir(txId)
	if err != nil {
		t.Fatalf("GetTransactionDir failed: %v", err)
	}
	_ = os.RemoveAll(txDir)
	defer os.RemoveAll(txDir)

	// Test 1: Acquire transaction lock
	lock1, err := AcquireTransactionLock(txId)
	if err != nil {
		t.Fatalf("AcquireTransactionLock failed: %v", err)
	}
	if lock1 == nil {
		t.Fatalf(i18n.T("expected_valid_lock_got_nil"))
	}

	// Verify lock file exists
	lockPath := filepath.Join(txDir, "lock")
	if _, err := os.Stat(lockPath); err != nil {
		t.Fatalf("Lock file not found at %s: %v", lockPath, err)
	}

	// Test 2: Double acquire returns ErrTransactionLocked
	_, err = AcquireTransactionLock(txId)
	if !errors.Is(err, ErrTransactionLocked) {
		t.Errorf("Expected ErrTransactionLocked on concurrent acquire, got %v", err)
	}

	// Test 3: Release transaction lock
	if err := ReleaseTransactionLock(lock1); err != nil {
		t.Fatalf("ReleaseTransactionLock failed: %v", err)
	}
	if _, err := os.Stat(lockPath); !os.IsNotExist(err) {
		t.Errorf(i18n.T("lock_file_should_have_been_rem"))
	}

	// Test 4: Stale lock (older than 30 minutes) should be acquired cleanly
	staleLockData := LockData{
		PID:       999999,
		Hostname:  "test-host",
		Timestamp: time.Now().Unix() - 3600, // 1 hour ago
		TxID:      txId,
	}
	staleBytes, _ := json.Marshal(staleLockData)
	if err := os.MkdirAll(txDir, 0700); err != nil {
		t.Fatalf("MkdirAll failed: %v", err)
	}
	if err := os.WriteFile(lockPath, staleBytes, 0600); err != nil {
		t.Fatalf("Failed to write stale lock file: %v", err)
	}

	lock2, err := AcquireTransactionLock(txId)
	if err != nil {
		t.Fatalf("Failed to acquire stale lock: %v", err)
	}
	if lock2 == nil {
		t.Fatalf(i18n.T("expected_valid_lock_after_reco"))
	}
	_ = ReleaseTransactionLock(lock2)
}
