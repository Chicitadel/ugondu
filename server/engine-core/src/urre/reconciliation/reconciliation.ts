/******************************************************************************
 * Project        : URRE Engine Core
 * Module         : Reconciliation
 * File           : reconciliation.ts
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

import { ReconciliationState, ReconciliationContext } from '../model';
import { handleUnknownState } from './unknown-state';
import { detectDrift } from './drift';

/**
 * Consolidates planned, recorded, observed, provider, and target states.
 * Outputs the definitive state of the system.
 *
 * @param context The comprehensive state context across all dimensions
 * @returns The consolidated state: CONFIRMED_COMPLETE, INCOMPLETE, DRIFTED, UNKNOWN, CORRUPTED, or UNRECOVERABLE
 */
export function reconcileState(context: ReconciliationContext): ReconciliationState {
    const { planned, recorded, observed, provider, target, taskContext } = context;

    try {
        if (!observed || !provider || !target) {
            return handleUnknownState(taskContext.taskId, taskContext);
        }

        if (recorded.isCorrupted || !recorded.signatureValid) {
            return 'CORRUPTED';
        }

        const isDrifted = detectDrift(planned.baseDigest, target.actualDigest, taskContext);
        if (isDrifted) {
            return 'DRIFTED';
        }

        if (planned.isComplete && observed.isComplete && provider.isComplete) {
            return 'CONFIRMED_COMPLETE';
        }

        if (!planned.isComplete && !observed.isComplete) {
            return 'INCOMPLETE';
        }

        // Catch-all for scenarios that don't match standard reconciliation flows
        taskContext.logger.error(`Unrecoverable state reached for task ${taskContext.taskId}.`);
        return 'UNRECOVERABLE';

    } catch (error) {
        taskContext.logger.error(`Error during reconciliation: ${error}`);
        return handleUnknownState(taskContext.taskId, taskContext);
    }
}
