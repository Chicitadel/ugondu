/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Fabric Types
 * File           : fabric.ts
 * Version        : 1.0.0
 * Author         : Platform Engineering Team
 * Organization   : Air Roofers
 * Created Date   : 2026-10-02
 * Last Modified  : 2026-10-02
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

export interface ProvisioningTask {
  contextId: string;
  targetId: string;
  resourceType: string;
  provider: string;
  config: Record<string, unknown>;
}

/**
 * @interface ProvisioningResult
 * @description Corporate Governed interface implementation for ProvisioningResult
 * @classification ENTERPRISE
 */
export interface ProvisioningResult {
  contextId: string;
  targetId: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  resources: Array<{ id: string; type: string; status: string }>;
  completedAt: Date;
  error?: string;
}
