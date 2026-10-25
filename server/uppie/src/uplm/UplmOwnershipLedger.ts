/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE / UPLM — Ownership & Resource Provenance Ledger
 * File           : UplmOwnershipLedger.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-18
 * Last Modified  : 2026-10-18
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Corporate Policy Governed
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

import { createHash } from 'crypto';
import { __t } from '@ugondu/shared';
import type { UplmNormalizedPolicyState, UplmOwnershipClass } from './UplmTypes';

export interface OwnershipEvidenceSignals {
  immutableProviderResourceId: string;
  creationTransactionId?: string;
  providerTags: Record<string, string>;
  hasLedgerRecord: boolean;
  ledgerOwnershipClass?: UplmOwnershipClass;
  signedPlanHash?: string;
  documentHashMatchesPack: boolean;
  attachedConsumers: string[];
  externalConsumers: string[];
  explicitAdoptionAuthorized?: boolean;
  ledgerConflictDetected?: boolean;
}

export interface OwnershipLedgerRecord {
  ledgerSchemaVersion: '1.0.0';
  provider: string;
  targetIdentity: string;
  resourceType: 'IAM_ROLE' | 'IAM_MANAGED_POLICY' | 'IAM_POLICY_ATTACHMENT';
  immutableProviderId: string;
  logicalPackResourceId: string;
  packId: string;
  packVersion: string;
  packHash: string;
  ownershipClass: UplmOwnershipClass;
  evidenceDigest: string;
  createdOrAdoptedAt: string;
  actorId: string;
  creationTransactionId: string;
  beforeDocumentHash: string | null;
  currentDocumentHash: string;
  knownAttachments: string[];
  knownDependencies: string[];
  lastInspectedState: UplmNormalizedPolicyState;
  lifecycleTransactionRefs: string[];
  retirementEligible: boolean;
  retirementDecision: 'DELETE_ALLOWED' | 'PRESERVE_REQUIRED' | 'BLOCKED';
  retirementReasons: string[];
}

/**
 * UplmOwnershipLedger — Authoritative resource provenance and ownership classifier (UPLM Blueprint §6).
 *
 * INVARIANTS:
 * - 6 Ownership Classes: UGONDU_CREATED, UGONDU_ADOPTED, SHARED, USER_OWNED, EXTERNAL, UNKNOWN.
 * - Tags alone are mutable and are NEVER sufficient proof for destructive deletion.
 * - UGONDU_ADOPTED default retirement is PRESERVE (never delete on uninstall).
 * - Ledger loss or conflicting ownership evidence blocks automatic deletion.
 */
export class UplmOwnershipLedger {
  private readonly records = new Map<string, OwnershipLedgerRecord>();
  private corruptedOrMissing = false;

  markCorruptedOrMissing(corrupted: boolean): void {
    this.corruptedOrMissing = corrupted;
  }

  isHealthy(): boolean {
    return !this.corruptedOrMissing;
  }

  upsertRecord(record: OwnershipLedgerRecord): void {
    if (this.corruptedOrMissing) {
      throw new Error(__t('uplm.error.ledger_corrupt'));
    }
    this.records.set(record.immutableProviderId, record);
  }

  getRecord(immutableProviderId: string): OwnershipLedgerRecord | undefined {
    if (this.corruptedOrMissing) return undefined;
    return this.records.get(immutableProviderId);
  }

  listRecords(): OwnershipLedgerRecord[] {
    if (this.corruptedOrMissing) return [];
    return Array.from(this.records.values());
  }

