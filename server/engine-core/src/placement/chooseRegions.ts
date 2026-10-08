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

import { PlacementIntent, RegionDecision, RegionDiscoveryProvider, RegionInfo } from './types';
import { PlacementBlockedError } from './PlacementBlockedError';
import { __t } from '../../../shared/i18n';

export async function chooseRegions(intent: PlacementIntent, provider: RegionDiscoveryProvider): Promise<RegionDecision> {
    const availableRegions = await provider.discoverAvailableRegions();

    const validRegions = availableRegions.filter(region => {
        if (intent.residencyRequirements.length > 0) {
            const hasResidency = intent.residencyRequirements.every(req => region.residency.includes(req));
            if (!hasResidency) return false;
        }

        if (intent.requiredCompliance.length > 0) {
            const hasCompliance = intent.requiredCompliance.every(req => region.compliance.includes(req));
            if (!hasCompliance) return false;
        }

        if (intent.maxLatencyMs !== undefined && region.baseLatencyMs > intent.maxLatencyMs) {
            return false;
        }

        if (intent.maxCost !== undefined && region.baseCost > intent.maxCost) {
            return false;
        }
        
        if (intent.requiredCapacity !== undefined && region.quota < intent.requiredCapacity) {
            return false;
        }

        return true;
    });

    if (validRegions.length === 0) {
        throw new PlacementBlockedError(__t('engine.placement.err_cannot_meet_constraints', intent.id));
    }

    // Cost optimization and latency prioritization
    validRegions.sort((a, b) => a.baseCost - b.baseCost || a.baseLatencyMs - b.baseLatencyMs);

    const selectedRegion = validRegions[0];

    const complianceValidations: Record<string, boolean> = {};
    intent.requiredCompliance.forEach(c => { complianceValidations[c] = true; });

    const residencyValidations: Record<string, boolean> = {};
    intent.residencyRequirements.forEach(r => { residencyValidations[r] = true; });

    return {
        intentId: intent.id,
        selectedRegions: [selectedRegion.id],
        decisionTimestamp: new Date().toISOString(),
        complianceValidations,
        residencyValidations,
        estimatedCost: selectedRegion.baseCost,
        estimatedLatencyMs: selectedRegion.baseLatencyMs
    };
}
