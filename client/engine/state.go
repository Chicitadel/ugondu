/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : client/engine
 * File           : state.go
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
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"ugondu/client/i18n"
)

var (
	ErrStateNotFound = errors.New(i18n.T("state_file_not_found"))
	ErrStateCorrupt  = errors.New(i18n.T("state_file_is_corrupt"))
)

// stateFileReplacer is kept behind a package-private seam so persistence failure
// behavior can be tested deterministically without filesystem permission tricks.
var stateFileReplacer = replaceStateFile

type StepState struct {
	Index       int      `json:"index"`
	Action      string   `json:"action"`
	Status      string   `json:"status"`
	Logs        []string `json:"logs"`
	StartedAt   int64    `json:"started_at"`
	CompletedAt int64    `json:"completed_at"`
}

type ExecutionState struct {
	SchemaVersion   string       `json:"schemaVersion"`
	TransactionId   string       `json:"transactionId"`
	ExecutionId     string       `json:"executionId"`
	WorkspaceId     string       `json:"workspaceId"`
	TargetId        string       `json:"targetId"`
	RecipeSignature string       `json:"recipeSignature"`
	AgentId         string       `json:"agentId"`
	AgentVersion    string       `json:"agentVersion"`
	ExpiresAt       int64        `json:"expiresAt"`
	PlanHash        string       `json:"planHash"`
	TenantId        string       `json:"tenantId"`
	ProjectId       string       `json:"projectId"`
	EnvironmentId   string       `json:"environmentId"`
	RecipeVersion   string       `json:"recipeVersion"`
	PolicyHash      string       `json:"policyHash"`
	Status          string       `json:"status"`
	Steps           []*StepState `json:"steps"`
	UpdatedAt       int64        `json:"updatedAt"`
	StateSequence   int64        `json:"stateSequence"`
	PrevStateHash   string       `json:"prevStateHash"`
	StateHash       string       `json:"stateHash"`
}

// UnmarshalJSON supports both camelCase and legacy snake_case formats.
func (s *ExecutionState) UnmarshalJSON(data []byte) error {
	type Alias ExecutionState
	aux := &struct {
		AltTxId      string `json:"transaction_id"`
		AltUpdatedAt int64  `json:"updated_at"`
		*Alias
	}{
		Alias: (*Alias)(s),
	}
	if err := json.Unmarshal(data, aux); err != nil {
		return err
	}
	if s.TransactionId == "" && aux.AltTxId != "" {
		s.TransactionId = aux.AltTxId
	}
	if s.UpdatedAt == 0 && aux.AltUpdatedAt != 0 {
		s.UpdatedAt = aux.AltUpdatedAt
	}
	return nil
}

// ComputeHash calculates the SHA-256 hash across all state fields (with StateHash empty).
func (s *ExecutionState) ComputeHash() (string, error) {
	copyState := *s
	copyState.StateHash = ""
	data, err := json.Marshal(copyState)
	if err != nil {
		return "", err
	}
	hash := sha256.Sum256(data)
	return hex.EncodeToString(hash[:]), nil
}

// GetTransactionsDir returns the root transactions directory ~/.ugondu/transactions
func GetTransactionsDir() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf(i18n.T("failed_to_resolve_user_home"), err)
	}
	return filepath.Join(home, ".ugondu", "transactions"), nil
}

// GetTransactionDir returns ~/.ugondu/transactions/<txId>
func GetTransactionDir(txId string) (string, error) {
	trimmed := strings.TrimSpace(txId)
	if trimmed == "" || trimmed == "." {
		return "", fmt.Errorf(i18n.T("invalid_transactionid_contains_path_separators"), txId)
	}
	if strings.Contains(trimmed, "..") || strings.Contains(trimmed, "/") || strings.Contains(trimmed, "\\") {
		return "", fmt.Errorf(i18n.T("invalid_transactionid_contains_path_separators"), txId)
	}
	baseDir, err := GetTransactionsDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(baseDir, trimmed), nil
}

// GetStateFilePath returns ~/.ugondu/transactions/<txId>/state.json
func GetStateFilePath(txId string) (string, error) {
	txDir, err := GetTransactionDir(txId)
	if err != nil {
		return "", err
	}
	return filepath.Join(txDir, "state.json"), nil
}

// quarantineCorruptFile renames corrupt state to state.json.corrupt.<timestamp>
func quarantineCorruptFile(path string) {
	timestamp := time.Now().Unix()
	corruptPath := fmt.Sprintf("%s.corrupt.%d", path, timestamp)
	_ = os.Rename(path, corruptPath)
}

// LoadState reads the execution state strictly, quarantining corrupted states.
func LoadState(txId string) (*ExecutionState, error) {
	path, err := GetStateFilePath(txId)
	if err != nil {
		return nil, err
	}

	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, ErrStateNotFound
		}
		return nil, err
	}

	trimmed := strings.TrimSpace(string(data))
	if len(trimmed) == 0 {
		quarantineCorruptFile(path)
		return nil, ErrStateCorrupt
	}

	var state ExecutionState
	if err := json.Unmarshal(data, &state); err != nil {
		quarantineCorruptFile(path)
		return nil, ErrStateCorrupt
	}

	// The directory selected by the caller is part of the transaction identity.
	// Never return a validly hashed state belonging to a different transaction.
	if state.TransactionId == "" || state.TransactionId != strings.TrimSpace(txId) {
		quarantineCorruptFile(path)
		return nil, ErrStateCorrupt
	}

	// Persisted execution state carries a deterministic integrity hash. Do not
	// resume from a missing or mismatched hash: state fields (including completed
	// steps and security bindings) must be internally consistent before use.
	if state.StateHash == "" {
		quarantineCorruptFile(path)
		return nil, ErrStateCorrupt
	}
	computedHash, hashErr := state.ComputeHash()
	if hashErr != nil || computedHash != state.StateHash {
		quarantineCorruptFile(path)
		return nil, ErrStateCorrupt
	}

	return &state, nil
}

