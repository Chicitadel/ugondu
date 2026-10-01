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

import { Operation } from '../model/operation';

export interface MitigationStrategy {
  canHandle(operation: Operation): boolean;
  mitigate(operation: Operation): Promise<void>;
}

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
    throw new Error('No mitigation strategy found for operation');
  }
}
