/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Engine Core / AI / Tests / Model Lifecycle
 * File           : model-lifecycle.spec.ts
 * Version        : 3.1.0
 * Author         : Ujomor Systems Engineering & Governance Authority
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
 * - Architecture Authority : Ujomor Systems Engineering
 * - Security Authority     : Ujomor Systems Governance
 * - Governance Authority   : Air Roofers Corporate Governance
 * - Deployment Authority   : Air Roofers Release Engineering
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
    assertValidLifecycleTransition,
    computeReceiptDigest,
    isValidLifecycleTransition,
    loadPersistedLifecycleReceipt,
    ModelLifecycleStateMachine,
    ModelQualificationReceipt,
    ModelQualificationState,
    persistLifecycleReceipt,
} from '../model-lifecycle';
import { ModelCatalog } from '../model-catalog';
import { RoutingPolicyEngine } from '../routing-policy';
import { InferenceRequest } from '../contracts';

describe('Model Lifecycle State Machine & Catalog Governance', () => {
    let sm: ModelLifecycleStateMachine;

    beforeEach(() => {
        sm = new ModelLifecycleStateMachine();
    });

    test('newly discovered models have initial state strictly DISCOVERED (never ACTIVE)', () => {
        expect(sm.getInitialDiscoveredState()).toBe('DISCOVERED');
    });

    test('valid lifecycle pipeline transitions correctly from DISCOVERED to ACTIVE', () => {
        const correlationId = 'corr-life-001';
        const providerId = 'airroofers-ai';
        const modelId = 'airroofers-sentinel-v1';

        expect(isValidLifecycleTransition('DISCOVERED', 'SCHEMA_VALIDATED')).toBe(true);
        const r1 = sm.transition('DISCOVERED', 'SCHEMA_VALIDATED', { providerId, modelId, correlationId });
        expect(r1.newState).toBe('SCHEMA_VALIDATED');

        expect(isValidLifecycleTransition('SCHEMA_VALIDATED', 'POLICY_CHECKED')).toBe(true);
        sm.transition('SCHEMA_VALIDATED', 'POLICY_CHECKED', { providerId, modelId, correlationId });

        expect(isValidLifecycleTransition('POLICY_CHECKED', 'CAPABILITY_PROBED')).toBe(true);
        sm.transition('POLICY_CHECKED', 'CAPABILITY_PROBED', { providerId, modelId, correlationId });

        expect(isValidLifecycleTransition('CAPABILITY_PROBED', 'INFERENCE_VERIFIED')).toBe(true);
        sm.transition('CAPABILITY_PROBED', 'INFERENCE_VERIFIED', { providerId, modelId, correlationId });

        expect(isValidLifecycleTransition('INFERENCE_VERIFIED', 'QUALIFIED')).toBe(true);
        sm.transition('INFERENCE_VERIFIED', 'QUALIFIED', { providerId, modelId, correlationId });

        expect(isValidLifecycleTransition('QUALIFIED', 'ACTIVE')).toBe(true);
        const rActive = sm.transition('QUALIFIED', 'ACTIVE', { providerId, modelId, correlationId, actor: 'governance-authority' });
        expect(rActive.newState).toBe('ACTIVE');

        const audit = sm.getAuditRecords();
        expect(audit.length).toBe(6);
        expect(audit[5].actor).toBe('governance-authority');
    });

    test('transition to ACTIVE strictly requires prior QUALIFIED status (rejects direct jump from DISCOVERED)', () => {
        expect(isValidLifecycleTransition('DISCOVERED', 'ACTIVE')).toBe(false);
        try {
            assertValidLifecycleTransition('DISCOVERED', 'ACTIVE');
            fail('Should have thrown');
        } catch (err: any) {
            expect(err.errorCode).toBe('INVALID_REQUEST');
            expect(err.details?.to).toBe('ACTIVE');
        }

        expect(isValidLifecycleTransition('SCHEMA_VALIDATED', 'ACTIVE')).toBe(false);
        expect(isValidLifecycleTransition('POLICY_CHECKED', 'ACTIVE')).toBe(false);
        expect(isValidLifecycleTransition('CAPABILITY_PROBED', 'ACTIVE')).toBe(false);
        expect(isValidLifecycleTransition('INFERENCE_VERIFIED', 'ACTIVE')).toBe(false);
    });

    test('any check failure transitions to DEGRADED, DISABLED, or RETIRED with typed reason codes', () => {
        const context = { providerId: 'airroofers-ai', modelId: 'sentinel-v1', correlationId: 'corr-fail-001' };

        const degraded = sm.failCheck('POLICY_CHECKED', 'DEGRADED', 'POLICY_VIOLATION', context);
        expect(degraded.newState).toBe('DEGRADED');
        expect(degraded.reasonCode).toBe('POLICY_VIOLATION');

        const disabled = sm.failCheck('CAPABILITY_PROBED', 'DISABLED', 'CAPABILITY_PROBE_FAILED', context);
        expect(disabled.newState).toBe('DISABLED');
        expect(disabled.reasonCode).toBe('CAPABILITY_PROBE_FAILED');

        const retired = sm.failCheck('ACTIVE', 'RETIRED', 'MODEL_RETIRED', context);
        expect(retired.newState).toBe('RETIRED');
        expect(retired.reasonCode).toBe('MODEL_RETIRED');
    });

    test('receipt persistence computes SHA256 digest, saves and reloads lifecycle receipt', () => {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ugondu-lifecycle-'));
        const receiptFile = path.join(tmpDir, 'receipt.json');

        const receipt: ModelQualificationReceipt = {
            providerId: 'airroofers-ai',
            modelId: 'airroofers-sentinel-v1',
            state: 'QUALIFIED',
            candidateSha: '6b13a56f42654e4841db82b88cb1edf0fdb64188',
            apiContractVersion: '3.1.0',
            qualifiedAt: new Date().toISOString(),
            correlationId: 'corr-receipt-test',
            checks: [
                { checkId: 'schema-validation', status: 'PASS', durationMs: 12 },
                { checkId: 'capability-probe', status: 'PASS', durationMs: 45 },
                { checkId: 'inference-verification', status: 'PASS', durationMs: 120, resultDigest: 'abc123digest' },
            ],
        };

        const digest = computeReceiptDigest(receipt);
        expect(typeof digest).toBe('string');
        expect(digest.length).toBe(64);

        const persisted = persistLifecycleReceipt(receipt, receiptFile);
        expect(persisted.receiptDigest).toBe(digest);
        expect(fs.existsSync(receiptFile)).toBe(true);

        const loaded = loadPersistedLifecycleReceipt(receiptFile);
        expect(loaded.receiptDigest).toBe(digest);
        expect(loaded.receipt.modelId).toBe('airroofers-sentinel-v1');
        expect(loaded.receipt.checks.length).toBe(3);

        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    test('ModelCatalog reload preserves lifecycle states of existing models', () => {
        const catalog = new ModelCatalog();
        const initial = catalog.getModel('general-chat');
        expect(initial?.qualificationState).toBe('ACTIVE');

        // Transition general-chat to DEGRADED
        catalog.transitionModelLifecycle('general-chat', 'DEGRADED', { actorId: 'admin', role: 'admin' });
        expect(catalog.getModel('general-chat')?.qualificationState).toBe('DEGRADED');

        // Reload catalog
        catalog.reload();
        // Preserved!
        expect(catalog.getModel('general-chat')?.qualificationState).toBe('DEGRADED');
    });

    test('registerDiscoveredModel initializes model strictly in DISCOVERED and prevents direct activation', () => {
        const catalog = new ModelCatalog();
        catalog.registerDiscoveredModel({
            alias: 'new-unqualified-model',
            providerId: 'airroofers-ai',
            providerModelIdRef: 'secretless-registry://models/airroofers-ai/new-model',
            credentialRef: 'env://UGONDU_AIRROOFERS_AI_KEY',
            status: 'disabled',
            environments: ['development'],
            allowedRegions: ['eu-west-3'],
            dataClassifications: ['public'],
            capabilities: { streaming: false, toolCalling: false, structuredOutput: false, modalities: ['text'] },
            policy: { timeoutMs: 5000, maxOutputTokens: 256, fallbackAliases: [], rateLimitRpm: 60, costPer1kInput: 0.001, costPer1kOutput: 0.002 },
            governance: { owner: 'ai-ops', approver: 'governance', rotationDays: 90, incidentOwner: 'sec-ops' },
        });

        const discovered = catalog.getModel('new-unqualified-model');
        expect(discovered?.qualificationState).toBe('DISCOVERED');

        // Direct activation without QUALIFIED status fails closed
        try {
            catalog.setModelStatus('new-unqualified-model', 'enabled', { actorId: 'admin', role: 'admin' });
            fail('Should have thrown');
        } catch (err: any) {
            expect(err.errorCode).toBe('MODEL_DISABLED');
        }
    });

    test('RoutingPolicyEngine only routes inference requests to models in ACTIVE state', () => {
        const catalog = new ModelCatalog();
        const routing = new RoutingPolicyEngine(catalog);

        const request: InferenceRequest = {
            requestId: 'req-route-test',
            tenantId: 'tenant-eu',
            productId: 'ugondu',
            environment: 'production',
            task: 'chat',
            modelAlias: 'general-chat',
            region: 'eu-west-3',
            dataClassification: 'confidential',
            messages: [{ role: 'user', content: 'test message' }],
            deadlineMs: 5000,
            correlationId: 'corr-route-test',
        };

        // Initially ACTIVE -> succeeds
        const decision = routing.evaluate(request);
        expect(decision.primaryModel.alias).toBe('general-chat');

        // Transition to DEGRADED -> evaluate throws MODEL_DISABLED
        catalog.transitionModelLifecycle('general-chat', 'DEGRADED', { actorId: 'admin', role: 'admin' });
        try {
            routing.evaluate(request);
            fail('Should have thrown');
        } catch (err: any) {
            expect(err.errorCode).toBe('MODEL_DISABLED');
        }

        // Transition DEGRADED -> QUALIFIED -> evaluate still throws (not ACTIVE yet)
        catalog.transitionModelLifecycle('general-chat', 'QUALIFIED', { actorId: 'admin', role: 'admin' });
        try {
            routing.evaluate(request);
            fail('Should have thrown');
        } catch (err: any) {
            expect(err.errorCode).toBe('MODEL_DISABLED');
        }

        // Transition QUALIFIED -> ACTIVE -> succeeds again
        catalog.transitionModelLifecycle('general-chat', 'ACTIVE', { actorId: 'admin', role: 'admin' });
        const restored = routing.evaluate(request);
        expect(restored.primaryModel.alias).toBe('general-chat');
    });
});
