/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Move
 * File           : collector.ts
 * Version        : 1.0.0
 * Author         : Architecture Team
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

import { MigrationCertificate } from '../model/migration-certificate';
import { MigrationBlocker } from '../model/migration-blocker';

/**
 * @class EvidenceCollector
 * @description Corporate Governed class implementation for EvidenceCollector
 * @classification ENTERPRISE
 */
export class EvidenceCollector {
  private certificates: Map<string, MigrationCertificate> = new Map();
  private blockers: Map<string, MigrationBlocker[]> = new Map();

  public collectCertificate(planId: string, cert: MigrationCertificate): void {
    this.certificates.set(planId, cert);
  }

  public collectBlockers(planId: string, discoveredBlockers: MigrationBlocker[]): void {
    this.blockers.set(planId, discoveredBlockers);
  }

  public getEvidence(planId: string) {
    return {
      certificate: this.certificates.get(planId) || null,
      blockers: this.blockers.get(planId) || [],
    };
  }
}
