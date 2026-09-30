/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : client/i18n
 * File           : locale.go
 * Version        : 2.1.0
 * Author         : Ujomor Systems Engineering Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Last Modified  : 2026-09-30
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Air Roofers Global Localization Standard
 * - Zero String Hardcoding Law (Tokenized Dictionaries)
 * - Dynamic [lang] Drop-in Locale Architecture
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
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
)

var (
	currentLocale = "en"
	localeMutex   sync.RWMutex
	dynamicDict   = map[string]map[string]string{}
)

// Embedded baseline dictionaries (always guarantees zero-dependency runtime)
var embeddedDict = map[string]map[string]string{
	"en": {
		"cli_title":                "Ugondu Universal Delivery Client v1.2.0",
		"cli_subtitle":             "Air Roofers - Commercial Delivery Platform",
		"err_not_repo":             "Error: Must be run inside a valid git repository.",
		"err_no_command":           "Error: No command provided.",
		"err_unknown_cmd":          "Error: Unknown command '%s'.",
		"did_you_mean":             "Did you mean '%s'?",
		"cmd_usage":                "Usage: ugondu <command>",
		"cmd_deploy_desc":          "Execute a deployment for the current repository",
		"cmd_rollback_desc":        "Rollback to a previous atomic release",
		"cmd_plugins_desc":         "Manage and list available deployment plugins",
		"cmd_version_desc":         "Print the client version",
		"cmd_help_desc":            "Print this comprehensive help message",
		"cmd_resume_desc":          "Resume a previously interrupted deployment",
		"cmd_status_desc":          "Inspect status of a deployment transaction",
		"env_vars":                 "Environment Variables:",
		"env_token":                "UGONDU_TOKEN        - Your commercial license token (ugp_ or uge_ prefix)",
		"env_api_url":              "UGONDU_API_URL      - Override the Governance Server URL",
		"env_target_env":           "UGONDU_TARGET_ENV   - Override target environment (cpanel|directadmin|cloud|kubernetes|baremetal)",
		"env_locale":               "UGONDU_LOCALE       - Active language (en|fr|de|es|it)",
		"community_fallback":       "Notice: UGONDU_TOKEN not set. Operating in Community mode.",
		"repo_info":                "Repository : %s\nBranch      : %s\nEnvironment : %s",
		"req_recipe":               "Requesting execution recipe from Ugondu Governance Server...",
		"recipe_resolved":          "Recipe resolved. TX: %s | Edition: %s | Strategy: %s",
		"exec_failed":              "Execution Failed: %v",
		"dep_complete":             "✔ Deployment Complete.",
		"step_info":                "Step %d/%d: %s",
		"sync_git":                 "Syncing from %s @ %s",
		"sync_files":               "Syncing files using '%s' strategy (Universal OS Engine)",
		"atomic_release":           "Atomic release created at %s",
		"pruning":                  "Pruning releases. Retaining last %d.",
		"prune_skip":               "Notice: Release pruning skipped (no old releases to remove).",
		"upsell_notice":            "💰 UPGRADE REQUIRED: %s",
		"telemetry_warn":           "Warning: Telemetry report failed (non-fatal): %v",
		"telemetry_ok":             "Telemetry reported. Status: %s",
		"prompt_destructive":       "WARNING: Destructive Action. This will wipe existing files in %s. Continue? [y/N]: ",
		"aborting":                 "Operation aborted by user.",
		"resuming_deployment":      "Resuming deployment for transaction %s...",
		"no_prev_deployment":       "No previous deployment found to resume.",
		"resume_parse_fail":        "Failed to parse previous recipe: %v",
		"step_skipped_idempotent":  "Skipping already completed step %d (%s) due to idempotency",
		"unknown_action_error":     "Unknown action in recipe: %s",
		"persistence_failure_error": "State persistence failure: %v",
		"locked_error":             "Transaction is currently locked by another process: %v",
		"status_tx_header":         "Transaction Status: %s",
		"status_step_line":           "  Step %d: [%s] %s",
		"warn_persist_recipe":        "Warning: failed to persist transaction recipe: %v",
		"err_no_tx_found":            "No transactions found: %v",
		"err_tx_state_not_found":     "Transaction %s: state file not found.",
		"err_tx_state_corrupt":       "Transaction %s: state file is CORRUPT (quarantined).",
		"err_tx_state_load":          "Error loading state for transaction %s: %v",
		"err_cannot_resume":          "Cannot resume: %v",
		"cli_divider":                "─────────────────────────────────────────────────────────────",
		"status_border":              "════════════════════════════════════════════════════════════",
		"status_divider":             "────────────────────────────────────────────────────────────",
		"status_lbl_tx_id":           " Transaction ID : %s",
		"status_lbl_status":          " Status         : %s",
		"status_lbl_tenant_id":       " Tenant ID      : %s",
		"status_lbl_project_id":      " Project ID     : %s",
		"status_lbl_env_id":          " Environment ID : %s",
		"status_lbl_plan_hash":       " Plan Hash      : %s",
		"status_lbl_policy_hash":     " Policy Hash    : %s",
		"status_lbl_state_hash":      " State Hash     : %s",
		"status_lbl_last_updated":    " Last Updated   : %s",
		"status_lbl_steps":           " Steps:",
		"status_lbl_no_steps":        "   (No steps recorded)",
		"status_lbl_step_item":       "   [%d] %-20s : %s",
		"status_lbl_log_item":        "         > %s",
		"upsell_rollback":            "Upgrade to Ugondu Professional to enable one-click atomic rollbacks.",
		"upsell_plugins":             "Upgrade to Ugondu Professional to remotely manage plugins via CLI.",
		"strategy_atomic_or_quota":   "atomic-or-quota",
		"node_install_running":       "Running Node.js package install (%s) in %s",
		"composer_install_running":   "Running PHP Composer %s in %s",
		"warn_prune_failed":          "Warning: prune failed: %v",
		"fatal_tx_success":           "FATAL: Recipe %s has already been successfully executed",
		"step_skipped_done":          "Skipping already completed step",
		"cmd_deploy_help":            "  deploy    - Execute a deployment for the current repository",
		"cmd_resume_help":            "  resume    - Resume a previously interrupted deployment",
		"cmd_status_help":            "  status    - Inspect status of a deployment transaction",
		"cmd_rollback_help":          "  rollback  - Rollback to a previous atomic release",
		"cmd_plugins_help":           "  plugins   - Manage and list available deployment plugins",
		"cmd_version_help":           "  version   - Print the client version",
		"cmd_help_help":              "  help      - Print this comprehensive help message",
	},
}

