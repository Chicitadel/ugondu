export interface CredentialReference {
    id: string;
    type: string;
    uri: string;
}

export interface PrincipalIdentity {
    accountId: string;
    principalArn: string;
    provider: string;
}

export interface ProviderAuthCapabilities {
    supportsOidc: boolean;
    supportsCrossAccount: boolean;
    supportsTemporaryCredentials: boolean;
}

export interface FederationPath {
    type: string;
    description: string;
    issuerUrl: string;
    audience: string;
}

export interface TrustRelationship {
    roleArn: string;
    trustPolicy: any;
    providerUrl: string;
}

export interface IdentityProviderPlugin {
    providerName: string;
    
    identify(credentialId: string): Promise<PrincipalIdentity>;
    capabilities(): Promise<ProviderAuthCapabilities>;
    
    federationOptions(principal: PrincipalIdentity): Promise<FederationPath[]>;
    bootstrap(bootstrapCredentialId: string, path: FederationPath, context: any): Promise<TrustRelationship>;
    
    issueTemporaryCredentials(trust: TrustRelationship): Promise<any>;
}
