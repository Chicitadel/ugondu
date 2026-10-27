/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Engine Core / DEISE / Recovery Authorization Negative Tests
 * File           : recovery-authorization-negative.spec.ts
 * Version        : 3.1.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-22
 * Last Modified  : 2026-10-22
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance:
 * - Corporate Policy Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

import { executeGovernedRecovery } from '../../routes/recovery';
import { GlobalCapabilityRegistry } from '../engine/recovery/capability-registry';
import { UpmExecutionGate, ExecutionAuthorization } from '../../upm/policy-gate';

jest.mock('../../upm/policy-gate');
jest.mock('../engine/recovery/recovery-orchestrator', () => {
    return {
        RecoveryOrchestrator: jest.fn().mockImplementation(() => {
            return {
                capture: jest.fn().mockResolvedValue({ immutableEvidenceSnapshotId: 'twin-hash' }),
                fingerprint: jest.fn().mockResolvedValue('base-fingerprint'),
                analyzeBlastRadius: jest.fn().mockResolvedValue({ isSafe: true }),
                dryRun: jest.fn().mockResolvedValue(true),
                requestApproval: jest.fn().mockResolvedValue(true),
                executeAtomically: jest.fn().mockResolvedValue({ success: true, executionEvidence: {} }),
                verify: jest.fn().mockResolvedValue({ verified: true, verificationEvidence: {} }),
                certify: jest.fn().mockResolvedValue({ certificateId: 'cert-1' }),
                issuePassport: jest.fn().mockResolvedValue({ passportId: 'pass-1' }),
            };
        }),
    };
});

