/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : URRE
 * File           : executor.ts
 * Version        : 1.0.0
 * Author         : Engineering Team
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

import { ExecutionEnvelope } from '../types/passport';
import { ExecutionTask, ExecutionResult } from '../types/execution';
import { EngineInternal } from '../engine-internal';
import { __t } from '@ugondu/shared';

import { TenantContextGuard } from '../tenant/integration/twin-isolation-guard';

/**
 * @class Executor
 * @description Corporate Governed class implementation for Executor
 * @classification ENTERPRISE
 */
export class Executor {
    constructor(private readonly engine: EngineInternal) {}

    public async execute(envelope: any, task: ExecutionTask): Promise<ExecutionResult> {
        // Tenant isolation gate — MUST precede all execution logic
        const guard = new TenantContextGuard();
        guard.assertContext(envelope?.securityContext);

        if (!envelope || !envelope.signature) {
            throw new Error(__t('err_execution_blocked_no_envelope'));
        }

        // Verify the signature structurally (actual key validation done by crypto service)
        if (!envelope.signature.startsWith('SIG:')) {
            throw new Error(__t('err_execution_blocked_invalid_sig'));
        }

        // Ensure context IDs match
        if (envelope.contextId !== task.contextId) {
            throw new Error(__t('err_urre_context_id_mismatch'));
        }

        return await this.engine.runTask(task);
    }
}
