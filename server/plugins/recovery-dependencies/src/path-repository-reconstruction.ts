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
                if (edge.relation === 'depends_on_path' && edge.targetStatus === 'MISSING') {
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
        if (!diagnosis.missingPaths || diagnosis.missingPaths.length === 0) {
            return { requiresRepositoryClone: false, safeToProceed: true };
        }

        const repositories = diagnosis.missingPaths.map((path: string) => {
            // For now, simple heuristic based on path, in future resolve via DependencyScanner
            const repoName = path.split('/').pop();
            return {
                path: path,
                url: `https://github.com/Chicitadel/${repoName}.git`
            };
        });

        return {
            requiresRepositoryClone: true,
            repositories: repositories,
            safeToProceed: true
        };
    }

    async execute(plan: any, adapter: any, scope: RecoveryScope): Promise<boolean> {
        if (!plan.requiresRepositoryClone) {
            return true;
        }

        for (const repo of plan.repositories) {
            // Use universal adapter method instead of hardcoded bash
            await adapter.executeCommand(`if [ ! -d "${repo.path}" ]; then git clone ${repo.url} "${repo.path}"; fi`);
        }
        
        // This plugin should not be responsible for composer validation. That belongs to ComposerIntegrityValidation.
        return true;
    }
}
