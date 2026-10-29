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
import { verify, type KeyObject } from 'crypto';

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
    constructor(
        private readonly controller: FabricController,
        private readonly executionEnvelopePublicKey?: KeyObject
    ) {}

    private verifyEnvelopeSignature(envelope: ExecutionEnvelope): boolean {
        if (!envelope || typeof envelope.signature !== 'string' || !envelope.signature.startsWith('SIG:')) {
            return false;
        }
        const rawVerifiedAt = envelope.verifiedAt as unknown;
        const verifiedAt = rawVerifiedAt instanceof Date ? rawVerifiedAt : new Date(String(rawVerifiedAt));
        if (Number.isNaN(verifiedAt.getTime())) return false;

        const payload = JSON.stringify({
            passportId: envelope.passportId,
            contextId: envelope.contextId,
            verifiedAt: verifiedAt.toISOString()
        });
        try {
            return verify(
                null,
                Buffer.from(payload, 'utf8'),
                this.executionEnvelopePublicKey!,
                Buffer.from(envelope.signature.slice(4), 'base64url')
            );
        } catch {
            return false;
        }
    }

    public async provision(envelope: any, task: ProvisioningTask): Promise<ProvisioningResult> {
        // Tenant isolation gate — MUST precede all execution logic
        const guard = new TenantContextGuard();
        guard.assertContext(envelope?.securityContext);

        if (!envelope || !envelope.signature) {
            throw new Error(__t('messages.error.provisioning_blocked_missing_valid_executione'));
        }

        // A prefix is not proof: require the trusted public key and verify the signed envelope payload.
        if (!this.executionEnvelopePublicKey) {
            throw new Error('EXECUTION_ENVELOPE_VERIFIER_NOT_CONFIGURED');
        }
        if (!this.verifyEnvelopeSignature(envelope)) {
            throw new Error('EXECUTION_ENVELOPE_SIGNATURE_INVALID');
        }

        if (envelope.contextId !== task.contextId) {
            throw new Error(__t('messages.error.provisioning_blocked_context_id_mismatch_in_e'));
        }

        return await this.controller.allocateResources(task);
    }
}
