/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Passport Gatekeeper — Shared Distributed Passport Store
 * File           : passport-store.ts
 * Version        : 2.2.0
 * Author         : Ignatus Chika Ujomor
 * Organization   : Air Roofers SASU / Ujomor Systems Engineering & Governance Authority
 * Created Date   : 2026-10-31
 * Last Modified  : 2026-10-31
 * Classification : SOVEREIGN | ENTERPRISE
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
 * - OWASP ASVS v4
 * - NIST 800-53
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

import path from 'path';
import fs from 'fs';
import { randomBytes } from 'crypto';

export interface RegisteredPassportRecord {
  passportId: string;
  tenantId: string;
  workspaceId?: string;
  expiresAt?: number;
  revoked?: boolean;
  revocationReason?: string;
  updatedAt?: number;
}

export class PassportStoreError extends Error {
  public readonly code: 'PASSPORT_STORE_UNAVAILABLE' | 'PASSPORT_STORE_INVALID_DATA';

  constructor(code: PassportStoreError['code'], message?: string) {
    super(message || (code === 'PASSPORT_STORE_INVALID_DATA' ? 'Invalid passport store data' : 'Passport store unavailable'));
    this.name = 'PassportStoreError';
    this.code = code;
  }
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

export class PortablePassportStore {
  private records: Map<string, RegisteredPassportRecord> = new Map();
  private ready = false;
  private lastLoadedMtime = 0;
  private outageSimulated = false;
  private readonly dataDir: string;
  private readonly dbPath: string;

  constructor(dataDirectory?: string) {
    try {
      this.dataDir = resolvePassportStoreDirectory(dataDirectory ?? process.env['UGONDU_PASSPORT_DATA_DIR']);
      this.dbPath = path.join(this.dataDir, 'passports.json');
      this.load();
    } catch {
      this.dataDir = dataDirectory ? path.resolve(dataDirectory) : path.resolve(process.cwd(), 'var', 'data');
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

      // Check if fresh
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
        if (!val || typeof val !== 'object' || Array.isArray(val)) continue;
        const row = val as Record<string, unknown>;
        if (typeof row.passportId !== 'string' || typeof row.tenantId !== 'string') continue;
        nextMap.set(key, {
          passportId: row.passportId,
          tenantId: row.tenantId,
          workspaceId: typeof row.workspaceId === 'string' ? row.workspaceId : undefined,
          expiresAt: typeof row.expiresAt === 'number' ? row.expiresAt : undefined,
          revoked: Boolean(row.revoked),
          revocationReason: typeof row.revocationReason === 'string' ? row.revocationReason : undefined,
          updatedAt: typeof row.updatedAt === 'number' ? row.updatedAt : undefined,
        });
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

  /** Atomic replace; retries transient sharing violations (e.g. Windows readers). */
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

  /**
   * Serializes read-modify-write cycles across processes sharing the same data
   * directory. Uses atomic mkdir as the mutual-exclusion primitive, a bounded
   * wait, and stale-lock recovery. Fails closed when the lock cannot be taken.
   * Coordinates only processes that share one filesystem; multi-host topologies
   * require a shared durable adapter.
   */
  private withWriteLock<T>(operation: () => T): T {
    const lockPath = path.join(this.dataDir, '.passports.write-lock');
    const maxWaitMs = Number(process.env['UGONDU_PASSPORT_LOCK_WAIT_MS'] ?? 2000);
    const staleAfterMs = Number(process.env['UGONDU_PASSPORT_LOCK_STALE_MS'] ?? 30000);
    const deadline = Date.now() + maxWaitMs;
    const sleeper = new Int32Array(new SharedArrayBuffer(4));
    let acquired = false;

    while (!acquired) {
      try {
        fs.mkdirSync(this.dataDir, { recursive: true, mode: 0o700 });
        fs.mkdirSync(lockPath, { mode: 0o700 });
        acquired = true;
      } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        const transient = code === 'EEXIST' || code === 'EPERM' || code === 'EACCES' || code === 'EBUSY';
        if (!transient) {
          throw new PassportStoreError('PASSPORT_STORE_UNAVAILABLE');
        }
        try {
          if (code === 'EEXIST' && Date.now() - fs.statSync(lockPath).mtimeMs > staleAfterMs) {
            fs.rmdirSync(lockPath);
            continue;
          }
        } catch { /* lock released or raced; retry */ }
        if (Date.now() >= deadline) throw new PassportStoreError('PASSPORT_STORE_UNAVAILABLE');
        Atomics.wait(sleeper, 0, 0, 10);
      }
    }

    try {
      return operation();
    } finally {
      try { fs.rmdirSync(lockPath); } catch { /* noop */ }
    }
  }

  public get(passportId: string): RegisteredPassportRecord | null {
    if (this.outageSimulated) {
      throw new PassportStoreError('PASSPORT_STORE_UNAVAILABLE');
    }
    this.load();
    const normalized = passportId.trim();
    return this.records.get(normalized) || null;
  }

  public set(record: RegisteredPassportRecord): void {
    if (this.outageSimulated) throw new PassportStoreError('PASSPORT_STORE_UNAVAILABLE');
    this.withWriteLock(() => {
      this.load(true);
      const normalized = record.passportId.trim();
      if (!normalized || !record.tenantId.trim()) throw new PassportStoreError('PASSPORT_STORE_INVALID_DATA');
      this.records.set(normalized, { ...record, passportId: normalized, updatedAt: Date.now() });
      this.persist();
    });
  }

  public revoke(passportId: string, reason = 'REVOKED_BY_AUTHORITY'): void {
    if (this.outageSimulated) throw new PassportStoreError('PASSPORT_STORE_UNAVAILABLE');
    this.withWriteLock(() => {
      this.load(true);
      const normalized = passportId.trim();
      if (!normalized) throw new PassportStoreError('PASSPORT_STORE_INVALID_DATA');
      const existing = this.records.get(normalized);
      if (!existing) throw new PassportStoreError('PASSPORT_STORE_INVALID_DATA');
      existing.revoked = true;
      existing.revocationReason = reason;
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
    this.records.clear();
    try {
      if (fs.existsSync(this.dbPath)) {
        fs.unlinkSync(this.dbPath);
      }
      this.lastLoadedMtime = 0;
      this.ready = true;
    } catch {
      this.ready = false;
    }
  }
}
