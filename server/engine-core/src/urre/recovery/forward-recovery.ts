/******************************************************************************
 * Project        : URRE Engine Core
 * Module         : URRE Recovery
 * File           : forward-recovery.ts
 * Version        : 1.0.0
 * Author         : Corporate Engineer
 * Organization   : Air Roofers
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Corporate Governed
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

import { Operation } from '../model/operation';

/**
 * @interface MitigationStrategy
 * @description Corporate Governed interface implementation for MitigationStrategy
 * @classification ENTERPRISE
 */
export interface MitigationStrategy {
  canHandle(operation: Operation): boolean;
  mitigate(operation: Operation): Promise<void>;
}

/**
 * @class ForwardRecoveryManager
 * @description Corporate Governed class implementation for ForwardRecoveryManager
 * @classification ENTERPRISE
 */
export class ForwardRecoveryManager {
  private strategies: MitigationStrategy[] = [];

  public registerStrategy(strategy: MitigationStrategy): void {
    this.strategies.push(strategy);
  }

  public async mitigateIrreversibleOperation(operation: Operation): Promise<void> {
    for (const strategy of this.strategies) {
      if (strategy.canHandle(operation)) {
        await strategy.mitigate(operation);
        return;
      }
    }
    throw new Error(__t('messages.error.no_mitigation_strategy_found_for_operation'));
  }
}
