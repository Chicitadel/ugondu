/******************************************************************************
 * Project        : Ugondu
 * Module         : doctor::rca
 * File           : analyzer.rs
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

// RCA Analyzer implementation
import { IncidentRecord } from '../model/incident';
import { RcaResult, ConfidenceLevel } from '../model/rca_result';

/**
 * @class RcaAnalyzer
 * @description Corporate Governed class implementation for RcaAnalyzer
 * @classification ENTERPRISE
 */
export class RcaAnalyzer {
  analyze(incident: IncidentRecord): RcaResult {
    const evidenceKinds = [...new Set(incident.evidence.map(e => e.kind))];
    const rootCause = evidenceKinds.length > 0
      ? `Primary evidence type: ${evidenceKinds[0]}`
      : __t('root_cause_undetermined_from_a');
    const confidence: ConfidenceLevel = incident.evidence.length >= 3 ? 'HIGH'
      : incident.evidence.length >= 1 ? 'MEDIUM' : 'LOW';
    return {
      incidentId: incident.id,
      rootCause,
      contributingFactors: evidenceKinds.slice(1),
      confidence,
      recommendedActions: [__t('investigate_logs'), __t('review_recent_deployments')],
      analysedAt: new Date(),
    };
  }
}

import { isAuthorizationError } from './auth-error-codes';
import { IncidentClass, IncidentSeverity } from '../model/incident';
import type { AuthorizationFailureIncident } from '../model/authorization-failure';
import { randomUUID } from 'crypto';

/**
 * Classify an incident based on evidence provider error codes.
 * AUTHORIZATION_FAILURE is a first-class classification — never falls through
 * to UNKNOWN when an auth error code is present.
 */
export function classifyIncidentFromEvidence(
  evidence: Array<{ providerErrorCode?: string; provider?: string; message?: string }>,
  targetId: string,
  operationId: string,
  executionId: string,
  passportId: string
): { incidentClass: IncidentClass; uppieContext?: AuthorizationFailureIncident } {
  // Check for authorization failure first (highest specificity)
  for (const ev of evidence) {
    const code = ev.providerErrorCode ?? ev.message ?? '';
    if (isAuthorizationError(code, ev.provider)) {
      const uppieContext: AuthorizationFailureIncident = {
        incidentId:            randomUUID(),
        incidentClass:         IncidentClass.AUTHORIZATION_FAILURE,
        detectedAt:            new Date().toISOString(),
        severity:              IncidentSeverity.HIGH,
        actor:                 '',   // populated by caller from execution context
        target:                targetId,
        operation:             '',   // populated by caller
        provider:              ev.provider ?? 'UNKNOWN',
        providerErrorCode:     code,
        requiredCapability:    [],   // populated by UPPIE effective authority calculator
        presentAuthority:      [],
        missingAuthority:      [],
        assignmentPath:        '',
        recommendedResolution: [],
        estimatedFixTime:      '< 5 minutes',
        relatedOperationId:    operationId,
        relatedExecutionId:    executionId,
        passportId,
      };
      return { incidentClass: IncidentClass.AUTHORIZATION_FAILURE, uppieContext };
    }
  }
  return { incidentClass: IncidentClass.UNKNOWN };
}
