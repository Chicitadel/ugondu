/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Passport
 * File           : key-manager.ts
 * Version        : 1.0.0
 * Author         : Air Roofers Engineering
 * Organization   : Air Roofers
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
 * Copyright (c) 2026 Air Roofers
 * All Rights Reserved.
 ******************************************************************************/

import * as crypto from 'crypto';
import * as fs from 'fs';

/**
 * @interface KeyProvider
 * @description Corporate Governed interface implementation for KeyProvider
 * @classification ENTERPRISE
 */
export interface KeyProvider {
    getPrivateKey(keyId: string): Promise<crypto.KeyObject | string>;
    getPublicKey(keyId: string): Promise<crypto.KeyObject | string>;
}

/**
 * @class LocalKeyProvider
 * @description Corporate Governed class implementation for LocalKeyProvider
 * @classification ENTERPRISE
 */
export class LocalKeyProvider implements KeyProvider {
    constructor(private keyDir: string) {}

    public async getPrivateKey(keyId: string): Promise<crypto.KeyObject> {
        const keyData = await fs.promises.readFile(`${this.keyDir}/${keyId}.pem`, 'utf8');
        return crypto.createPrivateKey(keyData);
    }

    public async getPublicKey(keyId: string): Promise<crypto.KeyObject> {
        const keyData = await fs.promises.readFile(`${this.keyDir}/${keyId}.pub`, 'utf8');
        return crypto.createPublicKey(keyData);
    }
}

/**
 * @class KeyManager
 * @description Corporate Governed class implementation for KeyManager
 * @classification ENTERPRISE
 */
export class KeyManager {
    constructor(private provider: KeyProvider) {}

    public async loadPrivateKey(keyId: string): Promise<crypto.KeyObject | string> {
        return this.provider.getPrivateKey(keyId);
    }

    public async loadPublicKey(keyId: string): Promise<crypto.KeyObject | string> {
        return this.provider.getPublicKey(keyId);
    }
}
