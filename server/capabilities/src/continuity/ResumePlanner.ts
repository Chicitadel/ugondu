/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Capabilities / Execution Continuity & Policy Governance
 * File           : ResumePlanner.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-21
 * Last Modified  : 2026-10-21
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
 * - ISO 27001 / SOC 2 / OWASP ASVS 5.0 / NIST SP 800-53 / UAIGOS 3.0.0
 *
 * Signatures:
 * - Architecture Authority : Ujomor Systems Engineering
 * - Security Authority     : Ujomor Systems Governance
 * - Governance Authority   : Air Roofers Corporate Governance
 *
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import * as crypto from 'crypto';
import { ReconciliationReport, ReconciliationDelta } from './EnvironmentReconciler';

export interface PlannedResumeStep {
  stepIndex: number;
  stepId: string;
  action: 'NOOP' | 'CREATE' | 'UPDATE' | 'REPAIR' | 'DESTRUCTIVE_DELETE';
  resourceId: string;
  resourceType: string;
  payload: Record<string, unknown>;
  requiresApproval: boolean;
  approvalToken?: string;
  status: 'PENDING' | 'SKIPPED' | 'APPROVED' | 'BLOCKED';
}

export interface ResumePlan {
  planId: string;
  transactionId: string;
  status: 'READY' | 'AWAITING_APPROVAL' | 'BLOCKED_UNPROBED' | 'ALREADY_CONVERGED';
  totalSteps: number;
  executableSteps: number;
  skippedSteps: number;
  steps: PlannedResumeStep[];
  planDigest: string;
  generatedAt: string;
  approvalRequired: boolean;
}

export class ResumePlanner {
  /**
   * Generates a minimal-delta resume plan based on empirical reconciliation results.
   * Proves continuous resumability ("pick up anywhere") without duplicate mutations.
   */
  public generateResumePlan(
    transactionId: string,
    reconciliation: ReconciliationReport,
    approvals?: { destructiveApprovalToken?: string }
  ): ResumePlan {
    const planId = `plan_resume_${crypto.randomBytes(8).toString('hex')}`;
    const generatedAt = new Date().toISOString();

    if (reconciliation.status === 'INDETERMINATE_UNPROBED') {
      return {
        planId,
        transactionId,
        status: 'BLOCKED_UNPROBED',
        totalSteps: 0,
        executableSteps: 0,
        skippedSteps: 0,
        steps: [],
        planDigest: 'UNPROBED_FAIL_CLOSED',
        generatedAt,
        approvalRequired: false,
      };
    }

    if (reconciliation.status === 'IN_SYNC' || reconciliation.deltas.length === 0) {
      return {
        planId,
        transactionId,
        status: 'ALREADY_CONVERGED',
        totalSteps: 0,
        executableSteps: 0,
        skippedSteps: 0,
        steps: [],
        planDigest: crypto.createHash('sha256').update(`${planId}:CONVERGED`, 'utf8').digest('hex'),
        generatedAt,
        approvalRequired: false,
      };
    }

    const steps: PlannedResumeStep[] = [];
    let stepIndex = 0;
    let approvalRequired = false;

    for (const delta of reconciliation.deltas) {
      stepIndex++;
      const stepId = `step_${stepIndex}_${delta.resourceId}`;

      if (delta.action === 'NOOP') {
        steps.push({
          stepIndex,
          stepId,
          action: 'NOOP',
          resourceId: delta.resourceId,
          resourceType: delta.resourceType,
          payload: delta.observedProperties ?? {},
          requiresApproval: false,
          status: 'SKIPPED',
        });
        continue;
      }

      if (delta.action === 'DESTRUCTIVE_DELETE') {
        const approved = Boolean(
          approvals?.destructiveApprovalToken && approvals.destructiveApprovalToken.length >= 16
        );

        if (!approved) {
          approvalRequired = true;
        }

        steps.push({
          stepIndex,
          stepId,
          action: 'DESTRUCTIVE_DELETE',
          resourceId: delta.resourceId,
          resourceType: delta.resourceType,
          payload: delta.observedProperties ?? {},
          requiresApproval: true,
          approvalToken: approved ? approvals?.destructiveApprovalToken : undefined,
          status: approved ? 'APPROVED' : 'BLOCKED',
        });
        continue;
      }

      // CREATE / UPDATE / REPAIR
      steps.push({
        stepIndex,
        stepId,
        action: delta.action,
        resourceId: delta.resourceId,
        resourceType: delta.resourceType,
        payload: delta.desiredProperties ?? {},
        requiresApproval: false,
        status: 'PENDING',
      });
    }

    const executableSteps = steps.filter((s) => s.status === 'PENDING' || s.status === 'APPROVED').length;
    const skippedSteps = steps.filter((s) => s.status === 'SKIPPED').length;

    const status: ResumePlan['status'] = approvalRequired
      ? 'AWAITING_APPROVAL'
      : executableSteps > 0
      ? 'READY'
      : 'ALREADY_CONVERGED';

    const rawSteps = JSON.stringify(steps.map((s) => `${s.stepId}:${s.action}:${s.status}`));
    const planDigest = crypto.createHash('sha256').update(rawSteps, 'utf8').digest('hex');

    return {
      planId,
      transactionId,
      status,
      totalSteps: steps.length,
      executableSteps,
      skippedSteps,
      steps,
      planDigest,
      generatedAt,
      approvalRequired,
    };
  }
}
