/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Passport Gatekeeper — Shared Distributed Passport Store
 * File           : passport-store.ts
 * Version        : 3.0.0
 * Author         : Ignatus Chika Ujomor (Lead Systems Architect) — Air Roofers SASU
 * Organization   : Air Roofers SASU / Ujomor Systems Engineering & Governance Authority
 * Created Date   : 2026-10-31
 * Last Modified  : 2026-10-31
 * Classification : SOVEREIGN | ENTERPRISE
 *
 * Governance:
 * - Corporate Policy Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS v4
 * - NIST 800-53
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

import path from 'path';
import fs from 'fs';
import { randomBytes } from 'crypto';
import os from 'os';

export type PassportStorageBackend = 'FILESYSTEM' | 'POSTGRES';

export interface RegisteredPassportRecord {
  passportId: string;
  tenantId: string;
  workspaceId?: string;
  expiresAt?: number;
  revoked?: boolean;
  revocationReason?: string;
  updatedAt?: number;
  version?: number;
}

export class PassportStoreError extends Error {
  public readonly code: 'PASSPORT_STORE_UNAVAILABLE' | 'PASSPORT_STORE_INVALID_DATA';

  constructor(code: PassportStoreError['code'], message?: string) {
    super(message || (code === 'PASSPORT_STORE_INVALID_DATA' ? 'Invalid passport store data' : 'Passport store unavailable'));
    this.name = 'PassportStoreError';
    this.code = code;
  }
}

/** Validate untrusted runtime values before they enter durable passport state. */
export function parsePassportRecord(value: unknown, expectedPassportId?: string): RegisteredPassportRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new PassportStoreError('PASSPORT_STORE_INVALID_DATA');
  }

  const row = value as Record<string, unknown>;
  const passportId = typeof row.passportId === 'string' ? row.passportId.trim() : '';
  const tenantId = typeof row.tenantId === 'string' ? row.tenantId.trim() : '';
  if (!passportId || !tenantId || (expectedPassportId !== undefined && passportId !== expectedPassportId) ||
      (row.workspaceId !== undefined && typeof row.workspaceId !== 'string') ||
      (row.expiresAt !== undefined && (typeof row.expiresAt !== 'number' || !Number.isFinite(row.expiresAt))) ||
      (row.revoked !== undefined && typeof row.revoked !== 'boolean') ||
      (row.revocationReason !== undefined && typeof row.revocationReason !== 'string') ||
      (row.updatedAt !== undefined && (typeof row.updatedAt !== 'number' || !Number.isFinite(row.updatedAt))) ||
      (row.version !== undefined && (typeof row.version !== 'number' || !Number.isInteger(row.version) || row.version < 0))) {
    throw new PassportStoreError('PASSPORT_STORE_INVALID_DATA');
  }

  return {
    passportId,
    tenantId,
    workspaceId: row.workspaceId as string | undefined,
    expiresAt: row.expiresAt as number | undefined,
    revoked: row.revoked as boolean | undefined,
    revocationReason: row.revocationReason as string | undefined,
    updatedAt: row.updatedAt as number | undefined,
    version: row.version as number | undefined,
  };
}

/** Normalize untrusted passport identifiers before any store lookup or mutation. */
export function normalizePassportId(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new PassportStoreError('PASSPORT_STORE_INVALID_DATA');
  }
  return value.trim();
}

export function resolvePassportStorageBackend(): PassportStorageBackend {
  const configured = (process.env['UGONDU_PASSPORT_STORAGE_BACKEND'] || 'FILESYSTEM').trim().toUpperCase();
  if (configured === 'POSTGRES' || configured === 'POSTGRESQL' || configured === 'PG') {
    return 'POSTGRES';
  }
  return 'FILESYSTEM';
}

/** Common contract for durable passport store backends. */
export interface IPassportStoreAdapter {
  readonly backend: PassportStorageBackend;
  isReady(): boolean;
  simulateOutage?(enabled: boolean): void;
  get(passportId: string): RegisteredPassportRecord | null;
  set(record: RegisteredPassportRecord, expectedVersion?: number): void | Promise<void>;
  revoke(passportId: string, reason?: string, expectedVersion?: number): void | Promise<void>;
  isRevoked(passportId: string): boolean;
  clear(): void | Promise<void>;
  getAsync?(passportId: string): Promise<RegisteredPassportRecord | null>;
  setAsync?(record: RegisteredPassportRecord, expectedVersion?: number): Promise<void>;
  revokeAsync?(passportId: string, reason?: string, expectedVersion?: number): Promise<void>;
  isRevokedAsync?(passportId: string): Promise<boolean>;
  clearAsync?(): Promise<void>;
  close?(): Promise<void> | void;
}

