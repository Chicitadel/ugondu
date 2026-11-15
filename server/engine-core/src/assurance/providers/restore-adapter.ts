/******************************************************************************
 * Project        : Ugondu
 * Module         : Assurance
 * File           : restore-adapter.ts
 * Version        : 1.0.0
 * Author         : SOVEREIGN Architecture Team
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

export interface RestoreAdapter {
    restoreResource(resourceId: string, stateData: string, expectedChecksum: string): Promise<void>;
    verifyRestoration(resourceId: string): Promise<boolean>;
}
