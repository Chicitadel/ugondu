/******************************************************************************
 * Project        : Ugondu
 * Module         : Assurance Engine
 * File           : certificate.ts
 * Version        : 1.0.0
 * Author         : Air Roofers Engineering
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

import * as crypto from 'crypto';

/**
 * @class Certificate
 * @description Corporate Governed class implementation for Certificate
 * @classification ENTERPRISE
 */
export class Certificate {
    constructor(
        public readonly id: string,
        public readonly subject: string,
        public readonly publicKey: string,
        public readonly validFrom: number,
        public readonly validTo: number,
        public readonly issuerSignature: string
    ) {}

    public isExpired(currentTime: number = Date.now()): boolean {
        return currentTime > this.validTo;
    }

    public isNotYetValid(currentTime: number = Date.now()): boolean {
        return currentTime < this.validFrom;
    }
}
