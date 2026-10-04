/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : client/i18n
 * File           : locale.go
 * Version        : 2.2.0
 * Author         : Ujomor Systems Engineering Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Last Modified  : 2026-09-30
 * Classification : ENTERPRISE
 *
 * Governance:
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

// Minimal core bootstrap dictionary (LP-02: only bootstrap/fallback in core)
var bootstrapDict = map[string]string{
	"auth_missing_envelope": "missing envelope",
	"auth_invalid_envelope_format": "invalid envelope format",
	"auth_successful_close_window": "Authentication successful. You may close this window.",

	"state_file_is_corrupt": "State File Is Corrupt",
	"auth_usage": "Usage: ugondu auth <login|status|logout>",
	"auth_success": "Auth Success",
	"failed_to_serialize_execution_state": "Failed To Serialize Execution State",
	"failed_to_load_transaction_state": "Failed To Load Transaction State",
	"created_directory": "Created Directory",
	"fetched_latest_from": "Fetched Latest From",
	"failed_to_close_temp_state": "Failed To Close Temp State",
	"signature_verification_failed": "Signature Verification Failed",
	"invalid_transactionid_contains_path_separators": "Invalid Transactionid Contains Path Separators",
	"cannot_save_state_execution_state": "Cannot Save State Execution State",
	"incomplete_language_pack_manifest": "Incomplete Language Pack Manifest",
	"execution_recipe_has_expired": "Execution Recipe Has Expired",
	"failed_to_read_language_pack": "Failed To Read Language Pack",
	"failed_to_marshal_lock_data": "Failed To Marshal Lock Data",
	"composer_failed_n": "Composer Failed N",
	"plan_hash_mismatch_recipe_tampered": "Plan Hash Mismatch Recipe Tampered",
	"successfully_executed_in": "Successfully Executed In",
	"failed_to_parse_execution_recipe": "Failed To Parse Execution Recipe",
	"failed_to_atomically_promote_symlink": "Failed To Atomically Promote Symlink",
	"payload_is_required_for_syncenvironment": "Payload Is Required For Syncenvironment",
	"invalid_envelope_format": "Invalid Envelope Format",
	"skipped_step_due_to_idempotency": "Skipped Step Due To Idempotency",
	"auth_not_logged_in": "Auth Not Logged In",
	"public_key_not_found_in": "Public Key Not Found In",
	"failed_to_create_temp_symlink": "Failed To Create Temp Symlink",
	"cannot_reach_governance_server_at": "Cannot Reach Governance Server At",
	"unable_to_read_transactions_directory": "Unable To Read Transactions Directory",
	"atomic_rename_failed_for_state": "Atomic Rename Failed For State",
	"invalid_steps_format": "Invalid Steps Format",
	"service_stoprestart_failed": "Service Stoprestart Failed",
	"failed_to_remove_old_release": "Failed To Remove Old Release",
	"failed_to_copy_to_release": "Failed To Copy To Release",
	"failed_to_parse_pem_block": "Failed To Parse Pem Block",
	"invalid_service_name": "Invalid Service Name",
	"err_signature_invalid": "Err Signature Invalid",
	"authentication_expired": "Authentication Expired",
	"cryptographic_signature_verification_failed": "Cryptographic Signature Verification Failed",
	"cannot_remove_bootstrap_enus": "Cannot Remove Bootstrap Enus",
	"failed_to_fetch_public_keys": "Failed To Fetch Public Keys",
	"successfully_executed_composer_in": "Successfully Executed Composer In",
	"failed_to_resolve_user_home": "Failed To Resolve User Home",
	"auth_expired": "Auth Expired",
	"created_atomic_release_at": "Created Atomic Release At",
	"git_clone_failed": "Git Clone Failed",
	"node_install_failed_n": "Node Install Failed N",
	"critical_token_class_missing_from": "Critical Token Class Missing From",
	"copied_to": "Copied To",
	"not_an_ed25519_key": "Not An Ed25519 Key",
	"failed_to_create_atomic_symlink": "Failed To Create Atomic Symlink",
	"failed_to_verify_pack": "Failed To Verify Pack",
	"failed_to_sync_temp_state": "Failed To Sync Temp State",
	"failed_to_parse_keys": "Failed To Parse Keys",
	"restarted_service": "Restarted Service",
	"signature_verification_failure": "Signature Verification Failure",
	"auth_currently_logged_in": "Auth Currently Logged In",
	"failed_to_parse_keys_from": "Failed To Parse Keys From",
	"artifact_digest_mismatch_computed_declared": "Artifact Digest Mismatch Computed Declared",
	"failed_to_decode_authority_public": "Failed To Decode Authority Public",
	"failed_to_serialize_deployment_context": "Failed To Serialize Deployment Context",
	"no_transactions_found_in": "No Transactions Found In",
	"payload_is_required_for_fetchrepository": "Payload Is Required For Fetchrepository",
	"authority_key_is_not_ed25519": "Authority Key Is Not Ed25519",
	"language_pack_not_found": "Language Pack Not Found",
	"not_authenticated": "Not Authenticated",
	"failed_to_open_temp_state": "Failed To Open Temp State",
	"failed_to_get_user_home": "Failed To Get User Home",
	"created_symlink": "Created Symlink",
	"server_rejected_deployment_http": "Server Rejected Deployment Http",
	"state_file_not_found": "State File Not Found",
	"service_start_failed": "Service Start Failed",
	"invalid_repo_url_scheme": "Invalid Repo Url Scheme",
	"failed_to_write_temp_state": "Failed To Write Temp State",
	"failed_to_write_lock_file": "Failed To Write Lock File",
	"failed_to_compute_state_hash": "Failed To Compute State Hash",
	"git_pull_failed": "Git Pull Failed",
	"unsupported_language_pack_schemaversion": "Unsupported Language Pack Schemaversion",
	"language_pack_is_not_installed": "Language Pack Is Not Installed",
	"err_missing_public_key": "Err Missing Public Key",
	"auth_init": "Auth Init",
	"auth_browser_open": "Opening browser to: %s",
	"auth_timeout": "Authentication timed out.",
	"auth_invalid_state": "Invalid state token received.",
	"unsigned_language_pack": "Unsigned Language Pack",
	"failed_to_parse_language_pack": "Failed To Parse Language Pack",
	"auth_logout_success": "Auth Logout Success",
	"malformed_signature_base64": "Malformed Signature Base64",
	"transaction_is_locked_by_another": "Transaction Is Locked By Another",
	"pruned_releases_to_max": "Pruned Releases To Max",
	"invalid_signature": "Invalid Signature",
	"failed_to_parse_authority_public": "Failed To Parse Authority Public",
	"failed_to_acquire_transaction_lock": "Failed To Acquire Transaction Lock",
	"failed_to_create_transaction_directory": "Failed To Create Transaction Directory",
	"unknown_action_in_recipe": "Unknown Action In Recipe",
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
	"cmd_locale_desc":          "Manage language packs, locale resolution, and translations",
	"cmd_locale_help":          "  locale    - Manage language packs and view localization diagnostics",
	"env_vars":                 "Environment Variables:",
	"env_token":                "UGONDU_TOKEN        - Your commercial license token (ugp_ or uge_ prefix)",
	"env_api_url":              "UGONDU_API_URL      - Override the Governance Server URL",
	"env_target_env":           "UGONDU_TARGET_ENV   - Override target environment (cpanel|directadmin|cloud|kubernetes|baremetal)",
	"env_locale":               "UGONDU_LOCALE       - Active language (en-US|fr-FR|de-DE|es-ES|it-IT|ar-SA)",
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
	"warn_persist_recipe":      "Warning: failed to persist transaction recipe: %v",
	"err_no_tx_found":          "No transactions found: %v",
	"err_tx_state_not_found":   "Transaction %s: state file not found.",
	"err_tx_state_corrupt":     "Transaction %s: state file is CORRUPT (quarantined).",
	"err_tx_state_load":        "Error loading state for transaction %s: %v",
	"err_cannot_resume":        "Cannot resume: %v",
	"cli_divider":              "─────────────────────────────────────────────────────────────",
	"status_border":            "════════════════════════════════════════════════════════════",
	"status_divider":           "────────────────────────────────────────────────────────────",
	"status_lbl_tx_id":         " Transaction ID : %s",
	"status_lbl_status":        " Status         : %s",
	"status_lbl_tenant_id":     " Tenant ID      : %s",
	"status_lbl_project_id":    " Project ID     : %s",
	"status_lbl_env_id":        " Environment ID : %s",
	"status_lbl_plan_hash":     " Plan Hash      : %s",
	"status_lbl_policy_hash":   " Policy Hash    : %s",
	"status_lbl_state_hash":    " State Hash     : %s",
	"status_lbl_last_updated":  " Last Updated   : %s",
	"status_lbl_steps":         " Steps:",
	"status_lbl_no_steps":      "   (No steps recorded)",
	"status_lbl_step_item":     "   [%d] %-20s : %s",
	"status_lbl_log_item":      "         > %s",
	"upsell_rollback":          "Upgrade to Ugondu Professional to enable one-click atomic rollbacks.",
	"upsell_plugins":           "Upgrade to Ugondu Professional to remotely manage plugins via CLI.",
	"strategy_atomic_or_quota": "atomic-or-quota",
	"node_install_running":     "Running Node.js package install (%s) in %s",
	"composer_install_running": "Running PHP Composer %s in %s",
	"warn_prune_failed":        "Warning: prune failed: %v",
	"fatal_tx_success":         "FATAL: Recipe %s has already been successfully executed",
	"step_skipped_done":        "Skipping already completed step",
	"cmd_deploy_help":          "  deploy    - Execute a deployment for the current repository",
	"cmd_resume_help":          "  resume    - Resume a previously interrupted deployment",
	"cmd_status_help":          "  status    - Inspect status of a deployment transaction",
	"cmd_rollback_help":        "  rollback  - Rollback to a previous atomic release",
	"cmd_plugins_help":         "  plugins   - Manage and list available deployment plugins",
	"cmd_version_help":         "  version   - Print the client version",
	"cmd_help_help":            "  help      - Print this comprehensive help message",
	"locale_title":             "Ugondu Universal Language Pack & Locale Fabric",
	"locale_current_header":    "Current Locale Status:",
	"locale_lbl_current":       "  Current Locale : %s (%s)",
	"locale_lbl_source":        "  Source         : %s",
	"locale_lbl_status":        "  Status         : %s",
	"locale_lbl_fallback":      "  Fallback       : %s",
	"locale_lbl_direction":     "  Direction      : %s",
	"locale_lbl_pack_id":       "  Pack ID        : %s",
	"locale_lbl_pack_ver":      "  Pack Version   : %s",
	"locale_lbl_coverage":      "  Coverage       : %.1f%% (%d/%d tokens)",
	"locale_lbl_sig":           "  Signature      : %s",
	"locale_detect_header":     "Locale Environment Detection",
	"locale_detect_os":         "  OS Culture / Language : %s",
	"locale_detect_env":        "  Environment Variables : LANG=%s, LC_ALL=%s, LC_MESSAGES=%s",
	"locale_detect_norm":       "  Normalized Candidate  : %s",
	"locale_detect_installed":  "  Installed Language Packs:",
	"locale_detect_recom":      "Recommendation:",
	"locale_detect_recom_use":  "  ugondu locale use %s",
	"locale_detect_recom_install": "  ugondu locale install %s\n  ugondu locale use %s",
	"locale_list_header":       "Installed Language Packs:",
	"locale_list_empty":        "  (No external language packs installed. Operating with core bootstrap en-US)",
	"locale_list_item":         "  %-10s [%s] v%-8s %-20s %-8s %s",
	"locale_avail_header":      "Available Language Packs:",
	"locale_avail_empty":       "  (No additional language packs available in registry)",
	"locale_avail_item":        "  %-10s [%s] v%-8s %-20s %s",
	"locale_use_success":       "Locale '%s' is now active and set as persistent preference.",
	"locale_use_system":        "Persistent preference cleared. Now using system auto-detected locale '%s'.",
	"locale_not_installed":     "Locale '%s' is not installed.",
	"locale_prompt_install":    "Language pack '%s' is available but not installed.\nTo install and activate it, run:\n  ugondu locale install %s\n  ugondu locale use %s",
	"locale_install_success":   "✔ Language pack '%s' (v%s) installed and verified successfully.",
	"locale_install_failed":    "Error installing language pack: %v",
	"locale_remove_success":    "Language pack '%s' removed successfully.",
	"locale_remove_failed":     "Error removing language pack: %v",
	"locale_remove_bootstrap":  "Cannot remove core bootstrap locale '%s'.",
	"locale_verify_header":     "Verifying Language Pack '%s':",
	"locale_verify_pass":       "✔ PASS: Language pack '%s' integrity, signature, and compatibility verified.",
	"locale_verify_fail":       "✗ FAIL: Language pack '%s' verification failed: %v",
	"locale_reset_success":     "Persistent locale preference removed. Automatic OS/environment detection restored.",
	"locale_doctor_header":     "Ugondu Locale Fabric Diagnostics",
	"locale_doctor_core":       "Core Runtime:",
	"locale_doctor_core_ver":   "  Platform Version  : %s",
	"locale_doctor_schema":     "  Token Schema      : %s",
	"locale_doctor_env":        "Environment State:",
	"locale_doctor_user_pref":  "User Preference:",
	"locale_doctor_pref_val":   "  Stored Preference : %s",
	"locale_doctor_pref_auto":  "  Auto-Detect Mode  : %t",
	"locale_doctor_active":     "Active Locale Resolution:",
	"locale_doctor_active_val": "  Effective Locale  : %s",
	"locale_doctor_active_src": "  Effective Source  : %s",
	"locale_doctor_pack":       "Active Pack Health:",
	"locale_doctor_ok":         "✔ All locale subsystems healthy and cryptographically verified.",
	"locale_doctor_warn":       "⚠ Notice: Active locale '%s' has missing tokens or warnings.",
}

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
		Publisher:       "Air Roofers Ltd",
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
