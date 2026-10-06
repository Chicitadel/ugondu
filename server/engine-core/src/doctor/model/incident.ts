/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Doctor — Incident Model
 * File           : incident.ts
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

import { EvidenceItem } from '../evidence/collector';
import type { AuthorizationFailureIncident } from './authorization-failure';

/**
 * IncidentClass — typed enum replacing the legacy `category: string` field.
 * AUTHORIZATION_FAILURE is a first-class incident class that triggers
 * UPPIE diagnosis rather than a generic failure handler.
 */
export enum IncidentClass {
  INFRASTRUCTURE_FAILURE  = 'INFRASTRUCTURE_FAILURE',
  APPLICATION_FAILURE     = 'APPLICATION_FAILURE',
  DATA_FAILURE            = 'DATA_FAILURE',
  NETWORK_FAILURE         = 'NETWORK_FAILURE',
  AUTHORIZATION_FAILURE   = 'AUTHORIZATION_FAILURE',
  CONFIGURATION_FAILURE   = 'CONFIGURATION_FAILURE',
  CAPACITY_FAILURE        = 'CAPACITY_FAILURE',
  UNKNOWN                 = 'UNKNOWN',
}

export enum IncidentSeverity {
  CRITICAL = 'CRITICAL',
  HIGH     = 'HIGH',
  MEDIUM   = 'MEDIUM',
  LOW      = 'LOW',
  INFO     = 'INFO',
}

/**
 * IncidentRecord — the canonical incident model for Ugondu Doctor.
 *
 * v2.0 additions:
 * - `incidentClass`: typed enum (authoritative going forward)
 * - `severity`: typed enum (replaces severity: string)
 * - `uppieContext`: UPPIE authorization diagnosis (when class = AUTHORIZATION_FAILURE)
 *
 * Backward compatibility:
 * - `category: string` is retained as a deprecated alias of incidentClass.
 *   It will be removed after migration to typed consumers is complete.
 *
 * @deprecated category — use incidentClass instead
 */
export interface IncidentRecord {
  id:             string;
  targetId:       string;

  /** @deprecated Use incidentClass (typed). Retained for backward compatibility. */
  category:       string;

  /** Authoritative typed incident classification. Use this going forward. */
  incidentClass:  IncidentClass;

  fingerprint:    string;
  detectedAt:     Date;

  /** Typed severity — replaces severity: string. */
  severity:       IncidentSeverity;

  evidence:       EvidenceItem[];

  /**
   * UPPIE authorization diagnosis context.
   * Present only when incidentClass === AUTHORIZATION_FAILURE.
   * Contains full actor, target, missing authority, and resolution options.
   */
  uppieContext?:  AuthorizationFailureIncident;
}

/** Type guard: checks if this incident is an authorization failure. */
export function isAuthorizationFailure(
  incident: IncidentRecord
): incident is IncidentRecord & { uppieContext: AuthorizationFailureIncident } {
  return incident.incidentClass === IncidentClass.AUTHORIZATION_FAILURE;
}

/** Construct an IncidentRecord ensuring incidentClass and category stay in sync. */
export function createIncidentRecord(
  params: Omit<IncidentRecord, 'category'>
): IncidentRecord {
  return {
    ...params,
    category: params.incidentClass.toString(),  // keep backward-compat alias synchronized
  };
}
