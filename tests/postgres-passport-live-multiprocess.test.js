/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Engine Core — Live Multi-Process PostgreSQL Qualification
 * File           : postgres-passport-live-multiprocess.test.js
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU / Ujomor Engineering
 * Created Date   : 2026-11-14
 * Last Modified  : 2026-11-14
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Corporate Policy Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001 / SOC 2 / OWASP ASVS 5.0 / NIST SP 800-53
 *
 * Signatures:
 * - Architecture Authority : Ujomor Systems Engineering
 * - Security Authority     : Ujomor Systems Governance
 * - Governance Authority   : Air Roofers Corporate Governance
 * - Deployment Authority   : Air Roofers Release Engineering
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

'use strict';

const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { generateKeyPairSync } = require('node:crypto');
const path = require('node:path');

const ENGINE_DIST = path.resolve(__dirname, '../server/engine-core/dist/index.js');
const STORE_DIST = path.resolve(__dirname, '../server/engine-core/dist/passport/storage/passport-store.js');

async function executeWorker(action, args) {
  const engine = require(ENGINE_DIST);
  const storeMod = require(STORE_DIST);
  const { passportStore, registerAdmissionPassportAsync, revokeAdmissionPassportAsync, issueSignedPassportAsync, admitPassportAsync, keyState } = engine;
  try {
    switch (action) {
      case 'issue-and-register': {
        await registerAdmissionPassportAsync(args.opaqueId, { tenantId: args.tenantId, workspaceId: args.workspaceId });
        const signedToken = await issueSignedPassportAsync({ passportId: args.signedJti, tenantId: args.tenantId, workspaceId: args.workspaceId, ttlMs: 120_000 });
        return { pid: process.pid, keyId: keyState.keyId, opaqueId: args.opaqueId, signedToken };
      }
      case 'admit-and-get': {
        const results = {};
        for (const id of args.ids) {
          results[id] = {
            record: await passportStore.getAsync(id),
            revoked: await passportStore.isRevokedAsync(id),
            admission: await admitPassportAsync(id, args.tenantId ? { tenantId: args.tenantId } : undefined),
          };
        }
        return { pid: process.pid, keyId: keyState.keyId, results };
      }
      case 'cas-race': {
        await passportStore.setAsync(
          { passportId: args.passportId, tenantId: args.tenantId, workspaceId: args.workspaceId, revoked: false },
          args.expectedVersion
        );
        return { pid: process.pid, workspaceId: args.workspaceId };
      }
      case 'cas-loop': {
        let updates = 0;
        for (let i = 0; i < args.iterations; i++) {
          let committed = false;
          for (let attempt = 0; attempt < 30 && !committed; attempt++) {
            const current = await passportStore.getAsync(args.passportId);
            assert.ok(current && typeof current.version === 'number');
            try {
              await passportStore.setAsync(
                { ...current, workspaceId: `ws_${args.workerId}_${i}` },
                current.version
              );
              committed = true;
              updates++;
            } catch (err) {
              if (err?.code !== 'PASSPORT_STORE_UNAVAILABLE') throw err;
              await new Promise((r) => setTimeout(r, 10 + (attempt * 5)));
            }
          }
          assert.equal(committed, true, `Worker ${args.workerId} failed CAS iteration ${i}`);
        }
        return { pid: process.pid, updates };
      }
      case 'revoke': {
        await revokeAdmissionPassportAsync(args.passportId, args.reason);
        return { pid: process.pid, revoked: true };
      }
      case 'tenant-and-rollback': {
        const wrongTenantAdmit = await admitPassportAsync(args.opaqueId, { tenantId: args.wrongTenant });
        const wrongSignedAdmit = await admitPassportAsync(args.signedToken, { tenantId: args.wrongTenant });
        let tenantGuardErr = null;
        try {
          await passportStore.setAsync(
            { passportId: args.opaqueId, tenantId: args.wrongTenant, workspaceId: 'ws_cross', revoked: false },
            undefined,
            { expectedTenantId: args.wrongTenant }
          );
        } catch (err) {
          tenantGuardErr = { code: err?.code, message: err?.message };
        }
        let rollbackErr = null;
        try {
          await passportStore.setAsync(
            { passportId: args.opaqueId, tenantId: args.ownerTenant, workspaceId: 'ws_dirty_uncommitted', revoked: true },
            undefined,
            { simulateFailureAfterWrite: true }
          );
        } catch (err) {
          rollbackErr = err?.message;
        }
        const after = await passportStore.getAsync(args.opaqueId);
        const rightTenantAdmit = await admitPassportAsync(args.opaqueId, { tenantId: args.ownerTenant });
        return { pid: process.pid, wrongTenantAdmit, wrongSignedAdmit, tenantGuardErr, rollbackErr, after, rightTenantAdmit };
      }
      case 'outage-fail-closed': {
        const brokenAdapter = new storeMod.PostgresPassportStoreAdapter({
          connectionString: args.brokenUrl,
          tableName: args.tableName,
          maxRetries: 1,
          retryBaseDelayMs: 10,
          maxRetryDelayMs: 20,
        });
        let writeErr = null;
        try {
          await brokenAdapter.setAsync({ passportId: 'pp_outage_write', tenantId: 'tenant_alpha', revoked: false });
        } catch (err) {
          writeErr = { code: err?.code, message: err?.message };
        } finally {
          await brokenAdapter.close().catch(() => {});
        }
        const admitOnBrokenStore = await admitPassportAsync('pp_outage_read', { tenantId: 'tenant_alpha' });
        return { pid: process.pid, writeErr, admitOnBrokenStore };
      }
      default:
        throw new Error(`UNKNOWN_WORKER_ACTION:${action}`);
    }
  } finally {
    await passportStore.close().catch(() => {});
  }
}

