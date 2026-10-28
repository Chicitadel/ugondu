/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : client/engine
 * File           : state_test.go
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
	"encoding/json"
	"errors"
	"os"
	"runtime"
	"strings"
	"sync"
	"testing"

	"ugondu/client/i18n"
)

func TestGetTransactionDirRejectsDotTransactionID(t *testing.T) {
	for _, getPath := range []struct {
		name string
		call func(string) (string, error)
	}{
		{name: "transaction directory", call: GetTransactionDir},
		{name: "state file path", call: GetStateFilePath},
	} {
		t.Run(getPath.name, func(t *testing.T) {
			if path, err := getPath.call("."); err == nil {
				t.Fatalf("path resolver accepted dot transaction ID and returned %q", path)
			}
		})
	}

	state := InitState(".")
	if err := SaveState(state); err == nil {
		t.Fatal("SaveState accepted dot transaction ID")
	}
}

func TestStateSaveAndLoad(t *testing.T) {
	txId := "tx_test_state_123"

	// Cleanup any previous run
	txDir, err := GetTransactionDir(txId)
	if err != nil {
		t.Fatalf("GetTransactionDir failed: %v", err)
	}
	_ = os.RemoveAll(txDir)
	defer os.RemoveAll(txDir)

	// Test 1: LoadState on non-existent transaction returns ErrStateNotFound
	_, err = LoadState(txId)
	if !errors.Is(err, ErrStateNotFound) {
		t.Errorf("Expected ErrStateNotFound, got %v", err)
	}

	// Test 2: SaveState creates atomic state with cryptographic bindings
	state := &ExecutionState{
		SchemaVersion: "1.0.0",
		TransactionId: txId,
		PlanHash:      "plan_hash_abc",
		TenantId:      "tenant_corp",
		ProjectId:     "proj_alpha",
		EnvironmentId: "cpanel",
		RecipeVersion: "1.0",
		PolicyHash:    "policy_hash_xyz",
		AgentVersion:  "1.2.0",
		Status:        "PENDING",
		Steps: []*StepState{
			{
				Index:  0,
				Action: "FETCH_REPOSITORY",
				Status: "SUCCESS",
				Logs:   []string{i18n.T("log_1"), i18n.T("log_2")},
			},
		},
	}

	if err := SaveState(state); err != nil {
		t.Fatalf("SaveState failed: %v", err)
	}

	// Verify StateHash was computed
	if state.StateHash == "" {
		t.Errorf(i18n.T("expected_statehash_to_be_compu"))
	}

	// Verify file permissions (state.json should exist)
	stateFilePath, err := GetStateFilePath(txId)
	if err != nil {
		t.Fatalf("GetStateFilePath failed: %v", err)
	}
	info, err := os.Stat(stateFilePath)
	if err != nil {
		t.Fatalf("State file was not created: %v", err)
	}
	if info.Size() == 0 {
		t.Errorf(i18n.T("state_file_is_empty"))
	}

	// POSIX permission bits are part of the persisted-state confidentiality
	// boundary. Windows ACLs do not map directly to Go's mode bits.
	if runtime.GOOS != "windows" {
		if got := info.Mode().Perm(); got != 0600 {
			t.Errorf("state file permissions = %#o, want 0600", got)
		}
		dirInfo, err := os.Stat(txDir)
		if err != nil {
			t.Fatalf("stat transaction directory failed: %v", err)
		}
		if got := dirInfo.Mode().Perm(); got != 0700 {
			t.Errorf("transaction directory permissions = %#o, want 0700", got)
		}
	}

	// Test 3: LoadState returns identical values
	loadedState, err := LoadState(txId)
	if err != nil {
		t.Fatalf("LoadState failed: %v", err)
	}
	if loadedState.TransactionId != txId {
		t.Errorf("Expected TransactionId %s, got %s", txId, loadedState.TransactionId)
	}
	if loadedState.PlanHash != "plan_hash_abc" {
		t.Errorf("Expected PlanHash plan_hash_abc, got %s", loadedState.PlanHash)
	}
	if loadedState.TenantId != "tenant_corp" {
		t.Errorf("Expected TenantId tenant_corp, got %s", loadedState.TenantId)
	}
	if loadedState.StateHash != state.StateHash {
		t.Errorf("Expected StateHash %s, got %s", state.StateHash, loadedState.StateHash)
	}
	if len(loadedState.Steps) != 1 {
		t.Fatalf("Expected 1 step, got %d", len(loadedState.Steps))
	}
	if loadedState.Steps[0].Action != "FETCH_REPOSITORY" {
		t.Errorf("Expected step action FETCH_REPOSITORY, got %s", loadedState.Steps[0].Action)
	}

	// Test 4: Corruption handling quarantines the file and returns ErrStateCorrupt
	corruptContent := []byte("{ invalid json data ...")
	if err := os.WriteFile(stateFilePath, corruptContent, 0600); err != nil {
		t.Fatalf("Failed to overwrite state file with corrupt data: %v", err)
	}

	_, err = LoadState(txId)
	if !errors.Is(err, ErrStateCorrupt) {
		t.Errorf("Expected ErrStateCorrupt on malformed JSON, got %v", err)
	}

	// Verify corrupted file was renamed to state.json.corrupt.<timestamp>
	entries, err := os.ReadDir(txDir)
	if err != nil {
		t.Fatalf("Failed to read transaction dir: %v", err)
	}
	quarantinedFound := false
	for _, entry := range entries {
		if strings.HasPrefix(entry.Name(), "state.json.corrupt.") {
			quarantinedFound = true
			break
		}
	}
	if !quarantinedFound {
		t.Errorf("Expected quarantined state file matching state.json.corrupt.* in %s", txDir)
	}
}


