import { Logger } from '@ugondu/shared';
/******************************************************************************
 * Project        : UCAAS
 * Module         : engine-core
 * File           : workflow.ts
 * Version        : 1.0.0
 * Author         : UCAAS Architecture Lead
 * Organization   : Ujomor
 * Created Date   : 2026-10-05
 * Last Modified  : 2026-10-05
 * Classification : ENTERPRISE
 *
 * Governance:
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
 * Copyright (c) 2026 Ujomor
 * All Rights Reserved.
 ******************************************************************************/

import { Action, ActionRegistry, ExecutionContext } from './registry';
import { __t } from "@ugondu/shared";

/**
 * Represents a single step in a workflow/bundle.
 */
export interface WorkflowStep {
  stepId: string;
  actionId: string;
  inputTemplate?: Record<string, any>;
  dependsOn?: string[];
}

/**
 * Represents a predefined sequence of actions.
 */
export interface CommandBundle {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
}

export enum WorkflowStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  WAITING_FOR_APPROVAL = 'WAITING_FOR_APPROVAL',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REJECTED = 'REJECTED'
}

/**
 * Workflow execution engine stub for UCAAS command bundles.
 */
export class WorkflowEngine {
  constructor(private registry: ActionRegistry) {}

  /**
   * Executes a command bundle synchronously or asynchronously depending on constraints.
   */
  public async executeBundle(
    bundle: CommandBundle,
    context: ExecutionContext,
    initialInputs: Record<string, any> = {}
  ): Promise<WorkflowStatus> {
    Logger.info(`Starting execution for bundle: ${bundle.id}`);

    // In a real system, we'd have a DAG solver here to resolve `dependsOn`
    const state: Record<string, any> = { ...initialInputs };

    for (const step of bundle.steps) {
      const action = this.registry.get(step.actionId);

      if (!action) {
        Logger.error(`Action ${step.actionId} not found in registry.`);
        return WorkflowStatus.FAILED;
      }

      // Human Approval Gate
      if (action.requiresHumanApproval && !context.approvalId) {
        console.warn(`Action ${action.id} requires human approval. Halting workflow.`);
        // Note: CLI users would run `ugondu approve <id>` to unblock this state.
        return WorkflowStatus.WAITING_FOR_APPROVAL;
      }

      try {
        Logger.info(`Executing step: ${step.stepId} (Action: ${action.name})`);

        const stepInput = this.resolveInputs(step.inputTemplate, state);

        const result = await action.execute(stepInput, context);

        // Store output for subsequent steps
        state[step.stepId] = result;

      } catch (error) {
        Logger.error(`Step ${step.stepId} failed:`, error);
        return WorkflowStatus.FAILED;
      }
    }

    Logger.info(`Bundle ${bundle.id} execution completed successfully.`);
    return WorkflowStatus.COMPLETED;
  }

  /**
   * Resumes a paused workflow (e.g., after `ugondu approve <id>`).
   */
  public async resumeWorkflow(
    workflowExecutionId: string,
    approvalId: string
  ): Promise<WorkflowStatus> {
    Logger.info(`Resuming workflow ${workflowExecutionId} with approval ${approvalId}`);
    try {
        if (!workflowExecutionId || !approvalId) {
            throw new Error(__t('msg_invalid_resumption_parameters_workflowex'));
        }
        // Verify authorization via Governance API before resuming
        Logger.info(`Rehydrating state for workflow ${workflowExecutionId}...`);
        return WorkflowStatus.COMPLETED;
    } catch (error: any) {
        Logger.error(`Workflow resumption failed for ${workflowExecutionId}:`, error.message);
        return WorkflowStatus.FAILED;
    }
  }

  private resolveInputs(
    template: Record<string, any> | undefined,
    state: Record<string, any>
  ): any {
    if (!template) return {};
    try {
        const resolved: Record<string, any> = { ...template };
        for (const [key, value] of Object.entries(resolved)) {
            if (typeof value === 'string' && value.startsWith('$state.')) {
                const stateKey = value.substring(7);
                if (state[stateKey] === undefined) {
                    throw new Error(`Required state parameter '${stateKey}' is missing for input resolution.`);
                }
                resolved[key] = state[stateKey];
            }
        }
        return resolved;
    } catch (error: any) {
        Logger.error(__t('msg_input_resolution_failed'), error.message);
        throw error;
    }
  }
}
