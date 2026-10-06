import { RecoveryOrchestrator } from '../../src/deise/engine/recovery/recovery-orchestrator';
import { CPanelLiveAdapter } from '../../src/deise/engine/adapters/cpanel-adapter';
import { RecoveryScope } from '../../src/deise/engine/recovery/live-environment-adapter-contract';

async function runLiveRecoveryDemonstration() {
    console.log('--- STARTING LIVE RECOVERY DEMONSTRATION ---');
    const orchestrator = new RecoveryOrchestrator();
    const adapter = new CPanelLiveAdapter();

    const scope: RecoveryScope = {
        targetUri: 'cpanel://live.airroofers.com',
        tenantId: 'airroofe',
        applicationId: 'air-roofers-federated',
        repositoryPath: '/home/airroofe/repositories/ugondu',
        resourceIdentifiers: ['file:/home/airroofe/public_html/index.php']
    };

    const scopedCredentials = { cpanelToken: 'SECURE_TOKEN_ONLY_FOR_THIS_SCOPE' };

    try {
        console.log('1. Authenticated target');
        await adapter.identify(scope, scopedCredentials);

        console.log('2. Protected-scope establishment');
        console.log('3. Complete baseline / Environment Twin');
        const twin = await orchestrator.capture(adapter, scope);
        
        console.log('4. Immutable fingerprint');
        scope.baselineFingerprint = await orchestrator.fingerprint(adapter, scope);

        console.log('5. Corruption diagnosis');
        const diagnosis = { 
            diagnoses: [], 
            requiresInfrastructureRepair: true,
            infrastructureRepairs: [
                { id: 'file:/home/airroofe/public_html/index.php', type: 'FILE', expectedState: {}, actualState: {} }
            ]
        }; // Simulated for now

        console.log('6. Generate exact recovery plan');
        const plan = await orchestrator.generateRecoveryPlan(diagnosis as any);

        console.log('7. Dependency + blast-radius analysis');
        const analysis = await orchestrator.analyzeBlastRadius(plan, scope);

        console.log('8. Non-mutating dry run');
        await orchestrator.dryRun(plan, adapter, scope);

        console.log('9. Explicit approval');
        await orchestrator.requestApproval(plan, analysis);

        console.log('10. Pre-execution drift check & Scoped mutation');
        const execution = await orchestrator.executeAtomically(plan, adapter, scope);

        console.log('11. Independent verification');
        const verification = await orchestrator.verify(adapter, scope, { state: 'RECOVERED' });

        console.log('12. Post-recovery fingerprint');
        const finalFingerprint = await orchestrator.fingerprint(adapter, scope);

        console.log('13. No unrelated-resource mutation proof & Recovery Certificate');
        const certificate = await orchestrator.certify(
            scope.baselineFingerprint, finalFingerprint, 'tx-123', diagnosis, plan, execution.executionEvidence, verification.verificationEvidence
        );

        console.log('14. Recovery / Delivery Passport');
        const passport = await orchestrator.issuePassport(certificate);
        console.log('Passport Issued successfully:', passport.passportId);

        // DELIBERATE NEGATIVE TEST
        console.log('\n--- DELIBERATE NEGATIVE TEST ---');
        console.log('Attempting recovery plan that touches an unrelated production repository...');
        const maliciousPlan = {
            diagnoses: [],
            requiresInfrastructureRepair: true,
            infrastructureRepairs: [
                { id: 'file:/home/airroofe/unrelated_site/wp-config.php', type: 'FILE', expectedState: {}, actualState: {} }
            ]
        };

        try {
            await orchestrator.analyzeBlastRadius(maliciousPlan as any, scope);
            console.error('FAIL: Negative test should have thrown a Blast Radius Violation!');
        } catch(e: any) {
            console.log('SUCCESS (Negative Test): Orchestrator correctly refused out-of-bounds mutation.');
            console.log(`Rejection Reason: ${e.message}`);
        }

    } catch(e) {
        console.error('Demonstration Failed:', e);
    }
}

runLiveRecoveryDemonstration();
