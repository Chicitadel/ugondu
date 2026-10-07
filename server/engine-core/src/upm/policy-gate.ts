import { __t } from '@ugondu/shared';
import { Logger } from '@ugondu/shared';
import * as crypto from 'crypto';
import canonicalize from 'canonicalize';
import { ArchitectureIR } from '../fabric/engine/ProvisioningTypes';

export type UpmDecisionStatus = 'ALLOW' | 'ALLOW_WITH_CONDITIONS' | 'REVIEW_REQUIRED' | 'DENY';

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
    authorizationId?: string;
}

export interface AuthorizationExpectations {
    intentHash: string;
    twinHash: string;
    envelopeHash: string;
    policyVersion: string;
}

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
    cryptographicSeal: string;
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
    private static hashOf(obj: any): string {
        if (!process.env.UGONDU_UPM_SECRET) {
            throw new Error(__t('msg_security_violation_ugondu_upm_secret_is'));
        }
        const canonical = canonicalize(obj) || '{}';
        return crypto.createHmac('sha256', process.env.UGONDU_UPM_SECRET).update(canonical, 'utf8').digest('hex');
    }

    public static async evaluate(context: GatingContext): Promise<ExecutionAuthorization> {
        if (context.envelope.allowedActions.some(action => action === '*' || action.includes('*'))) { throw new Error('WILDCARD_CAPABILITY_NOT_PERMITTED'); }
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
            authorizationId: decision.authorizationId || crypto.randomUUID(),
            intentHash: context.intentHash,
            twinHash: context.twinHash,
            irHash,
            policyVersion: context.policyVersion,
            decision,
            envelopeHash,
            cryptographicSeal,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000)
        };
    }

    private static async executePolicyRules(context: GatingContext): Promise<UpmDecision> {
        const requiredActions = new Set<string>();
        for (const node of context.ir.nodes) {
            const action = (node as any).operation || node.provider;
            requiredActions.add(action);
        }

        const missing = Array.from(requiredActions).filter(action => !context.envelope.allowedActions.includes(action));

        if (missing.length > 0) {
            return {
                status: 'DENY',
                evidence: {
                    policyId: 'UPM-CAPABILITY-001',
                    requirement: 'Edition Capability Envelope must authorize all required node operations',
                    targetCapability: missing.join(', '),
                    observedState: 'Capability or operation not present in edition allowedActions',
                    affectedIrNodes: context.ir.nodes.filter(n => missing.includes((n as any).operation || n.provider)).map(n => n.id),
                    riskLevel: 'HIGH',
                    remediation: 'Upgrade edition or modify intent to use authorized capabilities/operations.'
                },
                timestamp: new Date(),
                policyVersion: context.policyVersion
            };
        }

        return {
            status: 'ALLOW',
            timestamp: new Date(),
            policyVersion: context.policyVersion,
            authorizationId: crypto.randomUUID()
        };
    }

    public static verifyAuthorization(auth: ExecutionAuthorization, executionIr: ArchitectureIR, expected?: AuthorizationExpectations): void {
        if (expected) {
            if (auth.intentHash !== expected.intentHash) throw new Error('INTENT_HASH_MISMATCH');
            if (auth.twinHash !== expected.twinHash) throw new Error('TWIN_HASH_MISMATCH');
            if (auth.envelopeHash !== expected.envelopeHash) throw new Error('ENVELOPE_HASH_MISMATCH');
            if (auth.policyVersion !== expected.policyVersion) throw new Error('POLICY_VERSION_MISMATCH');
        }
        Logger.info(__t('messages.upm.verifying_authorization', { id: auth.authorizationId }));

        if (new Date() > auth.expiresAt) {
            throw new Error(__t('messages.error.execution_authorization_expired'));
        }

        if (auth.decision.status !== 'ALLOW' && auth.decision.status !== 'ALLOW_WITH_CONDITIONS') {
            throw new Error(__t('messages.error.execution_authorization_denied', { status: auth.decision.status }));
        }

        const executionIrHash = this.hashOf(executionIr);
        if (executionIrHash !== auth.irHash) {
            throw new Error(__t('messages.error.ir_hash_mismatch'));
        }

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