if (process.argv[2] === '--worker') {
  const action = process.argv[3];
  const args = JSON.parse(Buffer.from(process.argv[4] || 'e30=', 'base64url').toString('utf8'));
  executeWorker(action, args)
    .then((res) => {
      process.stdout.write(`__PG_WORKER_RESULT__:${JSON.stringify({ ok: true, res })}\n`);
      process.exit(0);
    })
    .catch((err) => {
      process.stdout.write(`__PG_WORKER_RESULT__:${JSON.stringify({
        ok: false,
        name: err?.name || 'Error',
        code: err?.code || null,
        message: err?.message || String(err),
      })}\n`);
      process.exit(1);
    });
} else {
  runTestSuite();
}

function spawnWorker(action, args, extraEnv) {
  return new Promise((resolve, reject) => {
    const encoded = Buffer.from(JSON.stringify(args || {}), 'utf8').toString('base64url');
    const child = spawn(process.execPath, [__filename, '--worker', action, encoded], {
      env: { ...process.env, ...extraEnv },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('error', reject);
    child.on('close', (code) => {
      const markerLine = stdout.split(/\r?\n/).find((l) => l.startsWith('__PG_WORKER_RESULT__:'));
      if (!markerLine) {
        return reject(new Error(`Worker(${action}) exited ${code} without marker. stdout=${stdout} stderr=${stderr}`));
      }
      const parsed = JSON.parse(markerLine.slice('__PG_WORKER_RESULT__:'.length));
      resolve({ exitCode: code, ...parsed, stderr });
    });
  });
}

function runTestSuite() {
  const { test, describe, before, after } = require('node:test');
  const { Pool } = require('pg');
  const storeMod = require(STORE_DIST);

  const connectionString =
    process.env.UGONDU_TEST_POSTGRES_URL ||
    process.env.UGONDU_PASSPORT_PG_CONNECTION_STRING ||
    process.env.DATABASE_URL ||
    '';
  const requireLive = process.env.UGONDU_REQUIRE_LIVE_POSTGRES === 'true';
  const tableName = `ugondu_pg_live_${process.pid}_${Date.now()}`;

  const { privateKey } = generateKeyPairSync('ed25519');
  const sharedPrivateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

  function workerEnv(overrides = {}) {
    return {
      NODE_ENV: 'production',
      UGONDU_DISABLE_AUTO_LISTEN: 'true',
      UGONDU_PASSPORT_STORAGE_BACKEND: 'POSTGRES',
      UGONDU_PASSPORT_PG_CONNECTION_STRING: connectionString,
      UGONDU_PASSPORT_PG_TABLE: tableName,
      UGONDU_KEY_REF: '',
      UGONDU_RECIPE_PRIVATE_KEY: sharedPrivateKeyPem,
      UGONDU_PRIVATE_KEY: sharedPrivateKeyPem,
      ...overrides,
    };
  }

  let adminPool = null;
  let adminAdapter = null;
  let pgAvailable = false;
  let unavailableReason = '';
  let sharedState = {};

  describe('Live Multi-Process PostgreSQL Passport Qualification', () => {
    before(async () => {
      if (!connectionString) {
        unavailableReason = 'No PostgreSQL URL set (UGONDU_TEST_POSTGRES_URL / UGONDU_PASSPORT_PG_CONNECTION_STRING / DATABASE_URL)';
        if (requireLive) throw new Error(`[PG-LIVE-FAIL-CLOSED] ${unavailableReason}`);
        console.warn(`[PG-LIVE] Skipping live multi-process PostgreSQL tests: ${unavailableReason}`);
        return;
      }
      adminPool = new Pool({ connectionString, max: 4, connectionTimeoutMillis: 3000 });
      adminPool.on('error', () => {});
      try {
        await adminPool.query('SELECT 1 AS alive');
        adminAdapter = new storeMod.PostgresPassportStoreAdapter({ pool: adminPool, tableName });
        await adminAdapter.initSchema();
        pgAvailable = true;
      } catch (err) {
        await adminPool.end().catch(() => {});
        adminPool = null;
        unavailableReason = `PostgreSQL unreachable: ${err?.message || String(err)}`;
        if (requireLive) throw new Error(`[PG-LIVE-FAIL-CLOSED] ${unavailableReason}`);
        console.warn(`[PG-LIVE] Skipping live multi-process PostgreSQL tests: ${unavailableReason}`);
      }
    });

    after(async () => {
      if (adminPool) {
        await adminPool.query(`DROP TABLE IF EXISTS ${tableName}`).catch(() => {});
        await adminPool.end().catch(() => {});
      }
    });

    function skipIfUnavailable(t) {
      if (!pgAvailable) {
        if (requireLive) assert.fail(`[PG-LIVE-FAIL-CLOSED] ${unavailableReason}`);
        t.skip(unavailableReason);
        return true;
      }
      return false;
    }

    test('PG-LIVE-001: Cross-process opaque and signed pp_v1 passport issuance and retrieval', async (t) => {
      if (skipIfUnavailable(t)) return;
      const opaqueId = `pp_live_opaque_${Date.now()}`;
      const signedJti = `pp_live_jti_${Date.now()}`;

      const workerA = await spawnWorker('issue-and-register', { opaqueId, signedJti, tenantId: 'tenant_alpha', workspaceId: 'ws_alpha' }, workerEnv());
      assert.equal(workerA.ok, true, workerA.message);
      const { signedToken } = workerA.res;
      assert.ok(signedToken.startsWith('pp_v1.'));

      const workerB = await spawnWorker('admit-and-get', { ids: [opaqueId, signedToken], tenantId: 'tenant_alpha' }, workerEnv());
      assert.equal(workerB.ok, true, workerB.message);
      assert.notEqual(workerB.res.pid, workerA.res.pid);
      assert.equal(workerB.res.keyId, workerA.res.keyId);

      const opaqueRes = workerB.res.results[opaqueId];
      assert.equal(opaqueRes.record?.tenantId, 'tenant_alpha');
      assert.equal(opaqueRes.record?.version, 1);
      assert.deepEqual(opaqueRes.admission, { status: 'ADMITTED', tenantId: 'tenant_alpha' });

      const signedRes = workerB.res.results[signedToken];
      assert.equal(signedRes.record?.tenantId, 'tenant_alpha');
      assert.equal(signedRes.record?.version, 1);
      assert.deepEqual(signedRes.admission, { status: 'ADMITTED', tenantId: 'tenant_alpha' });

      sharedState = { opaqueId, signedToken };
    });

    test('PG-LIVE-002: Concurrent registration and optimistic CAS locking across parallel OS processes', async (t) => {
      if (skipIfUnavailable(t)) return;
      const casId = `pp_live_cas_${Date.now()}`;
      await adminAdapter.setAsync({ passportId: casId, tenantId: 'tenant_cas', workspaceId: 'ws_init', revoked: false });

      const racers = await Promise.all(
        Array.from({ length: 6 }, (_, i) =>
          spawnWorker('cas-race', { passportId: casId, tenantId: 'tenant_cas', workspaceId: `ws_racer_${i}`, expectedVersion: 1 }, workerEnv())
        )
      );
      const winners = racers.filter((r) => r.ok);
      const losers = racers.filter((r) => !r.ok);
      assert.equal(winners.length, 1, `Expected exactly 1 CAS winner, got ${winners.length}`);
      assert.equal(losers.length, 5);
      for (const l of losers) {
        assert.equal(l.code, 'PASSPORT_STORE_UNAVAILABLE');
      }
      const afterRace = await adminAdapter.getAsync(casId);
      assert.equal(afterRace?.version, 2);
      assert.equal(afterRace?.workspaceId, winners[0].res.workspaceId);

      const casLoopId = `pp_live_cas_loop_${Date.now()}`;
      await adminAdapter.setAsync({ passportId: casLoopId, tenantId: 'tenant_cas', workspaceId: 'ws_loop_init', revoked: false });
      const loopWorkers = await Promise.all(
        Array.from({ length: 4 }, (_, i) =>
          spawnWorker('cas-loop', { passportId: casLoopId, workerId: i, iterations: 5 }, workerEnv())
        )
      );
      for (const lw of loopWorkers) {
        assert.equal(lw.ok, true, lw.message);
        assert.equal(lw.res.updates, 5);
      }
      const finalLoop = await adminAdapter.getAsync(casLoopId);
      assert.equal(finalLoop?.version, 21);

      sharedState.casId = casId;
      sharedState.casLoopId = casLoopId;
    });

    test('PG-LIVE-003: Revocation visibility across independent OS processes', async (t) => {
      if (skipIfUnavailable(t)) return;
      const revId = `pp_live_rev_${Date.now()}`;
      await adminAdapter.setAsync({ passportId: revId, tenantId: 'tenant_alpha', workspaceId: 'ws_rev', revoked: false });

      const preCheck = await spawnWorker('admit-and-get', { ids: [revId], tenantId: 'tenant_alpha' }, workerEnv());
      assert.equal(preCheck.ok, true, preCheck.message);
      assert.equal(preCheck.res.results[revId].revoked, false);
      assert.deepEqual(preCheck.res.results[revId].admission, { status: 'ADMITTED', tenantId: 'tenant_alpha' });

      const revoker = await spawnWorker('revoke', { passportId: revId, reason: 'live_cross_process_revocation' }, workerEnv());
      assert.equal(revoker.ok, true, revoker.message);

      const postCheck = await spawnWorker('admit-and-get', { ids: [revId], tenantId: 'tenant_alpha' }, workerEnv());
      assert.equal(postCheck.ok, true, postCheck.message);
      assert.notEqual(postCheck.res.pid, revoker.res.pid);
      assert.equal(postCheck.res.results[revId].revoked, true);
      assert.equal(postCheck.res.results[revId].record?.revocationReason, 'live_cross_process_revocation');
      assert.deepEqual(postCheck.res.results[revId].admission, { status: 'REJECTED' });

      sharedState.revId = revId;
    });

    test('PG-LIVE-004: Process restart and persistence recovery in fresh Worker C', async (t) => {
      if (skipIfUnavailable(t)) return;
      const workerC = await spawnWorker(
        'admit-and-get',
        { ids: [sharedState.opaqueId, sharedState.signedToken, sharedState.casId, sharedState.casLoopId, sharedState.revId] },
        workerEnv()
      );
      assert.equal(workerC.ok, true, workerC.message);
      const r = workerC.res.results;
      assert.equal(r[sharedState.opaqueId].admission.status, 'ADMITTED');
      assert.equal(r[sharedState.signedToken].admission.status, 'ADMITTED');
      assert.equal(r[sharedState.casId].record?.version, 2);
      assert.equal(r[sharedState.casLoopId].record?.version, 21);
      assert.equal(r[sharedState.revId].record?.revoked, true);
      assert.equal(r[sharedState.revId].admission.status, 'REJECTED');
    });

    test('PG-LIVE-005: Connection interruption recovery and fail-closed closed-port rejection', async (t) => {
      if (skipIfUnavailable(t)) return;
      const recoveryPool = new Pool({ connectionString, max: 2, connectionTimeoutMillis: 3000, application_name: 'ugondu_live_recovery_test' });
      let poolErrors = 0;
      recoveryPool.on('error', () => { poolErrors++; });
      const recoveryAdapter = new storeMod.PostgresPassportStoreAdapter({
        pool: recoveryPool,
        tableName,
        maxRetries: 4,
        retryBaseDelayMs: 25,
        maxRetryDelayMs: 100,
      });
      try {
        const recId = `pp_live_rec_${Date.now()}`;
        await recoveryAdapter.setAsync({ passportId: recId, tenantId: 'tenant_recovery', revoked: false });
        const termRes = await adminPool.query(
          "SELECT pg_terminate_backend(pid) AS killed FROM pg_stat_activity WHERE application_name = 'ugondu_live_recovery_test' AND pid <> pg_backend_pid()"
        );
        assert.ok(termRes.rows.length >= 1, 'Expected active recovery connection in pg_stat_activity');
        await new Promise((r) => setTimeout(r, 30));
        const recovered = await recoveryAdapter.getAsync(recId);
        assert.equal(recovered?.passportId, recId);
        await recoveryAdapter.setAsync({ passportId: recId, tenantId: 'tenant_recovery', workspaceId: 'ws_recovered', revoked: false }, 1);
        const afterUpdate = await recoveryAdapter.getAsync(recId);
        assert.equal(afterUpdate?.version, 2);
        assert.equal(afterUpdate?.workspaceId, 'ws_recovered');

        let injectedOnce = false;
        const transientProxyPool = {
          connect: async () => {
            if (!injectedOnce) {
              injectedOnce = true;
              throw Object.assign(new Error('terminating connection due to administrator command'), { code: '57P01' });
            }
            return recoveryPool.connect();
          },
          query: (sql, params) => recoveryPool.query(sql, params),
        };
        const retryAdapter = new storeMod.PostgresPassportStoreAdapter({
          pool: transientProxyPool,
          tableName,
          maxRetries: 3,
          retryBaseDelayMs: 15,
          maxRetryDelayMs: 50,
        });
        await retryAdapter.setAsync({ passportId: recId, tenantId: 'tenant_recovery', workspaceId: 'ws_retry_ok', revoked: false }, 2);
        assert.equal(injectedOnce, true);
        const afterRetry = await adminAdapter.getAsync(recId);
        assert.equal(afterRetry?.version, 3);
        assert.equal(afterRetry?.workspaceId, 'ws_retry_ok');
        assert.ok(poolErrors >= 0);
      } finally {
        await recoveryAdapter.close().catch(() => {});
      }

      const brokenUrl = 'postgresql://ugondu_test:ugondu_test_pg_pwd@127.0.0.1:59999/ugondu_passport_qual';
      const outageWorker = await spawnWorker(
        'outage-fail-closed',
        { brokenUrl, tableName },
        workerEnv({ UGONDU_PASSPORT_PG_CONNECTION_STRING: brokenUrl })
      );
      assert.equal(outageWorker.ok, true, outageWorker.message);
      assert.equal(outageWorker.res.writeErr?.code, 'PASSPORT_STORE_UNAVAILABLE');
      assert.deepEqual(outageWorker.res.admitOnBrokenStore, { status: 'REJECTED' });
    });

    test('PG-LIVE-006: Tenant isolation and transaction rollback on simulated post-write failure', async (t) => {
      if (skipIfUnavailable(t)) return;
      const res = await spawnWorker(
        'tenant-and-rollback',
        {
          opaqueId: sharedState.opaqueId,
          signedToken: sharedState.signedToken,
          ownerTenant: 'tenant_alpha',
          wrongTenant: 'tenant_beta',
        },
        workerEnv()
      );
      assert.equal(res.ok, true, res.message);
      assert.deepEqual(res.res.wrongTenantAdmit, { status: 'REJECTED' });
      assert.deepEqual(res.res.wrongSignedAdmit, { status: 'REJECTED' });
      assert.equal(res.res.tenantGuardErr?.code, 'PASSPORT_STORE_UNAVAILABLE');
      assert.match(res.res.rollbackErr || '', /SIMULATED_TX_FAILURE|PASSPORT_STORE/);
      assert.equal(res.res.after?.tenantId, 'tenant_alpha');
      assert.equal(res.res.after?.workspaceId, 'ws_alpha');
      assert.equal(res.res.after?.revoked, false);
      assert.equal(res.res.after?.version, 1);
      assert.deepEqual(res.res.rightTenantAdmit, { status: 'ADMITTED', tenantId: 'tenant_alpha' });
    });
  });
}
