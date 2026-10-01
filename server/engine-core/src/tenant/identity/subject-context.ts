/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Tenant Management
 * File           : subject-context.ts
 * Version        : 1.0.0
 * Author         : Air Roofers Engineering
 * Organization   : Air Roofers
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
 * Classification : ENTERPRISE
 *
 * Governance:
 * - AI Governed
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

export class SubjectContext {
  constructor(
    public readonly subjectId: string,
    public readonly attributes: Record<string, any>,
    public readonly roles: string[],
    public readonly scopes: string[]
  ) {}

  public hasRole(role: string): boolean {
    return this.roles.includes(role);
  }

  public hasScope(scope: string): boolean {
    return this.scopes.includes(scope);
  }

  public getAttribute<T>(key: string): T | undefined {
    return this.attributes[key] as T;
  }
}
