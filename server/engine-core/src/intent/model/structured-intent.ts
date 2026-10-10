/******************************************************************************
 * Project        : Air Roofers Platform
 * Module         : Intent Engine
 * File           : structured-intent.ts
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

import { Requirement } from "./requirement";
import { Assumption } from "./assumption";

/**
 * @interface StructuredIntent
 * @description Corporate Governed interface implementation for StructuredIntent
 * @classification ENTERPRISE
 */
export interface StructuredIntent {
    id: string;
    rawIntentId: string;
    requirements: Requirement[];
    assumptions: Assumption[];
}
