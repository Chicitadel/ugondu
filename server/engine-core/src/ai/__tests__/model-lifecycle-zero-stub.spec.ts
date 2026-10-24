/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Engine Core / AI / Tests / Zero-Stub Composition
 * File           : model-lifecycle-zero-stub.spec.ts
 * Version        : 3.3.0
 * Author         : Enterprise Architecture Council & Systems Engineering Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-24
 * Last Modified  : 2026-10-24
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
 * - ISO 27001 / SOC 2 / OWASP ASVS / NIST SP 800-53
 *
 * Signatures:
 * - Architecture Authority : Enterprise Architecture Council
 * - Security Authority     : Corporate Systems Governance
 * - Governance Authority   : Air Roofers Corporate Governance
 * - Deployment Authority   : Air Roofers Release Engineering
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

import { ModelLifecycle, ModelLifecycleError } from '../model-lifecycle';
import { ModelCatalog } from '../model-catalog';
import { CredentialBroker } from '../credential-broker';
import { ProviderAdapterRegistry } from '../provider-registry';
import { AirRoofersAiProviderAdapter } from '../airroofers-provider';
import { AiGatewayError } from '../contracts';
import {
    computeProvenanceSeal,
    createTrustedLiveInferenceReceipt,
    DEV_FALLBACK_KEY,
    DEV_KEY_ID,
    ProvenanceConfigurationError,
    validateLiveInferenceReceipt,
} from '../trusted-receipt';

