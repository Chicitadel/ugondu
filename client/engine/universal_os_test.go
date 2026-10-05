/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : client/engine
 * File           : universal_os_test.go
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
	"os"
	"path/filepath"
	"testing"
)

func TestCopyDirExcludesGitOnly(t *testing.T) {
	srcDir, err := os.MkdirTemp("", "ugondu_copydir_src_*")
	if err != nil {
		t.Fatalf("Failed to create temp src dir: %v", err)
	}
	defer os.RemoveAll(srcDir)

	dstDir, err := os.MkdirTemp("", "ugondu_copydir_dst_*")
	if err != nil {
		t.Fatalf("Failed to create temp dst dir: %v", err)
	}
	defer os.RemoveAll(dstDir)

	// Create test structure:
	// src/
	//   .git/config
	//   .gitignore
	//   git-service/index.js
	//   my.git.repo.txt
	//   normal.txt
	_ = os.MkdirAll(filepath.Join(srcDir, ".git"), 0755)
	_ = os.WriteFile(filepath.Join(srcDir, ".git", "config"), []byte(i18n.T("git_config")), 0644)
	_ = os.WriteFile(filepath.Join(srcDir, ".gitignore"), []byte("node_modules"), 0644)
	_ = os.MkdirAll(filepath.Join(srcDir, "git-service"), 0755)
	_ = os.WriteFile(filepath.Join(srcDir, "git-service", "index.js"), []byte("console.log()"), 0644)
	_ = os.WriteFile(filepath.Join(srcDir, "my.git.repo.txt"), []byte("data"), 0644)
	_ = os.WriteFile(filepath.Join(srcDir, "normal.txt"), []byte("hello"), 0644)

	if err := CopyDir(srcDir, dstDir, true); err != nil {
		t.Fatalf("CopyDir failed: %v", err)
	}

	// .git should be excluded
	if _, err := os.Stat(filepath.Join(dstDir, ".git")); !os.IsNotExist(err) {
		t.Errorf(i18n.T("git_directory_should_have_been"))
	}

	// .gitignore should NOT be excluded!
	if _, err := os.Stat(filepath.Join(dstDir, ".gitignore")); err != nil {
		t.Errorf(".gitignore should have been copied: %v", err)
	}

	// git-service/ should NOT be excluded!
	if _, err := os.Stat(filepath.Join(dstDir, "git-service", "index.js")); err != nil {
		t.Errorf("git-service/index.js should have been copied: %v", err)
	}

	// my.git.repo.txt should NOT be excluded!
	if _, err := os.Stat(filepath.Join(dstDir, "my.git.repo.txt")); err != nil {
		t.Errorf("my.git.repo.txt should have been copied: %v", err)
	}

	// normal.txt should be copied
	if _, err := os.Stat(filepath.Join(dstDir, "normal.txt")); err != nil {
		t.Errorf("normal.txt should have been copied: %v", err)
	}
}

func TestAtomicSymlinkNoGap(t *testing.T) {
	tmpDir, _ := os.MkdirTemp("", "symlink-test")
	defer os.RemoveAll(tmpDir)

	targetA := filepath.Join(tmpDir, "targetA")
	targetB := filepath.Join(tmpDir, "targetB")
	symlinkPath := filepath.Join(tmpDir, "current")

	os.Mkdir(targetA, 0755)
	os.Mkdir(targetB, 0755)

	if err := os.Symlink(targetA, symlinkPath); err != nil {
		t.Fatalf("setup failed: %v", err)
	}

	done := make(chan struct{})
	errCh := make(chan error, 1)

	// Goroutine to constantly read the symlink, expecting no i18n.T("not_found") errors
	go func() {
		for {
			select {
			case <-done:
				return
			default:
				_, err := os.Readlink(symlinkPath)
				if err != nil {
					errCh <- err
					return
				}
			}
		}
	}()

	err := AtomicSymlink(targetB, symlinkPath)
	if err != nil {
		t.Fatalf("AtomicSymlink failed: %v", err)
	}

	close(done)

	select {
	case err := <-errCh:
		t.Fatalf("Symlink read gap detected: %v", err)
	default:
	}

	linked, _ := os.Readlink(symlinkPath)
	if linked != targetB {
		t.Fatalf("Expected symlink to point to %s, got %s", targetB, linked)
	}
}

