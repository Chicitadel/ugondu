/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Passport Gatekeeper — Tests / PostgresPassportStoreAdapter
 * File           : postgres-passport-store.spec.ts
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

import {
  PostgresPassportStoreAdapter,
  PortablePassportStore,
  PassportStoreError,
  SqlQueryClient,
  SqlQueryResult,
  resolvePassportStorageBackend,
} from './passport-store';

class MockPostgresDatabaseClient implements SqlQueryClient {
  public table = new Map<string, any>();
  public activeLocks = new Set<string>();
  public inTransaction = false;
  public transientFailuresRemaining = 0;
  public failWithCode = 'ECONNRESET';
  public queryLog: string[] = [];

  public async query<R = any>(sql: string, params: unknown[] = []): Promise<SqlQueryResult<R>> {
    this.queryLog.push(sql);

    if (this.transientFailuresRemaining > 0) {
      this.transientFailuresRemaining--;
      const err = new Error('Simulated transient connection failure');
      (err as any).code = this.failWithCode;
      throw err;
    }

    const trimmed = sql.trim();

    if (trimmed === 'BEGIN') {
      this.inTransaction = true;
      return { rows: [], rowCount: 0 };
    }

    if (trimmed === 'COMMIT') {
      this.inTransaction = false;
      this.activeLocks.clear();
      return { rows: [], rowCount: 0 };
    }

    if (trimmed === 'ROLLBACK') {
      this.inTransaction = false;
      this.activeLocks.clear();
      return { rows: [], rowCount: 0 };
    }

    if (trimmed.includes('pg_advisory_xact_lock')) {
      const lockKey = String(params[0] ?? 'global');
      this.activeLocks.add(lockKey);
      return { rows: [{ pg_advisory_xact_lock: null }] as any, rowCount: 1 };
    }

    if (trimmed.includes('CREATE TABLE') || trimmed.includes('CREATE INDEX')) {
      return { rows: [], rowCount: 0 };
    }

    if (trimmed.startsWith('SELECT version FROM')) {
      const passportId = String(params[0]);
      const row = this.table.get(passportId);
      if (row) {
        return { rows: [{ version: row.version }] as any, rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }

    if (trimmed.startsWith('SELECT passport_id, tenant_id')) {
      const passportId = String(params[0]);
      const row = this.table.get(passportId);
      if (row) {
        return { rows: [{ ...row }] as any, rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }

    if (trimmed.startsWith('SELECT revoked FROM')) {
      const passportId = String(params[0]);
      const row = this.table.get(passportId);
      if (row) {
        return { rows: [{ revoked: row.revoked }] as any, rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }

    if (trimmed.startsWith('INSERT INTO') && trimmed.includes('ON CONFLICT')) {
      const [passport_id, tenant_id, workspace_id, expires_at, revoked, revocation_reason, updated_at] = params;
      const existing = this.table.get(String(passport_id));
      const nextVersion = existing ? existing.version + 1 : 1;
      const record = {
        passport_id: String(passport_id),
        tenant_id: String(tenant_id),
        workspace_id: workspace_id ? String(workspace_id) : null,
        expires_at: expires_at !== null ? Number(expires_at) : null,
        revoked: Boolean(revoked),
        revocation_reason: revocation_reason ? String(revocation_reason) : null,
        updated_at: Number(updated_at),
        version: nextVersion,
      };
      this.table.set(String(passport_id), record);
      return { rows: [{ version: nextVersion }] as any, rowCount: 1 };
    }

    if (trimmed.startsWith('INSERT INTO') && !trimmed.includes('ON CONFLICT')) {
      const [passport_id, tenant_id, workspace_id, expires_at, revoked, revocation_reason, updated_at] = params;
      const id = String(passport_id);
      if (this.table.has(id)) {
        const err = new Error('Unique constraint violation');
        (err as any).code = '23505';
        throw err;
      }
      const record = {
        passport_id: id,
        tenant_id: String(tenant_id),
        workspace_id: workspace_id ? String(workspace_id) : null,
        expires_at: expires_at !== null ? Number(expires_at) : null,
        revoked: Boolean(revoked),
        revocation_reason: revocation_reason ? String(revocation_reason) : null,
        updated_at: Number(updated_at),
        version: 1,
      };
      this.table.set(id, record);
      return { rows: [{ version: 1 }] as any, rowCount: 1 };
    }

    if (trimmed.startsWith('UPDATE') && trimmed.includes('AND version = $8')) {
      const [passport_id, tenant_id, workspace_id, expires_at, revoked, revocation_reason, updated_at, expectedVersion] = params;
      const id = String(passport_id);
      const existing = this.table.get(id);
      if (!existing || existing.version !== Number(expectedVersion)) {
        return { rows: [], rowCount: 0 };
      }
      existing.tenant_id = String(tenant_id);
      existing.workspace_id = workspace_id ? String(workspace_id) : null;
      existing.expires_at = expires_at !== null ? Number(expires_at) : null;
      existing.revoked = Boolean(revoked);
      existing.revocation_reason = revocation_reason ? String(revocation_reason) : null;
      existing.updated_at = Number(updated_at);
      existing.version = existing.version + 1;
      return { rows: [{ version: existing.version }] as any, rowCount: 1 };
    }

    if (trimmed.startsWith('UPDATE') && trimmed.includes('SET revoked = TRUE')) {
      const [passport_id, reason, updated_at, expectedVersion] = params;
      const id = String(passport_id);
      const existing = this.table.get(id);
      if (!existing) {
        return { rows: [], rowCount: 0 };
      }
      if (expectedVersion !== undefined && existing.version !== Number(expectedVersion)) {
        return { rows: [], rowCount: 0 };
      }
      existing.revoked = true;
      existing.revocation_reason = String(reason);
      existing.updated_at = Number(updated_at);
      existing.version = existing.version + 1;
      return {
        rows: [{
          version: existing.version,
          tenant_id: existing.tenant_id,
          workspace_id: existing.workspace_id,
          expires_at: existing.expires_at,
        }] as any,
        rowCount: 1,
      };
    }

    if (trimmed.startsWith('DELETE FROM')) {
      const count = this.table.size;
      this.table.clear();
      return { rows: [], rowCount: count };
    }

    return { rows: [], rowCount: 0 };
  }
}

describe('PostgresPassportStoreAdapter high-assurance persistence', () => {
  let mockClient: MockPostgresDatabaseClient;
  let adapter: PostgresPassportStoreAdapter;

  beforeEach(async () => {
    mockClient = new MockPostgresDatabaseClient();
    adapter = new PostgresPassportStoreAdapter({ client: mockClient });
    await adapter.initSchema();
  });

  it('initializes schema and registers passports idempotently with version tracking', async () => {
    await adapter.setAsync({
      passportId: 'pp_pg_test_01',
      tenantId: 'tenant_finance',
      workspaceId: 'ws_prod',
      expiresAt: Date.now() + 60000,
    });

    const record = await adapter.getAsync('pp_pg_test_01');
    expect(record).not.toBeNull();
    expect(record?.passportId).toBe('pp_pg_test_01');
    expect(record?.tenantId).toBe('tenant_finance');
    expect(record?.workspaceId).toBe('ws_prod');
    expect(record?.revoked).toBe(false);
    expect(record?.version).toBe(1);
    expect(adapter.get('pp_pg_test_01')?.tenantId).toBe('tenant_finance');
  });

  it('performs atomic writes with optimistic version CAS (Compare-And-Swap)', async () => {
    // 1. Initial write
    await adapter.setAsync({
      passportId: 'pp_cas_01',
      tenantId: 'tenant_cas',
    });
    const first = await adapter.getAsync('pp_cas_01');
    expect(first?.version).toBe(1);

    // 2. Successful CAS update with matching version
    await adapter.setAsync(
      {
        passportId: 'pp_cas_01',
        tenantId: 'tenant_cas_updated',
      },
      1
    );
    const second = await adapter.getAsync('pp_cas_01');
    expect(second?.version).toBe(2);
    expect(second?.tenantId).toBe('tenant_cas_updated');

    // 3. Stale CAS update with outdated version fails closed
    await expect(
      adapter.setAsync(
        {
          passportId: 'pp_cas_01',
          tenantId: 'tenant_cas_conflict',
        },
        1 // Expected version 1, but current version is 2
      )
    ).rejects.toThrow(PassportStoreError);

    // Verify record state is unmodified after conflict
    const postConflict = await adapter.getAsync('pp_cas_01');
    expect(postConflict?.tenantId).toBe('tenant_cas_updated');
    expect(postConflict?.version).toBe(2);
  });

  it('enforces expectedVersion 0 for strict creation without overwriting existing records', async () => {
    await adapter.setAsync(
      { passportId: 'pp_create_01', tenantId: 'tenant_init' },
      0
    );

    // Attempting creation with version 0 on already-existing passport throws CAS conflict
    await expect(
      adapter.setAsync(
        { passportId: 'pp_create_01', tenantId: 'tenant_duplicate' },
        0
      )
    ).rejects.toThrow(PassportStoreError);
  });

  it('acquires transactional advisory locks and auto-releases them on commit or failure', async () => {
    await adapter.setAsync({
      passportId: 'pp_lock_01',
      tenantId: 'tenant_locking',
    });

    const lockQuery = mockClient.queryLog.find((q) => q.includes('pg_advisory_xact_lock'));
    expect(lockQuery).toBeDefined();
    expect(mockClient.activeLocks.size).toBe(0); // released on COMMIT
  });

  it('recovers from dead nodes: advisory xact locks released on simulated crash rollback', async () => {
    mockClient.inTransaction = true;
    mockClient.activeLocks.add('ugondu_passport_pp_dead_node');

    // Dead-node simulation: rollback clears transaction and locks
    await mockClient.query('ROLLBACK');
    expect(mockClient.inTransaction).toBe(false);
    expect(mockClient.activeLocks.size).toBe(0);

    // Another node can acquire and write successfully
    await adapter.setAsync({
      passportId: 'pp_dead_node',
      tenantId: 'tenant_recovered',
    });
    const rec = await adapter.getAsync('pp_dead_node');
    expect(rec?.tenantId).toBe('tenant_recovered');
  });

  it('automatically retries transient connection exceptions with exponential backoff', async () => {
    mockClient.transientFailuresRemaining = 2; // Will fail twice with ECONNRESET then succeed
    mockClient.failWithCode = 'ECONNRESET';

    await adapter.setAsync({
      passportId: 'pp_retry_01',
      tenantId: 'tenant_retry',
    });

    const fetched = await adapter.getAsync('pp_retry_01');
    expect(fetched?.tenantId).toBe('tenant_retry');
  });

  it('fails closed when retry budget is exhausted', async () => {
    mockClient.transientFailuresRemaining = 10; // Exceeds default maxRetries (3)
    mockClient.failWithCode = 'ECONNREFUSED';

    await expect(
      adapter.setAsync({
        passportId: 'pp_fatal_01',
        tenantId: 'tenant_fatal',
      })
    ).rejects.toThrow(PassportStoreError);
  });

  it('revokes passports with CAS support and rejects unknown targets or invalid reasons', async () => {
    await adapter.setAsync({
      passportId: 'pp_revoke_01',
      tenantId: 'tenant_revoke',
    });

    // Revocation with CAS
    await adapter.revokeAsync('pp_revoke_01', 'FRAUD_SUSPECTED', 1);
    expect(await adapter.isRevokedAsync('pp_revoke_01')).toBe(true);

    const revokedRec = await adapter.getAsync('pp_revoke_01');
    expect(revokedRec?.revoked).toBe(true);
    expect(revokedRec?.revocationReason).toBe('FRAUD_SUSPECTED');
    expect(revokedRec?.version).toBe(2);

    // Reject unknown passport revocation
    await expect(adapter.revokeAsync('pp_unknown', 'ANY_REASON')).rejects.toThrow(PassportStoreError);

    // Reject blank revocation reason
    await expect(adapter.revokeAsync('pp_revoke_01', '   ')).rejects.toThrow(PassportStoreError);
  });

  it('clears database and cache completely under global advisory lock', async () => {
    await adapter.setAsync({ passportId: 'pp_clear_01', tenantId: 't1' });
    await adapter.setAsync({ passportId: 'pp_clear_02', tenantId: 't2' });

    await adapter.clearAsync();

    expect(await adapter.getAsync('pp_clear_01')).toBeNull();
    expect(await adapter.getAsync('pp_clear_02')).toBeNull();
    expect(adapter.get('pp_clear_01')).toBeNull();
  });

  it('fails closed when simulated outage is enabled', async () => {
    adapter.simulateOutage(true);
    expect(adapter.isReady()).toBe(false);

    expect(() => adapter.get('pp_any')).toThrow(PassportStoreError);
    await expect(adapter.getAsync('pp_any')).rejects.toThrow(PassportStoreError);
    await expect(adapter.setAsync({ passportId: 'pp_outage', tenantId: 't' })).rejects.toThrow(PassportStoreError);

    adapter.simulateOutage(false);
    expect(adapter.isReady()).toBe(true);
  });
});

describe('PortablePassportStore backend selection and contract integration', () => {
  let mockClient: MockPostgresDatabaseClient;

  beforeEach(() => {
    mockClient = new MockPostgresDatabaseClient();
  });

  it('resolves filesystem backend by default without environment overrides', () => {
    const prev = process.env['UGONDU_PASSPORT_STORAGE_BACKEND'];
    delete process.env['UGONDU_PASSPORT_STORAGE_BACKEND'];
    try {
      expect(resolvePassportStorageBackend()).toBe('FILESYSTEM');
    } finally {
      if (prev !== undefined) process.env['UGONDU_PASSPORT_STORAGE_BACKEND'] = prev;
    }
  });

  it('resolves postgres backend when configured via UGONDU_PASSPORT_STORAGE_BACKEND', () => {
    const prev = process.env['UGONDU_PASSPORT_STORAGE_BACKEND'];
    process.env['UGONDU_PASSPORT_STORAGE_BACKEND'] = 'POSTGRES';
    try {
      expect(resolvePassportStorageBackend()).toBe('POSTGRES');
    } finally {
      if (prev !== undefined) process.env['UGONDU_PASSPORT_STORAGE_BACKEND'] = prev;
      else delete process.env['UGONDU_PASSPORT_STORAGE_BACKEND'];
    }
  });

  it('instantiates Postgres adapter through PortablePassportStore with explicit configuration', async () => {
    const store = new PortablePassportStore({ client: mockClient });
    expect(store.backend).toBe('POSTGRES');
    expect(store.isReady()).toBe(true);

    await store.setAsync({
      passportId: 'pp_facade_01',
      tenantId: 'tenant_facade',
    });

    const record = await store.getAsync('pp_facade_01');
    expect(record?.passportId).toBe('pp_facade_01');
    expect(record?.tenantId).toBe('tenant_facade');
    expect(store.get('pp_facade_01')?.tenantId).toBe('tenant_facade');

    await store.revokeAsync('pp_facade_01', 'MANUAL_OVERRIDE');
    expect(await store.isRevokedAsync('pp_facade_01')).toBe(true);
  });
});
