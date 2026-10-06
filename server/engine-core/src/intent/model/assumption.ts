/******************************************************************************
 * Project        : Air Roofers Platform
 * Module         : Intent Engine
 * File           : assumption.ts
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

import { Provenance } from "./requirement";

/**
 * @interface Assumption
 * @description Corporate Governed interface implementation for Assumption
 * @classification ENTERPRISE
 */
export interface Assumption {
    id: string;
    description: string;
    provenance: Provenance;
    confidence: number; // Scale from 0.0 to 1.0
    validationStatus: "PENDING" | "VALIDATED" | "REJECTED";
}
