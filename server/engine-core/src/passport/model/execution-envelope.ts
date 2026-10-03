/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Passport
 * File           : execution-envelope.ts
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

import { DeliveryPassport } from './passport';

/**
 * @interface ExecutionEnvelope
 * @description Corporate Governed interface implementation for ExecutionEnvelope
 * @classification ENTERPRISE
 */
export interface ExecutionEnvelope {
    envelopeId: string;
    passport: DeliveryPassport;
    executionEnvironment: {
        nodeVersion: string;
        os: string;
        containerId?: string;
    };
    timestamp: string;
    context: Record<string, unknown>;
}

export function createExecutionEnvelope(
    passport: DeliveryPassport,
    environmentDetails: { nodeVersion: string; os: string; containerId?: string },
    context: Record<string, unknown> = {}
): ExecutionEnvelope {
    return {
        envelopeId: `env-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        passport,
        executionEnvironment: environmentDetails,
        timestamp: new Date().toISOString(),
        context
    };
}
