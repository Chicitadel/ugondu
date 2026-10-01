/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Engine Core
 * File           : key-loader.ts
 * Version        : 2.0.0
 * Author         : Server & Cryptography Engineering Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
 * Classification : ENTERPRISE | INTERNAL
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
 * - NIST SP 800-53
 *
 * Signatures:
 * - Architecture Authority
 * - Security Authority
 * - Governance Authority
 * - Deployment Authority
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

import { createPrivateKey, createPublicKey, KeyObject, createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface KeyState {
    privateKey: KeyObject;
    publicKey: KeyObject;
    keyId: string;
    publicKeyPem: string;
}

export class KeyLoadError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'KeyLoadError';
    }
}

export class KeyLoader {
    public load(): KeyState {
        // Attempt to read from environment variable
        const envKey = process.env.UGONDU_RECIPE_PRIVATE_KEY;
        if (envKey && envKey !== '<placeholder>') {
            try {
                // process env keys should be handled carefully
                const privateKey = createPrivateKey(envKey.replace(/\\n/g, '\n'));
                const publicKey = createPublicKey(privateKey);
                const pubPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;
                const keyId = 'key_' + createHash('sha256').update(pubPem).digest('hex').substring(0, 16);
                
                return {
                    privateKey,
                    publicKey,
                    keyId,
                    publicKeyPem: pubPem
                };
            } catch (err) {
                // Intentionally swallowing error details to prevent key material logging
                throw new KeyLoadError('Failed to parse UGONDU_RECIPE_PRIVATE_KEY from environment.');
            }
        }

        // Fallback to reading from KEYS_DIR
        const keysDir = process.env.KEYS_DIR || path.resolve(__dirname, '../../keys');
        const privKeyPath = path.join(keysDir, 'ed25519_private.pem');

        if (fs.existsSync(privKeyPath)) {
            try {
                const privPem = fs.readFileSync(privKeyPath, 'utf-8');
                const privateKey = createPrivateKey(privPem);
                const publicKey = createPublicKey(privateKey);
                const pubPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;
                const keyId = 'key_' + createHash('sha256').update(pubPem).digest('hex').substring(0, 16);

                return {
                    privateKey,
                    publicKey,
                    keyId,
                    publicKeyPem: pubPem
                };
            } catch (err) {
                throw new KeyLoadError('Failed to parse private key from file path.');
            }
        }

        throw new KeyLoadError('No private key available: UGONDU_RECIPE_PRIVATE_KEY not set and KEYS_DIR/ed25519_private.pem not found.');
    }
}
