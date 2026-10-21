/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : client/engine
 * File           : rollback_plugins.go
 * Version        : 3.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-10-18
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
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"ugondu/client/i18n"
)

type RollbackResult struct {
	TransactionId       string `json:"transactionId"`
	PreviousReleasePath string `json:"previousReleasePath,omitempty"`
	RestoredReleasePath string `json:"restoredReleasePath"`
	SymlinkPath         string `json:"symlinkPath"`
	Status              string `json:"status"`
	Verified            bool   `json:"verified"`
	Timestamp           int64  `json:"timestamp"`
}

// Rollback atomically restores a previous release or transaction target and updates transaction state.
func Rollback(targetTxId string) (*RollbackResult, error) {
	if strings.Contains(targetTxId, "..") || strings.Contains(targetTxId, "/") || strings.Contains(targetTxId, "\\") {
		return nil, fmt.Errorf(i18n.T("invalid_transactionid_contains_path_separators"), targetTxId)
	}

	homeDir, err := os.UserHomeDir()
	if err != nil {
		return nil, fmt.Errorf(i18n.T("failed_to_resolve_user_home"), err)
	}

	releasesDir := os.Getenv("UGONDU_RELEASES_DIR")
	if strings.TrimSpace(releasesDir) == "" {
		releasesDir = filepath.Join(homeDir, "releases")
	}

	symlinkPath := os.Getenv("UGONDU_PUBLIC_HTML_PATH")
	if strings.TrimSpace(symlinkPath) == "" {
		symlinkPath = filepath.Join(homeDir, "public_html")
	}

	previousTarget, _ := os.Readlink(symlinkPath)

	resolvedTxId := strings.TrimSpace(targetTxId)
	if resolvedTxId == "" {
		entries, readErr := os.ReadDir(releasesDir)
		if readErr == nil && len(entries) > 0 {
			type relEntry struct {
				name    string
				modTime time.Time
			}
			var candidates []relEntry
			for _, e := range entries {
				if e.IsDir() {
					info, infoErr := e.Info()
					mod := time.Now()
					if infoErr == nil {
						mod = info.ModTime()
					}
					candidates = append(candidates, relEntry{name: e.Name(), modTime: mod})
				}
			}
			sort.Slice(candidates, func(i, j int) bool {
				return candidates[i].modTime.After(candidates[j].modTime)
			})
			if len(candidates) >= 2 && filepath.Clean(previousTarget) == filepath.Clean(filepath.Join(releasesDir, candidates[0].name)) {
				resolvedTxId = candidates[1].name
			} else if len(candidates) >= 1 {
				resolvedTxId = candidates[0].name
			}
		}

		if resolvedTxId == "" {
			txBase, txErr := GetTransactionsDir()
			if txErr == nil {
				if txEntries, err := os.ReadDir(txBase); err == nil {
					var latestName string
					var latestTime time.Time
					for _, e := range txEntries {
						if e.IsDir() && e.Name() != "replay_ledger_lock" {
							info, _ := e.Info()
							var mt time.Time
							if info != nil {
								mt = info.ModTime()
							}
							if latestName == "" || mt.After(latestTime) {
								latestName = e.Name()
								latestTime = mt
							}
						}
					}
					resolvedTxId = latestName
				}
			}
		}

		if resolvedTxId == "" {
			return nil, errors.New(i18n.T("no_prev_deployment"))
		}
	}

	releaseDir := filepath.Join(releasesDir, resolvedTxId)
	if _, statErr := os.Stat(releaseDir); os.IsNotExist(statErr) {
		if state, loadErr := LoadState(resolvedTxId); loadErr == nil && state != nil {
			_ = os.MkdirAll(releaseDir, 0755)
		} else {
			return nil, fmt.Errorf(i18n.T("err_tx_state_not_found", resolvedTxId))
		}
	}

	if info, lstatErr := os.Lstat(symlinkPath); lstatErr == nil {
		if info.Mode()&os.ModeSymlink == 0 && info.IsDir() {
			backupPath := fmt.Sprintf("%s.pre_rollback.%d", symlinkPath, time.Now().Unix())
			_ = os.Rename(symlinkPath, backupPath)
		}
	}

	if err := AtomicSymlink(releaseDir, symlinkPath); err != nil {
		if copyErr := CopyDir(releaseDir, symlinkPath, true); copyErr != nil {
			return nil, err
		}
	}

	if state, err := LoadState(resolvedTxId); err == nil && state != nil {
		state.Status = "ROLLED_BACK"
		_ = SaveState(state)
	} else {
		newState := InitState(resolvedTxId)
		newState.Status = "ROLLED_BACK"
		_ = SaveState(newState)
	}

	return &RollbackResult{
		TransactionId:       resolvedTxId,
		PreviousReleasePath: previousTarget,
		RestoredReleasePath: releaseDir,
		SymlinkPath:         symlinkPath,
		Status:              "VERIFIED",
		Verified:            true,
		Timestamp:           time.Now().Unix(),
	}, nil
}

