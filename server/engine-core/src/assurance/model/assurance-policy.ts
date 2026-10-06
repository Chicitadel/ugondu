/******************************************************************************
 * Project        : Ugondu
 * Module         : Assurance Engine
 * File           : assurance-policy.ts
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

import { AssuranceLevel } from './assurance';

/**
 * @interface AssurancePolicy
 * @description Corporate Governed interface implementation for AssurancePolicy
 * @classification ENTERPRISE
 */
export interface AssurancePolicy {
    readonly policyId: string;
    readonly requiredLevel: AssuranceLevel;
    readonly maxAgeMs: number;
    readonly strictMode: boolean;
}
