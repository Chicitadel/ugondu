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
	"auth_missing_envelope": i18n.T("missing_envelope"),
	"auth_invalid_envelope_format": i18n.T("invalid_envelope_format"),
	"auth_successful_close_window": i18n.T("authentication_successful_you_"),

	"state_file_is_corrupt": i18n.T("state_file_is_corrupt"),
	"auth_usage": "Usage: ugondu auth <login|status|logout>",
	"auth_success": i18n.T("auth_success"),
	"failed_to_serialize_execution_state": i18n.T("failed_to_serialize_execution_"),
	"failed_to_load_transaction_state": i18n.T("failed_to_load_transaction_sta"),
	"created_directory": i18n.T("created_directory"),
	"fetched_latest_from": i18n.T("fetched_latest_from"),
	"failed_to_close_temp_state": i18n.T("failed_to_close_temp_state"),
	"signature_verification_failed": i18n.T("signature_verification_failed"),
	"invalid_transactionid_contains_path_separators": i18n.T("invalid_transactionid_contains"),
	"cannot_save_state_execution_state": i18n.T("cannot_save_state_execution_st"),
	"incomplete_language_pack_manifest": i18n.T("incomplete_language_pack_manif"),
	"execution_recipe_has_expired": i18n.T("execution_recipe_has_expired"),
	"failed_to_read_language_pack": i18n.T("failed_to_read_language_pack"),
	"failed_to_marshal_lock_data": i18n.T("failed_to_marshal_lock_data"),
	"composer_failed_n": i18n.T("composer_failed_n"),
	"plan_hash_mismatch_recipe_tampered": i18n.T("plan_hash_mismatch_recipe_tamp"),
	"successfully_executed_in": i18n.T("successfully_executed_in"),
	"failed_to_parse_execution_recipe": i18n.T("failed_to_parse_execution_reci"),
	"failed_to_atomically_promote_symlink": i18n.T("failed_to_atomically_promote_s"),
	"payload_is_required_for_syncenvironment": i18n.T("payload_is_required_for_syncen"),
	"invalid_envelope_format": i18n.T("invalid_envelope_format"),
	"skipped_step_due_to_idempotency": i18n.T("skipped_step_due_to_idempotenc"),
	"auth_not_logged_in": i18n.T("auth_not_logged_in"),
	"public_key_not_found_in": i18n.T("public_key_not_found_in"),
	"failed_to_create_temp_symlink": i18n.T("failed_to_create_temp_symlink"),
	"cannot_reach_governance_server_at": i18n.T("cannot_reach_governance_server"),
	"unable_to_read_transactions_directory": i18n.T("unable_to_read_transactions_di"),
	"atomic_rename_failed_for_state": i18n.T("atomic_rename_failed_for_state"),
	"invalid_steps_format": i18n.T("invalid_steps_format"),
	"service_stoprestart_failed": i18n.T("service_stoprestart_failed"),
	"failed_to_remove_old_release": i18n.T("failed_to_remove_old_release"),
	"failed_to_copy_to_release": i18n.T("failed_to_copy_to_release"),
	"failed_to_parse_pem_block": i18n.T("failed_to_parse_pem_block"),
	"invalid_service_name": i18n.T("invalid_service_name"),
	"err_signature_invalid": i18n.T("err_signature_invalid"),
	"authentication_expired": i18n.T("authentication_expired"),
	"cryptographic_signature_verification_failed": i18n.T("cryptographic_signature_verifi"),
	"cannot_remove_bootstrap_enus": i18n.T("cannot_remove_bootstrap_enus"),
	"failed_to_fetch_public_keys": i18n.T("failed_to_fetch_public_keys"),
	"successfully_executed_composer_in": i18n.T("successfully_executed_composer"),
	"failed_to_resolve_user_home": i18n.T("failed_to_resolve_user_home"),
	"auth_expired": i18n.T("auth_expired"),
	"created_atomic_release_at": i18n.T("created_atomic_release_at"),
	"git_clone_failed": i18n.T("git_clone_failed"),
	"node_install_failed_n": i18n.T("node_install_failed_n"),
	"critical_token_class_missing_from": i18n.T("critical_token_class_missing_f"),
	"copied_to": i18n.T("copied_to"),
	"not_an_ed25519_key": i18n.T("not_an_ed25519_key"),
	"failed_to_create_atomic_symlink": i18n.T("failed_to_create_atomic_symlin"),
	"failed_to_verify_pack": i18n.T("failed_to_verify_pack"),
	"failed_to_sync_temp_state": i18n.T("failed_to_sync_temp_state"),
	"failed_to_parse_keys": i18n.T("failed_to_parse_keys"),
	"restarted_service": i18n.T("restarted_service"),
	"signature_verification_failure": i18n.T("signature_verification_failure"),
	"auth_currently_logged_in": i18n.T("auth_currently_logged_in"),
	"failed_to_parse_keys_from": i18n.T("failed_to_parse_keys_from"),
	"artifact_digest_mismatch_computed_declared": i18n.T("artifact_digest_mismatch_compu"),
	"failed_to_decode_authority_public": i18n.T("failed_to_decode_authority_pub"),
	"failed_to_serialize_deployment_context": i18n.T("failed_to_serialize_deployment"),
	"no_transactions_found_in": i18n.T("no_transactions_found_in"),
	"payload_is_required_for_fetchrepository": i18n.T("payload_is_required_for_fetchr"),
	"authority_key_is_not_ed25519": i18n.T("authority_key_is_not_ed25519"),
	"language_pack_not_found": i18n.T("language_pack_not_found"),
	"not_authenticated": i18n.T("not_authenticated"),
	"failed_to_open_temp_state": i18n.T("failed_to_open_temp_state"),
	"failed_to_get_user_home": i18n.T("failed_to_get_user_home"),
	"created_symlink": i18n.T("created_symlink"),
	"server_rejected_deployment_http": i18n.T("server_rejected_deployment_htt"),
	"state_file_not_found": i18n.T("state_file_not_found"),
	"service_start_failed": i18n.T("service_start_failed"),
	"invalid_repo_url_scheme": i18n.T("invalid_repo_url_scheme"),
	"failed_to_write_temp_state": i18n.T("failed_to_write_temp_state"),
	"failed_to_write_lock_file": i18n.T("failed_to_write_lock_file"),
	"failed_to_compute_state_hash": i18n.T("failed_to_compute_state_hash"),
	"git_pull_failed": i18n.T("git_pull_failed"),
	"unsupported_language_pack_schemaversion": i18n.T("unsupported_language_pack_sche"),
	"language_pack_is_not_installed": i18n.T("language_pack_is_not_installed"),
	"err_missing_public_key": i18n.T("err_missing_public_key"),
	"auth_init": i18n.T("auth_init"),
	"auth_browser_open": "Opening browser to: %s",
	"auth_timeout": i18n.T("authentication_timed_out"),
	"auth_invalid_state": i18n.T("invalid_state_token_received"),
	"unsigned_language_pack": i18n.T("unsigned_language_pack"),
	"failed_to_parse_language_pack": i18n.T("failed_to_parse_language_pack"),
	"auth_logout_success": i18n.T("auth_logout_success"),
	"malformed_signature_base64": i18n.T("malformed_signature_base64"),
	"transaction_is_locked_by_another": i18n.T("transaction_is_locked_by_anoth"),
	"pruned_releases_to_max": i18n.T("pruned_releases_to_max"),
	"invalid_signature": i18n.T("invalid_signature"),
	"failed_to_parse_authority_public": i18n.T("failed_to_parse_authority_publ"),
	"failed_to_acquire_transaction_lock": i18n.T("failed_to_acquire_transaction_"),
	"failed_to_create_transaction_directory": i18n.T("failed_to_create_transaction_d"),
	"unknown_action_in_recipe": i18n.T("unknown_action_in_recipe"),
	"cli_title":                i18n.T("ugondu_universal_delivery_clie"),
	"cli_subtitle":             i18n.T("air_roofers_commercial_deliver"),
	"err_not_repo":             i18n.T("error_must_be_run_inside_a_val"),
	"err_no_command":           i18n.T("error_no_command_provided"),
	"err_unknown_cmd":          "Error: Unknown command '%s'.",
	"did_you_mean":             "Did you mean '%s'?",
	"cmd_usage":                "Usage: ugondu <command>",
	"cmd_deploy_desc":          i18n.T("execute_a_deployment_for_the_c"),
	"cmd_rollback_desc":        i18n.T("rollback_to_a_previous_atomic_"),
	"cmd_plugins_desc":         i18n.T("manage_and_list_available_depl"),
	"cmd_version_desc":         i18n.T("print_the_client_version"),
	"cmd_help_desc":            i18n.T("print_this_comprehensive_help_"),
	"cmd_resume_desc":          i18n.T("resume_a_previously_interrupte"),
	"cmd_status_desc":          i18n.T("inspect_status_of_a_deployment"),
	"cmd_locale_desc":          i18n.T("manage_language_packs_locale_r"),
	"cmd_locale_help":          i18n.T("locale_manage_language_packs_a"),
	"env_vars":                 i18n.T("environment_variables"),
	"env_token":                "UGONDU_TOKEN        - Your commercial license token (ugp_ or uge_ prefix)",
	"env_api_url":              "UGONDU_API_URL      - Override the Governance Server URL",
	"env_target_env":           "UGONDU_TARGET_ENV   - Override target environment (cpanel|directadmin|cloud|kubernetes|baremetal)",
	"env_locale":               "UGONDU_LOCALE       - Active language (en-US|fr-FR|de-DE|es-ES|it-IT|ar-SA)",
	"community_fallback":       "Notice: UGONDU_TOKEN not set. Operating in Community mode.",
	"repo_info":                "Repository : %s\nBranch      : %s\nEnvironment : %s",
	"req_recipe":               i18n.T("requesting_execution_recipe_fr"),
	"recipe_resolved":          "Recipe resolved. TX: %s | Edition: %s | Strategy: %s",
	"exec_failed":              "Execution Failed: %v",
	"dep_complete":             "✔ Deployment Complete.",
	"step_info":                "Step %d/%d: %s",
	"sync_git":                 "Syncing from %s @ %s",
	"sync_files":               "Syncing files using '%s' strategy (Universal OS Engine)",
	"atomic_release":           "Atomic release created at %s",
	"pruning":                  "Pruning releases. Retaining last %d.",
	"prune_skip":               i18n.T("notice_release_pruning_skipped"),
	"upsell_notice":            "💰 UPGRADE REQUIRED: %s",
	"telemetry_warn":           "Warning: Telemetry report failed (non-fatal): %v",
	"telemetry_ok":             "Telemetry reported. Status: %s",
	"prompt_destructive":       "WARNING: Destructive Action. This will wipe existing files in %s. Continue? [y/N]: ",
	"aborting":                 i18n.T("operation_aborted_by_user"),
	"resuming_deployment":      "Resuming deployment for transaction %s...",
	"no_prev_deployment":       i18n.T("no_previous_deployment_found_t"),
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
	"status_lbl_steps":         i18n.T("steps"),
	"status_lbl_no_steps":      i18n.T("no_steps_recorded"),
	"status_lbl_step_item":     "   [%d] %-20s : %s",
	"status_lbl_log_item":      "         > %s",
	"upsell_rollback":          i18n.T("upgrade_to_ugondu_professional"),
	"upsell_plugins":           i18n.T("upgrade_to_ugondu_professional"),
	"strategy_atomic_or_quota": "atomic-or-quota",
	"node_install_running":     "Running Node.js package install (%s) in %s",
	"composer_install_running": "Running PHP Composer %s in %s",
	"warn_prune_failed":        "Warning: prune failed: %v",
	"fatal_tx_success":         "FATAL: Recipe %s has already been successfully executed",
	"step_skipped_done":        i18n.T("skipping_already_completed_ste"),
	"cmd_deploy_help":          i18n.T("deploy_execute_a_deployment_fo"),
	"cmd_resume_help":          i18n.T("resume_resume_a_previously_int"),
	"cmd_status_help":          i18n.T("status_inspect_status_of_a_dep"),
	"cmd_rollback_help":        i18n.T("rollback_rollback_to_a_previou"),
	"cmd_plugins_help":         i18n.T("plugins_manage_and_list_availa"),
	"cmd_version_help":         i18n.T("version_print_the_client_versi"),
	"cmd_help_help":            i18n.T("help_print_this_comprehensive_"),
	"locale_title":             "Ugondu Universal Language Pack & Locale Fabric",
	"locale_current_header":    i18n.T("current_locale_status"),
	"locale_lbl_current":       "  Current Locale : %s (%s)",
	"locale_lbl_source":        "  Source         : %s",
	"locale_lbl_status":        "  Status         : %s",
	"locale_lbl_fallback":      "  Fallback       : %s",
	"locale_lbl_direction":     "  Direction      : %s",
	"locale_lbl_pack_id":       "  Pack ID        : %s",
	"locale_lbl_pack_ver":      "  Pack Version   : %s",
	"locale_lbl_coverage":      "  Coverage       : %.1f%% (%d/%d tokens)",
	"locale_lbl_sig":           "  Signature      : %s",
	"locale_detect_header":     i18n.T("locale_environment_detection"),
	"locale_detect_os":         "  OS Culture / Language : %s",
	"locale_detect_env":        "  Environment Variables : LANG=%s, LC_ALL=%s, LC_MESSAGES=%s",
	"locale_detect_norm":       "  Normalized Candidate  : %s",
	"locale_detect_installed":  i18n.T("installed_language_packs"),
	"locale_detect_recom":      "Recommendation:",
	"locale_detect_recom_use":  "  ugondu locale use %s",
	"locale_detect_recom_install": "  ugondu locale install %s\n  ugondu locale use %s",
	"locale_list_header":       i18n.T("installed_language_packs"),
	"locale_list_empty":        i18n.T("no_external_language_packs_ins"),
	"locale_list_item":         "  %-10s [%s] v%-8s %-20s %-8s %s",
	"locale_avail_header":      i18n.T("available_language_packs"),
	"locale_avail_empty":       i18n.T("no_additional_language_packs_a"),
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
	"locale_doctor_header":     i18n.T("ugondu_locale_fabric_diagnosti"),
	"locale_doctor_core":       i18n.T("core_runtime"),
	"locale_doctor_core_ver":   "  Platform Version  : %s",
	"locale_doctor_schema":     "  Token Schema      : %s",
	"locale_doctor_env":        i18n.T("environment_state"),
	"locale_doctor_user_pref":  i18n.T("user_preference"),
	"locale_doctor_pref_val":   "  Stored Preference : %s",
	"locale_doctor_pref_auto":  "  Auto-Detect Mode  : %t",
	"locale_doctor_active":     i18n.T("active_locale_resolution"),
	"locale_doctor_active_val": "  Effective Locale  : %s",
	"locale_doctor_active_src": "  Effective Source  : %s",
	"locale_doctor_pack":       i18n.T("active_pack_health"),
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
		Publisher:       i18n.T("air_roofers_ltd"),
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
