/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Billing Gateway — Token & License Store
 * File           : db.ts
 * Version        : 2.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-10-03
 * Last Modified  : 2026-10-18
 * Classification : SOVEREIGN | ENTERPRISE
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
import { createHash } from 'crypto';

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
const dbPath = path.join(dataDir, 'billing.json');

export type LicenseStatus = 'active' | 'expired' | 'revoked' | 'suspended' | 'invalid';

export interface TenantInfo {
    token: string;
    token_fingerprint?: string;
    tenant_id: string;
    edition: string;
    status: LicenseStatus;
    created_at: string;
    expires_at?: string;
    revoked_at?: string;
    suspended_reason?: string;
    entitlements?: string[];
}

export interface RegisterTokenOptions {
    status?: LicenseStatus;
    expiresAt?: string;
    revokedAt?: string;
    suspendedReason?: string;
    entitlements?: string[];
}

export function computeTokenFingerprint(token: string): string {
    return `sha256:${createHash('sha256').update(String(token), 'utf8').digest('hex').slice(0, 16)}`;
}

class JSONDatabase {
    private data: Record<string, TenantInfo> = {};
    private ready = false;
    private lastLoadedMtime = 0;
    private memoryOnly = false;

    constructor() {
        this.load();
    }

    private load(): void {
        if (fs.existsSync(dbPath)) {
            try {
                const stat = fs.statSync(dbPath);
                this.lastLoadedMtime = stat.mtimeMs;
                const parsed = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
                if (parsed && typeof parsed === 'object') {
                    for (const [key, val] of Object.entries(parsed as Record<string, any>)) {
                        if (val && typeof val === 'object') {
                            this.data[key] = {
                                token: val.token || key,
                                token_fingerprint: val.token_fingerprint || computeTokenFingerprint(val.token || key),
                                tenant_id: val.tenant_id || 'tenant_unknown',
                                edition: val.edition || 'free',
                                status: val.status || 'active',
                                created_at: val.created_at || new Date().toISOString(),
                                ...(val.expires_at ? { expires_at: val.expires_at } : {}),
                                ...(val.revoked_at ? { revoked_at: val.revoked_at } : {}),
                                ...(val.suspended_reason ? { suspended_reason: val.suspended_reason } : {}),
                                ...(Array.isArray(val.entitlements) ? { entitlements: val.entitlements } : {}),
                            };
                        }
                    }
                }
            } catch {
                this.data = {};
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
            fs.writeFileSync(dbPath, JSON.stringify(this.data, null, 2));
            if (fs.existsSync(dbPath)) {
                this.lastLoadedMtime = fs.statSync(dbPath).mtimeMs;
            }
        } catch {
            // Ignore write errors in read-only test sandboxes
        }
    }

    isReady(): boolean {
        return this.ready;
    }

    get(token: string): TenantInfo | null {
        if (!this.memoryOnly && fs.existsSync(dbPath)) {
            try {
                const mtime = fs.statSync(dbPath).mtimeMs;
                if (mtime > this.lastLoadedMtime) {
                    this.load();
                }
            } catch {
                // Ignore stat error
            }
        }
        return this.data[token] || null;
    }

    set(token: string, tenantId: string, edition: string, options: RegisterTokenOptions = {}): TenantInfo {
        const record: TenantInfo = {
            token,
            token_fingerprint: computeTokenFingerprint(token),
            tenant_id: tenantId,
            edition,
            status: options.status || 'active',
            created_at: new Date().toISOString(),
            ...(options.expiresAt ? { expires_at: options.expiresAt } : {}),
            ...(options.revokedAt ? { revoked_at: options.revokedAt } : {}),
            ...(options.suspendedReason ? { suspended_reason: options.suspendedReason } : {}),
            ...(options.entitlements ? { entitlements: options.entitlements } : {}),
        };
        this.data[token] = record;
        this.save();
        return record;
    }

    updateStatus(token: string, status: LicenseStatus, reason?: string): TenantInfo | null {
        const existing = this.get(token);
        if (!existing) return null;
        existing.status = status;
        if (status === 'revoked') {
            existing.revoked_at = new Date().toISOString();
        }
        if (status === 'suspended' && reason) {
            existing.suspended_reason = reason;
        }
        if (status === 'expired' && !existing.expires_at) {
            existing.expires_at = new Date(Date.now() - 1000).toISOString();
        }
        this.save();
        return existing;
    }

    remove(token: string): void {
        delete this.data[token];
        this.save();
    }

    clearMemory(): void {
        this.memoryOnly = true;
        this.data = {};
    }
}

const db = new JSONDatabase();

export const tokenStore = {
    isReady(): boolean {
        return db.isReady();
    },
    verifyToken(token: string): TenantInfo | null {
        return db.get(token);
    },
    registerToken(
        token: string,
        tenantId: string,
        edition: string,
        options?: RegisterTokenOptions
    ): TenantInfo {
        return db.set(token, tenantId, edition, options);
    },
    setTokenStatus(token: string, status: LicenseStatus, reason?: string): TenantInfo | null {
        return db.updateStatus(token, status, reason);
    },
    revokeToken(token: string): TenantInfo | null {
        return db.updateStatus(token, 'revoked');
    },
    suspendToken(token: string, reason?: string): TenantInfo | null {
        return db.updateStatus(token, 'suspended', reason);
    },
    expireToken(token: string, expiresAt?: string): TenantInfo | null {
        const existing = db.get(token);
        if (!existing) return null;
        existing.status = 'expired';
        existing.expires_at = expiresAt || new Date(Date.now() - 60_000).toISOString();
        return db.updateStatus(token, 'expired');
    },
    removeToken(token: string): void {
        db.remove(token);
    },
    clearForTesting(): void {
        db.clearMemory();
    },
};
