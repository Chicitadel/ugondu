/******************************************************************************
 * Project        : Ugondu - Universal Delivery Operating System
 * Module         : Server / Engine Core / DEISE / Twin
 * File           : environment-twin.ts
 * Version        : 1.0.0
 * Author         : Air Roofers Engineering
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-10-04
 * Classification : ENTERPRISE
 ******************************************************************************/

import { EnvironmentObjectManifest } from '../model/drift';

export interface TopologyTwin {
    currentSymlinkTarget: string | null;
    currentSymlinkValid: boolean;
    webrootPath: string;
    webrootSymlinkTarget: string | null;
    availableReleases: string[];
}

export interface ApplicationTwin {
    version: string;
    manifests: EnvironmentObjectManifest[];
    integrityStatus: 'VALID' | 'CORRUPTED' | 'MISSING';
}

export interface RuntimeTwin {
    primaryRuntime: string;
    primaryRuntimeVersion: string;
    missingDependencies: string[];
}

export interface ProviderTwin {
    platform: string; // 'cpanel' | 'directadmin' | 'vps'
    symlinkSupported: boolean;
    atomicRenameSupported: boolean;
    rsyncAvailable: boolean;
}

export interface EnvironmentTwin {
    provider: ProviderTwin;
    topology: TopologyTwin;
    application: ApplicationTwin;
    infrastructure?: InfrastructureTwin[];
    runtime: RuntimeTwin;
}

export interface InfrastructureTwin {
    id: string;
    type: 'EC2' | 'RDS' | 'VPC' | 'S3';
    expectedState: Record<string, any>;
    actualState: Record<string, any>;
}

