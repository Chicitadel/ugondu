/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Server / Engine Core / Discovery
 * File           : target-identity.ts
 * Version        : 1.0.0
 * Author         : Air Roofers Engineering
 * Organization   : Air Roofers Ltd
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

export interface SshTargetIdentity {
  host: string;
  expectedFingerprint: string;
}

export interface CloudTargetIdentity {
  accountId: string;
  expectedProvider: string;
}

export class TargetIdentityValidator {
  
  public validateSshIdentity(target: SshTargetIdentity, actualFingerprint: string): void {
    if (!actualFingerprint || actualFingerprint.trim() === '') {
      throw new Error('Identity Validation Failed: Empty fingerprint returned from target.');
    }

    if (target.expectedFingerprint !== actualFingerprint) {
      throw new Error(`Identity Validation Failed: Host ${target.host} fingerprint mismatch. Expected ${target.expectedFingerprint}, got ${actualFingerprint}.`);
    }
  }

  public validateCloudIdentity(target: CloudTargetIdentity, actualAccountId: string, actualProvider: string): void {
    if (target.accountId !== actualAccountId) {
      throw new Error(`Identity Validation Failed: Cloud account mismatch. Expected ${target.accountId}, got ${actualAccountId}.`);
    }

    if (target.expectedProvider !== actualProvider) {
      throw new Error(`Identity Validation Failed: Cloud provider mismatch. Expected ${target.expectedProvider}, got ${actualProvider}.`);
    }
  }
}
