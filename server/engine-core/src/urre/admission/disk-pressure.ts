/******************************************************************************
 * Project        : Universal Autonomous AI Governance Operating System (UAIGOS)
 * Module         : URRE Admission
 * File           : disk-pressure.ts
 * Version        : 3.0.0
 * Author         : Air Roofers
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

import { StorageMetrics, DiskPressureState } from '../model';

const THRESHOLDS = {
    WARNING: 0.75, // 75%
    CRITICAL: 0.85, // 85% - stop new work
    EMERGENCY: 0.95 // 95% - freeze mutations
};

/**
 * Evaluates storage thresholds and returns the current disk pressure state.
 */
export function evaluateDiskPressure(metrics: StorageMetrics): DiskPressureState {
    const usageRatio = metrics.usedBytes / metrics.totalBytes;

    if (usageRatio >= THRESHOLDS.EMERGENCY) {
        return 'EMERGENCY'; // Freeze mutations
    }

    if (usageRatio >= THRESHOLDS.CRITICAL) {
        return 'CRITICAL'; // Stop new work
    }

    if (usageRatio >= THRESHOLDS.WARNING) {
        return 'WARNING';
    }

    return 'NORMAL';
}
