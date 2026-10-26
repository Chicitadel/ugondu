/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Billing Gateway — Token & License Store
 * File           : db.ts
 * Version        : 2.1.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-03
 * Last Modified  : 2026-10-26
 * Classification : SOVEREIGN | ENTERPRISE
 *
 * Governance:
 * - Corporate Policy Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

import path from 'path';
import fs from 'fs';
import os from 'os';
import { createHash, randomBytes } from 'crypto';
import { __t } from '@ugondu/shared';

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

export class LicenseStoreError extends Error {
    public readonly code: 'LICENSE_STORE_UNAVAILABLE' | 'LICENSE_STORE_INVALID_DATA';

    constructor(code: LicenseStoreError['code']) {
        super(__t(code === 'LICENSE_STORE_INVALID_DATA'
            ? 'messages.error.billing_store_invalid_data'
            : 'messages.error.billing_store_unavailable'));
        this.name = 'LicenseStoreError';
        this.code = code;
    }
}

const LICENSE_STATUSES = new Set<LicenseStatus>(['active', 'expired', 'revoked', 'suspended', 'invalid']);

function isTenantInfo(value: unknown): value is TenantInfo {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const row = value as Record<string, unknown>;
    return typeof row.token === 'string' &&
        typeof row.tenant_id === 'string' &&
        typeof row.edition === 'string' &&
        typeof row.status === 'string' &&
        LICENSE_STATUSES.has(row.status as LicenseStatus) &&
        typeof row.created_at === 'string' &&
        (row.token_fingerprint === undefined || typeof row.token_fingerprint === 'string') &&
        (row.expires_at === undefined || typeof row.expires_at === 'string') &&
        (row.revoked_at === undefined || typeof row.revoked_at === 'string') &&
        (row.suspended_reason === undefined || typeof row.suspended_reason === 'string') &&
        (row.entitlements === undefined || (Array.isArray(row.entitlements) && row.entitlements.every((e) => typeof e === 'string')));
}

function ensureWritableDirectory(directory: string): void {
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    const probe = path.join(directory, `.ugondu-write-probe-${process.pid}-${randomBytes(6).toString('hex')}`);
    let fd: number | undefined;
    try {
        fd = fs.openSync(probe, 'wx', 0o600);
        fs.writeSync(fd, 'ok');
        fs.fsyncSync(fd);
        fs.closeSync(fd);
        fd = undefined;
        fs.unlinkSync(probe);
    } catch {
        if (fd !== undefined) {
            try { fs.closeSync(fd); } catch { /* best effort cleanup */ }
        }
        try { fs.unlinkSync(probe); } catch { /* probe may not have been created */ }
        throw new LicenseStoreError('LICENSE_STORE_UNAVAILABLE');
    }
}

/**
 * Select a writable persistent directory. A configured DATA_DIR is authoritative:
 * if it cannot be used, fail closed instead of silently writing to /tmp.
 */
export function resolveLicenseStoreDirectory(
    configuredDirectory = process.env.DATA_DIR,
    moduleDirectory = __dirname,
    workingDirectory = process.cwd()
): string {
    const candidates = configuredDirectory
        ? [path.resolve(configuredDirectory)]
        : [path.resolve(workingDirectory, 'var', 'data'), path.resolve(moduleDirectory, '../../data')];

    for (const candidate of candidates) {
        try {
            ensureWritableDirectory(candidate);
            return candidate;
        } catch {
            // A configured directory must not silently fall back to another location.
            if (configuredDirectory) throw new LicenseStoreError('LICENSE_STORE_UNAVAILABLE');
        }
    }
    throw new LicenseStoreError('LICENSE_STORE_UNAVAILABLE');
}

export function computeTokenFingerprint(token: string): string {
    return `sha256:${createHash('sha256').update(String(token), 'utf8').digest('hex').slice(0, 16)}`;
}

export class JsonLicenseDatabase {
    private data: Record<string, TenantInfo> = {};
    private ready = false;
    private lastLoadedMtime = 0;
    private memoryOnly = false;
    private readonly dataDir: string;
    private readonly dbPath: string;
    private lastErrorCode: LicenseStoreError['code'] = 'LICENSE_STORE_UNAVAILABLE';

    constructor(dataDirectory?: string) {
        try {
            this.dataDir = resolveLicenseStoreDirectory(dataDirectory ?? process.env.DATA_DIR);
            this.dbPath = path.join(this.dataDir, 'billing.json');
            this.load();
        } catch (error) {
            // The service may start so readiness can report 503; authorization
            // must not use cached tokens while persistent storage is unavailable.
            this.dataDir = dataDirectory ? path.resolve(dataDirectory) : path.resolve(process.cwd(), 'var', 'data');
            this.dbPath = path.join(this.dataDir, 'billing.json');
            this.ready = false;
            this.lastErrorCode = error instanceof LicenseStoreError ? error.code : 'LICENSE_STORE_UNAVAILABLE';
        }
    }

