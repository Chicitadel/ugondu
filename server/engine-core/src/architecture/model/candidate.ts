/******************************************************************************
 * Project        : Ugondu
 * Module         : Architecture Engine
 * File           : candidate.ts
 * Version        : 1.0.0
 * Author         : Air Roofers Engineering
 * Organization   : Air Roofers
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
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
 * Copyright (c) 2026 Air Roofers
 * All Rights Reserved.
 ******************************************************************************/

export interface ResourceDefinition {
  id: string;
  type: string;   // 'compute' | 'database' | 'network' | 'storage' | 'dns' | 'tls' | 'backup'
  name: string;
  provider: string;
  config: Record<string, unknown>;
}

export interface CostModel {
  monthlyEstimate: number;   // USD
  currency: 'USD';
  breakdown: Record<string, number>; // e.g. { compute: 20, database: 15 }
}

export interface RiskProfile {
  score: number;            // 0-100, lower is safer
  factors: string[];        // human-readable risk factors
}

export interface ArchitectureCandidate {
  id: string;
  name: string;
  provider: string;         // 'linux-vps' | 'cpanel' | 'aws' | 'kubernetes'
  description: string;
  resources: ResourceDefinition[];
  costModel: CostModel;
  riskProfile: RiskProfile;
  rollbackStrategy: string;
  availabilityCharacteristics: string;
}
