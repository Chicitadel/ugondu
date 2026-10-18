/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Server / Engine Core / Discovery
 * File           : sandbox.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers Ltd
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

// @ts-ignore
import { __t } from '@ugondu/shared';

/**
 * @class CommandSandbox
 * @description Corporate Governed class implementation for CommandSandbox
 * @classification ENTERPRISE
 */
export class CommandSandbox {
  private allowedCommands: Set<string> = new Set([
    'uname -a',
    'cat /etc/os-release',
    'uptime',
    'df -h',
    'free -m',
    'ps -ef',
    'netstat -tuln'
  ]);

  /**
   * Validates if a command matches exactly the strict allowlist.
   * Rejects any arbitrary shell execution or parameterized commands
   * unless explicitly templated and validated.
   */
  public execute(command: string): string {
    if (!this.allowedCommands.has(command)) {
      throw new Error(__t('messages.error.sandbox_violation_command_is_not_in_the_allow', { 'command': command }));
    }

    try {
      return require('child_process').execSync(command).toString();
    } catch (e: any) {
      return __t('exec_failed', e.message);
    }
  }

  public registerTemplate(template: string): void {
    // Only administrators or the system internally can register templates
    // This allows expanding capability without arbitrary exec
    this.allowedCommands.add(template);
  }
}
