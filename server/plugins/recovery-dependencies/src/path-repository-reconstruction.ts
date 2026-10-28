/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Plugins / Recovery Dependencies
 * File           : path-repository-reconstruction.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-29
 * Last Modified  : 2026-10-18
 * Classification : COMMERCIAL | INTERNAL
 *
 * Governance:
 * - Corporate Policy Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS
 * - NIST
 *
 * Signatures:
 * - Architecture Authority
 * - Security Authority
 * - Governance Authority
 * - Deployment Authority
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

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
            missingPaths,
            confidence: missingPaths.length > 0 ? 0.99 : 1.0
        };
    }

    async plan(diagnosis: any, scope: RecoveryScope): Promise<any> {
        if (!diagnosis?.missingPaths || diagnosis.missingPaths.length === 0) {
            return { requiresRepositoryClone: false, repositories: [], safeToProceed: true };
        }

        const repositories = diagnosis.missingPaths.map((p: string) => ({
            path: p,
            reference: `source_repo_for_path_${p.replace(/[^a-zA-Z0-9]/g, '_')}`
        }));

        return {
            requiresRepositoryClone: true,
            repositories,
            safeToProceed: true
        };
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
