/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Plugin / ugondu-plugin-node
 * File           : index.js
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-29
 * Last Modified  : 2026-09-29
 * Classification : COMMERCIAL | INTERNAL
 *
 * Governance:
 * - Security Reviewed
 * - Architecture Controlled
 * - Modularization Enforced
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

'use strict';

// [en] Node.js Build & Dependency Resolution Plugin for Ugondu
// [en] Injected into the execution recipe as sandboxed steps by the Plugin Manager.

const payload = (() => {
    try {
        return JSON.parse(process.argv[2] || '{}');
    } catch {
        return {};
    }
})();

const packageManager = payload.packageManager || 'npm';
const lockfile = payload.lockfile || 'package-lock.json';

const steps = [
    {
        action: 'NODE_INSTALL',
        payload: {
            packageManager,
            lockfile,
            workingDirectory: payload.workingDirectory || '.',
            production: payload.production === true,
            timeoutMs: payload.timeoutMs || 120000
        }
    }
];

process.stdout.write(JSON.stringify(steps));
