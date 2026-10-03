/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Move
 * File           : passport.ts
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

import { MigrationPlan } from '../model/migration-plan';
import { MigrationCertificate } from '../model/migration-certificate';
import { IntegrityManager } from './integrity';
import { v4 as uuidv4 } from 'uuid';

/**
 * @class EvidencePassport
 * @description Corporate Governed class implementation for EvidencePassport
 * @classification ENTERPRISE
 */
export class EvidencePassport {
  private integrityManager = new IntegrityManager();

  public issueCertificate(plan: MigrationPlan): MigrationCertificate {
    const hash = this.integrityManager.hashPlan(plan);
    const signature = this.integrityManager.signPayload(hash);

    return {
      certificateId: uuidv4(),
      planId: plan.planId,
      timestamp: new Date(),
      hash,
      signature,
    };
  }
  
  public verifyCertificate(certificate: MigrationCertificate, plan: MigrationPlan): boolean {
    const hash = this.integrityManager.hashPlan(plan);
    if (hash !== certificate.hash) return false;
    
    return this.integrityManager.verifySignature(hash, certificate.signature);
  }
}
