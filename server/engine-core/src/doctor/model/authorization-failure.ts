/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Doctor — Authorization Failure Model
 * File           : authorization-failure.ts
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

import { z } from 'zod';
import { IncidentClass, IncidentSeverity } from './incident';

/**
 * PolicyConflict — describes a policy that is actively blocking an operation.
 */
export interface PolicyConflict {
  conflictType:        'EXPLICIT_DENY' | 'BOUNDARY_RESTRICTION' | 'CONDITION_UNMET' | 'SCOPE_MISMATCH';
  conflictingPolicyId: string;
  conflictingRule:     string;
  explanation:         string;
}

/**
 * AuthorizationResolutionOption — a typed resolution strategy for a missing authority.
 *
 * Resolution options are always ordered by preference:
 *   1. REUSE_EXISTING  — safest, no new grants
 *   2. EXTEND_ROLE     — add minimum grants to existing role
 *   3. CREATE_GRANT    — create a new minimum-scope grant
 *   4. REQUEST_APPROVAL — escalate to approver
 *   5. CANCEL_OPERATION — abort safely
 */
export type AuthorizationResolutionOption =
  | { type: 'REUSE_EXISTING';    actorId: string;            assignmentPath: string }
  | { type: 'EXTEND_ROLE';       roleId: string;             missingGrants: string[] }
  | { type: 'CREATE_GRANT';      minimumGrants: string[];    scope: string }
  | { type: 'REQUEST_APPROVAL';  requiredAuthority: string;  approver: string }
  | { type: 'CANCEL_OPERATION';  reason: string };

/**
 * AuthorizationFailureIncident — the UPPIE authorization diagnosis record.
 *
 * Generated when an operation fails with AccessDenied (or equivalent).
 * Drives the Progressive Permission Acquisition flow:
 *   AccessDenied → Diagnosis → Least-privilege solution → Approval → Provision → Retry
 *
 * PROHIBITED patterns:
 *   - Blind retry on AccessDenied
 *   - Automatic privilege escalation
 *   - Ignore and continue
 */
export interface AuthorizationFailureIncident {
  incidentId:            string;
  incidentClass:         IncidentClass.AUTHORIZATION_FAILURE;
  detectedAt:            string;   // ISO-8601
  severity:              IncidentSeverity;

  // WHO attempted the operation
  actor:                 string;
  // ON WHAT resource/target
  target:                string;
  // WHAT operation was being performed
  operation:             string;
  // WHICH provider rejected it
  provider:              string;
  // Raw error code from provider
  providerErrorCode:     string;

  // WHAT was needed
  requiredCapability:    string[];
  // WHAT the actor actually has (effective authority)
  presentAuthority:      string[];
  // The delta: what is missing
  missingAuthority:      string[];

  // An active policy that is explicitly blocking (if applicable)
  policyConflict?:       PolicyConflict;
  // How the authority was evaluated (the assignment chain)
  assignmentPath:        string;

  // Ordered resolution options (REUSE first, CANCEL last)
  recommendedResolution: AuthorizationResolutionOption[];
  estimatedFixTime:      string;   // e.g. "< 2 minutes"

  relatedOperationId:    string;
  relatedExecutionId:    string;
  passportId:            string;
}

/** Zod schema for runtime validation of AuthorizationFailureIncident. */
export const AuthorizationFailureIncidentSchema = z.object({
  incidentId:         z.string().uuid(),
  incidentClass:      z.literal(IncidentClass.AUTHORIZATION_FAILURE),
  detectedAt:         z.string().datetime(),
  severity:           z.nativeEnum(IncidentSeverity),
  actor:              z.string().min(1),
  target:             z.string().min(1),
  operation:          z.string().min(1),
  provider:           z.string().min(1),
  providerErrorCode:  z.string().min(1),
  requiredCapability: z.array(z.string()),
  presentAuthority:   z.array(z.string()),
  missingAuthority:   z.array(z.string()),
  policyConflict: z.object({
    conflictType:        z.enum(['EXPLICIT_DENY', 'BOUNDARY_RESTRICTION', 'CONDITION_UNMET', 'SCOPE_MISMATCH']),
    conflictingPolicyId: z.string(),
    conflictingRule:     z.string(),
    explanation:         z.string(),
  }).optional(),
  assignmentPath:        z.string(),
  recommendedResolution: z.array(z.discriminatedUnion('type', [
    z.object({ type: z.literal('REUSE_EXISTING'),    actorId: z.string(), assignmentPath: z.string() }),
    z.object({ type: z.literal('EXTEND_ROLE'),       roleId: z.string(), missingGrants: z.array(z.string()) }),
    z.object({ type: z.literal('CREATE_GRANT'),      minimumGrants: z.array(z.string()), scope: z.string() }),
    z.object({ type: z.literal('REQUEST_APPROVAL'),  requiredAuthority: z.string(), approver: z.string() }),
    z.object({ type: z.literal('CANCEL_OPERATION'),  reason: z.string() }),
  ])),
  estimatedFixTime:   z.string(),
  relatedOperationId: z.string(),
  relatedExecutionId: z.string(),
  passportId:         z.string(),
});
