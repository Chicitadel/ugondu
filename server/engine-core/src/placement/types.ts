/******************************************************************************
 * Project        : Universal Autonomous AI Governance Operating System
 * Module         : server/engine-core/src/placement
 * File           : types.ts
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

export interface PlacementIntent {
    deploymentId: string;
    geography: {
        actorCountry?: string;
        actorRegion?: string;
        consumerCountries?: string[];
        consumerRegions?: string[];
        consumerDistribution?: Array<{ country: string; percentage?: number; }>;
    };
    residency: {
        requiredCountries?: string[];
        allowedCountries?: string[];
        prohibitedCountries?: string[];
        dataClassification?: string[];
    };
    performance: {
        latencyTargetMs?: number;
        optimizeFor?: 'LATENCY' | 'COST' | 'BALANCED';
    };
    availability: {
        minimumAvailabilityZones?: number;
        minimumRegions?: number;
        faultDomainSeparation?: boolean;
    };
    disasterRecovery?: {
        enabled: boolean;
        rtoMinutes?: number;
        rpoMinutes?: number;
        preferredRecoveryRegions?: string[];
    };
    cost?: {
        maximumMonthlyCost?: number;
        currency?: string;
    };
    compliance?: {
        frameworks?: string[];
        sovereignRequirements?: string[];
    };
    userPreference?: {
        preferredRegions?: string[];
        excludedRegions?: string[];
    };
}

export type ResourceScope = 'REGIONAL' | 'GLOBAL' | 'ANCHOR_REGION';

export interface RegionCapability {
    id: string; // e.g. af-south-1
    country: string;
    geography: string;
    enabled: boolean;
    optIn: boolean;
    availabilityZones: number;
    services: Record<string, boolean>; // e.g. { 'EC2': true, 'RDS': true }
    databaseEngines: string[];
    quota: Record<string, number>;
    compliance: string[];
    residency: string[];
    baseLatencyMs: number;
    baseCostIndex: number;
}

export interface RegionCapabilityRegistry {
    discoverCapabilities(): Promise<RegionCapability[]>;
    resolveAnchorRegion(service: string): string;
}

export interface PlacedResource {
    type: string;
    placement: string; // Region ID or 'GLOBAL'
    reason: string;
    scope: ResourceScope;
}

export interface ResourcePlacementGraph {
    deployment: string;
    primaryRegion: string;
    secondaryRegions: string[];
    resources: PlacedResource[];
}

export interface PlacementCertificate {
    intentId: string;
    provider: string;
    decisionTimestamp: string;
    hardConstraintsPassed: string[];
    rejectedRegions: Array<{ region: string; reason: string }>;
    graph: ResourcePlacementGraph;
    decisionHash: string;
    policyVersion: string;
}
