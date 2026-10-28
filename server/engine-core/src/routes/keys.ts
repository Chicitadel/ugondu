/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Engine Core — Keys Route
 * File           : keys.ts
 * Version        : 2.0.0
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

import { Router, Request, Response } from 'express';
import { globalTrustRegistry } from '@ugondu/shared';

export const keysRouter = Router();

keysRouter.get('/', (_req: Request, res: Response) => {
  const keys = globalTrustRegistry.getTrustRootAnchor();
  const result = Object.keys(keys).map((keyId) => ({
    id:        keyId,
    type:      keys[keyId]!.algorithm,
    publicKey: keys[keyId]!.publicKey,
    purpose:   keys[keyId]!.purpose,
    status:    keys[keyId]!.status,
  }));
  res.json({ keys: result });
});

keysRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'engine-core',
    version: process.env['SERVICE_VERSION'] ?? '3.0.0',
    checkedAt: new Date().toISOString(),
  });
});
