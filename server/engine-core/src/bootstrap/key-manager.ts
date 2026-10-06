/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Engine Core — Key Manager Bootstrap
 * File           : key-manager.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-02
 * Last Modified  : 2026-10-02
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Corporate Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 *
 * Standards:
 * - ISO 27001 / SOC 2 / OWASP ASVS 5.0 / NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import { generateKeyPairSync, createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { KeyLoader, KeyState } from '../crypto/key-loader';

export const KEYS_DIR = process.env['KEYS_DIR'] ?? path.resolve(__dirname, '../../keys');
const PRIV_KEY_PATH = path.join(KEYS_DIR, 'ed25519_private.pem');
const PUB_KEY_PATH  = path.join(KEYS_DIR, 'ed25519_public.pem');
const KEY_ID_PATH   = path.join(KEYS_DIR, 'key_id.txt');

/**
 * Load keys from disk, or generate a new Ed25519 keypair and persist it.
 * In production, key generation is forbidden — load MUST succeed.
 */
export function loadOrGeneratePersistentKeys(): KeyState {
  try {
    return new KeyLoader().load();
  } catch (err) {
    if (process.env['NODE_ENV'] === 'production') throw err;
    if (!fs.existsSync(KEYS_DIR)) fs.mkdirSync(KEYS_DIR, { recursive: true });
    const { publicKey, privateKey } = generateKeyPairSync('ed25519');
    const privPem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
    const pubPem  = publicKey.export({ type: 'spki', format: 'pem' }) as string;
    const keyId   = 'key_' + createHash('sha256').update(pubPem).digest('hex').substring(0, 16);
    fs.writeFileSync(PRIV_KEY_PATH, privPem, { encoding: 'utf-8', mode: 0o600 });
    try { fs.chmodSync(PRIV_KEY_PATH, 0o600); } catch { /* non-fatal on Windows */ }
    fs.writeFileSync(PUB_KEY_PATH, pubPem, { encoding: 'utf-8' });
    fs.writeFileSync(KEY_ID_PATH, keyId, { encoding: 'utf-8' });
    return { privateKey, publicKey, keyId, publicKeyPem: pubPem };
  }
}
