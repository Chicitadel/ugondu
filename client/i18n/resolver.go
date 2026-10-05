/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : client/i18n
 * File           : resolver.go
 * Version        : 2.2.0
 * Author         : Ujomor Systems Engineering Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Last Modified  : 2026-09-30
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Air Roofers Global Localization Standard (STREAM AA / LP-03 & LP-30)
 * - 8-Tier Locale Resolution Precedence Engine
 * - Zero String Hardcoding
 *
 * Standards:
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS
 * - NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

package i18n

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
)

// Resolution sources per LP-03
const (
	SourceCliFlag           = i18n.T("cli_locale_flag")
	SourceEnvVar            = "UGONDU_LOCALE environment variable"
	SourceUserPreference     = i18n.T("persistent_user_preference")
	SourceTenantPolicy      = i18n.T("tenant_organization_policy")
	SourceProjectPolicy     = i18n.T("project_policy")
	SourceOSDetection       = "OS / environment detection"
	SourceBootstrapFallback = i18n.T("core_bootstrap_fallback")
)

// UserLocaleConfig represents persistent configuration stored in ~/.ugondu/config.json
type UserLocaleConfig struct {
	Preference string `json:"preference,omitempty"`
	AutoDetect bool   `json:"autoDetect"`
	Fallback   string `json:"fallback,omitempty"`
}

type GlobalUgonduConfig struct {
	Locale UserLocaleConfig `json:"locale"`
}

func getConfigFilePath() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ".ugondu", "config.json"), nil
}

// LoadUserConfig reads ~/.ugondu/config.json
func LoadUserConfig() (*UserLocaleConfig, error) {
	path, err := getConfigFilePath()
	if err != nil {
		return nil, err
	}

	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return &UserLocaleConfig{AutoDetect: true, Fallback: "en-US"}, nil
		}
		return nil, err
	}

	var root GlobalUgonduConfig
	if err := json.Unmarshal(data, &root); err != nil {
		return &UserLocaleConfig{AutoDetect: true, Fallback: "en-US"}, nil
	}

	if root.Locale.Fallback == "" {
		root.Locale.Fallback = "en-US"
	}
	return &root.Locale, nil
}

// SaveUserConfig atomically writes user locale preference to ~/.ugondu/config.json
func SaveUserConfig(cfg *UserLocaleConfig) error {
	path, err := getConfigFilePath()
	if err != nil {
		return err
	}

	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0700); err != nil {
		return err
	}

	var root GlobalUgonduConfig
	if data, err := os.ReadFile(path); err == nil {
		_ = json.Unmarshal(data, &root)
	}

	root.Locale = *cfg
	encoded, err := json.MarshalIndent(root, "", "  ")
	if err != nil {
		return err
	}

	tmpPath := path + ".tmp"
	if err := os.WriteFile(tmpPath, encoded, 0600); err != nil {
		return err
	}

	_ = os.Remove(path)
	return os.Rename(tmpPath, path)
}

// SetUserPreference saves persistent user locale choice
func SetUserPreference(locale string) error {
	normalized := NormalizeLocale(locale)
	cfg, err := LoadUserConfig()
	if err != nil {
		cfg = &UserLocaleConfig{}
	}
	cfg.Preference = normalized
	cfg.AutoDetect = false
	cfg.Fallback = "en-US"
	return SaveUserConfig(cfg)
}

// ClearUserPreference clears user preference and restores auto-detection mode
func ClearUserPreference() error {
	cfg, err := LoadUserConfig()
	if err != nil {
		cfg = &UserLocaleConfig{}
	}
	cfg.Preference = ""
	cfg.AutoDetect = true
	cfg.Fallback = "en-US"
	return SaveUserConfig(cfg)
}

// ResolveEffectiveLocale executes the strict 8-tier precedence hierarchy
func ResolveEffectiveLocale(cliFlag string) (locale string, source string) {
	// Tier 1: Explicit CLI flag
	if strings.TrimSpace(cliFlag) != "" {
		return NormalizeLocale(cliFlag), SourceCliFlag
	}

	// Tier 2: Environment variable UGONDU_LOCALE
	if envVal := os.Getenv("UGONDU_LOCALE"); strings.TrimSpace(envVal) != "" {
		return NormalizeLocale(envVal), SourceEnvVar
	}

	// Tier 3: Persistent user preference
	cfg, _ := LoadUserConfig()
	if cfg != nil && !cfg.AutoDetect && strings.TrimSpace(cfg.Preference) != "" {
		return NormalizeLocale(cfg.Preference), SourceUserPreference
	}

	// Tier 4: Tenant policy
	if tenantLoc := os.Getenv("UGONDU_TENANT_LOCALE"); strings.TrimSpace(tenantLoc) != "" {
		return NormalizeLocale(tenantLoc), SourceTenantPolicy
	}

	// Tier 5: Project policy
	if projLoc := os.Getenv("UGONDU_PROJECT_LOCALE"); strings.TrimSpace(projLoc) != "" {
		return NormalizeLocale(projLoc), SourceProjectPolicy
	}

	// Tier 6: OS and environment auto-detection
	det := DetectEnvironmentLocale()
	if det.Normalized != "" {
		return det.Normalized, SourceOSDetection
	}

	// Tier 7: Bootstrap fallback
	return "en-US", SourceBootstrapFallback
}
