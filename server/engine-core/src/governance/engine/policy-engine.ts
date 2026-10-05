import { UniversalPermission, UniversalPolicy, PolicyDecisionRecord } from '../model/authorization';

export interface ProviderAuthorizationAdapter {
    providerIdentifier: string;
    translateIntent(intent: UniversalPermission[]): any;
    synthesizePolicy(intent: UniversalPermission[]): UniversalPolicy;
    verifyCapability(intent: UniversalPermission[]): boolean; // POL-013 & POL-014
}

export class PolicyGovernanceEngine {
    private adapters = new Map<string, ProviderAuthorizationAdapter>();

    public registerAdapter(adapter: ProviderAuthorizationAdapter) {
        this.adapters.set(adapter.providerIdentifier, adapter);
    }

    public evaluateIntent(provider: string, intent: UniversalPermission[], principal: string): PolicyDecisionRecord {
        const adapter = this.adapters.get(provider);
        if (!adapter) {
            return this.createFailRecord(provider, principal, intent, 'Provider adapter not found. Failing closed.');
        }

        // POL-014: Security Boundary Preservation
        const canEnforce = adapter.verifyCapability(intent);
        if (!canEnforce) {
            return this.createFailRecord(provider, principal, intent, 'SECURITY BOUNDARY LOSS: Provider cannot enforce exact intent natively.');
        }

        // POL-002: Wildcard Check
        for (const p of intent) {
            if (p.action === '*' || p.resource === '*') {
                return this.createFailRecord(provider, principal, intent, 'POL-002 VIOLATION: Wildcard privilege requested without justification.');
            }
        }

        return {
            id: `pdr-${Date.now()}`,
            timestamp: Date.now(),
            provider,
            resource: 'ExecutionGraph',
            operation: 'Synthesis',
            principal,
            required: intent.map(i => i.action),
            granted: intent.map(i => i.action),
            denied: [],
            decision: 'ALLOW',
            reason: 'Minimal permission set satisfied and strictly bounded.'
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
