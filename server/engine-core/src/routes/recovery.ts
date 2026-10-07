import { RepairPlan } from '../deise/engine/repair-engine';
import express, { Router } from 'express';
import canonicalize from 'canonicalize';
import { GlobalCapabilityRegistry } from '../deise/engine/recovery/capability-registry';
import { RecoveryOrchestrator } from '../deise/engine/recovery/recovery-orchestrator';
import { SshLiveAdapter } from '../deise/engine/adapters/ssh/ssh-live-adapter';
import { UpmExecutionGate, GatingContext } from '../upm/policy-gate';
import {
    TransactionAuthority
} from '../deise/engine/recovery/transaction-authority';
import * as crypto from 'crypto';

export const recoveryRouter = Router();
const orchestrator = new RecoveryOrchestrator();

function sha256(value: unknown): string {
    const canonical = canonicalize(value);

    if (!canonical) {
        throw new Error('CANONICALIZATION_FAILED');
    }

    return crypto
        .createHash('sha256')
        .update(canonical, 'utf8')
        .digest('hex');
}

function canonicalIntent(intent: any) {
    if (!intent?.capabilityId || !intent?.target) {
        throw new Error('INVALID_RECOVERY_INTENT');
    }

    if (!Array.isArray(intent.authorizedActions)) {
        throw new Error('INVALID_AUTHORIZED_ACTIONS');
    }

    return {
        capabilityId: intent.capabilityId,
        target: intent.target,
        repositoryPath: intent.repositoryPath,
        authorizedActions: Array.from(new Set(intent.authorizedActions.map((v: unknown) => String(v)))).sort() as string[]
    };
}

function mapPlanToIR(plan: any, target: string, repositoryPath: string): any {
    const repairs = Array.isArray(plan?.infrastructureRepairs)
        ? plan.infrastructureRepairs
        : [];

    if (repairs.length === 0) {
        throw new Error('EMPTY_EXECUTION_PLAN');
    }

    return {
        nodes: repairs.map((rep: any) => ({
            id: String(rep.id),
            type: 'recovery-operation',
            operation: rep.kind || rep.operation || null,
            resourceId: rep.resourceId || rep.targetPath || rep.id,
            resourceType: rep.resourceType || 'unknown',
            provider: rep.provider || 'unknown',
            target,
            repositoryPath,
            parameters: rep.parameters || {
                targetPath: rep.targetPath,
                content: rep.content,
                mode: rep.mode
            },
            expectedState: rep.expectedState || null,
            dependencies: Array.isArray(rep.dependencies)
                ? rep.dependencies
                : [],
            destructive: rep.destructive === true
        })),
        edges: repairs.flatMap((rep: any) =>
            (rep.dependencies || []).map((dependency: string) => ({
                from: dependency,
                to: String(rep.id)
            }))
        )
    };
}

function assertConditionalAuthorization(auth: any): void {
    if (auth.decision.status === 'ALLOW') {
        return;
    }

    // Per P0-21, we explicitly fail on ALLOW_WITH_CONDITIONS as the condition evaluator does not exist
    throw new Error('CONDITIONAL_AUTHORIZATION_REQUIRES_EXPLICIT_CONDITION_HANDLER');
}

