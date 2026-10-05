import { UniversalPermission, UniversalPolicy } from '../model/authorization';
import * as crypto from 'crypto';

export class PolicyCanonicalizer {
    public canonicalize(intent: UniversalPermission[]): string {
        // Sort statements by resource, then action to ensure deterministic hashing
        const sorted = [...intent].map(p => {
            const conditionsObj = p.conditions || {};
            const sortedConditions = Object.keys(conditionsObj).sort().reduce((acc, key) => {
                acc[key] = conditionsObj[key];
                return acc;
            }, {} as Record<string, any>);

            return {
                action: p.action,
                resource: p.resource,
                conditions: sortedConditions
            };
        }).sort((a, b) => {
            if (a.resource !== b.resource) return a.resource.localeCompare(b.resource);
            return a.action.localeCompare(b.action);
        });

        return JSON.stringify(sorted);
    }
}

export class PolicyFingerprint {
    constructor(private canonicalizer: PolicyCanonicalizer) {}

    public generate(intent: UniversalPermission[]): string {
        const canonicalForm = this.canonicalizer.canonicalize(intent);
        return crypto.createHash('sha256').update(canonicalForm).digest('hex');
    }
}

export interface StoredPolicy extends UniversalPolicy {
    fingerprint: string;
    lifecycleState: 'ACTIVE' | 'PENDING_RETIREMENT' | 'RETIRED';
}

export class PolicyRegistry {
    private policies = new Map<string, StoredPolicy>();

    public lookup(fingerprint: string): StoredPolicy | null {
        for (const policy of this.policies.values()) {
            if (policy.fingerprint === fingerprint && policy.lifecycleState === 'ACTIVE') {
                return policy;
            }
        }
        return null;
    }

    public register(policy: StoredPolicy): void {
        this.policies.set(policy.id, policy);
    }
    
    public getRegistryCount(): number {
        return this.policies.size;
    }
}