function ensureWritableDirectory(directory: string): void {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const probe = path.join(directory, `.passport-write-probe-${process.pid}-${randomBytes(6).toString('hex')}`);
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
      try { fs.closeSync(fd); } catch { /* noop */ }
    }
    try { fs.unlinkSync(probe); } catch { /* noop */ }
    throw new PassportStoreError('PASSPORT_STORE_UNAVAILABLE');
  }
}

export function resolvePassportStoreDirectory(
  configuredDirectory = process.env['UGONDU_PASSPORT_DATA_DIR'] || process.env['DATA_DIR'],
  moduleDirectory = __dirname,
  workingDirectory = process.cwd()
): string {
  const candidates = configuredDirectory
    ? [path.resolve(configuredDirectory)]
    : [
        path.resolve(workingDirectory, 'var', 'data'),
        path.resolve(moduleDirectory, '../../data'),
        path.resolve(workingDirectory, 'data'),
      ];

  for (const candidate of candidates) {
    try {
      ensureWritableDirectory(candidate);
      return candidate;
    } catch {
      if (configuredDirectory) throw new PassportStoreError('PASSPORT_STORE_UNAVAILABLE');
    }
  }
  throw new PassportStoreError('PASSPORT_STORE_UNAVAILABLE');
}

/** Local filesystem adapter maintaining atomic write probes, JSON durability, and directory locking. */
export class LocalFilesystemPassportStoreAdapter implements IPassportStoreAdapter {
  public readonly backend: PassportStorageBackend = 'FILESYSTEM';
  private records: Map<string, RegisteredPassportRecord> = new Map();
  private ready = false;
  private lastLoadedMtime = 0;
  private outageSimulated = false;
  public readonly dataDir: string;
  public readonly dbPath: string;

  constructor(dataDirectory?: string) {
    if (dataDirectory) {
      this.dataDir = resolvePassportStoreDirectory(dataDirectory);
      this.dbPath = path.join(this.dataDir, 'passports.json');
      this.load();
      return;
    }

    try {
      this.dataDir = resolvePassportStoreDirectory(process.env['UGONDU_PASSPORT_DATA_DIR']);
      this.dbPath = path.join(this.dataDir, 'passports.json');
      this.load();
    } catch (err) {
      if (err instanceof PassportStoreError && err.code === 'PASSPORT_STORE_INVALID_DATA') {
        throw err;
      }
      this.dataDir = path.resolve(process.cwd(), 'var', 'data');
      this.dbPath = path.join(this.dataDir, 'passports.json');
      this.ready = false;
    }
  }

  public isReady(): boolean {
    return this.ready && !this.outageSimulated;
  }

  public simulateOutage(enabled: boolean): void {
    this.outageSimulated = enabled;
  }

