/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Engine Core / AI / Guardrail
 * File           : guardrail.ts
 * Version        : 2.0.0
 * Author         : Delivery Safety Engineering Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Classification : ENTERPRISE | INTERNAL
 *
 * Standards: ISO 27001, SOC 2, OWASP ASVS, NIST SP 800-53
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

import { __t } from '@ugondu/shared';

/**
 * @interface AiProposedPlan
 * @description Corporate Governed interface implementation for AiProposedPlan
 * @classification ENTERPRISE
 */
export interface AiProposedPlan {
    proposedByModel: string;
    targetEnvironment: string;
    actions: Array<{ action: string; payload: Record<string, any> }>;
    reasoning: string;
}

/**
 * @interface GuardrailValidationResult
 * @description Corporate Governed interface implementation for GuardrailValidationResult
 * @classification ENTERPRISE
 */
export interface GuardrailValidationResult {
    passed: boolean;
    violations: string[];
    sanitizedPlan?: AiProposedPlan;
}

/**
 * @class AiDeliveryGuardrail
 * @description Corporate Governed class implementation for AiDeliveryGuardrail
 * @classification ENTERPRISE
 */
export class AiDeliveryGuardrail {
    private static readonly FORBIDDEN_ACTIONS = new Set([
        'SHELL_EXEC',
        'EXEC_RAW',
        'COMMAND',
        'ARBITRARY_SCRIPT',
        'BASH',
        'SH',
        'POWERSHELL'
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
        'SERVICE_RESTART'
    ]);

    public static validateAiPlan(plan: AiProposedPlan, allowedTargetCapabilities: string[]): GuardrailValidationResult {
        const violations: string[] = [];

        if (!plan.actions || !Array.isArray(plan.actions) || plan.actions.length === 0) {
            return { passed: false, violations: ['AI_PLAN_EMPTY_ACTIONS'] };
        }

        const allowedCapSet = new Set(allowedTargetCapabilities);

        for (const [idx, act] of plan.actions.entries()) {
            // 1. Strict elimination of generic shell escapes
            if (this.FORBIDDEN_ACTIONS.has(act.action.toUpperCase())) {
                violations.push(`VIOLATION_FORBIDDEN_SHELL_ACTION_AT_STEP_${idx}_${act.action}`);
            }

            // 2. Closed world action set validation
            if (!this.ALLOWED_ACTIONS.has(act.action)) {
                violations.push(`VIOLATION_UNKNOWN_ACTION_AT_STEP_${idx}_${act.action}`);
            }

            // 3. Capability intersection validation
            if (!allowedCapSet.has(act.action)) {
                violations.push(`VIOLATION_CAPABILITY_NOT_GRANTED_AT_STEP_${idx}_${act.action}`);
            }
        }

        return {
            passed: violations.length === 0,
            violations,
            sanitizedPlan: violations.length === 0 ? plan : undefined
        };
    }
}
