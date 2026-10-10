import { RecoveryCapability } from '../../../engine-core/src/deise/engine/recovery/capabilities/recovery-capability';
import { EnvironmentTwin } from '../../../engine-core/src/deise/twin/environment-twin';
import { RecoveryScope, LiveEnvironmentAdapterContract } from '../../../engine-core/src/deise/engine/recovery/live-environment-adapter-contract';

export class LiveDatabaseStateReconstruction implements RecoveryCapability {
    get capabilityId(): string {
        return 'LiveDatabaseStateReconstruction';
    }
    
    async diagnose(twin: EnvironmentTwin, scope: RecoveryScope): Promise<any> {
        const dbInventory = twin.databaseInventory || {};
        const missingDatabases: string[] = [];
        const driftedDatabases: any[] = [];
        
        for (const [dbName, dbState] of Object.entries(dbInventory)) {
            if (dbState.status === 'MISSING') {
                missingDatabases.push(dbName);
            } else if (dbState.status === 'DRIFTED') {
                driftedDatabases.push({ dbName, expected: dbState.expected, actual: dbState.actual });
            }
        }
        
        if (missingDatabases.length > 0 || driftedDatabases.length > 0) {
            return {
                issue: 'DatabaseStateCorruption',
                missingDatabases,
                driftedDatabases,
                confidence: 1.0
            };
        }
        
        return {
            issue: 'NoIssue',
            confidence: 1.0
        };
    }

    async plan(diagnosis: any, scope: RecoveryScope): Promise<any> {
        if (diagnosis.issue === 'DatabaseStateCorruption') {
            const actions = [];
            
            for (const dbName of diagnosis.missingDatabases) {
                actions.push({
                    type: 'RESTORE_DATABASE',
                    target: dbName,
                    payload: { strategy: 'LATEST_SNAPSHOT' }
                });
            }
            
            for (const drift of diagnosis.driftedDatabases) {
                actions.push({
                    type: 'GENERATE_SQL_REPAIR_PATCH',
                    target: drift.dbName,
                    payload: { expected: drift.expected, actual: drift.actual }
                });
            }
            
            return {
                requiresDatabaseRepair: true,
                actions,
                safeToProceed: true
            };
        }
        
        return { requiresDatabaseRepair: false, actions: [], safeToProceed: true };
    }

    async execute(plan: any, adapter: LiveEnvironmentAdapterContract, scope: RecoveryScope): Promise<boolean> {
        // COR-009: Do not fake success
        if (!plan.requiresDatabaseRepair) {
            return true;
        }
        
        const repairPlan = {
            diagnoses: [],
            requiresApplicationUpload: false,
            requiresTopologyRepair: false,
            requiresInfrastructureRepair: true,
            infrastructureRepairs: plan.actions.map((action: any) => ({
                resourceType: 'DATABASE',
                action: action.type,
                payload: action.payload
            })),
            safeToProceed: plan.safeToProceed,
            destructiveDeleteBlocked: false
        };
        
        const dryRunResult = await adapter.dryRun(repairPlan as any, scope);
        if (!dryRunResult.safe) {
            return false;
        }
        
        const baselineFingerprint = await adapter.fingerprintRepository(scope);
        const hasDrifted = await adapter.checkDrift(scope, baselineFingerprint);
        
        if (hasDrifted) {
            throw new Error(__t('environment_drift_detected_bef'));
        }
        
        const executionResult = await adapter.executeAtomicRecovery(repairPlan as any, scope);
        
        if (!executionResult.success) {
            await adapter.rollback(executionResult.checkpointId);
            return false;
        }
        
        const verification = await adapter.verifyState(scope, { databaseRepaired: true });
        return verification.verified;
    }
}