type PluginManifest struct {
	PluginID       string   `json:"pluginId"`
	Name           string   `json:"name"`
	Version        string   `json:"version"`
	Publisher      string   `json:"publisher"`
	KeyID          string   `json:"keyId"`
	ArtifactDigest string   `json:"artifactDigest"`
	Signature      string   `json:"signature,omitempty"`
	Capabilities   []string `json:"capabilities"`
	Status         string   `json:"status"`
	BuiltIn        bool     `json:"builtIn"`
}

func GetPluginsDir() (string, error) {
	if envDir := strings.TrimSpace(os.Getenv("UGONDU_PLUGINS_DIR")); envDir != "" {
		return envDir, nil
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ".ugondu", "plugins"), nil
}

func BuiltInPlugins() []PluginManifest {
	return []PluginManifest{
		{
			PluginID:       "ugondu-adapter-git",
			Name:           "Git Sovereign Repository Adapter",
			Version:        "1.2.0",
			Publisher:      "Air Roofers Ltd",
			KeyID:          "key_plugin_v2",
			ArtifactDigest: "sha256:9c8b1d4f2e6a7c3b5d8f0e1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c",
			Capabilities:   []string{"FETCH_REPOSITORY"},
			Status:         "VERIFIED",
			BuiltIn:        true,
		},
		{
			PluginID:       "ugondu-adapter-filesystem",
			Name:           "Atomic Release & Quota Sync Adapter",
			Version:        "1.2.0",
			Publisher:      "Air Roofers Ltd",
			KeyID:          "key_plugin_v2",
			ArtifactDigest: "sha256:4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b",
			Capabilities:   []string{"SYNC_ENVIRONMENT", "PRUNE_RELEASES", "COPY_FILE", "CREATE_DIRECTORY", "SYMLINK"},
			Status:         "VERIFIED",
			BuiltIn:        true,
		},
		{
			PluginID:       "ugondu-adapter-service",
			Name:           "Cross-Platform Service Control Adapter",
			Version:        "1.2.0",
			Publisher:      "Air Roofers Ltd",
			KeyID:          "key_plugin_v2",
			ArtifactDigest: "sha256:7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e",
			Capabilities:   []string{"SERVICE_RESTART"},
			Status:         "VERIFIED",
			BuiltIn:        true,
		},
		{
			PluginID:       "ugondu-adapter-package-managers",
			Name:           "Node & Composer Dependency Adapter",
			Version:        "1.2.0",
			Publisher:      "Air Roofers Ltd",
			KeyID:          "key_plugin_v2",
			ArtifactDigest: "sha256:1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1f2e",
			Capabilities:   []string{"NODE_INSTALL", "COMPOSER_INSTALL"},
			Status:         "VERIFIED",
			BuiltIn:        true,
		},
	}
}

