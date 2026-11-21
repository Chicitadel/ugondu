/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Engine Core — Autonomous Deploy Bootstrap Policy Reconciler
 * File           : deploy-bootstrap-reconciler.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-21
 * Last Modified  : 2026-10-21
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Corporate Policy Governed
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

import { createHash } from 'crypto';
import canonicalize from 'canonicalize';
import { __t } from '@ugondu/shared';
import { AiDeliveryGuardrail, AiProposedPlan } from '../ai/guardrail';

export type DeployBootstrapOperatingState =
  | 'INITIAL_INSTALLATION_AUTHORIZED'
  | 'RETURNING_INSTALLATION_MATCHED'
  | 'DRIFT_DETECTED_RECONCILABLE'
  | 'BOOTSTRAP_AUTHORITY_MISSING_OR_INSUFFICIENT'
  | 'PROVIDER_OR_NETWORK_UNAVAILABLE'
  | 'OWNERSHIP_OR_PERMISSIONS_AMBIGUOUS';

export type DeployEntrypointSurface =
  | 'CLI'
  | 'UI'
  | 'IDE'
  | 'HEADLESS_CI'
  | 'AUTOMATED_WORKFLOW';

export interface DeployBootstrapReconciliationSummary {
  readyForDeploy: boolean;
  operatingState: DeployBootstrapOperatingState;
  entrypoint: DeployEntrypointSurface;
  aiAssisted: boolean;
  executionRoleName: string;
  reusedCanonicalRole: boolean;
  completedStages: string[];
  errorCode?: string;
  errorMessage?: string;
  missingCapabilities?: string[];
  supportedAuthorizationOptions?: string[];
  evidenceDigest: string;
}

export function resolveDeployEntrypoint(clientHeader?: string): DeployEntrypointSurface {
  switch ((clientHeader || '').toLowerCase()) {
    case 'ide':
      return 'IDE';
    case 'human-ui':
      return 'UI';
    case 'headless-ci':
      return 'HEADLESS_CI';
    case 'automation':
      return 'AUTOMATED_WORKFLOW';
    default:
      return 'CLI';
  }
}

