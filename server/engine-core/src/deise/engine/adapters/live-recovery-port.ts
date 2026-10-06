import { EnvironmentTwin } from '../../twin/environment-twin';
import { DiagnosisPlan } from '../../engine/repair-engine';

export interface LiveEnvironmentAdapter {
    identify(): Promise<string>;
    captureState(): Promise<EnvironmentTwin>;
    fingerprintRepository(): Promise<string>;
    
    // Abstracted executions representing underlying capabilities
    executeAtomicRecovery(plan: DiagnosisPlan): Promise<boolean>;
    verifyState(): Promise<boolean>;
}

export interface LiveEnvironmentRecoveryEngine {
    discover(targetUri: string): Promise<LiveEnvironmentAdapter>;
    capture(adapter: LiveEnvironmentAdapter): Promise<EnvironmentTwin>;
    fingerprint(adapter: LiveEnvironmentAdapter): Promise<string>;
    diagnose(twin: EnvironmentTwin): Promise<DiagnosisPlan>;
    generateRecoveryPlan(diagnosis: DiagnosisPlan): Promise<any>;
    analyzeBlastRadius(plan: any): Promise<{ safe: boolean; dependencies: string[] }>;
    dryRun(plan: any, adapter: LiveEnvironmentAdapter): Promise<boolean>;
    requestApproval(plan: any, analysis: any): Promise<boolean>;
    executeAtomically(plan: any, adapter: LiveEnvironmentAdapter): Promise<boolean>;
    verify(adapter: LiveEnvironmentAdapter): Promise<boolean>;
    certify(): Promise<string>;
    issuePassport(certId: string): Promise<any>;
}
