/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Credential Intake & Normalization
 * File           : core.ts
 * Version        : 1.0.0
 * Classification : ENTERPRISE
 ******************************************************************************/

export interface NormalizedCredential {
    provider: string;
    authType: string;
    payload: Record<string, string>;
}

export interface CredentialNormalizer {
    supports(rawContent: string): boolean;
    normalize(rawContent: string): Promise<NormalizedCredential>;
}

export interface AuthenticatedIdentity {
    accountId: string;
    principal: string;
    userId: string;
    provider: string;
    region?: string;
}

export interface AuthenticationVerifier {
    verify(credential: NormalizedCredential): Promise<AuthenticatedIdentity>;
}

export interface AuthorizationPreflight {
    preflight(credential: NormalizedCredential, identity: AuthenticatedIdentity, capabilities: string[]): Promise<Record<string, boolean>>;
}
