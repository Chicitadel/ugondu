/******************************************************************************
 * Project        : Ugondu - Universal Delivery Operating System
 * Module         : Server / Engine Core / UPM Tests
 * File           : policy-gate.spec.ts
 * Version        : 2.0.0
 * Author         : Air Roofers Engineering
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-10-04
 * Classification : ENTERPRISE
 ******************************************************************************/

import { UpmExecutionGate, GatingContext, ExecutionAuthorization } from '../policy-gate';
import { ArchitectureIR } from '../../fabric/engine/ProvisioningTypes';

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

    test('Authorized IR should pass strict verification', async () => {
        const auth = await UpmExecutionGate.evaluate(baseContext);
        expect(auth.decision.status).toBe('ALLOW');
        // Should not throw
        expect(() => UpmExecutionGate.verifyAuthorization(auth, baseContext.ir)).not.toThrow();
    });

    test('Adversarial: Modified IR after approval (Bypass attempt)', async () => {
        const auth = await UpmExecutionGate.evaluate(baseContext);
        
        // Attacker attempts to modify the executed DAG slightly
        const maliciousIr = generateMockIr();
        maliciousIr.nodes.push({ id: 'crypto-miner', type: 'COMPUTE', provider: 'aws', config: {} });

        expect(() => UpmExecutionGate.verifyAuthorization(auth, maliciousIr)).toThrow(/ir_mismatch/i);
    });

    test('Adversarial: Expired authorization replay', async () => {
        const auth = await UpmExecutionGate.evaluate(baseContext);
        // Force expiry
        auth.expiresAt = new Date(Date.now() - 10000);

        expect(() => UpmExecutionGate.verifyAuthorization(auth, baseContext.ir)).toThrow(/expired/i);
    });

    test('Adversarial: Revoked capability (Deny Structure)', async () => {
        // User downgraded to FREE or capability revoked dynamically
        baseContext.envelope.allowedActions = [];

        const auth = await UpmExecutionGate.evaluate(baseContext);
        
        expect(auth.decision.status).toBe('DENY');
        expect(auth.decision.evidence).toBeDefined();
        expect(auth.decision.evidence && auth.decision.evidence.targetCapability).toBe('PROVISION_DATABASE');
        
        // Engine will refuse it
        expect(() => UpmExecutionGate.verifyAuthorization(auth, baseContext.ir)).toThrow(/denied/i);
    });

    test('Adversarial: Cryptographic Seal Tampering', async () => {
        const auth = await UpmExecutionGate.evaluate(baseContext);
        
        // Attacker tries to modify the decision to ALLOW
        const tamperedAuth: ExecutionAuthorization = {
            ...auth,
            decision: { ...auth.decision, status: 'ALLOW' } // Assuming it was denied, or they change policyVersion
        };
        tamperedAuth.policyVersion = 'bypassed-1.0.0';

        // The seal should catch the mutation
        expect(() => UpmExecutionGate.verifyAuthorization(tamperedAuth, baseContext.ir)).toThrow(/seal_mismatch/i);
    });

});
