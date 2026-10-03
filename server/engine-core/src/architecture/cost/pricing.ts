/******************************************************************************
 * Project        : Ujomor Platform
 * Module         : engine-core/architecture/cost
 * File           : pricing.ts
 * Version        : 1.0.0
 * Author         : Architecture Team
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

export enum CostProvenance {
    CALCULATED = 'CALCULATED',
    BENCHMARK = 'BENCHMARK'
}

/**
 * @interface PricingModel
 * @description Corporate Governed interface implementation for PricingModel
 * @classification ENTERPRISE
 */
export interface PricingModel {
    modelId: string;
    unitPrice: number;
    provenance: CostProvenance;
}