func getCandidateDirectories() []string {
	var dirs []string
	if envDir := os.Getenv("UGONDU_LOCALES_DIR"); envDir != "" {
		dirs = append(dirs, envDir)
	}

	dirs = append(dirs,
		"locales",
		filepath.Join(".", "locales"),
		filepath.Join("..", "locales"),
		filepath.Join("..", "..", "locales"),
		filepath.Join("server", "shared", "locales"),
	)

	if home, err := os.UserHomeDir(); err == nil {
		dirs = append(dirs, filepath.Join(home, ".ugondu", "locales"))
	}

	return dirs
}

// ReloadLocales dynamically scans filesystem directories and loads all [lang].json drop-in files.
// Dropping a new translation (e.g. ja.json) into ~/.ugondu/locales/ or ./locales/ activates it without code changes.
func ReloadLocales() {
	localeMutex.Lock()
	defer localeMutex.Unlock()

	dynamicDict = map[string]map[string]string{}

	candidateDirs := getCandidateDirectories()
	for _, dir := range candidateDirs {
		entries, err := os.ReadDir(dir)
		if err != nil {
			continue
		}

		for _, entry := range entries {
			if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".json") {
				continue
			}

			langCode := strings.ToLower(strings.TrimSuffix(entry.Name(), ".json"))
			filePath := filepath.Join(dir, entry.Name())

			data, err := os.ReadFile(filePath)
			if err != nil {
				continue
			}

			var tokens map[string]string
			if err := json.Unmarshal(data, &tokens); err != nil {
				continue
			}

			if _, exists := dynamicDict[langCode]; !exists {
				dynamicDict[langCode] = map[string]string{}
			}

			for k, v := range tokens {
				dynamicDict[langCode][k] = v
			}
		}
	}
}

func init() {
	ReloadLocales()

	if loc := os.Getenv("UGONDU_LOCALE"); loc != "" {
		SetLocale(loc)
	}
}

// SetLocale sets the active language if supported (or defaults to en)
func SetLocale(loc string) {
	localeMutex.Lock()
	defer localeMutex.Unlock()

	loc = strings.ToLower(strings.TrimSpace(loc))
	if _, ok := dynamicDict[loc]; ok {
		currentLocale = loc
		return
	}
	if _, ok := embeddedDict[loc]; ok {
		currentLocale = loc
		return
	}
	currentLocale = "en"
}

// GetLocale returns the currently active locale code
func GetLocale() string {
	localeMutex.RLock()
	defer localeMutex.RUnlock()
	return currentLocale
}

// GetSupportedLocales dynamically returns a list of all active locale codes
func GetSupportedLocales() []string {
	localeMutex.RLock()
	defer localeMutex.RUnlock()

	locMap := map[string]bool{}
	for k := range embeddedDict {
		locMap[k] = true
	}
	for k := range dynamicDict {
		locMap[k] = true
	}

	var locales []string
	for k := range locMap {
		locales = append(locales, k)
	}
	sort.Strings(locales)
	return locales
}

// T translates a token key and injects the active language token prefix [lang].
// Rules per Air Roofers Global Localization Standard:
// 1. Zero hardcoding: every message is resolved via token key.
// 2. Looks in dynamic external dictionary for active locale.
// 3. Falls back to embedded dictionary for active locale.
// 4. Falls back to dynamic/embedded 'en' dictionary.
// 5. Falls back to key name (zero crash guarantee).
// 6. Injects token prefix [lang].
func T(key string, args ...interface{}) string {
	localeMutex.RLock()
	loc := currentLocale

	var template string
	found := false

	// 1. Check dynamic dictionary for current locale
	if d, ok := dynamicDict[loc]; ok {
		if val, ok := d[key]; ok {
			template = val
			found = true
		}
	}

	// 2. Check embedded dictionary for current locale
	if !found {
		if d, ok := embeddedDict[loc]; ok {
			if val, ok := d[key]; ok {
				template = val
				found = true
			}
		}
	}

	// 3. Fallback to English dynamic dictionary
	if !found {
		if d, ok := dynamicDict["en"]; ok {
			if val, ok := d[key]; ok {
				template = val
				found = true
			}
		}
	}

	// 4. Fallback to English embedded dictionary
	if !found {
		if d, ok := embeddedDict["en"]; ok {
			if val, ok := d[key]; ok {
				template = val
				found = true
			}
		}
	}

	// 5. Fallback to raw key
	if !found {
		template = key
	}
	localeMutex.RUnlock()

	formatted := template
	if len(args) > 0 {
		if strings.Contains(template, "%") {
			formatted = fmt.Sprintf(template, args...)
		}
	}

	return fmt.Sprintf("[%s] %s", loc, formatted)
}
