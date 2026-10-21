/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Scripts / Localization Validation
 * File           : validate-locales.js
 * Version        : 2.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Last Modified  : 2026-10-18
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance:
 * - Corporate Policy Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS
 * - NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

'use strict';

const fs = require('fs');
const path = require('path');

const localeDirs = [
    path.join(__dirname, '..', 'server', 'shared', 'locales')
];
const sourceFile = 'en.json';

function flatten(obj, prefix = '') {
    let result = {};
    for (const key in obj) {
        const val = obj[key];
        const newKey = prefix ? `${prefix}.${key}` : key;
        if (typeof val === 'object' && val !== null) {
            Object.assign(result, flatten(val, newKey));
        } else {
            result[newKey] = val;
        }
    }
    return result;
}

function getPlaceholders(str) {
    if (typeof str !== 'string') return [];
    const matches = str.match(/{{[^}]+}}/g) || [];
    return matches.sort();
}

function block(msg) {
    console.error(`COR BLOCKED: ${msg}`);
    process.exit(1);
}

// Explicit allowlist for proper nouns, symbols, and technical identifiers that do not require translation
const allowedUnchanged = new Set([
    'app.name',
    'company.name',
    'product.brand',
    'brand.name',
    'repair_res_status',
    'cli_divider',
    'status_border',
    'status_divider',
    'status_lbl_log_item',
    'status_lbl_step_item',
    'locale_list_item',
    'locale_avail_item',
    'locale_detect_recom_use',
    'locale_detect_recom_install',
    'strategy_atomic_or_quota',
    'npm_install',
    'npm_ci',
    'composer_install',
    'bearer',
    'uname_a',
    'df_h',
    'free_m',
    'ps_ef',
    'netstat_tuln',
    'enoent',
    'u_bad_name_rw',
    'abcdefgh_2345678',
    'ftpaccts_mysql',
    'carol_dev',
    's_reason',
    'msg_health_status_green',
    'apdlparseerror'
]);

function isTechnicalExempt(key, val) {
    if (allowedUnchanged.has(key)) return true;
    if (typeof val !== 'string') return true;
    if (!/[a-zA-Z]{3,}/.test(val)) return true;
    if (/^(SELECT|INSERT|UPDATE|DELETE)\s+/i.test(val)) return true;
    return false;
}

const fakePrefixPattern = /^\[(?:AR|DE|EN|ES|FR|HI|IT|JA|KO|PT|RU|ZH)(?:-[A-Z]{2,4})?\]\s*/i;

for (const localesDir of localeDirs) {
    if (!fs.existsSync(localesDir)) continue;

    const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));
    if (!files.includes(sourceFile)) {
        block(`Source locale en.json missing in ${localesDir}`);
    }

    const locales = {};
    for (const file of files) {
        try {
            locales[file] = flatten(JSON.parse(fs.readFileSync(path.join(localesDir, file), 'utf8')));
        } catch (e) {
            block(`Malformed JSON in ${file}`);
        }
    }

    const sourceKeys = locales[sourceFile];
    const sourceKeyNames = Object.keys(sourceKeys);
    const optionalNewKeys = new Set([
        'error.cert.missing_volume_id',
        'cert.fargate.cleanup',
        'unimplemented_autonomous_code_'
    ]);

    for (const file of files) {
        if (file === sourceFile) continue;
        const targetKeys = locales[file];
        const targetKeyNames = Object.keys(targetKeys);

        const missing = sourceKeyNames.filter(k => !targetKeyNames.includes(k) && !optionalNewKeys.has(k));
        if (missing.length > 0) block(`Missing keys in ${file}: ${missing.join(', ')}`);

        const extra = targetKeyNames.filter(k => !sourceKeyNames.includes(k));
        if (extra.length > 0) block(`Extra keys in ${file}: ${extra.join(', ')}`);

        for (const k of sourceKeyNames) {
            if (!(k in targetKeys) && optionalNewKeys.has(k)) continue;
            const tgtVal = targetKeys[k];
            const srcVal = sourceKeys[k];

            // Leaf type parity
            if (typeof tgtVal !== typeof srcVal) {
                block(`Type mismatch for key ${k} in ${file}. Expected ${typeof srcVal}, got ${typeof tgtVal}`);
            }

            if (typeof tgtVal === 'string') {
                if (tgtVal === '') block(`Empty string not allowed for key ${k} in ${file}`);
                if (tgtVal === '__UNTRANSLATED__') block(`__UNTRANSLATED__ not allowed for key ${k} in ${file}`);

                // Reject fake [AR], [FR], [DE], etc. prefixes
                if (fakePrefixPattern.test(tgtVal)) {
                    block(`Fake locale prefix not allowed for key ${k} in ${file}`);
                }

                // Untranslated English rejection
                if (tgtVal === srcVal && !isTechnicalExempt(k, srcVal)) {
                    block(`Unchanged English string for key ${k} in ${file}. Must be translated or allowlisted.`);
                }
            }

            const sourceP = getPlaceholders(srcVal);
            const targetP = getPlaceholders(tgtVal);
            if (JSON.stringify(sourceP) !== JSON.stringify(targetP)) {
                block(`Placeholder mismatch for key ${k} in ${file}`);
            }
        }
    }
}

console.log('Localization validation PASS');
