/******************************************************************************
 * Project        : Ugondu
 * Module         : Engine Core / Tenant
 * File           : organization.ts
 * Version        : 1.0.0
 * Author         : Elite Ugondu Engineer
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

import { Tenant, TenantStatus } from './tenant';

export class Organization {
    private readonly organizationId: string;
    private readonly name: string;
    private readonly tenants: Map<string, Tenant>;

    constructor(organizationId: string, name: string) {
        this.organizationId = organizationId;
        this.name = name;
        this.tenants = new Map<string, Tenant>();
    }

    public getOrganizationId(): string {
        return this.organizationId;
    }

    public getName(): string {
        return this.name;
    }

    public addTenant(tenant: Tenant): void {
        if (tenant.getOrganizationId() !== this.organizationId) {
            throw new Error(`Tenant ${tenant.getTenantId()} does not belong to organization ${this.organizationId}`);
        }
        if (this.tenants.has(tenant.getTenantId())) {
            throw new Error(`Tenant ${tenant.getTenantId()} already exists in organization ${this.organizationId}`);
        }
        this.tenants.set(tenant.getTenantId(), tenant);
    }

    public getTenant(tenantId: string): Tenant {
        const tenant = this.tenants.get(tenantId);
        if (!tenant) {
            throw new Error(`Tenant ${tenantId} not found in organization ${this.organizationId}`);
        }
        return tenant;
    }

    public getActiveTenants(): Tenant[] {
        return Array.from(this.tenants.values()).filter(t => t.getStatus() === TenantStatus.ACTIVE);
    }
}
