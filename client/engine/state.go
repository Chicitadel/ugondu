/******************************************************************************
 * Project        : Ugondu
 * Module         : client/engine
 * File           : state.go
 * Version        : 1.0.0
 * Author         : Ujomor Engineering
 * Organization   : Ujomor
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
 * Copyright (c) 2026 Ujomor
 * All Rights Reserved.
 ******************************************************************************/

package engine

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"
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
	TransactionId string       `json:"transaction_id"`
	Status        string       `json:"status"`
	Steps         []*StepState `json:"steps"`
	UpdatedAt     int64        `json:"updated_at"`
}

func getStateFilePath(txId string) (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ".ugondu", "state", fmt.Sprintf("%s.json", txId)), nil
}

func LoadState(txId string) (*ExecutionState, error) {
	path, err := getStateFilePath(txId)
	if err != nil {
		return nil, err
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var state ExecutionState
	if err := json.Unmarshal(data, &state); err != nil {
		return nil, err
	}

	return &state, nil
}

func SaveState(state *ExecutionState) error {
	state.UpdatedAt = time.Now().Unix()

	path, err := getStateFilePath(state.TransactionId)
	if err != nil {
		return err
	}

	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}

	data, err := json.MarshalIndent(state, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(path, data, 0644)
}

func InitState(txId string) *ExecutionState {
	return &ExecutionState{
		TransactionId: txId,
		Status:        "PENDING",
		Steps:         make([]*StepState, 0),
		UpdatedAt:     time.Now().Unix(),
	}
}
