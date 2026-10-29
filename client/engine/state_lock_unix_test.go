//go:build !windows

/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : client/engine
 * File           : state_lock_unix_test.go
 * Author         : Ignatus Chika Ujomor
 * Organization   : Air Roofers SASU
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

package engine

import (
	"errors"
	"os"
	"testing"
)

func TestUnixStateFileLockUnlockPropagatesUnlockFailureAndClosesFile(t *testing.T) {
	file, err := os.CreateTemp(t.TempDir(), "state-lock-")
	if err != nil {
		t.Fatalf("create lock file: %v", err)
	}
	lock := &unixStateFileLock{file: file}
	wantErr := errors.New("injected flock unlock failure")

	previousUnlock := unixStateFileUnlock
	unixStateFileUnlock = func(fd int) error {
		if fd != int(file.Fd()) {
			t.Fatalf("unlock called with fd %d, want %d", fd, file.Fd())
		}
		return wantErr
	}
	defer func() { unixStateFileUnlock = previousUnlock }()

	err = lock.Unlock()
	if !errors.Is(err, wantErr) {
		t.Fatalf("Unlock() error = %v, want wrapped unlock error %v", err, wantErr)
	}
	if lock.file != nil {
		t.Fatal("Unlock() retained file handle after attempting unlock")
	}
	if _, statErr := file.Stat(); statErr == nil {
		t.Fatal("file handle remained usable after Unlock() returned")
	}
}

func TestUnixStateFileLockUnlockNilIsNoop(t *testing.T) {
	var nilLock *unixStateFileLock
	if err := nilLock.Unlock(); err != nil {
		t.Fatalf("Unlock() on nil lock = %v, want nil", err)
	}
	if err := (&unixStateFileLock{}).Unlock(); err != nil {
		t.Fatalf("Unlock() on empty lock = %v, want nil", err)
	}
}
