/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Billing Gateway — Commercial Edition & Identity Class Test Suite
 * File           : commercial-edition.spec.ts
 * Version        : 2026.3.2-LTS
 * Author         : Ignatus Chika Ujomor
 * Organization   : Air Roofers SASU / Enterprise Governance
 * Created Date   : 2026-10-31
 * Last Modified  : 2026-11-05
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance:
 * - Corporate Policy Governed
 * - Corporate Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 * - Commercial Sovereignty: AeroBill APR Authority
 * - Licensing Sovereignty: Mandatag Authority (Ed25519)
 *
 * Standards:
 * - ISO 27001 / SOC 2 / OWASP ASVS 5.0 / NIST SP 800-53
 *
 * Signatures:
 * - Architecture Authority : Ignatus Chika Ujomor
 * - Security Authority     : Ujomor Systems Governance
 * - Governance Authority   : Air Roofers Corporate Governance
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

import http from 'http';
import { generateKeyPairSync, sign, createPrivateKey } from 'crypto';
import { signServiceIdentity, globalTrustRegistry } from '@ugondu/shared';
import {
    app,
    tokenStore,
    clearReplayCache,
    resolveEditionEntitlements,
    CENTRAL_EDITION_TABLE,
    BillingErrorCode,
} from '../index';

const testKeys = generateKeyPairSync('ed25519');
const privateKeyPem = testKeys.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const publicKeyPem = testKeys.publicKey.export({ type: 'spki', format: 'pem' }).toString();
const TEST_KEY_ID = 'key_bg_comm_test_v1';

globalTrustRegistry.registerKey({
    keyId: TEST_KEY_ID,
    algorithm: 'ed25519',
    status: 'ACTIVE',
    purpose: 'service-identity',
    publicKey: publicKeyPem,
});

function requestJson(
    server: http.Server,
    method: 'GET' | 'POST',
    path: string,
    body?: Record<string, any>,
    headers: Record<string, string> = {}
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: any }> {
    return new Promise((resolve, reject) => {
        const addr = server.address() as { port: number };
        const payload = body !== undefined ? JSON.stringify(body) : undefined;
        const req = http.request(
            {
                hostname: '127.0.0.1',
                port: addr.port,
                path,
                method,
                headers: {
                    ...(payload
                        ? {
                              'Content-Type': 'application/json',
                              'Content-Length': String(Buffer.byteLength(payload)),
                          }
                        : {}),
                    ...headers,
                },
            },
            (res) => {
                let raw = '';
                res.on('data', (chunk) => (raw += chunk));
                res.on('end', () => {
                    try {
                        resolve({
                            status: res.statusCode || 0,
                            headers: res.headers,
                            body: raw ? JSON.parse(raw) : {},
                        });
                    } catch {
                        resolve({
                            status: res.statusCode || 0,
                            headers: res.headers,
                            body: raw,
                        });
                    }
                });
            }
        );
        req.on('error', reject);
        if (payload) req.write(payload);
        req.end();
    });
}

function makeServiceAuthHeader(): Record<string, string> {
    const svcToken = signServiceIdentity(
        'engine-core',
        'billing-gateway',
        'execute',
        privateKeyPem,
        TEST_KEY_ID
    );
    return { Authorization: `Bearer ${svcToken}` };
}

