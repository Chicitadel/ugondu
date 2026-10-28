/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Move
 * File           : compatibility.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers
 * Created Date   : 2026-10-01
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

import { __t } from '@ugondu/shared';
import { MigrationBlocker } from '../model/migration-blocker';
import { v4 as uuidv4 } from 'uuid';
import {
  evaluatePortabilityMigration,
  type PortabilityMigrationReceipt,
  type UniversalProjectModel,
} from '../portability';
import type { ExtendedEnvironmentTwin } from '../../twin/model/schema';

export { evaluatePortabilityMigration };

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
        description: __t('messages.error.version_mismatch', {
          source: source.version,
          target: target.version,
        }),
        component: __t('core_architecture'),
      });
    }

    for (const ext of source.extensions) {
      if (!target.extensions.includes(ext)) {
        blockers.push({
          blockerId: uuidv4(),
          severity: 'HIGH',
          description: __t('messages.error.missing_extension_on_target', { ext }),
          component: `Extension:${ext}`,
        });
      }
    }

    return blockers;
  }

  public analyzePortability(
    sourceTwin: ExtendedEnvironmentTwin,
    targetTwin: ExtendedEnvironmentTwin,
    projectModel?: Partial<UniversalProjectModel>
  ): PortabilityMigrationReceipt {
    return evaluatePortabilityMigration(sourceTwin, targetTwin, projectModel);
  }
}
