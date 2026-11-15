/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Billing Gateway — Durable Usage Metering & Webhook Ledger
 * File           : usage-ledger.ts
 * Version        : 2026.4.0-LTS
 * Author         : Ignatus Chika Ujomor
 * Organization   : Air Roofers SASU / Enterprise Governance
 * Created Date   : 2026-11-14
 * Last Modified  : 2026-11-14
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance:
 * - Corporate Policy Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 * - Commercial Sovereignty: AeroBill APR Authority
 *
 * Standards:
 * - ISO 27001 / SOC 2 / OWASP ASVS 5.0 / NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { resolveLicenseStoreDirectory } from './db';
import { AeroBillClient, defaultAeroBillClient } from './aerobill-client';

export interface UsageMeterEntry {
    eventId: string;
    tenantId: string;
    metric: string;
    quantity: number;
    timestamp: string;
    payloadHash: string;
    status: 'RECONCILED' | 'QUEUED_RETRY';
    attempts: number;
    lastAttemptAt: string;
    reconciledAt?: string;
    metadata?: Record<string, unknown>;
}

export class UsageMeterLedger {
    private entries = new Map<string, UsageMeterEntry>();
    private readonly ledgerPath: string | null;

    constructor(dataDirectory?: string) {
        try {
            const dir = resolveLicenseStoreDirectory(dataDirectory ?? process.env.DATA_DIR);
            this.ledgerPath = path.join(dir, 'usage-ledger.json');
            this.load();
        } catch {
            this.ledgerPath = null;
        }
    }

    private load(): void {
        if (!this.ledgerPath || !fs.existsSync(this.ledgerPath)) return;
        try {
            const raw = fs.readFileSync(this.ledgerPath, 'utf8');
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                for (const item of parsed) {
                    if (item && typeof item.eventId === 'string') {
                        this.entries.set(item.eventId, item as UsageMeterEntry);
                    }
                }
            }
        } catch {
            // Preserve clean empty state if corrupt; fail-closed checks handle duplicates
        }
    }

    private persist(): void {
        if (!this.ledgerPath) return;
        try {
            const tmp = `${this.ledgerPath}.tmp.${process.pid}`;
            fs.writeFileSync(tmp, JSON.stringify(Array.from(this.entries.values()), null, 2), { mode: 0o600 });
            fs.renameSync(tmp, this.ledgerPath);
        } catch {
            // Best-effort persistence in sandboxed environments
        }
    }

    static computePayloadHash(tenantId: string, metric: string, quantity: number, timestamp: string): string {
        return createHash('sha256')
            .update(JSON.stringify({ tenantId, metric, quantity, timestamp }))
            .digest('hex');
    }

    getEntry(eventId: string): UsageMeterEntry | undefined {
        return this.entries.get(eventId);
    }

    listPending(): UsageMeterEntry[] {
        return Array.from(this.entries.values()).filter((e) => e.status === 'QUEUED_RETRY');
    }

    clear(): void {
        this.entries.clear();
        this.persist();
    }

    async recordAndDispatch(
        input: { eventId: string; tenantId: string; metric: string; quantity: number; timestamp: string; metadata?: Record<string, unknown> },
        client: AeroBillClient = defaultAeroBillClient,
        correlationId?: string
    ): Promise<{ outcome: 'RECONCILED' | 'QUEUED_RETRY' | 'IDEMPOTENT_REPLAY' | 'CONFLICT'; entry: UsageMeterEntry }> {
        const payloadHash = UsageMeterLedger.computePayloadHash(
            input.tenantId,
            input.metric,
            input.quantity,
            input.timestamp
        );
        const existing = this.entries.get(input.eventId);
        if (existing) {
            if (existing.payloadHash !== payloadHash) {
                return { outcome: 'CONFLICT', entry: existing };
            }
            if (existing.status === 'RECONCILED') {
                return { outcome: 'IDEMPOTENT_REPLAY', entry: existing };
            }
        }

        const nowIso = new Date().toISOString();
        const entry: UsageMeterEntry = existing ?? {
            eventId: input.eventId,
            tenantId: input.tenantId,
            metric: input.metric,
            quantity: input.quantity,
            timestamp: input.timestamp,
            payloadHash,
            status: 'QUEUED_RETRY',
            attempts: 0,
            lastAttemptAt: nowIso,
            metadata: input.metadata,
        };

        entry.attempts += 1;
        entry.lastAttemptAt = nowIso;

        try {
            await client.reportUsageMeter({
                eventId: input.eventId,
                tenantId: input.tenantId,
                metric: input.metric,
                quantity: input.quantity,
                timestamp: input.timestamp,
                metadata: input.metadata,
                correlationId,
            });
            entry.status = 'RECONCILED';
            entry.reconciledAt = new Date().toISOString();
        } catch {
            entry.status = 'QUEUED_RETRY';
        }

        this.entries.set(entry.eventId, entry);
        this.persist();
        return { outcome: entry.status, entry };
    }

    async flushPending(client: AeroBillClient = defaultAeroBillClient, correlationId?: string): Promise<{ reconciled: number; remaining: number }> {
        let reconciled = 0;
        for (const pending of this.listPending()) {
            const res = await this.recordAndDispatch(pending, client, correlationId);
            if (res.outcome === 'RECONCILED') {
                reconciled++;
            }
        }
        return { reconciled, remaining: this.listPending().length };
    }
}

export const usageLedger = new UsageMeterLedger();
