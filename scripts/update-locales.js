/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Scripts / Localization Updater
 * File           : update-locales.js
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

function block(msg) {
    console.error(`COR BLOCKED: ${msg}`);
    process.exit(1);
}

function parseJSON(file) {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
        block(`Malformed JSON in ${path.basename(file)}`);
    }
}

const optionalNewLeafKeys = new Set([
    'missing_volume_id',
    'cleanup',
    'unimplemented_autonomous_code_',
    'error.cert.missing_volume_id',
    'cert.fargate.cleanup'
]);

function mergeMissing(src, tgt, filePath) {
    let changed = false;
    const sortedTarget = {};
    const keys = Object.keys(src).sort();

    for (const k of keys) {
        if (typeof src[k] === 'object' && src[k] !== null) {
            if (!tgt[k] || typeof tgt[k] !== 'object') {
                tgt[k] = {};
                changed = true;
            }
            const res = mergeMissing(src[k], tgt[k], filePath);
            sortedTarget[k] = tgt[k];
            if (res) changed = true;
        } else {
            if (!(k in tgt)) {
                if (optionalNewLeafKeys.has(k)) {
                    continue;
                }
                block(`Missing translation key '${k}' in ${filePath}. Cannot silently insert English source.`);
            } else {
                sortedTarget[k] = tgt[k]; // Keep existing translation, never overwrite
            }
        }
    }

    // Check for extra keys to ensure deterministic output matching source schema
    for (const k in tgt) {
        if (!(k in src)) {
            block(`Extra translation key '${k}' in ${filePath}. Extra keys are not allowed.`);
        }
    }

    // Mutate original object to preserve reference
    for (const k in tgt) delete tgt[k];
    for (const k in sortedTarget) tgt[k] = sortedTarget[k];

    return changed;
}

for (const localesDir of localeDirs) {
    if (!fs.existsSync(localesDir)) continue;

    const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));
    if (!files.includes(sourceFile)) {
        block(`Source locale en.json missing in ${localesDir}`);
    }

    const sourceObj = parseJSON(path.join(localesDir, sourceFile));

    for (const file of files) {
        if (file === sourceFile) continue;

        const filePath = path.join(localesDir, file);
        const targetObj = parseJSON(filePath);

        if (mergeMissing(sourceObj, targetObj, filePath)) {
            fs.writeFileSync(filePath, JSON.stringify(targetObj, null, 2) + '\n', 'utf8');
        }
    }
}

console.log('Locales updated successfully');
