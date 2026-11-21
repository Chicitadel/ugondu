/******************************************************************************
 * Project        : Air Roofers Platform
 * Module         : Autopilot / Autonomy
 * File           : levels.ts
 * Version        : 1.0.0
 * Author         : Core Architecture Team
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
 *
 * Signatures:
 * - Architecture Authority
 * - Security Authority
 *
 * Copyright (c) 2026 Air Roofers
 * All Rights Reserved.
 ******************************************************************************/

export enum AutonomyLevel {
    L0_MANUAL = 'L0_MANUAL',
    L1_ASSISTED = 'L1_ASSISTED',
    L2_PARTIAL_AUTONOMY = 'L2_PARTIAL_AUTONOMY',
    L3_CONDITIONAL_AUTONOMY = 'L3_CONDITIONAL_AUTONOMY',
    L4_HIGH_AUTONOMY = 'L4_HIGH_AUTONOMY',
    L5_FULL_AUTONOMY = 'L5_FULL_AUTONOMY'
}
