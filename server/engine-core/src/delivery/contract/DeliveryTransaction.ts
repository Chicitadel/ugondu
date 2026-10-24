/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Universal Delivery Orchestration
 * File           : DeliveryTransaction.ts
 * Version        : 3.0.0
 * Author         : Air Roofers Ltd
 * Created Date   : 2026-10-04
 * Classification : ENTERPRISE
 *
 * Description:
 * Canonical definition of a Universal Delivery Transaction. Defines Actor,
 * Source, Destination, and Action as strictly isolated, authenticated, and
 * independently verifiable entities.
 ******************************************************************************/

export type DeliveryActionType =
    | 'DEPLOY'
    | 'PROMOTE'
    | 'MIGRATE'
    | 'SYNC'
    | 'RESTORE'
    | 'REPAIR'
    | 'ROLLBACK'
    | 'CLONE'
    | 'MIRROR'
    | 'BACKUP'
    | 'VERIFY'
    | 'DRY_RUN'
    | 'EXPORT'
    | 'IMPORT';

export interface DeliveryActor {
    identity: string;
    authenticationMethod: 'OIDC' | 'SAML' | 'API_KEY' | 'MTLS' | 'CLI_SESSION';
    tenantId: string;
    workspaceId: string;
}

export interface DeliverySource {
    type: 'GIT_REPOSITORY' | 'LOCAL_WORKSPACE' | 'ARCHIVE' | 'BACKUP' | 'ARTIFACT_REGISTRY' | 'OCI_REGISTRY' | 'OBJECT_STORAGE' | 'EXISTING_ENVIRONMENT';
    adapter: string; // e.g., 'github', 'local', 's3', 'directadmin'
    locator: string; // URI, ARN, or path
    ref?: string;    // branch, tag, or version
    commit?: string; // specific verifiable hash
    credentialRef?: string; // Reference to SecretGuard isolated credential
}

export interface DeliveryDestination {
    type: 'VPS' | 'CPANEL' | 'DIRECTADMIN' | 'KUBERNETES' | 'CLOUD' | 'EDGE' | 'AIR_GAPPED';
    environment: 'DEVELOPMENT' | 'TEST' | 'STAGING' | 'PRODUCTION' | 'DISASTER_RECOVERY';
    target: string; // Hostname, Cluster ID, or ARN
    adapter: string; // e.g., 'directadmin', 'aws', 'kubernetes'
    credentialRef?: string; // Reference to SecretGuard isolated credential
}

export interface DeliveryArtifact {
    id: string;
    digest: string; // e.g., 'sha256:...'
    provenance?: string; // SLSA Provenance URI
    signature?: string; // Cosign or Authenticode signature payload
}

export interface DeliveryTransaction {
    id: string;
    timestamp: Date;
    actor: DeliveryActor;
    source: DeliverySource;
    destination: DeliveryDestination;
    action: {
        type: DeliveryActionType;
        strategy?: 'ATOMIC_POINTER_SWAP' | 'BLUE_GREEN' | 'CANARY' | 'IN_PLACE';
    };
    artifact?: DeliveryArtifact;
    policy: {
        policyHash: string; // Hash of the active APDL policy
    };
    authorization?: {
        decision: 'ALLOW' | 'DENY';
        reason?: string;
    };
    execution?: {
        transactionId: string;
        passportRef?: string; // The cryptographic Delivery Passport
    };
}
