export interface UniversalPermission {
    action: string;
    resource: string;
    conditions?: Record<string, any>;
}

export interface UniversalPolicy {
    id: string;
    name: string;
    description: string;
    permissions: UniversalPermission[];
    providerHash?: string;
}

export interface PolicyDecisionRecord {
    id: string;
    timestamp: number;
    provider: string;
    resource: string;
    operation: string;
    principal: string;
    required: string[];
    granted: string[];
    denied: string[];
    decision: 'ALLOW' | 'DENY' | 'FAIL_CLOSED';
    reason: string;
    policyHash?: string;
}

export interface AuthorizationPreflightRequest {
    provider: string;
    principal: string;
    intent: UniversalPermission[];
}
