/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Move
 * File           : migration-certificate.ts
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
import { AuthorityTranslationRecordSchema } from './authority-translation';
import type { AuthorityTranslationRecord } from './authority-translation';
import { hasBlockingUntranslatableRules } from './authority-translation';

export const MigrationCertificateSchema = z.object({
  certificateId:        z.string().uuid(),
  planId:               z.string().uuid(),
  timestamp:            z.date(),
  hash:                 z.string(),
  signature:            z.string(),
  authorityTranslation: AuthorityTranslationRecordSchema.optional(),
});

export type MigrationCertificate = z.infer<typeof MigrationCertificateSchema>;

export function hasAuthorityTranslation(
  cert: MigrationCertificate
): cert is MigrationCertificate & { authorityTranslation: AuthorityTranslationRecord } {
  return cert.authorityTranslation !== undefined;
}

export function isCutoverAuthorityReady(cert: MigrationCertificate): boolean {
  if (!cert.authorityTranslation) return true;  // no authority translation = always ready
  return !hasBlockingUntranslatableRules(cert.authorityTranslation);
}
