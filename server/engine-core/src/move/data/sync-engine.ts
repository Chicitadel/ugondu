/******************************************************************************
 * Project        : Ugondu
 * Module         : move/data
 * File           : sync-engine.ts
 * Version        : 1.0.0
 * Author         : Elite Ugondu Move Engineer
 * Organization   : Air Roofers
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Corporate Governed
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

import { SnapshotSync } from './snapshot';
import { IncrementalSync } from './incremental';

export enum SyncState {
    INITIALIZING = 'INITIALIZING',
    SNAPSHOT = 'SNAPSHOT',
    INCREMENTAL = 'INCREMENTAL',
    IN_SYNC = 'IN_SYNC',
    ERROR = 'ERROR'
}

export class SyncEngine {
    private state: SyncState = SyncState.INITIALIZING;
    private snapshotSync = new SnapshotSync();
    private incrementalSync = new IncrementalSync();

    async runSync(sourceId: string, targetId: string): Promise<void> {
        try {
            this.state = SyncState.SNAPSHOT;
            await this.snapshotSync.performSnapshot(sourceId, targetId);
            
            this.state = SyncState.INCREMENTAL;
            const lag = await this.incrementalSync.catchUp(sourceId, targetId);
            
            if (lag < 100) {
                this.state = SyncState.IN_SYNC;
            }
        } catch (error) {
            this.state = SyncState.ERROR;
            throw error;
        }
    }

    getState(): SyncState {
        return this.state;
    }
}
