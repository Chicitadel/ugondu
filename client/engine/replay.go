/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : client/engine
 * File           : replay.go
 * Version        : 3.0.0
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
	"fmt"
	"os"
	"path/filepath"
	"time"

	"ugondu/client/i18n"
)

var (
	ErrReplayDetected = errors.New(i18n.T("ERR_REPLAY_DETECTED"))
	ErrExpired        = errors.New(i18n.T("ERR_TRANSACTION_EXPIRED"))
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
		return "", fmt.Errorf(i18n.T("msg_err_home_dir_w"), err)
	}
	return filepath.Join(home, ".ugondu", "replay_ledger.json"), nil
}

func CheckAndRecordReplay(issuer, keyId, txId, execId, nonce string, expiresAt int64) error {
	now := time.Now().UnixMilli()

	// Clock skew bounds / Expiration
	if expiresAt > 0 && now > expiresAt {
		return ErrExpired
	}

	ledgerPath, err := getReplayLedgerPath()
	if err != nil {
		return err
	}

	lock, err := AcquireTransactionLock("replay_ledger_lock")
	if err != nil {
		return fmt.Errorf(i18n.T("msg_err_ledger_lock_w"), err)
	}
	defer ReleaseTransactionLock(lock)

	var entries []ReplayEntry
	data, err := os.ReadFile(ledgerPath)
	if err == nil {
		_ = json.Unmarshal(data, &entries)
	}

	var validEntries []ReplayEntry
	for _, entry := range entries {
		// Cleanup expired
		if entry.ExpiresAt > 0 && now > entry.ExpiresAt {
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

	_ = os.MkdirAll(filepath.Dir(ledgerPath), 0700)
	out, _ := json.MarshalIndent(validEntries, "", "  ")
	_ = os.WriteFile(ledgerPath, out, 0600)

	return nil
}
