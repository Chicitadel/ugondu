export interface ManagementProvenanceRecord {
    providerAccount: string;
    tenantId: string;
    resourceId: string;
    resourceType: string;
    deploymentId: string;
    transactionId: string;
    managementAuthority: string;
    creationTimestamp: number;
    ownershipState: 'MANAGED' | 'UNMANAGED' | 'ORPHANED' | 'SHARED' | 'UNKNOWN';
    cryptographicEvidence: string; // Hash of intent + authority asserting ownership
}
