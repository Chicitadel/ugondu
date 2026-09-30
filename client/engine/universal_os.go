/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : client/engine
 * File           : universal_os.go
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
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
)

// CopyDir recursively copies a directory tree, replacing `rsync -avz --exclude .git`.
// Native Go implementation works identically across Windows, macOS, and Linux.
func CopyDir(src string, dst string, excludeGit bool) error {
	src = filepath.Clean(src)
	dst = filepath.Clean(dst)

	return filepath.Walk(src, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		if excludeGit {
			if info.Name() == ".git" {
				if info.IsDir() {
					return filepath.SkipDir
				}
				return nil
			}
		}

		// Calculate relative path
		relPath, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}
		if relPath == "." {
			return nil // Skip root directory itself
		}

		resolver := &SafePathResolver{}
		destPath, err := resolver.ResolveSafePath(dst, relPath)
		if err != nil {
			return fmt.Errorf("ERR_SAFE_PATH: %w", err)
		}

		if info.IsDir() {
			return os.MkdirAll(destPath, info.Mode())
		}

		return copyFile(path, destPath, info.Mode())
	})
}

// copyFile is a pure Go byte-for-byte file copy.
func copyFile(src, dst string, mode os.FileMode) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	// Create output directory just in case
	os.MkdirAll(filepath.Dir(dst), 0755)

	out, err := os.OpenFile(dst, os.O_RDWR|os.O_CREATE|os.O_TRUNC, mode)
	if err != nil {
		return err
	}
	defer out.Close()

	if _, err := io.Copy(out, in); err != nil {
		return err
	}
	return out.Sync()
}

// AtomicSymlink creates or updates a symlink to point to the new release.
// Uses temp-link and rename for POSIX atomic replacement.
func AtomicSymlink(target string, linkName string) error {
	if _, err := os.Stat(target); err != nil {
		return fmt.Errorf("ERR_TARGET_NOT_FOUND: %w", err)
	}

	tempLink := linkName + ".tmp"
	os.Remove(tempLink)

	if err := os.Symlink(target, tempLink); err != nil {
		return fmt.Errorf("ERR_TEMP_SYMLINK_FAILED: %w", err)
	}

	prevTarget, err := os.Readlink(linkName)
	hasPrev := (err == nil)

	// os.Rename is atomic on POSIX, replacing existing symlinks.
	if err := os.Rename(tempLink, linkName); err != nil {
		// Windows fallback if rename over existing directory symlink fails
		if _, statErr := os.Lstat(linkName); statErr == nil {
			os.Remove(linkName)
		}
		if fallbackErr := os.Rename(tempLink, linkName); fallbackErr != nil {
			if hasPrev {
				os.Symlink(prevTarget, linkName)
			}
			return fmt.Errorf("ERR_ATOMIC_SWAP_FAILED_WEAKER_GUARANTEE: %v", fallbackErr)
		}
	}
	return nil
}

// PruneReleases deletes oldest directories in a folder keeping only the most recent N.
// Native Go implementation replaces `ls -dt | tail -n +N | xargs rm -rf`.
func PruneReleases(releasesPath string, retention int) error {
	entries, err := os.ReadDir(releasesPath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}

	var dirs []os.FileInfo
	for _, entry := range entries {
		if entry.IsDir() {
			info, err := entry.Info()
			if err == nil {
				dirs = append(dirs, info)
			}
		}
	}

	if len(dirs) <= retention {
		return nil // Nothing to prune
	}

	// Sort by modification time, newest first
	sort.Slice(dirs, func(i, j int) bool {
		return dirs[i].ModTime().After(dirs[j].ModTime())
	})

	// Remove everything after the retention index
	for _, oldDir := range dirs[retention:] {
		fullPath := filepath.Join(releasesPath, oldDir.Name())
		if err := os.RemoveAll(fullPath); err != nil {
			return fmt.Errorf("failed to remove old release %s: %v", fullPath, err)
		}
	}

	return nil
}
