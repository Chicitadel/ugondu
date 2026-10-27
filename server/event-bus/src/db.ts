/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Event Bus — Persistent Ledger & Dead-Letter Store
 * File           : db.ts
 * Version        : 2.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-10-03
 * Last Modified  : 2026-10-18
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance:
 * - Corporate Policy Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

import path from 'path';
import fs from 'fs';

function resolveDataDir(): string {
    const candidates = [
        process.env.DATA_DIR,
        path.resolve(__dirname, '../../data'),
        path.join(require('os').tmpdir(), 'ugondu-data'),
    ].filter(Boolean) as string[];

    for (const dir of candidates) {
        try {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            return dir;
        } catch {
            // try next candidate
        }
    }
    return require('os').tmpdir();
}

const dataDir = resolveDataDir();
const dbPath = path.join(dataDir, 'events.json');

export interface DeadLetterEntry {
    eventId: string;
    schemaVersion: string;
    type: string;
    tenantId: string;
    correlationId: string;
    webhookUrl: string;
    attempts: number;
    reason: string;
    failedAt: string;
    payload: Record<string, any>;
}

interface PersistedEventState {
    // tenantId -> eventType -> webhookUrls[]
    tenantSubscribers: Record<string, Record<string, string[]>>;
    processedEvents: Record<string, string>;
    deadLetters: DeadLetterEntry[];
}

export const deadLetterLog: DeadLetterEntry[] = [];

class EventDatabase {
    private tenantSubscribers: Record<string, Record<string, string[]>> = {};
    private processedEvents: Record<string, string> = {};
    private ready = false;
    private memoryOnly = false;

    constructor() {
        this.load();
    }

    private load(): void {
        if (fs.existsSync(dbPath)) {
            try {
                const raw = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
                if (raw && typeof raw === 'object') {
                    if (raw.tenantSubscribers && typeof raw.tenantSubscribers === 'object') {
                        this.tenantSubscribers = raw.tenantSubscribers;
                    }
                    if (raw.processedEvents && typeof raw.processedEvents === 'object') {
                        this.processedEvents = raw.processedEvents;
                    }
                    if (Array.isArray(raw.deadLetters)) {
                        deadLetterLog.splice(0, deadLetterLog.length, ...raw.deadLetters);
                    }
                }
            } catch {
                this.tenantSubscribers = {};
                this.processedEvents = {};
            }
        }
        this.ready = true;
    }

    private save(): void {
        if (this.memoryOnly) return;
        try {
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            const state: PersistedEventState = {
                tenantSubscribers: this.tenantSubscribers,
                processedEvents: this.processedEvents,
                deadLetters: deadLetterLog,
            };
            fs.writeFileSync(dbPath, JSON.stringify(state, null, 2));
        } catch {
            // Ignore write errors in ephemeral test environments
        }
    }

    isReady(): boolean {
        return this.ready;
    }

    getSubscribers(event: string, tenantId: string = 'default'): string[] {
        const tenantMap = this.tenantSubscribers[tenantId];
        if (!tenantMap) return [];
        return [...(tenantMap[event] || [])];
    }

    addSubscriber(event: string, webhookUrl: string, tenantId: string = 'default'): void {
        if (!this.tenantSubscribers[tenantId]) {
            this.tenantSubscribers[tenantId] = {};
        }
        if (!this.tenantSubscribers[tenantId][event]) {
            this.tenantSubscribers[tenantId][event] = [];
        }
        if (!this.tenantSubscribers[tenantId][event].includes(webhookUrl)) {
            this.tenantSubscribers[tenantId][event].push(webhookUrl);
            this.save();
        }
    }

    hasProcessedEvent(eventId: string): boolean {
        return Boolean(this.processedEvents[eventId]);
    }

    markEventProcessed(eventId: string, timestamp: string = new Date().toISOString()): void {
        this.processedEvents[eventId] = timestamp;
        this.save();
    }

    addDeadLetter(entry: DeadLetterEntry): void {
        deadLetterLog.push(entry);
        this.save();
    }

    getDeadLetters(tenantId?: string): DeadLetterEntry[] {
        if (!tenantId) return [...deadLetterLog];
        return deadLetterLog.filter((item) => item.tenantId === tenantId);
    }

    clearForTesting(): void {
        this.memoryOnly = true;
        this.tenantSubscribers = {};
        this.processedEvents = {};
        deadLetterLog.splice(0, deadLetterLog.length);
    }
}

export const eventStore = new EventDatabase();
