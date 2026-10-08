/******************************************************************************
 * Project        : UAIGOS
 * Module         : Resource Classification Schema
 * File           : resource-classification.schema.ts
 * Version        : 1.0.0
 * Author         : Universal Provenance Engineer
 * Organization   : UAIGOS Organization
 * Created Date   : 2026-10-08
 * Last Modified  : 2026-10-08
 * Classification : ENTERPRISE
 *
 * Governance:
 * - AI Governed
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
 * Copyright (c) 2026 UAIGOS Organization
 * All Rights Reserved.
 ******************************************************************************/

import { z } from 'zod';

export const ResourceClassificationEnum = z.enum([
  'OWNED_ACTIVE',
  'OWNED_ARCHIVED',
  'FOREIGN_RESOURCE',
  'ORPHANED_RESOURCE',
  'SHARED_RESOURCE',
  'SYSTEM_MANAGED'
]);

export const UgonduTransactionIdSchema = z.string().uuid().brand('UgonduTransactionId');

export const UgonduManagedSchema = z.object({
  isManaged: z.boolean(),
  managedSince: z.string().datetime(),
  lastVerified: z.string().datetime().optional(),
  classification: ResourceClassificationEnum,
  transactionId: UgonduTransactionIdSchema.optional(),
  provenanceHash: z.string().min(64).max(128).optional(),
});
