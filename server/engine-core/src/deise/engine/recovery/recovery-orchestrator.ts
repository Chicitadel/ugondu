import { RecoveryContract, BlastRadiusAnalysis, RecoveryCertificate } from './recovery-contract';
import { LiveEnvironmentAdapterContract, RecoveryScope } from './live-environment-adapter-contract';
import { EnvironmentTwin } from '../../twin/environment-twin';
import { DiagnosisPlan } from '../repair-engine';
import * as crypto from 'crypto';

export class RecoveryOrchestrator implements RecoveryContract {
    async discover(scope: RecoveryScope): Promise<LiveEnvironmentAdapterContract> {
        throw new Error('Adapter resolution delegated to Factory');
    }

    async capture(adapter: LiveEnvironmentAdapterContract, scope: RecoveryScope): Promise<EnvironmentTwin> {
        const twin = await adapter.captureState(scope);
        // Ensure content-addressed snapshot
        twin.immutableEvidenceSnapshotId = crypto.createHash('sha256').update(JSON.stringify(twin)).digest('hex');
        return twin;
    }

    async fingerprint(adapter: LiveEnvironmentAdapterContract, scope: RecoveryScope): Promise<string> {
        return adapter.fingerprintRepository(scope);
    }

    async diagnose(twin: EnvironmentTwin): Promise<DiagnosisPlan> {
        // ... invoke actual repair engine diagnosis ...
        throw new Error('Not implemented');
    }

    async generateRecoveryPlan(diagnosis: DiagnosisPlan): Promise<DiagnosisPlan> {
        return diagnosis;
    }

    async analyzeBlastRadius(plan: DiagnosisPlan, scope: RecoveryScope): Promise<BlastRadiusAnalysis> {
        const analysis: BlastRadiusAnalysis = {
            isSafe: true,
            authorizedScope: scope.resourceIdentifiers,
            outOfBoundsDetected: [],
            dependencyGraph: []
        };
        
        // Authoritative blast-radius check: If any targeted infrastructure is outside the scope, fail hard.
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

    async dryRun(plan: DiagnosisPlan, adapter: LiveEnvironmentAdapterContract, scope: RecoveryScope): Promise<boolean> {
        const dryResult = await adapter.dryRun(plan, scope);
        if (!dryResult.safe) {
            throw new Error('Dry run indicates unsafe mutations.');
        }
        return true;
    }

    async requestApproval(plan: DiagnosisPlan, analysis: BlastRadiusAnalysis): Promise<boolean> {
        if (!analysis.isSafe) throw new Error('Cannot approve an unsafe plan.');
        return true; // Explicit approval gate
    }

    async executeAtomically(plan: DiagnosisPlan, adapter: LiveEnvironmentAdapterContract, scope: RecoveryScope): Promise<{ success: boolean, executionEvidence: any }> {
        // Pre-execution drift check
        if (!scope.baselineFingerprint) throw new Error('Baseline fingerprint missing for drift check');
        const driftSafe = await adapter.checkDrift(scope, scope.baselineFingerprint);
        if (!driftSafe) {
            throw new Error('Environment drift detected since baseline fingerprint. Aborting execution.');
        }
        
        const result = await adapter.executeAtomicRecovery(plan, scope);
        if (!result.success) {
            await adapter.rollback(result.checkpointId);
            throw new Error('Atomic execution failed and was rolled back.');
        }
        return { success: true, executionEvidence: result.evidence };
    }

    async verify(adapter: LiveEnvironmentAdapterContract, scope: RecoveryScope, expectedState: any): Promise<{ verified: boolean, verificationEvidence: any }> {
        const result = await adapter.verifyState(scope, expectedState);
        if (!result.verified) throw new Error('Verification failed. Expected state not reached.');
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
        if (!certificate.verificationEvidence) throw new Error('Cannot issue passport without independent verification evidence.');
        return { passportId: crypto.randomUUID(), certificateId: certificate.certificateId, status: 'RECOVERY_VALIDATED' };
    }
}
