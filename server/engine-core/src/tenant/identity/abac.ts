/******************************************************************************
 * Project        : Ugondu
 * Module         : Tenant Identity
 * File           : abac.ts
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

import { SubjectContext } from './subject-context';

/**
 * @interface ABACPolicy
 * @description Corporate Governed interface implementation for ABACPolicy
 * @classification ENTERPRISE
 */
export interface ABACPolicy {
  readonly id: string;
  readonly effect: 'ALLOW' | 'DENY';
  readonly condition: (subject: SubjectContext, resource: any, environment: any) => boolean;
}

/**
 * @class ABACManager
 * @description Corporate Governed class implementation for ABACManager
 * @classification ENTERPRISE
 */
export class ABACManager {
  private policies: ABACPolicy[] = [];

  public registerPolicy(policy: ABACPolicy): void {
    this.policies.push(policy);
  }

  public evaluate(subject: SubjectContext, resource: any, environment: any): 'ALLOW' | 'DENY' {
    let allowed = false;

    for (const policy of this.policies) {
      if (policy.condition(subject, resource, environment)) {
        if (policy.effect === 'DENY') {
          return 'DENY';
        }
        allowed = true;
      }
    }

    return allowed ? 'ALLOW' : 'DENY';
  }
}