  /**
   * Classifies resource ownership using multi-signal provenance (UPLM Blueprint §6.1 - §6.2).
   * Never trusts tags alone to classify an object as UGONDU_CREATED for deletion.
   */
  classifyOwnership(signals: OwnershipEvidenceSignals): {
    ownershipClass: UplmOwnershipClass;
    destructiveDeleteAllowed: boolean;
    defaultRetirementAction: 'DELETE' | 'PRESERVE' | 'BLOCK';
    reasons: string[];
  } {
    const reasons: string[] = [];

    if (this.corruptedOrMissing || signals.ledgerConflictDetected) {
      reasons.push('Ownership ledger is absent or contains conflicting provenance evidence.');
      return {
        ownershipClass: 'UNKNOWN',
        destructiveDeleteAllowed: false,
        defaultRetirementAction: 'BLOCK',
        reasons,
      };
    }

    if (signals.externalConsumers.length > 0) {
      reasons.push(
        `Resource has external consumers: [${signals.externalConsumers.join(', ')}].`
      );
      if (signals.hasLedgerRecord && signals.ledgerOwnershipClass === 'UGONDU_CREATED') {
        return {
          ownershipClass: 'SHARED',
          destructiveDeleteAllowed: false,
          defaultRetirementAction: 'PRESERVE',
          reasons,
        };
      }
      return {
        ownershipClass: 'EXTERNAL',
        destructiveDeleteAllowed: false,
        defaultRetirementAction: 'PRESERVE',
        reasons,
      };
    }

    // Tags alone without a verified ledger record and creation transaction ID are never treated as UGONDU_CREATED
    const hasUgonduTag = signals.providerTags['UgonduCOR'] === 'true';
    if (!signals.hasLedgerRecord) {
      if (signals.explicitAdoptionAuthorized) {
        reasons.push('Pre-existing object explicitly adopted by user; preserved on retirement.');
        return {
          ownershipClass: 'UGONDU_ADOPTED',
          destructiveDeleteAllowed: false,
          defaultRetirementAction: 'PRESERVE',
          reasons,
        };
      }
      if (hasUgonduTag) {
        reasons.push(
          'Resource has UgonduCOR tag but no authoritative ownership ledger record; tags alone cannot authorize deletion.'
        );
      } else {
        reasons.push('No ledger record or Ugondu provenance found.');
      }
      return {
        ownershipClass: 'UNKNOWN',
        destructiveDeleteAllowed: false,
        defaultRetirementAction: 'BLOCK',
        reasons,
      };
    }

    const ledgerClass = signals.ledgerOwnershipClass ?? 'UNKNOWN';
    if (ledgerClass === 'UGONDU_ADOPTED') {
      reasons.push('Resource is UGONDU_ADOPTED; default retirement behavior is PRESERVE.');
      return {
        ownershipClass: 'UGONDU_ADOPTED',
        destructiveDeleteAllowed: false,
        defaultRetirementAction: 'PRESERVE',
        reasons,
      };
    }

    if (ledgerClass === 'SHARED' || ledgerClass === 'USER_OWNED' || ledgerClass === 'EXTERNAL') {
      reasons.push(`Resource is classified as '${ledgerClass}' and must be preserved.`);
      return {
        ownershipClass: ledgerClass,
        destructiveDeleteAllowed: false,
        defaultRetirementAction: 'PRESERVE',
        reasons,
      };
    }

    if (ledgerClass === 'UGONDU_CREATED') {
      const hasFullProof =
        Boolean(signals.creationTransactionId) &&
        Boolean(signals.signedPlanHash) &&
        hasUgonduTag &&
        signals.documentHashMatchesPack;

      if (!hasFullProof) {
        reasons.push(
          'Ledger indicates UGONDU_CREATED, but multi-signal verification (transactionId, signedPlanHash, tag, documentHash) is incomplete.'
        );
        return {
          ownershipClass: 'UGONDU_CREATED',
          destructiveDeleteAllowed: false,
          defaultRetirementAction: 'PRESERVE',
          reasons,
        };
      }

      reasons.push(
        'Verified UGONDU_CREATED with matching ledger record, creationTransactionId, signedPlanHash, document hash, and zero external consumers.'
      );
      return {
        ownershipClass: 'UGONDU_CREATED',
        destructiveDeleteAllowed: true,
        defaultRetirementAction: 'DELETE',
        reasons,
      };
    }

    reasons.push('Ownership could not be deterministically established.');
    return {
      ownershipClass: 'UNKNOWN',
      destructiveDeleteAllowed: false,
      defaultRetirementAction: 'BLOCK',
      reasons,
    };
  }

  static computeEvidenceDigest(signals: OwnershipEvidenceSignals): string {
    return createHash('sha256').update(JSON.stringify(signals)).digest('hex');
  }
}
