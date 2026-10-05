import { __t } from '@ugondu/shared';
import { Logger } from '@ugondu/shared';
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
        if (!process.env.UGONDU_UPM_SECRET) {
            throw new Error('SECURITY_VIOLATION: UGONDU_UPM_SECRET is required to seal execution authorizations. The UPM must fail closed.');
        }
        const canonical = canonicalize(obj) || '{}';
        return crypto.createHmac('sha256', process.env.UGONDU_UPM_SECRET).update(canonical, 'utf8').digest('hex');
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
                    observedState: __t('capability_not_present_in_edit'),
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

    /** 6C - Validates an execution permit right before the provisioning engine begins. */
    public static verifyAuthorization(auth: ExecutionAuthorization, executionIr: ArchitectureIR): void {
        Logger.info(__t('messages.upm.verifying_authorization', { id: auth.authorizationId }));

        // 1. Verify Expiration
        if (new Date() > auth.expiresAt) {
            throw new Error(__t('messages.error.execution_authorization_expired'));
        }

        // 2. Verify Decision
        if (auth.decision.status !== 'ALLOW' && auth.decision.status !== 'ALLOW_WITH_CONDITIONS') {
            throw new Error(__t('messages.error.execution_authorization_denied', { status: auth.decision.status }));
        }

        // 3. Verify IR Identity (Tamper Check)
        const executionIrHash = this.hashOf(executionIr);
        if (executionIrHash !== auth.irHash) {
            throw new Error(__t('messages.error.ir_hash_mismatch'));
        }

        // 4. Verify Cryptographic Seal
        const authPayload = {
            intentHash: auth.intentHash,
            twinHash: auth.twinHash,
            irHash: auth.irHash,
            policyVersion: auth.policyVersion,
            decisionStatus: auth.decision.status,
            envelopeHash: auth.envelopeHash
        };
        const expectedSeal = this.hashOf(authPayload);
        
        if (expectedSeal !== auth.cryptographicSeal) {
            throw new Error(__t('messages.error.seal_mismatch'));
        }
        
        Logger.info(__t('messages.upm.authorization_verified'));
    }
}