    private load(): void {
        try {
            if (!fs.existsSync(this.dbPath)) {
                this.data = {};
                this.lastLoadedMtime = 0;
                this.ready = true;
                return;
            }

            const stat = fs.statSync(this.dbPath);
            if (!stat.isFile()) throw new LicenseStoreError('LICENSE_STORE_INVALID_DATA');
            const parsed: unknown = JSON.parse(fs.readFileSync(this.dbPath, 'utf8'));
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                throw new LicenseStoreError('LICENSE_STORE_INVALID_DATA');
            }

            const normalized: Record<string, TenantInfo> = {};
            for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
                if (!isTenantInfo(value)) throw new LicenseStoreError('LICENSE_STORE_INVALID_DATA');
                normalized[key] = {
                    ...value,
                    token_fingerprint: value.token_fingerprint || computeTokenFingerprint(value.token || key),
                };
            }
            this.data = normalized;
            this.lastLoadedMtime = stat.mtimeMs;
            this.ready = true;
            this.lastErrorCode = 'LICENSE_STORE_UNAVAILABLE';
        } catch (error) {
            this.ready = false;
            this.lastErrorCode = error instanceof LicenseStoreError ? error.code :
                (error instanceof SyntaxError ? 'LICENSE_STORE_INVALID_DATA' : 'LICENSE_STORE_UNAVAILABLE');
            // Preserve the on-disk record and never convert corrupt state into an
            // empty, apparently healthy registry.
        }
    }

    private assertReady(): void {
        if (!this.ready && !this.memoryOnly) throw new LicenseStoreError(this.lastErrorCode);
    }

    private save(nextData: Record<string, TenantInfo>): void {
        if (this.memoryOnly) {
            this.data = nextData;
            return;
        }
        this.assertReady();

        const tempPath = path.join(this.dataDir, `.billing-${process.pid}-${randomBytes(8).toString('hex')}.tmp`);
        let fd: number | undefined;
        try {
            ensureWritableDirectory(this.dataDir);
            fd = fs.openSync(tempPath, 'wx', 0o600);
            fs.writeFileSync(fd, JSON.stringify(nextData, null, 2), 'utf8');
            fs.fsyncSync(fd);
            fs.closeSync(fd);
            fd = undefined;
            fs.renameSync(tempPath, this.dbPath);
            try {
                fs.chmodSync(this.dbPath, 0o600);
                const dirFd = fs.openSync(this.dataDir, 'r');
                try { fs.fsyncSync(dirFd); } finally { fs.closeSync(dirFd); }
            } catch {
                // Directory fsync/chmod support varies by host; the atomic rename
                // is still required, and private file creation mode remains 0600.
            }
            this.lastLoadedMtime = fs.statSync(this.dbPath).mtimeMs;
            this.data = nextData;
            this.ready = true;
        } catch {
            if (fd !== undefined) {
                try { fs.closeSync(fd); } catch { /* best effort cleanup */ }
            }
            try { fs.unlinkSync(tempPath); } catch { /* best effort cleanup */ }
            this.ready = false;
            this.lastErrorCode = 'LICENSE_STORE_UNAVAILABLE';
            throw new LicenseStoreError('LICENSE_STORE_UNAVAILABLE');
        }
    }

    isReady(): boolean {
        return this.ready;
    }

    getErrorCode(): LicenseStoreError['code'] {
        return this.lastErrorCode;
    }

    get(token: string): TenantInfo | null {
        if (!this.ready && !this.memoryOnly) return null;
        if (!this.memoryOnly && fs.existsSync(this.dbPath)) {
            try {
                const mtime = fs.statSync(this.dbPath).mtimeMs;
                if (mtime > this.lastLoadedMtime) this.load();
            } catch {
                this.ready = false;
                this.lastErrorCode = 'LICENSE_STORE_UNAVAILABLE';
                return null;
            }
        }
        if (!this.ready && !this.memoryOnly) return null;
        return this.data[token] || null;
    }

    set(token: string, tenantId: string, edition: string, options: RegisterTokenOptions = {}): TenantInfo {
        this.assertReady();
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
        this.save({ ...this.data, [token]: record });
        return record;
    }

    updateStatus(token: string, status: LicenseStatus, reason?: string): TenantInfo | null {
        this.assertReady();
        const existing = this.get(token);
        if (!existing) return null;
        const updated: TenantInfo = {
            ...existing,
            status,
            ...(status === 'revoked' ? { revoked_at: new Date().toISOString() } : {}),
            ...(status === 'suspended' && reason ? { suspended_reason: reason } : {}),
            ...(status === 'expired' && !existing.expires_at ? { expires_at: new Date(Date.now() - 1000).toISOString() } : {}),
        };
        this.save({ ...this.data, [token]: updated });
        return updated;
    }

    remove(token: string): void {
        this.assertReady();
        const nextData = { ...this.data };
        delete nextData[token];
        this.save(nextData);
    }

    clearMemory(): void {
        this.memoryOnly = true;
        this.data = {};
        this.ready = true;
    }
}

const db = new JsonLicenseDatabase();

export const tokenStore = {
    isReady(): boolean {
        return db.isReady();
    },
    getErrorCode(): LicenseStoreError['code'] {
        return db.getErrorCode();
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
        const currentStatus = existing.status;
        const currentExpiry = existing.expires_at;
        const updated = db.updateStatus(token, 'expired');
        if (updated && expiresAt) return db.set(token, updated.tenant_id, updated.edition, {
            status: 'expired', expiresAt,
        });
        // updateStatus already saved the expired state; variables kept for future
        // schema migrations rather than mutating the returned record unsafely.
        void currentStatus; void currentExpiry;
        return updated;
    },
    removeToken(token: string): void {
        db.remove(token);
    },
    clearForTesting(): void {
        db.clearMemory();
    },
};
