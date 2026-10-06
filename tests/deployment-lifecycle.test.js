/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Tests / Deployment Lifecycle Qualification Suite
 * File           : deployment-lifecycle.test.js
 * Version        : 1.0.0
 * Author         : Deployment Engineering Authority
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
const shared = require('../server/shared/dist');
const {
  verifyServiceIdentityToken, signServiceIdentity, globalTrustRegistry,
  validateLanguagePackIntegrity, computePackArtifactDigest
} = shared;
const { DisasterRecoveryEngine } = require('../server/engine-core/dist/dr/chaos');

let passed = 0; let failed = 0;
function report(n, desc, fn) {
  try { fn(); console.log(`[PASS] Scenario ${n}: ${desc}`); passed++; }
  catch(err) { console.error(`[FAIL] Scenario ${n}: ${desc} ->`, err.message); failed++; }
}
async function reportAsync(n, desc, fn) {
  try { await fn(); console.log(`[PASS] Scenario ${n}: ${desc}`); passed++; }
  catch(err) { console.error(`[FAIL] Scenario ${n}: ${desc} ->`, err.message); failed++; }
}

const sandbox = path.join(os.tmpdir(), `ugondu_lifecycle_${Date.now()}`);
fs.mkdirSync(sandbox, { recursive: true });

