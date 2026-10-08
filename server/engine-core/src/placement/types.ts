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
    id: string;
    workloadId: string;
    requiredCompliance: string[];
    residencyRequirements: string[];
    maxLatencyMs?: number;
    maxCost?: number;
    requiredCapacity?: number;
}

export interface RegionDecision {
    intentId: string;
    selectedRegions: string[];
    decisionTimestamp: string;
    complianceValidations: Record<string, boolean>;
    residencyValidations: Record<string, boolean>;
    estimatedCost: number;
    estimatedLatencyMs: number;
}

export interface RegionInfo {
    id: string;
    compliance: string[];
    residency: string[];
    baseLatencyMs: number;
    baseCost: number;
    quota: number;
}

export interface RegionDiscoveryProvider {
    discoverAvailableRegions(): Promise<RegionInfo[]>;
}
