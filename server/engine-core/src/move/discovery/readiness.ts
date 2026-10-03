/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Move
 * File           : readiness.ts
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

import { CompatibilityAnalyzer } from './compatibility';
import { SourceDiscovery } from './source-discovery';
import { TargetDiscovery } from './migration-discovery';
import { MigrationBlocker } from '../model/migration-blocker';

/**
 * @class ReadinessAssessor
 * @description Corporate Governed class implementation for ReadinessAssessor
 * @classification ENTERPRISE
 */
export class ReadinessAssessor {
  private compatibilityAnalyzer = new CompatibilityAnalyzer();
  private sourceDiscovery = new SourceDiscovery();
  private targetDiscovery = new TargetDiscovery();

  public assessReadiness(): { ready: boolean; blockers: MigrationBlocker[] } {
    const sourceIr = this.sourceDiscovery.discover();
    const targetIr = this.targetDiscovery.discover();
    
    const blockers = this.compatibilityAnalyzer.analyze(sourceIr, targetIr);
    
    return {
      ready: blockers.length === 0,
      blockers,
    };
  }
}
