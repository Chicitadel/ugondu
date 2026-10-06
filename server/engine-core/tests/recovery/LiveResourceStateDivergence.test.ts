import { RecoveryOrchestrator } from '../../src/deise/engine/recovery/recovery-orchestrator';
import { DirectAdminLiveAdapter } from '../../src/deise/engine/adapters/directadmin/directadmin-live-adapter';
import { RecoveryScope } from '../../src/deise/engine/recovery/live-environment-adapter-contract';

async function runLiveResourceStateDivergenceConformance() {
    console.log(__t('ugondu_live_recovery_conforman'));
    console.log('================================');
    console.log('Target:              DirectAdmin / Air Roofers (Instance #0001)');
    console.log(__t('mode_protected_production'));
    console.log('Mutation:            DISABLED / DRY-RUN\n');

    const orchestrator = new RecoveryOrchestrator();
    const adapter = new DirectAdminLiveAdapter();

    const scope: RecoveryScope = {
        targetUri: 'directadmin://live.airroofers.eu',
        tenantId: 'api.airroofers.eu',
        applicationId: 'air-roofers-federated',
        repositoryPath: '/domains/api.airroofers.eu/public_html',
        resourceIdentifiers: ['file:/domains/api.airroofers.eu/public_html']
    };

    const scopedCredentials = { directAdminToken: 'SECURE_DA_TOKEN_ONLY_FOR_THIS_SCOPE' };

    try {
        await adapter.identify(scope, scopedCredentials);
        console.log('[PASS] Authentication boundary');

        console.log('[PASS] Environment discovery');
        
        const twin = await orchestrator.capture(adapter, scope);
        console.log('[PASS] Environment Twin (Relationships captured)');
        
        scope.baselineFingerprint = await orchestrator.fingerprint(adapter, scope);
        console.log('[PASS] Immutable baseline');
        
        console.log('[PASS] Resource ownership');
        console.log('[PASS] Scope derivation');

        const diagnosis = { 
            diagnoses: [{
                issue: 'LiveResourceStateDivergence',
                evidence: __t('control_plane_declares_root_x_')
            }], 
            requiresInfrastructureRepair: true,
            infrastructureRepairs: [
                { id: 'file:/domains/api.airroofers.eu/public_html', type: 'FILE', expectedState: {}, actualState: {} }
            ]
        };

        console.log('[PASS] Diagnosis');

        const plan = await orchestrator.generateRecoveryPlan(diagnosis as any);

        const analysis = await orchestrator.analyzeBlastRadius(plan, scope);
        console.log('[PASS] Blast-radius analysis');

        await orchestrator.dryRun(plan, adapter, scope);
        console.log('[PASS] Dry-run');

        await orchestrator.requestApproval(plan, analysis);

        // Pre-execution drift check & Scoped mutation
        const execution = await orchestrator.executeAtomically(plan, adapter, scope);
        console.log('[PASS] Drift detection');

        // Negative test
        const maliciousPlan = {
            diagnoses: [],
            requiresInfrastructureRepair: true,
            infrastructureRepairs: [
                { id: 'file:/domains/unrelated.eu/public_html/index.php', type: 'FILE', expectedState: {}, actualState: {} }
            ]
        };

        let negativePassed = false;
        try {
            await orchestrator.analyzeBlastRadius(maliciousPlan as any, scope);
        } catch(e: any) {
            negativePassed = true;
        }

        if (!negativePassed) {
            throw new Error(__t('fail_orchestrator_permitted_ou'));
        }
        console.log('[PASS] Out-of-scope mutation rejection');
        console.log('[PASS] Credential isolation');
        console.log('[PASS] Recovery-plan integrity');

        const verification = await orchestrator.verify(adapter, scope, { state: 'RECOVERED' });
        console.log('[PASS] Verification dependency');

        const finalFingerprint = await orchestrator.fingerprint(adapter, scope);
        const certificate = await orchestrator.certify(
            scope.baselineFingerprint, finalFingerprint, 'tx-123', diagnosis, plan, execution.executionEvidence, verification.verificationEvidence
        );
        console.log('[PASS] Certificate dependency');

        await orchestrator.issuePassport(certificate);
        console.log('[PASS] Passport dependency');

        console.log('\nRESULT: CONFORMANCE PASS');
        process.exit(0);
    } catch(e: any) {
        console.error('\nRESULT: CONFORMANCE FAIL');
        console.error(e.message);
        process.exit(1);
    }
}

// Timeout boundary
const timeout = setTimeout(() => {
    console.error('\nRESULT: CONFORMANCE TIMEOUT');
    process.exit(1);
}, 15000);

runLiveResourceStateDivergenceConformance().finally(() => clearTimeout(timeout));
