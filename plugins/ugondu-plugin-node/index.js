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
const buildCommand = payload.buildCommand || 'build';
const installFlags = payload.installFlags || '--frozen-lockfile';

// [en] Resolve the correct install command per package manager
const installCmd = (() => {
    switch (packageManager) {
        case 'yarn': return `yarn install ${installFlags}`;
        case 'pnpm': return `pnpm install ${installFlags}`;
        case 'bun': return `bun install`;
        default: return `npm ci`;
    }
})();

// [en] Resolve the correct build command per package manager
const buildCmd = (() => {
    switch (packageManager) {
        case 'yarn': return `yarn run ${buildCommand}`;
        case 'pnpm': return `pnpm run ${buildCommand}`;
        case 'bun': return `bun run ${buildCommand}`;
        default: return `npm run ${buildCommand}`;
    }
})();

// [en] Emit injected steps back to the Plugin Manager sandbox executor
const steps = [
    {
        action: 'SHELL_EXEC',
        payload: {
            command: installCmd,
            description: '[en] Install Node.js dependencies via ' + packageManager
        }
    },
    {
        action: 'SHELL_EXEC',
        payload: {
            command: buildCmd,
            description: '[en] Build Node.js application artifacts'
        }
    }
];

process.stdout.write(JSON.stringify(steps));
