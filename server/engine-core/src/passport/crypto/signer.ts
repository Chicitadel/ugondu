/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Passport
 * File           : signer.ts
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

import * as crypto from 'crypto';
import { Canonicalizer } from './canonicalizer';

export class Signer {
    private canonicalizer = new Canonicalizer();

    constructor(
        private algorithm: string,
        private privateKey: crypto.KeyObject | string
    ) {}

    public sign(payload: unknown): string {
        const data = this.canonicalizer.canonicalize(payload);
        const sign = crypto.createSign(this.algorithm);
        sign.update(data);
        sign.end();
        return sign.sign(this.privateKey, 'base64');
    }
}
