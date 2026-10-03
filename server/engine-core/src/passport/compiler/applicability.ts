/******************************************************************************
 * Project        : Ugondu
 * Module         : Passport Compiler & Evidence
 * File           : applicability.ts
 * Version        : 1.0.0
 * Author         : Antigravity Autonomous Engineer
 * Organization   : Air Roofers
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Corporate Governed
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
export enum OperationType {
    Deploy = 'Deploy',
    Remediate = 'Remediate',
    Migrate = 'Migrate',
    Restore = 'Restore'
}

/**
 * @interface ApplicabilityContext
 * @description Corporate Governed interface implementation for ApplicabilityContext
 * @classification ENTERPRISE
 */
export interface ApplicabilityContext {
    targetEnvironment: string;
    operation: OperationType;
    requiredLabels: string[];
}

/**
 * @class ApplicabilityAnalyzer
 * @description Corporate Governed class implementation for ApplicabilityAnalyzer
 * @classification ENTERPRISE
 */
export class ApplicabilityAnalyzer {
    public static isApplicable(evidenceContext: ApplicabilityContext, targetContext: ApplicabilityContext): boolean {
        if (evidenceContext.operation !== targetContext.operation) return false;
        if (evidenceContext.targetEnvironment !== targetContext.targetEnvironment) return false;
        
        const hasAllLabels = targetContext.requiredLabels.every(label => 
            evidenceContext.requiredLabels.includes(label)
        );
        return hasAllLabels;
    }
}
