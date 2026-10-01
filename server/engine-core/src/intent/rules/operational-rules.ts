/******************************************************************************
 * Project        : Ugondu
 * Module         : Intent Engine
 * File           : operational-rules.ts
 * Version        : 1.0.0
 * Author         : Air Roofers Engineering
 * Organization   : Air Roofers
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
 * Classification : ENTERPRISE
 *
 * Governance:
 * - AI Governed
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

import { OperationalRequirements } from '../model/requirements';

export function parseOperationalRequirements(text: string): OperationalRequirements {
    return {
        backup: /(backup|backups)/i.test(text),
        rollback: /(rollback|roll back|revert)/i.test(text),
        monitoring: /(monitor|monitoring|observ|alerts|alert)/i.test(text),
        autoRecovery: /(auto[- ]recover|automatic recovery|self[- ]heal|auto recovery|recovery enabled)/i.test(text),
        scaling: /(scale|scaling|autoscal)/i.test(text)
    };
}
