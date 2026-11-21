/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Tests / Replay Authority Integration Suite
 * File           : replay-authority.test.js
 * Version        : 1.0.0
 * Author         : Security Testing Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
 * Classification : ENTERPRISE | INTERNAL
 *
 * Standards: ISO 27001, SOC 2, OWASP ASVS 5.0, NIST SP 800-53
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

// API discovery: DurableTokenReplayStore is exported from identity.js and accepts
// a customPath argument in its constructor (line 91: constructor(customPath)).
// Each test uses a unique tmp ledger path for full isolation.
const { DurableTokenReplayStore } = require('../server/shared/dist');

let passed = 0;
let failed = 0;

async function reportAsync(n, desc, fn) {
  try {
    await fn();
    console.log(`[PASS] Test ${n}: ${desc}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] Test ${n}: ${desc} ->`, err.message);
    failed++;
  }
}

(async () => {

  // Test 1: Atomic record-if-unseen — same key rejected on second call
  await reportAsync(1, 'Atomic record-if-unseen — same key rejected on second call', async () => {
    const ledger = path.join(os.tmpdir(), `replay_t1_${Date.now()}.json`);
    const store = new DurableTokenReplayStore(ledger);
    const key = `iss_a:key_v2:aud_b:jti_${crypto.randomBytes(8).toString('hex')}`;
    const exp = Math.floor(Date.now() / 1000) + 60;
    assert.strictEqual(store.atomicRecordIfUnseen(key, exp), true,
      'First call must return true (token accepted)');
    assert.strictEqual(store.atomicRecordIfUnseen(key, exp), false,
      'Second call must return false (replay detected)');
    try { fs.unlinkSync(ledger); } catch { /* cleanup best-effort */ }
  });

  // Test 2: Expired entries allow re-use of same composite key
  await reportAsync(2, 'Expired entries allow future re-use of same composite key', async () => {
    const ledger = path.join(os.tmpdir(), `replay_t2_${Date.now()}.json`);
    const store1 = new DurableTokenReplayStore(ledger);
    const key = `iss_b:key_v2:aud_c:jti_${crypto.randomBytes(8).toString('hex')}`;
    // Record with already-expired exp; persistLedger() strips expired entries
    const pastExp = Math.floor(Date.now() / 1000) - 1;
    store1.atomicRecordIfUnseen(key, pastExp);
    // New instance loads from disk — expired entry must not be in the ledger
    const store2 = new DurableTokenReplayStore(ledger);
    const futureExp = Math.floor(Date.now() / 1000) + 120;
    assert.strictEqual(store2.atomicRecordIfUnseen(key, futureExp), true,
      'Expired entry must not block re-use of same key');
    try { fs.unlinkSync(ledger); } catch { /* cleanup best-effort */ }
  });

  // Test 3: Cross-instance shared ledger — both instances detect replay
  await reportAsync(3, 'Cross-instance shared ledger — both instances detect replay', async () => {
    const ledger = path.join(os.tmpdir(), `replay_t3_${Date.now()}.json`);
    const store1 = new DurableTokenReplayStore(ledger);
    const key = `iss_c:key_v2:aud_d:jti_${crypto.randomBytes(8).toString('hex')}`;
    const exp = Math.floor(Date.now() / 1000) + 60;
    // store1 records the token and persists ledger
    assert.strictEqual(store1.atomicRecordIfUnseen(key, exp), true,
      'First store must accept the token');
    // store2b is a fresh instance that loads from disk
    const store2b = new DurableTokenReplayStore(ledger);
    assert.strictEqual(store2b.atomicRecordIfUnseen(key, exp), false,
      'Second instance must detect replay via shared ledger');
    try { fs.unlinkSync(ledger); } catch { /* cleanup best-effort */ }
  });

  // Test 4: Persistence failure fail-closed — write failure returns false
  await reportAsync(4, 'Persistence failure fail-closed — write failure returns false', async () => {
    // Create a directory at the ledger path so that fs.writeFileSync will fail
    const ledger = path.join(os.tmpdir(), `replay_t4_${Date.now()}.json`);
    fs.mkdirSync(ledger); // directory at ledger path makes writes fail
    const store = new DurableTokenReplayStore(ledger);
    const key = `iss_d:key_v2:aud_e:jti_${crypto.randomBytes(8).toString('hex')}`;
    const exp = Math.floor(Date.now() / 1000) + 60;
    const result = store.atomicRecordIfUnseen(key, exp);
    // persistLedger tries to write to `${ledger}.tmp.*` — the rename to `ledger`
    // (a directory) will fail → atomicRecordIfUnseen catches, deletes key, returns false
    assert.strictEqual(result, false,
      'Fail-closed: persistence failure must return false');
    try { fs.rmdirSync(ledger); } catch { /* cleanup best-effort */ }
  });

  // Test 5: Restart survival — replay detected after simulated process restart
  await reportAsync(5, 'Restart survival — replay detected after simulated process restart', async () => {
    const ledger = path.join(os.tmpdir(), `replay_t5_${Date.now()}.json`);
    const store1 = new DurableTokenReplayStore(ledger);
    const key = `iss_e:key_v2:aud_f:jti_${crypto.randomBytes(8).toString('hex')}`;
    const exp = Math.floor(Date.now() / 1000) + 120;
    assert.strictEqual(store1.atomicRecordIfUnseen(key, exp), true,
      'Original store must accept the token');
    // Simulate restart by constructing a brand-new instance from the persisted ledger
    const store2 = new DurableTokenReplayStore(ledger);
    assert.strictEqual(store2.atomicRecordIfUnseen(key, exp), false,
      'Replay must be detected after restart (ledger persisted across instances)');
    try { fs.unlinkSync(ledger); } catch { /* cleanup best-effort */ }
  });

  // Test 6: Concurrent parallel invocations — exactly one granted
  await reportAsync(6, 'Concurrent parallel invocations — exactly one granted', async () => {
    const ledger = path.join(os.tmpdir(), `replay_t6_${Date.now()}.json`);
    const store = new DurableTokenReplayStore(ledger);
    const key = `iss_f:key_v2:aud_g:jti_${crypto.randomBytes(8).toString('hex')}`;
    const exp = Math.floor(Date.now() / 1000) + 60;
    // Node.js is single-threaded; these resolve synchronously within Promise.all
    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        Promise.resolve(store.atomicRecordIfUnseen(key, exp))
      )
    );
    const granted = results.filter(r => r === true).length;
    const rejected = results.filter(r => r === false).length;
    assert.strictEqual(granted, 1,
      `Exactly 1 must be granted, got ${granted}`);
    assert.strictEqual(rejected, 19,
      `Exactly 19 must be rejected, got ${rejected}`);
    try { fs.unlinkSync(ledger); } catch { /* cleanup best-effort */ }
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);

})();