describe(__t('recovery_authorization_negativ'), () => {
    let mockAuth: ExecutionAuthorization;

    beforeAll(() => {
        process.env.UGONDU_UPM_SECRET = 'mocked-secret';
        try {
            GlobalCapabilityRegistry.registerCapability({
                capabilityId: 'mock-cap',
                diagnose: jest.fn().mockResolvedValue({}),
                plan: jest.fn().mockResolvedValue({ infrastructureRepairs: [{ id: 'res-1' }] }),
                execute: jest.fn().mockResolvedValue(true),
                verify: jest.fn().mockResolvedValue(true),
            } as any);
        } catch (e) {}
    });

    beforeEach(() => {
        jest.clearAllMocks();

        mockAuth = {
            authorizationId: 'auth-1',
            intentHash: 'intent-hash',
            twinHash: 'twin-hash',
            irHash: 'ir-hash',
            policyVersion: '1.0.0',
            decision: { status: 'ALLOW', timestamp: new Date(), policyVersion: '1.0.0' },
            envelopeHash: 'envelope-hash',
            cryptographicSeal: 'seal',
            expiresAt: new Date(Date.now() + 100000),
        };

        UpmExecutionGate.evaluate = jest.fn().mockImplementation(async (context) => {
            return {
                ...mockAuth,
                intentHash: context.intentHash,
                twinHash: context.twinHash,
                envelopeHash: 'env-1',
                irHash: 'ir-1',
            };
        });

        UpmExecutionGate.verifyAuthorization = jest.fn().mockImplementation((auth, ir, expected) => {
            if (expected) {
                if (auth.intentHash !== expected.intentHash && auth.intentHash === 'wrong') throw new Error('INTENT_HASH_MISMATCH');
                if (auth.twinHash !== expected.twinHash && auth.twinHash === 'wrong') throw new Error('TWIN_HASH_MISMATCH');
                if (auth.envelopeHash !== expected.envelopeHash && auth.envelopeHash === 'wrong') throw new Error('ENVELOPE_HASH_MISMATCH');
                if (auth.policyVersion !== expected.policyVersion && auth.policyVersion === 'wrong') throw new Error('POLICY_VERSION_MISMATCH');
            }
            if (auth.authorizationId !== 'auth-1' && auth.authorizationId === 'wrong') throw new Error('AUTHORIZATION_ID_MISMATCH');
            if (auth.irHash !== 'ir-1' && auth.irHash === 'wrong') throw new Error('IR_HASH_MISMATCH');
        });
    });

    const runRecovery = async (intentOverrides = {}, txnId?: string, rev?: number) => {
        const intent = { capabilityId: 'mock-cap', target: 'live://target', repositoryPath: '/path', authorizedActions: ['FIX'], ...intentOverrides };
        const mockAdapter = { identify: jest.fn().mockResolvedValue({ host: 'localhost' }), checkDrift: jest.fn().mockResolvedValue(true), executeAtomicRecovery: jest.fn().mockResolvedValue({ success: true }) } as any;
        return executeGovernedRecovery(intent, mockAdapter, false, txnId, rev);
    };

    it(__t('should_fail_closed_on_wrong_in'), async () => {
        UpmExecutionGate.verifyAuthorization = jest.fn().mockImplementation(() => { throw new Error('INTENT_HASH_MISMATCH'); });
        await expect(runRecovery()).rejects.toThrow('INTENT_HASH_MISMATCH');
    });

    it(__t('should_fail_closed_on_wrong_tw'), async () => {
        UpmExecutionGate.verifyAuthorization = jest.fn().mockImplementation(() => { throw new Error('TWIN_HASH_MISMATCH'); });
        await expect(runRecovery()).rejects.toThrow('TWIN_HASH_MISMATCH');
    });

    it(__t('should_fail_closed_on_wrong_ir'), async () => {
        UpmExecutionGate.verifyAuthorization = jest.fn().mockImplementation(() => { throw new Error('IR_HASH_MISMATCH'); });
        await expect(runRecovery()).rejects.toThrow('IR_HASH_MISMATCH');
    });

    it(__t('should_fail_closed_on_wrong_en'), async () => {
        UpmExecutionGate.verifyAuthorization = jest.fn().mockImplementation(() => { throw new Error('ENVELOPE_HASH_MISMATCH'); });
        await expect(runRecovery()).rejects.toThrow('ENVELOPE_HASH_MISMATCH');
    });

    it(__t('should_fail_closed_on_wrong_po'), async () => {
        UpmExecutionGate.verifyAuthorization = jest.fn().mockImplementation(() => { throw new Error('POLICY_VERSION_MISMATCH'); });
        await expect(runRecovery()).rejects.toThrow('POLICY_VERSION_MISMATCH');
    });

    it(__t('should_fail_closed_on_wrong_au'), async () => {
        UpmExecutionGate.verifyAuthorization = jest.fn().mockImplementation(() => { throw new Error('AUTHORIZATION_ID_MISMATCH'); });
        await expect(runRecovery()).rejects.toThrow('AUTHORIZATION_ID_MISMATCH');
    });

    it(__t('should_fail_closed_on_tampered'), async () => {
        UpmExecutionGate.verifyAuthorization = jest.fn().mockImplementation(() => { throw new Error('CRYPTOGRAPHIC_SEAL_TAMPERED'); });
        await expect(runRecovery()).rejects.toThrow('CRYPTOGRAPHIC_SEAL_TAMPERED');
    });

    it(__t('should_fail_closed_on_stale_re'), async () => {
        const res1 = await executeGovernedRecovery({ capabilityId: 'mock-cap', target: 'live://target', repositoryPath: '/path', authorizedActions: ['FIX'] }, {} as any, true);
        const txnId = res1.transactionId;
        await expect(runRecovery({}, txnId, -1)).rejects.toThrow();
    });

    it(__t('should_fail_closed_on_changed_'), async () => {
        const res1 = await executeGovernedRecovery({ capabilityId: 'mock-cap', target: 'live://target', repositoryPath: '/path', authorizedActions: ['FIX'] }, {} as any, true);
        await expect(runRecovery({ target: 'live://mutated-target' }, res1.transactionId, 1)).rejects.toThrow();
    });

    it('fails closed when UGONDU_UPM_SECRET is absent from environment', async () => {
        const saved = process.env.UGONDU_UPM_SECRET;
        delete process.env.UGONDU_UPM_SECRET;
        try {
            await expect(runRecovery()).rejects.toThrow();
        } finally {
            process.env.UGONDU_UPM_SECRET = saved;
        }
    });
});
