/******************************************************************************
 * Project        : Ugondu
 * Module         : Engine Core / Tenant
 * File           : tenant.ts
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

import { Environment } from './environment';
import { IsolationBoundary } from './isolation-boundary';

export enum TenantStatus {
    ACTIVE = 'ACTIVE',
    SUSPENDED = 'SUSPENDED',
    ARCHIVED = 'ARCHIVED'
}

export class Tenant {
    private readonly tenantId: string;
    private readonly organizationId: string;
    private status: TenantStatus;
    private readonly environments: Map<string, Environment>;
    private readonly rootBoundary: IsolationBoundary;

    constructor(tenantId: string, organizationId: string, rootBoundary: IsolationBoundary) {
        this.tenantId = tenantId;
        this.organizationId = organizationId;
        this.status = TenantStatus.ACTIVE;
        this.environments = new Map<string, Environment>();
        this.rootBoundary = rootBoundary;
    }

    public getTenantId(): string {
        return this.tenantId;
    }

    public getOrganizationId(): string {
        return this.organizationId;
    }

    public getStatus(): TenantStatus {
        return this.status;
    }

    public getRootBoundary(): IsolationBoundary {
        return this.rootBoundary;
    }

    public registerEnvironment(environment: Environment): void {
        const envId = environment.getEnvironmentId();
        if (this.environments.has(envId)) {
            throw new Error(`Environment ${envId} is already registered for tenant ${this.tenantId}`);
        }
        this.environments.set(envId, environment);
    }

    public getEnvironment(environmentId: string): Environment {
        const env = this.environments.get(environmentId);
        if (!env) {
            throw new Error(`Environment ${environmentId} not found in tenant ${this.tenantId}`);
        }
        return env;
    }

    public updateStatus(newStatus: TenantStatus): void {
        this.status = newStatus;
    }
}
