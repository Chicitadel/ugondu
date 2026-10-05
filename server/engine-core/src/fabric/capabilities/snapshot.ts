/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Fabric Capabilities Engine
 * File           : snapshot.ts
 * Version        : 2.0.0
 * Author         : Air Roofers Ltd
 * Classification : ENTERPRISE
 ******************************************************************************/

export interface SnapshotRequest {
    resourceType: 'EBS_VOLUME' | 'RDS_INSTANCE' | 'EC2_INSTANCE';
    resourceId: string;
}

export interface SnapshotCapability {
    createSnapshot(req: SnapshotRequest): Promise<string>;
}
