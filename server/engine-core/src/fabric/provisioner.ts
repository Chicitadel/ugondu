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

import { ExecutionEnvelope } from '../types/passport';
import { ProvisioningTask, ProvisioningResult } from '../types/fabric';
import { FabricController } from '../fabric-controller';

import { TenantContextGuard } from '../tenant/integration/twin-isolation-guard';

export class Provisioner {
    constructor(private readonly controller: FabricController) {}

    public async provision(envelope: any, task: ProvisioningTask): Promise<ProvisioningResult> {
        // Tenant isolation gate — MUST precede all execution logic
        const guard = new TenantContextGuard();
        guard.assertContext(envelope?.securityContext);

        if (!envelope || !envelope.signature) {
            throw new Error('Provisioning blocked: Missing valid ExecutionEnvelope');
        }

        // Verify the signature structurally
        if (!envelope.signature.startsWith('SIG:')) {
            throw new Error('Provisioning blocked: Invalid ExecutionEnvelope signature format');
        }

        if (envelope.contextId !== task.contextId) {
            throw new Error('Provisioning blocked: Context ID mismatch in ExecutionEnvelope');
        }

        return await this.controller.allocateResources(task);
    }
}
