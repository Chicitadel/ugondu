import { PolicyCanonicalizer, PolicyFingerprint } from './policy-deduplication';
import { PolicyGovernanceEngine, ProviderAuthorizationAdapter } from './policy-engine';
import { UniversalPermission } from '../model/authorization';

describe('POL-003 Deduplication & Testing', () => {
    let canonicalizer: PolicyCanonicalizer;
    let fingerprint: PolicyFingerprint;
    let engine: PolicyGovernanceEngine;

    beforeEach(() => {
        canonicalizer = new PolicyCanonicalizer();
        fingerprint = new PolicyFingerprint(canonicalizer);
        engine = new PolicyGovernanceEngine();
    });

    test('PolicyFingerprint generates same hash for identical intent with different condition ordering', () => {
        const intent1: UniversalPermission[] = [
            {
                action: 'read',
                resource: 'res:1',
                conditions: { a: 1, b: 2 }
            }
        ];
        
        const intent2: UniversalPermission[] = [
            {
                action: 'read',
                resource: 'res:1',
                conditions: { b: 2, a: 1 } // differing order
            }
        ];

        const hash1 = fingerprint.generate(intent1);
        const hash2 = fingerprint.generate(intent2);

        expect(hash1).toEqual(hash2);
    });

    test('PolicyFingerprint generates same hash for identical intent with different permission ordering', () => {
        const intent1: UniversalPermission[] = [
            { action: 'read', resource: 'res:2' },
            { action: 'write', resource: 'res:1' }
        ];
        
        const intent2: UniversalPermission[] = [
            { action: 'write', resource: 'res:1' },
            { action: 'read', resource: 'res:2' } // differing order
        ];

        const hash1 = fingerprint.generate(intent1);
        const hash2 = fingerprint.generate(intent2);

        expect(hash1).toEqual(hash2);
    });

    test('PolicyFingerprint generates different hashes for differing resources', () => {
        const intent1: UniversalPermission[] = [
            { action: 'read', resource: 'res:1' }
        ];
        
        const intent2: UniversalPermission[] = [
            { action: 'read', resource: 'res:2' }
        ];

        const hash1 = fingerprint.generate(intent1);
        const hash2 = fingerprint.generate(intent2);

        expect(hash1).not.toEqual(hash2);
    });

    test('PolicyGovernanceEngine reuses policies instead of creating new ones if fingerprint exists', () => {
        const mockAdapter: ProviderAuthorizationAdapter = {
            providerIdentifier: 'aws',
            translateIntent: (intent) => ({}),
            synthesizePolicy: (intent) => ({
                id: `pol-${Date.now()}`,
                name: 'Test Policy',
                description: 'Test',
                permissions: intent
            }),
            verifyCapability: (intent) => true
        };

        engine.registerAdapter(mockAdapter);

        const intent: UniversalPermission[] = [
            { action: 'read', resource: 'res:shared' }
        ];

        // First evaluation should CREATE
        const record1 = engine.evaluateIntent('aws', intent, 'user1');
        expect(record1.operation).toBe('CREATE');
        expect(engine.registry.getRegistryCount()).toBe(1);

        // Second evaluation with exact same intent should REUSE
        const record2 = engine.evaluateIntent('aws', intent, 'user2');
        expect(record2.operation).toBe('REUSE');
        expect(record2.resource).toBe(record1.resource); // Same policy ID reused
        expect(engine.registry.getRegistryCount()).toBe(1); // Still 1
        
        // Third evaluation with equivalent intent (different order) should REUSE
        const intentDiffOrder: UniversalPermission[] = [
            { action: 'read', resource: 'res:shared', conditions: {} }
        ];
        const record3 = engine.evaluateIntent('aws', intentDiffOrder, 'user3');
        expect(record3.operation).toBe('REUSE');
        expect(engine.registry.getRegistryCount()).toBe(1);
    });
});
