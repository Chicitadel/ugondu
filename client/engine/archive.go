/******************************************************************************
 * Project        : Ugondu
 * Module         : Client Engine
 * File           : archive.go
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
	"github.com/ugondu/client/i18n"
	"archive/zip"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
)

var (
	ErrZipSlip            = errors.New(i18n.T("ERR_ZIP_SLIP_DETECTED"))
	ErrSymlinkRejection   = errors.New(i18n.T("ERR_SYMLINK_REJECTED"))
	ErrCompressionRatio   = errors.New(i18n.T("ERR_COMPRESSION_RATIO_EXCEEDED"))
	ErrMaxFilesExceeded   = errors.New(i18n.T("ERR_MAX_FILES_EXCEEDED"))
	ErrMaxExpandedSize    = errors.New(i18n.T("ERR_MAX_EXPANDED_SIZE_EXCEEDED"))
)

const (
	MaxFiles         = 10000
	MaxExpandedSize  = 1024 * 1024 * 1024 // 1GB
	MaxRatio         = 100
)

func ExtractArchiveSafe(archivePath, targetDir string) error {
	resolver := &SafePathResolver{}
	
	r, err := zip.OpenReader(archivePath)
	if err != nil {
		return fmt.Errorf(i18n.T("msg_err_zip_open_w"), err)
	}
	defer r.Close()

	if len(r.File) > MaxFiles {
		return ErrMaxFilesExceeded
	}

	var totalExpanded uint64

	for _, f := range r.File {
		// Verify symlink/hardlink
		if f.Mode()&os.ModeSymlink != 0 {
			return ErrSymlinkRejection
		}

		// Zip Slip defense
		safeDest, err := resolver.ResolveSafePath(targetDir, f.Name)
		if err != nil {
			return ErrZipSlip
		}

		if f.FileInfo().IsDir() {
			os.MkdirAll(safeDest, f.Mode())
			continue
		}

		if f.UncompressedSize64 > 0 && f.CompressedSize64 > 0 {
			if f.UncompressedSize64/f.CompressedSize64 > MaxRatio {
				return ErrCompressionRatio
			}
		}

		totalExpanded += f.UncompressedSize64
		if totalExpanded > MaxExpandedSize {
			return ErrMaxExpandedSize
		}

		if err := extractFile(f, safeDest); err != nil {
			return err
		}
	}

	return nil
}

func extractFile(f *zip.File, dest string) error {
	rc, err := f.Open()
	if err != nil {
		return fmt.Errorf(i18n.T("msg_err_zip_file_open_w"), err)
	}
	defer rc.Close()

	os.MkdirAll(filepath.Dir(dest), 0755)
	
	out, err := os.OpenFile(dest, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, f.Mode())
	if err != nil {
		return fmt.Errorf(i18n.T("msg_err_file_create_w"), err)
	}
	defer out.Close()

	if _, err := io.Copy(out, rc); err != nil {
		return fmt.Errorf(i18n.T("msg_err_file_extract_w"), err)
	}
	return nil
}
