/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Passport Gatekeeper — PostgreSQL Passport Store Adapter
 * File           : postgres-passport-store-adapter.ts
 * Version        : 2026.3.2-LTS
 * Author         : Ignatus Chika Ujomor
 * Organization   : Air Roofers SASU / Ujomor Systems Engineering & Governance Authority
 * Created Date   : 2026-10-31
 * Last Modified  : 2026-11-05
 * Classification : SOVEREIGN | ENTERPRISE
 *
 * Governance:
 * - Corporate Policy Governed
 * - Corporate Governed
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
 * Signatures:
 * - Architecture Authority : Ignatus Chika Ujomor
 * - Security Authority     : Ujomor Systems Governance
 * - Governance Authority   : Air Roofers Corporate Governance
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

import {
  RegisteredPassportRecord,
  IPassportStoreAdapter,
  PassportStorageBackend,
  PassportStoreError,
  parsePassportRecord,
  normalizePassportId,
} from './passport-store';

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
          version INTEGER NOT NULL DEFAULT 1,
          edition VARCHAR(50),
          organization_class VARCHAR(50),
          organization_id VARCHAR(255)
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
        `SELECT passport_id, tenant_id, workspace_id, expires_at, revoked, revocation_reason, updated_at, version, edition, organization_class, organization_id
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
      edition: row.edition ?? undefined,
      organizationClass: row.organization_class ?? undefined,
      organizationId: row.organization_id ?? undefined,
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
    const edition = validated.edition ?? null;
    const organizationClass = validated.organizationClass ?? null;
    const organizationId = validated.organizationId ?? null;

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
            `INSERT INTO ${this.tableName} (passport_id, tenant_id, workspace_id, expires_at, revoked, revocation_reason, updated_at, version, edition, organization_class, organization_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 1, $8, $9, $10);`,
            [passportId, tenantId, workspaceId, expiresAt, revoked, revocationReason, updatedAt, edition, organizationClass, organizationId]
          );
          validated.version = 1;
        } else {
          const res = await client.query(
            `UPDATE ${this.tableName}
             SET tenant_id = $2, workspace_id = $3, expires_at = $4, revoked = $5, revocation_reason = $6, updated_at = $7, version = version + 1, edition = $9, organization_class = $10, organization_id = $11
             WHERE passport_id = $1 AND version = $8
             RETURNING version;`,
            [passportId, tenantId, workspaceId, expiresAt, revoked, revocationReason, updatedAt, expectedVersion, edition, organizationClass, organizationId]
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
          `INSERT INTO ${this.tableName} (passport_id, tenant_id, workspace_id, expires_at, revoked, revocation_reason, updated_at, version, edition, organization_class, organization_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 1, $8, $9, $10)
           ON CONFLICT (passport_id) DO UPDATE SET
             tenant_id = EXCLUDED.tenant_id,
             workspace_id = EXCLUDED.workspace_id,
             expires_at = EXCLUDED.expires_at,
             revoked = EXCLUDED.revoked,
             revocation_reason = EXCLUDED.revocation_reason,
             updated_at = EXCLUDED.updated_at,
             version = ${this.tableName}.version + 1,
             edition = EXCLUDED.edition,
             organization_class = EXCLUDED.organization_class,
             organization_id = EXCLUDED.organization_id
           RETURNING version;`,
          [passportId, tenantId, workspaceId, expiresAt, revoked, revocationReason, updatedAt, edition, organizationClass, organizationId]
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
