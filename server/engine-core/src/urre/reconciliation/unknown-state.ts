/******************************************************************************
 * Project        : URRE Engine Core
 * Module         : Reconciliation
 * File           : unknown-state.ts
 * Version        : 1.0.0
 * Author         : Engineering Team
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

import { ReconciliationState, TaskContext } from '../model';

/**
 * Handles the UNKNOWN state triggering during reconciliation.
 * Prevents blind retries when the actual state of the system cannot be determined.
 *
 * @param taskId The ID of the task
 * @param context The current execution context
 * @returns The resolved state, typically UNKNOWN, to halt execution and request manual intervention
 */
export function handleUnknownState(taskId: string, context: TaskContext): ReconciliationState {
    context.logger.warn(`Task ${taskId} entered UNKNOWN state. Suspending auto-retry to prevent undefined behavior.`);

    // Set flag to prevent blind retries
    context.state.retryPolicy.halted = true;
    context.state.requiresManualIntervention = true;

    return 'UNKNOWN';
}
