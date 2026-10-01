/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Move
 * File           : migration-plan.ts
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
import { MigrationContractSchema } from './migration-contract';
import { MigrationBlockerSchema } from './migration-blocker';

export const MigrationStepSchema = z.object({
  stepId: z.string(),
  action: z.enum(['EXTRACT', 'TRANSFORM', 'LOAD', 'VERIFY']),
  dependencies: z.array(z.string()),
});

export const MigrationPlanSchema = z.object({
  planId: z.string().uuid(),
  contract: MigrationContractSchema,
  steps: z.array(MigrationStepSchema),
  blockers: z.array(MigrationBlockerSchema).default([]),
});

export type MigrationPlan = z.infer<typeof MigrationPlanSchema>;
export type MigrationStep = z.infer<typeof MigrationStepSchema>;
