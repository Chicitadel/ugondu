/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : client/cmd
 * File           : locale_cmd.go
 * Version        : 2.2.0
 * Author         : Ujomor Systems Engineering Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Last Modified  : 2026-09-30
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Air Roofers Global Localization Standard (STREAM AA / LP-26 to LP-36)
 * - Dedicated CLI Locale Management
 * - Zero String Hardcoding Law
 *
 * Standards:
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS
 * - NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

package cmd

import (
	"fmt"
	"os"
	"strings"

	"ugondu/client/i18n"
)

// RunLocaleCommand dispatches all `ugondu locale ...` subcommands
func RunLocaleCommand(args []string) {
	subcommand := "current"
	if len(args) > 0 {
		subcommand = args[0]
	}

	switch subcommand {
	case "current":
		handleLocaleCurrent()
	case "detect":
		handleLocaleDetect()
	case "list":
		handleLocaleList()
	case "available":
		handleLocaleAvailable()
	case "use":
		target := ""
		if len(args) > 1 {
			target = args[1]
		}
		handleLocaleUse(target)
	case "install":
		if len(args) < 2 {
			fmt.Println(i18n.T("locale_prompt_install", "<locale>", "<locale>", "<locale>"))
			os.Exit(1)
		}
		handleLocaleInstall(args[1])
	case "remove":
		if len(args) < 2 {
			fmt.Println(i18n.T("locale_not_installed", ""))
			os.Exit(1)
		}
		handleLocaleRemove(args[1])
	case "verify":
		target := i18n.GetLocale()
		if len(args) > 1 {
			target = args[1]
		}
		handleLocaleVerify(target)
	case "reset":
		handleLocaleReset()
	case "doctor":
		handleLocaleDoctor()
	default:
		handleLocaleCurrent()
	}
}

func handleLocaleCurrent() {
	active := i18n.GetActivePack()
	loc := i18n.GetLocale()
	src := i18n.GetLocaleSource()
	dir := i18n.GetDirection()

	fmt.Println(i18n.T("status_border"))
	fmt.Println(i18n.T("locale_title"))
	fmt.Println(i18n.T("status_divider"))
	fmt.Println(i18n.T("locale_current_header"))
	fmt.Println(i18n.T("locale_lbl_current", loc, active.Language))
	fmt.Println(i18n.T("locale_lbl_source", src))
	fmt.Println(i18n.T("locale_lbl_status", "ACTIVE"))
	fmt.Println(i18n.T("locale_lbl_fallback", active.FallbackLocale))
	fmt.Println(i18n.T("locale_lbl_direction", strings.ToUpper(dir)))
	fmt.Println(i18n.T("locale_lbl_pack_id", active.PackId))
	fmt.Println(i18n.T("locale_lbl_pack_ver", active.Version))
	fmt.Println(i18n.T("status_border"))
}

func handleLocaleDetect() {
	info := i18n.DetectEnvironmentLocale()

	fmt.Println(i18n.T("status_border"))
	fmt.Println(i18n.T("locale_detect_header"))
	fmt.Println(i18n.T("status_divider"))
	fmt.Println(i18n.T("locale_detect_os", info.OSLocale))
	fmt.Println(i18n.T("locale_detect_env", info.LangEnv, info.LcAllEnv, info.LcMsgEnv))
	fmt.Println(i18n.T("locale_detect_norm", info.Normalized))
	fmt.Println(i18n.T("status_divider"))
	fmt.Println(i18n.T("locale_detect_recom"))

	installed := i18n.GetInstalledPacks()
	isInstalled := false
	for _, p := range installed {
		if p.Locale == info.Normalized {
			isInstalled = true
			break
		}
	}

	if isInstalled {
		fmt.Println(i18n.T("locale_detect_recom_use", info.Normalized))
	} else {
		fmt.Println(i18n.T("locale_detect_recom_install", info.Normalized, info.Normalized))
	}
	fmt.Println(i18n.T("status_border"))
}

func handleLocaleList() {
	installed := i18n.GetInstalledPacks()
	fmt.Println(i18n.T("status_border"))
	fmt.Println(i18n.T("locale_list_header"))
	fmt.Println(i18n.T("status_divider"))

	if len(installed) == 0 {
		fmt.Println(i18n.T("locale_list_empty"))
	}

	active := i18n.GetLocale()
	for _, p := range installed {
		marker := " "
		if p.Locale == active {
			marker = "*"
		}
		fmt.Println(i18n.T("locale_list_item", p.Locale, marker, p.Version, p.Language, p.Direction, p.Publisher))
	}
	fmt.Println(i18n.T("status_border"))
}

func handleLocaleAvailable() {
	available := i18n.GetAvailablePacks()
	fmt.Println(i18n.T("status_border"))
	fmt.Println(i18n.T("locale_avail_header"))
	fmt.Println(i18n.T("status_divider"))

	if len(available) == 0 {
		fmt.Println(i18n.T("locale_avail_empty"))
	}

	for _, p := range available {
		fmt.Println(i18n.T("locale_avail_item", p.Locale, p.Direction, p.Version, p.Language, p.Publisher))
	}
	fmt.Println(i18n.T("status_border"))
}

