/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Server / Engine Core / Discovery
 * File           : read-only-gate.ts
 * Version        : 1.0.0
 * Author         : Air Roofers Engineering
 * Organization   : Air Roofers Ltd
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

// @ts-ignore
import { __t } from '@ugondu/shared';

/**
 * @class ReadOnlyGate
 * @description Corporate Governed class implementation for ReadOnlyGate
 * @classification ENTERPRISE
 */
export class ReadOnlyGate {
  private readonly requiredCapability = 'DISCOVERY_READ';

  /**
   * Evaluates if the current execution context has the DISCOVERY_READ capability.
   * Throws an error if the capability is missing, ensuring discovery cannot
   * alter state or write data outside of safe boundaries.
   */
  public enforce(capabilities: string[]): void {
    if (!capabilities.includes(this.requiredCapability)) {
      throw new Error(__t('messages.error.security_violation_missing_required_capabilit', { 'this_requiredCapability': this.requiredCapability }));
    }

    // Ensure no write capabilities are accidentally present in discovery context
    const forbiddenCapabilities = ['DISCOVERY_WRITE', 'SYSTEM_ADMIN', 'RESOURCE_MUTATE'];
    for (const forbidden of forbiddenCapabilities) {
      if (capabilities.includes(forbidden)) {
        throw new Error(__t('messages.error.security_violation_discovery_context_must_not', { 'forbidden': forbidden }));
      }
    }
  }

  public validateCommand(command: string): boolean {
    const dangerousTokens = ['>', '>>', 'rm', 'mv', 'cp', 'chmod', 'chown', 'wget', 'curl'];
    for (const token of dangerousTokens) {
      if (command.includes(` ${token} `) || command.startsWith(`${token} `)) {
        return false;
      }
    }
    return true;
  }
}
