import { UniversalPermission, UniversalPolicy, PolicyDecisionRecord } from '../model/authorization';
import { PolicyCanonicalizer, PolicyFingerprint, PolicyRegistry } from './policy-deduplication';

export interface ProviderAuthorizationAdapter {
    providerIdentifier: string;
    translateIntent(intent: UniversalPermission[]): any;
    synthesizePolicy(intent: UniversalPermission[]): UniversalPolicy;
    verifyCapability(intent: UniversalPermission[]): boolean;
}

export class PolicyGovernanceEngine {
    private adapters = new Map<string, ProviderAuthorizationAdapter>();
    private fingerprintGen = new PolicyFingerprint(new PolicyCanonicalizer());
    public registry = new PolicyRegistry();

    public registerAdapter(adapter: ProviderAuthorizationAdapter) {
        this.adapters.set(adapter.providerIdentifier, adapter);
    }

    public evaluateIntent(provider: string, intent: UniversalPermission[], principal: string): PolicyDecisionRecord {
        const adapter = this.adapters.get(provider);
        if (!adapter) {
            return this.createFailRecord(provider, principal, intent, 'Provider adapter not found. Failing closed.');
        }

        const canEnforce = adapter.verifyCapability(intent);
        if (!canEnforce) {
            return this.createFailRecord(provider, principal, intent, 'SECURITY BOUNDARY LOSS: Provider cannot enforce exact intent natively.');
        }

        for (const p of intent) {
            if (p.action === '*' || p.resource === '*') {
                return this.createFailRecord(provider, principal, intent, 'POL-002 VIOLATION: Wildcard privilege requested without justification.');
            }
        }

        // POL-003 Deduplication logic: REUSE before CREATE
        const fingerprint = this.fingerprintGen.generate(intent);
        const existingPolicy = this.registry.lookup(fingerprint);
        
        if (existingPolicy) {
            return {
                id: `pdr-${Date.now()}`,
                timestamp: Date.now(),
                provider,
                resource: existingPolicy.id,
                operation: 'REUSE',
                principal,
                required: intent.map(i => i.action),
                granted: intent.map(i => i.action),
                denied: [],
                decision: 'ALLOW',
                reason: `POL-003: Safely reused existing equivalent policy matching fingerprint ${fingerprint}`,
                policyHash: fingerprint
            };
        }

        // If no equivalent policy exists, we "CREATE"
        const newPolicy = adapter.synthesizePolicy(intent);
        this.registry.register({
            ...newPolicy,
            fingerprint,
            lifecycleState: 'ACTIVE'
        });

        return {
            id: `pdr-${Date.now()}`,
            timestamp: Date.now(),
            provider,
            resource: newPolicy.id,
            operation: 'CREATE',
            principal,
            required: intent.map(i => i.action),
            granted: intent.map(i => i.action),
            denied: [],
            decision: 'ALLOW',
            reason: `POL-003: Created new minimal permission policy with fingerprint ${fingerprint}`,
            policyHash: fingerprint
        };
    }

    private createFailRecord(provider: string, principal: string, intent: UniversalPermission[], reason: string): PolicyDecisionRecord {
        return {
            id: `pdr-${Date.now()}`,
            timestamp: Date.now(),
            provider,
            resource: 'ExecutionGraph',
            operation: 'Synthesis',
            principal,
            required: intent.map(i => i.action),
            granted: [],
            denied: intent.map(i => i.action),
            decision: 'FAIL_CLOSED',
            reason
        };
    }
}
