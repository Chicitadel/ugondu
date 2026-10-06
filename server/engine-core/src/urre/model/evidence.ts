/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Server / Engine Core / URRE / Model
 * File           : evidence.ts
 * Version        : 1.0.0
 * Author         : Platform Architecture Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
 * Classification : ENTERPRISE | INTERNAL
 *
 * Standards: ISO 27001, SOC 2, OWASP ASVS 5.0, NIST SP 800-53
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

import { VerificationResult } from './checkpoint';
import { URREFailure } from './failure';

/**
 * @interface RecoveryEvidence
 * @description Corporate Governed interface implementation for RecoveryEvidence
 * @classification ENTERPRISE
 */
export interface RecoveryEvidence {
  evidenceId: string;
  failure: URREFailure;
  detectedAt: number;
  executionId: string;
  affectedResources: string[];
  lastVerifiedStateDigest: string;
  recoveryPointId: string;
  recoveryStrategy: string;
  actionsPerformed: string[];
  providerResponses: any[];
  verificationResults: VerificationResult[];
  remainingRisks: string[];
  finalStateDigest: string;
  actorAuthority: string;
  policyVersion: string;
  evidenceDigest: string;
  signature: string;
}

import * as crypto from 'crypto';

export function generateRecoveryManifest(evidence: RecoveryEvidence, privateKey: string): string {
  const jsonStr = JSON.stringify(evidence);
  const signature = crypto.sign('ed25519', Buffer.from(jsonStr), privateKey);
  return JSON.stringify({ evidence, signature: signature.toString('hex') });
}