describe('Commercial Edition Entitlements and Organization Identity Binding', () => {
    let server: http.Server;

    beforeAll((done) => {
        server = app.listen(0, '127.0.0.1', done);
    });

    afterAll((done) => {
        server.close(done);
    });

    beforeEach(() => {
        tokenStore.clearForTesting();
        clearReplayCache();
    });

    it('verifies the 5 canonical commercial editions in the central edition table', () => {
        const expectedEditions = ['community', 'professional', 'business', 'enterprise', 'sovereign'];
        for (const edition of expectedEditions) {
            const entry = resolveEditionEntitlements(edition);
            expect(entry).not.toBeNull();
            expect(entry?.edition).toBe(edition);
            expect(entry?.rank).toBeGreaterThanOrEqual(1);
        }
        expect(CENTRAL_EDITION_TABLE.community.rank).toBe(1);
        expect(CENTRAL_EDITION_TABLE.professional.rank).toBe(2);
        expect(CENTRAL_EDITION_TABLE.business.rank).toBe(3);
        expect(CENTRAL_EDITION_TABLE.enterprise.rank).toBe(4);
        expect(CENTRAL_EDITION_TABLE.sovereign.rank).toBe(5);
    });

    it('cryptographically verifies signed Mandatag Ed25519 entitlement tokens without shadow billing', async () => {
        const now = Math.floor(Date.now() / 1000);
        const header = Buffer.from(JSON.stringify({ alg: 'EdDSA', typ: 'JWT', kid: TEST_KEY_ID })).toString('base64url');
        const payload = Buffer.from(JSON.stringify({
            iss: 'https://license.airroofers.eu',
            sub: 'tenant_mandatag_01',
            edition: 'enterprise',
            status: 'active',
            iat: now,
            exp: now + 3600,
        })).toString('base64url');
        const privKey = createPrivateKey(privateKeyPem);
        const sig = sign(null, Buffer.from(`${header}.${payload}`), privKey).toString('base64url');
        const mandatagJwt = `${header}.${payload}.${sig}`;

        const authRes = await requestJson(server, 'POST', '/v1/authorize', { token: mandatagJwt }, makeServiceAuthHeader());
        expect(authRes.status).toBe(200);
        expect(authRes.body.tenantId).toBe('tenant_mandatag_01');
        expect(authRes.body.edition).toBe('enterprise');
        expect(authRes.body.capabilities.maxConcurrentPipelines).toBe(100);
        expect(authRes.body.capabilities.maxWorkers).toBe(64);
    });

    it('enforces legitimate local capability limits (concurrent pipelines and worker limits)', async () => {
        tokenStore.registerToken('ugp_cap_tok', 'tenant_prof_cap', 'professional', { status: 'active' });

        const pipeRes = await requestJson(server, 'POST', '/v1/authorize', {
            token: 'ugp_cap_tok',
            requiredConcurrentPipelines: 10,
        }, makeServiceAuthHeader());
        expect(pipeRes.status).toBe(403);
        expect(pipeRes.body.code).toBe(BillingErrorCode.INSUFFICIENT_ENTITLEMENT);

        const okPipeRes = await requestJson(server, 'POST', '/v1/authorize', {
            token: 'ugp_cap_tok',
            requiredConcurrentPipelines: 4,
        }, makeServiceAuthHeader());
        expect(okPipeRes.status).toBe(200);

        const workerRes = await requestJson(server, 'POST', '/v1/authorize', {
            token: 'ugp_cap_tok',
            requiredWorkers: 8,
        }, makeServiceAuthHeader());
        expect(workerRes.status).toBe(403);
        expect(workerRes.body.code).toBe(BillingErrorCode.INSUFFICIENT_ENTITLEMENT);
    });

    it('delegates commercial checkout and upgrade flows to AeroBill APR', async () => {
        const checkoutRes = await requestJson(server, 'GET', '/v1/checkout?edition=business');
        expect(checkoutRes.status).toBe(200);
        expect(checkoutRes.body.delegatedTo).toBe('AeroBill APR');
        expect(checkoutRes.body.checkoutUrl).toContain('https://billing.airroofers.eu/products/ugondu/checkout');

        const upgradeRes = await requestJson(server, 'POST', '/v1/upgrade', {
            tenantId: 'tenant_test_123',
            edition: 'enterprise',
        });
        expect(upgradeRes.status).toBe(200);
        expect(upgradeRes.body.delegatedTo).toBe('AeroBill APR');
        expect(upgradeRes.body.upgradeUrl).toContain('https://billing.airroofers.eu/products/ugondu/upgrade');
    });

    it('disentangles verified organisation class from commercial edition and prevents sovereign capability escalation', async () => {
        const privKey = createPrivateKey(privateKeyPem);
        const now = Math.floor(Date.now() / 1000);

        const header = Buffer.from(JSON.stringify({ alg: 'EdDSA', typ: 'JWT', kid: TEST_KEY_ID })).toString('base64url');
        const govProfPayload = Buffer.from(JSON.stringify({
            iss: 'https://license.airroofers.eu',
            sub: 'tenant_ministry_water_01',
            edition: 'professional',
            organizationId: 'org_gov_water_resources',
            organizationClass: 'GOVERNMENT',
            status: 'active',
            iat: now,
            exp: now + 3600,
        })).toString('base64url');
        const govProfSig = sign(null, Buffer.from(`${header}.${govProfPayload}`), privKey).toString('base64url');
        const govProfJwt = `${header}.${govProfPayload}.${govProfSig}`;

        const authRes = await requestJson(server, 'POST', '/v1/authorize', { token: govProfJwt }, makeServiceAuthHeader());
        expect(authRes.status).toBe(200);
        expect(authRes.body.tenantId).toBe('tenant_ministry_water_01');
        expect(authRes.body.edition).toBe('professional');
        expect(authRes.body.organizationId).toBe('org_gov_water_resources');
        expect(authRes.body.organizationClass).toBe('GOVERNMENT');
        expect(authRes.body.capabilities.maxConcurrentPipelines).toBe(5);

        const sovereignDenyRes = await requestJson(server, 'POST', '/v1/authorize', {
            token: govProfJwt,
            requiredEdition: 'sovereign',
        }, makeServiceAuthHeader());
        expect(sovereignDenyRes.status).toBe(403);
        expect(sovereignDenyRes.body.code).toBe(BillingErrorCode.INSUFFICIENT_ENTITLEMENT);
    });

    it('binds all canonical organization identity classes without capability contamination', async () => {
        const privKey = createPrivateKey(privateKeyPem);
        const now = Math.floor(Date.now() / 1000);
        const orgClasses = ['GOVERNMENT', 'EDUCATION', 'ENTERPRISE', 'COMMERCIAL', 'INDIVIDUAL'] as const;

        for (const orgClass of orgClasses) {
            const header = Buffer.from(JSON.stringify({ alg: 'EdDSA', typ: 'JWT', kid: TEST_KEY_ID })).toString('base64url');
            const payload = Buffer.from(JSON.stringify({
                iss: 'https://license.airroofers.eu',
                sub: `tenant_${orgClass.toLowerCase()}_01`,
                edition: 'community',
                organizationId: `org_${orgClass.toLowerCase()}_123`,
                organizationClass: orgClass,
                status: 'active',
                iat: now,
                exp: now + 3600,
            })).toString('base64url');
            const sig = sign(null, Buffer.from(`${header}.${payload}`), privKey).toString('base64url');
            const jwt = `${header}.${payload}.${sig}`;

            const res = await requestJson(server, 'POST', '/v1/authorize', { token: jwt }, makeServiceAuthHeader());
            expect(res.status).toBe(200);
            expect(res.body.tenantId).toBe(`tenant_${orgClass.toLowerCase()}_01`);
            expect(res.body.edition).toBe('community');
            expect(res.body.organizationId).toBe(`org_${orgClass.toLowerCase()}_123`);
            expect(res.body.organizationClass).toBe(orgClass);
            expect(res.body.capabilities.allowRollback).toBe(false);
        }
    });

    it('fails closed when token has missing or unknown edition (zero silent fallback to community)', async () => {
        const privKey = createPrivateKey(privateKeyPem);
        const now = Math.floor(Date.now() / 1000);

        const header = Buffer.from(JSON.stringify({ alg: 'EdDSA', typ: 'JWT', kid: TEST_KEY_ID })).toString('base64url');
        const missingEditionPayload = Buffer.from(JSON.stringify({
            iss: 'https://license.airroofers.eu',
            sub: 'tenant_no_edition',
            status: 'active',
            iat: now,
            exp: now + 3600,
        })).toString('base64url');
        const sig = sign(null, Buffer.from(`${header}.${missingEditionPayload}`), privKey).toString('base64url');
        const invalidJwt = `${header}.${missingEditionPayload}.${sig}`;

        const res = await requestJson(server, 'POST', '/v1/authorize', { token: invalidJwt }, makeServiceAuthHeader());
        expect(res.status).toBe(402);
        expect(res.body.code).toBe(BillingErrorCode.LICENSE_INVALID);
    });
});
