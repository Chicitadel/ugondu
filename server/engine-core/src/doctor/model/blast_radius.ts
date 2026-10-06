/******************************************************************************
 * Project        : Ugondu
 * Module         : doctor::model
 * File           : blast_radius.rs
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

// Implementation for blast_radius.rs
/**
 * @interface BlastRadius
 * @description Corporate Governed interface implementation for BlastRadius
 * @classification ENTERPRISE
 */
export interface BlastRadius {
  targetId: string;
  affectedServices: string[];
  estimatedDataImpact: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimatedAvailabilityImpact: 'NONE' | 'DEGRADED' | 'PARTIAL' | 'FULL_OUTAGE';
  confidence: number; // 0-1
}
