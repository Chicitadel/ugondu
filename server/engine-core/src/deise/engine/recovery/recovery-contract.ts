import { LiveEnvironmentAdapterContract, RecoveryScope } from './live-environment-adapter-contract';
import { EnvironmentTwin } from '../../twin/environment-twin';
import { RepairPlan } from '../repair-engine';

export interface BlastRadiusAnalysis {
    isSafe: boolean;
    authorizedScope: string[];
    outOfBoundsDetected: string[];
    dependencyGraph: string[];
}

export interface RecoveryCertificate {
    certificateId: string;
    baselineFingerprint: string;
    finalFingerprint: string;
    transactionId: string;
    diagnosisDigest: string;
    approvedPlanDigest: string;
    mutationEvidence: any;
    verificationEvidence: any;
    adapterVersion: string;
    policyVersions: Record<string, string>;
    timestamp: string;
}

export interface RecoveryContract {
    
    capture(adapter: LiveEnvironmentAdapterContract, scope: RecoveryScope): Promise<EnvironmentTwin>;
    
    fingerprint(adapter: LiveEnvironmentAdapterContract, scope: RecoveryScope): Promise<string>;
    
    generateRecoveryPlan(diagnosis: RepairPlan): Promise<RepairPlan>;
    
    analyzeBlastRadius(plan: RepairPlan, scope: RecoveryScope): Promise<BlastRadiusAnalysis>;
    
    dryRun(plan: RepairPlan, adapter: LiveEnvironmentAdapterContract, scope: RecoveryScope): Promise<{ success: boolean; resourceChanges: any[]; risk: string; blastRadius: string[]; rollback: string[] }>;
    
    requestApproval(plan: RepairPlan, analysis: BlastRadiusAnalysis): Promise<boolean>;
    
    executeAtomically(plan: RepairPlan, adapter: LiveEnvironmentAdapterContract, scope: RecoveryScope): Promise<{ success: boolean, executionEvidence: any }>;
    
    verify(adapter: LiveEnvironmentAdapterContract, scope: RecoveryScope, expectedState: any): Promise<{ verified: boolean, verificationEvidence: any }>;
    
    certify(baselineFingerprint: string, finalFingerprint: string, txId: string, diagnosis: any, plan: any, mutEv: any, verEv: any): Promise<RecoveryCertificate>;
    
    issuePassport(certificate: RecoveryCertificate): Promise<any>;
}

