/******************************************************************************
 * Project        : Ugondu
 * Module         : Assurance
 * File           : engine.ts
 * Version        : 1.0.0
 * Author         : Enterprise Architecture Team
 * Organization   : Air Roofers
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
 * Classification : ENTERPRISE
 *
 * Governance:

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

import { SandboxAdapter } from '../providers/sandbox-adapter';
import { IsolationManager } from './isolation';
import { NetworkController } from './network';
import { QuotaEnforcer } from './quotas';
import { SandboxCleanup } from './cleanup';

/**
 * @class SandboxEngine
 * @description Corporate Governed class implementation for SandboxEngine
 * @classification ENTERPRISE
 */
export class SandboxEngine {
    constructor(
        private readonly adapter: SandboxAdapter,
        private readonly isolation: IsolationManager,
        private readonly network: NetworkController,
        private readonly quota: QuotaEnforcer,
        private readonly cleanup: SandboxCleanup
    ) {}

    public async initializeSandbox(id: string): Promise<void> {
        const handle = await this.adapter.createSandbox(id);
        
        await this.isolation.enforce(handle);
        await this.network.isolate(handle);
        await this.quota.applyLimits(handle);
    }

    public async teardownSandbox(id: string): Promise<void> {
        await this.cleanup.purge(id);
        await this.adapter.destroySandbox(id);
    }
}
