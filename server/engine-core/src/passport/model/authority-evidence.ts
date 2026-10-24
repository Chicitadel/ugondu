/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Passport — Authority Evidence
 * File           : authority-evidence.ts
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

/**
 * AuthorityEvidence — UPPIE authority binding in the Delivery Passport.
 *
 * Records the complete authority lifecycle for an operation:
 * - What authority graph state was used (digest)
 * - What effective authority was calculated (digest)
 * - What minimum authority was required
 * - What was granted, what was temporary, what was revoked
 * - Simulation proof
 * - Approval record (when required)
 * - Reuse evidence (when existing authority was leveraged)
 */
export interface AuthorityEvidence {
  authorityGraphDigest:      string;   // SHA-256 of AuthorityGraph at time of evaluation
  effectiveAuthorityDigest:  string;   // SHA-256 of EffectiveAuthorityResult
  minimumAuthoritySet:       string[]; // list of AIR rule IDs compiled by LeastPrivilegeCompiler
  grantedAuthority:          GrantedAuthorityRecord[];
  temporaryGrants:           TemporaryGrantRecord[];
  revokedGrants:             RevokedGrantRecord[];
  policySimulationDigest:    string;   // SHA-256 of PolicySimulationResult
  approvalRecord?:           ApprovalRecord;
  reuseEvidence?:            ReuseEvidenceRecord;
}

/**
 * @interface GrantedAuthorityRecord
 * @description Corporate Governed interface implementation for GrantedAuthorityRecord
 * @classification ENTERPRISE
 */
export interface GrantedAuthorityRecord {
  ruleId:              string;   // AIR rule UUID
  managementAuthority: string;   // ManagementAuthority value
  issuedAt:            string;   // ISO-8601
  expiresAt:           string;   // ISO-8601 | 'PERMANENT'
  scope:               string;   // resource scope (provider-native ARN/ID/namespace)
  providerNativeId:    string;   // provider-native policy/role/binding ID
}

/**
 * @interface TemporaryGrantRecord
 * @description Corporate Governed interface implementation for TemporaryGrantRecord
 * @classification ENTERPRISE
 */
export interface TemporaryGrantRecord extends GrantedAuthorityRecord {
  operationId:          string;
  executionId:          string;
  purpose:              string;
  revocationStatus:     'PENDING' | 'REVOKED' | 'EXPIRED' | 'FAILED';
  revokedAt?:           string;   // ISO-8601
}

/**
 * @interface RevokedGrantRecord
 * @description Corporate Governed interface implementation for RevokedGrantRecord
 * @classification ENTERPRISE
 */
export interface RevokedGrantRecord {
  ruleId:          string;
  revokedAt:       string;   // ISO-8601
  revokedBy:       string;   // identity that performed revocation (Ugondu system)
  revocationProof: string;   // provider-native confirmation
}

/**
 * @interface ApprovalRecord
 * @description Corporate Governed interface implementation for ApprovalRecord
 * @classification ENTERPRISE
 */
export interface ApprovalRecord {
  approvedBy:    string;
  approvedAt:    string;   // ISO-8601
  scope:         string;   // what was approved
  expiresAt:     string;   // ISO-8601 — approval has a validity window
  approvalNonce: string;   // anti-replay
}

/**
 * @interface ReuseEvidenceRecord
 * @description Corporate Governed interface implementation for ReuseEvidenceRecord
 * @classification ENTERPRISE
 */
export interface ReuseEvidenceRecord {
  existingActorId:      string;   // actor whose existing authority was reused
  existingRuleId:       string;   // the existing AIR rule that was reused
  reusedCapabilities:   string[]; // capability IDs satisfied by reuse (no new grant)
}

/**
 * Check whether all temporary grants in the authority evidence have been revoked.
 * Returns false if any temporary grant is still PENDING.
 */
export function allTemporaryGrantsRevoked(evidence: AuthorityEvidence): boolean {
  return evidence.temporaryGrants.every(
    (g) => g.revocationStatus === 'REVOKED' || g.revocationStatus === 'EXPIRED'
  );
}

/**
 * Check whether any temporary grant failed to revoke — requires immediate escalation.
 */
export function hasFailedRevocations(evidence: AuthorityEvidence): boolean {
  return evidence.temporaryGrants.some((g) => g.revocationStatus === 'FAILED');
}
