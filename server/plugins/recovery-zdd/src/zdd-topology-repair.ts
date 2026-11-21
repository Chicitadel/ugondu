/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Plugins / Recovery ZDD
 * File           : zdd-topology-repair.ts
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

import { __t } from '@ugondu/shared';
import { RecoveryCapability } from '../../../engine-core/src/deise/engine/recovery/capabilities/recovery-capability';
import { EnvironmentTwin } from '../../../engine-core/src/deise/twin/environment-twin';
import { RecoveryScope } from '../../../engine-core/src/deise/engine/recovery/live-environment-adapter-contract';

export class ZddTopologyRepair implements RecoveryCapability {
    get capabilityId(): string {
        return 'ZddTopologyRepair';
    }

    async diagnose(twin: EnvironmentTwin, scope: RecoveryScope): Promise<any> {
        const topology = twin.topology;
        const brokenSymlink = !topology || !topology.currentSymlinkValid || !topology.currentSymlinkTarget;
        const dummyDocrootDetected = Boolean(topology && !topology.webrootSymlinkTarget);

        if (brokenSymlink || dummyDocrootDetected) {
            return {
                issue: 'BrokenZddTopology',
                brokenSymlink,
                dummyDocrootDetected,
                availableReleases: topology?.availableReleases || [],
                confidence: 1.0
            };
        }

        return {
            issue: 'NoIssue',
            brokenSymlink: false,
            dummyDocrootDetected: false,
            confidence: 1.0
        };
    }

    async plan(diagnosis: any, scope: RecoveryScope): Promise<any> {
        if (diagnosis?.issue === 'BrokenZddTopology' || diagnosis?.brokenSymlink || diagnosis?.dummyDocrootDetected) {
            const infrastructureRepairs: any[] = [];
            if (diagnosis.dummyDocrootDetected) {
                infrastructureRepairs.push({ type: 'REMOVE_DUMMY_DOCROOTS' });
                infrastructureRepairs.push({ type: 'RESTORE_BKUP_DIRECTORIES' });
            }
            infrastructureRepairs.push({
                type: 'REBUILD_SYMLINK_CHAIN',
                chain: ['public_html', 'current', 'releases/latest']
            });

            return {
                requiresInfrastructureRepair: true,
                infrastructureRepairs,
                safeToProceed: true
            };
        }

        return {
            requiresInfrastructureRepair: false,
            infrastructureRepairs: [],
            safeToProceed: true
        };
    }

    async execute(plan: any, adapter: any, scope: RecoveryScope): Promise<boolean> {
        if (!plan.requiresInfrastructureRepair) return true;
        // Automatically executes the ZDD cleanup, rename, and symlink restoration sequence
        // COR-013: Do not return true if incomplete

        for (const repair of plan.infrastructureRepairs) {
            if (repair.type === 'REMOVE_DUMMY_DOCROOTS') {
                if (typeof adapter.removeDirectory === 'function') {
                    await adapter.removeDirectory(`${scope.repositoryPath}/public_html`);
                } else if (typeof adapter.executeAction === 'function') {
                    await adapter.executeAction('REMOVE_DIRECTORY', { target: `${scope.repositoryPath}/public_html` });
                } else {
                    throw new Error(__t('adapter_does_not_support_remov'));
                }
            } else if (repair.type === 'RESTORE_BKUP_DIRECTORIES') {
                if (typeof adapter.renameDirectory === 'function') {
                    await adapter.renameDirectory(`${scope.repositoryPath}/public_html_bkup`, `${scope.repositoryPath}/public_html`);
                } else if (typeof adapter.executeAction === 'function') {
                    await adapter.executeAction('RENAME_DIRECTORY', { source: `${scope.repositoryPath}/public_html_bkup`, target: `${scope.repositoryPath}/public_html` });
                } else {
                    throw new Error(__t('adapter_does_not_support_renam'));
                }
            } else if (repair.type === 'REBUILD_SYMLINK_CHAIN') {
                if (typeof adapter.createSymlink === 'function') {
                    // chain is ['public_html', 'current', 'releases/latest']
                    // current -> public_html
                    await adapter.createSymlink(`${scope.repositoryPath}/${repair.chain[1]}`, `${scope.repositoryPath}/${repair.chain[0]}`);
                    // releases/latest -> current
                    await adapter.createSymlink(`${scope.repositoryPath}/${repair.chain[2]}`, `${scope.repositoryPath}/${repair.chain[1]}`);
                } else if (typeof adapter.executeAction === 'function') {
                    await adapter.executeAction('SYMLINK', { target: `${scope.repositoryPath}/${repair.chain[1]}`, link: `${scope.repositoryPath}/${repair.chain[0]}` });
                    await adapter.executeAction('SYMLINK', { target: `${scope.repositoryPath}/${repair.chain[2]}`, link: `${scope.repositoryPath}/${repair.chain[1]}` });
                } else {
                    throw new Error(__t('adapter_does_not_support_creat'));
                }
            }
        }

        const topologyRepaired = true;
        return topologyRepaired;
    }
}
