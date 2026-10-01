/******************************************************************************
 * Project        : Universal Autonomous AI Governance Operating System (UAIGOS)
 * Module         : URRE Admission
 * File           : preflight.ts
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

import { PreflightRequest, PreflightDecision, AdmissionState } from '../model';
import { validateSafetyContract } from './safety-contract';
import { evaluateDiskPressure } from './disk-pressure';

/**
 * Executes the full admission controller (auth, drift, capacity, risk).
 */
export async function runPreflightAdmission(request: PreflightRequest, state: AdmissionState): Promise<PreflightDecision> {
    // Auth Check
    if (!request.isAuthenticated || !request.hasRequiredRoles) {
        return 'BLOCK';
    }

    // Safety Contract Check
    if (!validateSafetyContract(request.action)) {
        return 'BLOCK';
    }

    // Capacity / Disk Pressure Check
    const diskPressure = evaluateDiskPressure(state.storageMetrics);
    if (diskPressure === 'EMERGENCY' || diskPressure === 'CRITICAL') {
        return 'DEFER';
    }

    // Drift / Risk Evaluation
    if (state.detectedDriftLevel === 'HIGH' || request.action.riskLevel === 'HIGH') {
        return 'ALLOW_WITH_APPROVAL';
    }

    if (state.detectedDriftLevel === 'CRITICAL') {
        return 'BLOCK';
    }

    return 'ALLOW';
}
