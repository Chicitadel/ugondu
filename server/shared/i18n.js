"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.t = void 0;
exports.getLocalesDirectories = getLocalesDirectories;
exports.reloadLocales = reloadLocales;
exports.getSupportedLocales = getSupportedLocales;
exports.isLocaleSupported = isLocaleSupported;
exports.setLocale = setLocale;
exports.getLocale = getLocale;
exports.__t = __t;
/** Structured stderr emitter (dependency-free; mirrors the Logger envelope). */
function emitStructured(level, message) {
    if (process.env.NODE_ENV === 'test')
        return;
    process.stderr.write(JSON.stringify({ level, timestamp: new Date().toISOString(), message }) + '\n');
}
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let currentLocale = (process.env.UGONDU_LOCALE || 'en').toLowerCase();
var dictionaries = {};
function getLocalesDirectories() {
    const candidatePaths = [
        process.env.UGONDU_LOCALES_DIR,
        path.resolve(process.cwd(), 'locales'),
        path.resolve(__dirname, '../locales'),
        path.resolve(__dirname, '../../locales'),
        path.resolve(__dirname, '../../../locales'),
        path.resolve(process.cwd(), 'server/shared/locales')
    ].filter(Boolean);
    const dirs = [];
    for (const cand of candidatePaths) {
        try {
            if (fs.existsSync(cand) && fs.statSync(cand).isDirectory()) {
                const canonical = path.resolve(cand);
                if (!dirs.includes(canonical)) {
                    dirs.push(canonical);
                }
            }
        }
        catch {
            // Ignore access errors
        }
    }
    return dirs;
}
/**
 * Flattens nested locale objects into dotted tokens (e.g. { messages: { error: { x: 'y' } } }
 * becomes 'messages.error.x'), so tokenized lookups resolve regardless of file nesting.
 */
function flattenDictionary(source, prefix = '', target = {}) {
    for (const [key, value] of Object.entries(source)) {
        const token = prefix ? `${prefix}.${key}` : key;
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
            flattenDictionary(value, token, target);
        }
        else {
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
function reloadLocales() {
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
                    }
                    catch (err) {
                        emitStructured('ERROR', __t('messages.system.i18n_error_loading_locale_file', { 'filePath': filePath, 'err_message': err.message }));
                    }
                }
            }
        }
        catch {
            // Ignore directory read errors
        }
    }
}
// Initial bootstrap load
reloadLocales();
/**
 * Returns all dynamically discovered and active language locales.
 */
function getSupportedLocales() {
    return Object.keys(dictionaries);
}
/**
 * Checks if a specific language locale is currently available.
 */
function isLocaleSupported(locale) {
    return Boolean(dictionaries[locale.toLowerCase()]);
}
/**
 * Sets the active global locale if available in the dynamically loaded dictionaries.
 */
function setLocale(locale) {
    const normalized = locale.toLowerCase();
    if (dictionaries[normalized]) {
        currentLocale = normalized;
    }
    else {
        emitStructured('WARN', __t('messages.system.i18n_locale_not_found_in_dynamic_directory_re', { 'locale': locale, 'currentLocale': currentLocale }));
    }
}
/**
 * Returns the currently active global locale code.
 */
function getLocale() {
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
function __t(key, ...args) {
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
    }
    else if (args.length > 0) {
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
exports.t = __t;
//# sourceMappingURL=i18n.js.map
