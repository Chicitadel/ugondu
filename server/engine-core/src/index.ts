import { Logger } from '@ugondu/shared';
/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Engine Core — Server Entry Point
 * File           : index.ts
 * Version        : 3.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-09-30
 * Last Modified  : 2026-10-02
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
 * - ISO 27001 / SOC 2 / OWASP ASVS 5.0 / NIST SP 800-53
 *
 * Signatures:
 * - Architecture Authority : Ujomor Systems Engineering
 * - Security Authority     : Ujomor Systems Governance
 * - Governance Authority   : Air Roofers Corporate Governance
 * - Deployment Authority   : Air Roofers Release Engineering
 *
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import express from 'express';
import { corsMiddleware }               from './bootstrap/cors-config';
import { loadOrGeneratePersistentKeys } from './bootstrap/key-manager';
import { keysRouter }                  from './routes/keys';
import { telemetryRouter }             from './routes/telemetry';
import { createDeployRouter }          from './routes/deploy';
import { recoveryRouter }              from './routes/recovery';
import { passportGuardMiddleware }      from './middleware/passport-guard.middleware';
import { __t }                         from '@ugondu/shared';

// ─── Bootstrap ───────────────────────────────────────────────────────────────
export const keyState            = loadOrGeneratePersistentKeys();
export const BILLING_GATEWAY_URL = process.env['BILLING_GATEWAY_URL'] ?? 'http://localhost:4002/v1';

// ─── Express App ─────────────────────────────────────────────────────────────
const app = express();
app.use(corsMiddleware);
app.use(express.json());

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/v1/keys',      keysRouter);
app.use('/v1/telemetry', telemetryRouter);
app.use('/v1/deploy',    passportGuardMiddleware, createDeployRouter(keyState, BILLING_GATEWAY_URL));
app.use('/v1/recovery',  recoveryRouter);

// ─── Server ──────────────────────────────────────────────────────────────────
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
});

const PORT = process.env['PORT'] ?? 4001;
app.listen(PORT, () => {
  Logger.info(__t('listening', __t('ugondu_engine_core'), PORT));
});

