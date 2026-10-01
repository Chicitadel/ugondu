/******************************************************************************
 * Project        : Ugondu
 * Module         : Engine Core / Tenant
 * File           : environment.ts
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

import { IsolationBoundary } from './isolation-boundary';

export enum EnvironmentType {
    DEVELOPMENT = 'DEVELOPMENT',
    STAGING = 'STAGING',
    PRODUCTION = 'PRODUCTION'
}

export class Environment {
    private readonly environmentId: string;
    private readonly type: EnvironmentType;
    private readonly boundary: IsolationBoundary;
    private readonly resourceLimits: Map<string, number>;

    constructor(environmentId: string, type: EnvironmentType, boundary: IsolationBoundary) {
        this.environmentId = environmentId;
        this.type = type;
        this.boundary = boundary;
        this.resourceLimits = new Map<string, number>();
    }

    public getEnvironmentId(): string {
        return this.environmentId;
    }

    public getType(): EnvironmentType {
        return this.type;
    }

    public getBoundary(): IsolationBoundary {
        return this.boundary;
    }

    public setResourceLimit(resourceName: string, limit: number): void {
        if (limit < 0) {
            throw new Error(`Resource limit for ${resourceName} cannot be negative.`);
        }
        this.resourceLimits.set(resourceName, limit);
    }

    public checkResourceCapacity(resourceName: string, requestedAmount: number): boolean {
        const currentLimit = this.resourceLimits.get(resourceName);
        if (currentLimit === undefined) {
            return true;
        }
        return requestedAmount <= currentLimit;
    }
}
