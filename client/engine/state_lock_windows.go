//go:build windows

/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : client/engine
 * File           : state_lock_windows.go
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
	"errors"
	"os"
	"syscall"
	"unsafe"
)

var (
	kernel32Lock     = syscall.NewLazyDLL("kernel32.dll")
	procLockFileEx   = kernel32Lock.NewProc("LockFileEx")
	procUnlockFileEx = kernel32Lock.NewProc("UnlockFileEx")
)

const (
	lockFileExclusiveLock = 0x00000002
)

type windowsStateFileLock struct {
	file       *os.File
	overlapped *syscall.Overlapped
}

// lockFileExCall and unlockFileExCall are seams for deterministic API-contract
// tests. Both operations must use the same OVERLAPPED structure for a lock.
var (
	lockFileExCall = func(handle uintptr, overlapped *syscall.Overlapped) error {
		r1, _, callErr := procLockFileEx.Call(
			handle,
			uintptr(lockFileExclusiveLock),
			0,
			1,
			0,
			uintptr(unsafe.Pointer(overlapped)),
		)
		if r1 != 0 {
			return nil
		}
		return windowsCallError(callErr)
	}
	unlockFileExCall = func(handle uintptr, overlapped *syscall.Overlapped) error {
		r1, _, callErr := procUnlockFileEx.Call(
			handle,
			0,
			1,
			0,
			uintptr(unsafe.Pointer(overlapped)),
		)
		if r1 != 0 {
			return nil
		}
		return windowsCallError(callErr)
	}
)

func windowsCallError(callErr error) error {
	if errno, ok := callErr.(syscall.Errno); ok && errno != 0 {
		return errno
	}
	return syscall.EINVAL
}

// acquireStateFileLock acquires an exclusive lock on lockPath using
// Windows kernel LockFileEx. It blocks until the lock is granted.
func acquireStateFileLock(lockPath string) (stateFileLock, error) {
	file, err := os.OpenFile(lockPath, os.O_CREATE|os.O_RDWR, 0600)
	if err != nil {
		return nil, err
	}
	overlapped := &syscall.Overlapped{}
	if err := lockFileExCall(file.Fd(), overlapped); err != nil {
		_ = file.Close()
		return nil, err
	}
	return &windowsStateFileLock{file: file, overlapped: overlapped}, nil
}

func (l *windowsStateFileLock) Unlock() error {
	if l == nil || l.file == nil {
		return nil
	}
	unlockErr := unlockFileExCall(l.file.Fd(), l.overlapped)
	closeErr := l.file.Close()
	l.file = nil
	return errors.Join(unlockErr, closeErr)
}