func TestLoadStateRejectsModifiedStateAndMissingHash(t *testing.T) {
	cases := []struct {
		name       string
		mutate     func(*ExecutionState)
	}{
		{
			name: "modified state field",
			mutate: func(s *ExecutionState) { s.Status = "SUCCESS" },
		},
		{
			name: "missing state hash",
			mutate: func(s *ExecutionState) { s.StateHash = "" },
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			txID := "tx_state_integrity_" + strings.ReplaceAll(tc.name, " ", "_")
			txDir, err := GetTransactionDir(txID)
			if err != nil {
				t.Fatalf("GetTransactionDir failed: %v", err)
			}
			if err := os.RemoveAll(txDir); err != nil {
				t.Fatalf("cleanup before test failed: %v", err)
			}
			defer os.RemoveAll(txDir)

			state := &ExecutionState{
				SchemaVersion: "1.0.0",
				TransactionId: txID,
				ExecutionId:   "exec-integrity",
				PlanHash:      "plan-integrity",
				TenantId:      "tenant-integrity",
				ProjectId:     "project-integrity",
				EnvironmentId: "environment-integrity",
				PolicyHash:    "policy-integrity",
				Status:        "RUNNING",
			}
			if err := SaveState(state); err != nil {
				t.Fatalf("SaveState failed: %v", err)
			}

			stateFile, err := GetStateFilePath(txID)
			if err != nil {
				t.Fatalf("GetStateFilePath failed: %v", err)
			}
			data, err := os.ReadFile(stateFile)
			if err != nil {
				t.Fatalf("read saved state failed: %v", err)
			}
			var modified ExecutionState
			if err := json.Unmarshal(data, &modified); err != nil {
				t.Fatalf("unmarshal saved state failed: %v", err)
			}
			tc.mutate(&modified)
			data, err = json.MarshalIndent(&modified, "", "  ")
			if err != nil {
				t.Fatalf("marshal modified state failed: %v", err)
			}
			if err := os.WriteFile(stateFile, data, 0600); err != nil {
				t.Fatalf("write modified state failed: %v", err)
			}

			if _, err := LoadState(txID); !errors.Is(err, ErrStateCorrupt) {
				t.Fatalf("LoadState error = %v, want ErrStateCorrupt", err)
			}
			entries, err := os.ReadDir(txDir)
			if err != nil {
				t.Fatalf("read transaction directory failed: %v", err)
			}
			quarantined := false
			for _, entry := range entries {
				if strings.HasPrefix(entry.Name(), "state.json.corrupt.") {
					quarantined = true
					break
				}
			}
			if !quarantined {
				t.Fatalf("corrupt state was not quarantined")
			}
		})
	}
}


