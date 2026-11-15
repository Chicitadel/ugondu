/******************************************************************************
 * Project        : URRE-2
 * Module         : engine-core/urre/journal
 * File           : filesystem-store.ts
 * Version        : 1.0.0
 * Author         : Air Roofers Engineering Team
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

import { IExecutionJournal, IJournalEntry } from './journal';
import { IntegrityManager } from './integrity';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * @class FileSystemStore
 * @description Corporate Governed class implementation for FileSystemStore
 * @classification ENTERPRISE
 */
export class FileSystemStore implements IExecutionJournal {
    private journalDir: string;
    private entries: IJournalEntry[] = [];
    private sequenceCounter: number = 0;
    private lastHash: string = '';

    constructor(journalDir: string) {
        this.journalDir = journalDir;
        if (!fs.existsSync(this.journalDir)) {
            fs.mkdirSync(this.journalDir, { recursive: true });
        }
        this.loadEntries();
    }

    private loadEntries(): void {
        const files = fs.readdirSync(this.journalDir)
            .filter(f => f.endsWith('.json'))
            .sort((a, b) => {
                const seqA = parseInt(a.split('-')[0], 10);
                const seqB = parseInt(b.split('-')[0], 10);
                return seqA - seqB;
            });

        for (const file of files) {
            const content = fs.readFileSync(path.join(this.journalDir, file), 'utf8');
            const entry = JSON.parse(content) as IJournalEntry;
            this.entries.push(entry);
            this.sequenceCounter = Math.max(this.sequenceCounter, entry.sequenceNumber);
            this.lastHash = entry.hash;
        }
    }

    public async append(operationType: string, payload: any): Promise<IJournalEntry> {
        this.sequenceCounter++;
        const timestamp = Date.now();
        const hash = IntegrityManager.generateHash(this.sequenceCounter, timestamp, operationType, payload, this.lastHash);

        const entry: IJournalEntry = {
            sequenceNumber: this.sequenceCounter,
            timestamp,
            operationType,
            payload,
            hash
        };

        const fileName = `${this.sequenceCounter}-${timestamp}.json`;
        const tempFilePath = path.join(os.tmpdir(), `temp-${fileName}`);
        const targetFilePath = path.join(this.journalDir, fileName);

        fs.writeFileSync(tempFilePath, JSON.stringify(entry), 'utf8');
        await IntegrityManager.safeCommit(tempFilePath, targetFilePath);

        this.entries.push(entry);
        this.lastHash = hash;

        return entry;
    }

    public async getEntry(sequenceNumber: number): Promise<IJournalEntry | null> {
        const entry = this.entries.find(e => e.sequenceNumber === sequenceNumber);
        return entry || null;
    }

    public async verifyIntegrity(): Promise<boolean> {
        return !IntegrityManager.detectCorruption(this.entries);
    }

    public async getRecentEntries(limit: number): Promise<IJournalEntry[]> {
        return this.entries.slice(-limit);
    }
}
