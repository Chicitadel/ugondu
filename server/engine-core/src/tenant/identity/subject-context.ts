/******************************************************************************
 * Project        : Ugondu
 * Module         : Tenant Identity
 * File           : subject-context.ts
 * Version        : 1.0.0
 * Author : Ujomor Systems Engineering & Governance Authority
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

export interface SubjectContext {
  readonly id: string;
  readonly tenantId: string;
  readonly aliases: ReadonlyArray<string>;
  readonly attributes: Readonly<Record<string, string | number | boolean>>;
  readonly isActive: boolean;
  readonly createdAt: Date;
}

/**
 * @class SubjectContextFactory
 * @description Corporate Governed class implementation for SubjectContextFactory
 * @classification ENTERPRISE
 */
export class SubjectContextFactory {
  public static create(
    id: string,
    tenantId: string,
    aliases: string[] = [],
    attributes: Record<string, string | number | boolean> = {},
    isActive: boolean = true
  ): SubjectContext {
    return Object.freeze({
      id,
      tenantId,
      aliases: Object.freeze([...aliases]),
      attributes: Object.freeze({ ...attributes }),
      isActive,
      createdAt: new Date(),
    });
  }
}
