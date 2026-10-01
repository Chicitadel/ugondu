/******************************************************************************
 * Project        : Ugondu
 * Module         : Assurance
 * File           : recovery-point.ts
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

import { createHash, randomUUID } from 'crypto';

export interface RecoveryStateContext {
    resourceId: string;
    stateData: string;
    checksum: string;
}

export class RecoveryPoint {
    public readonly id: string;
    public readonly timestamp: Date;
    public readonly stateHash: string;
    public readonly metadata: Map<string, string>;
    private validated: boolean;

    constructor(
        public readonly context: RecoveryStateContext[]
    ) {
        this.id = randomUUID();
        this.timestamp = new Date();
        this.stateHash = this.computeStateHash(context);
        this.metadata = new Map<string, string>();
        this.validated = false;
    }

    private computeStateHash(context: RecoveryStateContext[]): string {
        const hash = createHash('sha256');
        const sortedContext = [...context].sort((a, b) => a.resourceId.localeCompare(b.resourceId));
        for (const item of sortedContext) {
            hash.update(item.resourceId);
            hash.update(item.checksum);
        }
        return hash.digest('hex');
    }

    public markValidated(): void {
        this.validated = true;
    }

    public isValidated(): boolean {
        return this.validated;
    }
}
