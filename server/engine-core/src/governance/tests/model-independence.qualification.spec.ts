import { GlobalCapabilityRegistry } from '../../deise/engine/recovery/capability-registry';
import { SshLiveAdapter } from '../../deise/engine/adapters/ssh/ssh-live-adapter';
import { executeGovernedRecovery } from '../../routes/recovery';
import { TransactionAuthority } from '../../deise/engine/recovery/transaction-authority';
// @ts-ignore
import { PathRepositoryReconstruction } from '../../../../plugins/recovery-dependencies/src/path-repository-reconstruction';

class AiPlatformContractAdapter {
    async generateIntent(capabilityId: string, target: string) {
        return {
            source: 'AI_PLATFORM',
            capabilityId: capabilityId,
            target: target,
            authorizedActions: ['PathRepositoryReconstruction']
        };
    }
}

describe('COR Qualification: Model Independence & Agent Equivalence', () => {
    let aiAdapter: AiPlatformContractAdapter;
    let executorAdapter: SshLiveAdapter;

    beforeAll(() => {
        GlobalCapabilityRegistry.registerCapability(new PathRepositoryReconstruction());
        process.env.UGONDU_UPM_SECRET = 'test_secret'; // Explicitly set for tests
    });

    beforeEach(() => {
        aiAdapter = new AiPlatformContractAdapter();
        executorAdapter = new SshLiveAdapter();
    });

    describe('Cross-Surface Governed Execution Equivalence', () => {
        it('should generate equivalent canonical intent, plan, and execution hashes across CLI, UI, API, and AI', async () => {
            const target = 'local_environment';
            const capId = 'PathRepositoryReconstruction';

            const cliIntent = { source: 'CLI', capabilityId: capId, target, authorizedActions: [capId] };
            const uiIntent = { source: 'UI', capabilityId: capId, target, authorizedActions: [capId] };
            const apiIntent = { source: 'API', capabilityId: capId, target, authorizedActions: [capId] };
            const aiIntent = await aiAdapter.generateIntent(capId, target);

            const canonicalize = (intent: any) => ({ capabilityId: intent.capabilityId, target: intent.target, authorizedActions: intent.authorizedActions });

            const cliResult = await executeGovernedRecovery(canonicalize(cliIntent), executorAdapter, false);
            const uiResult = await executeGovernedRecovery(canonicalize(uiIntent), executorAdapter, false);
            const apiResult = await executeGovernedRecovery(canonicalize(apiIntent), executorAdapter, false);
            const aiResult = await executeGovernedRecovery(canonicalize(aiIntent), executorAdapter, false);

            expect(cliResult.canonicalIntentHash).toEqual(aiResult.canonicalIntentHash);
            expect(uiResult.canonicalIntentHash).toEqual(apiResult.canonicalIntentHash);
            expect(cliResult.planHash).toEqual(aiResult.planHash);
            expect(cliResult.certificate).toBeDefined();
        });
    });

    describe('Autonomous Resume and Transaction Persistence', () => {
        it('should cleanly resume a transaction without AI dependency', async () => {
            const aiIntent = await aiAdapter.generateIntent('PathRepositoryReconstruction', 'local');
            const result = await executeGovernedRecovery(aiIntent, executorAdapter, true);
            expect(result.status).toBe('PLANNED');
            
            const txnId = result.transactionId;
            const txn = TransactionAuthority.get(txnId);
            expect(txn.status).toBe('PENDING');
            
            // Resume the exact transaction without the AI source
            const resumeIntent = { source: 'SYSTEM_RESUME', capabilityId: 'PathRepositoryReconstruction', target: 'local', authorizedActions: ['PathRepositoryReconstruction'] };
            const finalResult = await executeGovernedRecovery(resumeIntent, executorAdapter, false, txnId);
            
            expect(finalResult.status).toBe('CERTIFIED');
            expect(finalResult.transactionId).toEqual(txnId);
            expect(TransactionAuthority.get(txnId).status).toBe('SUCCESS');
        });
    });
});
