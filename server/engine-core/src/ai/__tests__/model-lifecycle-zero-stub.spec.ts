/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Engine Core / AI / Tests / Zero-Stub Composition
 * File           : model-lifecycle-zero-stub.spec.ts
 * Version        : 3.2.0
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

describe('F-14 Zero-Stub Production Composition & Tamper Resistance', () => {
    const validSecret = 'air_prod_' + '0123456789abcdef0123456789abcdef0123456789abcdef';
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
        process.env.NODE_ENV = originalEnv;
    });

    test('in production mode, ProviderAdapterRegistry.setHttpTransport rejects custom transport injection', () => {
        process.env.NODE_ENV = 'production';
        const catalog = new ModelCatalog();
        const broker = new CredentialBroker();
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
        const catalog = new ModelCatalog();
        const broker = new CredentialBroker();
        const registry = new ProviderAdapterRegistry(catalog, broker);

        const mockAdapter = {
            providerId: 'mock-provider',
            capabilities: async () => [],
            invoke: async () => ({} as any),
        };

        expect(() => {
            registry.registerAdapter(mockAdapter as any);
        }).toThrow(AiGatewayError);

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
        const catalog = new ModelCatalog();
        const broker = new CredentialBroker();
        const adapter = new AirRoofersAiProviderAdapter(catalog, broker);

        expect(() => {
            adapter.setHttpTransport(async () => ({ status: 200, body: '{}' }));
        }).toThrow(AiGatewayError);

        try {
            adapter.setHttpTransport(async () => ({ status: 200, body: '{}' }));
            fail('Expected MOCK_ADAPTER_PROHIBITED');
        } catch (err: any) {
            expect(err.errorCode).toBe('MOCK_ADAPTER_PROHIBITED');
            expect(err.statusCode).toBe(403);
        }
    });

    test('in production mode, ModelLifecycle.verifyInference rejects mockAdapter flag with 403', async () => {
        process.env.NODE_ENV = 'production';
        const lc = new ModelLifecycle({ alias: 'zero-stub-guard', providerId: 'airroofers-ai' });
        lc.validateSchema();
        lc.checkPolicy({ secret: validSecret });
        await lc.probeCapability(async () => ({ ok: true }));

        try {
            await lc.verifyInference(async () => ({ output: 'test' }), { mockAdapter: true } as any);
            fail('Expected MOCK_ADAPTER_INJECTION_PROHIBITED');
        } catch (err: any) {
            expect(err.errorCode).toBe('MOCK_ADAPTER_INJECTION_PROHIBITED');
            expect(err.statusCode).toBe(403);
        }

        expect(lc.state).toBe('DISABLED');
        expect(lc.canRoute()).toBe(false);
    });

    test('in production mode, ModelLifecycle.runFullLifecycle rejects mockAdapter with 403', async () => {
        process.env.NODE_ENV = 'production';
        const lc = new ModelLifecycle({ alias: 'zero-stub-full', providerId: 'airroofers-ai' });

        await expect(
            lc.runFullLifecycle({ secret: validSecret, mockAdapter: true } as any)
        ).rejects.toThrow(ModelLifecycleError);

        try {
            await lc.runFullLifecycle({ secret: validSecret, mockAdapter: true } as any);
            fail('Expected MOCK_ADAPTER_INJECTION_PROHIBITED');
        } catch (err: any) {
            expect(err.errorCode).toBe('MOCK_ADAPTER_INJECTION_PROHIBITED');
            expect(err.statusCode).toBe(403);
        }

        expect(lc.state).toBe('DISABLED');
        expect(lc.canRoute()).toBe(false);
    });

    test('tamper resistance: qualify cannot clear testOnly: true on mock-verified receipt in production', async () => {
        process.env.NODE_ENV = 'production';
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

        expect(() => lc.activate()).toThrow(ModelLifecycleError);
        try {
            lc.activate();
            fail('Expected LIVE_INFERENCE_RECEIPT_REQUIRED');
        } catch (err: any) {
            expect(err.errorCode).toBe('LIVE_INFERENCE_RECEIPT_REQUIRED');
            expect(err.statusCode).toBe(403);
        }

        expect(lc.state).toBe('QUALIFIED');
        expect(lc.canRoute()).toBe(false);
    });
});
