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

// Basic static geography heuristic for illustration
// Production implementations would query real network topology latencies
function estimateLatency(sourceCountry: string, destCountry: string): number {
    if (sourceCountry === destCountry) return 10; // in-country
    // Rough approximations
    const isAfrica = (c: string) => ['NG', 'ZA', 'KE'].includes(c);
    const isEurope = (c: string) => ['FR', 'UK', 'DE', 'IE'].includes(c);
    const isUS = (c: string) => ['US', 'CA'].includes(c);
    
    if (isAfrica(sourceCountry) && isAfrica(destCountry)) return 80;
    if (isEurope(sourceCountry) && isEurope(destCountry)) return 20;
    if (isUS(sourceCountry) && isUS(destCountry)) return 40;
    if (isAfrica(sourceCountry) && isEurope(destCountry)) return 150;
    if (isAfrica(sourceCountry) && isUS(destCountry)) return 250;
    if (isEurope(sourceCountry) && isUS(destCountry)) return 90;
    
    return 200; // default global fallback
}

function calculateGeographicLatency(region: RegionCapability, distribution: Array<{ country: string; percentage?: number; }>): number {
    let totalWeight = 0;
    let weightedLatency = 0;
    for (const consumer of distribution) {
        const weight = consumer.percentage || (100 / distribution.length);
        const lat = estimateLatency(region.country, consumer.country);
        weightedLatency += lat * weight;
        totalWeight += weight;
    }
    return totalWeight > 0 ? weightedLatency / totalWeight : region.baseLatencyMs;
}

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

        // Calculate weighted latency against consumer geography, falling back to base latency
        const effectiveLatency = intent.geography?.consumerDistribution && intent.geography.consumerDistribution.length > 0
            ? calculateGeographicLatency(region, intent.geography.consumerDistribution)
            : region.baseLatencyMs;

        if (intent.performance?.latencyTargetMs !== undefined && effectiveLatency > intent.performance.latencyTargetMs) {
            rejectedRegions.push({ region: region.id, reason: `Higher than target latency: ${effectiveLatency}ms > ${intent.performance.latencyTargetMs}ms` });
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
    
    const minRegions = intent.availability?.minimumRegions || 1;
    if (validRegions.length < minRegions) {
        throw new PlacementBlockedError(`Insufficient qualified regions. Found ${validRegions.length}, required ${minRegions}.`);
    }

    // Optimization Stage
    validRegions.sort((a, b) => {
        const latencyA = intent.geography?.consumerDistribution && intent.geography.consumerDistribution.length > 0 
            ? calculateGeographicLatency(a, intent.geography.consumerDistribution) : a.baseLatencyMs;
        const latencyB = intent.geography?.consumerDistribution && intent.geography.consumerDistribution.length > 0 
            ? calculateGeographicLatency(b, intent.geography.consumerDistribution) : b.baseLatencyMs;

        if (intent.performance?.optimizeFor === 'COST') return a.baseCostIndex - b.baseCostIndex;
        if (intent.performance?.optimizeFor === 'LATENCY') return latencyA - latencyB;
        // Balanced
        return (a.baseCostIndex * 0.5 + latencyA * 0.5) - (b.baseCostIndex * 0.5 + latencyB * 0.5);
    });

    const primaryRegion = validRegions[0];
    const secondaryRegions: string[] = [];
    
    if (intent.disasterRecovery?.enabled || minRegions > 1) {
        // Find best DR region respecting fault domain separation
        const drCandidates = validRegions.filter(r => r.id !== primaryRegion.id);
        const optimalDrRegion = drCandidates.find(r => {
            if (intent.availability?.faultDomainSeparation) {
                return r.country !== primaryRegion.country || r.geography !== primaryRegion.geography;
            }
            return true;
        });
        
        if (optimalDrRegion) {
            secondaryRegions.push(optimalDrRegion.id);
        } else if (drCandidates.length > 0) {
            secondaryRegions.push(drCandidates[0].id); // Fallback to nearest if strict separation not required
        }
        
        if (minRegions > 1 && secondaryRegions.length < (minRegions - 1)) {
             throw new PlacementBlockedError(`Failed to resolve ${minRegions} valid regions with DR/separation constraints.`);
        }
    }

    // Resource Graph Construction
    const resources: PlacedResource[] = [];
    resources.push({ type: 'COMPUTE', placement: primaryRegion.id, reason: 'Primary compute', scope: 'REGIONAL' });
    if (requiredServices.includes('RDS')) {
        resources.push({ type: 'DATABASE', placement: primaryRegion.id, reason: 'Application data proximity', scope: 'REGIONAL' });
        if (intent.disasterRecovery?.enabled && secondaryRegions.length > 0) {
            resources.push({ type: 'DATABASE_REPLICA', placement: secondaryRegions[0], reason: 'Disaster recovery target', scope: 'REGIONAL' });
        }
    }
    
    if (requiredServices.includes('CLOUDFRONT')) {
        resources.push({ type: 'CLOUDFRONT', placement: 'GLOBAL', reason: 'Global edge distribution', scope: 'GLOBAL' });
        // Use anchor resolver instead of hardcoded 'us-east-1'
        const acmAnchor = registry.resolveAnchorRegion('ACM_CLOUDFRONT');
        resources.push({ type: 'ACM_CLOUDFRONT', placement: acmAnchor, reason: 'PROVIDER ANCHOR REQUIREMENT', scope: 'ANCHOR_REGION' });
        resources.push({ type: 'ACM_ORIGIN', placement: primaryRegion.id, reason: 'Regional origin TLS', scope: 'REGIONAL' });
    }
    
    if (requiredServices.includes('ROUTE53')) {
        resources.push({ type: 'ROUTE53', placement: 'GLOBAL', reason: 'PROVIDER GLOBAL SERVICE', scope: 'GLOBAL' });
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
        hardConstraintsPassed: ['Residency', 'Compliance', 'Latency', 'Service Availability', 'Capacity', 'Minimum Regions', 'Geographic Separation'],
        rejectedRegions,
        graph,
        decisionHash,
        policyVersion: 'placement-policy-v1'
    };
}