describe('F-14, F-19 & F-20 Zero-Stub Production Composition & Dev-Key Isolation', () => {
    const validSecret = 'air_prod_' + '0123456789abcdef0123456789abcdef0123456789abcdef';
    const prodSigningKey = 'prod_signing_key_0123456789abcdef0123456789abcdef';
    const originalEnv = process.env.NODE_ENV;
    const originalKey = process.env.UGONDU_PROVENANCE_KEY;

    afterEach(() => {
        process.env.NODE_ENV = originalEnv;
        if (originalKey !== undefined) process.env.UGONDU_PROVENANCE_KEY = originalKey;
        else delete process.env.UGONDU_PROVENANCE_KEY;
    });

    test('in production mode, ProviderAdapterRegistry.setHttpTransport rejects custom transport injection', () => {
        process.env.NODE_ENV = 'production';
        const catalog = new ModelCatalog(), broker = new CredentialBroker();
        const registry = new ProviderAdapterRegistry(catalog, broker);

        expect(() => {
            registry.setHttpTransport(async () => ({ status: 200, body: '{}' }));
        }).toThrow(AiGatewayError);
        try {
            registry.setHttpTransport(async () => ({ status: 200, body: '{}' }));
            fail('Expected MOCK_ADAPTER_PROHIBITED');
        } catch (err: any) {
            expect(err.errorCode).toBe('MOCK_ADAPTER_PROHIBITED');
            expect(err.statusCode).toBe(403);
        }
    });

    test('in production mode, ProviderAdapterRegistry.registerAdapter rejects mock or stub adapter injection', () => {
        process.env.NODE_ENV = 'production';
        const catalog = new ModelCatalog(), broker = new CredentialBroker();
        const registry = new ProviderAdapterRegistry(catalog, broker);
        const mockAdapter = { providerId: 'mock-provider', capabilities: async () => [], invoke: async () => ({} as any) };

        expect(() => { registry.registerAdapter(mockAdapter as any); }).toThrow(AiGatewayError);
        try {
            registry.registerAdapter(mockAdapter as any);
            fail('Expected MOCK_ADAPTER_PROHIBITED');
        } catch (err: any) {
            expect(err.errorCode).toBe('MOCK_ADAPTER_PROHIBITED');
            expect(err.statusCode).toBe(403);
        }
    });

    test('in production mode, AirRoofersAiProviderAdapter.setHttpTransport rejects custom transport injection', () => {
        process.env.NODE_ENV = 'production';
        const catalog = new ModelCatalog(), broker = new CredentialBroker();
        const adapter = new AirRoofersAiProviderAdapter(catalog, broker);

        expect(() => { adapter.setHttpTransport(async () => ({ status: 200, body: '{}' })); }).toThrow(AiGatewayError);
        try {
            adapter.setHttpTransport(async () => ({ status: 200, body: '{}' }));
            fail('Expected MOCK_ADAPTER_PROHIBITED');
        } catch (err: any) {
            expect(err.errorCode).toBe('MOCK_ADAPTER_PROHIBITED');
            expect(err.statusCode).toBe(403);
        }
    });

    test('F-19: in production mode, ModelLifecycle.probeCapability completely rejects arbitrary probeFn callback', async () => {
        process.env.NODE_ENV = 'production';
        process.env.UGONDU_PROVENANCE_KEY = prodSigningKey;
        const lc = new ModelLifecycle({ alias: 'probe-guard-model', providerId: 'airroofers-ai' });
        lc.validateSchema();
        lc.checkPolicy({ secret: validSecret });

        await expect(lc.probeCapability(async () => ({ ok: true }))).rejects.toMatchObject({
            errorCode: 'MOCK_ADAPTER_INJECTION_PROHIBITED',
            statusCode: 403,
        });
        expect(lc.state).toBe('DISABLED');
        expect(lc.canRoute()).toBe(false);
    });

    test('F-19: in production mode, ModelLifecycle.verifyInference completely rejects arbitrary executeFn even without isMock marker', async () => {
        process.env.NODE_ENV = 'production';
        process.env.UGONDU_PROVENANCE_KEY = prodSigningKey;
        const lc = new ModelLifecycle({ alias: 'exec-seam-guard', providerId: 'airroofers-ai' });
        lc.state = 'CAPABILITY_PROBED';

        // Arbitrary function omitting isMock or mockAdapter must be rejected
        await expect(lc.verifyInference(async () => ({ output: 'innocent-looking-output' }))).rejects.toMatchObject({
            errorCode: 'MOCK_ADAPTER_INJECTION_PROHIBITED',
            statusCode: 403,
        });
        expect(lc.state).toBe('DISABLED');
        expect(lc.canRoute()).toBe(false);
    });

    test('F-19: in production mode, ModelLifecycle.runFullLifecycle rejects arbitrary executeFn or probeFn with 403', async () => {
        process.env.NODE_ENV = 'production';
        process.env.UGONDU_PROVENANCE_KEY = prodSigningKey;
        const lc = new ModelLifecycle({ alias: 'zero-stub-full', providerId: 'airroofers-ai' });

        await expect(
            lc.runFullLifecycle({ secret: validSecret, executeFn: async () => ({ output: 'test' }) })
        ).rejects.toMatchObject({ errorCode: 'MOCK_ADAPTER_INJECTION_PROHIBITED', statusCode: 403 });
        expect(lc.state).toBe('DISABLED');
        expect(lc.canRoute()).toBe(false);

        const lcProbe = new ModelLifecycle({ alias: 'zero-stub-full-probe', providerId: 'airroofers-ai' });
        await expect(
            lcProbe.runFullLifecycle({ secret: validSecret, probeFn: async () => ({ ok: true }) })
        ).rejects.toMatchObject({ errorCode: 'MOCK_ADAPTER_INJECTION_PROHIBITED', statusCode: 403 });
        expect(lcProbe.state).toBe('DISABLED');
        expect(lcProbe.canRoute()).toBe(false);
    });

    test('F-19: in production mode, ModelLifecycle constructor rejects arbitrary executeFn or probeFn in options with 403', () => {
        process.env.NODE_ENV = 'production';
        expect(() => new ModelLifecycle({ alias: 'test-model' }, { probeFn: async () => ({ ok: true }) } as any)).toThrow(ModelLifecycleError);
        try {
            new ModelLifecycle({ alias: 'test-model' }, { probeFn: async () => ({ ok: true }) } as any);
        } catch (err: any) {
            expect(err.errorCode).toBe('MOCK_ADAPTER_INJECTION_PROHIBITED');
            expect(err.statusCode).toBe(403);
        }

        expect(() => new ModelLifecycle({ alias: 'test-model' }, { executeFn: async () => 'test' } as any)).toThrow(ModelLifecycleError);
        try {
            new ModelLifecycle({ alias: 'test-model' }, { executeFn: async () => 'test' } as any);
        } catch (err: any) {
            expect(err.errorCode).toBe('MOCK_ADAPTER_INJECTION_PROHIBITED');
            expect(err.statusCode).toBe(403);
        }
    });

    test('F-19: model-lifecycle module strictly does NOT re-export createTrustedLiveInferenceReceipt', async () => {
        const lifecycleModule = await import('../model-lifecycle');
        expect((lifecycleModule as any).createTrustedLiveInferenceReceipt).toBeUndefined();
    });

    test('F-22: public AI barrel (index.ts) strictly does NOT export createTrustedLiveInferenceReceipt', async () => {
        const aiBarrel = await import('../index');
        expect((aiBarrel as any).createTrustedLiveInferenceReceipt).toBeUndefined();
        expect((aiBarrel as any).TrustedReceiptService?.createReceipt).toBeUndefined();
    });

    test('F-20: in non-production, development key fallback stamps keyId dev-key-local-only and testOnly true', () => {
        process.env.NODE_ENV = 'development';
        delete process.env.UGONDU_PROVENANCE_KEY;

        const receipt = createTrustedLiveInferenceReceipt({
            source: 'airroofers-live-transport', httpStatus: 200, verification: 'AUTHENTIC_LIVE_INFERENCE_QUALIFIED',
            candidateSha: 'head-sha-12345', modelId: 'dev-model',
            endpointHost: 'ai.airroofers.eu', providerRequestId: 'prov-req-001',
            responseDigestSha256: 'a'.repeat(64), observedAt: new Date().toISOString(),
        });

        expect(receipt.keyId).toBe(DEV_KEY_ID);
        expect(receipt.testOnly).toBe(true);
    });

    test('F-20 adversarial: in production mode, receipt with keyId dev-key-local-only fails closed with 403 DEV_KEY_PROHIBITED_IN_PRODUCTION', () => {
        process.env.NODE_ENV = 'production';
        process.env.UGONDU_PROVENANCE_KEY = prodSigningKey;

        const devReceipt = {
            source: 'airroofers-live-transport' as const, httpStatus: 200, verification: 'AUTHENTIC_LIVE_INFERENCE_QUALIFIED' as const,
            candidateSha: 'head-sha-12345', modelId: 'test-model', keyId: DEV_KEY_ID, testOnly: true,
            endpointHost: 'ai.airroofers.eu', providerRequestId: 'req-001',
            responseDigestSha256: 'b'.repeat(64), observedAt: new Date().toISOString(),
            signature: '0'.repeat(64), provenanceSeal: '0'.repeat(64),
        };

        expect(() => validateLiveInferenceReceipt(devReceipt, 'test-model', 'head-sha-12345')).toThrow(ProvenanceConfigurationError);
        try {
            validateLiveInferenceReceipt(devReceipt, 'test-model', 'head-sha-12345');
            fail('Expected DEV_KEY_PROHIBITED_IN_PRODUCTION');
        } catch (err: any) {
            expect(err.errorCode).toBe('DEV_KEY_PROHIBITED_IN_PRODUCTION');
            expect(err.statusCode).toBe(403);
        }
    });

    test('F-20 adversarial: in production mode, receipt signed with dev key but keyId stripped is detected via timingSafeEqual and fails closed with 403', () => {
        process.env.NODE_ENV = 'production';
        process.env.UGONDU_PROVENANCE_KEY = prodSigningKey;

        const candidateSha = 'sha-adversary-candidate';
        const modelId = 'adversary-model';
        const providerRequestId = 'prov-req-adv-001';
        const responseDigestSha256 = 'c'.repeat(64);

        // Attacker creates seal using known dev fallback key
        const seal = computeProvenanceSeal({
            candidateSha, modelId, endpointHost: 'ai.airroofers.eu', providerRequestId, responseDigestSha256,
        }, DEV_FALLBACK_KEY);

        // Attacker strips keyId and testOnly
        const forgedReceipt = {
            source: 'airroofers-live-transport' as const, httpStatus: 200, verification: 'AUTHENTIC_LIVE_INFERENCE_QUALIFIED' as const,
            candidateSha, modelId, endpointHost: 'ai.airroofers.eu', providerRequestId, responseDigestSha256,
            observedAt: new Date().toISOString(), signature: seal, provenanceSeal: seal,
        };

        expect(() => validateLiveInferenceReceipt(forgedReceipt, modelId, candidateSha)).toThrow(ProvenanceConfigurationError);
        try {
            validateLiveInferenceReceipt(forgedReceipt, modelId, candidateSha);
            fail('Expected DEV_KEY_PROHIBITED_IN_PRODUCTION');
        } catch (err: any) {
            expect(err.errorCode).toBe('DEV_KEY_PROHIBITED_IN_PRODUCTION');
            expect(err.statusCode).toBe(403);
        }
    });

    test('tamper resistance: qualify cannot clear testOnly: true on mock-verified receipt in production', async () => {
        process.env.NODE_ENV = 'development';
        const lc = new ModelLifecycle({ alias: 'tamper-resistant-model', providerId: 'airroofers-ai' });
        lc.validateSchema();
        lc.checkPolicy({ secret: validSecret });
        await lc.probeCapability(async () => ({ ok: true }));
        await lc.verifyInference(async () => ({ output: 'mocked output' }));
        expect(lc.liveInferenceReceipt?.testOnly).toBe(true);

        // Adversary passes testOnly: false to try to clear it
        lc.qualify({ testOnly: false, liveExecution: true });
        const receipt = lc.getReceipt();
        expect((receipt as any)?.testOnly).toBe(true);

        process.env.NODE_ENV = 'production';
        process.env.UGONDU_PROVENANCE_KEY = prodSigningKey;
        expect(() => lc.activate()).toThrow(ModelLifecycleError);
        try {
            lc.activate();
            fail('Expected LIVE_INFERENCE_RECEIPT_REQUIRED or DEV_KEY_PROHIBITED_IN_PRODUCTION');
        } catch (err: any) {
            expect(['LIVE_INFERENCE_RECEIPT_REQUIRED', 'DEV_KEY_PROHIBITED_IN_PRODUCTION']).toContain(err.errorCode);
            expect(err.statusCode).toBe(403);
        }
        expect(lc.state).toBe('QUALIFIED');
        expect(lc.canRoute()).toBe(false);
    });
});
