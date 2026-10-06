import { GlobalCapabilityRegistry } from '../../deise/engine/recovery/capability-registry';
import { SshLiveAdapter } from '../../deise/engine/adapters/ssh/ssh-live-adapter';
import { executeGovernedRecovery } from '../../routes/recovery';
import { PathRepositoryReconstruction } from '../../../plugins/recovery-dependencies/src/path-repository-reconstruction';

class AiPlatformContractAdapter {
    async generateIntent(capabilityId: string, target: string) {
        return {
            source: 'AI_PLATFORM',
            capabilityId: capabilityId,
            target: target
        };
    }
}

describe('COR Qualification: Model Independence & Agent Equivalence', () => {
    let aiAdapter: AiPlatformContractAdapter;
    let executorAdapter: SshLiveAdapter;

    beforeAll(() => {
        GlobalCapabilityRegistry.registerCapability(new PathRepositoryReconstruction());
    });

    beforeEach(() => {
        aiAdapter = new AiPlatformContractAdapter();
        executorAdapter = new SshLiveAdapter();
    });

    describe('Cross-Surface Governed Execution Equivalence', () => {
        it('should generate equivalent canonical intent, plan, and execution hashes across CLI, UI, API, and AI', async () => {
            const target = 'local_environment';
            const capId = 'PathRepositoryReconstruction';

            const cliIntent = { source: 'CLI', capabilityId: capId, target };
            const uiIntent = { source: 'UI', capabilityId: capId, target };
            const apiIntent = { source: 'API', capabilityId: capId, target };
            const aiIntent = await aiAdapter.generateIntent(capId, target);

            // Strip source for canonical comparison
            const canonicalize = (intent: any) => ({ capabilityId: intent.capabilityId, target: intent.target });

            const cliResult = await executeGovernedRecovery(canonicalize(cliIntent), executorAdapter, false);
            const uiResult = await executeGovernedRecovery(canonicalize(uiIntent), executorAdapter, false);
            const apiResult = await executeGovernedRecovery(canonicalize(apiIntent), executorAdapter, false);
            const aiResult = await executeGovernedRecovery(canonicalize(aiIntent), executorAdapter, false);

            expect(cliResult.canonicalIntentHash).toEqual(aiResult.canonicalIntentHash);
            expect(uiResult.canonicalIntentHash).toEqual(apiResult.canonicalIntentHash);

            expect(cliResult.planHash).toEqual(aiResult.planHash);
            expect(uiResult.planHash).toEqual(apiResult.planHash);

            expect(cliResult.status).toBe('CERTIFIED');
            expect(aiResult.status).toBe('CERTIFIED');

            expect(cliResult.transactionId).toBeDefined();
            expect(aiResult.transactionId).toBeDefined();

            expect(cliResult.verification.verified).toBe(true);
            expect(aiResult.verification.verified).toBe(true);
        });
    });

    describe('Policy & Authorization Boundaries', () => {
        it('should actively reject unauthorized AI intents via the governed pipeline', async () => {
            const unauthorizedIntent = await aiAdapter.generateIntent('PathRepositoryReconstruction', 'unauthorized_target');
            
            await expect(executeGovernedRecovery(unauthorizedIntent, executorAdapter, false)).rejects.toThrow('UNAUTHORIZED');
        });

        it('should cleanly resume a transaction without AI dependency (AI Disappearance)', async () => {
            // Simulated transaction resume
            const aiIntent = await aiAdapter.generateIntent('PathRepositoryReconstruction', 'local');
            const result = await executeGovernedRecovery(aiIntent, executorAdapter, true); // dry_run = true
            expect(result.status).toBe('PLANNED');
            
            // AI is removed, execution continues via deterministic pipeline using the generated plan
            const resumeIntent = { source: 'SYSTEM_RESUME', capabilityId: 'PathRepositoryReconstruction', target: 'local' };
            const finalResult = await executeGovernedRecovery(resumeIntent, executorAdapter, false);
            
            expect(finalResult.status).toBe('CERTIFIED');
            expect(finalResult.planHash).toEqual(result.planHash); // Matches the AI's plan
        });
    });
});
