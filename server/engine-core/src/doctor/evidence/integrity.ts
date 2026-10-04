/******************************************************************************
 * Project        : Ugondu
 * Module         : doctor::evidence
 * File           : integrity.rs
 * Version        : 1.0.0
 * Author         : Air Roofers Engineering
 * Organization   : Air Roofers
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Human Governed
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

// Implementation for integrity.rs
import { createHash } from 'crypto';
import { EvidenceItem } from './collector';

/**
 * @class EvidenceIntegrityChecker
 * @description Corporate Governed class implementation for EvidenceIntegrityChecker
 * @classification ENTERPRISE
 */
export class EvidenceIntegrityChecker {
  verify(item: EvidenceItem): boolean {
    const payloadStr = JSON.stringify(item.payload, Object.keys(item.payload).sort());
    const expected = createHash('sha256').update(payloadStr).digest('hex');
    return expected === item.hash;
  }

  assertIntegrity(item: EvidenceItem): void {
    if (!this.verify(item)) {
      throw new Error(__t('messages.error.evidence_integrity_check_failed_for_item', { 'item_id': item.id }));
    }
  }
}
