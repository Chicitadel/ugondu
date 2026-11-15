/******************************************************************************
 * Project        : URRE Engine Core
 * Module         : Reconciliation
 * File           : drift.ts
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

import { StateDigest, TaskContext } from '../model';

/**
 * Detects external drift between the expected base digest and the actual target digest.
 * If drift is detected, it signals the orchestration engine to trigger a REPLAN.
 *
 * @param expectedBase The expected state digest
 * @param actualTarget The actual state digest observed in the target environment
 * @param context The execution context for signaling
 * @returns true if drift is detected, false otherwise
 */
export function detectDrift(expectedBase: StateDigest, actualTarget: StateDigest, context: TaskContext): boolean {
    if (expectedBase.hash !== actualTarget.hash) {
        context.logger.info(`Drift detected. Expected hash ${expectedBase.hash}, got ${actualTarget.hash}`);
        context.signal('REPLAN');
        return true;
    }

    // Perform deep comparison if required by context policy
    if (context.policy.strictDriftDetection && expectedBase.version !== actualTarget.version) {
        context.logger.info(`Version drift detected. Expected version ${expectedBase.version}, got ${actualTarget.version}`);
        context.signal('REPLAN');
        return true;
    }

    return false;
}
