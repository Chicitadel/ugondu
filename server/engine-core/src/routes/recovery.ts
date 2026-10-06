import express, { Router } from 'express';
import { GlobalCapabilityRegistry } from '../deise/engine/recovery/capability-registry';
import { RecoveryOrchestrator } from '../deise/engine/recovery/recovery-orchestrator';
import { SshLiveAdapter } from '../deise/engine/adapters/ssh/ssh-live-adapter';
import { __t } from '@ugondu/shared';

export const recoveryRouter = Router();
const orchestrator = new RecoveryOrchestrator();

async function executeGovernedRecovery(capabilityId: string, target: string, isDryRun: boolean) {
    const cap = GlobalCapabilityRegistry.getCapability(capabilityId);
    if (!cap) throw new Error(`Capability ${capabilityId} not registered or unsupported.`);
    
    // Real Governed Execution Pathway
    const adapter = new SshLiveAdapter();
    const scope = { resourceIdentifiers: [target || 'auto'], requiredProviders: [], expectedState: {} };
    
    // Perform real environment capture
    const twin = await orchestrator.capture(adapter, scope);
    
    const diagnosis = await cap.diagnose(twin, scope);
    const plan = await cap.plan(diagnosis, scope);
    
    if (isDryRun) return { status: 'PLANNED', plan };
    
    await cap.execute(plan, adapter, scope);
    return { status: 'EXECUTED', transactionId: `txn-${Date.now()}`, plan };
}

recoveryRouter.post('/execute', async (req, res) => {
    const { capability, target, dry_run } = req.body;
    if (!capability) return res.status(400).json({ status: 'ERROR', message: 'capability required' });
    try {
        const result = await executeGovernedRecovery(capability, target, !!dry_run);
        if (dry_run) { return res.json({ status: 'PLANNED', message: 'Dry run', evidence: JSON.stringify(result.plan) }); }
        return res.json({ status: 'EXECUTED', message: 'Success', transactionId: result.transactionId });
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
    const isDryRun = dry_run === 'true';
    try {
        const result = await executeGovernedRecovery(capability, target, isDryRun);
        if (isDryRun) { return res.send(`<h1>Dry Run Completed</h1><pre>${JSON.stringify(result.plan, null, 2)}</pre><a href="/v1/recovery/ui">Back</a>`); }
        return res.send(`<h1>Execution Completed</h1><p>Successfully executed against target.</p><a href="/v1/recovery/ui">Back</a>`);
    } catch (e: any) {
        return res.status(500).send(`<h1>Execution Failed</h1><p>${e.message}</p><a href="/v1/recovery/ui">Back</a>`);
    }
});
