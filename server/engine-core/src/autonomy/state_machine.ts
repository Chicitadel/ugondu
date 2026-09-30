/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Engine Core / Autonomy
 * File           : state_machine.ts
 * Version        : 2.1.0
 * Author         : Progressive Autonomy Engineering Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Last Modified  : 2026-09-30
 * Classification : ENTERPRISE | INTERNAL
 *
 * Standards: ISO 27001, SOC 2, OWASP ASVS, NIST SP 800-53
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

import { __t } from '@ugondu/shared';
import { SimulationResult } from '../simulation/simulator';

export type AutonomyLevel = 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6';

export interface AutonomyContext {
    trustEnvironment?: 'STAGING_VERIFIED' | 'PRODUCTION_HARDENED' | 'DEVELOPMENT_UNCONSTRAINED';
    targetHealth?: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
    rollbackAvailable?: boolean;
    dualApprovalRequired?: boolean;
    auditTrailReachable?: boolean;
}

export interface AutonomyDecision {
    level: AutonomyLevel;
    canAutoExecute: boolean;
    requiresManualApproval: boolean;
    reason: string;
}

export class ProgressiveAutonomyEngine {
    public static evaluateExecutionApproval(
        configuredLevel: AutonomyLevel,
        simulation: SimulationResult,
        context: AutonomyContext = {}
    ): AutonomyDecision {
        const trustEnv = context.trustEnvironment || 'PRODUCTION_HARDENED';
        const targetHealth = context.targetHealth || 'HEALTHY';
        const rollbackAvailable = context.rollbackAvailable ?? simulation.rollbackAvailable;
        const auditReachable = context.auditTrailReachable ?? true;
        const dualApproval = context.dualApprovalRequired ?? false;

        // Universal Safety Gate 1: If audit trail is unreachable, all auto-execution is forbidden
        if (!auditReachable) {
            return {
                level: configuredLevel,
                canAutoExecute: false,
                requiresManualApproval: true,
                reason: 'AUDIT_TRAIL_UNREACHABLE_BLOCKED'
            };
        }

        // Universal Safety Gate 2: If target health is degraded or unhealthy, hold for human sign-off
        if (targetHealth !== 'HEALTHY') {
            return {
                level: configuredLevel,
                canAutoExecute: false,
                requiresManualApproval: true,
                reason: `TARGET_HEALTH_${targetHealth}_BLOCKED`
            };
        }

        // Universal Safety Gate 3: Policy-mandated dual approval overrides autonomous levels
        if (dualApproval) {
            return {
                level: configuredLevel,
                canAutoExecute: false,
                requiresManualApproval: true,
                reason: 'DUAL_APPROVAL_MANDATED_BY_POLICY'
            };
        }

        switch (configuredLevel) {
            case 'L0':
                // L0: Always requires human sign-off
                return {
                    level: 'L0',
                    canAutoExecute: false,
                    requiresManualApproval: true,
                    reason: 'L0_ASSISTIVE_MANDATORY_HUMAN_APPROVAL'
                };

            case 'L1':
                // L1: Auto-approves only LOW risk
                if (simulation.riskCategory === 'LOW') {
                    return { level: 'L1', canAutoExecute: true, requiresManualApproval: false, reason: 'L1_LOW_RISK_AUTO_APPROVED' };
                }
                return { level: 'L1', canAutoExecute: false, requiresManualApproval: true, reason: 'L1_ELEVATED_RISK_NEEDS_APPROVAL' };

            case 'L2':
                // L2: Auto-approves LOW or MEDIUM risk if rollback is verified
                if (['LOW', 'MEDIUM'].includes(simulation.riskCategory) && rollbackAvailable) {
                    return { level: 'L2', canAutoExecute: true, requiresManualApproval: false, reason: 'L2_SUPERVISED_ROLLBACK_AVAILABLE' };
                }
                return { level: 'L2', canAutoExecute: false, requiresManualApproval: true, reason: 'L2_RISK_OR_ROLLBACK_UNAVAILABLE_NEEDS_APPROVAL' };

            case 'L3':
            case 'L4':
                // L3/L4: Auto-approves up to HIGH risk if zero policy violations and rollback guaranteed
                if (simulation.policyViolations.length === 0 && simulation.riskCategory !== 'CRITICAL' && rollbackAvailable) {
                    return { level: configuredLevel, canAutoExecute: true, requiresManualApproval: false, reason: `${configuredLevel}_POLICY_COMPLIANT_APPROVED` };
                }
                return { level: configuredLevel, canAutoExecute: false, requiresManualApproval: true, reason: `${configuredLevel}_POLICY_OR_CRITICAL_BLOCKED` };

            case 'L5':
            case 'L6':
                // L5/L6: Full Platform / Sovereign Autonomy — requires hardened trust environment,
                // zero policy violations, non-critical risk category, and verified rollback guarantees
                if (simulation.policyViolations.length > 0) {
                    return { level: configuredLevel, canAutoExecute: false, requiresManualApproval: true, reason: `${configuredLevel}_POLICY_VIOLATION_BLOCKED` };
                }
                if (simulation.riskCategory === 'CRITICAL') {
                    return { level: configuredLevel, canAutoExecute: false, requiresManualApproval: true, reason: `${configuredLevel}_CRITICAL_RISK_BLOCKED` };
                }
                if (!rollbackAvailable) {
                    return { level: configuredLevel, canAutoExecute: false, requiresManualApproval: true, reason: `${configuredLevel}_RECOVERY_GUARANTEE_MISSING_BLOCKED` };
                }
                if (trustEnv === 'DEVELOPMENT_UNCONSTRAINED') {
                    return { level: configuredLevel, canAutoExecute: false, requiresManualApproval: true, reason: `${configuredLevel}_UNCONSTRAINED_ENV_BLOCKED` };
                }
                return { level: configuredLevel, canAutoExecute: true, requiresManualApproval: false, reason: `${configuredLevel}_FULL_AUTONOMY_APPROVED` };

            default:
                throw new Error(__t('invalid_ctx'));
        }
    }
}
