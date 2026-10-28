/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Plugin Manager / Sandbox
 * File           : sandbox.ts
 * Version        : 1.1.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-29
 * Last Modified  : 2026-10-18
 * Classification : COMMERCIAL | INTERNAL
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

import './preload';
import { execFile } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { __t } from '@ugondu/shared';

(globalThis as any).__t = __t;

const execFileAsync = util.promisify(execFile);

// Strict closed typed-action registry. Arbitrary shell execution is explicitly prohibited to enforce zero-trust isolation.
export const ALLOWED_ACTIONS = new Set<string>([
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

export const ALLOWED_CAPABILITIES = new Set<string>([
    'pre-sync',
    'post-sync',
    'pre-deploy',
    'post-deploy',
    'rollback',
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
export const MAX_STDOUT_BYTES = 64 * 1024;
export const MAX_PAYLOAD_BYTES = 32 * 1024;
export const DEFAULT_SANDBOX_TIMEOUT_MS = 30000;

const SECRET_ENV_PATTERN = /(SECRET|TOKEN|KEY|PASSWORD|PASSWD|CREDENTIAL|PRIVATE|AUTH|AWS_|AZURE_|GCP_|UGONDU_|DATABASE_URL|CONN_STR)/i;
const SAFE_ENV_ALLOWLIST = ['PATH', 'SYSTEMROOT', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP'];

export interface SandboxExecutionOptions {
    basePluginsDir?: string;
    timeoutMs?: number;
    maxBufferBytes?: number;
    preferDocker?: boolean;
}

/**
 * Strips all host environment secrets and returns a minimal, isolated environment
 * suitable for untrusted plugin child process execution.
 */
export function buildSanitizedSandboxEnv(hostEnv: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
    const cleanEnv: NodeJS.ProcessEnv = {
        NODE_ENV: 'production',
        LANG: 'en_US.UTF-8',
        LC_ALL: 'en_US.UTF-8',
        TZ: 'UTC',
        UGONDU_SANDBOX_ISOLATED: '1'
    };

    for (const safeKey of SAFE_ENV_ALLOWLIST) {
        const val = hostEnv[safeKey];
        if (typeof val === 'string' && !SECRET_ENV_PATTERN.test(safeKey)) {
            cleanEnv[safeKey] = val;
        }
    }

    // Defensive sweep to ensure zero secret keys ever exist in cleanEnv
    for (const key of Object.keys(cleanEnv)) {
        if (key !== 'UGONDU_SANDBOX_ISOLATED' && SECRET_ENV_PATTERN.test(key)) {
            delete cleanEnv[key];
        }
    }

    return cleanEnv;
}

/**
 * Validates that the plugin path and entrypoint do not contain path traversal
 * or symbolic link escapes out of the canonical plugin boundary.
 */
export function validatePluginSandboxPath(pluginPath: string, basePluginsDir?: string): { pluginRealPath: string; scriptRealPath: string } {
    if (!pluginPath || typeof pluginPath !== 'string' || pluginPath.includes('\0')) {
        throw new Error(__t('messages.error.path_traversal_detected'));
    }

    const resolvedPluginPath = path.resolve(pluginPath);

    if (basePluginsDir) {
        const resolvedBase = path.resolve(basePluginsDir);
        const rel = path.relative(resolvedBase, resolvedPluginPath);
        if (rel.startsWith('..') || path.isAbsolute(rel) || rel === '') {
            throw new Error(__t('messages.error.path_traversal_detected'));
        }
    }

    if (!fs.existsSync(resolvedPluginPath)) {
        throw new Error(__t('err_plugin_entrypoint_not_found'));
    }

    const dirLstat = fs.lstatSync(resolvedPluginPath);
    if (dirLstat.isSymbolicLink() || !dirLstat.isDirectory()) {
        throw new Error(__t('messages.error.path_traversal_detected'));
    }

    const pluginRealPath = fs.realpathSync(resolvedPluginPath);
    if (basePluginsDir && fs.existsSync(basePluginsDir)) {
        const baseRealPath = fs.realpathSync(path.resolve(basePluginsDir));
        const realRel = path.relative(baseRealPath, pluginRealPath);
        if (realRel.startsWith('..') || path.isAbsolute(realRel) || realRel === '') {
            throw new Error(__t('messages.error.path_traversal_detected'));
        }
    }

    const scriptCandidate = path.join(pluginRealPath, 'index.js');
    if (!fs.existsSync(scriptCandidate)) {
        throw new Error(__t('err_plugin_entrypoint_not_found'));
    }

    const scriptLstat = fs.lstatSync(scriptCandidate);
    if (scriptLstat.isSymbolicLink() || !scriptLstat.isFile()) {
        throw new Error(__t('messages.error.path_traversal_detected'));
    }

    const scriptRealPath = fs.realpathSync(scriptCandidate);
    if (path.dirname(scriptRealPath) !== pluginRealPath) {
        throw new Error(__t('messages.error.path_traversal_detected'));
    }

    return { pluginRealPath, scriptRealPath };
}

/**
 * Validates plugin manifest capabilities and returns any manifest-level action restrictions.
 */
export function validatePluginManifestCapabilities(pluginRealPath: string): { allowedActions: Set<string>; capabilities: string[] } {
    const manifestCandidate = path.join(pluginRealPath, 'manifest.json');
    if (!fs.existsSync(manifestCandidate)) {
        return { allowedActions: ALLOWED_ACTIONS, capabilities: [] };
    }

    const manifestLstat = fs.lstatSync(manifestCandidate);
    if (manifestLstat.isSymbolicLink()) {
        throw new Error(__t('messages.error.path_traversal_detected'));
    }

    const manifest = JSON.parse(fs.readFileSync(manifestCandidate, 'utf-8'));
    if (!manifest || typeof manifest !== 'object' || !manifest.name || !manifest.version) {
        throw new Error(__t('messages.error.manifest_schema_invalid'));
    }

    const capabilities: string[] = [];
    if (Array.isArray(manifest.hooks)) {
        for (const h of manifest.hooks) {
            if (typeof h !== 'string' || !ALLOWED_CAPABILITIES.has(h)) {
                throw new Error(__t('ui.responses.forbidden_capability_requested'));
            }
            capabilities.push(h);
        }
    }

    if (Array.isArray(manifest.capabilities)) {
        for (const cap of manifest.capabilities) {
            if (typeof cap !== 'string' || !ALLOWED_CAPABILITIES.has(cap)) {
                throw new Error(__t('ui.responses.forbidden_capability_requested'));
            }
            if (!capabilities.includes(cap)) {
                capabilities.push(cap);
            }
        }
    }

    let allowedActions = ALLOWED_ACTIONS;
    if (Array.isArray(manifest.allowedActions)) {
        for (const act of manifest.allowedActions) {
            if (typeof act !== 'string' || !ALLOWED_ACTIONS.has(act)) {
                throw new Error(__t('err_plugin_action_rejected'));
            }
        }
        allowedActions = new Set<string>(manifest.allowedActions);
    }

    return { allowedActions, capabilities };
}

function computeDirectorySnapshotHash(pluginRealPath: string): string {
    const hash = crypto.createHash('sha256');
    const files = fs.readdirSync(pluginRealPath).sort();
    for (const file of files) {
        const fullPath = path.join(pluginRealPath, file);
        const stat = fs.lstatSync(fullPath);
        if (stat.isSymbolicLink()) {
            throw new Error(__t('messages.error.path_traversal_detected'));
        }
        if (stat.isFile()) {
            hash.update(file);
            hash.update(fs.readFileSync(fullPath));
        }
    }
    return hash.digest('hex');
}

async function runViaDockerSandbox(
    pluginRealPath: string,
    serializedPayload: string,
    sanitizedEnv: NodeJS.ProcessEnv,
    timeoutMs: number,
    maxBufferBytes: number
): Promise<string> {
    const { stdout } = await execFileAsync('docker', [
        'run',
        '--rm',
        '--init',
        '--read-only',
        '--network=none',
        '--memory=128m',
        '--cpus=0.5',
        '--user=10001:10001',
        '--cap-drop=ALL',
        '--security-opt=no-new-privileges',
        '--security-opt=seccomp=default',
        '--pids-limit=64',
        '--tmpfs', '/tmp:rw,noexec,nosuid,size=32m',
        '-v', `${pluginRealPath}:/plugin:ro`,
        'node:20-alpine',
        'node', '/plugin/index.js', serializedPayload
    ], {
        encoding: 'utf-8',
        env: sanitizedEnv,
        timeout: timeoutMs,
        maxBuffer: maxBufferBytes,
        windowsHide: true
    });
    return stdout;
}

async function runViaIsolatedProcessSandbox(
    pluginRealPath: string,
    scriptRealPath: string,
    serializedPayload: string,
    sanitizedEnv: NodeJS.ProcessEnv,
    timeoutMs: number,
    maxBufferBytes: number
): Promise<string> {
    const preDigest = computeDirectorySnapshotHash(pluginRealPath);

    const { stdout } = await execFileAsync(
        process.execPath,
        [
            '--disallow-code-generation-from-strings',
            '--no-warnings',
            scriptRealPath,
            serializedPayload
        ],
        {
            cwd: pluginRealPath,
            env: sanitizedEnv,
            encoding: 'utf-8',
            timeout: timeoutMs,
            maxBuffer: maxBufferBytes,
            windowsHide: true
        }
    );

    const postDigest = computeDirectorySnapshotHash(pluginRealPath);
    if (preDigest !== postDigest) {
        throw new Error(__t('messages.error.plugin_sandbox_boundary_violated'));
    }

    return stdout;
}

export async function executePluginSandbox(
    pluginPath: string,
    payload: any,
    options: SandboxExecutionOptions = {}
): Promise<any[]> {
    const timeoutMs = options.timeoutMs ?? DEFAULT_SANDBOX_TIMEOUT_MS;
    const maxBufferBytes = options.maxBufferBytes ?? MAX_STDOUT_BYTES;

    const { pluginRealPath, scriptRealPath } = validatePluginSandboxPath(pluginPath, options.basePluginsDir);
    const { allowedActions } = validatePluginManifestCapabilities(pluginRealPath);

    const serializedPayload = JSON.stringify(payload || {});
    if (Buffer.byteLength(serializedPayload, 'utf-8') > MAX_PAYLOAD_BYTES) {
        throw new Error(__t('messages.error.sandbox_execution_failed', { err_message: 'Payload size limit exceeded' }));
    }

    const sanitizedEnv = buildSanitizedSandboxEnv(process.env);

    try {
        let stdout: string;
        const preferDocker = options.preferDocker ?? (process.env.UGONDU_SANDBOX_MODE === 'docker');

        if (preferDocker) {
            try {
                stdout = await runViaDockerSandbox(pluginRealPath, serializedPayload, sanitizedEnv, timeoutMs, maxBufferBytes);
            } catch (dockerErr: any) {
                const msg = String(dockerErr?.message || '');
                const isDockerUnavailable =
                    dockerErr?.code === 'ENOENT' ||
                    msg.includes('ENOENT') ||
                    msg.includes('Cannot connect to the Docker daemon') ||
                    msg.includes('error during connect') ||
                    msg.includes('pipe/docker_engine') ||
                    msg.includes('daemon is not running');

                if (!isDockerUnavailable || process.env.UGONDU_SANDBOX_MODE === 'docker-only') {
                    throw dockerErr;
                }
                stdout = await runViaIsolatedProcessSandbox(
                    pluginRealPath,
                    scriptRealPath,
                    serializedPayload,
                    sanitizedEnv,
                    timeoutMs,
                    maxBufferBytes
                );
            }
        } else {
            stdout = await runViaIsolatedProcessSandbox(
                pluginRealPath,
                scriptRealPath,
                serializedPayload,
                sanitizedEnv,
                timeoutMs,
                maxBufferBytes
            );
        }

        if (Buffer.byteLength(stdout, 'utf-8') > maxBufferBytes) {
            throw new Error(__t('messages.error.plugin_stdout_exceeded_maximum_allowed_limit_', { MAX_STDOUT_BYTES: maxBufferBytes }));
        }

        const steps = JSON.parse(stdout);

        if (!Array.isArray(steps)) {
            throw new Error(__t('messages.error.plugin_did_not_return_an_array_of_steps'));
        }

        for (const step of steps) {
            if (!step || typeof step !== 'object' || typeof step.action !== 'string') {
                throw new Error(__t('err_plugin_action_rejected'));
            }
            if (!ALLOWED_ACTIONS.has(step.action) || !allowedActions.has(step.action)) {
                throw new Error(__t('err_plugin_action_rejected'));
            }
            if (step.payload && typeof step.payload === 'object') {
                const workingDir = step.payload.workingDirectory;
                if (typeof workingDir === 'string' && (workingDir.includes('..') || path.isAbsolute(workingDir))) {
                    throw new Error(__t('messages.error.path_traversal_detected'));
                }
            }
        }

        return steps;
    } catch (err: any) {
        if (err.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER' || (err.message && err.message.includes('maxBuffer'))) {
            throw new Error(__t('messages.error.sandbox_execution_failed_plugin_stdout_exceed', { MAX_STDOUT_BYTES: maxBufferBytes }));
        }
        throw new Error(__t('messages.error.sandbox_execution_failed', { err_message: err.message }));
    }
}
