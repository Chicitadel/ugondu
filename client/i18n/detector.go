/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : client/i18n
 * File           : detector.go
 * Version        : 2.2.0
 * Author         : Ujomor Systems Engineering Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Last Modified  : 2026-09-30
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Air Roofers Global Localization Standard (STREAM AA / LP-29)
 * - Deterministic OS/Environment Locale Detection
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
	"os"
	"os/exec"
	"runtime"
	"strings"
)

// DetectedLocaleInfo encapsulates the environment inspection results
type DetectedLocaleInfo struct {
	OSLocale   string `json:"osLocale"`
	LangEnv    string `json:"langEnv"`
	LcAllEnv   string `json:"lcAllEnv"`
	LcMsgEnv   string `json:"lcMsgEnv"`
	Normalized string `json:"normalized"`
}

// NormalizeLocale standardizes BCP 47 and POSIX locale codes (e.g., "fr_FR.UTF-8" -> "fr-FR", "fr" -> "fr-FR")
func NormalizeLocale(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "en-US"
	}

	// Strip encoding suffixes (e.g., .UTF-8, .utf8)
	if idx := strings.Index(raw, "."); idx != -1 {
		raw = raw[:idx]
	}
	// Strip modifier suffixes (e.g., @euro)
	if idx := strings.Index(raw, "@"); idx != -1 {
		raw = raw[:idx]
	}

	raw = strings.ReplaceAll(raw, "_", "-")
	parts := strings.Split(raw, "-")

	if len(parts) == 1 {
		switch strings.ToLower(parts[0]) {
		case "en":
			return "en-US"
		case "fr":
			return "fr-FR"
		case "de":
			return "de-DE"
		case "es":
			return "es-ES"
		case "it":
			return "it-IT"
		case "ar":
			return "ar-SA"
		case "ja":
			return "ja-JP"
		case "pt":
			return "pt-BR"
		default:
			return strings.ToLower(parts[0])
		}
	}

	if len(parts) >= 2 {
		return strings.ToLower(parts[0]) + "-" + strings.ToUpper(parts[1])
	}

	return raw
}

// DetectEnvironmentLocale inspects the host OS culture and environment variables
func DetectEnvironmentLocale() DetectedLocaleInfo {
	info := DetectedLocaleInfo{
		LangEnv:  os.Getenv("LANG"),
		LcAllEnv: os.Getenv("LC_ALL"),
		LcMsgEnv: os.Getenv("LC_MESSAGES"),
	}

	candidate := ""

	// 1. Highest priority POSIX environment variables
	if info.LcAllEnv != "" {
		candidate = info.LcAllEnv
	} else if info.LcMsgEnv != "" {
		candidate = info.LcMsgEnv
	} else if info.LangEnv != "" {
		candidate = info.LangEnv
	}

	// 2. Windows specific OS inspection if POSIX env not set
	if candidate == "" && runtime.GOOS == "windows" {
		cmd := exec.Command("powershell", "-NoProfile", "-NonInteractive", "-Command", "[System.Globalization.CultureInfo]::CurrentUICulture.Name")
		out, err := cmd.Output()
		if err == nil {
			candidate = strings.TrimSpace(string(out))
			info.OSLocale = candidate
		}
	}

	// 3. Linux/macOS command fallback
	if candidate == "" && (runtime.GOOS == "linux" || runtime.GOOS == "darwin") {
		cmd := exec.Command("locale")
		out, err := cmd.Output()
		if err == nil {
			for _, line := range strings.Split(string(out), "\n") {
				if strings.HasPrefix(line, "LANG=") {
					val := strings.Trim(strings.TrimPrefix(line, "LANG="), "\"")
					candidate = val
					info.OSLocale = val
					break
				}
			}
		}
	}

	if info.OSLocale == "" {
		if candidate != "" {
			info.OSLocale = candidate
		} else {
			info.OSLocale = "en-US"
		}
	}

	info.Normalized = NormalizeLocale(candidate)
	if info.Normalized == "" {
		info.Normalized = "en-US"
	}

	return info
}
