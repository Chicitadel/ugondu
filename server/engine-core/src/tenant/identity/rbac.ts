/******************************************************************************
 * Project        : Ugondu
 * Module         : Tenant Identity
 * File           : rbac.ts
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

export interface Role {
  readonly id: string;
  readonly name: string;
  readonly permissions: ReadonlyArray<string>;
}

/**
 * @interface RoleBinding
 * @description Corporate Governed interface implementation for RoleBinding
 * @classification ENTERPRISE
 */
export interface RoleBinding {
  readonly subjectId: string;
  readonly roleId: string;
  readonly tenantId: string;
}

/**
 * @class RBACManager
 * @description Corporate Governed class implementation for RBACManager
 * @classification ENTERPRISE
 */
export class RBACManager {
  private roles: Map<string, Role> = new Map();
  private bindings: Map<string, RoleBinding[]> = new Map();

  public registerRole(role: Role): void {
    this.roles.set(role.id, role);
  }

  public bindRole(binding: RoleBinding): void {
    const existing = this.bindings.get(binding.subjectId) || [];
    this.bindings.set(binding.subjectId, [...existing, binding]);
  }

  public getSubjectPermissions(subjectId: string, tenantId: string): Set<string> {
    const subjectBindings = this.bindings.get(subjectId) || [];
    const permissions = new Set<string>();

    for (const binding of subjectBindings) {
      if (binding.tenantId === tenantId) {
        const role = this.roles.get(binding.roleId);
        if (role) {
          role.permissions.forEach(p => permissions.add(p));
        }
      }
    }

    return permissions;
  }
}
