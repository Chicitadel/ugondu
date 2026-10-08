/******************************************************************************
 * Project        : Universal Autonomous AI Governance Operating System
 * Module         : server/engine-core/src/placement
 * File           : chooseRegions.ts
 * Version        : 1.0.0
 * Author         : Region Decision Engineer
 * Organization   : Enterprise
 * Created Date   : 2026-10-08
 * Last Modified  : 2026-10-08
 * Classification : ENTERPRISE
 *
 * Governance:
 * - AI Governed
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
 * Copyright (c) 2026 Enterprise
 * All Rights Reserved.
 ******************************************************************************/

import { PlacementIntent, PlacementCertificate, RegionCapabilityRegistry, RegionCapability, PlacedResource } from './types';
import { PlacementBlockedError } from './PlacementBlockedError';
import { __t } from '@ugondu/shared';
import * as crypto from 'crypto';

export async function solvePlacement(intent: PlacementIntent, registry: RegionCapabilityRegistry, requiredServices: string[]): Promise<PlacementCertificate> {
    const availableRegions = await registry.discoverCapabilities();
    const rejectedRegions: Array<{ region: string; reason: string }> = [];

    const validRegions = availableRegions.filter(region => {
        if (!region.enabled) {
            rejectedRegions.push({ region: region.id, reason: 'Region not enabled in account' });
            return false;
        }

        if (intent.residency?.requiredCountries && intent.residency.requiredCountries.length > 0) {
            const hasResidency = intent.residency.requiredCountries.every(req => region.residency.includes(req));
            if (!hasResidency) {
                rejectedRegions.push({ region: region.id, reason: 'Failed residency constraints' });
                return false;
            }
        }

        if (intent.compliance?.frameworks && intent.compliance.frameworks.length > 0) {
            const hasCompliance = intent.compliance.frameworks.every(req => region.compliance.includes(req));
            if (!hasCompliance) {
                rejectedRegions.push({ region: region.id, reason: 'Failed compliance constraints' });
                return false;
            }
        }

        if (intent.performance?.latencyTargetMs !== undefined && region.baseLatencyMs > intent.performance.latencyTargetMs) {
            rejectedRegions.push({ region: region.id, reason: 'Higher than target latency' });
            return false;
        }

        if (intent.availability?.minimumAvailabilityZones !== undefined && region.availabilityZones < intent.availability.minimumAvailabilityZones) {
            rejectedRegions.push({ region: region.id, reason: 'Insufficient Availability Zones' });
            return false;
        }

        const missingServices = requiredServices.filter(svc => !region.services[svc]);
        if (missingServices.length > 0) {
            rejectedRegions.push({ region: region.id, reason: `Missing required services: ${missingServices.join(',')}` });
            return false;
        }

        return true;
    });

    if (validRegions.length === 0) {
        throw new PlacementBlockedError(__t('engine.placement.err_cannot_meet_constraints', intent.deploymentId));
    }

    // Optimization Stage
    validRegions.sort((a, b) => {
        if (intent.performance?.optimizeFor === 'COST') return a.baseCostIndex - b.baseCostIndex;
        if (intent.performance?.optimizeFor === 'LATENCY') return a.baseLatencyMs - b.baseLatencyMs;
        // Balanced
        return (a.baseCostIndex * 0.5 + a.baseLatencyMs * 0.5) - (b.baseCostIndex * 0.5 + b.baseLatencyMs * 0.5);
    });

    const primaryRegion = validRegions[0];
    const secondaryRegions: string[] = [];
    
    if (intent.disasterRecovery?.enabled && validRegions.length > 1) {
        // Simple distinct region pick for DR
        const drRegion = validRegions.find(r => r.id !== primaryRegion.id);
        if (drRegion) secondaryRegions.push(drRegion.id);
    }

    // Resource Graph Construction
    const resources: PlacedResource[] = [];
    resources.push({ type: 'COMPUTE', placement: primaryRegion.id, reason: 'Primary compute', scope: 'REGIONAL' });
    if (requiredServices.includes('RDS')) {
        resources.push({ type: 'DATABASE', placement: primaryRegion.id, reason: 'Application data proximity', scope: 'REGIONAL' });
        if (intent.disasterRecovery?.enabled && secondaryRegions.length > 0) {
            resources.push({ type: 'DATABASE_REPLICA', placement: secondaryRegions[0], reason: 'Disaster recovery', scope: 'REGIONAL' });
        }
    }
    
    if (requiredServices.includes('CLOUDFRONT')) {
        resources.push({ type: 'CLOUDFRONT', placement: 'GLOBAL', reason: 'Global edge distribution', scope: 'GLOBAL' });
        resources.push({ type: 'ACM_CLOUDFRONT', placement: 'us-east-1', reason: 'AWS CLOUDFRONT REQUIREMENT', scope: 'ANCHOR_REGION' });
        resources.push({ type: 'ACM_ORIGIN', placement: primaryRegion.id, reason: 'Regional origin TLS', scope: 'REGIONAL' });
    }
    
    if (requiredServices.includes('ROUTE53')) {
        resources.push({ type: 'ROUTE53', placement: 'GLOBAL', reason: 'AWS GLOBAL SERVICE', scope: 'GLOBAL' });
    }

    const graph = {
        deployment: intent.deploymentId,
        primaryRegion: primaryRegion.id,
        secondaryRegions,
        resources
    };

    const payload = JSON.stringify({ intent, graph, rejectedRegions });
    const decisionHash = crypto.createHash('sha256').update(payload).digest('hex');

    return {
        intentId: intent.deploymentId,
        provider: 'AWS',
        decisionTimestamp: new Date().toISOString(),
        hardConstraintsPassed: ['Residency', 'Compliance', 'Latency', 'Service Availability', 'Capacity'],
        rejectedRegions,
        graph,
        decisionHash,
        policyVersion: 'placement-policy-v1'
    };
}
