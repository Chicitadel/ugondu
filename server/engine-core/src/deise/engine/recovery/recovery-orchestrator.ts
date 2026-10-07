import { RecoveryContract, BlastRadiusAnalysis, RecoveryCertificate } from './recovery-contract';
import { LiveEnvironmentAdapterContract, RecoveryScope } from './live-environment-adapter-contract';
import { EnvironmentTwin } from '../../twin/environment-twin';
import { RepairPlan } from '../repair-engine';
import { __t } from '@ugondu/shared';
import * as crypto from 'crypto';
import { TransactionAuthority } from './transaction-authority';

export class RecoveryOrchestrator implements RecoveryContract {
    

    async capture(adapter: LiveEnvironmentAdapterContract, scope: RecoveryScope): Promise<EnvironmentTwin> {
        const twin = await adapter.captureState(scope);
        // Ensure content-addressed snapshot
        twin.immutableEvidenceSnapshotId = crypto.createHash('sha256').update(JSON.stringify(twin)).digest('hex');
        return twin;
    }

    async fingerprint(adapter: LiveEnvironmentAdapterContract, scope: RecoveryScope): Promise<string> {
        return adapter.fingerprintRepository(scope);
    }

    

    async generateRecoveryPlan(diagnosis: RepairPlan): Promise<RepairPlan> {
        return diagnosis;
    }

    async analyzeBlastRadius(plan: RepairPlan, scope: RecoveryScope): Promise<BlastRadiusAnalysis> {
        const analysis: BlastRadiusAnalysis = {
            isSafe: true,
            authorizedScope: scope.resourceIdentifiers,
            outOfBoundsDetected: [],
            dependencyGraph: []
        };
        
        if (plan.infrastructureRepairs) {
            for (const repair of plan.infrastructureRepairs) {
                if (!scope.resourceIdentifiers.includes(repair.id)) {
                    analysis.isSafe = false;
                    analysis.outOfBoundsDetected.push(repair.id);
                }
            }
        }
        
        if (!analysis.isSafe) {
            throw new Error(`Blast Radius Violation: Plan attempts to mutate out-of-bounds resources: ${analysis.outOfBoundsDetected.join(', ')}`);
        }
        return analysis;
    }

    async dryRun(plan: RepairPlan, adapter: LiveEnvironmentAdapterContract, scope: RecoveryScope): Promise<{ success: boolean; resourceChanges: any[]; risk: string; blastRadius: string[]; rollback: string[] }> {
        const dryResult = await adapter.dryRun(plan, scope);
        if (!dryResult.safe) {
            throw new Error(__t('dry_run_indicates_unsafe_mutat'));
        }
        return { success: true, resourceChanges: [], risk: 'LOW', blastRadius: [], rollback: [] };
    }

    async requestApproval(plan: RepairPlan, analysis: BlastRadiusAnalysis, auth?: any): Promise<boolean> {
        if (!analysis.isSafe) throw new Error(__t('cannot_approve_an_unsafe_plan'));
        if (!auth) throw new Error('Unconditional approval disabled: missing explicit authorization constraint.');
        if (auth.decision.status !== 'ALLOW' && auth.decision.status !== 'ALLOW_WITH_CONDITIONS') {
            throw new Error('Authorization denied.');
        }
        return { success: true, resourceChanges: [], risk: 'LOW', blastRadius: [], rollback: [] };
    }

    async executeAtomically(plan: RepairPlan, adapter: LiveEnvironmentAdapterContract, scope: RecoveryScope): Promise<{ success: boolean, executionEvidence: any }> {
        if (!scope.baselineFingerprint) throw new Error(__t('baseline_fingerprint_missing_f'));
        const driftSafe = await adapter.checkDrift(scope, scope.baselineFingerprint);
        if (!driftSafe) {
            throw new Error('environment_drift_detected');
        }
        
        const tx = await TransactionAuthority.create({
            capabilityId: 'recovery-execution', target: 'live-environment', repositoryPath: 'recovery', authorizedActions: ['UPDATE']
        });
        
        try {
            await TransactionAuthority.update(tx.id, tx.revision, { status: 'RUNNING' });
            const result = await adapter.executeAtomicRecovery(plan, scope);
            if (!result.success) {
                await adapter.rollback(result.checkpointId);
                await TransactionAuthority.update(tx.id, tx.revision + 1, { status: 'FAILED' });
                throw new Error(__t('atomic_execution_failed_and_wa'));
            }
            await TransactionAuthority.update(tx.id, tx.revision + 1, { status: 'SUCCESS' });
            return { success: true, executionEvidence: result.evidence };
        } catch (e) {
            await TransactionAuthority.update(tx.id, tx.revision + 1, { status: 'FAILED' });
            throw e;
        }
    }

    async verify(adapter: LiveEnvironmentAdapterContract, scope: RecoveryScope, expectedState: any): Promise<{ verified: boolean, verificationEvidence: any }> {
        if (typeof adapter.verifyState !== 'function') throw new Error('INDEPENDENT_VERIFICATION_UNSUPPORTED');
        const result = await adapter.verifyState(scope, expectedState);
        if (!result.verified) throw new Error(__t('verification_failed_expected_s'));
        return result;
    }

    async certify(baselineFingerprint: string, finalFingerprint: string, txId: string, diagnosis: any, plan: any, mutEv: any, verEv: any): Promise<RecoveryCertificate> {
        return {
            certificateId: crypto.randomUUID(),
            baselineFingerprint,
            finalFingerprint,
            transactionId: txId,
            diagnosisDigest: crypto.createHash('sha256').update(JSON.stringify(diagnosis)).digest('hex'),
            approvedPlanDigest: crypto.createHash('sha256').update(JSON.stringify(plan)).digest('hex'),
            mutationEvidence: mutEv,
            verificationEvidence: verEv,
            adapterVersion: '1.0.0',
            policyVersions: { 'live-recovery-invariants': '1.0.0' },
            timestamp: new Date().toISOString()
        };
    }

    async issuePassport(certificate: RecoveryCertificate): Promise<any> {
        if (!certificate.verificationEvidence) throw new Error(__t('cannot_issue_passport_without_'));
        return { passportId: crypto.randomUUID(), certificateId: certificate.certificateId, status: 'RECOVERY_VALIDATED' };
    }
}