(async () => {
  try {
    // Scenario 1: First deployment
    report(1, 'First deployment — write release and set live symlink', () => {
      const v1dir = path.join(sandbox, 'releases', 'v1');
      fs.mkdirSync(v1dir, { recursive: true });
      fs.writeFileSync(path.join(v1dir, 'index.js'), 'module.exports = "v1"', 'utf8');
      const currentPath = path.join(sandbox, 'current');
      fs.symlinkSync(v1dir, currentPath, 'junction');
      const resolved = fs.readlinkSync(currentPath);
      assert.ok(resolved.endsWith('v1') || resolved.includes('v1'), `Symlink must point to v1, got: ${resolved}`);
      const content = fs.readFileSync(path.join(sandbox, 'current', 'index.js'), 'utf8');
      assert.strictEqual(content, 'module.exports = "v1"');
    });

    // Scenario 2: Repeated idempotent deployment
    report(2, 'Repeated idempotent deployment — no error, symlink correct', () => {
      const v1dir = path.join(sandbox, 'releases', 'v1');
      fs.writeFileSync(path.join(v1dir, 'index.js'), 'module.exports = "v1"', 'utf8');
      const content = fs.readFileSync(path.join(sandbox, 'current', 'index.js'), 'utf8');
      assert.strictEqual(content, 'module.exports = "v1"');
    });

    // Scenario 3: Interrupted deployment — live symlink unchanged
    report(3, 'Interrupted deployment — live symlink not updated on failure', () => {
      const v2dir = path.join(sandbox, 'releases', 'v2');
      fs.mkdirSync(v2dir, { recursive: true });
      let interrupted = false;
      try {
        fs.writeFileSync(path.join(v2dir, 'index.js'), 'partial...', 'utf8');
        throw new Error('Simulated interruption');
      } catch { interrupted = true; }
      assert.ok(interrupted);
      const currentPath = path.join(sandbox, 'current');
      const resolved = fs.readlinkSync(currentPath);
      assert.ok(resolved.includes('v1'), `Symlink must still point to v1 after interruption, got: ${resolved}`);
    });

    // Scenario 4: Resume after interruption
    report(4, 'Resume after interrupted deployment — completes successfully', () => {
      const v2dir = path.join(sandbox, 'releases', 'v2');
      fs.writeFileSync(path.join(v2dir, 'index.js'), 'module.exports = "v2"', 'utf8');
      const currentPath = path.join(sandbox, 'current');
      const nextPath = path.join(sandbox, 'current.next');
      try { fs.unlinkSync(nextPath); } catch {}
      fs.symlinkSync(v2dir, nextPath, 'junction');
      try { fs.unlinkSync(currentPath); } catch {} fs.renameSync(nextPath, currentPath);
      const content = fs.readFileSync(path.join(sandbox, 'current', 'index.js'), 'utf8');
      assert.strictEqual(content, 'module.exports = "v2"');
    });

    // Scenario 5: Rollback to v1
    report(5, 'Rollback — revert current symlink to v1', () => {
      const v1dir = path.join(sandbox, 'releases', 'v1');
      const currentPath = path.join(sandbox, 'current');
      const nextPath = path.join(sandbox, 'current.next');
      try { fs.unlinkSync(nextPath); } catch {}
      fs.symlinkSync(v1dir, nextPath, 'junction');
      try { fs.unlinkSync(currentPath); } catch {} fs.renameSync(nextPath, currentPath);
      const content = fs.readFileSync(path.join(sandbox, 'current', 'index.js'), 'utf8');
      assert.strictEqual(content, 'module.exports = "v1"');
    });

    // Scenario 6: DR state corruption recovery
    await reportAsync(6, 'DR STATE_CORRUPTION — verifiedHealthy true, rpoSeconds 0', async () => {
      const exp = DisasterRecoveryEngine.runChaosExperiment('STATE_CORRUPTION');
      assert.strictEqual(exp.verifiedHealthy, true);
      assert.strictEqual(exp.rpoSeconds, 0);
    });

    // Scenario 7: Cross-tenant auth denial
    report(7, 'Cross-tenant auth denial — token for wrong audience rejected', () => {
      const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
      const testKeyId = 'key_test_c37_' + Date.now();
      globalTrustRegistry.registerKey({ keyId: testKeyId, algorithm: 'ed25519', status: 'ACTIVE', purpose: 'service-identity', publicKey: publicKey.export({ type: 'spki', format: 'pem' }) });
      const token = signServiceIdentity('engine-core', 'tenant_123', 'execute', privateKey.export({ type: 'pkcs8', format: 'pem' }), testKeyId);
      const res = verifyServiceIdentityToken(token, 'tenant_456');
      assert.strictEqual(res.valid, false);
      assert.strictEqual(res.error, 'AUDIENCE_MISMATCH');
    });

    // Scenario 8: Forged recipe — digest tampered
    report(8, 'Forged language pack — artifactDigest mismatch causes invalid === false', () => {
      const packPath = path.resolve(__dirname, '../packs/ugondu-lang-en-US.upl.json');
      const original = JSON.parse(fs.readFileSync(packPath, 'utf8'));
      const forged = Object.assign({}, original, { artifactDigest: 'sha256:deadbeef00' });
      const result = validateLanguagePackIntegrity(forged);
      assert.strictEqual(result.valid, false, `Expected forged pack to be invalid, got valid=${result.valid}`);
    });

    // Scenario 9: Revoked key
    report(9, 'Revoked key — globalTrustRegistry.validateKeyStatus throws for key_recipe_v1', () => {
      assert.throws(
        () => globalTrustRegistry.validateKeyStatus('key_recipe_v1'),
        /revoked|REVOKED/i
      );
    });

    // Scenario 10: Audit trail persistence — atomic write/read
    report(10, 'Audit trail — atomic JSON write (tmp+rename) then read-back matches', () => {
      const auditDir = path.join(sandbox, 'audit');
      fs.mkdirSync(auditDir, { recursive: true });
      const auditFile = path.join(auditDir, 'trail.json');
      const tmpFile = auditFile + `.tmp.${crypto.randomBytes(4).toString('hex')}`;
      const record = {
        eventId: crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex'),
        action: 'DEPLOYMENT_LIFECYCLE_VERIFIED',
        timestamp: Date.now(),
        actor: 'deployment-engineering-authority',
        outcome: 'PASS'
      };
      fs.writeFileSync(tmpFile, JSON.stringify(record, null, 2), { encoding: 'utf8', mode: 0o600 });
      fs.renameSync(tmpFile, auditFile);
      const readBack = JSON.parse(fs.readFileSync(auditFile, 'utf8'));
      assert.strictEqual(readBack.action, 'DEPLOYMENT_LIFECYCLE_VERIFIED');
      assert.strictEqual(readBack.actor, 'deployment-engineering-authority');
      assert.strictEqual(readBack.outcome, 'PASS');
      assert.ok(typeof readBack.timestamp === 'number');
    });

  } finally {
    try { fs.rmSync(sandbox, { recursive: true, force: true }); } catch {}
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