  private load(force = false): void {
    if (this.outageSimulated) {
      this.ready = false;
      throw new PassportStoreError('PASSPORT_STORE_UNAVAILABLE');
    }

    try {
      if (!fs.existsSync(this.dbPath)) {
        this.records.clear();
        this.lastLoadedMtime = 0;
        this.ready = true;
        return;
      }

      const stat = fs.statSync(this.dbPath);
      if (!stat.isFile()) throw new PassportStoreError('PASSPORT_STORE_INVALID_DATA');

      if (!force && this.ready && stat.mtimeMs <= this.lastLoadedMtime) {
        return;
      }

      const content = fs.readFileSync(this.dbPath, 'utf8');
      const parsed = JSON.parse(content);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new PassportStoreError('PASSPORT_STORE_INVALID_DATA');
      }

      const nextMap = new Map<string, RegisteredPassportRecord>();
      for (const [key, val] of Object.entries(parsed as Record<string, unknown>)) {
        nextMap.set(key, parsePassportRecord(val, key));
      }

      this.records = nextMap;
      this.lastLoadedMtime = stat.mtimeMs;
      this.ready = true;
    } catch (err) {
      this.ready = false;
      if (err instanceof PassportStoreError) throw err;
      throw new PassportStoreError('PASSPORT_STORE_UNAVAILABLE');
    }
  }

  private renameWithRetry(from: string, to: string): void {
    const sleeper = new Int32Array(new SharedArrayBuffer(4));
    for (let attempt = 0; ; attempt++) {
      try {
        fs.renameSync(from, to);
        return;
      } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        if (attempt >= 200 || !(code === 'EPERM' || code === 'EACCES' || code === 'EBUSY')) throw err;
        Atomics.wait(sleeper, 0, 0, 5);
      }
    }
  }

  private persist(): void {
    if (this.outageSimulated) {
      throw new PassportStoreError('PASSPORT_STORE_UNAVAILABLE');
    }

    const payload: Record<string, RegisteredPassportRecord> = {};
    for (const [key, val] of this.records.entries()) {
      payload[key] = val;
    }

    const json = JSON.stringify(payload, null, 2);
    const tmp = path.join(this.dataDir, `.passports.tmp-${process.pid}-${randomBytes(6).toString('hex')}`);

    try {
      const fd = fs.openSync(tmp, 'wx', 0o600);
      try {
        fs.writeSync(fd, json, 0, 'utf8');
        fs.fsyncSync(fd);
      } finally {
        fs.closeSync(fd);
      }
      this.renameWithRetry(tmp, this.dbPath);
      const stat = fs.statSync(this.dbPath);
      this.lastLoadedMtime = stat.mtimeMs;
      this.ready = true;
    } catch {
      try { fs.unlinkSync(tmp); } catch { /* noop */ }
      this.ready = false;
      throw new PassportStoreError('PASSPORT_STORE_UNAVAILABLE');
    }
  }

  public withWriteLock<T>(operation: () => T): T {
    const lockPath = path.join(this.dataDir, '.passports.write-lock');
    const maxWaitMs = Number(process.env['UGONDU_PASSPORT_LOCK_WAIT_MS'] ?? 2000);
    if (!Number.isSafeInteger(maxWaitMs) || maxWaitMs < 1 || maxWaitMs > 60000) {
      throw new PassportStoreError('PASSPORT_STORE_UNAVAILABLE', 'Invalid passport lock timing configuration');
    }
    const deadline = Date.now() + maxWaitMs;
    const sleeper = new Int32Array(new SharedArrayBuffer(4));
    const ownerToken = randomBytes(24).toString('hex');
    const ownerPath = path.join(lockPath, 'owner.json');
    const hostname = os.hostname();
    let acquired = false;

    while (!acquired) {
      let createdLockDirectory = false;
      try {
        fs.mkdirSync(this.dataDir, { recursive: true, mode: 0o700 });
        fs.mkdirSync(lockPath, { mode: 0o700 });
        createdLockDirectory = true;
        fs.writeFileSync(ownerPath, JSON.stringify({
          pid: process.pid,
          hostname,
          token: ownerToken,
          createdAt: Date.now(),
        }), { mode: 0o600, flag: 'wx' });
        acquired = true;
      } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        if (createdLockDirectory) {
          try { fs.rmSync(lockPath, { recursive: true, force: true }); } catch { /* fail closed */ }
          throw new PassportStoreError('PASSPORT_STORE_UNAVAILABLE');
        }
        if (code !== 'EEXIST' && code !== 'EPERM' && code !== 'EACCES' && code !== 'EBUSY') {
          throw new PassportStoreError('PASSPORT_STORE_UNAVAILABLE');
        }
        if (Date.now() >= deadline) throw new PassportStoreError('PASSPORT_STORE_UNAVAILABLE');
        Atomics.wait(sleeper, 0, 0, 10);
      }
    }

    try {
      return operation();
    } finally {
      try {
        const owner = JSON.parse(fs.readFileSync(ownerPath, 'utf8')) as { token?: unknown };
        if (owner.token === ownerToken) {
          fs.unlinkSync(ownerPath);
          fs.rmdirSync(lockPath);
        }
      } catch {
        // Do not remove a lock unless this writer can prove ownership.
      }
    }
  }

  public get(passportId: string): RegisteredPassportRecord | null {
    if (this.outageSimulated) {
      throw new PassportStoreError('PASSPORT_STORE_UNAVAILABLE');
    }
    const normalized = normalizePassportId(passportId);
    this.load(true);
    return this.records.get(normalized) || null;
  }

  public set(record: RegisteredPassportRecord, expectedVersion?: number): void {
    if (this.outageSimulated) throw new PassportStoreError('PASSPORT_STORE_UNAVAILABLE');
    this.withWriteLock(() => {
      this.load(true);
      const validated = parsePassportRecord(record);
      const existing = this.records.get(validated.passportId);

      if (expectedVersion !== undefined) {
        if (expectedVersion === 0 && existing) {
          throw new PassportStoreError('PASSPORT_STORE_UNAVAILABLE', `CAS conflict: passport ${validated.passportId} already exists`);
        }
        if (expectedVersion > 0 && (!existing || (existing.version ?? 1) !== expectedVersion)) {
          throw new PassportStoreError('PASSPORT_STORE_UNAVAILABLE', `CAS conflict: expected version ${expectedVersion}`);
        }
      }

      const nextVersion = existing ? ((existing.version ?? 1) + 1) : (validated.version ?? 1);
      this.records.set(validated.passportId, {
        ...validated,
        version: nextVersion,
        updatedAt: Date.now(),
      });
      this.persist();
    });
  }

  public revoke(passportId: string, reason = 'REVOKED_BY_AUTHORITY', expectedVersion?: number): void {
    if (this.outageSimulated) throw new PassportStoreError('PASSPORT_STORE_UNAVAILABLE');
    const normalized = normalizePassportId(passportId);
    if (typeof reason !== 'string' || !reason.trim()) {
      throw new PassportStoreError('PASSPORT_STORE_INVALID_DATA');
    }
    this.withWriteLock(() => {
      this.load(true);
      const existing = this.records.get(normalized);
      if (!existing) throw new PassportStoreError('PASSPORT_STORE_INVALID_DATA');

      if (expectedVersion !== undefined && (existing.version ?? 1) !== expectedVersion) {
        throw new PassportStoreError('PASSPORT_STORE_UNAVAILABLE', `CAS conflict: expected version ${expectedVersion}`);
      }

      existing.revoked = true;
      existing.revocationReason = reason.trim();
      existing.version = (existing.version ?? 1) + 1;
      existing.updatedAt = Date.now();
      this.persist();
    });
  }

  public isRevoked(passportId: string): boolean {
    if (this.outageSimulated) {
      throw new PassportStoreError('PASSPORT_STORE_UNAVAILABLE');
    }
    const record = this.get(passportId);
    return Boolean(record?.revoked);
  }

  public clear(): void {
    if (this.outageSimulated) throw new PassportStoreError('PASSPORT_STORE_UNAVAILABLE');
    this.withWriteLock(() => {
      this.load(true);
      this.records.clear();
      this.persist();
    });
  }
}

