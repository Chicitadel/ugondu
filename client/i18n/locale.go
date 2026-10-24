/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : client/i18n
 * File           : locale.go
 * Version        : 2.2.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Last Modified  : 2026-10-18
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Corporate Policy Governed
 * - Air Roofers Global Localization Standard (STREAM AA / LP-02 & LP-07)
 * - Zero String Hardcoding Law (Canonical Token Dictionaries)
 * - Supply-Chain Signed Language Pack Fabric
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
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
)

var (
	currentLocale  = "en-US"
	currentSource  = SourceBootstrapFallback
	localeMutex    sync.RWMutex
	installedPacks = map[string]*LanguagePack{}
	availablePacks = map[string]*LanguagePack{}
)

func init() {
	ReloadAllPacks()
	loc, src := ResolveEffectiveLocale("")
	currentLocale = loc
	currentSource = src
}

func getPackSearchDirs() []string {
	dirs := []string{"packs", filepath.Join(".", "packs")}
	if userPacks, err := GetUserPacksDir(); err == nil {
		dirs = append(dirs, userPacks)
	}
	if envDir := os.Getenv("UGONDU_PACKS_DIR"); envDir != "" {
		dirs = append(dirs, envDir)
	}
	return dirs
}

// ReloadAllPacks scans available and installed pack directories
func ReloadAllPacks() {
	localeMutex.Lock()
	defer localeMutex.Unlock()

	installedPacks = make(map[string]*LanguagePack)
	availablePacks = make(map[string]*LanguagePack)

	// Built-in bootstrap pack representation
	installedPacks["en-US"] = &LanguagePack{
		PackId:          "ugondu-core-bootstrap",
		Locale:          "en-US",
		Language:        "English",
		Region:          "US",
		Version:         "1.2.0",
		PlatformVersion: "1.2.0",
		MinCoreVersion:  "1.0.0",
		MaxCoreVersion:  "2.x",
		SchemaVersion:   "1",
		Publisher:       "air_roofers_ltd",
		FallbackLocale:  "en-US",
		Direction:       "ltr",
		Tokens:          bootstrapDict,
	}

	searchDirs := getPackSearchDirs()
	userDir, _ := GetUserPacksDir()

	for _, dir := range searchDirs {
		entries, err := os.ReadDir(dir)
		if err != nil {
			continue
		}
		for _, e := range entries {
			if e.IsDir() || (!strings.HasSuffix(e.Name(), ".upl.json") && !strings.HasSuffix(e.Name(), ".json")) {
				continue
			}
			packPath := filepath.Join(dir, e.Name())
			pack, err := LoadPackFromFile(packPath, "1.2.0")
			if err != nil {
				continue
			}

			norm := NormalizeLocale(pack.Locale)
			availablePacks[norm] = pack

			// If in user packs dir or root packs dir, mark as installed
			if dir == userDir || strings.HasPrefix(dir, "packs") {
				installedPacks[norm] = pack
			}
		}
	}
}

// ReloadLocales reloads packs (alias for drop-in compatibility)
func ReloadLocales() {
	ReloadAllPacks()
}

// GetSupportedLocales returns list of supported locales
func GetSupportedLocales() []string {
	localeMutex.RLock()
	defer localeMutex.RUnlock()
	res := make([]string, 0, len(installedPacks))
	for loc := range installedPacks {
		res = append(res, loc)
	}
	sort.Strings(res)
	return res
}

// SetLocale sets active language and records source
func SetLocale(loc string) {
	localeMutex.Lock()
	defer localeMutex.Unlock()
	normalized := NormalizeLocale(loc)
	currentLocale = normalized
	currentSource = SourceUserPreference
}

// SetLocaleWithSource sets active language with explicit precedence source
func SetLocaleWithSource(loc string, src string) {
	localeMutex.Lock()
	defer localeMutex.Unlock()
	currentLocale = NormalizeLocale(loc)
	currentSource = src
}

func GetLocale() string {
	localeMutex.RLock()
	defer localeMutex.RUnlock()
	return currentLocale
}

func GetLocaleSource() string {
	localeMutex.RLock()
	defer localeMutex.RUnlock()
	return currentSource
}

func GetDirection() string {
	localeMutex.RLock()
	defer localeMutex.RUnlock()
	if pack, exists := installedPacks[currentLocale]; exists && pack.Direction != "" {
		return strings.ToLower(pack.Direction)
	}
	return "ltr"
}

