/******************************************************************************
 * Project        : URRE-2
 * Module         : engine-core/urre/journal
 * File           : sqlite-store.ts
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
import Database from 'better-sqlite3';

/**
 * @class SqliteStore
 * @description Corporate Governed class implementation for SqliteStore
 * @classification ENTERPRISE
 */
export class SqliteStore implements IExecutionJournal {
    private db: Database.Database;

    constructor(dbPath: string) {
        this.db = new Database(dbPath);
        this.initializeSchema();
    }

    private initializeSchema(): void {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS journal_entries (
                sequenceNumber INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER NOT NULL,
                operationType TEXT NOT NULL,
                payload TEXT NOT NULL,
                hash TEXT NOT NULL
            )
        `);
    }

    private getLastEntry(): IJournalEntry | null {
        const stmt = this.db.prepare('SELECT * FROM journal_entries ORDER BY sequenceNumber DESC LIMIT 1');
        const row = stmt.get() as any;
        if (!row) return null;
        return {
            ...row,
            payload: JSON.parse(row.payload)
        };
    }

    public async append(operationType: string, payload: any): Promise<IJournalEntry> {
        const lastEntry = this.getLastEntry();
        const previousHash = lastEntry ? lastEntry.hash : '';
        const timestamp = Date.now();
        
        const stmt = this.db.prepare('INSERT INTO journal_entries (timestamp, operationType, payload, hash) VALUES (?, ?, ?, ?) RETURNING sequenceNumber');
        const payloadStr = JSON.stringify(payload);
        
        let newSequenceNumber = 0;
        let newHash = '';

        const transaction = this.db.transaction(() => {
            const nextSeqStmt = this.db.prepare('SELECT COALESCE(MAX(sequenceNumber), 0) + 1 AS nextSeq FROM journal_entries');
            const { nextSeq } = nextSeqStmt.get() as { nextSeq: number };
            newSequenceNumber = nextSeq;
            
            newHash = IntegrityManager.generateHash(newSequenceNumber, timestamp, operationType, payload, previousHash);
            
            stmt.run(timestamp, operationType, payloadStr, newHash);
        });
        
        transaction();

        return {
            sequenceNumber: newSequenceNumber,
            timestamp,
            operationType,
            payload,
            hash: newHash
        };
    }

    public async getEntry(sequenceNumber: number): Promise<IJournalEntry | null> {
        const stmt = this.db.prepare('SELECT * FROM journal_entries WHERE sequenceNumber = ?');
        const row = stmt.get(sequenceNumber) as any;
        if (!row) return null;
        return {
            ...row,
            payload: JSON.parse(row.payload)
        };
    }

    public async verifyIntegrity(): Promise<boolean> {
        const stmt = this.db.prepare('SELECT * FROM journal_entries ORDER BY sequenceNumber ASC');
        const rows = stmt.all() as any[];
        const entries: IJournalEntry[] = rows.map(r => ({
            ...r,
            payload: JSON.parse(r.payload)
        }));
        return !IntegrityManager.detectCorruption(entries);
    }

    public async getRecentEntries(limit: number): Promise<IJournalEntry[]> {
        const stmt = this.db.prepare('SELECT * FROM journal_entries ORDER BY sequenceNumber DESC LIMIT ?');
        const rows = stmt.all(limit) as any[];
        return rows.map(r => ({
            ...r,
            payload: JSON.parse(r.payload)
        })).reverse();
    }
}
