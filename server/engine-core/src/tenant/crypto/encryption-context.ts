/******************************************************************************
 * Project        : Ugondu
 * Module         : Tenant Crypto
 * File           : encryption-context.ts
 * Version        : 1.0.0
 * Author : Ujomor Systems Engineering & Governance Authority
 * Organization   : Ujomor Platform
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Corporate Governed
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
 * Copyright (c) 2026 Ujomor Platform
 * All Rights Reserved.
 ******************************************************************************/

// @ts-ignore
import { __t } from '@ugondu/shared';
import * as crypto from 'crypto';

import { TenantKeyContext } from './tenant-key-context';

/**
 * @class EncryptionContext
 * @description Corporate Governed class implementation for EncryptionContext
 * @classification ENTERPRISE
 */
export class EncryptionContext {
    constructor(private readonly keyContext: TenantKeyContext) {
        if (keyContext.rotationStatus === 'revoked') {
            throw new Error(__t('msg_cannot_establish_encryption_context_with'));
        }
    }

    public encrypt(payload: Buffer): Buffer {
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-256-gcm', this.keyContext.rootKeyMaterial, iv);
        const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
        const tag = cipher.getAuthTag();
        return Buffer.concat([iv, tag, encrypted]);
    }

    public decrypt(cipher: Buffer): Buffer {
        if (cipher.length < 28) throw new Error(__t('messages.error.invalid_cipher_payload_format'));
        const iv = cipher.subarray(0, 12);
        const tag = cipher.subarray(12, 28);
        const encrypted = cipher.subarray(28);
        const decipher = crypto.createDecipheriv('aes-256-gcm', this.keyContext.rootKeyMaterial, iv);
        decipher.setAuthTag(tag);
        return Buffer.concat([decipher.update(encrypted), decipher.final()]);
    }
}
