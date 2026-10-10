/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Fabric
 * File           : provisioner.ts
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

// @ts-ignore
import { __t } from '@ugondu/shared';

import { ExecutionEnvelope } from '../types/passport';
import { ProvisioningTask, ProvisioningResult } from '../types/fabric';
import { FabricController } from '../fabric-controller';

import { TenantContextGuard } from '../tenant/integration/twin-isolation-guard';

/**
 * @class Provisioner
 * @description Corporate Governed class implementation for Provisioner
 * @classification ENTERPRISE
 */
export class Provisioner {
    constructor(private readonly controller: FabricController) {}

    public async provision(envelope: any, task: ProvisioningTask): Promise<ProvisioningResult> {
        // Tenant isolation gate — MUST precede all execution logic
        const guard = new TenantContextGuard();
        guard.assertContext(envelope?.securityContext);

        if (!envelope || !envelope.signature) {
            throw new Error(__t('messages.error.provisioning_blocked_missing_valid_executione'));
        }

        // Verify the signature structurally
        if (!envelope.signature.startsWith('SIG:')) {
            throw new Error(__t('messages.error.provisioning_blocked_invalid_executionenvelop'));
        }

        if (envelope.contextId !== task.contextId) {
            throw new Error(__t('messages.error.provisioning_blocked_context_id_mismatch_in_e'));
        }

        return await this.controller.allocateResources(task);
    }
}
