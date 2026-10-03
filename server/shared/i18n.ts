import { Logger } from '../../shared/logger';
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


import * as fs from 'fs';
import * as path from 'path';

export type LocaleCode = string;

let currentLocale: LocaleCode = (process.env.UGONDU_LOCALE || 'en').toLowerCase();
const dictionaries: Record<string, Record<string, string>> = {};

export function getLocalesDirectories(): string[] {
    const candidatePaths = [
        process.env.UGONDU_LOCALES_DIR,
        path.resolve(process.cwd(), 'locales'),
        path.resolve(__dirname, '../locales'),
        path.resolve(__dirname, '../../locales'),
        path.resolve(__dirname, '../../../locales'),
        path.resolve(process.cwd(), 'server/shared/locales')
    ].filter(Boolean) as string[];

    const dirs: string[] = [];
    for (const cand of candidatePaths) {
        try {
            if (fs.existsSync(cand) && fs.statSync(cand).isDirectory()) {
                const canonical = path.resolve(cand);
                if (!dirs.includes(canonical)) {
                    dirs.push(canonical);
                }
            }
        } catch {
            // Ignore access errors
        }
    }

    return dirs;
}

/**
 * Flattens nested locale objects into dotted tokens (e.g. { messages: { error: { x: 'y' } } }
 * becomes 'messages.error.x'), so tokenized lookups resolve regardless of file nesting.
 */
function flattenDictionary(source: Record<string, unknown>, prefix = '', target: Record<string, string> = {}): Record<string, string> {
    for (const [key, value] of Object.entries(source)) {
        const token = prefix ? `${prefix}.${key}` : key;
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
            flattenDictionary(value as Record<string, unknown>, token, target);
        } else {
            target[token] = String(value);
        }
    }
    return target;
}

/**
 * Dynamically loads or reloads all [lang].json dictionary files from governed locales directories.
 * Dropping a new language file (e.g. ja.json) immediately activates the language without code changes.
 * Deleting a language file immediately removes it and falls back to default locale 'en'.
 */
export function reloadLocales(): void {
    const dirs = getLocalesDirectories();
    
    // Clear in-memory dictionary
    for (const key of Object.keys(dictionaries)) {
        delete dictionaries[key];
    }

    for (const dir of dirs) {
        try {
            const files = fs.readdirSync(dir);
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const langCode = path.basename(file, '.json').toLowerCase();
                    const filePath = path.join(dir, file);
                    try {
                        const raw = fs.readFileSync(filePath, 'utf-8');
                        const parsed = JSON.parse(raw);
                        if (!dictionaries[langCode]) {
                            dictionaries[langCode] = {};
                        }
                        Object.assign(dictionaries[langCode], flattenDictionary(parsed));
                    } catch (err: any) {
                        Logger.error(__t('messages.system.i18n_error_loading_locale_file', { 'filePath': filePath, 'err_message': err.message }));
                    }
                }
            }
        } catch {
            // Ignore directory read errors
        }
    }
}

// Initial bootstrap load
reloadLocales();

/**
 * Returns all dynamically discovered and active language locales.
 */
export function getSupportedLocales(): string[] {
    return Object.keys(dictionaries);
}

/**
 * Checks if a specific language locale is currently available.
 */
export function isLocaleSupported(locale: string): boolean {
    return Boolean(dictionaries[locale.toLowerCase()]);
}

/**
 * Sets the active global locale if available in the dynamically loaded dictionaries.
 */
export function setLocale(locale: string): void {
    const normalized = locale.toLowerCase();
    if (dictionaries[normalized]) {
        currentLocale = normalized;
    } else {
        Logger.warn(__t('messages.system.i18n_locale_not_found_in_dynamic_directory_re', { 'locale': locale, 'currentLocale': currentLocale }));
    }
}

/**
 * Returns the currently active global locale code.
 */
export function getLocale(): string {
    return currentLocale;
}

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
export function __t(key: string, ...args: any[]): string {
    const dict = dictionaries[currentLocale] || {};
    const fallbackDict = dictionaries['en'] || {};

    let template = dict[key];
    if (template === undefined) {
        template = fallbackDict[key];
    }
    if (template === undefined) {
        template = key;
    }

    let formatted = template;

    // Support object parameters: {paramName}
    if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null && !Array.isArray(args[0])) {
        const params = args[0];
        formatted = formatted.replace(/\{(\w+)\}/g, (_, varName) => {
            return params[varName] !== undefined ? String(params[varName]) : `{${varName}}`;
        });
    } else if (args.length > 0) {
        // Support positional format verbs: %s, %d, %v
        let i = 0;
        formatted = formatted.replace(/%[sdv]/g, () => {
            if (i < args.length) {
                return String(args[i++]);
            }
            return '';
        });
    }

    return `[${currentLocale}] ${formatted}`;
}

export const t = __t;
