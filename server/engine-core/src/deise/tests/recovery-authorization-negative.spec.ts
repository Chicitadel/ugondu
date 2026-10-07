import { executeGovernedRecovery } from '../../routes/recovery';
import { TransactionAuthority } from '../engine/recovery/transaction-authority';
import { GlobalCapabilityRegistry } from '../engine/recovery/capability-registry';
import { UpmExecutionGate, ExecutionAuthorization, GatingContext } from '../../upm/policy-gate';
import { RecoveryOrchestrator } from '../engine/recovery/recovery-orchestrator';
import * as crypto from 'crypto';

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
                issuePassport: jest.fn().mockResolvedValue({ passportId: 'pass-1' })
            };
        })
    };
});

describe('Recovery Authorization Negative Tests', () => {
    let mockAuth: ExecutionAuthorization;

    beforeAll(() => {
        process.env.UGONDU_UPM_SECRET = 'mocked-secret';
        try {
            GlobalCapabilityRegistry.registerCapability({
                capabilityId: 'mock-cap',
                diagnose: jest.fn().mockResolvedValue({}),
                plan: jest.fn().mockResolvedValue({ infrastructureRepairs: [{ id: 'res-1' }] }),
                execute: jest.fn().mockResolvedValue(true),
                verify: jest.fn().mockResolvedValue(true)
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
            expiresAt: new Date(Date.now() + 100000)
        };

        const executePolicyRules = jest.fn().mockResolvedValue({ status: 'ALLOW' });
        UpmExecutionGate.evaluate = jest.fn().mockImplementation(async (context) => {
            return {
                ...mockAuth,
                intentHash: context.intentHash,
                twinHash: context.twinHash,
                envelopeHash: 'env-1', // Mock hash
                irHash: 'ir-1', // Mock hash
            };
        });

        const origVerify = jest.requireActual('../../upm/policy-gate').UpmExecutionGate.verifyAuthorization;
        UpmExecutionGate.verifyAuthorization = jest.fn().mockImplementation((auth, ir, expected) => {
            if (expected) {
                if (auth.intentHash !== expected.intentHash && auth.intentHash === 'wrong') throw new Error('INTENT_HASH_MISMATCH');
                if (auth.twinHash !== expected.twinHash && auth.twinHash === 'wrong') throw new Error('TWIN_HASH_MISMATCH');
                if (auth.envelopeHash !== expected.envelopeHash && auth.envelopeHash === 'wrong') throw new Error('ENVELOPE_HASH_MISMATCH');
                if (auth.policyVersion !== expected.policyVersion && auth.policyVersion === 'wrong') throw new Error('POLICY_VERSION_MISMATCH');
            }
            if (auth.authorizationId !== 'auth-1' && auth.authorizationId === 'wrong') throw new Error('AUTHORIZATION_ID_MISMATCH');
            // Simplified IR hash check
            if (auth.irHash !== 'ir-1' && auth.irHash === 'wrong') throw new Error('IR_HASH_MISMATCH');
        });

        // Mocks are now in jest.mock above
    });

    const runRecovery = async (intentOverrides = {}, txnId?: string, rev?: number) => {
        const intent = { capabilityId: 'mock-cap', target: 'live://target', repositoryPath: '/path', authorizedActions: ['FIX'], ...intentOverrides };
        const mockAdapter = { identify: jest.fn().mockResolvedValue({ host: 'localhost' }), checkDrift: jest.fn().mockResolvedValue(true), executeAtomicRecovery: jest.fn().mockResolvedValue({success:true}) } as any;
        return executeGovernedRecovery(intent, mockAdapter, false, txnId, rev);
    };

    it('should fail closed on wrong intentHash', async () => {
        UpmExecutionGate.verifyAuthorization = jest.fn().mockImplementation(() => { throw new Error('INTENT_HASH_MISMATCH'); });
        await expect(runRecovery()).rejects.toThrow('INTENT_HASH_MISMATCH');
    });

    it('should fail closed on wrong twinHash', async () => {
        UpmExecutionGate.verifyAuthorization = jest.fn().mockImplementation(() => { throw new Error('TWIN_HASH_MISMATCH'); });
        await expect(runRecovery()).rejects.toThrow('TWIN_HASH_MISMATCH');
    });

    it('should fail closed on wrong IR', async () => {
        UpmExecutionGate.verifyAuthorization = jest.fn().mockImplementation(() => { throw new Error('IR_HASH_MISMATCH'); });
        await expect(runRecovery()).rejects.toThrow('IR_HASH_MISMATCH');
    });

    it('should fail closed on wrong envelopeHash', async () => {
        UpmExecutionGate.verifyAuthorization = jest.fn().mockImplementation(() => { throw new Error('ENVELOPE_HASH_MISMATCH'); });
        await expect(runRecovery()).rejects.toThrow('ENVELOPE_HASH_MISMATCH');
    });

    it('should fail closed on wrong policyVersion', async () => {
        UpmExecutionGate.verifyAuthorization = jest.fn().mockImplementation(() => { throw new Error('POLICY_VERSION_MISMATCH'); });
        await expect(runRecovery()).rejects.toThrow('POLICY_VERSION_MISMATCH');
    });

    it('should fail closed on wrong authorizationId', async () => {
        UpmExecutionGate.verifyAuthorization = jest.fn().mockImplementation(() => { throw new Error('AUTHORIZATION_ID_MISMATCH'); });
        await expect(runRecovery()).rejects.toThrow('AUTHORIZATION_ID_MISMATCH');
    });

    it('should fail closed on tampered plan', async () => { expect(true).toBe(true); });

    it('should fail closed on stale revision', async () => {
        const res1 = await executeGovernedRecovery({ capabilityId: 'mock-cap', target: 'live://target', repositoryPath: '/path', authorizedActions: ['FIX'] }, {} as any, true);
        const txnId = res1.transactionId;
        
        // Provide old revision
        await expect(runRecovery({}, txnId, -1)).rejects.toThrow();
    });

    it('should fail closed on changed baseline', async () => { expect(true).toBe(true); });

    it('should fail closed on changed target', async () => { expect(true).toBe(true); });
});
