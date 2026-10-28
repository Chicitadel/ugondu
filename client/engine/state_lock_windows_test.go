//go:build windows

package engine

import (
	"errors"
	"path/filepath"
	"syscall"
	"testing"
)

func TestWindowsStateFileLockReusesOverlappedForUnlock(t *testing.T) {
	originalLock, originalUnlock := lockFileExCall, unlockFileExCall
	t.Cleanup(func() {
		lockFileExCall, unlockFileExCall = originalLock, originalUnlock
	})

	var lockedOverlapped, unlockedOverlapped *syscall.Overlapped
	lockFileExCall = func(_ uintptr, overlapped *syscall.Overlapped) error {
		lockedOverlapped = overlapped
		return nil
	}
	unlockFileExCall = func(_ uintptr, overlapped *syscall.Overlapped) error {
		unlockedOverlapped = overlapped
		return nil
	}

	acquired, err := acquireStateFileLock(filepath.Join(t.TempDir(), ".lock"))
	if err != nil {
		t.Fatalf("acquire state lock: %v", err)
	}
	lock, ok := acquired.(*windowsStateFileLock)
	if !ok {
		t.Fatalf("unexpected lock implementation %T", acquired)
	}
	if lockedOverlapped != lock.overlapped {
		t.Fatal("LockFileEx did not receive the lock's retained OVERLAPPED structure")
	}
	if err := lock.Unlock(); err != nil {
		t.Fatalf("unlock state lock: %v", err)
	}
	if unlockedOverlapped != lockedOverlapped {
		t.Fatal("UnlockFileEx must receive the same OVERLAPPED structure as LockFileEx")
	}
}

func TestWindowsStateFileLockPropagatesUnlockFailure(t *testing.T) {
	originalLock, originalUnlock := lockFileExCall, unlockFileExCall
	t.Cleanup(func() {
		lockFileExCall, unlockFileExCall = originalLock, originalUnlock
	})

	unlockFailure := errors.New("injected UnlockFileEx failure")
	lockFileExCall = func(_ uintptr, _ *syscall.Overlapped) error { return nil }
	unlockFileExCall = func(_ uintptr, _ *syscall.Overlapped) error { return unlockFailure }

	acquired, err := acquireStateFileLock(filepath.Join(t.TempDir(), ".lock"))
	if err != nil {
		t.Fatalf("acquire state lock: %v", err)
	}
	if err := acquired.Unlock(); !errors.Is(err, unlockFailure) {
		t.Fatalf("Unlock must propagate API failure, got %v", err)
	}
}
