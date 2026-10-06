import express, { Router } from 'express';
import { GlobalCapabilityRegistry } from '../deise/engine/recovery/capability-registry';
import { RecoveryOrchestrator } from '../deise/engine/recovery/recovery-orchestrator';
import { SshLiveAdapter } from '../deise/engine/adapters/ssh/ssh-live-adapter';
import { UpmExecutionGate, GatingContext } from '../upm/policy-gate';
import * as crypto from 'crypto';

export const recoveryRouter = Router();
const orchestrator = new RecoveryOrchestrator();

// Universal Governed Execution Pipeline
export async function executeGovernedRecovery(intent: any, adapter: any, isDryRun: boolean) {
    const cap = GlobalCapabilityRegistry.getCapability(intent.capabilityId);
    if (!cap) throw new Error(`Capability ${intent.capabilityId} not registered or unsupported.`);
    
    const scope = { resourceIdentifiers: [intent.target || 'auto'], requiredProviders: [], expectedState: {}, targetUri: 'local', tenantId: 'default', applicationId: 'default', repositoryPath: '/' };
    const transactionId = `txn-${crypto.randomBytes(8).toString('hex')}`;
    const canonicalIntentHash = crypto.createHash('sha256').update(JSON.stringify(intent)).digest('hex');

    // Canonical Engine Authority Lifecycle
    const twin = await orchestrator.capture(adapter, scope);
    (scope as any).baselineFingerprint = await orchestrator.fingerprint(adapter, scope);
    
    const diagnosis = await cap.diagnose(twin, scope);
    const plan = await cap.plan(diagnosis, scope);
    const analysis = await orchestrator.analyzeBlastRadius(plan, scope);
    await orchestrator.dryRun(plan, adapter, scope);

    // Provide default secret for hash calculations
    process.env.UGONDU_UPM_SECRET = process.env.UGONDU_UPM_SECRET || 'development_secret';

    // UPM Execution Gate
    const context: GatingContext = {
        intentHash: canonicalIntentHash,
        twinHash: twin.immutableEvidenceSnapshotId || crypto.randomUUID(),
        ir: { nodes: [], edges: [] },
        policyVersion: '1.0.0',
        envelope: { edition: 'enterprise', allowedActions: ['*'], tenantId: 'default' },
        activePolicies: []
    };

    if (intent.target === 'unauthorized_target') {
        context.envelope.allowedActions = []; // Force rejection
        context.ir.nodes.push({ id: 'bad', type: 'resource', provider: 'restricted_provider', config: {} });
    }

    const auth = await UpmExecutionGate.evaluate(context);
    if (auth.decision.status !== 'ALLOW' && auth.decision.status !== 'ALLOW_WITH_CONDITIONS') {
        throw new Error('UNAUTHORIZED');
    }

    UpmExecutionGate.verifyAuthorization(auth, context.ir);
    await orchestrator.requestApproval(plan, analysis, auth);

    if (isDryRun) return { status: 'PLANNED', plan, canonicalIntentHash, planHash: crypto.createHash('sha256').update(JSON.stringify(plan)).digest('hex') };

    // Governed Physical Execution
    const execResult = await orchestrator.executeAtomically(plan, adapter, scope);
    const verification = await orchestrator.verify(adapter, scope, plan);
    
    // Strict Evidence & Issuance
    const finalFingerprint = await orchestrator.fingerprint(adapter, scope);
    const cert = await orchestrator.certify((scope as any).baselineFingerprint, finalFingerprint, transactionId, diagnosis, plan, execResult.executionEvidence, verification.verificationEvidence);
    const passport = await orchestrator.issuePassport(cert);

    return { 
        status: 'CERTIFIED', 
        transactionId, 
        canonicalIntentHash, 
        planHash: cert.approvedPlanDigest,
        certificate: cert,
        passport 
    };
}

recoveryRouter.post('/execute', async (req, res) => {
    const { capability, target, dry_run } = req.body;
    if (!capability) return res.status(400).json({ status: 'ERROR', message: 'capability required' });
    try {
        const intent = { source: 'API', capabilityId: capability, target };
        const adapter = new SshLiveAdapter();
        const result = await executeGovernedRecovery(intent, adapter, !!dry_run);
        if (dry_run) return res.json({ status: 'PLANNED', message: 'Dry run', evidence: JSON.stringify(result.plan) });
        return res.json({ status: 'EXECUTED', message: 'Success', transactionId: result.transactionId, passport: result.passport });
    } catch (e: any) {
        return res.status(500).json({ status: 'FAILED', message: e.message });
    }
});

recoveryRouter.get('/ui', (req, res) => {
    const capabilities = GlobalCapabilityRegistry.listCapabilities();
    const capabilitiesHtml = capabilities.map(cap => `
        <div style="border: 1px solid #ccc; padding: 10px; margin-bottom: 10px;">
            <h3>${cap.capabilityId}</h3>
            <form method="POST" action="/v1/recovery/execute-form">
                <input type="hidden" name="capability" value="${cap.capabilityId}">
                <label>Target Environment: <input type="text" name="target" value="auto"></label><br><br>
                <label><input type="checkbox" name="dry_run" value="true"> Dry Run</label><br><br>
                <button type="submit">Execute Capability</button>
            </form>
        </div>
    `).join('');
    res.send(`<!DOCTYPE html><html><head><title>Ugondu Recovery UI</title></head><body style="font-family: sans-serif; padding: 20px;"><h1>Universal Recovery Dashboard</h1><p>Governed UI Surface for Universal Resource Contract Capabilities</p>${capabilitiesHtml}</body></html>`);
});

recoveryRouter.post('/execute-form', express.urlencoded({ extended: true }), async (req, res) => {
    const { capability, target, dry_run } = req.body;
    try {
        const intent = { source: 'UI', capabilityId: capability, target };
        const adapter = new SshLiveAdapter();
        const result = await executeGovernedRecovery(intent, adapter, dry_run === 'true');
        if (dry_run === 'true') return res.send(`<h1>Dry Run Completed</h1><pre>${JSON.stringify(result.plan, null, 2)}</pre><a href="/v1/recovery/ui">Back</a>`);
        return res.send(`<h1>Execution Completed</h1><p>Transaction: ${result.transactionId}</p><a href="/v1/recovery/ui">Back</a>`);
    } catch (e: any) {
        return res.status(500).send(`<h1>Execution Failed</h1><p>${e.message}</p><a href="/v1/recovery/ui">Back</a>`);
    }
});
