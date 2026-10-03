/******************************************************************************
 * Project        : Air Roofers Platform
 * Module         : Intent Engine
 * File           : normalized-intent.ts
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
import type { AuthorizationRequirement } from './authorization-requirements';

/**
 * @interface NormalizedIntent
 * @description Corporate Governed interface implementation for NormalizedIntent
 * @classification ENTERPRISE
 */
export interface NormalizedIntent {
    id: string;
    structuredIntentId: string;
    normalizedRequirements: Requirement[];
    normalizedAssumptions: Assumption[];
    resolutionTrace: string[];
    /**
     * Authorization requirements extracted during intent decomposition.
     * Present when the operation requires provider-level authority.
     * Passed to UPPIE for authority gap analysis and grant compilation.
     */
    authorizationRequirements?: AuthorizationRequirement[];
}
