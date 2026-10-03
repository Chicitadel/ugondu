/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Passport
 * File           : execution-receipt.ts
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

export enum ExecutionOutcome {
    SUCCESS = 'SUCCESS',
    FAILURE = 'FAILURE',
    ABORTED = 'ABORTED'
}

/**
 * @interface ExecutionReceipt
 * @description Corporate Governed interface implementation for ExecutionReceipt
 * @classification ENTERPRISE
 */
export interface ExecutionReceipt {
    receiptId: string;
    envelopeId: string;
    outcome: ExecutionOutcome;
    startedAt: string;
    completedAt: string;
    logs: string[];
    error?: string;
    signature?: string;
}

export function generateReceipt(
    envelopeId: string,
    outcome: ExecutionOutcome,
    startedAt: string,
    completedAt: string,
    logs: string[],
    error?: string
): ExecutionReceipt {
    return {
        receiptId: `rcpt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        envelopeId,
        outcome,
        startedAt,
        completedAt,
        logs,
        error
    };
}
