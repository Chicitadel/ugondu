/******************************************************************************
 * Project        : Air Roofers Platform
 * Module         : Intent Engine
 * File           : ambiguity.ts
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

import { StructuredIntent } from "../model/structured-intent";

export class AmbiguityDetector {
    public detectAmbiguity(intent: StructuredIntent): string[] {
        const ambiguities: string[] = [];
        const ambiguousTerms = ["fast", "scale", "responsive", "optimal"];
        
        for (const req of intent.requirements) {
            for (const term of ambiguousTerms) {
                if (req.description.toLowerCase().includes(term)) {
                    ambiguities.push(`Ambiguous non-measurable term '${term}' found in requirement: ${req.id}`);
                }
            }
        }
        return ambiguities;
    }
}