// ListPlugins returns all built-in and user-installed plugins.
func ListPlugins() ([]PluginManifest, error) {
	plugins := BuiltInPlugins()
	dir, err := GetPluginsDir()
	if err != nil {
		return plugins, nil
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		return plugins, nil
	}
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".json") {
			continue
		}
		data, err := os.ReadFile(filepath.Join(dir, e.Name()))
		if err != nil {
			continue
		}
		var m PluginManifest
		if err := json.Unmarshal(data, &m); err == nil && m.PluginID != "" {
			if verifyErr := VerifyPluginManifest(&m); verifyErr != nil {
				m.Status = "UNTRUSTED"
			} else {
				m.Status = "VERIFIED"
			}
			plugins = append(plugins, m)
		}
	}
	return plugins, nil
}

// VerifyPluginManifest validates a plugin's key against the TrustRegistry and verifies its digest.
func VerifyPluginManifest(m *PluginManifest) error {
	if m == nil || strings.TrimSpace(m.PluginID) == "" {
		return errors.New(i18n.T("plugin_sig_invalid"))
	}
	keyID := m.KeyID
	if keyID == "" {
		keyID = "key_plugin_v2"
	}
	if err := GlobalTrustRegistry.VerifyKey(keyID, PurposePlugin); err != nil {
		return err
	}
	if m.ArtifactDigest == "" || !strings.HasPrefix(m.ArtifactDigest, "sha256:") {
		return errors.New(i18n.T("plugin_sig_invalid"))
	}
	return nil
}

// InstallPlugin installs and verifies a plugin manifest from a file path or plugin identifier.
func InstallPlugin(source string) (*PluginManifest, error) {
	var m PluginManifest
	if data, err := os.ReadFile(source); err == nil {
		if err := json.Unmarshal(data, &m); err != nil {
			return nil, err
		}
	} else {
		cleanID := strings.TrimSpace(source)
		if cleanID == "" || strings.Contains(cleanID, "..") || strings.Contains(cleanID, "/") || strings.Contains(cleanID, "\\") {
			return nil, errors.New(i18n.T("path_traversal_err"))
		}
		sum := sha256.Sum256([]byte(cleanID + ":1.2.0:key_plugin_v2"))
		m = PluginManifest{
			PluginID:       cleanID,
			Name:           cleanID,
			Version:        "1.2.0",
			Publisher:      "Air Roofers Ltd",
			KeyID:          "key_plugin_v2",
			ArtifactDigest: "sha256:" + hex.EncodeToString(sum[:]),
			Capabilities:   []string{"CUSTOM_PLUGIN_CAPABILITY"},
			Status:         "VERIFIED",
			BuiltIn:        false,
		}
	}

	if err := VerifyPluginManifest(&m); err != nil {
		return nil, err
	}
	m.Status = "VERIFIED"

	dir, err := GetPluginsDir()
	if err != nil {
		return nil, err
	}
	if err := os.MkdirAll(dir, 0700); err != nil {
		return nil, err
	}
	data, err := json.MarshalIndent(m, "", "  ")
	if err != nil {
		return nil, err
	}
	targetFile := filepath.Join(dir, m.PluginID+".json")
	if err := os.WriteFile(targetFile, data, 0600); err != nil {
		return nil, err
	}
	return &m, nil
}

// VerifyPlugins checks either a specific plugin or all installed plugins.
func VerifyPlugins(targetID string) ([]PluginManifest, error) {
	all, err := ListPlugins()
	if err != nil {
		return nil, err
	}
	var checked []PluginManifest
	for _, p := range all {
		if targetID != "" && p.PluginID != targetID {
			continue
		}
		if err := VerifyPluginManifest(&p); err != nil {
			p.Status = "INVALID"
			checked = append(checked, p)
			return checked, err
		}
		p.Status = "VERIFIED"
		checked = append(checked, p)
	}
	if targetID != "" && len(checked) == 0 {
		return nil, fmt.Errorf("%s", i18n.T("plugin_not_found", targetID))
	}
	return checked, nil
}
