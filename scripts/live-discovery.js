require('ts-node').register();
const { RecoveryOrchestrator } = require('../server/engine-core/src/deise/engine/recovery/recovery-orchestrator');
const { DirectAdminLiveAdapter } = require('../server/engine-core/src/deise/engine/adapters/directadmin/directadmin-live-adapter');

async function runLiveDiscovery() {
    console.log('UGONDU LIVE DISCOVERY GATE (LR-01 - LR-03)');
    console.log('==========================================');

    const url = process.env.DA_API_URL;
    const token = process.env.DA_API_TOKEN;
    const targetDomain = process.env.DA_TARGET_DOMAIN || 'api.airroofers.eu';

    if (!url || !token) {
        console.error('BLOCKED: Live Discovery requires DA_API_URL and DA_API_TOKEN in environment.');
        console.error('Please configure your .env file or export the variables.');
        process.exit(1);
    }

    const orchestrator = new RecoveryOrchestrator();
    const adapter = new DirectAdminLiveAdapter();

    const scope = {
        targetUri: \directadmin://\\,
        tenantId: targetDomain,
        applicationId: 'air-roofers-federated',
        repositoryPath: \/domains/\/public_html\,
        resourceIdentifiers: [\domain:\\]
    };

    const scopedCredentials = { url, directAdminToken: token };

    try {
        console.log('[LR-01] Authenticating read-only boundary...');
        await adapter.identify(scope, scopedCredentials);
        console.log('        Authentication successful.');

        console.log('\n[LR-02] Capturing Real Environment Twin...');
        const twin = await orchestrator.capture(adapter, scope);
        console.log('        Immutable Snapshot ID:', twin.immutableEvidenceSnapshotId);

        console.log('\n[LR-03] Deriving Scope from Resource Graph...');
        console.log('        Discovered Edges:');
        for (const edge of twin.resourceGraphEdges || []) {
            console.log(\          - \ --[\]--> \\);
        }
        
        console.log('\n[GATE]  DNS Raw Output Snippet:');
        if (twin.dnsInventory && twin.dnsInventory.raw) {
            console.log(twin.dnsInventory.raw.substring(0, 200) + '...');
        } else {
            console.log('        No DNS payload returned.');
        }

        console.log('\nLive Discovery Completed Successfully.');
        
    } catch (e) {
        console.error('\nFATAL ERROR during Live Discovery:');
        console.error(e.message);
        process.exit(1);
    }
}

runLiveDiscovery();
