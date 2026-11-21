/******************************************************************************
 * Project        : Ugondu
 * Module         : Passport Compiler & Evidence
 * File           : intent-binder.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-18
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Corporate Policy Governed
 * - Corporate Governed
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
import { EvidenceChain } from '../evidence/chain';
import { OperationType } from './applicability';

/**
 * @interface DeploymentIntent
 * @description Corporate Governed interface implementation for DeploymentIntent
 * @classification ENTERPRISE
 */
export interface DeploymentIntent {
    intentId: string;
    operation: OperationType;
    author: string;
    targetVersion: string;
}

/**
 * @class IntentBinder
 * @description Corporate Governed class implementation for IntentBinder
 * @classification ENTERPRISE
 */
export class IntentBinder {
    public bindIntent(chain: EvidenceChain, intent: DeploymentIntent): void {
        chain.append(`intent-${intent.intentId}`, 'INTENT_BINDING', intent);
    }
}
