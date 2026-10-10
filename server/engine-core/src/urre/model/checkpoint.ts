/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Server / Engine Core / URRE / Model
 * File           : checkpoint.ts
 * Version        : 1.0.0
 * Author         : Platform Architecture Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
 * Classification : ENTERPRISE | INTERNAL
 *
 * Standards: ISO 27001, SOC 2, OWASP ASVS 5.0, NIST SP 800-53
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

import { ActionSafetyContract } from './operation';

/**
 * @interface VerificationResult
 * @description Corporate Governed interface implementation for VerificationResult
 * @classification ENTERPRISE
 */
export interface VerificationResult {
  passed: boolean;
  checkName: string;
  evidence: string;
  timestamp: number;
}

/**
 * @interface TypedAction
 * @description Corporate Governed interface implementation for TypedAction
 * @classification ENTERPRISE
 */
export interface TypedAction {
  actionId: string;
  type: string;
  payload: any;
  safetyContract: ActionSafetyContract;
}

/**
 * @interface Checkpoint
 * @description Corporate Governed interface implementation for Checkpoint
 * @classification ENTERPRISE
 */
export interface Checkpoint {
  checkpointId: string;
  description: string;
  actions: TypedAction[];
  rollbackActions: TypedAction[];
  idempotent: boolean;
}
