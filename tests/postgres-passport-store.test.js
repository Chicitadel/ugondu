/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Tests / Integration — Postgres Passport Store Adapter
 * File           : postgres-passport-store.test.js
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
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001 / SOC 2 Type II / OWASP ASVS / NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

'use strict';

const assert = require('assert');
const { test, describe } = require('node:test');

const engineStorage = require('../server/engine-core/dist/passport/storage/passport-store.js');
const {
  PostgresPassportStoreAdapter,
  PortablePassportStore,
  PassportStoreError,
  resolvePassportStorageBackend,
} = engineStorage;

class MockPostgresClient {
  constructor() {
    this.table = new Map();
    this.activeLocks = new Set();
    this.inTransaction = false;
    this.transientFailuresRemaining = 0;
    this.failWithCode = 'ECONNRESET';
  }

  async query(sql, params = []) {
    if (this.transientFailuresRemaining > 0) {
      this.transientFailuresRemaining--;
      const err = new Error('Simulated transient connection failure');
      err.code = this.failWithCode;
      throw err;
    }

    const trimmed = sql.trim();

    if (trimmed === 'BEGIN') {
      this.inTransaction = true;
      return { rows: [], rowCount: 0 };
    }
    if (trimmed === 'COMMIT' || trimmed === 'ROLLBACK') {
      this.inTransaction = false;
      this.activeLocks.clear();
      return { rows: [], rowCount: 0 };
    }

    if (trimmed.includes('pg_advisory_xact_lock')) {
      const lockKey = String(params[0] ?? 'global');
      this.activeLocks.add(lockKey);
      return { rows: [{ pg_advisory_xact_lock: null }], rowCount: 1 };
    }

    if (trimmed.includes('CREATE TABLE') || trimmed.includes('CREATE INDEX')) {
      return { rows: [], rowCount: 0 };
    }

    if (trimmed.startsWith('SELECT version FROM')) {
      const id = String(params[0]);
      const row = this.table.get(id);
      if (row) return { rows: [{ version: row.version }], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    }

    if (trimmed.startsWith('SELECT passport_id, tenant_id')) {
      const id = String(params[0]);
      const row = this.table.get(id);
      if (row) return { rows: [{ ...row }], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    }

    if (trimmed.startsWith('SELECT revoked FROM')) {
      const id = String(params[0]);
      const row = this.table.get(id);
      if (row) return { rows: [{ revoked: row.revoked }], rowCount: 1 };
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
      return { rows: [{ version: nextVersion }], rowCount: 1 };
    }

    if (trimmed.startsWith('INSERT INTO') && !trimmed.includes('ON CONFLICT')) {
      const [passport_id, tenant_id, workspace_id, expires_at, revoked, revocation_reason, updated_at] = params;
      const id = String(passport_id);
      if (this.table.has(id)) {
        const err = new Error('Unique constraint violation');
        err.code = '23505';
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
      return { rows: [{ version: 1 }], rowCount: 1 };
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
      return { rows: [{ version: existing.version }], rowCount: 1 };
    }

    if (trimmed.startsWith('UPDATE') && trimmed.includes('SET revoked = TRUE')) {
      const [passport_id, reason, updated_at, expectedVersion] = params;
      const id = String(passport_id);
      const existing = this.table.get(id);
      if (!existing) return { rows: [], rowCount: 0 };
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
        }],
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

test('ENG-PASS-011: PostgresPassportStoreAdapter optimistic CAS concurrency and version guarantees', async () => {
  const client = new MockPostgresClient();
  const adapter = new PostgresPassportStoreAdapter({ client });
  await adapter.initSchema();

  const passportId = `pp_integration_${Date.now()}`;
  await adapter.setAsync({
    passportId,
    tenantId: 'tenant_distributed_cluster',
    expiresAt: Date.now() + 60000,
  });

  const record = await adapter.getAsync(passportId);
  assert.ok(record, 'Passport must be stored in database');
  assert.strictEqual(record.version, 1);
  assert.strictEqual(record.tenantId, 'tenant_distributed_cluster');

  // CAS Update matching version 1 succeeds
  await adapter.setAsync(
    { passportId, tenantId: 'tenant_distributed_cluster_v2' },
    1
  );
  const updated = await adapter.getAsync(passportId);
  assert.strictEqual(updated.version, 2);
  assert.strictEqual(updated.tenantId, 'tenant_distributed_cluster_v2');

  // CAS Update with outdated version 1 throws
  await assert.rejects(
    async () => {
      await adapter.setAsync(
        { passportId, tenantId: 'tenant_stale' },
        1
      );
    },
    (err) => err instanceof PassportStoreError && err.code === 'PASSPORT_STORE_UNAVAILABLE'
  );
});

test('ENG-PASS-012: PostgresPassportStoreAdapter connection retry and advisory locking', async () => {
  const client = new MockPostgresClient();
  client.transientFailuresRemaining = 2; // Fails twice then succeeds
  client.failWithCode = 'ECONNRESET';

  const adapter = new PostgresPassportStoreAdapter({ client, retryBaseDelayMs: 5 });
  const passportId = `pp_retry_test_${Date.now()}`;

  await adapter.setAsync({
    passportId,
    tenantId: 'tenant_retry_success',
  });

  const record = await adapter.getAsync(passportId);
  assert.ok(record);
  assert.strictEqual(record.tenantId, 'tenant_retry_success');
  assert.strictEqual(client.activeLocks.size, 0, 'Advisory lock must be released on COMMIT');
});

test('ENG-PASS-013: PortablePassportStore backend selection via UGONDU_PASSPORT_STORAGE_BACKEND', async () => {
  const prev = process.env['UGONDU_PASSPORT_STORAGE_BACKEND'];
  try {
    process.env['UGONDU_PASSPORT_STORAGE_BACKEND'] = 'POSTGRES';
    assert.strictEqual(resolvePassportStorageBackend(), 'POSTGRES');

    const client = new MockPostgresClient();
    const store = new PortablePassportStore({ client });
    assert.strictEqual(store.backend, 'POSTGRES');
    assert.strictEqual(store.isReady(), true);

    await store.setAsync({ passportId: 'pp_backend_test', tenantId: 'tenant_pg' });
    const fetched = await store.getAsync('pp_backend_test');
    assert.strictEqual(fetched.tenantId, 'tenant_pg');

    await store.revokeAsync('pp_backend_test', 'SECURITY_POLICY_UPDATE');
    assert.strictEqual(await store.isRevokedAsync('pp_backend_test'), true);
  } finally {
    if (prev !== undefined) process.env['UGONDU_PASSPORT_STORAGE_BACKEND'] = prev;
    else delete process.env['UGONDU_PASSPORT_STORAGE_BACKEND'];
  }
});