export interface SqlQueryResult<R = any> {
  rows: R[];
  rowCount?: number;
}

export interface SqlQueryClient {
  query<R = any>(sql: string, params?: unknown[]): Promise<SqlQueryResult<R>>;
}

export interface PostgresPassportStoreAdapterOptions {
  client?: SqlQueryClient;
  pool?: any;
  connectionString?: string;
  tableName?: string;
  useAdvisoryLock?: boolean;
  maxRetries?: number;
  retryBaseDelayMs?: number;
  maxRetryDelayMs?: number;
}

/**
 * Production-ready, high-assurance PostgreSQL Passport Store Adapter.
 * Provides atomic writes, advisory locking, optimistic CAS concurrency,
 * resilient exponential-backoff retries, and transactional dead-node recovery.
 */
export class PostgresPassportStoreAdapter implements IPassportStoreAdapter {
  public readonly backend: PassportStorageBackend = 'POSTGRES';
  private readonly client?: SqlQueryClient;
  private pool?: any;
  private readonly connectionString?: string;
  public readonly tableName: string;
  private readonly useAdvisoryLock: boolean;
  private readonly maxRetries: number;
  private readonly retryBaseDelayMs: number;
  private readonly maxRetryDelayMs: number;
  private outageSimulated = false;
  private ready = true;
  private readonly cache = new Map<string, RegisteredPassportRecord>();

  constructor(options: PostgresPassportStoreAdapterOptions = {}) {
    this.client = options.client;
    this.pool = options.pool;
    this.connectionString = options.connectionString || process.env['UGONDU_PASSPORT_PG_CONNECTION_STRING'] || process.env['DATABASE_URL'];
    this.tableName = options.tableName || 'ugondu_passports';
    this.useAdvisoryLock = options.useAdvisoryLock !== false;
    this.maxRetries = options.maxRetries ?? 3;
    this.retryBaseDelayMs = options.retryBaseDelayMs ?? 25;
    this.maxRetryDelayMs = options.maxRetryDelayMs ?? 500;
  }

