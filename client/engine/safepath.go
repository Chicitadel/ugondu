/******************************************************************************
 * Project        : Ugondu
 * Module         : Client Engine
 * File           : safepath.go
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
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

var (
	ErrPathTraversal = errors.New("ERR_PATH_TRAVERSAL_ATTEMPT")
	ErrAbsolutePath  = errors.New("ERR_ABSOLUTE_PATH_ATTEMPT")
	ErrUNCPath       = errors.New("ERR_UNC_PATH_ATTEMPT")
	ErrNTFSStream    = errors.New("ERR_NTFS_STREAM_ATTEMPT")
	ErrDeviceName    = errors.New("ERR_DEVICE_NAME_ATTEMPT")
	ErrSymlinkEscape = errors.New("ERR_SYMLINK_ESCAPE")
	ErrEscapeBaseDir = errors.New("ERR_ESCAPE_BASE_DIR")
)

type SafePathResolver struct{}

func (s *SafePathResolver) ResolveSafePath(baseDir, targetRelPath string) (string, error) {
	if strings.Contains(targetRelPath, "..") {
		return "", ErrPathTraversal
	}
	if filepath.IsAbs(targetRelPath) || strings.HasPrefix(targetRelPath, "/") || strings.HasPrefix(targetRelPath, "\\") {
		return "", ErrAbsolutePath
	}
	if strings.HasPrefix(targetRelPath, "\\\\") {
		return "", ErrUNCPath
	}
	if strings.Contains(targetRelPath, ":") {
		return "", ErrNTFSStream
	}
	
	// Windows Device Names
	upper := strings.ToUpper(filepath.Base(targetRelPath))
	devices := []string{"CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9"}
	for _, dev := range devices {
		if upper == dev || strings.HasPrefix(upper, dev+".") {
			return "", ErrDeviceName
		}
	}

	cleanBase, err := filepath.Abs(filepath.Clean(baseDir))
	if err != nil {
		return "", fmt.Errorf("ERR_BASE_DIR_RESOLUTION: %w", err)
	}

	target := filepath.Join(cleanBase, targetRelPath)
	
	// Prevent symlink escapes if the target already exists and is evaluated
	evalTarget, err := filepath.EvalSymlinks(target)
	if err == nil {
		if !strings.HasPrefix(evalTarget, cleanBase+string(filepath.Separator)) && evalTarget != cleanBase {
			return "", ErrSymlinkEscape
		}
	} else if !os.IsNotExist(err) {
		return "", fmt.Errorf("ERR_SYMLINK_EVALUATION: %w", err)
	}

	if !strings.HasPrefix(target, cleanBase+string(filepath.Separator)) && target != cleanBase {
		return "", ErrEscapeBaseDir
	}

	return target, nil
}