func GetActivePack() *LanguagePack {
	localeMutex.RLock()
	defer localeMutex.RUnlock()
	if p, ok := installedPacks[currentLocale]; ok {
		return p
	}
	return installedPacks["en-US"]
}

func GetInstalledPacks() []*LanguagePack {
	localeMutex.RLock()
	defer localeMutex.RUnlock()
	packs := make([]*LanguagePack, 0, len(installedPacks))
	for _, p := range installedPacks {
		packs = append(packs, p)
	}
	sort.Slice(packs, func(i, j int) bool { return packs[i].Locale < packs[j].Locale })
	return packs
}

func GetAvailablePacks() []*LanguagePack {
	localeMutex.RLock()
	defer localeMutex.RUnlock()
	packs := make([]*LanguagePack, 0, len(availablePacks))
	for _, p := range availablePacks {
		packs = append(packs, p)
	}
	sort.Slice(packs, func(i, j int) bool { return packs[i].Locale < packs[j].Locale })
	return packs
}

// InstallPack installs a language pack from a file or locale identifier
func InstallPack(source string) (*LanguagePack, error) {
	var packPath string
	if _, err := os.Stat(source); err == nil {
		packPath = source
	} else {
		// Look up in available packs
		norm := NormalizeLocale(source)
		found := false
		for _, dir := range getPackSearchDirs() {
			candidate := filepath.Join(dir, fmt.Sprintf("ugondu-lang-%s.upl.json", norm))
			if _, err := os.Stat(candidate); err == nil {
				packPath = candidate
				found = true
				break
			}
		}
		if !found {
			return nil, fmt.Errorf(T("language_pack_not_found"), source)
		}
	}

	pack, err := LoadPackFromFile(packPath, "1.2.0")
	if err != nil {
		return nil, fmt.Errorf(T("failed_to_verify_pack"), err)
	}

	userDir, err := GetUserPacksDir()
	if err != nil {
		return nil, err
	}
	if err := os.MkdirAll(userDir, 0700); err != nil {
		return nil, err
	}

	targetPath := filepath.Join(userDir, fmt.Sprintf("%s.upl.json", pack.PackId))
	data, _ := json.MarshalIndent(pack, "", "  ")
	if err := os.WriteFile(targetPath, data, 0600); err != nil {
		return nil, err
	}

	ReloadAllPacks()
	return pack, nil
}

// RemovePack uninstalls a language pack
func RemovePack(locale string) error {
	norm := NormalizeLocale(locale)
	if norm == "en-US" {
		return errors.New(T("cannot_remove_bootstrap_enus"))
	}

	userDir, err := GetUserPacksDir()
	if err != nil {
		return err
	}

	entries, _ := os.ReadDir(userDir)
	removed := false
	for _, e := range entries {
		if strings.Contains(e.Name(), norm) {
			_ = os.Remove(filepath.Join(userDir, e.Name()))
			removed = true
		}
	}

	if !removed {
		return fmt.Errorf(T("language_pack_is_not_installed"), locale)
	}

	ReloadAllPacks()
	return nil
}

// T resolves a token and formats it with [lang] prefix following LP-12 fallback policy
func T(key string, args ...interface{}) string {
	localeMutex.RLock()
	loc := currentLocale
	var template string
	found := false

	// 1. Look in active pack
	if pack, exists := installedPacks[loc]; exists && pack.Tokens != nil {
		if val, ok := pack.Tokens[key]; ok {
			template = val
			found = true
		}
	}

	// 2. Look in fallback pack (en-US pack)
	if !found {
		if pack, exists := installedPacks["en-US"]; exists && pack.Tokens != nil {
			if val, ok := pack.Tokens[key]; ok {
				template = val
				found = true
			}
		}
	}

	// 3. Look in core bootstrap dictionary
	if !found {
		if val, ok := bootstrapDict[key]; ok {
			template = val
			found = true
		}
	}

	// 4. Fallback to raw key
	if !found {
		template = key
	}
	localeMutex.RUnlock()

	formatted := template
	if len(args) > 0 && strings.Contains(template, "%") {
		formatted = fmt.Sprintf(template, args...)
	}

	return fmt.Sprintf("[%s] %s", loc, formatted)
}
