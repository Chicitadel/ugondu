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
            return this.createFailRecord(provider, principal, intent, __t('provider_adapter_not_found_fai'));
        }

        // POL-014: Security Boundary Preservation
        const canEnforce = adapter.verifyCapability(intent);
        if (!canEnforce) {
            return this.createFailRecord(provider, principal, intent, __t('security_boundary_loss_provide'));
        }

        // POL-002: Wildcard Check
        for (const p of intent) {
            if (p.action === '*' || p.resource === '*') {
                return this.createFailRecord(provider, principal, intent, __t('pol_002_violation_wildcard_pri'));
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
            reason: __t('minimal_permission_set_satisfi')
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
