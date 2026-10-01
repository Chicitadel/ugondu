/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Move
 * File           : migration-state.ts
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

import { z } from 'zod';

export const MigrationStateSchema = z.enum([
  'PENDING',
  'DISCOVERY',
  'PLANNING',
  'EXECUTION',
  'VERIFICATION',
  'COMPLETED',
  'FAILED'
]);

export type MigrationState = z.infer<typeof MigrationStateSchema>;
