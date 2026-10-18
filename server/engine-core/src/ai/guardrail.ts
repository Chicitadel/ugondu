/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Engine Core / AI / Guardrail
 * File           : guardrail.ts
 * Version        : 3.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Last Modified  : 2026-10-18
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance:
 * - Corporate Policy Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001 / SOC 2 / OWASP ASVS / NIST SP 800-53
 *
 * Signatures:
 * - Architecture Authority : Ujomor Systems Engineering
 * - Security Authority     : Ujomor Systems Governance
 * - Governance Authority   : Air Roofers Corporate Governance
 * - Deployment Authority   : Air Roofers Release Engineering
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

export interface AiProposedPlan {
    proposedByModel: string;
    targetEnvironment: string;
    actions: Array<{ action: string; payload: Record<string, any> }>;
    reasoning: string;
}

export interface GuardrailValidationResult {
    passed: boolean;
    violations: string[];
    sanitizedPlan?: AiProposedPlan;
}

export class AiDeliveryGuardrail {
    private static readonly FORBIDDEN_ACTIONS = new Set([
        'SHELL_EXEC',
        'EXEC_RAW',
        'COMMAND',
        'ARBITRARY_SCRIPT',
        'BASH',
        'SH',
        'POWERSHELL',
    ]);

    private static readonly ALLOWED_ACTIONS = new Set([
        'FETCH_REPOSITORY',
        'SYNC_ENVIRONMENT',
        'PRUNE_RELEASES',
        'UPSELL_NOTICE',
        'NODE_INSTALL',
        'COMPOSER_INSTALL',
        'COPY_FILE',
        'CREATE_DIRECTORY',
        'SYMLINK',
        'SERVICE_RESTART',
    ]);

    public static validateAiPlan(
        plan: AiProposedPlan,
        allowedTargetCapabilities: string[]
    ): GuardrailValidationResult {
        const violations: string[] = [];

        if (!plan.actions || !Array.isArray(plan.actions) || plan.actions.length === 0) {
            return { passed: false, violations: ['AI_PLAN_EMPTY_ACTIONS'] };
        }

        const allowedCapSet = new Set(allowedTargetCapabilities);

        for (const [idx, act] of plan.actions.entries()) {
            if (this.FORBIDDEN_ACTIONS.has(act.action.toUpperCase())) {
                violations.push(`VIOLATION_FORBIDDEN_SHELL_ACTION_AT_STEP_${idx}_${act.action}`);
            }

            if (!this.ALLOWED_ACTIONS.has(act.action)) {
                violations.push(`VIOLATION_UNKNOWN_ACTION_AT_STEP_${idx}_${act.action}`);
            }

            if (!allowedCapSet.has(act.action)) {
                violations.push(`VIOLATION_CAPABILITY_NOT_GRANTED_AT_STEP_${idx}_${act.action}`);
            }
        }

        return {
            passed: violations.length === 0,
            violations,
            sanitizedPlan: violations.length === 0 ? plan : undefined,
        };
    }
}
