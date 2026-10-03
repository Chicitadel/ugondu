/******************************************************************************
 * Project        : Ugondu
 * Module         : Assurance Engine
 * File           : validator.ts
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
import { Certificate } from './certificate';

/**
 * @class CertificateValidator
 * @description Corporate Governed class implementation for CertificateValidator
 * @classification ENTERPRISE
 */
export class CertificateValidator {
    public verifySignature(data: string, signatureBase64: string, publicKeyPem: string): boolean {
        try {
            const verify = crypto.createVerify('SHA256');
            verify.update(data);
            verify.end();
            return verify.verify(publicKeyPem, signatureBase64, 'base64');
        } catch (error) {
            return false;
        }
    }

    public validateCertificate(cert: Certificate, issuerPublicKey: string): boolean {
        if (cert.isExpired() || cert.isNotYetValid()) {
            return false;
        }
        const dataToSign = `${cert.id}:${cert.subject}:${cert.publicKey}:${cert.validFrom}:${cert.validTo}`;
        return this.verifySignature(dataToSign, cert.issuerSignature, issuerPublicKey);
    }
}
