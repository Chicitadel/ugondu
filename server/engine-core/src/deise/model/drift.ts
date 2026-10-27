/******************************************************************************
 * Project        : Ugondu - Universal Delivery Operating System
 * Module         : Server / Engine Core / DEISE / Model
 * File           : drift.ts
 * Version        : 1.0.0
 * Author         : Air Roofers Engineering
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-10-04
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Architecture Controlled
 * - Protocol Frozen
 *
 * Copyright (c) 2026 Air Roofers
 * All Rights Reserved.
 ******************************************************************************/

/**
 * First-class states of environmental structural drift.
 */
export enum DriftCategory {
    /** Application files differ (source != target). Application needs upload. */
    PAYLOAD_DRIFT = 'PAYLOAD_DRIFT',

    /** Files intact but deployment structure is wrong (e.g. broken symlink). */
    TOPOLOGY_DRIFT = 'TOPOLOGY_DRIFT',

    /** Host environment changed (cPanel -> DirectAdmin, perms, owners). */
    ENVIRONMENT_DRIFT = 'ENVIRONMENT_DRIFT',

    /** Execution environment broken (missing extensions, no DB conn). */
    RUNTIME_DRIFT = 'RUNTIME_DRIFT',
    INFRASTRUCTURE_DRIFT = 'INFRASTRUCTURE_DRIFT'
}

export enum ObjectType {
    FILE = 'FILE',
    DIRECTORY = 'DIRECTORY',
    SYMLINK = 'SYMLINK',
    UNKNOWN = 'UNKNOWN'
}

export enum FileClassification {
    EXPECTED = 'EXPECTED',
    MISSING = 'MISSING',
    MODIFIED = 'MODIFIED',
    EXTRA = 'EXTRA',
    UNKNOWN = 'UNKNOWN',
    PROTECTED = 'PROTECTED',
    GENERATED = 'GENERATED',
    USER_DATA = 'USER_DATA',
    SYSTEM = 'SYSTEM'
}

export interface EnvironmentObjectManifest {
    path: string;
    type: ObjectType;
    classification: FileClassification;
    size?: number;
    sha256?: string;
    target?: string; // For symlinks
    mode?: string;
    owner?: string;
}

export interface DriftDiagnosis {
    category: DriftCategory;
    description: string;
    affectedPaths: string[];
    isDestructiveRecovery: boolean;
    remediationAction: string;
    expectedState?: any;
    actualState?: any;
}

export interface InfrastructureDriftDiagnostic extends DriftDiagnosis {
    provider: string;
    resourceType: string;
    resourceId: string;
    attribute: string;
    expectedValue: any;
    actualValue: any;
    repairOperation: string;
}
