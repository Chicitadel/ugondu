/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Passport Gatekeeper — Shared Distributed Passport Store
 * File           : passport-store.ts
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

import path from 'path';
import fs from 'fs';
import { randomBytes } from 'crypto';
import os from 'os';

export type PassportStorageBackend = 'FILESYSTEM' | 'POSTGRES';

export type CanonicalEditionKey =
  | 'community'
  | 'free'
  | 'professional'
  | 'business'
  | 'enterprise'
  | 'sovereign';

export type OrganizationIdentityClass =
  | 'GOVERNMENT'
  | 'EDUCATION'
  | 'ENTERPRISE'
  | 'COMMERCIAL'
  | 'INDIVIDUAL';

export interface RegisteredPassportRecord {
  passportId: string;
  tenantId: string;
  workspaceId?: string;
  expiresAt?: number;
  revoked?: boolean;
  revocationReason?: string;
  updatedAt?: number;
  version?: number;
  edition?: string;
  organizationClass?: string;
  organizationId?: string;
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
      (row.version !== undefined && (typeof row.version !== 'number' || !Number.isInteger(row.version) || row.version < 0)) ||
      (row.edition !== undefined && (typeof row.edition !== 'string' || !row.edition.trim())) ||
      (row.organizationClass !== undefined && (typeof row.organizationClass !== 'string' || !row.organizationClass.trim())) ||
      (row.organizationId !== undefined && (typeof row.organizationId !== 'string' || !row.organizationId.trim()))) {
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
    edition: row.edition as string | undefined,
    organizationClass: row.organizationClass as string | undefined,
    organizationId: row.organizationId as string | undefined,
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

export class LocalFilesystemPassportStoreAdapter implements IPassportStoreAdapter {
  public readonly backend: PassportStorageBackend = 'FILESYSTEM';
  private readonly dataDir: string;
  private readonly dbPath: string;
  private outageSimulated = false;
  private ready = false;
  private records = new Map<string, RegisteredPassportRecord>();
  private lastLoadedMtime = 0;

  constructor(dataDirectory?: string) {
    this.dataDir = dataDirectory || process.env['UGONDU_PASSPORT_DIR'] || path.join(process.cwd(), '.governance', 'passports');
    this.dbPath = path.join(this.dataDir, 'passports.json');
    this.load(true);
  }

  public isReady(): boolean {
    return this.ready && !this.outageSimulated;
  }

  public simulateOutage(enabled: boolean): void {
    this.outageSimulated = enabled;
  }

  private load(force = false): void {
    if (this.outageSimulated) {
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
      if (!force && stat.mtimeMs <= this.lastLoadedMtime) {
        this.ready = true;
        return;
      }

      const raw = fs.readFileSync(this.dbPath, 'utf8');
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        this.ready = false;
        throw new PassportStoreError('PASSPORT_STORE_UNAVAILABLE');
      }

      const nextMap = new Map<string, RegisteredPassportRecord>();
      for (const [key, val] of Object.entries(parsed)) {
        const validated = parsePassportRecord(val, key);
        nextMap.set(key, validated);
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
    for (let attempt = 0; attempt < 250; attempt++) {
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
    this.load(false);
    const found = this.records.get(normalized);
    return found ? { ...found } : null;
  }

  public set(record: RegisteredPassportRecord, expectedVersion?: number): void {
    const validated = parsePassportRecord(record);
    const normalized = validated.passportId;

    this.withWriteLock(() => {
      this.load(true);
      const existing = this.records.get(normalized);

      if (expectedVersion !== undefined) {
        if (expectedVersion === 0 && existing) {
          throw new PassportStoreError('PASSPORT_STORE_UNAVAILABLE', `CAS conflict: passport ${normalized} already exists`);
        }
        if (expectedVersion > 0 && (!existing || (existing.version ?? 1) !== expectedVersion)) {
          throw new PassportStoreError('PASSPORT_STORE_UNAVAILABLE', `CAS conflict: expected version ${expectedVersion}`);
        }
      }

      const nextVersion = existing ? (existing.version ?? 1) + 1 : (validated.version ?? 1);
      const toStore: RegisteredPassportRecord = {
        ...validated,
        version: nextVersion,
        updatedAt: Date.now(),
      };
      this.records.set(normalized, toStore);
      this.persist();
    });
  }

  public revoke(passportId: string, reason = 'REVOKED_BY_AUTHORITY', expectedVersion?: number): void {
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

export {
  PostgresPassportStoreAdapter,
  SqlQueryResult,
  SqlQueryClient,
  PostgresPassportStoreAdapterOptions,
} from './postgres-passport-store-adapter';

import {
  PostgresPassportStoreAdapter,
  PostgresPassportStoreAdapterOptions,
} from './postgres-passport-store-adapter';

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

  public isReady(): boolean {
    return this.adapter.isReady();
  }

  public simulateOutage(enabled: boolean): void {
    if (this.adapter.simulateOutage) {
      this.adapter.simulateOutage(enabled);
    }
  }

  public get(passportId: string): RegisteredPassportRecord | null {
    return this.adapter.get(passportId);
  }

  public set(record: RegisteredPassportRecord, expectedVersion?: number): void | Promise<void> {
    return this.adapter.set(record, expectedVersion);
  }

  public revoke(passportId: string, reason = 'REVOKED_BY_AUTHORITY', expectedVersion?: number): void | Promise<void> {
    return this.adapter.revoke(passportId, reason, expectedVersion);
  }

  public isRevoked(passportId: string): boolean {
    return this.adapter.isRevoked(passportId);
  }

  public clear(): void | Promise<void> {
    return this.adapter.clear();
  }

  public withWriteLock<T>(operation: () => T): T {
    if ('withWriteLock' in this.adapter && typeof (this.adapter as any).withWriteLock === 'function') {
      return (this.adapter as any).withWriteLock(operation);
    }
    return operation();
  }

  public async withWriteLockAsync<T>(operation: () => Promise<T>): Promise<T> {
    if ('withWriteLockAsync' in this.adapter && typeof (this.adapter as any).withWriteLockAsync === 'function') {
      return (this.adapter as any).withWriteLockAsync(operation);
    }
    if ('withWriteLock' in this.adapter && typeof (this.adapter as any).withWriteLock === 'function') {
      return (this.adapter as any).withWriteLock(operation);
    }
    return operation();
  }

  public async getAsync(passportId: string): Promise<RegisteredPassportRecord | null> {
    if (this.adapter.getAsync) {
      return this.adapter.getAsync(passportId);
    }
    return this.adapter.get(passportId);
  }

  public async setAsync(record: RegisteredPassportRecord, expectedVersion?: number): Promise<void> {
    if (this.adapter.setAsync) {
      return this.adapter.setAsync(record, expectedVersion);
    }
    await Promise.resolve(this.adapter.set(record, expectedVersion));
  }

  public async revokeAsync(passportId: string, reason = 'REVOKED_BY_AUTHORITY', expectedVersion?: number): Promise<void> {
    if (this.adapter.revokeAsync) {
      return this.adapter.revokeAsync(passportId, reason, expectedVersion);
    }
    await Promise.resolve(this.adapter.revoke(passportId, reason, expectedVersion));
  }

  public async isRevokedAsync(passportId: string): Promise<boolean> {
    if (this.adapter.isRevokedAsync) {
      return this.adapter.isRevokedAsync(passportId);
    }
    return this.adapter.isRevoked(passportId);
  }

  public async clearAsync(): Promise<void> {
    if (this.adapter.clearAsync) {
      return this.adapter.clearAsync();
    }
    await Promise.resolve(this.adapter.clear());
  }

  public async close(): Promise<void> {
    if (this.adapter.close) {
      await this.adapter.close();
    }
  }
}
