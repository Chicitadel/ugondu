/******************************************************************************
 * Project        : Air Roofers Platform
 * Module         : Intent Engine
 * File           : provenance.ts
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
import { Provenance } from "../model/requirement";

/**
 * @class ProvenanceValidator
 * @description Corporate Governed class implementation for ProvenanceValidator
 * @classification ENTERPRISE
 */
export class ProvenanceValidator {
    public validate(intent: StructuredIntent): boolean {
        for (const req of intent.requirements) {
            if (req.provenance !== Provenance.USER_EXPLICIT && req.provenance !== Provenance.LLM_INFERRED) {
                return false;
            }
        }
        for (const ass of intent.assumptions) {
            if (ass.provenance !== Provenance.USER_EXPLICIT && ass.provenance !== Provenance.LLM_INFERRED) {
                return false;
            }
        }
        return true;
    }
}