export async function executeGovernedRecovery(
    intent: any,
    adapter: SshLiveAdapter,
    isDryRun: boolean,
    existingTxnId?: string,
    expectedRevision?: number
) {
    if (!process.env.UGONDU_UPM_SECRET) {
        throw new Error('UGONDU_UPM_SECRET missing. Policy gate failed closed.');
    }

    const pureIntent = canonicalIntent(intent);
    const canonicalIntentHash = TransactionAuthority.hashIntent(pureIntent);

    if (existingTxnId && !Number.isInteger(expectedRevision)) {
        throw new Error('EXPECTED_REVISION_REQUIRED_FOR_RESUME');
    }

    let txn = existingTxnId ? TransactionAuthority.get(existingTxnId) : TransactionAuthority.create(pureIntent);
    if (existingTxnId && !Number.isInteger(expectedRevision)) { throw new Error('EXPECTED_REVISION_REQUIRED_FOR_RESUME'); }
    const revision = existingTxnId ? expectedRevision! : txn.revision;

    if (txn.intentHash !== canonicalIntentHash) {
        throw new Error('INTENT_CRYPTOGRAPHIC_BINDING_MISMATCH');
    }

    const capability = GlobalCapabilityRegistry.getCapability(
        pureIntent.capabilityId
    );

    if (!capability) {
        throw new Error(
            `Capability ${pureIntent.capabilityId} not registered or unsupported.`
        );
    }

    if (txn.status === 'SUCCESS') {
        throw new Error('TRANSACTION_ALREADY_COMPLETE');
    }

    txn = TransactionAuthority.update(txn.id, revision, isDryRun ? {
        state: { ...txn.state }
    } : {
        status: 'RUNNING',
        state: { ...txn.state }
    });

    const scope: any = {
        resourceIdentifiers: [pureIntent.target],
        requiredProviders: [],
        expectedState: {},
        targetUri: pureIntent.target,
        tenantId: 'default',
        applicationId: 'default',
        repositoryPath: pureIntent.repositoryPath
    };

    const twin = await orchestrator.capture(adapter, scope);
    const twinHash = twin.immutableEvidenceSnapshotId || sha256(twin);

    const baselineFingerprint =
        await orchestrator.fingerprint(adapter, scope);

    scope.baselineFingerprint = baselineFingerprint;

    const diagnosis = await capability.diagnose(twin, scope);

    let plan = txn.plan as RepairPlan;
    let planHash = txn.planHash;

    if (!plan) {
        plan = await capability.plan(diagnosis, scope);
        if (!plan) {
            throw new Error('RECOVERY_PLAN_MISSING');
        }
        planHash = sha256(plan);
        
        txn = TransactionAuthority.update(txn.id, txn.revision, {
            plan,
            planHash,
            state: {
                phase: 'PLANNED',
                baselineFingerprint,
                twinHash,
                planHash
            }
        });
    } else {
        if (!planHash || planHash !== sha256(plan)) {
            throw new Error('TRANSACTION_PLAN_BINDING_BROKEN');
        }
    }

    const analysis =
        await orchestrator.analyzeBlastRadius(plan, scope);

    await orchestrator.dryRun(plan, adapter, scope);

    const ir = mapPlanToIR(
        plan,
        pureIntent.target,
        pureIntent.repositoryPath
    );

    const irHash = sha256(ir);

    const context: GatingContext = {
        intentHash: canonicalIntentHash,
        twinHash,
        ir,
        policyVersion: '1.0.0',
        envelope: {
            edition: 'enterprise',
            allowedActions: pureIntent.authorizedActions,
            tenantId: 'default'
        },
        activePolicies: []
    };

    const auth = await UpmExecutionGate.evaluate(context);

    if (
        auth.decision.status !== 'ALLOW' &&
        auth.decision.status !== 'ALLOW_WITH_CONDITIONS'
    ) {
        TransactionAuthority.update(txn.id, txn.revision, {
            status: 'FAILED',
            state: {
                phase: 'AUTHORIZATION_DENIED',
                authorization: auth
            }
        });

        throw new Error('UNAUTHORIZED');
    }

    const envelopeHash = sha256(context.envelope);
    UpmExecutionGate.verifyAuthorization(auth, ir, { intentHash: canonicalIntentHash, twinHash, envelopeHash, policyVersion: context.policyVersion });
    assertConditionalAuthorization(auth);
    await orchestrator.requestApproval(plan, analysis, auth);

    txn = TransactionAuthority.update(txn.id, txn.revision, {
        state: {
            ...txn.state,
            phase: 'AUTHORIZED',
            irHash,
            authorizationId: auth.decision.authorizationId || 'static',
            envelopeHash
        }
    });

    if (isDryRun) {
        TransactionAuthority.update(txn.id, txn.revision, {
            status: 'PENDING',
            state: {
                ...txn.state,
                phase: 'DRY_RUN_COMPLETE'
            }
        });

        return {
            status: 'PLANNED',
            transactionId: txn.id,
            canonicalIntentHash,
            planHash
        };
    }

    txn = TransactionAuthority.update(txn.id, txn.revision, {
        state: { ...txn.state, phase: 'EXECUTING' }
    });

    const execResult =
        await orchestrator.executeAtomically(plan, adapter, scope);

    if (!execResult.success) {
        TransactionAuthority.update(txn.id, txn.revision, {
            status: 'FAILED',
            executionReceipt: execResult.executionEvidence,
            state: { ...txn.state, phase: 'FAILED' }
        });

        throw new Error('ATOMIC_EXECUTION_FAILED');
    }

    txn = TransactionAuthority.update(txn.id, txn.revision, {
        state: { ...txn.state, phase: 'EXECUTED' }
    });

    txn = TransactionAuthority.update(txn.id, txn.revision, {
        state: { ...txn.state, phase: 'VERIFYING' }
    });

    const verification =
        await orchestrator.verify(
            adapter,
            scope,
            {
                host: (await adapter.identify(scope)).host,
                operations: plan.infrastructureRepairs || []
            }
        );

    if (!verification.verified) {
        TransactionAuthority.update(txn.id, txn.revision, {
            status: 'FAILED',
            state: {
                ...txn.state,
                phase: 'VERIFICATION_FAILED',
                verification
            }
        });

        throw new Error('INDEPENDENT_VERIFICATION_FAILED');
    }

    txn = TransactionAuthority.update(txn.id, txn.revision, {
        state: { ...txn.state, phase: 'VERIFIED' }
    });

    const finalFingerprint =
        await orchestrator.fingerprint(adapter, scope);

    const cert = await orchestrator.certify(
        baselineFingerprint,
        finalFingerprint,
        txn.id,
        diagnosis,
        plan,
        execResult.executionEvidence,
        verification.verificationEvidence
    );

    (cert as any).authorizationId = auth.decision.authorizationId || 'static';
    (cert as any).intentHash = canonicalIntentHash;
    (cert as any).irHash = irHash;

    const passport = await orchestrator.issuePassport(cert);

    TransactionAuthority.update(txn.id, txn.revision, {
        status: 'SUCCESS',
        executionReceipt: execResult.executionEvidence,
        certificationReceipt: {
            certificate: cert,
            passport
        },
        state: {
            ...txn.state,
            phase: 'CERTIFIED',
            baselineFingerprint,
            finalFingerprint
        }
    });

    return {
        status: 'CERTIFIED',
        transactionId: txn.id,
        canonicalIntentHash,
        planHash,
        certificate: cert,
        passport
    };
}

recoveryRouter.post(
    '/execute',
    express.json(),
    async (req, res) => {
        const {
            capability,
            target,
            dry_run,
            authorizedActions,
            transactionId,
            expectedRevision
        } = req.body;

        try {
            if (
                typeof capability !== 'string' ||
                typeof target !== 'string'
            ) {
                return res.status(400).json({
                    status: 'FAILED',
                    message: 'capability and target are required'
                });
            }

            const repositoryPath = req.body.repositoryPath;

            if (typeof repositoryPath !== 'string' || !repositoryPath) {
                return res.status(400).json({
                    status: 'FAILED',
                    message: 'repositoryPath is required'
                });
            }

            const intent = {
                capabilityId: capability,
                target,
                repositoryPath,
                authorizedActions: authorizedActions || []
            };

            const result = await executeGovernedRecovery(
                intent,
                new SshLiveAdapter(),
                !!dry_run,
                transactionId,
                expectedRevision
            );

            return res.json(result);
        } catch (error: any) {
            return res.status(500).json({
                status: 'FAILED',
                message: error?.message || 'Recovery failed'
            });
        }
    }
);










