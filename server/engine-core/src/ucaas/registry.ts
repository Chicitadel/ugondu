/******************************************************************************
 * Project        : UCAAS
 * Module         : engine-core
 * File           : registry.ts
 * Version        : 1.0.0
 * Author         : UCAAS Architecture Lead
 * Organization   : Ujomor
 * Created Date   : 2026-10-05
 * Last Modified  : 2026-10-05
 * Classification : ENTERPRISE
 *
 * Governance:
 * - AI Governed
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

/**
 * Defines the risk level associated with executing an action.
 */
export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Interface representing a universally executable Action within the UCAAS framework.
 * Actions can be triggered via CLI, GUI, Keyboard Shortcuts, or autonomous AI agents.
 */
export interface Action<TInput = any, TOutput = any> {
  id: string;
  name: string;
  description: string;

  // Execution triggers
  cliCommand?: string;
  keyboardShortcut?: string;
  guiPath?: string; // e.g., 'Settings > Advanced > Clear Cache'

  // AI and System capabilities
  isAIAccessible: boolean;
  systemTags: string[];

  // Governance and Risk
  riskLevel: RiskLevel;
  requiresHumanApproval: boolean;

  // Execution
  execute: (input: TInput, context?: ExecutionContext) => Promise<TOutput>;
}

export interface ExecutionContext {
  userId: string;
  roles: string[];
  sessionId: string;
  traceId: string;
  isAutonomousAgent: boolean;
  approvalId?: string;
}

/**
 * Registry for managing and discovering UCAAS Actions.
 */
export class ActionRegistry {
  private actions: Map<string, Action> = new Map();

  /**
   * Registers a new action in the UCAAS system.
   */
  public register(action: Action): void {
    if (this.actions.has(action.id)) {
      throw new Error(`Action with id ${action.id} is already registered.`);
    }
    this.actions.set(action.id, action);
  }

  /**
   * Retrieves an action by its unique identifier.
   */
  public get(actionId: string): Action | undefined {
    return this.actions.get(actionId);
  }

  /**
   * Returns all actions that match the provided criteria.
   */
  public find(criteria: Partial<Action>): Action[] {
    return Array.from(this.actions.values()).filter(action => {
      for (const [key, value] of Object.entries(criteria)) {
        if ((action as any)[key] !== value) return false;
      }
      return true;
    });
  }

  /**
   * Gets all actions available for autonomous AI agents.
   */
  public getAIAccessibleActions(): Action[] {
    return this.find({ isAIAccessible: true });
  }

  /**
   * Finds an action by its CLI command representation.
   */
  public findByCliCommand(cliCommand: string): Action | undefined {
    for (const action of this.actions.values()) {
      if (action.cliCommand === cliCommand) {
        return action;
      }
    }
    return undefined;
  }
}
