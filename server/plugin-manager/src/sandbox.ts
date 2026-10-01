/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Plugin Manager / Sandbox
 * File           : sandbox.ts
 * Version        : 1.0.0
 * Author         : Ignatus Chika UJOMOR <Chicitadel@users.noreply.github.com>
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-29
 * Last Modified  : 2026-09-30
 * Classification : COMMERCIAL | INTERNAL
 *
 * Governance:
 * - Enterprise Security Architecture
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS
 * - NIST
 *
 * Signatures:
 * - Architecture Authority
 * - Security Authority
 * - Governance Authority
 * - Deployment Authority
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

import { execFile } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs';
import { __t } from '@ugondu/shared';

const execFileAsync = util.promisify(execFile);

// Strict closed typed-action registry. Arbitrary shell execution is explicitly prohibited to enforce zero-trust isolation.
const ALLOWED_ACTIONS = new Set([
    'FETCH_REPOSITORY',
    'SYNC_ENVIRONMENT',
    'PRUNE_RELEASES',
    'UPSELL_NOTICE',
    'NODE_INSTALL',
    'COMPOSER_INSTALL',
    'COPY_FILE',
    'CREATE_DIRECTORY',
    'SYMLINK',
    'SERVICE_RESTART'
]);

// Maximum allowed stdout capture (64KB) to prevent resource exhaustion attacks
const MAX_STDOUT_BYTES = 64 * 1024;

export async function executePluginSandbox(pluginPath: string, payload: any): Promise<any[]> {
    const scriptPath = path.join(pluginPath, 'index.js');
    
    if (!fs.existsSync(scriptPath)) {
        throw new Error(__t('err_plugin_entrypoint_not_found'));
    }

    try {
        // [Security Isolation] - Execute untrusted plugins inside a hardened container sandbox
        const { stdout } = await execFileAsync('docker', [
            'run',
            '--rm',
            '--init', // process-tree termination
            '--read-only',
            '--network=none', // no host network
            '--memory=128m',
            '--cpus=0.5',
            '--user=10001:10001',
            '--cap-drop=ALL',
            '--security-opt=no-new-privileges',
            '--security-opt=seccomp=default', // seccomp profile
            '--pids-limit=64',
            '--tmpfs', '/tmp:rw,noexec,nosuid,size=32m',
            '-v', `${pluginPath}:/plugin:ro`, // no Docker socket, read-only plugin dir
            'node:20-alpine',
            'node', '/plugin/index.js', JSON.stringify(payload || {})
        ], {
            encoding: 'utf-8',
            timeout: 5000,
            maxBuffer: MAX_STDOUT_BYTES
        });

        if (Buffer.byteLength(stdout, 'utf-8') > MAX_STDOUT_BYTES) {
            throw new Error(`Plugin stdout exceeded maximum allowed limit of ${MAX_STDOUT_BYTES} bytes`);
        }

        const steps = JSON.parse(stdout);
        
        if (!Array.isArray(steps)) {
            throw new Error('Plugin did not return an array of steps');
        }
        
        for (const step of steps) {
            if (!ALLOWED_ACTIONS.has(step.action)) {
                throw new Error(__t('err_plugin_action_rejected'));
            }
        }
        
        return steps;
    } catch (err: any) {
        if (err.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER' || (err.message && err.message.includes('maxBuffer'))) {
            throw new Error(`Sandbox execution failed: Plugin stdout exceeded maximum limit of ${MAX_STDOUT_BYTES} bytes (resource exhaustion prevention)`);
        }
        throw new Error(`Sandbox execution failed: ${err.message}`);
    }
}
