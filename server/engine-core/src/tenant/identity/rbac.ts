/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Tenant Management
 * File           : rbac.ts
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

export interface Role {
  id: string;
  name: string;
  permissions: string[];
  parents: string[]; // Role IDs that this role inherits from
}

export class RoleManager {
  constructor(private roles: Map<string, Role>) {}

  public hasPermission(roleIds: string[], requiredPermission: string): boolean {
    const visitedRoles = new Set<string>();
    for (const roleId of roleIds) {
      if (this.checkRolePermission(roleId, requiredPermission, visitedRoles)) {
        return true;
      }
    }
    return false;
  }

  private checkRolePermission(roleId: string, requiredPermission: string, visited: Set<string>): boolean {
    if (visited.has(roleId)) return false;
    visited.add(roleId);

    const role = this.roles.get(roleId);
    if (!role) return false;

    if (role.permissions.includes(requiredPermission)) {
      return true;
    }

    for (const parentId of role.parents) {
      if (this.checkRolePermission(parentId, requiredPermission, visited)) {
        return true;
      }
    }

    return false;
  }
}
