/******************************************************************************
 * Project        : Ugondu
 * Module         : doctor::model
 * File           : verification_contract.rs
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

// Implementation for verification_contract.rs
/**
 * @interface VerificationCheck
 * @description Corporate Governed interface implementation for VerificationCheck
 * @classification ENTERPRISE
 */
export interface VerificationCheck {
  name: string;
  description: string;
  critical: boolean;
}

/**
 * @interface VerificationContract
 * @description Corporate Governed interface implementation for VerificationContract
 * @classification ENTERPRISE
 */
export interface VerificationContract {
  remediationId: string;
  checks: VerificationCheck[];
  requiredPassRate: number; // 0-1
  timeoutMs: number;
}
