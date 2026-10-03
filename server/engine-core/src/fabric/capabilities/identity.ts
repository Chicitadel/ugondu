/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Provider Fabric — Authorization Capability
 * File           : identity.ts
 * Version        : 2.0.0
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
 * AuthorizationCapability is the Fabric-layer authorization interface.
 * It declares what the Provider Fabric contract requires from any authorization-capable
 * provider adapter. Implementation lives in server/uppie/src/adapters/.
 *
 * This interface is provider-neutral. All provider-specific logic lives in
 * the UPPIE adapter layer (IPolicyProviderAdapter).
 *
 * Replaces: IdentityCapability (v1.0.0) — deprecated, dead code, removed.
 */
export interface AuthorizationCapability {
  /** Discover all policies, roles, and assignments in the target environment. */
  discoverAuthority(context: AuthorizationCapabilityContext): Promise<AuthorityDiscoveryResult>;

  /** Calculate the effective authority for an actor on a specific resource. */
  evaluateEffectiveAuthority(
    actorId: string,
    resourceId: string,
    context: AuthorizationCapabilityContext
  ): Promise<AuthorityEvaluationResult>;

  /** Generate minimum required authorization rules for declared capabilities. */
  generateMinimumAuthority(
    requiredCapabilities: string[],
    resourceScope: string[],
    context: AuthorizationCapabilityContext
  ): Promise<GeneratedAuthorityResult>;

  /** Apply generated authority to the target environment. */
  applyAuthority(
    grants: GeneratedAuthorityResult,
    context: AuthorizationCapabilityContext
  ): Promise<AuthorityApplicationResult>;

  /** Revoke a previously applied temporary authority grant. */
  revokeAuthority(
    authId: string,
    context: AuthorizationCapabilityContext
  ): Promise<AuthorityRevocationResult>;

  /** Get the provider's authorization constraint limits. */
  getAuthorizationConstraints(
    context: AuthorizationCapabilityContext
  ): Promise<AuthorizationConstraintResult>;
}

/**
 * @interface AuthorizationCapabilityContext
 * @description Corporate Governed interface implementation for AuthorizationCapabilityContext
 * @classification ENTERPRISE
 */
export interface AuthorizationCapabilityContext {
  tenantId:       string;
  environmentId:  string;
  provider:       string;
  region?:        string;
  credentials:    Record<string, string>;
  operationId?:   string;
  executionId?:   string;
}

/**
 * @interface AuthorityDiscoveryResult
 * @description Corporate Governed interface implementation for AuthorityDiscoveryResult
 * @classification ENTERPRISE
 */
export interface AuthorityDiscoveryResult {
  success:        boolean;
  policiesFound:  number;
  rolesFound:     number;
  actorsFound:    number;
  graphDigest:    string;    // SHA-256
  capturedAt:     string;    // ISO-8601
  errors:         string[];
}

/**
 * @interface AuthorityEvaluationResult
 * @description Corporate Governed interface implementation for AuthorityEvaluationResult
 * @classification ENTERPRISE
 */
export interface AuthorityEvaluationResult {
  actorId:     string;
  resourceId:  string;
  granted:     string[];    // capability IDs with GRANTED state
  denied:      string[];    // capability IDs with DENIED state
  unknown:     string[];    // capability IDs where state is indeterminate
  evaluatedAt: string;      // ISO-8601
}

/**
 * @interface GeneratedAuthorityResult
 * @description Corporate Governed interface implementation for GeneratedAuthorityResult
 * @classification ENTERPRISE
 */
export interface GeneratedAuthorityResult {
  ruleCount:   number;
  rules:       AuthorityRuleDescriptor[];
  reused:      string[];     // capability IDs satisfied by existing authority (no new rule)
  created:     string[];     // capability IDs requiring new grants
}

/**
 * @interface AuthorityRuleDescriptor
 * @description Corporate Governed interface implementation for AuthorityRuleDescriptor
 * @classification ENTERPRISE
 */
export interface AuthorityRuleDescriptor {
  ruleId:       string;
  capability:   string;
  resourceScope: string;
  isTemporary:  boolean;
  expiresAt?:   string;      // ISO-8601
}

/**
 * @interface AuthorityApplicationResult
 * @description Corporate Governed interface implementation for AuthorityApplicationResult
 * @classification ENTERPRISE
 */
export interface AuthorityApplicationResult {
  success:      boolean;
  applied:      string[];    // ruleIds successfully applied
  failed:       string[];    // ruleIds that failed to apply
  authId:       string;      // TemporaryAuthorization.authId if temporary
  providerRef:  string;      // provider-native reference (e.g., IAM policy ARN)
}

/**
 * @interface AuthorityRevocationResult
 * @description Corporate Governed interface implementation for AuthorityRevocationResult
 * @classification ENTERPRISE
 */
export interface AuthorityRevocationResult {
  success:           boolean;
  revokedAt?:        string;    // ISO-8601
  providerEvidence:  string;
  failureReason?:    string;
}

/**
 * @interface AuthorizationConstraintResult
 * @description Corporate Governed interface implementation for AuthorizationConstraintResult
 * @classification ENTERPRISE
 */
export interface AuthorizationConstraintResult {
  maxPoliciesPerRole:   number | null;   // null = not observable
  maxRolesPerIdentity:  number | null;
  maxAssignments:       number | null;
  currentUsage: {
    policiesPerRole:    number;
    rolesPerIdentity:   number;
    totalAssignments:   number;
  };
}
