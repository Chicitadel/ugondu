import express, { Router } from 'express';
import { GlobalCapabilityRegistry } from '../deise/engine/recovery/capability-registry';
import { RecoveryOrchestrator } from '../deise/engine/recovery/recovery-orchestrator';
import { SshLiveAdapter } from '../deise/engine/adapters/ssh/ssh-live-adapter';
import { UpmExecutionGate, GatingContext } from '../upm/policy-gate';
import { TransactionAuthority } from '../deise/engine/recovery/transaction-authority';
import * as crypto from 'crypto';

export const recoveryRouter = Router();
const orchestrator = new RecoveryOrchestrator();

function mapPlanToIR(plan: any): any {
    const nodes = [];
    if (plan && plan.infrastructureRepairs) {
        for (const rep of plan.infrastructureRepairs) {
            nodes.push({ id: rep.id, type: 'resource', provider: rep.provider || 'unknown', config: {} });
        }
    }
    return { nodes, edges: [] };
}

export async function executeGovernedRecovery(intent: any, adapter: any, isDryRun: boolean, existingTxnId?: string) {
    if (!process.env.UGONDU_UPM_SECRET) {
        throw new Error('UGONDU_UPM_SECRET missing. Policy gate failed closed.');
    }

    const canonicalIntentHash = crypto.createHash('sha256').update(JSON.stringify(intent)).digest('hex');
    if (existingTxnId) { const existingTxn = TransactionAuthority.get(existingTxnId); if (existingTxn.intentHash !== canonicalIntentHash) throw new Error('Intent cryptographic binding mismatch on resume'); }
    const cap = GlobalCapabilityRegistry.getCapability(intent.capabilityId);
    if (!cap) throw new Error(`Capability ${intent.capabilityId} not registered or unsupported.`);
    
    const txn = existingTxnId ? TransactionAuthority.get(existingTxnId) : TransactionAuthority.create(intent);
    TransactionAuthority.update(txn.id, { status: 'RUNNING' });

    const scope = { resourceIdentifiers: [intent.target || 'auto'], requiredProviders: [], expectedState: {}, targetUri: 'local', tenantId: 'default', applicationId: 'default', repositoryPath: '/' };
    const twin = await orchestrator.capture(adapter, scope);
    (scope as any).baselineFingerprint = await orchestrator.fingerprint(adapter, scope);
    
    const diagnosis = await cap.diagnose(twin, scope);
    const plan = txn.plan || await cap.plan(diagnosis, scope);
    TransactionAuthority.update(txn.id, { plan });

    const analysis = await orchestrator.analyzeBlastRadius(plan, scope);
    await orchestrator.dryRun(plan, adapter, scope);

    const context: GatingContext = {
        intentHash: canonicalIntentHash,
        twinHash: twin.immutableEvidenceSnapshotId || crypto.randomUUID(),
        ir: mapPlanToIR(plan),
        policyVersion: '1.0.0',
        envelope: { edition: 'enterprise', allowedActions: intent.authorizedActions || [], tenantId: 'default' },
        activePolicies: []
    };

    const auth = await UpmExecutionGate.evaluate(context);
    if (auth.decision.status !== 'ALLOW' && auth.decision.status !== 'ALLOW_WITH_CONDITIONS') {
        TransactionAuthority.update(txn.id, { status: 'FAILED' });
        throw new Error('UNAUTHORIZED');
    }

    UpmExecutionGate.verifyAuthorization(auth, context.ir);
    await orchestrator.requestApproval(plan, analysis, auth);

    if (isDryRun) {
        TransactionAuthority.update(txn.id, { status: 'PENDING' });
        return { status: 'PLANNED', plan, transactionId: txn.id, canonicalIntentHash, planHash: crypto.createHash('sha256').update(JSON.stringify(plan)).digest('hex') };
    }

    const execResult = await orchestrator.executeAtomically(plan, adapter, scope);
    const verification = await orchestrator.verify(adapter, scope, plan);
    
    const finalFingerprint = await orchestrator.fingerprint(adapter, scope);
    const cert = await orchestrator.certify((scope as any).baselineFingerprint, finalFingerprint, txn.id, diagnosis, plan, execResult.executionEvidence, verification.verificationEvidence);
    const passport = await orchestrator.issuePassport(cert);

    TransactionAuthority.update(txn.id, { status: 'SUCCESS' });
    return { 
        status: 'CERTIFIED', 
        transactionId: txn.id, 
        canonicalIntentHash, 
        planHash: cert.approvedPlanDigest,
        certificate: cert,
        passport 
    };
}

recoveryRouter.post('/execute', express.json(), async (req, res) => {
    const { capability, target, dry_run, authorizedActions, transactionId } = req.body;
    try {
        const intent = { source: 'API', capabilityId: capability, target, authorizedActions: authorizedActions || [] };
        const adapter = new SshLiveAdapter();
        const result = await executeGovernedRecovery(intent, adapter, !!dry_run, transactionId);
        return res.json(result);
    } catch (e: any) {
        return res.status(500).json({ status: 'FAILED', message: e.message });
    }
});


