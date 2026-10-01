/******************************************************************************
 * Project        : Ugondu
 * Module         : doctor::evidence
 * File           : normalizer.rs
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

// Implementation for normalizer.rs
import { EvidenceItem } from './collector';

export interface NormalizedEvidence {
  id: string;
  kind: string;
  source: string;
  timestamp: string;
  summary: string;
}

export class EvidenceNormalizer {
  normalize(item: EvidenceItem): NormalizedEvidence {
    return {
      id: item.id,
      kind: item.kind,
      source: item.source,
      timestamp: item.collectedAt.toISOString(),
      summary: `${item.kind} from ${item.source} at ${item.collectedAt.toISOString()}`,
    };
  }
}
