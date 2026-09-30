/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Engine Core / Targets / Fabric
 * File           : fabric.ts
 * Version        : 2.0.0
 * Author         : Target Fabric Engineering Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Classification : ENTERPRISE | INTERNAL
 *
 * Standards: ISO 27001, SOC 2, OWASP ASVS, NIST SP 800-53
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

import { __t } from '@ugondu/shared';
import { CPanelTargetAdapter } from './cpanel';
import { SshTargetAdapter } from './ssh';
import { DockerTargetAdapter } from './docker';

export type TargetEnvironmentType = 'cpanel' | 'directadmin' | 'ssh' | 'docker' | 'kubernetes' | 'cloud' | 'baremetal';

export interface TargetDescriptor {
    targetId: string;
    environmentType: TargetEnvironmentType;
    endpoint: string;
    status: 'ONLINE' | 'OFFLINE' | 'DEGRADED' | 'MAINTENANCE';
    capabilities: string[];
}

export class TargetFabric {
    private registeredTargets: Map<string, TargetDescriptor> = new Map();

    public registerTarget(target: TargetDescriptor): void {
        this.registeredTargets.set(target.targetId, target);
    }

    public getTarget(targetId: string): TargetDescriptor | undefined {
        return this.registeredTargets.get(targetId);
    }

    public resolveAdapter(targetId: string, config: Record<string, any>): any {
        const target = this.registeredTargets.get(targetId);
        if (!target) {
            throw new Error(__t('error_key_not_found'));
        }
        if (target.status !== 'ONLINE') {
            throw new Error(__t('blocked'));
        }

        switch (target.environmentType) {
            case 'cpanel':
            case 'directadmin':
                return new CPanelTargetAdapter(config as any);
            case 'ssh':
            case 'baremetal':
                return new SshTargetAdapter(config as any);
            case 'docker':
                return new DockerTargetAdapter(config as any);
            default:
                throw new Error(__t('action_unknown', target.environmentType));
        }
    }

    public computeCapabilityIntersection(targetId: string, requiredCapabilities: string[]): {
        satisfied: boolean;
        missingCapabilities: string[];
    } {
        const target = this.registeredTargets.get(targetId);
        if (!target) {
            return { satisfied: false, missingCapabilities: requiredCapabilities };
        }

        const targetCapSet = new Set(target.capabilities);
        const missing = requiredCapabilities.filter(c => !targetCapSet.has(c));
        return {
            satisfied: missing.length === 0,
            missingCapabilities: missing
        };
    }
}

export const globalTargetFabric = new TargetFabric();
