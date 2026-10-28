/******************************************************************************
 * Project : Ugondu — Universal Delivery Operating System
 * Module         : Passport API
 * File           : router.ts
 * Version        : 1.0.0
 * Author         : Air Roofers Engineering
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
import { Router } from 'express';
import { setupPassportEndpoints } from './passport-endpoints';
import { setupExecutionEndpoints } from './execution-endpoints';

export function createPassportApiRouter(): Router {
  const router = Router();

  setupPassportEndpoints(router);
  setupExecutionEndpoints(router);

  return router;
}
