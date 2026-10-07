import os
import re

file_path = "server/engine-core/src/deise/engine/recovery/recovery-orchestrator.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    "dryRun(plan: RepairPlan, adapter: LiveEnvironmentAdapterContract, scope: RecoveryScope): Promise<boolean>",
    "dryRun(plan: RepairPlan, adapter: LiveEnvironmentAdapterContract, scope: RecoveryScope): Promise<{ success: boolean; resourceChanges: any[]; risk: string; blastRadius: string[]; rollback: string[] }>"
)
content = content.replace(
    "return true;",
    "return { success: true, resourceChanges: [], risk: 'LOW', blastRadius: [], rollback: [] };"
)

# And integrate TransactionAuthority
content = content.replace("import * as crypto from 'crypto';", "import * as crypto from 'crypto';\nimport { TransactionAuthority } from './transaction-authority';")

# Replace executeAtomically
old_exec = """    async executeAtomically(plan: RepairPlan, adapter: LiveEnvironmentAdapterContract, scope: RecoveryScope): Promise<{ success: boolean, executionEvidence: any }> {
        if (!scope.baselineFingerprint) throw new Error(__t('baseline_fingerprint_missing_f'));
        const driftSafe = await adapter.checkDrift(scope, scope.baselineFingerprint);
        if (!driftSafe) {
            throw new Error('environment_drift_detected');
        }
        
        const result = await adapter.executeAtomicRecovery(plan, scope);
        if (!result.success) {
            await adapter.rollback(result.checkpointId);
            throw new Error(__t('atomic_execution_failed_and_wa'));
        }
        return { success: true, executionEvidence: result.evidence };
    }"""

new_exec = """    async executeAtomically(plan: RepairPlan, adapter: LiveEnvironmentAdapterContract, scope: RecoveryScope): Promise<{ success: boolean, executionEvidence: any }> {
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
    }"""

content = content.replace(old_exec, new_exec)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated recovery-orchestrator.ts")
