/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Shared / Enterprise RBAC & ABAC
 * File           : rbac.ts
 * Version        : 2.0.0
 * Author         : Enterprise Identity & Access Control Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Classification : ENTERPRISE | INTERNAL
 *
 * Standards: ISO 27001, SOC 2, OWASP ASVS, NIST SP 800-53
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

import { __t } from '../i18n';

export type EnterpriseRole = 'ADMIN' | 'OPERATOR' | 'DEVELOPER' | 'AUDITOR';

export interface EnterprisePrincipal {
    id: string;
    email: string;
    tenantId: string;
    workspaceId: string;
    roles: EnterpriseRole[];
    mfaVerified: boolean;
    ipAddress: string;
}

export interface AccessContext {
    environmentId: string; // e.g., 'production', 'staging'
    action: string;        // e.g., 'DEPLOY', 'ROLLBACK', 'VIEW_LOGS'
    requiresMfa: boolean;
}

export interface ScimUserRecord {
    id: string;
    userName: string;
    active: boolean;
    emails: Array<{ value: string; primary: boolean }>;
    roles: string[];
}

export class EnterpriseAccessControl {
    private static readonly ROLE_PERMISSIONS: Record<EnterpriseRole, Set<string>> = {
        ADMIN: new Set(['DEPLOY', 'ROLLBACK', 'VIEW_LOGS', 'CONFIGURE_POLICY', 'MANAGE_USERS']),
        OPERATOR: new Set(['DEPLOY', 'ROLLBACK', 'VIEW_LOGS']),
        DEVELOPER: new Set(['DEPLOY_NON_PROD', 'VIEW_LOGS']),
        AUDITOR: new Set(['VIEW_LOGS', 'VIEW_AUDIT_TRAIL', 'EXPORT_EVIDENCE'])
    };

    public static evaluateAccess(principal: EnterprisePrincipal, context: AccessContext): boolean {
        // Enforce MFA for sensitive production operations
        if (context.environmentId === 'production' && !principal.mfaVerified) {
            return false;
        }

        // Determine if any role grants the requested action
        for (const role of principal.roles) {
            const permissions = this.ROLE_PERMISSIONS[role];
            if (!permissions) continue;

            if (role === 'DEVELOPER' && context.action === 'DEPLOY') {
                if (context.environmentId === 'production') {
                    return false; // Developers cannot deploy to production directly
                }
                return true;
            }

            if (permissions.has(context.action)) {
                return true;
            }
        }

        return false;
    }

    public static processScimSync(scimUser: ScimUserRecord): { action: 'CREATED' | 'UPDATED' | 'DEACTIVATED'; principalId: string } {
        if (!scimUser.active) {
            return { action: 'DEACTIVATED', principalId: scimUser.id };
        }
        return { action: 'UPDATED', principalId: scimUser.id };
    }
}
