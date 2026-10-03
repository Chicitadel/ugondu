/******************************************************************************
 * Project        : Ugondu
 * Module         : doctor::model
 * File           : remediation_option.rs
 * Version        : 1.0.0
 * Author         : Air Roofers Engineering
 * Organization   : Air Roofers
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Human Governed
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

// Implementation for remediation_option.rs
/**
 * @interface RemediationOption
 * @description Corporate Governed interface implementation for RemediationOption
 * @classification ENTERPRISE
 */
export interface RemediationOption {
  id: string;
  description: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  estimatedDuration: number; // seconds
  reversible: boolean;
  requiresDowntime: boolean;
  steps: string[];
}
