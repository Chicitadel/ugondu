process.env.UGONDU_UPM_SECRET = 'test-secret';
import { UpmExecutionGate, GatingContext, ExecutionAuthorization } from '../policy-gate';
import { ArchitectureIR } from '../../fabric/engine/ProvisioningTypes';
import { __t } from "@ugondu/shared";

describe('6G - UPM Execution Gate Adversarial & Bypass Tests', () => {

    const generateMockIr = function(): ArchitectureIR { return {
        nodes: [{ id: 'db-1', type: 'DATABASE', provider: 'aws', config: {} }],
        edges: []
    }; };

    const mockEnvelope = {
        edition: 'ENTERPRISE',
        allowedActions: ['PROVISION_DATABASE'],
        tenantId: 't-123'
    };

    let baseContext: GatingContext;

    beforeAll(() => {
        (UpmExecutionGate.verifyAuthorization as jest.Mock).mockRestore();
    });

    beforeEach(() => {
        baseContext = {
            intentHash: 'hash-intent-001',
            twinHash: 'hash-twin-001',
            ir: generateMockIr(),
            policyVersion: '1.0.0',
            envelope: { ...mockEnvelope },
            activePolicies: ['default-deny']
        };
    });

    test(__t('msg_authorized_ir_should_pass_strict_verific'), async () => {
        const auth: ExecutionAuthorization = {
            authorizationId: 'auth-1',
            decision: { status: 'ALLOW', timestamp: new Date(), policyVersion: '1.0.0' },
            policyVersion: '1.0.0',
            cryptographicSeal: '',
            expiresAt: new Date(Date.now() + 100000),
            envelopeHash: 'mock-hash',
            intentHash: 'hash-intent-001',
            twinHash: 'hash-twin-001',
            irHash: UpmExecutionGate['hashOf'](baseContext.ir)
        };
        auth.cryptographicSeal = UpmExecutionGate['hashOf']({
            intentHash: auth.intentHash,
            twinHash: auth.twinHash,
            irHash: auth.irHash,
            policyVersion: auth.policyVersion,
            decisionStatus: auth.decision.status,
            envelopeHash: auth.envelopeHash
        });

        expect(() => UpmExecutionGate.verifyAuthorization(auth, baseContext.ir)).not.toThrow();
    });

    test(__t('msg_adversarial_modified_ir_after_approval_b'), async () => {
        const auth: ExecutionAuthorization = {
            authorizationId: 'auth-1',
            decision: { status: 'ALLOW', timestamp: new Date(), policyVersion: '1.0.0' },
            policyVersion: '1.0.0',
            cryptographicSeal: '',
            expiresAt: new Date(Date.now() + 100000),
            envelopeHash: 'mock-hash',
            intentHash: 'hash-intent-001',
            twinHash: 'hash-twin-001',
            irHash: UpmExecutionGate['hashOf'](baseContext.ir)
        };
        auth.cryptographicSeal = UpmExecutionGate['hashOf']({
            intentHash: auth.intentHash,
            twinHash: auth.twinHash,
            irHash: auth.irHash,
            policyVersion: auth.policyVersion,
            decisionStatus: auth.decision.status,
            envelopeHash: auth.envelopeHash
        });

        const maliciousIr = generateMockIr();
        maliciousIr.nodes.push({ id: 'crypto-miner', type: 'COMPUTE', provider: 'aws', config: {} });
        expect(() => UpmExecutionGate.verifyAuthorization(auth, maliciousIr)).toThrow(/hash_mismatch/i);
    });

    test(__t('msg_adversarial_expired_authorization_replay'), async () => {
        const auth: ExecutionAuthorization = {
            authorizationId: 'auth-1',
            decision: { status: 'ALLOW', timestamp: new Date(), policyVersion: '1.0.0' },
            policyVersion: '1.0.0',
            cryptographicSeal: '',
            expiresAt: new Date(Date.now() - 10000), // Expired
            envelopeHash: 'mock-hash',
            intentHash: 'hash-intent-001',
            twinHash: 'hash-twin-001',
            irHash: UpmExecutionGate['hashOf'](baseContext.ir)
        };
        auth.cryptographicSeal = UpmExecutionGate['hashOf']({
            intentHash: auth.intentHash,
            twinHash: auth.twinHash,
            irHash: auth.irHash,
            policyVersion: auth.policyVersion,
            decisionStatus: auth.decision.status,
            envelopeHash: auth.envelopeHash
        });

        expect(() => UpmExecutionGate.verifyAuthorization(auth, baseContext.ir)).toThrow(/execution_authorization_expired/i);
    });

    test(__t('msg_adversarial_revoked_capability_deny_stru'), async () => {
        const auth: ExecutionAuthorization = {
            authorizationId: 'auth-1',
            decision: { status: 'DENY', timestamp: new Date(), policyVersion: '1.0.0', evidence: { targetCapability: 'PROVISION_DATABASE', policyId: 'P1', requirement: 'req', observedState: 'obs', affectedIrNodes: [], remediation: 'none', riskLevel: 'HIGH' } },
            policyVersion: '1.0.0',
            cryptographicSeal: '',
            expiresAt: new Date(Date.now() + 100000),
            envelopeHash: 'mock-hash',
            intentHash: 'hash-intent-001',
            twinHash: 'hash-twin-001',
            irHash: UpmExecutionGate['hashOf'](baseContext.ir)
        };
        auth.cryptographicSeal = UpmExecutionGate['hashOf']({
            intentHash: auth.intentHash,
            twinHash: auth.twinHash,
            irHash: auth.irHash,
            policyVersion: auth.policyVersion,
            decisionStatus: auth.decision.status,
            envelopeHash: auth.envelopeHash
        });

        expect(() => UpmExecutionGate.verifyAuthorization(auth, baseContext.ir)).toThrow(/execution_authorization_denied/i);
    });

    test(__t('msg_adversarial_cryptographic_seal_tampering'), async () => {
        const auth: ExecutionAuthorization = {
            authorizationId: 'auth-1',
            decision: { status: 'DENY', timestamp: new Date(), policyVersion: '1.0.0', evidence: { targetCapability: 'PROVISION_DATABASE', policyId: 'P1', requirement: 'req', observedState: 'obs', affectedIrNodes: [], remediation: 'none', riskLevel: 'HIGH' } },
            policyVersion: '1.0.0',
            cryptographicSeal: '',
            expiresAt: new Date(Date.now() + 100000),
            envelopeHash: 'mock-hash',
            intentHash: 'hash-intent-001',
            twinHash: 'hash-twin-001',
            irHash: UpmExecutionGate['hashOf'](baseContext.ir)
        };
        auth.cryptographicSeal = UpmExecutionGate['hashOf']({
            intentHash: auth.intentHash,
            twinHash: auth.twinHash,
            irHash: auth.irHash,
            policyVersion: auth.policyVersion,
            decisionStatus: auth.decision.status,
            envelopeHash: auth.envelopeHash
        });

        // Tamper
        auth.decision.status = 'ALLOW';

        expect(() => UpmExecutionGate.verifyAuthorization(auth, baseContext.ir)).toThrow(/seal_mismatch/i);
    });

});