  public isReady(): boolean {
    return this.ready && !this.outageSimulated;
  }

  public simulateOutage(enabled: boolean): void {
    this.outageSimulated = enabled;
  }

  private isTransientError(err: any): boolean {
    if (!err) return false;
    const code = String(err.code || '');
    const message = String(err.message || '').toLowerCase();
    const transientCodes = new Set([
      '40001', '40P01', '57P01', '57P02', '57P03',
      '08000', '08001', '08003', '08004', '08006',
      'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'EPIPE'
    ]);
    if (transientCodes.has(code)) return true;
    if (message.includes('deadlock detected') ||
        message.includes('serialization failure') ||
        message.includes('connection reset') ||
        message.includes('connection refused') ||
        message.includes('connection closed') ||
        message.includes('timeout') ||
        message.includes('terminated unexpectedly')) {
      return true;
    }
    return false;
  }

  private async getClient(): Promise<SqlQueryClient> {
    if (this.client) return this.client;
    if (this.pool) return this.pool;
    try {
      const pg = require('pg');
      const Pool = pg.Pool || pg.default?.Pool;
      if (Pool) {
        this.pool = new Pool({
          connectionString: this.connectionString,
        });
        return this.pool;
      }
    } catch {
      // Driver not found
    }
    throw new PassportStoreError('PASSPORT_STORE_UNAVAILABLE', 'PostgreSQL client unavailable. Configure an explicit SqlQueryClient or install pg driver.');
  }

