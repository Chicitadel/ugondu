/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Server / Engine Core / URRE / Execution
 * File           : fencing.ts
 * Version        : 1.0.0
 * Author         : Platform Architecture Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance:
 * - Enterprise Governed
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
 * Copyright (c) 2026 Air Roofers Ltd
 * All Rights Reserved.
 ******************************************************************************/

// @ts-ignore
import { __t } from '../../../../shared/i18n';

/**
 * @class FencingManager
 * @description Corporate Governed class implementation for FencingManager
 * @classification ENTERPRISE
 */
export class FencingManager {
  private currentTokens: Map<string, number> = new Map();

  constructor() {}

  public issueToken(resourceId: string): number {
    const nextToken = (this.currentTokens.get(resourceId) || 0) + 1;
    this.currentTokens.set(resourceId, nextToken);
    return nextToken;
  }

  public validateToken(resourceId: string, token: number): void {
    const currentToken = this.currentTokens.get(resourceId) || 0;
    if (token < currentToken) {
      throw new Error(__t('messages.error.stale_fencing_token_for_resource_expected_at_', { 'token': token, 'resourceId': resourceId, 'currentToken': currentToken }));
    }
  }

  public checkToken(resourceId: string, token: number): boolean {
    const currentToken = this.currentTokens.get(resourceId) || 0;
    return token >= currentToken;
  }
  
  public revokeToken(resourceId: string): void {
    const nextToken = (this.currentTokens.get(resourceId) || 0) + 1;
    this.currentTokens.set(resourceId, nextToken);
  }
}
