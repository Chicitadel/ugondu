/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Server / Engine Core / URRE / Execution
 * File           : identity.ts
 * Version        : 1.0.0
 * Author         : Platform Architecture Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance:
 * - SOVEREIGN Governed
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
import { __t } from '@ugondu/shared';

import { ExecutionIdContext } from '../model/execution';
import { randomUUID } from 'crypto';

/**
 * @class IdentityUtils
 * @description Corporate Governed class implementation for IdentityUtils
 * @classification ENTERPRISE
 */
export class IdentityUtils {

  public static generateExecutionIdContext(
    tenantId: string,
    targetId: string,
    planDigest: string,
    policyDigest: string,
    actorIdentity: string,
    authorizationContext: string,
    idempotencyKey?: string
  ): ExecutionIdContext {
    return {
      executionId: randomUUID(),
      stepId: randomUUID(),
      operationId: randomUUID(),
      attemptId: randomUUID(),
      idempotencyKey: idempotencyKey || randomUUID(),
      targetId,
      tenantId,
      planDigest,
      policyDigest,
      actorIdentity,
      authorizationContext
    };
  }

  public static serializeContext(context: ExecutionIdContext): string {
    return Buffer.from(JSON.stringify(context)).toString('base64');
  }

  public static parseContext(serialized: string): ExecutionIdContext {
    try {
      const decoded = Buffer.from(serialized, 'base64').toString('utf-8');
      const context = JSON.parse(decoded) as Partial<ExecutionIdContext>;

      const requiredFields = [
        'executionId', 'stepId', 'operationId', 'attemptId',
        'idempotencyKey', 'targetId', 'tenantId', 'planDigest',
        'policyDigest', 'actorIdentity', 'authorizationContext'
      ];

      for (const field of requiredFields) {
        if (!context[field as keyof ExecutionIdContext]) {
          throw new Error(__t('messages.error.missing_required_field', { 'field': field }));
        }
      }

      return context as ExecutionIdContext;
    } catch (error) {
      throw new Error(`Failed to parse ExecutionIdContext: ${error instanceof Error ? error.message: __t('ui.responses.unknown_error')}`);
    }
  }
}
