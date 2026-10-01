/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Server / Shared / Outcome Pack
 * File           : outcome-pack.ts
 * Version        : 1.0.0
 * Author         : Platform Architecture Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
 * Classification : ENTERPRISE | INTERNAL
 *
 * Standards: ISO 27001, SOC 2, OWASP ASVS 5.0, NIST SP 800-53
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

import { CapabilityKind } from './capability-model';

export interface ArchitectureAlternative {
  alternativeId: string;
  description: string;
  provider: string;
  estimatedMonthlyCost: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  availabilityTier: 'SINGLE_AZ' | 'MULTI_AZ' | 'MULTI_REGION';
  rollbackStrategy: string;
}

export interface OutcomePackVerificationSuite {
  requiredTests: string[];
  successCriteria: string[];
}

export interface OutcomePackCostModel {
  baselineMonthlyCost: number;
  scalingCostPerUnit: number;
  costUnit: string;
}

export interface OutcomePack {
  packId: string;
  name: string;
  intent: string;
  version: string;
  capabilitiesRequired: CapabilityKind[];
  architectureAlternatives: ArchitectureAlternative[];
  policies: string[];
  verificationSuite: OutcomePackVerificationSuite;
  backupConfiguration: Record<string, string>;
  rollbackStrategy: string;
  observabilityModel: string[];
  costModel: OutcomePackCostModel;
}
