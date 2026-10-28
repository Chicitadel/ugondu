/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Engine Core — Key Manager Bootstrap
 * File           : key-manager.ts
 * Version        : 3.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU / Ujomor Engineering
 * Created Date   : 2026-10-02
 * Last Modified  : 2026-10-18
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Corporate Policy Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001 / SOC 2 / OWASP ASVS 5.0 / NIST SP 800-53
 *
 * Signatures:
 * - Architecture Authority : Ujomor Systems Engineering
 * - Security Authority     : Ujomor Systems Governance
 * - Governance Authority   : Air Roofers Corporate Governance
 * - Deployment Authority   : Air Roofers Release Engineering
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

import { __t } from '@ugondu/shared';
import { generateKeyPairSync, createHash } from 'crypto';
import path from 'path';
import { globalTrustRegistry, Logger } from '@ugondu/shared';
import {
  KeyLoader,
  KeyState,
  KeyLoadError,
  FORBIDDEN_INSECURE_KEY_LITERALS,
  isForbiddenKeyLiteral,
  isManagedKeyReference,
} from '../encryption/key-loader';

export {
  KeyLoader,
  KeyState,
  KeyLoadError,
  FORBIDDEN_INSECURE_KEY_LITERALS,
  isForbiddenKeyLiteral,
  isManagedKeyReference,
};

export const KEYS_DIR = process.env['KEYS_DIR'] ?? path.resolve(__dirname, '../../keys');

function syncRecipeKeyToTrustRegistry(state: KeyState): void {
  try {
    const privPem = state.privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
    globalTrustRegistry.registerKey({
      keyId: state.keyId,
      algorithm: 'ed25519',
      status: 'ACTIVE',
      purpose: 'recipe',
      publicKey: state.publicKeyPem.trim(),
      privateKey: privPem.trim(),
    });
  } catch (err: unknown) {
    Logger.warn(__t('trust_registry_key_sync_warning'), {
      keyId: state.keyId,
      error: err instanceof Error ? err.message : String(err)
    });
  }
}

/**
 * Generates an ephemeral in-memory Ed25519 keypair without writing any private key material to disk.
 */
export function generateEphemeralMemoryKeys(): KeyState {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const pubPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;
  const keyId = 'key_' + createHash('sha256').update(pubPem).digest('hex').substring(0, 16);
  const state: KeyState = {
    privateKey,
    publicKey,
    keyId,
    publicKeyPem: pubPem,
    source: 'EPHEMERAL_MEMORY',
    ephemeral: true,
  };
  syncRecipeKeyToTrustRegistry(state);
  return state;
}

/**
 * Loads managed or environment-provided Ed25519 signing keys, failing closed in production
 * or when an insecure literal is supplied.
 * In non-production, generates ephemeral in-memory Ed25519 keys ONLY when
 * `NODE_ENV === 'test'` or `UGONDU_DEV_EPHEMERAL_KEYS === 'true'` without persisting private keys to disk.
 */
export function loadOrGeneratePersistentKeys(
  env?: NodeJS.ProcessEnv,
  secretStore?: Record<string, string>
): KeyState {
  const currentEnv = env ?? process.env;
  const nodeEnv = (currentEnv['NODE_ENV'] ?? 'development').trim().toLowerCase();

  try {
    const loaded = new KeyLoader(currentEnv, secretStore).load();
    syncRecipeKeyToTrustRegistry(loaded);
    return loaded;
  } catch (err) {
    if (err instanceof KeyLoadError && err.code !== 'NO_KEY_CONFIGURED') {
      throw err;
    }

    if (nodeEnv === 'production') {
      throw err;
    }

    const allowEphemeral =
      nodeEnv === 'test' || currentEnv['UGONDU_DEV_EPHEMERAL_KEYS'] === 'true';

    if (!allowEphemeral) {
      throw err;
    }

    return generateEphemeralMemoryKeys();
  }
}
