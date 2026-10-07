/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Shared / Localization Engine
 * File           : i18n.ts
 * Version        : 2.1.0
 * Author         : Ujomor Systems Engineering Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Last Modified  : 2026-09-30
 * Classification : COMMERCIAL | INTERNAL
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
export type LocaleCode = string;
export declare function getLocalesDirectories(): string[];
/**
 * Dynamically loads or reloads all [lang].json dictionary files from governed locales directories.
 * Dropping a new language file (e.g. ja.json) immediately activates the language without code changes.
 * Deleting a language file immediately removes it and falls back to default locale 'en'.
 */
export declare function reloadLocales(): void;
/**
 * Returns all dynamically discovered and active language locales.
 */
export declare function getSupportedLocales(): string[];
/**
 * Checks if a specific language locale is currently available.
 */
export declare function isLocaleSupported(locale: string): boolean;
/**
 * Sets the active global locale if available in the dynamically loaded dictionaries.
 */
export declare function setLocale(locale: string): void;
/**
 * Returns the currently active global locale code.
 */
export declare function getLocale(): string;
/**
 * Tokenized dictionary lookup with [lang] token prefix per Air Roofers Global Localization Standard.
 * Supports printf-style format verbs (%s, %d, %v) and named parameters ({param}).
 *
 * Rules:
 * 1. Resolves token in active locale dictionary.
 * 2. Falls back to base 'en' dictionary if key is missing in active locale.
 * 3. Falls back to token name if missing in all dictionaries (zero crash guarantee).
 * 4. Injects mandatory active language token prefix [lang].
 */
export declare function __t(key: string, ...args: any[]): string;
export declare const t: typeof __t;
//# sourceMappingURL=i18n.d.ts.map
