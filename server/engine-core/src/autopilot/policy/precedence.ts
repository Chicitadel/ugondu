/******************************************************************************
 * Project        : Air Roofers Platform
 * Module         : Autopilot / Policy
 * File           : precedence.ts
 * Version        : 1.0.0
 * Author         : Core Architecture Team
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
 *
 * Signatures:
 * - Architecture Authority
 * - Security Authority
 *
 * Copyright (c) 2026 Air Roofers
 * All Rights Reserved.
 ******************************************************************************/

import { ApdlRule } from './apdl';

/**
 * @class PrecedenceResolver
 * @description Corporate Governed class implementation for PrecedenceResolver
 * @classification ENTERPRISE
 */
export class PrecedenceResolver {
    public resolve(rules: ApdlRule[]): ApdlRule[] {
        // Sorts and filters rules based on execution precedence
        return rules.sort((a, b) => b.priority - a.priority);
    }
}
