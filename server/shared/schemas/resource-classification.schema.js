"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UgonduManagedSchema = exports.UgonduTransactionIdSchema = exports.ResourceClassificationEnum = void 0;
const zod_1 = require("zod");
exports.ResourceClassificationEnum = zod_1.z.enum([
    'OWNED_ACTIVE',
    'OWNED_ARCHIVED',
    'FOREIGN_RESOURCE',
    'ORPHANED_RESOURCE',
    'SHARED_RESOURCE',
    'SYSTEM_MANAGED'
]);
exports.UgonduTransactionIdSchema = zod_1.z.string().uuid().brand('UgonduTransactionId');
exports.UgonduManagedSchema = zod_1.z.object({
    isManaged: zod_1.z.boolean(),
    managedSince: zod_1.z.string().datetime(),
    lastVerified: zod_1.z.string().datetime().optional(),
    classification: exports.ResourceClassificationEnum,
    transactionId: exports.UgonduTransactionIdSchema.optional(),
    provenanceHash: zod_1.z.string().min(64).max(128).optional(),
});
