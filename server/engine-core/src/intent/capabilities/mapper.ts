/******************************************************************************
 * Project        : Air Roofers Platform
 * Module         : Intent Engine
 * File           : mapper.ts
 * Version        : 1.0.0
 * Author         : Engineering Lead
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

import { NormalizedIntent } from "../model/normalized-intent";

export interface CapabilityNode {
    id: string;
    name: string;
    dependencies: string[];
}

export class CapabilityMapper {
    public mapToGraph(intent: NormalizedIntent): CapabilityNode[] {
        const graph: CapabilityNode[] = [];
        
        for (const req of intent.normalizedRequirements) {
            graph.push({
                id: `cap-${req.id}`,
                name: req.description,
                dependencies: []
            });
        }
        
        return graph;
    }
}
