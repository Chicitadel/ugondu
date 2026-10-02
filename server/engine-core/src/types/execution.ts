/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Passport Gatekeeper
 * File           : execution.ts
 * Version        : 1.0.0
 * Author         : Engineering Team
 * Organization   : Air Roofers
 * Created Date   : 2026-10-02
 * Last Modified  : 2026-10-02
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

export interface ExecutionContext {
    id: string;
    targetId: string;
    targetType?: string;
    environment: Record<string, unknown>;
    metadata: Record<string, unknown>;
    requiredCapabilities: string[];
    isEmergencyBypassEnabled?: boolean;
}

export interface ExecutionTask {
    contextId: string;
}

export interface ExecutionResult {
    success: boolean;
    data?: unknown;
}
