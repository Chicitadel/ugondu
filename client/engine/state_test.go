/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : client/engine
 * File           : state_test.go
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
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

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
				Logs:   []string{"log 1", "log 2"},
			},
		},
	}

	if err := SaveState(state); err != nil {
		t.Fatalf("SaveState failed: %v", err)
	}

	// Verify StateHash was computed
	if state.StateHash == "" {
		t.Errorf("Expected StateHash to be computed, got empty string")
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
		t.Errorf("State file is empty")
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
