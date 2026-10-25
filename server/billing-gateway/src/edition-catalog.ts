/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Billing Gateway — Central Edition Entitlement Catalog
 * File           : edition-catalog.ts
 * Version        : 2026.3.1-LTS
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-10-18
 * Last Modified  : 2026-10-18
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance:
 * - Corporate Policy Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

export type CanonicalEditionKey =
    | 'community'
    | 'free'
    | 'professional'
    | 'business'
    | 'enterprise'
    | 'sovereign';

export interface EditionCapabilities {
    maxPlugins: number;
    allowRollback: boolean;
    allowAtomic: boolean;
    allowTelemetry: boolean;
    maxWorkspaces: number | null;
    maxEnvironments: number | null;
    maxTargets: number | null;
    maxDeploymentsPerMonth: number | null;
    maxFleetNodes: number | null;
    maxAiRequestsPerMonth: number | null;
}

export interface EditionCatalogEntry {
    edition: CanonicalEditionKey;
    cegTier: 'FREE' | 'PROFESSIONAL' | 'BUSINESS' | 'SOVEREIGN';
    rank: number;
    capabilities: EditionCapabilities;
}

/**
 * Central edition table aligned with @ugondu/capabilities (EDITION_LIMITS, EDITION_RANK)
 * and .governance/product.definition.yaml (product: ugondu, version: 2026.3.1-LTS).
 */
export const CENTRAL_EDITION_TABLE: Readonly<Record<CanonicalEditionKey, EditionCatalogEntry>> = Object.freeze({
    community: {
        edition: 'community',
        cegTier: 'FREE',
        rank: 1,
        capabilities: {
            maxPlugins: 1,
            allowRollback: false,
            allowAtomic: false,
            allowTelemetry: false,
            maxWorkspaces: 1,
            maxEnvironments: 1,
            maxTargets: 3,
            maxDeploymentsPerMonth: 10,
            maxFleetNodes: 0,
            maxAiRequestsPerMonth: 0,
        },
    },
    free: {
        edition: 'free',
        cegTier: 'FREE',
        rank: 1,
        capabilities: {
            maxPlugins: 1,
            allowRollback: false,
            allowAtomic: false,
            allowTelemetry: false,
            maxWorkspaces: 1,
            maxEnvironments: 1,
            maxTargets: 3,
            maxDeploymentsPerMonth: 10,
            maxFleetNodes: 0,
            maxAiRequestsPerMonth: 0,
        },
    },
    professional: {
        edition: 'professional',
        cegTier: 'PROFESSIONAL',
        rank: 2,
        capabilities: {
            maxPlugins: 5,
            allowRollback: true,
            allowAtomic: true,
            allowTelemetry: false,
            maxWorkspaces: 5,
            maxEnvironments: 10,
            maxTargets: 25,
            maxDeploymentsPerMonth: 100,
            maxFleetNodes: 0,
            maxAiRequestsPerMonth: 100,
        },
    },
    business: {
        edition: 'business',
        cegTier: 'BUSINESS',
        rank: 3,
        capabilities: {
            maxPlugins: 50,
            allowRollback: true,
            allowAtomic: true,
            allowTelemetry: true,
            maxWorkspaces: 50,
            maxEnvironments: 500,
            maxTargets: null,
            maxDeploymentsPerMonth: null,
            maxFleetNodes: 50,
            maxAiRequestsPerMonth: 1000,
        },
    },
    enterprise: {
        edition: 'enterprise',
        cegTier: 'SOVEREIGN',
        rank: 4,
        capabilities: {
            maxPlugins: 250,
            allowRollback: true,
            allowAtomic: true,
            allowTelemetry: true,
            maxWorkspaces: 250,
            maxEnvironments: null,
            maxTargets: null,
            maxDeploymentsPerMonth: null,
            maxFleetNodes: 500,
            maxAiRequestsPerMonth: 10000,
        },
    },
    sovereign: {
        edition: 'sovereign',
        cegTier: 'SOVEREIGN',
        rank: 5,
        capabilities: {
            maxPlugins: 999,
            allowRollback: true,
            allowAtomic: true,
            allowTelemetry: true,
            maxWorkspaces: null,
            maxEnvironments: null,
            maxTargets: null,
            maxDeploymentsPerMonth: null,
            maxFleetNodes: null,
            maxAiRequestsPerMonth: null,
        },
    },
});

export function resolveEditionEntitlements(rawEdition: string | undefined | null): EditionCatalogEntry | null {
    if (!rawEdition || typeof rawEdition !== 'string') {
        return null;
    }
    const normalized = rawEdition.trim().toLowerCase() as CanonicalEditionKey;
    const entry = CENTRAL_EDITION_TABLE[normalized];
    if (!entry) {
        return null;
    }
    return {
        ...entry,
        capabilities: { ...entry.capabilities },
    };
}
