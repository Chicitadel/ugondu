/******************************************************************************
 * Project        : Ugondu - Universal Delivery Operating System
 * Module         : Server / Engine Core / UPM Policy Gate
 * File           : policy-gate.ts
 * Version        : 2.0.0
 * Author         : Air Roofers Engineering
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-10-03
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Standards: ISO 27001, SOC 2, OWASP ASVS, NIST
 * Copyright (c) 2026 Air Roofers
 * All Rights Reserved.
 ******************************************************************************/

import { Logger, __t } from '@ugondu/shared';
import * as crypto from 'crypto';
import canonicalize from 'canonicalize';
import { ArchitectureIR } from '../fabric/engine/ProvisioningTypes';

/** 6A - UPM Decision Contract */
export type UpmDecisionStatus = 'ALLOW' | 'ALLOW_WITH_CONDITIONS' | 'REVIEW_REQUIRED' | 'DENY';

/** 6D - Structured DENY/REVIEW Evidence */
export interface UpmDecisionEvidence {
    policyId: string;
    requirement: string;
    targetCapability: string;
    observedState: string;
    affectedIrNodes: string[];
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    remediation: string;
}

export interface UpmDecision {
    status: UpmDecisionStatus;
    evidence?: UpmDecisionEvidence;
    timestamp: Date;
    policyVersion: string;
}

/** 6B - Architecture IR Authorization Binding */
export interface CapabilityEnvelope {
    edition: string;
    allowedActions: string[];
    tenantId: string;
}

export interface ExecutionAuthorization {
    authorizationId: string;
    intentHash: string;
    twinHash: string;
    irHash: string;
    policyVersion: string;
    decision: UpmDecision;
    envelopeHash: string;
    cryptographicSeal: string; // The seal over all hashes
    expiresAt: Date;
}

export interface GatingContext {
    intentHash: string;
    twinHash: string;
    ir: ArchitectureIR;
    policyVersion: string;
    envelope: CapabilityEnvelope;
    activePolicies: string[];
}

export class UpmExecutionGate {
    /** Generates a SHA-256 hash of any canonicalized object */
    private static hashOf(obj: any): string {
        const canonical = canonicalize(obj) || '{}';
        return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
    }

    /** 6A & 6B - Evaluates policies and issues a cryptographically bound ExecutionAuthorization */
    public static async evaluate(context: GatingContext): Promise<ExecutionAuthorization> {
        Logger.info(__t('messages.upm.evaluating_ir_gate'));

        const irHash = this.hashOf(context.ir);
        const envelopeHash = this.hashOf(context.envelope);

        const decision = await this.executePolicyRules(context);

        const authPayload = {
            intentHash: context.intentHash,
            twinHash: context.twinHash,
            irHash,
            policyVersion: context.policyVersion,
            decisionStatus: decision.status,
            envelopeHash
        };

        const cryptographicSeal = this.hashOf(authPayload);

        return {
            authorizationId: crypto.randomUUID(),
            intentHash: context.intentHash,
            twinHash: context.twinHash,
            irHash,
            policyVersion: context.policyVersion,
            decision,
            envelopeHash,
            cryptographicSeal,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minute TTL
        };
    }

    private static async executePolicyRules(context: GatingContext): Promise<UpmDecision> {
        const requiredCapabilities = new Set<string>();
        for (const node of context.ir.nodes) {
            requiredCapabilities.add(node.provider);
        }
        
        const missing = Array.from(requiredCapabilities).filter(cap => !context.envelope.allowedActions.includes(cap) && !context.envelope.allowedActions.includes('*'));

        if (missing.length > 0) {
            return {
                status: 'DENY',
                evidence: {
                    policyId: 'UPM-CAPABILITY-001',
                    requirement: 'Edition Capability Envelope must authorize all required providers.',
                    targetCapability: missing.join(', '),
                    observedState: 'Capability not present in edition envelope',
                    affectedIrNodes: context.ir.nodes.filter(n => missing.includes(n.provider)).map(n => n.id),
                    riskLevel: 'HIGH',
                    remediation: 'Upgrade edition or modify intent to use authorized providers.'
                },
                timestamp: new Date(),
                policyVersion: context.policyVersion
            };
        }

        return {
            status: 'ALLOW',
            timestamp: new Date(),
            policyVersion: context.policyVersion
        };
    }
    }
