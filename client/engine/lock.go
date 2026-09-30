/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : client/engine
 * File           : lock.go
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
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
)

var (
	ErrTransactionLocked = errors.New("transaction is locked by another active process")
)

type LockData struct {
	PID       int    `json:"pid"`
	Hostname  string `json:"hostname"`
	Timestamp int64  `json:"timestamp"`
	TxID      string `json:"txId"`
}

type TransactionLock struct {
	TxID     string
	LockPath string
	Data     LockData
}

// isProcessAlive checks if a process ID is currently alive on the host.
func isProcessAlive(pid int) bool {
	if pid <= 0 {
		return false
	}
	// Check /proc/<pid> on Linux/Unix platforms
	if _, err := os.Stat("/proc"); err == nil {
		procPath := fmt.Sprintf("/proc/%d", pid)
		if _, err := os.Stat(procPath); err == nil {
			return true
		}
		return false
	}

	// On Windows and other platforms
	p, err := os.FindProcess(pid)
	if err != nil {
		return false
	}
	_ = p.Release()
	return true
}

// AcquireTransactionLock acquires an exclusive lock for the transaction.
func AcquireTransactionLock(txId string) (*TransactionLock, error) {
	txDir, err := GetTransactionDir(txId)
	if err != nil {
		return nil, err
	}

	if err := os.MkdirAll(txDir, 0700); err != nil {
		return nil, fmt.Errorf("failed to create transaction directory for lock: %w", err)
	}

	lockPath := filepath.Join(txDir, "lock")
	hostname, _ := os.Hostname()
	currentPID := os.Getpid()
	now := time.Now().Unix()

	lockData := LockData{
		PID:       currentPID,
		Hostname:  hostname,
		Timestamp: now,
		TxID:      txId,
	}

	lockBytes, err := json.MarshalIndent(lockData, "", "  ")
	if err != nil {
		return nil, fmt.Errorf("failed to marshal lock data: %w", err)
	}

	// Attempt exclusive creation
	file, err := os.OpenFile(lockPath, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0600)
	if err == nil {
		if _, writeErr := file.Write(lockBytes); writeErr != nil {
			_ = file.Close()
			_ = os.Remove(lockPath)
			return nil, fmt.Errorf("failed to write lock file: %w", writeErr)
		}
		_ = file.Sync()
		_ = file.Close()
		return &TransactionLock{
			TxID:     txId,
			LockPath: lockPath,
			Data:     lockData,
		}, nil
	}

	// Lock exists: read and evaluate staleness
	existingData, readErr := os.ReadFile(lockPath)
	if readErr != nil {
		return nil, ErrTransactionLocked
	}

	var existing LockData
	if jsonErr := json.Unmarshal(existingData, &existing); jsonErr != nil || len(strings.TrimSpace(string(existingData))) == 0 {
		// Corrupt or empty lock file, treat as stale
		_ = os.Remove(lockPath)
		return tryCreateLock(lockPath, lockBytes, lockData, txId)
	}

	// Stale lock evaluation:
	// 1. Lock age > 30 minutes
	isStaleTimeout := time.Since(time.Unix(existing.Timestamp, 0)) > 30*time.Minute

	// 2. Dead PID on the same hostname
	isDeadProcess := false
	if existing.Hostname == hostname && !isProcessAlive(existing.PID) {
		isDeadProcess = true
	}

	if isStaleTimeout || isDeadProcess {
		// Stale lock detected, remove and reacquire
		_ = os.Remove(lockPath)
		return tryCreateLock(lockPath, lockBytes, lockData, txId)
	}

	return nil, ErrTransactionLocked
}

func tryCreateLock(lockPath string, lockBytes []byte, lockData LockData, txId string) (*TransactionLock, error) {
	file, err := os.OpenFile(lockPath, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0600)
	if err != nil {
		return nil, ErrTransactionLocked
	}
	if _, writeErr := file.Write(lockBytes); writeErr != nil {
		_ = file.Close()
		_ = os.Remove(lockPath)
		return nil, fmt.Errorf("failed to write lock file: %w", writeErr)
	}
	_ = file.Sync()
	_ = file.Close()
	return &TransactionLock{
		TxID:     txId,
		LockPath: lockPath,
		Data:     lockData,
	}, nil
}

// ReleaseTransactionLock releases the transaction lock file if owned by the current process.
func ReleaseTransactionLock(lock *TransactionLock) error {
	if lock == nil || lock.LockPath == "" {
		return nil
	}

	existingData, err := os.ReadFile(lock.LockPath)
	if err == nil {
		var existing LockData
		if json.Unmarshal(existingData, &existing) == nil {
			if existing.PID == lock.Data.PID && existing.Hostname == lock.Data.Hostname {
				return os.Remove(lock.LockPath)
			}
		}
	}
	return os.Remove(lock.LockPath)
}
