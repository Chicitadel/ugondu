/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : client/engine
 * File           : state_concurrency_test.go
 * Version        : 1.2.0
 * Author         : Ignatus Chika Ujomor
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-28
 * Last Modified  : 2026-10-28
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
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

package engine

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
)

func TestSaveStateFailsClosedOnInvalidCommittedState(t *testing.T) {
	cases := []struct {
		name    string
		payload func(*ExecutionState) []byte
	}{
		{
			name:    "malformed JSON",
			payload: func(*ExecutionState) []byte { return []byte("{not-json") },
		},
		{
			name:    "empty file",
			payload: func(*ExecutionState) []byte { return nil },
		},
		{
			name: "missing state hash",
			payload: func(s *ExecutionState) []byte {
				bad := *s
				bad.StateHash = ""
				data, _ := json.MarshalIndent(&bad, "", "  ")
				return data
			},
		},
		{
			name: "mismatched state hash",
			payload: func(s *ExecutionState) []byte {
				bad := *s
				bad.Status = "TAMPERED"
				data, _ := json.MarshalIndent(&bad, "", "  ")
				return data
			},
		},
		{
			name: "foreign transaction identity",
			payload: func(s *ExecutionState) []byte {
				bad := *s
				bad.TransactionId = "tx_state_foreign_committed"
				bad.StateHash, _ = bad.ComputeHash()
				data, _ := json.MarshalIndent(&bad, "", "  ")
				return data
			},
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			txID := "tx_state_invalid_committed_" + strings.ReplaceAll(tc.name, " ", "_")
			txDir, err := GetTransactionDir(txID)
			if err != nil {
				t.Fatalf("GetTransactionDir failed: %v", err)
			}
			if err := os.RemoveAll(txDir); err != nil {
				t.Fatalf("cleanup before test failed: %v", err)
			}
			defer os.RemoveAll(txDir)

			state := InitState(txID)
			if err := SaveState(state); err != nil {
				t.Fatalf("initial SaveState failed: %v", err)
			}
			statePath, err := GetStateFilePath(txID)
			if err != nil {
				t.Fatalf("GetStateFilePath failed: %v", err)
			}
			invalidPayload := tc.payload(state)
			if err := os.WriteFile(statePath, invalidPayload, 0600); err != nil {
				t.Fatalf("write invalid committed fixture failed: %v", err)
			}
			before, err := os.ReadFile(statePath)
			if err != nil {
				t.Fatalf("read invalid committed fixture failed: %v", err)
			}

			state.Status = "RUNNING"
			err = SaveState(state)
			if !errors.Is(err, ErrStateCorrupt) {
				t.Fatalf("SaveState error = %v, want ErrStateCorrupt", err)
			}
			after, readErr := os.ReadFile(statePath)
			if readErr != nil {
				t.Fatalf("read committed fixture after rejected save: %v", readErr)
			}
			if string(after) != string(before) {
				t.Fatal("SaveState overwrote invalid committed state instead of failing closed")
			}
		})
	}
}

func TestConcurrentSaveStateUsesDistinctTemporaryFiles(t *testing.T) {
	txID := "tx_state_concurrent_temp"
	txDir, err := GetTransactionDir(txID)
	if err != nil {
		t.Fatalf("GetTransactionDir failed: %v", err)
	}
	if err := os.RemoveAll(txDir); err != nil {
		t.Fatalf("cleanup before test failed: %v", err)
	}
	defer os.RemoveAll(txDir)

	initial := InitState(txID)
	if err := SaveState(initial); err != nil {
		t.Fatalf("initial SaveState failed: %v", err)
	}
	statePath, err := GetStateFilePath(txID)
	if err != nil {
		t.Fatalf("GetStateFilePath failed: %v", err)
	}
	before, err := os.ReadFile(statePath)
	if err != nil {
		t.Fatalf("read initial committed state: %v", err)
	}

	// This regression test specifically verifies that if multiple writers were to
	// reach the file replacement boundary concurrently, each uses a distinct
	// temporary file name rather than colliding on a fixed path. We stub the lock
	// here to simulate the concurrent entry condition.
	previousLocker := stateLockAcquirer
	stateLockAcquirer = func(lockPath string) (stateFileLock, error) {
		return noopStateLock{}, nil
	}
	defer func() { stateLockAcquirer = previousLocker }()

	var mu sync.Mutex
	var tempPaths []string
	bothReachedReplace := make(chan struct{})
	previousReplacer := stateFileReplacer
	stateFileReplacer = func(source, destination string) error {
		mu.Lock()
		tempPaths = append(tempPaths, source)
		if len(tempPaths) == 2 {
			close(bothReachedReplace)
		}
		mu.Unlock()
		<-bothReachedReplace
		return errors.New("injected replacement failure")
	}
	defer func() { stateFileReplacer = previousReplacer }()

	s1 := *initial
	s1.Status = "RUNNING"
	s2 := *initial
	s2.Status = "FAILED"
	states := []*ExecutionState{&s1, &s2}
	var wg sync.WaitGroup
	errs := make([]error, len(states))
	for i, state := range states {
		wg.Add(1)
		go func(i int, state *ExecutionState) {
			defer wg.Done()
			errs[i] = SaveState(state)
		}(i, state)
	}
	wg.Wait()

	for i, saveErr := range errs {
		if saveErr == nil {
			t.Fatalf("concurrent SaveState %d unexpectedly succeeded", i)
		}
	}
	mu.Lock()
	if len(tempPaths) != 2 {
		mu.Unlock()
		t.Fatalf("replacement calls = %d, want 2", len(tempPaths))
	}
	if tempPaths[0] == tempPaths[1] {
		mu.Unlock()
		t.Fatalf("concurrent saves reused the same temporary path: %q", tempPaths[0])
	}
	mu.Unlock()

	after, err := os.ReadFile(statePath)
	if err != nil {
		t.Fatalf("read committed state after failed concurrent saves: %v", err)
	}
	if string(after) != string(before) {
		t.Fatal("failed concurrent saves changed the previously committed state")
	}
}

