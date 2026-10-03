/******************************************************************************
 * Project        : Ugondu
 * Module         : engine-core/discovery
 * File           : normalizer.ts
 * Version        : 1.0.0
 * Author         : Air Roofers Engineering
 * Organization   : Air Roofers
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
 * Classification : ENTERPRISE
 *
 * Governance:
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
 * Copyright (c) 2026 Air Roofers
 * All Rights Reserved.
 ******************************************************************************/

import { ConflictDetector } from './conflict';

/**
 * @interface RawObservation
 * @description Corporate Governed interface implementation for RawObservation
 * @classification ENTERPRISE
 */
export interface RawObservation {
    provider: string;
    resourceId: string;
    attributes: Record<string, any>;
    timestamp: number;
}

/**
 * @interface CanonicalResource
 * @description Corporate Governed interface implementation for CanonicalResource
 * @classification ENTERPRISE
 */
export interface CanonicalResource {
    id: string;
    type: string;
    properties: Record<string, any>;
    lastSeen: number;
    conflicted: boolean;
    conflictDetails?: any;
}

/**
 * @class DataNormalizer
 * @description Corporate Governed class implementation for DataNormalizer
 * @classification ENTERPRISE
 */
export class DataNormalizer {
    private conflictDetector = new ConflictDetector();

    public normalize(raw: RawObservation[]): CanonicalResource[] {
        const canonicalMap = new Map<string, CanonicalResource>();
        
        for (const obs of raw) {
            const existing = canonicalMap.get(obs.resourceId);
            const normalized = this.mapToCanonical(obs);
            
            if (existing) {
                const conflict = this.conflictDetector.detect(existing, normalized);
                if (conflict.hasConflict) {
                    existing.conflicted = true;
                    existing.conflictDetails = conflict.details;
                } else {
                    existing.properties = { ...existing.properties, ...normalized.properties };
                    existing.lastSeen = Math.max(existing.lastSeen, normalized.lastSeen);
                }
            } else {
                canonicalMap.set(obs.resourceId, normalized);
            }
        }
        
        return Array.from(canonicalMap.values());
    }

    private mapToCanonical(obs: RawObservation): CanonicalResource {
        return {
            id: obs.resourceId,
            type: obs.attributes.type || 'unknown',
            properties: obs.attributes,
            lastSeen: obs.timestamp,
            conflicted: false
        };
    }
}
