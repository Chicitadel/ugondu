import { executeGovernedRecovery } from '../../routes/recovery';
import { TransactionAuthority } from '../engine/recovery/transaction-authority';
import { GlobalCapabilityRegistry } from '../engine/recovery/capability-registry';
import { UpmExecutionGate } from '../../upm/policy-gate';
import { RecoveryOrchestrator } from '../engine/recovery/recovery-orchestrator';

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

jest.mock('../../upm/policy-gate');
// removed duplicate

describe('Recovery Lifecycle Verification', () => {
    beforeAll(() => {
        process.env.UGONDU_UPM_SECRET = 'mocked-secret';
        GlobalCapabilityRegistry.registerCapability({
            capabilityId: 'mock-cap',
            diagnose: jest.fn().mockResolvedValue({}),
            plan: jest.fn().mockResolvedValue({ infrastructureRepairs: [{ id: 'res-1' }] }),
            execute: jest.fn().mockResolvedValue(true),
            verify: jest.fn().mockResolvedValue(true)
        } as any);
    });

    beforeEach(() => {
        jest.clearAllMocks();
        
        (UpmExecutionGate.evaluate as jest.Mock).mockResolvedValue({ decision: { status: 'ALLOW', authorizationId: 'mock-auth-id' } });
        (UpmExecutionGate.verifyAuthorization as jest.Mock).mockReturnValue(true);

        // Mocks now in jest.mock
    });

    it('should maintain PENDING status and reach DRY_RUN_COMPLETE phase for dry run', async () => {
        const intent = { capabilityId: 'mock-cap', target: 'live://target', repositoryPath: '/path', authorizedActions: ['FIX'] };
        const mockAdapter = { identify: jest.fn().mockResolvedValue({ host: 'localhost' }) } as any;
        
        const result = await executeGovernedRecovery(intent, mockAdapter, true);
        expect(result.status).toBe('PLANNED');
        
        const txn = TransactionAuthority.get(result.transactionId);
        expect(txn.status).toBe('PENDING');
        expect(txn.state.phase).toBe('DRY_RUN_COMPLETE');
    });

    it('should progress through all phases for a real run', async () => {
        const intent = { capabilityId: 'mock-cap', target: 'live://target2', repositoryPath: '/path', authorizedActions: ['FIX'] };
        const mockAdapter = { identify: jest.fn().mockResolvedValue({ host: 'localhost' }) } as any;

        const updateSpy = jest.spyOn(TransactionAuthority, 'update');
        
        const result = await executeGovernedRecovery(intent, mockAdapter, false);
        expect(result.status).toBe('CERTIFIED');
        
        const txn = TransactionAuthority.get(result.transactionId);
        expect(txn.status).toBe('SUCCESS');
        expect(txn.state.phase).toBe('CERTIFIED');

        const updates = updateSpy.mock.calls.map(call => call[2] as any);
        
        const phasesTraversed = updates
            .map(u => u.state?.phase)
            .filter(Boolean);
            
        const statusesTraversed = updates
            .map(u => u.status)
            .filter(Boolean);

        expect(statusesTraversed).toContain('RUNNING');
        expect(statusesTraversed).not.toContain('PENDING'); 
        expect(phasesTraversed).toEqual(expect.arrayContaining([
            'PLANNED', 'AUTHORIZED', 'EXECUTING', 'EXECUTED', 'VERIFYING', 'VERIFIED', 'CERTIFIED'
        ]));
    });
});
