/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Tests / Integration — Passport Shared Store
 * File           : passport-shared-store.test.js
 * Version        : 1.0.0
 * Author         : Ignatus Chika Ujomor
 * Organization   : Air Roofers SASU / Ujomor Engineering
 * Created Date   : 2026-10-31
 * Last Modified  : 2026-10-31
 * Classification : ENTERPRISE | INTERNAL
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
 * Copyright (c) 2026 Air Roofers SASU / Ujomor Engineering. All Rights Reserved.
 ******************************************************************************/

'use strict';

const assert = require('assert');
const { test } = require('node:test');
const engineModule = { PortablePassportStore: require('../server/engine-core/dist/passport/storage/passport-store.js').PortablePassportStore };

test('ENG-PASS-008: independent process/instance shared passport persistence and cross-instance revocation', () => {
  const os = require('os');
  const path = require('path');
  const fs = require('fs');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ugondu-passport-shared-'));

  try {
    const { PortablePassportStore } = engineModule;
    const storeInstanceA = new PortablePassportStore(tempDir);
    const storeInstanceB = new PortablePassportStore(tempDir);

    const testPassportId = `pp_shared_test_${Date.now()}`;
    const tenantId = 'tenant_distributed_cluster';

    // Instance A registers passport
    storeInstanceA.set({
      passportId: testPassportId,
      tenantId: tenantId,
      expiresAt: Date.now() + 60_000,
      revoked: false,
    });

    // Instance B immediately sees the registered passport across instances
    const fetchedByB = storeInstanceB.get(testPassportId);
    assert.ok(fetchedByB, 'Instance B must read passport registered by Instance A');
    assert.strictEqual(fetchedByB.tenantId, tenantId);
    assert.strictEqual(fetchedByB.revoked, false);

    // Instance A revokes passport
    storeInstanceA.revoke(testPassportId, 'ADMIN_SECURITY_REVOCATION');

    // Instance B immediately sees the revoked status
    const revokedAtB = storeInstanceB.get(testPassportId);
    assert.ok(revokedAtB, 'Instance B must read passport after revocation');
    assert.strictEqual(revokedAtB.revoked, true);
    assert.strictEqual(storeInstanceB.isRevoked(testPassportId), true);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('ENG-PASS-010: concurrent OS processes sharing one store lose no writes', () => {
  const os = require('os');
  const path = require('path');
  const fs = require('fs');
  const { spawn } = require('child_process');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ugondu-passport-mp-'));
  const modulePath = require.resolve('../server/engine-core/dist/passport/storage/passport-store.js');
  const workers = 6;
  const perWorker = 15;
  const script = `
    const { PortablePassportStore } = require(${JSON.stringify(modulePath)});
    const s = new PortablePassportStore(${JSON.stringify(dir)});
    for (let i = 0; i < ${perWorker}; i++) {
      s.set({ passportId: 'p_' + process.argv[1] + '_' + i, tenantId: 't_' + process.argv[1] });
    }`;
  return new Promise((resolve, reject) => {
    let done = 0; let failed = 0;
    for (let w = 0; w < workers; w++) {
      const child = spawn(process.execPath, ['-e', script, String(w)], {
        env: { ...process.env, UGONDU_PASSPORT_LOCK_WAIT_MS: '20000' },
        stdio: 'ignore',
      });
      child.on('exit', (code) => {
        if (code !== 0) failed++;
        if (++done === workers) {
          try {
            assert.strictEqual(failed, 0, 'every writer process must succeed');
            const { PortablePassportStore } = engineModule;
            const verifier = new PortablePassportStore(dir);
            for (let w2 = 0; w2 < workers; w2++) {
              for (let i = 0; i < perWorker; i++) {
                assert.ok(verifier.get(`p_${w2}_${i}`), `lost write p_${w2}_${i}`);
              }
            }
            resolve();
          } catch (e) { reject(e); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
        }
      });
    }
  });
});
