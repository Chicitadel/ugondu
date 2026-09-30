/******************************************************************************
 * Project        : Ugondu
 * Module         : Client Engine
 * File           : replay.go
 * Version        : 3.0.0
 * Author         : Ujomor Systems Engineering Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Last Modified  : 2026-09-30
 * Classification : ENTERPRISE
 *
 * Governance:
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
 * Copyright (c) 2026 Air Roofers Ltd
 * All Rights Reserved.
 ******************************************************************************/

package engine

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"time"
)

var (
	ErrReplayDetected = errors.New("ERR_REPLAY_DETECTED")
	ErrExpired        = errors.New("ERR_TRANSACTION_EXPIRED")
)

type ReplayEntry struct {
	Issuer        string `json:"issuer"`
	KeyId         string `json:"keyId"`
	TransactionId string `json:"transactionId"`
	ExecutionId   string `json:"executionId"`
	Nonce         string `json:"nonce"`
	ExpiresAt     int64  `json:"expiresAt"`
}

func getReplayLedgerPath() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("ERR_HOME_DIR: %w", err)
	}
	return filepath.Join(home, ".ugondu", "replay_ledger.json"), nil
}

func CheckAndRecordReplay(issuer, keyId, txId, execId, nonce string, expiresAt int64) error {
	now := time.Now().UnixMilli()
	
	// Clock skew bounds / Expiration
	if now > expiresAt {
		return ErrExpired
	}

	ledgerPath, err := getReplayLedgerPath()
	if err != nil {
		return err
	}

	lockFile := ledgerPath + ".lock"
	lock, err := AcquireTransactionLock(lockFile)
	if err != nil {
		return fmt.Errorf("ERR_LEDGER_LOCK: %w", err)
	}
	defer ReleaseTransactionLock(lock)

	var entries []ReplayEntry
	data, err := os.ReadFile(ledgerPath)
	if err == nil {
		json.Unmarshal(data, &entries)
	}

	var validEntries []ReplayEntry
	for _, entry := range entries {
		// Cleanup expired
		if now > entry.ExpiresAt {
			continue
		}
		
		if entry.Issuer == issuer && entry.KeyId == keyId && entry.TransactionId == txId && entry.ExecutionId == execId && entry.Nonce == nonce {
			return ErrReplayDetected
		}
		
		validEntries = append(validEntries, entry)
	}

	validEntries = append(validEntries, ReplayEntry{
		Issuer:        issuer,
		KeyId:         keyId,
		TransactionId: txId,
		ExecutionId:   execId,
		Nonce:         nonce,
		ExpiresAt:     expiresAt,
	})

	out, _ := json.MarshalIndent(validEntries, "", "  ")
	os.WriteFile(ledgerPath, out, 0600)

	return nil
}
