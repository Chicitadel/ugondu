/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Move
 * File           : compatibility.ts
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

import { MigrationBlocker } from '../model/migration-blocker';
import { v4 as uuidv4 } from 'uuid';

/**
 * @interface ArchitectureIR
 * @description Corporate Governed interface implementation for ArchitectureIR
 * @classification ENTERPRISE
 */
export interface ArchitectureIR {
  version: string;
  extensions: string[];
  capabilities: string[];
}

/**
 * @class CompatibilityAnalyzer
 * @description Corporate Governed class implementation for CompatibilityAnalyzer
 * @classification ENTERPRISE
 */
export class CompatibilityAnalyzer {
  public analyze(source: ArchitectureIR, target: ArchitectureIR): MigrationBlocker[] {
    const blockers: MigrationBlocker[] = [];

    if (source.version !== target.version) {
      blockers.push({
        blockerId: uuidv4(),
        severity: 'CRITICAL',
        description: `Version mismatch: source (${source.version}) vs target (${target.version})`,
        component: 'Core Architecture',
      });
    }

    for (const ext of source.extensions) {
      if (!target.extensions.includes(ext)) {
        blockers.push({
          blockerId: uuidv4(),
          severity: 'HIGH',
          description: `Missing extension on target: ${ext}`,
          component: `Extension:${ext}`,
        });
      }
    }

    return blockers;
  }
}
