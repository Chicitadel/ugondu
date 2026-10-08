/******************************************************************************
 * Project        : UAIGOS
 * Module         : Resource Protocols
 * File           : resource.protocol.ts
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
import {
  ResourceClassificationEnum,
  UgonduManagedSchema,
  UgonduTransactionIdSchema
} from '../schemas/resource-classification.schema';

export type ResourceClassification = z.infer<typeof ResourceClassificationEnum>;
export type UgonduTransactionId = z.infer<typeof UgonduTransactionIdSchema>;
export type UgonduManaged = z.infer<typeof UgonduManagedSchema>;

export interface IResourceProvenanceProtocol {
  validateOwnership(resourceId: string): Promise<boolean>;
  getClassification(resourceId: string): Promise<ResourceClassification>;
  registerResource(resourceId: string, classification: ResourceClassification): Promise<UgonduTransactionId>;
  auditProvenance(resourceId: string): Promise<UgonduManaged>;
}
