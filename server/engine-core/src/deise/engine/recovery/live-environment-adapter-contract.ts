import { EnvironmentTwin } from '../../twin/environment-twin';
import { DiagnosisPlan } from '../repair-engine';

export interface RecoveryScope {
    targetUri: string;
    tenantId: string;
    applicationId: string;
    repositoryPath: string;
    resourceIdentifiers: string[];
    baselineFingerprint?: string;
}

export interface LiveEnvironmentAdapterContract {
    /**
     * Authenticate and identify the target strictly using capability-scoped credentials.
     */
    identify(scope: RecoveryScope, scopedCredentials: any): Promise<string>;

    /**
     * Produce an immutable content-addressed baseline snapshot.
     */
    captureState(scope: RecoveryScope): Promise<EnvironmentTwin>;

    /**
     * Produce an exact cryptographic fingerprint of the target repository and declared scope.
     */
    fingerprintRepository(scope: RecoveryScope): Promise<string>;
    
    /**
     * Re-fingerprint immediately before mutation to detect drift.
     */
    checkDrift(scope: RecoveryScope, baselineFingerprint: string): Promise<boolean>;

    /**
     * Dry run without mutation: calculate exact filesystem/database/configuration/DNS changes.
     */
    dryRun(plan: DiagnosisPlan, scope: RecoveryScope): Promise<{ plannedMutations: any[], safe: boolean }>;

    /**
     * Execute mutations with compensating transactions and checkpoints.
     */
    executeAtomicRecovery(plan: DiagnosisPlan, scope: RecoveryScope): Promise<{ success: boolean, checkpointId: string, evidence: any[] }>;

    /**
     * Trigger compensating transactions if atomic execution fails.
     */
    rollback(checkpointId: string): Promise<boolean>;

    /**
     * Independent verification.
     */
    verifyState(scope: RecoveryScope, expectedState: any): Promise<{ verified: boolean, actualState: any, verificationEvidence: any }>;
}
