/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Repository Adapter / RFC 8785 Canonicalize CJS Bridge
 * File           : canonicalize-cjs.js
 * Version        : 2.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers Ltd / Ujomor Systems
 * Created Date   : 2026-10-18
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
 * Copyright (c) 2026 Air Roofers Ltd / Ujomor Systems. All Rights Reserved.
 ******************************************************************************/

'use strict';

function canonicalize(object) {
    if (object === null || typeof object !== 'object' || object.toJSON != null) {
        return JSON.stringify(object);
    }
    if (Array.isArray(object)) {
        return '[' + object.map((item) => (item === undefined ? 'null' : canonicalize(item))).join(',') + ']';
    }
    const keys = Object.keys(object).sort();
    const pairs = [];
    for (const key of keys) {
        if (object[key] !== undefined) {
            pairs.push(JSON.stringify(key) + ':' + canonicalize(object[key]));
        }
    }
    return '{' + pairs.join(',') + '}';
}

module.exports = canonicalize;
module.exports.default = canonicalize;
