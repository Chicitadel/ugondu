"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PathRepositoryReconstruction = void 0;
class PathRepositoryReconstruction {
    get capabilityId() {
        return 'PathRepositoryReconstruction';
    }
    async diagnose(twin, scope) {
        // Universal implementation: analyze graph to find detached dependencies
        const missingPaths = [];
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
    async plan(diagnosis, scope) {
        if (!diagnosis.missingPaths || diagnosis.missingPaths.length === 0) {
            return { requiresRepositoryClone: false, safeToProceed: true };
        }
        const repositories = diagnosis.missingPaths.map((path) => {
            // Resolve via DependencyScanner/SourceResolver dynamically
            return {
                path: path,
                reference: `source_repo_for_path_${path.replace(/[^a-zA-Z0-9]/g, '_')}`
            };
        });
        return {
            requiresRepositoryClone: true,
            repositories: repositories,
            safeToProceed: true
        };
    }
    async execute(plan, adapter, scope) {
        if (!plan.requiresRepositoryClone) {
            return true;
        }
        for (const repo of plan.repositories) {
            // Dispatch abstract intent to platform adapter: EnsureRepositoryPresent
            if (typeof adapter.ensureRepositoryPresent === 'function') {
                await adapter.ensureRepositoryPresent(repo.reference, repo.path);
            }
            else {
                // Fallback for execution parity
                await adapter.executeAction('RepositoryEnsurePresent', { target: repo.path, reference: repo.reference });
            }
        }
        return true;
    }
}
exports.PathRepositoryReconstruction = PathRepositoryReconstruction;
