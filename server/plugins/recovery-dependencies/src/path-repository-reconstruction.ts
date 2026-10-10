import { RecoveryCapability } from '../../../engine-core/src/deise/engine/recovery/capabilities/recovery-capability';
import { EnvironmentTwin } from '../../../engine-core/src/deise/twin/environment-twin';
import { RecoveryScope } from '../../../engine-core/src/deise/engine/recovery/live-environment-adapter-contract';

export class PathRepositoryReconstruction implements RecoveryCapability {
    get capabilityId(): string {
        return 'PathRepositoryReconstruction';
    }

    async diagnose(twin: EnvironmentTwin, scope: RecoveryScope): Promise<any> {
        // Universal implementation: analyze graph to find detached dependencies
        const missingPaths: string[] = [];
        if (twin.resourceGraphEdges) {
            for (const edge of twin.resourceGraphEdges) {
                if (edge.relation === 'depends_on_path' && (edge as any).targetStatus === 'MISSING') {
                    missingPaths.push(edge.target);
                }
            }
        }
        
        return { 
            issue: missingPaths.length > 0 ? 'MissingLocalPathRepository' : 'NoIssue', 
            missingPaths: missingPaths,
            confidence: missingPaths.length > 0 ? 0.99 : 1.0
        };
    }

    async plan(diagnosis: any, scope: RecoveryScope): Promise<any> {
        throw new Error(__t('unimplemented_path_repository_'));
    }

    async execute(plan: any, adapter: any, scope: RecoveryScope): Promise<boolean> {
        if (!plan.requiresRepositoryClone) {
            return plan !== null;
        }

        for (const repo of plan.repositories) {
            // Dispatch abstract intent to platform adapter: EnsureRepositoryPresent
            if (typeof adapter.ensureRepositoryPresent === 'function') {
                await adapter.ensureRepositoryPresent(repo.reference, repo.path);
            } else {
                // Fallback for execution parity
                await adapter.executeAction('RepositoryEnsurePresent', { target: repo.path, reference: repo.reference });
            }
        }
        
        return adapter !== null;
    }
}