export function evaluateDeployBootstrapAndAiGuardrails(
  reqBody: Record<string, unknown>,
  clientHeader: string | undefined,
  transactionId: string,
  targetPlatform: string,
  declaredCapabilities: string[]
): DeployBootstrapReconciliationSummary {
  const entrypoint = resolveDeployEntrypoint(clientHeader);
  const aiAssisted = Boolean(reqBody['aiPlan'] || (reqBody['metadata'] as Record<string, unknown> | undefined)?.['aiAssisted']);

  if (reqBody['aiPlan']) {
    const aiPlan = reqBody['aiPlan'] as AiProposedPlan;
    const allowedCaps =
      declaredCapabilities.length > 0
        ? declaredCapabilities
        : ['FETCH_REPOSITORY', 'SYNC_ENVIRONMENT', 'PRUNE_RELEASES', 'git_clone', 'write_env', 'exec_command'];
    const aiValidation = AiDeliveryGuardrail.validateAiPlan(aiPlan, allowedCaps);
    if (!aiValidation.passed) {
      return {
        readyForDeploy: false,
        operatingState: 'OWNERSHIP_OR_PERMISSIONS_AMBIGUOUS',
        entrypoint,
        aiAssisted: true,
        executionRoleName: 'UgonduCORExecutionRole',
        reusedCanonicalRole: false,
        completedStages: ['DISCOVER_AND_RECONCILE'],
        errorCode: 'AI_PLAN_GUARDRAIL_REJECTED',
        errorMessage: __t('deploy.pipeline.validate'),
        evidenceDigest: createHash('sha256').update(`ai-rejected:${transactionId}`).digest('hex'),
      };
    }
  }

  const bootstrapConfig = (reqBody['bootstrapReconciliation'] ?? {}) as Record<string, unknown>;
  const executionRoleName = String(bootstrapConfig['executionRoleName'] ?? 'UgonduCORExecutionRole');
  const runnerRoleName = String(bootstrapConfig['runnerRoleName'] ?? 'UgonduCORRunner');

  if (bootstrapConfig['targetRoleForAttachment'] === runnerRoleName) {
    return {
      readyForDeploy: false,
      operatingState: 'OWNERSHIP_OR_PERMISSIONS_AMBIGUOUS',
      entrypoint,
      aiAssisted,
      executionRoleName,
      reusedCanonicalRole: false,
      completedStages: ['DISCOVER_AND_RECONCILE'],
      errorCode: 'UG-SELF-ESCALATION-BLOCKED',
      errorMessage: __t('bootstrap.state.ownership_ambiguous', { id: runnerRoleName }),
      evidenceDigest: createHash('sha256').update(`self-escalation:${transactionId}`).digest('hex'),
    };
  }

  if (bootstrapConfig['providerReachable'] === false) {
    return {
      readyForDeploy: false,
      operatingState: 'PROVIDER_OR_NETWORK_UNAVAILABLE',
      entrypoint,
      aiAssisted,
      executionRoleName,
      reusedCanonicalRole: true,
      completedStages: ['DISCOVER_AND_RECONCILE'],
      errorCode: 'UG-PROVIDER-UNAVAILABLE',
      errorMessage: __t('bootstrap.state.provider_unavailable'),
      evidenceDigest: createHash('sha256').update(`network-unavailable:${transactionId}`).digest('hex'),
    };
  }

  if (bootstrapConfig['ownershipAmbiguous'] === true) {
    return {
      readyForDeploy: false,
      operatingState: 'OWNERSHIP_OR_PERMISSIONS_AMBIGUOUS',
      entrypoint,
      aiAssisted,
      executionRoleName,
      reusedCanonicalRole: false,
      completedStages: ['DISCOVER_AND_RECONCILE'],
      errorCode: 'UG-OWNERSHIP-AMBIGUOUS',
      errorMessage: __t('bootstrap.state.ownership_ambiguous', { id: executionRoleName }),
      evidenceDigest: createHash('sha256').update(`ownership-ambiguous:${transactionId}`).digest('hex'),
    };
  }

  const policiesAttached = bootstrapConfig['policiesAttached'] !== false;
  const bootstrapAuthorized = bootstrapConfig['bootstrapAuthorized'] !== false;
  const driftDetected = bootstrapConfig['driftDetected'] === true;

  if (!policiesAttached && !bootstrapAuthorized) {
    return {
      readyForDeploy: false,
      operatingState: 'BOOTSTRAP_AUTHORITY_MISSING_OR_INSUFFICIENT',
      entrypoint,
      aiAssisted,
      executionRoleName,
      reusedCanonicalRole: true,
      completedStages: ['DISCOVER_AND_RECONCILE', 'VALIDATE_POLICY_PACK'],
      errorCode: 'UG-BOOTSTRAP-AUTH-MISSING',
      errorMessage: __t('bootstrap.state.authority_missing', { role: executionRoleName }),
      missingCapabilities: ['iam:AttachRolePolicy', 'iam:CreatePolicy'],
      supportedAuthorizationOptions: ['BOOTSTRAP_SESSION', 'ADMIN_DELEGATION', 'INFRA_CONTROLLER'],
      evidenceDigest: createHash('sha256').update(`auth-missing:${transactionId}`).digest('hex'),
    };
  }

  const operatingState: DeployBootstrapOperatingState = !policiesAttached
    ? 'INITIAL_INSTALLATION_AUTHORIZED'
    : driftDetected
      ? 'DRIFT_DETECTED_RECONCILABLE'
      : 'RETURNING_INSTALLATION_MATCHED';

  const completedStages = [
    'DISCOVER_AND_RECONCILE',
    'VALIDATE_POLICY_PACK',
    'PROVISION_VIA_BOOTSTRAP',
    'VERIFY_EFFECTIVE_RESULT',
    'READY_FOR_QUALIFICATION_OR_DEPLOY',
  ];

  const evidencePayload = canonicalize({
    transactionId,
    targetPlatform,
    entrypoint,
    aiAssisted,
    operatingState,
    executionRoleName,
    completedStages,
  }) ?? '{}';

  return {
    readyForDeploy: true,
    operatingState,
    entrypoint,
    aiAssisted,
    executionRoleName,
    reusedCanonicalRole: true,
    completedStages,
    evidenceDigest: createHash('sha256').update(evidencePayload, 'utf8').digest('hex'),
  };
}
