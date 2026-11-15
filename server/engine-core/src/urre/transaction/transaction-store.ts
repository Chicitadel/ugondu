/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Engine Core / URRE / Transaction Store
 * File           : transaction-store.ts
 * Version        : 2.0.0
 * Author         : Enterprise Architecture Council / Ujomor Systems Engineering Authority
 * Organization   : Air Roofers SASU / Ujomor Systems
 * Created Date   : 2026-10-02
 * Last Modified  : 2026-10-25
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance:
 * - Corporate Policy Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 * - Fail-Closed Semantics
 *
 * Standards:
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS
 * - NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Logger, ErrorCode, UgonduDomainError, translateProviderError } from '@ugondu/shared';
import { TransactionDag } from './transaction-dag';

export class TransactionStore {
    private readonly stateDir: string;

    constructor(customDir?: string) {
        // Defaults to ~/.ugondu/state/
        this.stateDir = customDir || path.join(os.homedir(), '.ugondu', 'state');
        if (!fs.existsSync(this.stateDir)) {
            try {
                fs.mkdirSync(this.stateDir, { recursive: true });
            } catch (err: unknown) {
                throw translateProviderError('FILESYSTEM', err, {
                    action: 'initTransactionStateDir',
                    stateDir: this.stateDir
                });
            }
        }
    }

    public async save(tx: TransactionDag): Promise<void> {
        tx.updatedAt = Date.now();
        const file = path.join(this.stateDir, `${tx.id}.json`);
        // Atomic write via a temporary file to prevent corruption on crash
        const tempFile = `${file}.tmp`;
        try {
            fs.writeFileSync(tempFile, JSON.stringify(tx, null, 2), 'utf8');
            fs.renameSync(tempFile, file);
        } catch (err: unknown) {
            throw translateProviderError('FILESYSTEM', err, {
                action: 'saveTransaction',
                txId: tx.id,
                file
            });
        }
    }

    public async load(txId: string): Promise<TransactionDag | null> {
        const file = path.join(this.stateDir, `${txId}.json`);
        if (!fs.existsSync(file)) return null;
        try {
            const data = fs.readFileSync(file, 'utf8');
            const parsed = JSON.parse(data);
            return TransactionDag.deserialize(parsed);
        } catch (err: unknown) {
            Logger.error(`Transaction state corrupted or unreadable for txId "${txId}" at ${file}`, err, {
                txId,
                file,
                failClosed: true
            });
            throw new UgonduDomainError(
                ErrorCode.STATE_CORRUPT,
                `Transaction state file is corrupt or unreadable for txId "${txId}": ${err instanceof Error ? err.message : String(err)}`,
                { txId, file, failClosed: true },
                err
            );
        }
    }
}