func TestLoadStateRejectsTransactionIDMismatch(t *testing.T) {
	requestedTxID := "tx_state_identity_requested"
	foreignTxID := "tx_state_identity_foreign"
	txDir, err := GetTransactionDir(requestedTxID)
	if err != nil {
		t.Fatalf("GetTransactionDir failed: %v", err)
	}
	if err := os.RemoveAll(txDir); err != nil {
		t.Fatalf("cleanup before test failed: %v", err)
	}
	defer os.RemoveAll(txDir)
	if err := os.MkdirAll(txDir, 0700); err != nil {
		t.Fatalf("create transaction directory failed: %v", err)
	}

	// Construct a state with a valid self-consistent hash, but store it under
	// a different transaction directory to exercise the identity boundary.
	foreignState := InitState(foreignTxID)
	data, err := json.MarshalIndent(foreignState, "", "  ")
	if err != nil {
		t.Fatalf("marshal foreign state failed: %v", err)
	}
	statePath, err := GetStateFilePath(requestedTxID)
	if err != nil {
		t.Fatalf("GetStateFilePath failed: %v", err)
	}
	if err := os.WriteFile(statePath, data, 0600); err != nil {
		t.Fatalf("write foreign state fixture failed: %v", err)
	}

	if got, err := LoadState(requestedTxID); !errors.Is(err, ErrStateCorrupt) || got != nil {
		t.Fatalf("LoadState(%q) = (%v, %v), want (nil, ErrStateCorrupt)", requestedTxID, got, err)
	}
	entries, err := os.ReadDir(txDir)
	if err != nil {
		t.Fatalf("read transaction directory failed: %v", err)
	}
	for _, entry := range entries {
		if strings.HasPrefix(entry.Name(), "state.json.corrupt.") {
			return
		}
	}
	t.Fatal("transaction-ID-mismatched state was not quarantined")
}

func TestSaveStateReplacementFailurePreservesCommittedState(t *testing.T) {
	txID := "tx_state_replace_failure"
	txDir, err := GetTransactionDir(txID)
	if err != nil {
		t.Fatalf("GetTransactionDir failed: %v", err)
	}
	if err := os.RemoveAll(txDir); err != nil {
		t.Fatalf("cleanup before test failed: %v", err)
	}
	defer os.RemoveAll(txDir)

	state := InitState(txID)
	state.Status = "PENDING"
	if err := SaveState(state); err != nil {
		t.Fatalf("initial SaveState failed: %v", err)
	}

	statePath, err := GetStateFilePath(txID)
	if err != nil {
		t.Fatalf("GetStateFilePath failed: %v", err)
	}
	committedBytes, err := os.ReadFile(statePath)
	if err != nil {
		t.Fatalf("read committed state failed: %v", err)
	}
	committedSequence := state.StateSequence
	committedHash := state.StateHash
	committedUpdatedAt := state.UpdatedAt
	committedPreviousHash := state.PrevStateHash

	// Simulate a replacement failure deterministically. The previously committed
	// file and the caller's persistence metadata must remain unchanged.
	previousReplacer := stateFileReplacer
	stateFileReplacer = func(source, destination string) error {
		return errors.New("injected replacement failure")
	}
	defer func() { stateFileReplacer = previousReplacer }()

	state.Status = "RUNNING"
	if err := SaveState(state); err == nil {
		t.Fatal("SaveState succeeded despite injected replacement failure")
	}

	afterBytes, err := os.ReadFile(statePath)
	if err != nil {
		t.Fatalf("read committed state after failed save: %v", err)
	}
	if string(afterBytes) != string(committedBytes) {
		t.Fatal("failed replacement changed the previously committed state file")
	}
	if state.StateSequence != committedSequence {
		t.Fatalf("StateSequence after failed save = %d, want %d", state.StateSequence, committedSequence)
	}
	if state.StateHash != committedHash {
		t.Fatal("StateHash advanced after failed save")
	}
	if state.UpdatedAt != committedUpdatedAt {
		t.Fatal("UpdatedAt changed after failed save")
	}
	if state.PrevStateHash != committedPreviousHash {
		t.Fatal("PrevStateHash changed after failed save")
	}
	if state.Status != "RUNNING" {
		t.Fatalf("caller-requested state mutation was lost: Status = %q", state.Status)
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

	states := []*ExecutionState{
		{TransactionId: txID, Status: "RUNNING"},
		{TransactionId: txID, Status: "FAILED"},
	}
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
