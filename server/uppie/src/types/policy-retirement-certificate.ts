/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — Shared Types
 * File           : policy-retirement-certificate.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-02
 * Last Modified  : 2026-10-02
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Corporate Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001 / SOC 2 / OWASP ASVS 5.0 / NIST SP 800-53
 *
 * Signatures:
 * - Architecture Authority : Ujomor Systems Engineering
 * - Security Authority     : Ujomor Systems Governance
 * - Governance Authority   : Air Roofers Corporate Governance
 *
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import { UsageClassification } from './usage-classification';

/**
 * @interface PolicyRetirementCertificate
 * @description Corporate Governed interface implementation for PolicyRetirementCertificate
 * @classification ENTERPRISE
 */
export interface PolicyRetirementCertificate {
  certificateId:      string;    // UUID
  version:            string;
  policyId:           string;
  policyVersion:      string;
  tenant:             string;
  environment:        string;
  owner:              string;
  retiredBy:          string;    // Ugondu operation ID
  retiredAt:          string;    // ISO-8601

  reason:                  string;
  usageClassification:     UsageClassification;
  usageAnalysis: {
    lastUsed?:             string;
    usageFrequency?:       string;
    scheduledJobsScan:     boolean;
    failoverPathsScan:     boolean;
    emergencyPathsScan:    boolean;
    observationPeriodDays: number;
  };

  dependentResources:      string[];
  dependentActors:         string[];
  dependencyAnalysis:      string;

  simulationDigest:        string;    // SHA-256 of simulation result
  shadowPeriodDays:        number;
  shadowStartedAt:         string;
  shadowEndedAt:           string;
  shadowObservations:      string[];

  approvedBy:              string;
  approvedAt:              string;
  detachmentEvidence:      string;    // provider-native confirmation
  verificationEvidence:    string;

  retentionUntil:          string;    // ISO-8601
  rollbackReference:       string;
  signature:               string;    // Ed25519
}
