/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Move
 * File           : integrity.ts
 * Version        : 1.0.0
 * Author         : Architecture Team
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

import { createHash, generateKeyPairSync, sign, verify } from 'crypto';
import { MigrationPlan } from '../model/migration-plan';

export class IntegrityManager {
  private privateKey: string;
  public publicKey: string;

  constructor() {
    const { publicKey, privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    this.publicKey = publicKey;
    this.privateKey = privateKey;
  }

  public hashPlan(plan: MigrationPlan): string {
    const payload = JSON.stringify(plan);
    return createHash('sha256').update(payload).digest('hex');
  }

  public signPayload(payload: string): string {
    return sign('sha256', Buffer.from(payload), this.privateKey).toString('base64');
  }

  public verifySignature(payload: string, signatureBase64: string): boolean {
    return verify('sha256', Buffer.from(payload), this.publicKey, Buffer.from(signatureBase64, 'base64'));
  }
}
