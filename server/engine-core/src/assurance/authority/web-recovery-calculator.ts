import { 
    AuthorityCalculator, 
    RequiredAuthority, 
    Authority, 
    AuthorityGap, 
    AuthorityBundle, 
    AuthorityValidationResult 
} from './authority-calculator';

export interface WebRecoveryTarget {
    tenant: string;
    domain: string;
    provider: 'directadmin' | 'cpanel' | 'plesk' | 'apache' | 'nginx' | 'litespeed' | 'iis' | 'cloudflare' | 'aws-edge';
}

export interface WebRecoveryPlan {
    operations: string[];
    mutation?: string[];
    verification?: string[];
    rollback?: string[];
    risk: 'LOW' | 'MEDIUM' | 'HIGH';
}

export class WebRecoveryAuthorityCalculator implements AuthorityCalculator<WebRecoveryTarget, WebRecoveryPlan> {
    
    public discoverRequiredAuthority(target: WebRecoveryTarget, plan: WebRecoveryPlan): RequiredAuthority {
        const allOps = [
            ...plan.operations,
            ...(plan.mutation || []),
            ...(plan.verification || []),
            ...(plan.rollback || [])
        ];

        return {
            provider: target.provider,
            operations: Array.from(new Set(allOps))
        };
    }

    public calculateAuthorityGap(available: Authority, required: RequiredAuthority): AuthorityGap {
        // Simplified check
        const missing = required.operations.filter(op => !available.permissions.includes(op));
        return {
            hasGap: missing.length > 0,
            missingPermissions: missing
        };
    }

    public generateLeastPrivilegeBundle(target: WebRecoveryTarget, plan: WebRecoveryPlan): AuthorityBundle {
        const required = this.discoverRequiredAuthority(target, plan);
        
        // The adapter for the specific provider (DirectAdmin, cPanel) would map these canonical ops
        // into actual provider-native permissions (e.g., DA API tokens with restricted endpoints).
        // Here we output the universal bundle manifest mapping.

        return {
            manifest: `web-recovery-${target.provider}-${target.domain}`,
            permissions: required.operations.map(op => ({
                action: op,
                resource: `tenant:${target.tenant}/domain:${target.domain}`
            }))
        };
    }

    public validateBundle(bundle: AuthorityBundle): AuthorityValidationResult {
        const errors: string[] = [];
        if (!bundle.manifest) errors.push('Missing manifest ID');
        if (bundle.permissions.some(p => p.resource === '*')) {
            errors.push('Wildcard domain mutation is prohibited. Must bind strictly to tenant domain.');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}
