/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : client/engine
 * File           : state.go
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
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
)

var (
	ErrStateNotFound = errors.New(i18n.T("state_file_not_found"))
	ErrStateCorrupt  = errors.New(i18n.T("state_file_is_corrupt"))
)

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
	if strings.Contains(txId, "..") || strings.Contains(txId, "/") || strings.Contains(txId, "\\") {
		return "", fmt.Errorf(i18n.T("invalid_transactionid_contains_path_separators"), txId)
	}
	baseDir, err := GetTransactionsDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(baseDir, txId), nil
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

	if state.TransactionId == "" {
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

	state.StateSequence++
	state.PrevStateHash = state.StateHash
	state.UpdatedAt = time.Now().Unix()
	hash, err := state.ComputeHash()
	if err != nil {
		return fmt.Errorf(i18n.T("failed_to_compute_state_hash"), err)
	}
	state.StateHash = hash

	txDir, err := GetTransactionDir(state.TransactionId)
	if err != nil {
		return err
	}

	if err := os.MkdirAll(txDir, 0700); err != nil {
		return fmt.Errorf(i18n.T("failed_to_create_transaction_directory"), txDir, err)
	}
	_ = os.Chmod(txDir, 0700)

	data, err := json.MarshalIndent(state, "", "  ")
	if err != nil {
		return fmt.Errorf(i18n.T("failed_to_serialize_execution_state"), err)
	}

	tmpPath := filepath.Join(txDir, "state.json.tmp")
	finalPath := filepath.Join(txDir, "state.json")

	file, err := os.OpenFile(tmpPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0600)
	if err != nil {
		return fmt.Errorf(i18n.T("failed_to_open_temp_state"), err)
	}

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

	_ = os.Chmod(tmpPath, 0600)

	// Atomic rename
	if err := os.Rename(tmpPath, finalPath); err != nil {
		// Windows fallback if destination file already exists
		_ = os.Remove(finalPath)
		if fallbackErr := os.Rename(tmpPath, finalPath); fallbackErr != nil {
			_ = os.Remove(tmpPath)
			return fmt.Errorf(i18n.T("atomic_rename_failed_for_state"), fallbackErr)
		}
	}

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
		RecipeVersion:   env.Version, // or ProtocolVersion if available
		PolicyHash:      env.PolicyHash,
		Status:          "PENDING",
		Steps:           make([]*StepState, 0),
		UpdatedAt:       time.Now().Unix(),
		StateSequence:   0,
	}
	s.StateHash, _ = s.ComputeHash()
	return s
}
