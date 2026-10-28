//go:build !windows

/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : client/engine
 * File           : state_lock_unix.go
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
	"os"
	"syscall"
)

type unixStateFileLock struct {
	file *os.File
}

// acquireStateFileLock acquires an exclusive advisory lock on lockPath using
// POSIX flock. It blocks until the lock is granted.
func acquireStateFileLock(lockPath string) (stateFileLock, error) {
	file, err := os.OpenFile(lockPath, os.O_CREATE|os.O_RDWR, 0600)
	if err != nil {
		return nil, err
	}
	if err := syscall.Flock(int(file.Fd()), syscall.LOCK_EX); err != nil {
		_ = file.Close()
		return nil, err
	}
	return &unixStateFileLock{file: file}, nil
}

func (l *unixStateFileLock) Unlock() error {
	if l == nil || l.file == nil {
		return nil
	}
	_ = syscall.Flock(int(l.file.Fd()), syscall.LOCK_UN)
	err := l.file.Close()
	l.file = nil
	return err
}