  private async executeWithRetry<T>(operation: (client: SqlQueryClient) => Promise<T>): Promise<T> {
    if (this.outageSimulated) {
      throw new PassportStoreError('PASSPORT_STORE_UNAVAILABLE');
    }
    const client = await this.getClient();
    let attempt = 0;
    while (true) {
      try {
        return await operation(client);
      } catch (err: any) {
        attempt++;
        if (err instanceof PassportStoreError) {
          throw err;
        }
        const isTransient = this.isTransientError(err);
        if (isTransient && attempt <= this.maxRetries) {
          const jitter = Math.floor(Math.random() * 20);
          const delay = Math.min(this.maxRetryDelayMs, this.retryBaseDelayMs * Math.pow(2, attempt - 1) + jitter);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw new PassportStoreError('PASSPORT_STORE_UNAVAILABLE', err?.message || 'Database execution failed');
      }
    }
  }

  private async withTransaction<T>(operation: (client: SqlQueryClient) => Promise<T>): Promise<T> {
    return this.executeWithRetry(async (client) => {
      await client.query('BEGIN');
      try {
        const result = await operation(client);
        await client.query('COMMIT');
        return result;
      } catch (err) {
        try {
          await client.query('ROLLBACK');
        } catch {
          // Dead connection rollback failure suppressed
        }
        throw err;
      }
    });
  }

  public async initSchema(): Promise<void> {
    await this.withTransaction(async (client) => {
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${this.tableName} (
          passport_id VARCHAR(255) PRIMARY KEY,
          tenant_id VARCHAR(255) NOT NULL,
          workspace_id VARCHAR(255),
          expires_at BIGINT,
          revoked BOOLEAN NOT NULL DEFAULT FALSE,
          revocation_reason TEXT,
          updated_at BIGINT NOT NULL,
          version INTEGER NOT NULL DEFAULT 1
        );
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${this.tableName}_tenant ON ${this.tableName} (tenant_id);
      `);
    });
  }

  public get(passportId: string): RegisteredPassportRecord | null {
    if (this.outageSimulated) throw new PassportStoreError('PASSPORT_STORE_UNAVAILABLE');
    const normalized = normalizePassportId(passportId);
    return this.cache.get(normalized) || null;
  }

  public isRevoked(passportId: string): boolean {
    if (this.outageSimulated) throw new PassportStoreError('PASSPORT_STORE_UNAVAILABLE');
    const rec = this.get(passportId);
    return Boolean(rec?.revoked);
  }

  public async getAsync(passportId: string): Promise<RegisteredPassportRecord | null> {
    if (this.outageSimulated) throw new PassportStoreError('PASSPORT_STORE_UNAVAILABLE');
    const normalized = normalizePassportId(passportId);
    const result = await this.executeWithRetry(async (client) => {
      return client.query(
        `SELECT passport_id, tenant_id, workspace_id, expires_at, revoked, revocation_reason, updated_at, version
         FROM ${this.tableName}
         WHERE passport_id = $1`,
        [normalized]
      );
    });
    if (!result.rows || result.rows.length === 0) {
      this.cache.delete(normalized);
      return null;
    }
    const row = result.rows[0];
    const record: RegisteredPassportRecord = {
      passportId: row.passport_id,
      tenantId: row.tenant_id,
      workspaceId: row.workspace_id ?? undefined,
      expiresAt: row.expires_at !== null && row.expires_at !== undefined ? Number(row.expires_at) : undefined,
      revoked: Boolean(row.revoked),
      revocationReason: row.revocation_reason ?? undefined,
      updatedAt: row.updated_at !== null && row.updated_at !== undefined ? Number(row.updated_at) : undefined,
      version: row.version !== null && row.version !== undefined ? Number(row.version) : 1,
    };
    const validated = parsePassportRecord(record, normalized);
    this.cache.set(normalized, validated);
    return validated;
  }

  public async isRevokedAsync(passportId: string): Promise<boolean> {
    if (this.outageSimulated) throw new PassportStoreError('PASSPORT_STORE_UNAVAILABLE');
    const record = await this.getAsync(passportId);
    return Boolean(record?.revoked);
  }

  public async setAsync(record: RegisteredPassportRecord, expectedVersion?: number): Promise<void> {
    if (this.outageSimulated) throw new PassportStoreError('PASSPORT_STORE_UNAVAILABLE');
    const validated = parsePassportRecord(record);
    if (expectedVersion !== undefined && (!Number.isInteger(expectedVersion) || expectedVersion < 0)) {
      throw new PassportStoreError('PASSPORT_STORE_INVALID_DATA', 'Invalid expected version for CAS write');
    }

    const now = Date.now();
    const passportId = validated.passportId;
    const tenantId = validated.tenantId;
    const workspaceId = validated.workspaceId ?? null;
    const expiresAt = validated.expiresAt ?? null;
    const revoked = validated.revoked ?? false;
    const revocationReason = validated.revocationReason ?? null;
    const updatedAt = now;

    await this.withTransaction(async (client) => {
      if (this.useAdvisoryLock) {
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1));', [`ugondu_passport_${passportId}`]);
      }

      if (expectedVersion !== undefined) {
        if (expectedVersion === 0) {
          const check = await client.query(
            `SELECT version FROM ${this.tableName} WHERE passport_id = $1`,
            [passportId]
          );
          if (check.rows.length > 0) {
            throw new PassportStoreError('PASSPORT_STORE_UNAVAILABLE', `CAS conflict: passport ${passportId} already exists at version ${check.rows[0].version}`);
          }
          await client.query(
            `INSERT INTO ${this.tableName} (passport_id, tenant_id, workspace_id, expires_at, revoked, revocation_reason, updated_at, version)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 1);`,
            [passportId, tenantId, workspaceId, expiresAt, revoked, revocationReason, updatedAt]
          );
          validated.version = 1;
        } else {
          const res = await client.query(
            `UPDATE ${this.tableName}
             SET tenant_id = $2, workspace_id = $3, expires_at = $4, revoked = $5, revocation_reason = $6, updated_at = $7, version = version + 1
             WHERE passport_id = $1 AND version = $8
             RETURNING version;`,
            [passportId, tenantId, workspaceId, expiresAt, revoked, revocationReason, updatedAt, expectedVersion]
          );
          if (!res.rowCount || res.rows.length === 0) {
            const check = await client.query(
              `SELECT version FROM ${this.tableName} WHERE passport_id = $1`,
              [passportId]
            );
            if (check.rows.length === 0) {
              throw new PassportStoreError('PASSPORT_STORE_INVALID_DATA', `Passport ${passportId} not found for expected version ${expectedVersion}`);
            }
            throw new PassportStoreError('PASSPORT_STORE_UNAVAILABLE', `Optimistic CAS concurrency conflict: passport ${passportId} is at version ${check.rows[0].version}, expected ${expectedVersion}`);
          }
          validated.version = res.rows[0].version;
        }
      } else {
        const res = await client.query(
          `INSERT INTO ${this.tableName} (passport_id, tenant_id, workspace_id, expires_at, revoked, revocation_reason, updated_at, version)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 1)
           ON CONFLICT (passport_id) DO UPDATE SET
             tenant_id = EXCLUDED.tenant_id,
             workspace_id = EXCLUDED.workspace_id,
             expires_at = EXCLUDED.expires_at,
             revoked = EXCLUDED.revoked,
             revocation_reason = EXCLUDED.revocation_reason,
             updated_at = EXCLUDED.updated_at,
             version = ${this.tableName}.version + 1
           RETURNING version;`,
          [passportId, tenantId, workspaceId, expiresAt, revoked, revocationReason, updatedAt]
        );
        validated.version = res.rows[0]?.version ?? 1;
      }
    });

    validated.updatedAt = updatedAt;
    this.cache.set(passportId, validated);
  }

  public set(record: RegisteredPassportRecord, expectedVersion?: number): void | Promise<void> {
    const validated = parsePassportRecord(record);
    this.cache.set(validated.passportId, { ...validated, updatedAt: Date.now() });
    return this.setAsync(record, expectedVersion);
  }

  public async revokeAsync(passportId: string, reason = 'REVOKED_BY_AUTHORITY', expectedVersion?: number): Promise<void> {
    if (this.outageSimulated) throw new PassportStoreError('PASSPORT_STORE_UNAVAILABLE');
    const normalized = normalizePassportId(passportId);
    if (typeof reason !== 'string' || !reason.trim()) {
      throw new PassportStoreError('PASSPORT_STORE_INVALID_DATA');
    }
    const cleanReason = reason.trim();
    const now = Date.now();

    await this.withTransaction(async (client) => {
      if (this.useAdvisoryLock) {
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1));', [`ugondu_passport_${normalized}`]);
      }

      if (expectedVersion !== undefined) {
        const res = await client.query(
          `UPDATE ${this.tableName}
           SET revoked = TRUE, revocation_reason = $2, updated_at = $3, version = version + 1
           WHERE passport_id = $1 AND version = $4
           RETURNING version;`,
          [normalized, cleanReason, now, expectedVersion]
        );
        if (!res.rowCount || res.rows.length === 0) {
          const check = await client.query(`SELECT version FROM ${this.tableName} WHERE passport_id = $1`, [normalized]);
          if (check.rows.length === 0) {
            throw new PassportStoreError('PASSPORT_STORE_INVALID_DATA');
          }
          throw new PassportStoreError('PASSPORT_STORE_UNAVAILABLE', `CAS conflict during revocation: expected version ${expectedVersion}`);
        }
        const existing = this.cache.get(normalized);
        if (existing) {
          existing.revoked = true;
          existing.revocationReason = cleanReason;
          existing.updatedAt = now;
          existing.version = res.rows[0].version;
        }
      } else {
        const res = await client.query(
          `UPDATE ${this.tableName}
           SET revoked = TRUE, revocation_reason = $2, updated_at = $3, version = version + 1
           WHERE passport_id = $1
           RETURNING version;`,
          [normalized, cleanReason, now]
        );
        if (!res.rowCount || res.rows.length === 0) {
          throw new PassportStoreError('PASSPORT_STORE_INVALID_DATA');
        }
        const existing = this.cache.get(normalized);
        if (existing) {
          existing.revoked = true;
          existing.revocationReason = cleanReason;
          existing.updatedAt = now;
          existing.version = res.rows[0].version;
        }
      }
    });
  }

  public revoke(passportId: string, reason = 'REVOKED_BY_AUTHORITY', expectedVersion?: number): void | Promise<void> {
    const normalized = normalizePassportId(passportId);
    if (typeof reason !== 'string' || !reason.trim()) {
      throw new PassportStoreError('PASSPORT_STORE_INVALID_DATA');
    }
    const existing = this.cache.get(normalized);
    if (existing) {
      existing.revoked = true;
      existing.revocationReason = reason.trim();
      existing.updatedAt = Date.now();
    }
    return this.revokeAsync(passportId, reason, expectedVersion);
  }

  public async clearAsync(): Promise<void> {
    if (this.outageSimulated) throw new PassportStoreError('PASSPORT_STORE_UNAVAILABLE');
    await this.withTransaction(async (client) => {
      if (this.useAdvisoryLock) {
        await client.query('SELECT pg_advisory_xact_lock(2147483647);');
      }
      await client.query(`DELETE FROM ${this.tableName};`);
    });
    this.cache.clear();
  }

  public clear(): void | Promise<void> {
    this.cache.clear();
    return this.clearAsync();
  }

  public async close(): Promise<void> {
    if (this.pool && typeof this.pool.end === 'function') {
      await this.pool.end();
    }
  }
}

/** Unified Portable Passport Store facade delegating to configured filesystem or PostgreSQL adapters. */
export class PortablePassportStore implements IPassportStoreAdapter {
  private readonly adapter: IPassportStoreAdapter;

  constructor(dataDirectoryOrAdapterOrConfig?: string | IPassportStoreAdapter | PostgresPassportStoreAdapterOptions) {
    if (typeof dataDirectoryOrAdapterOrConfig === 'string') {
      this.adapter = new LocalFilesystemPassportStoreAdapter(dataDirectoryOrAdapterOrConfig);
    } else if (dataDirectoryOrAdapterOrConfig && typeof (dataDirectoryOrAdapterOrConfig as IPassportStoreAdapter).get === 'function') {
      this.adapter = dataDirectoryOrAdapterOrConfig as IPassportStoreAdapter;
    } else if (dataDirectoryOrAdapterOrConfig && typeof dataDirectoryOrAdapterOrConfig === 'object') {
      this.adapter = new PostgresPassportStoreAdapter(dataDirectoryOrAdapterOrConfig as PostgresPassportStoreAdapterOptions);
    } else {
      const backend = resolvePassportStorageBackend();
      if (backend === 'POSTGRES') {
        this.adapter = new PostgresPassportStoreAdapter();
      } else {
        this.adapter = new LocalFilesystemPassportStoreAdapter();
      }
    }
  }

  public get backend(): PassportStorageBackend {
    return this.adapter.backend;
  }

  public get dataDir(): string | undefined {
    return (this.adapter as any).dataDir;
  }

  public get dbPath(): string | undefined {
    return (this.adapter as any).dbPath;
  }

  public isReady(): boolean {
    return this.adapter.isReady();
  }

  public simulateOutage(enabled: boolean): void {
    if (this.adapter.simulateOutage) {
      this.adapter.simulateOutage(enabled);
    }
  }

  public withWriteLock<T>(operation: () => T): T {
    if ('withWriteLock' in this.adapter && typeof (this.adapter as any).withWriteLock === 'function') {
      return (this.adapter as any).withWriteLock(operation);
    }
    return operation();
  }

  public get(passportId: string): RegisteredPassportRecord | null {
    return this.adapter.get(passportId);
  }

  public set(record: RegisteredPassportRecord, expectedVersion?: number): void | Promise<void> {
    return this.adapter.set(record, expectedVersion);
  }

  public revoke(passportId: string, reason?: string, expectedVersion?: number): void | Promise<void> {
    return this.adapter.revoke(passportId, reason, expectedVersion);
  }

  public isRevoked(passportId: string): boolean {
    return this.adapter.isRevoked(passportId);
  }

  public clear(): void | Promise<void> {
    return this.adapter.clear();
  }

  public async getAsync(passportId: string): Promise<RegisteredPassportRecord | null> {
    if (this.adapter.getAsync) return this.adapter.getAsync(passportId);
    return this.adapter.get(passportId);
  }

  public async setAsync(record: RegisteredPassportRecord, expectedVersion?: number): Promise<void> {
    if (this.adapter.setAsync) return this.adapter.setAsync(record, expectedVersion);
    return this.adapter.set(record, expectedVersion);
  }

  public async revokeAsync(passportId: string, reason?: string, expectedVersion?: number): Promise<void> {
    if (this.adapter.revokeAsync) return this.adapter.revokeAsync(passportId, reason, expectedVersion);
    return this.adapter.revoke(passportId, reason, expectedVersion);
  }

  public async isRevokedAsync(passportId: string): Promise<boolean> {
    if (this.adapter.isRevokedAsync) return this.adapter.isRevokedAsync(passportId);
    return this.adapter.isRevoked(passportId);
  }

  public async clearAsync(): Promise<void> {
    if (this.adapter.clearAsync) return this.adapter.clearAsync();
    return this.adapter.clear();
  }

  public async close(): Promise<void> {
    if (this.adapter.close) await this.adapter.close();
  }
}
