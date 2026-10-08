export interface RequiredAuthority {
    provider: string;
    operations: string[];
}

export interface Authority {
    provider: string;
    permissions: any[];
}

export interface AuthorityGap {
    hasGap: boolean;
    missingPermissions: any[];
}

export interface AuthorityBundle {
    manifest: string;
    permissions: any[];
}

export interface AuthorityValidationResult {
    isValid: boolean;
    errors: string[];
}

export interface AuthorityCalculator<TTarget, TPlan> {
    discoverRequiredAuthority(target: TTarget, plan: TPlan): RequiredAuthority;
    calculateAuthorityGap(available: Authority, required: RequiredAuthority): AuthorityGap;
    generateLeastPrivilegeBundle(target: TTarget, plan: TPlan): AuthorityBundle;
    validateBundle(bundle: AuthorityBundle): AuthorityValidationResult;
}
