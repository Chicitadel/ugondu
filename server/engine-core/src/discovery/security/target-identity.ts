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

// @ts-ignore
import { __t } from '@ugondu/shared';

/**
 * @interface SshTargetIdentity
 * @description Corporate Governed interface implementation for SshTargetIdentity
 * @classification ENTERPRISE
 */
export interface SshTargetIdentity {
  host: string;
  expectedFingerprint: string;
}

/**
 * @interface CloudTargetIdentity
 * @description Corporate Governed interface implementation for CloudTargetIdentity
 * @classification ENTERPRISE
 */
export interface CloudTargetIdentity {
  accountId: string;
  expectedProvider: string;
}

/**
 * @class TargetIdentityValidator
 * @description Corporate Governed class implementation for TargetIdentityValidator
 * @classification ENTERPRISE
 */
export class TargetIdentityValidator {

  public validateSshIdentity(target: SshTargetIdentity, actualFingerprint: string): void {
    if (!actualFingerprint || actualFingerprint.trim() === '') {
      throw new Error(__t('msg_identity_validation_failed_empty_fingerp'));
    }

    if (target.expectedFingerprint !== actualFingerprint) {
      throw new Error(__t('messages.error.identity_validation_failed_host_fingerprint_m', { 'target_host': target.host, 'target_expectedFingerprint': target.expectedFingerprint, 'actualFingerprint': actualFingerprint }));
    }
  }

  public validateCloudIdentity(target: CloudTargetIdentity, actualAccountId: string, actualProvider: string): void {
    if (target.accountId !== actualAccountId) {
      throw new Error(__t('messages.error.identity_validation_failed_cloud_account_mism', { 'target_accountId': target.accountId, 'actualAccountId': actualAccountId }));
    }

    if (target.expectedProvider !== actualProvider) {
      throw new Error(__t('messages.error.identity_validation_failed_cloud_provider_mis', { 'target_expectedProvider': target.expectedProvider, 'actualProvider': actualProvider }));
    }
  }
}