func TestInitStateFromEnvelopeRejectsNil(t *testing.T) {
	if got := InitStateFromEnvelope(nil); got != nil {
		t.Fatalf("InitStateFromEnvelope(nil) = %#v, want nil", got)
	}
}

func TestInitStateFromEnvelopeRejectsInvalidTransactionID(t *testing.T) {
	for _, txID := range []string{"", " ", " tx_envelope_padded "} {
		t.Run("transaction_id_"+strings.ReplaceAll(txID, " ", "_"), func(t *testing.T) {
			env := &ExecutionEnvelope{TransactionId: txID}
			if got := InitStateFromEnvelope(env); got != nil {
				t.Fatalf("InitStateFromEnvelope with transaction ID %q = %#v, want nil", txID, got)
			}
		})
	}
}

func TestConcurrentSaveStateSerializesWritersAndPreventsStaleState(t *testing.T) {
	txID := "tx_state_concurrent_locking"
	txDir, err := GetTransactionDir(txID)
	if err != nil {
		t.Fatalf("GetTransactionDir failed: %v", err)
	}
	if err := os.RemoveAll(txDir); err != nil {
		t.Fatalf("cleanup before test failed: %v", err)
	}
	defer os.RemoveAll(txDir)

	// Step 1: Initial state commit produces sequence 1 on disk.
	initial := InitState(txID)
	if err := SaveState(initial); err != nil {
		t.Fatalf("initial SaveState failed: %v", err)
	}
	if initial.StateSequence != 1 {
		t.Fatalf("expected initial stateSequence 1, got %d", initial.StateSequence)
	}

	// Step 2: Verify that .lock file was created in transaction directory.
	lockPath := filepath.Join(txDir, ".lock")
	if _, err := os.Stat(lockPath); err != nil {
		t.Fatalf("expected lock file at %s: %v", lockPath, err)
	}

	// Step 3: Two concurrent actors load the same initial state (sequence 1).
	actorA, err := LoadState(txID)
	if err != nil {
		t.Fatalf("actorA LoadState failed: %v", err)
	}
	actorB, err := LoadState(txID)
	if err != nil {
		t.Fatalf("actorB LoadState failed: %v", err)
	}
	if actorA.StateSequence != 1 || actorB.StateSequence != 1 {
		t.Fatalf("expected both actors to load sequence 1")
	}

	// Actor A modifies and commits sequence 2.
	actorA.Status = "RUNNING"
	if err := SaveState(actorA); err != nil {
		t.Fatalf("actorA SaveState failed: %v", err)
	}
	if actorA.StateSequence != 2 {
		t.Fatalf("expected actorA stateSequence 2, got %d", actorA.StateSequence)
	}

	// Actor B attempts to commit its stale version (sequence 1) on top of committed sequence 2.
	actorB.Status = "FAILED"
	errB := SaveState(actorB)
	if errB == nil {
		t.Fatal("expected actorB SaveState to fail due to stale state, but it succeeded")
	}
	if !errors.Is(errB, ErrStateStale) {
		t.Fatalf("expected error wrapping ErrStateStale, got: %v", errB)
	}

	// Step 4: Verify that disk state was NOT overwritten by the stale writer.
	currentDisk, err := LoadState(txID)
	if err != nil {
		t.Fatalf("LoadState failed: %v", err)
	}
	if currentDisk.StateSequence != 2 {
		t.Fatalf("expected committed stateSequence 2, got %d", currentDisk.StateSequence)
	}
	if currentDisk.Status != "RUNNING" {
		t.Fatalf("expected committed Status RUNNING, got %q", currentDisk.Status)
	}

	// Step 5: Verify recovery - Actor B reloads latest state, applies mutation, and succeeds.
	reloadedB, err := LoadState(txID)
	if err != nil {
		t.Fatalf("reloaded LoadState failed: %v", err)
	}
	reloadedB.Status = "COMPLETED"
	if err := SaveState(reloadedB); err != nil {
		t.Fatalf("reloaded SaveState failed: %v", err)
	}
	if reloadedB.StateSequence != 3 {
		t.Fatalf("expected stateSequence 3 after reloaded commit, got %d", reloadedB.StateSequence)
	}
	finalDisk, err := LoadState(txID)
	if err != nil {
		t.Fatalf("final LoadState failed: %v", err)
	}
	if finalDisk.StateSequence != 3 || finalDisk.Status != "COMPLETED" {
		t.Fatalf("expected committed sequence 3 with Status COMPLETED, got seq=%d status=%s", finalDisk.StateSequence, finalDisk.Status)
	}
}

func TestStateFileLockAcquireAndRelease(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "ugondu_lock_test_*")
	if err != nil {
		t.Fatalf("create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	lockPath := filepath.Join(tempDir, ".lock")
	lock1, err := acquireStateFileLock(lockPath)
	if err != nil {
		t.Fatalf("acquireStateFileLock failed: %v", err)
	}

	// Release lock
	if err := lock1.Unlock(); err != nil {
		t.Fatalf("lock1.Unlock failed: %v", err)
	}

	// Reacquire lock to verify clean release
	lock2, err := acquireStateFileLock(lockPath)
	if err != nil {
		t.Fatalf("reacquire state lock failed: %v", err)
	}
	if err := lock2.Unlock(); err != nil {
		t.Fatalf("lock2.Unlock failed: %v", err)
	}
}
