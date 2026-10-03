/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Engine Core — Telemetry Route
 * File           : telemetry.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers
 * Created Date   : 2026-10-02
 * Classification : ENTERPRISE
 * Governance: Corporate Governed / Security Reviewed / Architecture Controlled / Protocol Frozen
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import { Router, Request, Response } from 'express';
import { __t } from '@ugondu/shared';

export const telemetryRouter = Router();

telemetryRouter.post('/report', (req: Request, res: Response) => {
  const { transactionId, status } = req.body as { transactionId?: string; status?: string };
  if (!transactionId || !status) {
    res.status(400).json({ error: __t('invalid_telemetry') });
    return;
  }
  Logger.info(__t('telemetry_rec', transactionId, status));
  res.status(201).json({ message: __t('telemetry_saved') });
});