// SaveState performs an atomic state write with directory mode 0700 and file mode 0600.
func SaveState(state *ExecutionState) error {
	if state == nil || state.TransactionId == "" {
		return fmt.Errorf(i18n.T("cannot_save_state_execution_state"))
	}

	// Build the next version off to the side. A failed disk write must not
	// advance the caller's sequence/hash chain when that version was never
	// durably committed.
	nextState := *state
	nextState.StateSequence++
	nextState.PrevStateHash = state.StateHash
	nextState.UpdatedAt = time.Now().Unix()
	hash, err := nextState.ComputeHash()
	if err != nil {
		return fmt.Errorf(i18n.T("failed_to_compute_state_hash"), err)
	}
	nextState.StateHash = hash

	txDir, err := GetTransactionDir(state.TransactionId)
	if err != nil {
		return err
	}

	if err := os.MkdirAll(txDir, 0700); err != nil {
		return fmt.Errorf(i18n.T("failed_to_create_transaction_directory"), txDir, err)
	}
	if err := os.Chmod(txDir, 0700); err != nil {
		return fmt.Errorf("secure transaction directory permissions: %w", err)
	}

	data, err := json.MarshalIndent(&nextState, "", "  ")
	if err != nil {
		return fmt.Errorf(i18n.T("failed_to_serialize_execution_state"), err)
	}

	finalPath := filepath.Join(txDir, "state.json")

	// Each writer needs its own temporary file. A fixed state.json.tmp path lets
	// concurrent saves truncate or rename each other's in-progress payload.
	file, err := os.CreateTemp(txDir, ".state.json.tmp-*")
	if err != nil {
		return fmt.Errorf(i18n.T("failed_to_open_temp_state"), err)
	}
	tmpPath := file.Name()
	defer func() { _ = os.Remove(tmpPath) }()

	if _, err := file.Write(data); err != nil {
		_ = file.Close()
		_ = os.Remove(tmpPath)
		return fmt.Errorf(i18n.T("failed_to_write_temp_state"), err)
	}

	if err := file.Sync(); err != nil {
		_ = file.Close()
		_ = os.Remove(tmpPath)
		return fmt.Errorf(i18n.T("failed_to_sync_temp_state"), err)
	}

	if err := file.Close(); err != nil {
		_ = os.Remove(tmpPath)
		return fmt.Errorf(i18n.T("failed_to_close_temp_state"), err)
	}

	if err := os.Chmod(tmpPath, 0600); err != nil {
		_ = file.Close()
		_ = os.Remove(tmpPath)
		return fmt.Errorf("secure temporary state file permissions: %w", err)
	}

	// Replace the persisted state only after the new file is fully written,
	// synced, closed, and secured. Never delete the previous state as a generic
	// fallback when rename fails: a failed replacement must not destroy the
	// last known-good execution state. On platforms where replacement rename
	// is unsupported, fail closed and preserve the existing state for recovery.
	if err := stateFileReplacer(tmpPath, finalPath); err != nil {
		_ = os.Remove(tmpPath)
		return fmt.Errorf(i18n.T("atomic_rename_failed_for_state"), err)
	}

	// Publish the new in-memory state only after the durable replacement succeeds.
	*state = nextState
	return nil
}

// InitState initializes state with basic transaction ID.
func InitState(txId string) *ExecutionState {
	s := &ExecutionState{
		SchemaVersion: "1.0.0",
		TransactionId: txId,
		Status:        "PENDING",
		Steps:         make([]*StepState, 0),
		UpdatedAt:     time.Now().Unix(),
	}
	s.StateHash, _ = s.ComputeHash()
	return s
}

// InitStateFromEnvelope initializes state bound cryptographically to an execution envelope.
func InitStateFromEnvelope(env *ExecutionEnvelope) *ExecutionState {
	s := &ExecutionState{
		SchemaVersion:   "1.0.0",
		TransactionId:   env.TransactionId,
		ExecutionId:     env.ExecutionId,
		WorkspaceId:     env.WorkspaceId,
		TargetId:        env.TargetId,
		RecipeSignature: env.Signature,
		AgentId:         env.AgentId,
		AgentVersion:    env.AgentVersion,
		ExpiresAt:       env.ExpiresAt,
		PlanHash:        env.PlanHash,
		TenantId:        env.TenantId,
		ProjectId:       env.ProjectId,
		EnvironmentId:   env.EnvironmentId,
		RecipeVersion:   env.Version,
		PolicyHash:      env.PolicyHash,
		Status:          "PENDING",
		Steps:           make([]*StepState, 0),
		UpdatedAt:       time.Now().Unix(),
		StateSequence:   0,
	}
	s.StateHash, _ = s.ComputeHash()
	return s
}
