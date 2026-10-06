import express, { Router } from 'express';
import { GlobalCapabilityRegistry } from '../deise/engine/recovery/capability-registry';

export const recoveryRouter = Router();

// API endpoint for CLI
recoveryRouter.post('/execute', async (req, res) => {
    const { capability, target, dry_run } = req.body;
    
    if (!capability) {
        return res.status(400).json({ status: 'ERROR', message: 'Capability ID is required' });
    }

    const cap = GlobalCapabilityRegistry.getCapability(capability);
    if (!cap) {
        // According to invariant, if it's not implemented, it should return 404 or unsupported
        return res.status(404).json({ status: 'UNSUPPORTED', message: `Capability ${capability} not registered or unsupported.` });
    }

    // Stub environment twin and scope for now, in reality this invokes the Orchestrator
    const stubScope = { resourceIdentifiers: [target || 'auto'], requiredProviders: [], expectedState: {} };
    const stubTwin = {
        provider: { platform: 'unknown' },
        topology: { currentSymlinkValid: false, webrootPath: '', webrootSymlinkTarget: null, availableReleases: [] },
        application: { version: '1.0', manifests: [], integrityStatus: 'MISSING' as const },
        runtime: { primaryRuntime: 'unknown', primaryRuntimeVersion: 'unknown', missingDependencies: [] }
    };

    try {
        const diagnosis = await cap.diagnose(stubTwin, stubScope);
        const plan = await cap.plan(diagnosis, stubScope);
        
        if (dry_run) {
            return res.json({ status: 'PLANNED', message: 'Dry run completed', evidence: JSON.stringify(plan) });
        }

        // We use a stub adapter here that just logs
        const stubAdapter = {
            executeCommand: async (cmd: string) => { console.log(`[Adapter Exec] ${cmd}`); }
        };

        await cap.execute(plan, stubAdapter, stubScope);
        
        return res.json({ status: 'EXECUTED', message: 'Capability executed successfully', transactionId: `txn-${Date.now()}` });
    } catch (e: any) {
        return res.status(500).json({ status: 'FAILED', message: e.message });
    }
});

// UI surface for Manual Operator
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

    const html = `
        <!DOCTYPE html>
        <html>
        <head><title>Ugondu Recovery UI</title></head>
        <body style="font-family: sans-serif; padding: 20px;">
            <h1>Universal Recovery Dashboard</h1>
            <p>Governed UI Surface for Universal Resource Contract Capabilities</p>
            ${capabilitiesHtml}
        </body>
        </html>
    `;
    res.send(html);
});

// Form submission endpoint from UI
recoveryRouter.post('/execute-form', express.urlencoded({ extended: true }), async (req, res) => {
    const { capability, target, dry_run } = req.body;
    
    // Convert to API format and redirect or render result
    const isDryRun = dry_run === 'true';
    const cap = GlobalCapabilityRegistry.getCapability(capability);
    
    if (!cap) {
        return res.status(404).send(`<h1>Error</h1><p>Capability ${capability} not registered.</p><a href="/v1/recovery/ui">Back</a>`);
    }

    try {
        const stubScope = { resourceIdentifiers: [target || 'auto'], requiredProviders: [], expectedState: {} };
        const stubTwin = {
            provider: { platform: 'unknown' },
            topology: { currentSymlinkValid: false, webrootPath: '', webrootSymlinkTarget: null, availableReleases: [] },
            application: { version: '1.0', manifests: [], integrityStatus: 'MISSING' as const },
            runtime: { primaryRuntime: 'unknown', primaryRuntimeVersion: 'unknown', missingDependencies: [] }
        };

        const diagnosis = await cap.diagnose(stubTwin, stubScope);
        const plan = await cap.plan(diagnosis, stubScope);
        
        if (isDryRun) {
            return res.send(`<h1>Dry Run Completed</h1><pre>${JSON.stringify(plan, null, 2)}</pre><a href="/v1/recovery/ui">Back</a>`);
        }

        const stubAdapter = {
            executeCommand: async (cmd: string) => { console.log(`[Adapter Exec] ${cmd}`); }
        };

        await cap.execute(plan, stubAdapter, stubScope);
        return res.send(`<h1>Execution Completed</h1><p>Successfully executed ${capability} against ${target}.</p><a href="/v1/recovery/ui">Back</a>`);
    } catch (e: any) {
        return res.status(500).send(`<h1>Execution Failed</h1><p>${e.message}</p><a href="/v1/recovery/ui">Back</a>`);
    }
});