func handleLocaleUse(target string) {
	if target == "--system" || target == "" {
		_ = i18n.ClearUserPreference()
		detected := i18n.DetectEnvironmentLocale()
		i18n.SetLocaleWithSource(detected.Normalized, i18n.SourceOSDetection)
		fmt.Println(i18n.T("locale_use_system", detected.Normalized))
		return
	}

	norm := i18n.NormalizeLocale(target)
	installed := i18n.GetInstalledPacks()
	found := false
	for _, p := range installed {
		if p.Locale == norm {
			found = true
			break
		}
	}

	if !found {
		fmt.Println(i18n.T("locale_not_installed", target))
		fmt.Println(i18n.T("locale_prompt_install", target, target, target))
		os.Exit(1)
	}

	_ = i18n.SetUserPreference(norm)
	i18n.SetLocale(norm)
	fmt.Println(i18n.T("locale_use_success", norm))
}

func handleLocaleInstall(target string) {
	pack, err := i18n.InstallPack(target)
	if err != nil {
		fmt.Println(i18n.T("locale_install_failed", err))
		os.Exit(1)
	}
	fmt.Println(i18n.T("locale_install_success", pack.Locale, pack.Version))
}

func handleLocaleRemove(target string) {
	norm := i18n.NormalizeLocale(target)
	if norm == "en-US" {
		fmt.Println(i18n.T("locale_remove_bootstrap", norm))
		os.Exit(1)
	}

	if err := i18n.RemovePack(target); err != nil {
		fmt.Println(i18n.T("locale_remove_failed", err))
		os.Exit(1)
	}
	fmt.Println(i18n.T("locale_remove_success", norm))
}

func handleLocaleVerify(target string) {
	norm := i18n.NormalizeLocale(target)
	fmt.Println(i18n.T("locale_verify_header", norm))

	installed := i18n.GetInstalledPacks()
	var pack *i18n.LanguagePack
	for _, p := range installed {
		if p.Locale == norm {
			pack = p
			break
		}
	}

	if pack == nil {
		fmt.Println(i18n.T("locale_verify_fail", norm, "pack not installed"))
		os.Exit(1)
	}

	if err := pack.ValidateIntegrity("1.2.0"); err != nil {
		fmt.Println(i18n.T("locale_verify_fail", norm, err))
		os.Exit(1)
	}

	fmt.Println(i18n.T("locale_verify_pass", norm))
}

func handleLocaleReset() {
	_ = i18n.ClearUserPreference()
	det := i18n.DetectEnvironmentLocale()
	i18n.SetLocaleWithSource(det.Normalized, i18n.SourceOSDetection)
	fmt.Println(i18n.T("locale_reset_success"))
}

func handleLocaleDoctor() {
	cfg, _ := i18n.LoadUserConfig()
	active := i18n.GetActivePack()
	loc := i18n.GetLocale()
	src := i18n.GetLocaleSource()
	det := i18n.DetectEnvironmentLocale()

	fmt.Println(i18n.T("status_border"))
	fmt.Println(i18n.T("locale_doctor_header"))
	fmt.Println(i18n.T("status_divider"))
	fmt.Println(i18n.T("locale_doctor_core"))
	fmt.Println(i18n.T("locale_doctor_core_ver", "1.2.0"))
	fmt.Println(i18n.T("locale_doctor_schema", "1"))
	fmt.Println(i18n.T("locale_doctor_env"))
	fmt.Println(i18n.T("locale_detect_os", det.OSLocale))
	fmt.Println(i18n.T("locale_detect_env", det.LangEnv, det.LcAllEnv, det.LcMsgEnv))
	fmt.Println(i18n.T("locale_doctor_user_pref"))
	prefVal := "<none>"
	autoVal := true
	if cfg != nil {
		if cfg.Preference != "" {
			prefVal = cfg.Preference
		}
		autoVal = cfg.AutoDetect
	}
	fmt.Println(i18n.T("locale_doctor_pref_val", prefVal))
	fmt.Println(i18n.T("locale_doctor_pref_auto", autoVal))
	fmt.Println(i18n.T("locale_doctor_active"))
	fmt.Println(i18n.T("locale_doctor_active_val", loc))
	fmt.Println(i18n.T("locale_doctor_active_src", src))
	fmt.Println(i18n.T("locale_doctor_pack"))
	fmt.Println(i18n.T("locale_lbl_pack_id", active.PackId))
	fmt.Println(i18n.T("locale_lbl_pack_ver", active.Version))
	fmt.Println(i18n.T("locale_lbl_direction", strings.ToUpper(i18n.GetDirection())))
	fmt.Println(i18n.T("status_divider"))
	fmt.Println(i18n.T("locale_doctor_ok"))
	fmt.Println(i18n.T("status_border"))
}
