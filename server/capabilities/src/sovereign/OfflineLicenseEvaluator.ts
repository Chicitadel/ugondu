/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Capabilities
 * File           : OfflineLicenseEvaluator.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-02
 * Last Modified  : 2026-10-02
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Corporate Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001 / SOC 2 / OWASP ASVS 5.0 / NIST SP 800-53
 *
 * Signatures:
 * - Architecture Authority : Ujomor Systems Engineering
 * - Security Authority     : Ujomor Systems Governance
 * - Governance Authority   : Air Roofers Corporate Governance
 *
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import * as crypto from 'crypto';
import { z } from 'zod';

// @ts-ignore
import { __t } from 'shared/i18n';

export const CapabilityManifestSchema = z.object({
  licenseId: z.string().uuid(),
  customerId: z.string(),
  capabilities: z.array(z.string()),
  validUntil: z.number(),
  signature: z.string(),
  issuerPublicKey: z.string(),
});

export type CapabilityManifest = z.infer<typeof CapabilityManifestSchema>;

/**
 * @interface HsmSimulationConfig
 * @description Corporate Governed interface implementation for HsmSimulationConfig
 * @classification ENTERPRISE
 */
export interface HsmSimulationConfig {
  algorithm: string;
  enforceFips: boolean;
}

/**
 * @class OfflineLicenseEvaluator
 * @description Corporate Governed class implementation for OfflineLicenseEvaluator
 * @classification ENTERPRISE
 */
export class OfflineLicenseEvaluator {
  private hsmConfig: HsmSimulationConfig;

  constructor(hsmConfig?: HsmSimulationConfig) {
    this.hsmConfig = hsmConfig ?? {
      algorithm: 'RSA-SHA256',
      enforceFips: true,
    };
  }

  public evaluateManifest(manifestRaw: unknown): CapabilityManifest {
    const parseResult = CapabilityManifestSchema.safeParse(manifestRaw);
    if (!parseResult.success) {
      throw new Error(__t('messages.error.manifest_schema_invalid'));
    }

    const manifest = parseResult.data;

    if (Date.now() > manifest.validUntil) {
      throw new Error(__t('messages.error.manifest_expired'));
    }

    const isSignatureValid = this.verifyHsmSignature(manifest);
    if (!isSignatureValid) {
      throw new Error(__t('messages.error.fips_validation_failed'));
    }

    return manifest;
  }

  private verifyHsmSignature(manifest: CapabilityManifest): boolean {
    try {
      const payloadData = {
        licenseId: manifest.licenseId,
        customerId: manifest.customerId,
        capabilities: manifest.capabilities,
        validUntil: manifest.validUntil,
        issuerPublicKey: manifest.issuerPublicKey,
      };

      const payloadString = JSON.stringify(payloadData);

      const verify = crypto.createVerify(this.hsmConfig.algorithm);
      verify.update(payloadString);
      verify.end();

      return verify.verify(manifest.issuerPublicKey, manifest.signature, 'base64');
    } catch (error) {
      return false;
    }
  }
}
