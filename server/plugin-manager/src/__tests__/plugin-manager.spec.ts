/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Plugin Manager / Unit & Security Tests
 * File           : plugin-manager.spec.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-10-18
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

import '../preload';
import http from 'http';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { signServiceIdentity, globalTrustRegistry } from '@ugondu/shared';
import {
    app,
    verifyPluginSignature,
    createExecutionReceipt
} from '../index';
import {
    buildSanitizedSandboxEnv,
    validatePluginSandboxPath,
    validatePluginManifestCapabilities,
    executePluginSandbox
} from '../sandbox';

describe('Plugin Manager Security, Tenant Isolation & Sandbox Suite (COR-017)', () => {
    let server: http.Server;
    let port: number;
    let servicePrivateKeyPem: string;
    const SERVICE_KEY_ID = 'key_plugin_manager_spec_v1';

    beforeAll((done) => {
        const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
        servicePrivateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
        const servicePublicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();

        globalTrustRegistry.registerKey({
            keyId: SERVICE_KEY_ID,
            algorithm: 'ed25519',
            status: 'ACTIVE',
            purpose: 'service-identity',
            publicKey: servicePublicKeyPem
        });

        server = app.listen(0, () => {
            const addr = server.address();
            port = typeof addr === 'object' && addr ? addr.port : 0;
            done();
        });
    });

    afterAll((done) => {
        if (server) {
            server.close(done);
        } else {
            done();
        }
    });

    function createAuthHeaders(issuer: string = 'engine-core'): Record<string, string> {
        const token = signServiceIdentity(issuer, 'plugin-manager', 'execute', servicePrivateKeyPem, SERVICE_KEY_ID);
        return { Authorization: `Bearer ${token}` };
    }

    function httpRequest(
        method: 'GET' | 'POST',
        urlPath: string,
        body?: any,
        headers: Record<string, string> = {}
    ): Promise<{ status: number; body: any }> {
        return new Promise((resolve, reject) => {
            const payload = body !== undefined ? JSON.stringify(body) : undefined;
            const reqHeaders: Record<string, string | number> = {
                ...headers
            };
            if (payload !== undefined) {
                reqHeaders['Content-Type'] = 'application/json';
                reqHeaders['Content-Length'] = Buffer.byteLength(payload);
            }

            const req = http.request(
                {
                    hostname: '127.0.0.1',
                    port,
                    path: urlPath,
                    method,
                    headers: reqHeaders
                },
                (res) => {
                    let raw = '';
                    res.on('data', (chunk) => (raw += chunk));
                    res.on('end', () => {
                        try {
                            resolve({ status: res.statusCode || 0, body: JSON.parse(raw) });
                        } catch {
                            resolve({ status: res.statusCode || 0, body: raw });
                        }
                    });
                }
            );
            req.on('error', reject);
            if (payload !== undefined) {
                req.write(payload);
            }
            req.end();
        });
    }

    test('Health, readiness, and metadata endpoints omit hardcoded cor_level and return operational state', async () => {
        const health = await httpRequest('GET', '/health');
        expect(health.status).toBe(200);
        expect(health.body.status).toBe('ok');
        expect(health.body.service).toBe('plugin-manager');
        expect(health.body.cor_level).toBeUndefined();

        const live = await httpRequest('GET', '/health/live');
        expect(live.status).toBe(200);
        expect(live.body.status).toBe('alive');

        const ready = await httpRequest('GET', '/health/ready');
        expect(ready.status).toBe(200);
        expect(ready.body.status).toBe('ready');

        const metadata = await httpRequest('GET', '/v1/metadata');
        expect(metadata.status).toBe(200);
        expect(metadata.body.service).toBe('plugin-manager');
        expect(metadata.body.capabilities).toContain('execution-receipts');
    });

    test('Manifest validation enforces required schema and rejects forbidden capabilities/actions', () => {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ugondu-manifest-spec-'));
        try {
            const validPluginDir = path.join(tmpDir, 'valid-plugin');
            fs.mkdirSync(validPluginDir, { recursive: true });
            fs.writeFileSync(path.join(validPluginDir, 'index.js'), 'process.stdout.write("[]");');
            fs.writeFileSync(
                path.join(validPluginDir, 'manifest.json'),
                JSON.stringify({
                    name: 'valid-plugin',
                    version: '1.0.0',
                    hooks: ['pre-sync'],
                    allowedActions: ['NODE_INSTALL']
                })
            );

            const capResult = validatePluginManifestCapabilities(validPluginDir);
            expect(capResult.capabilities).toContain('pre-sync');
            expect(capResult.allowedActions.has('NODE_INSTALL')).toBe(true);

            // Forbidden capability must be rejected
            fs.writeFileSync(
                path.join(validPluginDir, 'manifest.json'),
                JSON.stringify({
                    name: 'valid-plugin',
                    version: '1.0.0',
                    hooks: ['root-shell-escalation']
                })
            );
            expect(() => validatePluginManifestCapabilities(validPluginDir)).toThrow();
        } finally {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        }
    });

    test('Signature verification accepts valid Ed25519 signature and rejects tampered payload or forged signature', () => {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ugondu-sig-spec-'));
        try {
            const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
            const pubPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();

            const scriptContent = Buffer.from('process.stdout.write(JSON.stringify([{ action: "NODE_INSTALL", payload: {} }]));');
            fs.writeFileSync(path.join(tmpDir, 'index.js'), scriptContent);

            const validSignature = crypto.sign(null, scriptContent, privateKey).toString('base64');
            const manifest = {
                name: 'signed-test-plugin',
                version: '1.0.0',
                description: 'Signed test plugin',
                hooks: ['pre-sync'],
                signature: validSignature
            };

            expect(verifyPluginSignature(tmpDir, manifest, pubPem)).toBe(true);

            // Tamper with index.js after signing
            fs.writeFileSync(path.join(tmpDir, 'index.js'), 'process.stdout.write("malicious");');
            expect(verifyPluginSignature(tmpDir, manifest, pubPem)).toBe(false);

            // Forged signature
            const forgedManifest = {
                ...manifest,
                signature: Buffer.alloc(64, 0xaa).toString('base64')
            };
            expect(verifyPluginSignature(tmpDir, forgedManifest, pubPem)).toBe(false);
        } finally {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        }
    });

    test('Path traversal prevention rejects traversal attempts on both sandbox validator and HTTP routes', async () => {
        const baseDir = path.resolve(__dirname, '../../../../plugins');
        expect(() => validatePluginSandboxPath(path.join(baseDir, '../server'), baseDir)).toThrow();

        const activateTraversal = await httpRequest(
            'POST',
            `/v1/plugins/${encodeURIComponent('../../etc/passwd')}/activate`,
            { tenantId: 'tenant-traversal' },
            createAuthHeaders('test-suite')
        );
        expect(activateTraversal.status).toBe(403);
        expect(activateTraversal.body.error).toBe('PATH_TRAVERSAL_DETECTED');

        const executeTraversal = await httpRequest(
            'POST',
            `/v1/plugins/${encodeURIComponent('../../etc/passwd')}/execute`,
            { tenantId: 'tenant-traversal', payload: {} },
            createAuthHeaders('test-suite')
        );
        expect(executeTraversal.status).toBe(403);
        expect(executeTraversal.body.error).toBe('PATH_TRAVERSAL_DETECTED');
    });

    test('Service identity authentication is enforced on plugin activation and execution endpoints', async () => {
        const unauthActivate = await httpRequest('POST', '/v1/plugins/ugondu-plugin-node/activate', {
            tenantId: 'tenant-unauthenticated'
        });
        expect(unauthActivate.status).toBe(401);

        const unauthExecute = await httpRequest('POST', '/v1/plugins/ugondu-plugin-node/execute', {
            tenantId: 'tenant-unauthenticated',
            payload: {}
        });
        expect(unauthExecute.status).toBe(401);
    });

    test('Tenant isolation rejects unactivated plugin with 403 and returns signed/hashed execution receipt after activation', async () => {
        const unactivatedTenant = `tenant-unactivated-${Date.now()}`;
        const activatedTenant = `tenant-activated-${Date.now()}`;

        // 1. Unactivated tenant must be rejected with 403 PLUGIN_NOT_AUTHORIZED
        const rejectedRes = await httpRequest(
            'POST',
            '/v1/plugins/ugondu-plugin-node/execute',
            {
                tenantId: unactivatedTenant,
                payload: { packageManager: 'npm' }
            },
            createAuthHeaders('engine-core')
        );
        expect(rejectedRes.status).toBe(403);
        expect(rejectedRes.body.error).toBe('PLUGIN_NOT_AUTHORIZED');

        // 2. Activate plugin for activatedTenant using engine-core service identity
        const activateRes = await httpRequest(
            'POST',
            '/v1/plugins/ugondu-plugin-node/activate',
            { tenantId: activatedTenant },
            createAuthHeaders('engine-core')
        );
        expect(activateRes.status).toBe(200);
        expect(activateRes.body.status).toBe('SUCCESS');

        // 3. Unactivated tenant STILL cannot execute the plugin (cross-tenant isolation)
        const crossTenantRes = await httpRequest(
            'POST',
            '/v1/plugins/ugondu-plugin-node/execute',
            {
                tenantId: unactivatedTenant,
                payload: { packageManager: 'npm' }
            },
            createAuthHeaders('engine-core')
        );
        expect(crossTenantRes.status).toBe(403);
        expect(crossTenantRes.body.error).toBe('PLUGIN_NOT_AUTHORIZED');

        // 4. Activated tenant executes plugin and receives verified execution receipt
        const execRes = await httpRequest(
            'POST',
            '/v1/plugins/ugondu-plugin-node/execute',
            {
                tenantId: activatedTenant,
                payload: { packageManager: 'npm', production: true }
            },
            createAuthHeaders('engine-core')
        );
        expect(execRes.status).toBe(200);
        expect(execRes.body.status).toBe('SUCCESS');
        expect(Array.isArray(execRes.body.injectedSteps)).toBe(true);
        expect(execRes.body.injectedSteps[0].action).toBe('NODE_INSTALL');

        // Validate execution receipt fields
        expect(execRes.body.receipt).toBeDefined();
        expect(execRes.body.receipt.pluginDigest).toMatch(/^sha256:[0-9a-f]{64}$/);
        expect(execRes.body.receipt.signerKeyId).toBeTruthy();
        expect(execRes.body.receipt.version).toBe('1.0.0');
        expect(execRes.body.receipt.capabilities).toContain('pre-sync');
        expect(execRes.body.receipt.tenantId).toBe(activatedTenant);
        expect(execRes.body.receipt.executedAt).toBeTruthy();
        expect(execRes.body.receipt.receiptHash).toMatch(/^sha256:[0-9a-f]{64}$/);
    });

    test('Sandbox strips host environment secrets and rejects unauthorized plugin actions', async () => {
        const sanitized = buildSanitizedSandboxEnv({
            PATH: '/usr/bin',
            AWS_SECRET_ACCESS_KEY: 'super-secret-aws-key',
            UGONDU_SERVICE_IDENTITY_PRIVATE_KEY: 'private-key-material',
            DATABASE_URL: 'postgres://user:pass@localhost/db',
            API_TOKEN: 'secret-token'
        });

        expect(sanitized.AWS_SECRET_ACCESS_KEY).toBeUndefined();
        expect(sanitized.UGONDU_SERVICE_IDENTITY_PRIVATE_KEY).toBeUndefined();
        expect(sanitized.DATABASE_URL).toBeUndefined();
        expect(sanitized.API_TOKEN).toBeUndefined();
        expect(sanitized.NODE_ENV).toBe('production');

        const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'ugondu-sandbox-spec-'));
        try {
            const badPluginDir = path.join(tmpBase, 'bad-action-plugin');
            fs.mkdirSync(badPluginDir, { recursive: true });
            fs.writeFileSync(
                path.join(badPluginDir, 'index.js'),
                'process.stdout.write(JSON.stringify([{ action: "ARBITRARY_SHELL_EXEC", payload: {} }]));'
            );
            fs.writeFileSync(
                path.join(badPluginDir, 'manifest.json'),
                JSON.stringify({
                    name: 'bad-action-plugin',
                    version: '1.0.0',
                    hooks: ['pre-sync']
                })
            );

            await expect(
                executePluginSandbox(badPluginDir, {}, { basePluginsDir: tmpBase })
            ).rejects.toThrow();
        } finally {
            fs.rmSync(tmpBase, { recursive: true, force: true });
        }
    });
});
