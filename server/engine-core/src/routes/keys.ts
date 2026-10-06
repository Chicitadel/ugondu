/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Engine Core — Keys Route
 * File           : keys.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers
 * Created Date   : 2026-10-02
 * Classification : ENTERPRISE
 * Governance: Corporate Governed / Security Reviewed / Architecture Controlled / Protocol Frozen
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
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
  res.json({ status: 'ok', service: 'engine-core', cor_level: 'A' });
});
