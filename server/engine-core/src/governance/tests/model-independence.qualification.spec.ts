import { GlobalCapabilityRegistry } from '../../deise/engine/recovery/capability-registry';
import { SshLiveAdapter } from '../../deise/engine/adapters/ssh/ssh-live-adapter';
import { executeGovernedRecovery } from '../../routes/recovery';
import { TransactionAuthority } from '../../deise/engine/recovery/transaction-authority';

class MockCapability {
    public capabilityId = 'PathRepositoryReconstruction';
    async execute() { return true; }
    async diagnose() { return {}; }
    async plan() { return { infrastructureRepairs: [{ id: 'mock', provider: 'local' }] }; }
}

describe('COR Qualification: Model Independence & Agent Equivalence', () => {
    let executorAdapter: SshLiveAdapter;

    beforeAll(() => {
        GlobalCapabilityRegistry.registerCapability(new MockCapability() as any);
        process.env.UGONDU_UPM_SECRET = 'test_secret';
    });

    beforeEach(() => {
        executorAdapter = new SshLiveAdapter();
    });

    it('should generate equivalent canonical intent', async () => {
        const target = 'localhost';
        const capId = 'PathRepositoryReconstruction';

        const cliIntent = { source: 'CLI', capabilityId: capId, target, authorizedActions: [capId] };
        const aiIntent = { source: 'AI_PLATFORM', capabilityId: capId, target, authorizedActions: [capId] };

        const cliResult = await executeGovernedRecovery(cliIntent, executorAdapter, false);
        const aiResult = await executeGovernedRecovery(aiIntent, executorAdapter, false);

        expect(cliResult.canonicalIntentHash).toEqual(aiResult.canonicalIntentHash);
        expect(cliResult.certificate).toBeDefined();
    });

    it('should cleanly resume a transaction without AI dependency', async () => {
        const aiIntent = { source: 'AI_PLATFORM', capabilityId: 'PathRepositoryReconstruction', target: 'localhost', authorizedActions: ['PathRepositoryReconstruction'] };
        const result = await executeGovernedRecovery(aiIntent, executorAdapter, true);
        
        const txnId = result.transactionId;
        const resumeIntent = { source: 'SYSTEM_RESUME', capabilityId: 'PathRepositoryReconstruction', target: 'localhost', authorizedActions: ['PathRepositoryReconstruction'] };
        const finalResult = await executeGovernedRecovery(resumeIntent, executorAdapter, false, txnId);
        
        expect(finalResult.transactionId).toEqual(txnId);
        expect(TransactionAuthority.get(txnId).status).toBe('SUCCESS');
    });
});
