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
	"auth_missing_envelope": "missing_envelope",
	"auth_invalid_envelope_format": "invalid_envelope_format",
	"auth_successful_close_window": "authentication_successful_you_",

	"state_file_is_corrupt": "state_file_is_corrupt",
	"auth_usage": "auth_usage",
	"auth_success": "auth_success",
	"failed_to_serialize_execution_state": "failed_to_serialize_execution_",
	"failed_to_load_transaction_state": "failed_to_load_transaction_sta",
	"created_directory": "created_directory",
	"fetched_latest_from": "fetched_latest_from",
	"failed_to_close_temp_state": "failed_to_close_temp_state",
	"signature_verification_failed": "signature_verification_failed",
	"invalid_transactionid_contains_path_separators": "invalid_transactionid_contains",
	"cannot_save_state_execution_state": "cannot_save_state_execution_st",
	"incomplete_language_pack_manifest": "incomplete_language_pack_manif",
	"execution_recipe_has_expired": "execution_recipe_has_expired",
	"failed_to_read_language_pack": "failed_to_read_language_pack",
	"failed_to_marshal_lock_data": "failed_to_marshal_lock_data",
	"composer_failed_n": "composer_failed_n",
	"plan_hash_mismatch_recipe_tampered": "plan_hash_mismatch_recipe_tamp",
	"successfully_executed_in": "successfully_executed_in",
	"failed_to_parse_execution_recipe": "failed_to_parse_execution_reci",
	"failed_to_atomically_promote_symlink": "failed_to_atomically_promote_s",
	"payload_is_required_for_syncenvironment": "payload_is_required_for_syncen",
	"invalid_envelope_format": "invalid_envelope_format",
	"skipped_step_due_to_idempotency": "skipped_step_due_to_idempotenc",
	"auth_not_logged_in": "auth_not_logged_in",
	"public_key_not_found_in": "public_key_not_found_in",
	"failed_to_create_temp_symlink": "failed_to_create_temp_symlink",
	"cannot_reach_governance_server_at": "cannot_reach_governance_server",
	"unable_to_read_transactions_directory": "unable_to_read_transactions_di",
	"atomic_rename_failed_for_state": "atomic_rename_failed_for_state",
	"invalid_steps_format": "invalid_steps_format",
	"service_stoprestart_failed": "service_stoprestart_failed",
	"failed_to_remove_old_release": "failed_to_remove_old_release",
	"failed_to_copy_to_release": "failed_to_copy_to_release",
	"failed_to_parse_pem_block": "failed_to_parse_pem_block",
	"invalid_service_name": "invalid_service_name",
	"err_signature_invalid": "err_signature_invalid",
	"authentication_expired": "authentication_expired",
	"cryptographic_signature_verification_failed": "cryptographic_signature_verifi",
	"cannot_remove_bootstrap_enus": "cannot_remove_bootstrap_enus",
	"failed_to_fetch_public_keys": "failed_to_fetch_public_keys",
	"successfully_executed_composer_in": "successfully_executed_composer",
	"failed_to_resolve_user_home": "failed_to_resolve_user_home",
	"auth_expired": "auth_expired",
	"created_atomic_release_at": "created_atomic_release_at",
	"git_clone_failed": "git_clone_failed",
	"node_install_failed_n": "node_install_failed_n",
	"critical_token_class_missing_from": "critical_token_class_missing_f",
	"copied_to": "copied_to",
	"not_an_ed25519_key": "not_an_ed25519_key",
	"failed_to_create_atomic_symlink": "failed_to_create_atomic_symlin",
	"failed_to_verify_pack": "failed_to_verify_pack",
	"failed_to_sync_temp_state": "failed_to_sync_temp_state",
	"failed_to_parse_keys": "failed_to_parse_keys",
	"restarted_service": "restarted_service",
	"signature_verification_failure": "signature_verification_failure",
	"auth_currently_logged_in": "auth_currently_logged_in",
	"failed_to_parse_keys_from": "failed_to_parse_keys_from",
	"artifact_digest_mismatch_computed_declared": "artifact_digest_mismatch_compu",
	"failed_to_decode_authority_public": "failed_to_decode_authority_pub",
	"failed_to_serialize_deployment_context": "failed_to_serialize_deployment",
	"no_transactions_found_in": "no_transactions_found_in",
	"payload_is_required_for_fetchrepository": "payload_is_required_for_fetchr",
	"authority_key_is_not_ed25519": "authority_key_is_not_ed25519",
	"language_pack_not_found": "language_pack_not_found",
	"not_authenticated": "not_authenticated",
	"failed_to_open_temp_state": "failed_to_open_temp_state",
	"failed_to_get_user_home": "failed_to_get_user_home",
	"created_symlink": "created_symlink",
	"server_rejected_deployment_http": "server_rejected_deployment_htt",
	"state_file_not_found": "state_file_not_found",
	"service_start_failed": "service_start_failed",
	"invalid_repo_url_scheme": "invalid_repo_url_scheme",
	"failed_to_write_temp_state": "failed_to_write_temp_state",
	"failed_to_write_lock_file": "failed_to_write_lock_file",
	"failed_to_compute_state_hash": "failed_to_compute_state_hash",
	"git_pull_failed": "git_pull_failed",
	"unsupported_language_pack_schemaversion": "unsupported_language_pack_sche",
	"language_pack_is_not_installed": "language_pack_is_not_installed",
	"err_missing_public_key": "err_missing_public_key",
	"auth_init": "auth_init",
	"auth_browser_open": "auth_browser_open",
	"auth_timeout": "authentication_timed_out",
	"auth_invalid_state": "invalid_state_token_received",
	"unsigned_language_pack": "unsigned_language_pack",
	"failed_to_parse_language_pack": "failed_to_parse_language_pack",
	"auth_logout_success": "auth_logout_success",
	"malformed_signature_base64": "malformed_signature_base64",
	"transaction_is_locked_by_another": "transaction_is_locked_by_anoth",
	"pruned_releases_to_max": "pruned_releases_to_max",
	"invalid_signature": "invalid_signature",
	"failed_to_parse_authority_public": "failed_to_parse_authority_publ",
	"failed_to_acquire_transaction_lock": "failed_to_acquire_transaction_",
	"failed_to_create_transaction_directory": "failed_to_create_transaction_d",
	"unknown_action_in_recipe": "unknown_action_in_recipe",
	"cli_title":                "ugondu_universal_delivery_clie",
	"cli_subtitle":             "air_roofers_commercial_deliver",
	"err_not_repo":             "error_must_be_run_inside_a_val",
	"err_no_command":           "error_no_command_provided",
	"err_unknown_cmd": "err_unknown_cmd",
	"did_you_mean": "did_you_mean",
	"cmd_usage": "cmd_usage",
	"cmd_deploy_desc":          "execute_a_deployment_for_the_c",
	"cmd_rollback_desc":        "rollback_to_a_previous_atomic_",
	"cmd_plugins_desc":         "manage_and_list_available_depl",
	"cmd_version_desc":         "print_the_client_version",
	"cmd_help_desc":            "print_this_comprehensive_help_",
	"cmd_resume_desc":          "resume_a_previously_interrupte",
	"cmd_status_desc":          "inspect_status_of_a_deployment",
	"cmd_locale_desc":          "manage_language_packs_locale_r",
	"cmd_locale_help":          "locale_manage_language_packs_a",
	"env_vars":                 "environment_variables",
	"env_token": "env_token",
	"env_api_url": "env_api_url",
	"env_target_env": "env_target_env",
	"env_locale": "env_locale",
	"community_fallback": "community_fallback",
	"repo_info": "repo_info",
	"req_recipe":               "requesting_execution_recipe_fr",
	"recipe_resolved": "recipe_resolved",
	"exec_failed": "exec_failed",
	"dep_complete": "dep_complete",
	"step_info": "step_info",
	"sync_git": "sync_git",
	"sync_files": "sync_files",
	"atomic_release": "atomic_release",
	"pruning": "pruning",
	"prune_skip":               "notice_release_pruning_skipped",
	"upsell_notice": "upsell_notice",
	"telemetry_warn": "telemetry_warn",
	"telemetry_ok": "telemetry_ok",
	"prompt_destructive": "prompt_destructive",
	"aborting":                 "operation_aborted_by_user",
	"resuming_deployment": "resuming_deployment",
	"no_prev_deployment":       "no_previous_deployment_found_t",
	"resume_parse_fail": "resume_parse_fail",
	"step_skipped_idempotent": "step_skipped_idempotent",
	"unknown_action_error": "unknown_action_error",
	"persistence_failure_error": "persistence_failure_error",
	"locked_error": "locked_error",
	"warn_persist_recipe": "warn_persist_recipe",
	"err_no_tx_found": "err_no_tx_found",
	"err_tx_state_not_found": "err_tx_state_not_found",
	"err_tx_state_corrupt": "err_tx_state_corrupt",
	"err_tx_state_load": "err_tx_state_load",
	"err_cannot_resume": "err_cannot_resume",
	"cli_divider":              "─────────────────────────────────────────────────────────────",
	"status_border":            "════════════════════════════════════════════════════════════",
	"status_divider":           "────────────────────────────────────────────────────────────",
	"status_lbl_tx_id": "status_lbl_tx_id",
	"status_lbl_status": "status_lbl_status",
	"status_lbl_tenant_id": "status_lbl_tenant_id",
	"status_lbl_project_id": "status_lbl_project_id",
	"status_lbl_env_id": "status_lbl_env_id",
	"status_lbl_plan_hash": "status_lbl_plan_hash",
	"status_lbl_policy_hash": "status_lbl_policy_hash",
	"status_lbl_state_hash": "status_lbl_state_hash",
	"status_lbl_last_updated": "status_lbl_last_updated",
	"status_lbl_steps":         "steps",
	"status_lbl_no_steps":      "no_steps_recorded",
	"status_lbl_step_item": "status_lbl_step_item",
	"status_lbl_log_item": "status_lbl_log_item",
	"upsell_rollback":          "upgrade_to_ugondu_professional",
	"upsell_plugins":           "upgrade_to_ugondu_professional",
	"strategy_atomic_or_quota": "atomic-or-quota",
	"node_install_running": "node_install_running",
	"composer_install_running": "composer_install_running",
	"warn_prune_failed": "warn_prune_failed",
	"fatal_tx_success": "fatal_tx_success",
	"step_skipped_done":        "skipping_already_completed_ste",
	"cmd_deploy_help":          "deploy_execute_a_deployment_fo",
	"cmd_resume_help":          "resume_resume_a_previously_int",
	"cmd_status_help":          "status_inspect_status_of_a_dep",
	"cmd_rollback_help":        "rollback_rollback_to_a_previou",
	"cmd_plugins_help":         "plugins_manage_and_list_availa",
	"cmd_version_help":         "version_print_the_client_versi",
	"cmd_help_help":            "help_print_this_comprehensive_",
	"locale_title": "locale_title",
	"locale_current_header":    "current_locale_status",
	"locale_lbl_current": "locale_lbl_current",
	"locale_lbl_source": "locale_lbl_source",
	"locale_lbl_status": "locale_lbl_status",
	"locale_lbl_fallback": "locale_lbl_fallback",
	"locale_lbl_direction": "locale_lbl_direction",
	"locale_lbl_pack_id": "locale_lbl_pack_id",
	"locale_lbl_pack_ver": "locale_lbl_pack_ver",
	"locale_lbl_coverage": "locale_lbl_coverage",
	"locale_lbl_sig": "locale_lbl_sig",
	"locale_detect_header":     "locale_environment_detection",
	"locale_detect_os": "locale_detect_os",
	"locale_detect_env": "locale_detect_env",
	"locale_detect_norm": "locale_detect_norm",
	"locale_detect_installed":  "installed_language_packs",
	"locale_detect_recom":      "Recommendation:",
	"locale_detect_recom_use": "locale_detect_recom_use",
	"locale_detect_recom_install": "locale_detect_recom_install",
	"locale_list_header":       "installed_language_packs",
	"locale_list_empty":        "no_external_language_packs_ins",
	"locale_list_item": "locale_list_item",
	"locale_avail_header":      "available_language_packs",
	"locale_avail_empty":       "no_additional_language_packs_a",
	"locale_avail_item": "locale_avail_item",
	"locale_use_success": "locale_use_success",
	"locale_use_system": "locale_use_system",
	"locale_not_installed": "locale_not_installed",
	"locale_prompt_install": "locale_prompt_install",
	"locale_install_success": "locale_install_success",
	"locale_install_failed": "locale_install_failed",
	"locale_remove_success": "locale_remove_success",
	"locale_remove_failed": "locale_remove_failed",
	"locale_remove_bootstrap": "locale_remove_bootstrap",
	"locale_verify_header": "locale_verify_header",
	"locale_verify_pass": "locale_verify_pass",
	"locale_verify_fail": "locale_verify_fail",
	"locale_reset_success": "locale_reset_success",
	"locale_doctor_header":     "ugondu_locale_fabric_diagnosti",
	"locale_doctor_core":       "core_runtime",
	"locale_doctor_core_ver": "locale_doctor_core_ver",
	"locale_doctor_schema": "locale_doctor_schema",
	"locale_doctor_env":        "environment_state",
	"locale_doctor_user_pref":  "user_preference",
	"locale_doctor_pref_val": "locale_doctor_pref_val",
	"locale_doctor_pref_auto": "locale_doctor_pref_auto",
	"locale_doctor_active":     "active_locale_resolution",
	"locale_doctor_active_val": "locale_doctor_active_val",
	"locale_doctor_active_src": "locale_doctor_active_src",
	"locale_doctor_pack":       "active_pack_health",
	"locale_doctor_ok": "locale_doctor_ok",
	"locale_doctor_warn": "locale_doctor_warn",
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
