/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Move
 * File           : migration-contract.ts
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

export const MigrationContractSchema = z.object({
  id: z.string().uuid(),
  sourceSystem: z.string().min(1),
  targetSystem: z.string().min(1),
  protocolVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  signedAt: z.date(),
});

export type MigrationContract = z.infer<typeof MigrationContractSchema>;
