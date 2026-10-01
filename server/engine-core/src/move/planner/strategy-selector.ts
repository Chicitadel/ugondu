/******************************************************************************
 * Project        : Ugondu
 * Module         : move/planner
 * File           : strategy-selector.ts
 * Version        : 1.0.0
 * Author         : Elite Ugondu Move Engineer
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

export type MigrationStrategy = 'lift-and-shift' | 'replatform' | 'refactor';

export class StrategySelector {
    selectStrategy(resourceType: string, complexityScore: number): MigrationStrategy {
        if (complexityScore > 80) return 'refactor';
        if (complexityScore > 40) return 'replatform';
        return 'lift-and-shift';
    }
}
