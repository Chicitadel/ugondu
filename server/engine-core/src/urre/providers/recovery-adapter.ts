/******************************************************************************
 * Project        : Ugondu
 * Module         : URRE
 * File           : recovery-adapter.ts
 * Version        : 1.0.0
 * Author         : Architecture Authority
 * Organization   : Air Roofers
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS
 * - NIST
 *
 * Signatures:
 * - Architecture Authority
 * - Security Authority
 * - Governance Authority
 * - Deployment Authority
 *
 * Copyright (c) 2026 Air Roofers
 * All Rights Reserved.
 ******************************************************************************/

export interface SnapshotMetadata {
    id: string;
    timestamp: number;
    checksum: string;
    sizeBytes: number;
}

export interface IProviderRecoveryAdapter {
    /**
     * Creates a recovery snapshot for a given provider context.
     * @param contextId Identifier for the provider context.
     * @returns Metadata for the created snapshot.
     */
    createSnapshot(contextId: string): Promise<SnapshotMetadata>;

    /**
     * Verifies the integrity of an existing snapshot.
     * @param snapshotId The identifier of the snapshot to verify.
     * @returns True if the snapshot is valid, false otherwise.
     */
    verifySnapshot(snapshotId: string): Promise<boolean>;

    /**
     * Restores the provider context from the specified snapshot.
     * @param snapshotId The identifier of the snapshot to restore from.
     * @returns True if restoration was successful.
     */
    restoreSnapshot(snapshotId: string): Promise<boolean>;
}
