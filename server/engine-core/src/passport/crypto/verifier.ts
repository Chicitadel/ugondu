/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Passport
 * File           : verifier.ts
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

export class Verifier {
    private canonicalizer = new Canonicalizer();

    constructor(
        private algorithm: string,
        private publicKey: crypto.KeyObject | string
    ) {}

    public verify(payload: unknown, signatureBase64: string): boolean {
        const data = this.canonicalizer.canonicalize(payload);
        const verify = crypto.createVerify(this.algorithm);
        verify.update(data);
        verify.end();
        return verify.verify(this.publicKey, signatureBase64, 'base64');
    }
}
