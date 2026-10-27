/******************************************************************************
 * Project        : Ugondu
 * Module         : Intent Engine
 * File           : security-rules.ts
 * Version        : 1.0.0
 * Author         : Air Roofers Engineering
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

import { SecurityRequirements } from '../model/requirements';

export function parseSecurityRequirements(text: string): SecurityRequirements {
    return {
        tlsRequired: /(https|tls|ssl|certificate|cert)/i.test(text),
        privateDatabaseNetwork: /(private database|private db|private network)/i.test(text),
        secretsManagement: /(secret|secrets manager|vault|credentials)/i.test(text),
        leastPrivilege: /(least privilege|minimal permission|iam)/i.test(text)
    };
}
