/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Release Qualification / Platform Evidence Tests
 * File           : platform-evidence.test.js
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-20
 * Last Modified  : 2026-10-20
 * Classification : ENTERPRISE
 *
 * Copyright (c) 2026 Air Roofers SASU
 * All Rights Reserved.
 ******************************************************************************/
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.resolve(__dirname, '..', '..');
const COMMIT = 'a'.repeat(40);
const TREE = 'b'.repeat(40);
const DIGEST = 'c'.repeat(64);
const GOOD_SUITE = [{ name: 'integration', junitSha256: DIGEST, tests: 12, failures: 0 }];

let mod;
async function api() {
  mod = mod || await import(pathToFileURL(path.join(ROOT, 'scripts/release/platform-evidence.mjs')).href);
  return mod;
}

const HOST_OS = process.platform === 'win32' ? 'windows' : process.platform;
const HOST_ARCH = process.arch === 'x64' ? 'amd64' : process.arch;
const FOREIGN = HOST_OS === 'linux' ? { os: 'windows', arch: 'amd64' } : { os: 'linux', arch: 'amd64' };

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'plat-ev-')); }
function matrix(extra = []) {
  const base = (id, o, a, claim, tier = 'tested') => ({
    id, targetType: 'os-runtime', os: o, architecture: a, minimumRequiredTier: tier, supportClaim: claim
  });
  return {
    targetDefinitions: [
      base('host', HOST_OS, HOST_ARCH, 'supported'),
      base('foreign', FOREIGN.os, FOREIGN.arch, 'supported'),
      base('win-arm64', 'windows', 'arm64', 'experimental'),
      ...extra
    ]
  };
}
const ctx = { commitSha: COMMIT, treeSha: TREE };

// Hand-craft a record (as an attacker or a foreign runner would) with a valid self-digest.
async function forge(dir, overrides, { resign = true } = {}) {
  const m = await api();
  const rec = {
    schemaVersion: '1.0.0', targetId: 'host', target: { os: HOST_OS, arch: HOST_ARCH },
    runner: { os: HOST_OS, arch: HOST_ARCH, kind: 'forged' }, nativeExecution: true,
    commit: COMMIT, tree: TREE, suites: GOOD_SUITE, ...overrides
  };
  rec.evidenceSha256 = resign ? m.computeEvidenceDigest(rec) : DIGEST;
  fs.mkdirSync(path.join(dir, 'platforms'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'platforms', `${overrides.fileId || rec.targetId}.json`), JSON.stringify(rec));
}

test('no evidence => every target not-assessed, supported claims flagged', async () => {
  const m = await api();
  const d = m.deriveTargetStates(matrix(), tmp(), ctx);
  for (const id of ['host', 'foreign', 'win-arm64']) assert.strictEqual(d.targets[id].state, 'not-assessed');
  const v = m.verifyMatrixClaims(matrix(), d);
  assert.strictEqual(v.verdict, 'claim-exceeds-evidence');
  assert.deepStrictEqual(v.violations.map((x) => x.id).sort(), ['foreign', 'host']);
});

test('native evidence on the host target is tested, never auto-qualified', async () => {
  const m = await api();
  const dir = tmp();
  m.recordTargetEvidence({
    targetId: 'host', os: HOST_OS, arch: HOST_ARCH, runnerKind: 'local', nativeExecution: true,
    commitSha: COMMIT, treeSha: TREE, suiteResults: GOOD_SUITE, outDir: dir
  });
  const d = m.deriveTargetStates(matrix(), dir, ctx);
  assert.strictEqual(d.targets.host.state, 'tested');
  assert.ok(d.targets.host.reasons.includes('awaiting independent attestation'));
  assert.strictEqual(m.verifyMatrixClaims({ targetDefinitions: [matrix().targetDefinitions[0]] }, d).verdict, 'ok');
});

test('recorded runner identity comes from the process, not the caller', async () => {
  const m = await api();
  const dir = tmp();
  const { record } = m.recordTargetEvidence({
    targetId: 'foreign', os: FOREIGN.os, arch: FOREIGN.arch, runnerKind: 'cross', nativeExecution: false,
    commitSha: COMMIT, treeSha: TREE, suiteResults: [], outDir: dir, runner: { os: FOREIGN.os, arch: FOREIGN.arch }
  });
  assert.strictEqual(record.runner.os, HOST_OS);
  assert.strictEqual(record.runner.arch, HOST_ARCH);
});

test('cross-built evidence can never be tested', async () => {
  const m = await api();
  const dir = tmp();
  m.recordTargetEvidence({
    targetId: 'foreign', os: FOREIGN.os, arch: FOREIGN.arch, runnerKind: 'cross', nativeExecution: false,
    commitSha: COMMIT, treeSha: TREE, suiteResults: GOOD_SUITE, outDir: dir
  });
  const d = m.deriveTargetStates(matrix(), dir, ctx);
  assert.strictEqual(d.targets.foreign.state, 'built');
  assert.strictEqual(m.verifyMatrixClaims(matrix(), d).violations.some((x) => x.id === 'foreign'), true);
});

test('recording a native claim from a non-matching runner is refused', async () => {
  const m = await api();
  assert.throws(() => m.recordTargetEvidence({
    targetId: 'foreign', os: FOREIGN.os, arch: FOREIGN.arch, runnerKind: 'x', nativeExecution: true,
    commitSha: COMMIT, treeSha: TREE, suiteResults: GOOD_SUITE, outDir: tmp()
  }), /refusing native-execution claim/);
});

test('forged native evidence from a foreign runner for another target is rejected (cross-run)', async () => {
  const m = await api();
  const dir = tmp();
  // Evidence generated on the host runner but presented for the foreign target, with a valid digest.
  await forge(dir, { targetId: 'foreign', target: { os: FOREIGN.os, arch: FOREIGN.arch } });
  const d = m.deriveTargetStates(matrix(), dir, ctx);
  assert.strictEqual(d.targets.foreign.state, 'not-assessed');
  assert.ok(d.rejections.some((r) => /cross-run/.test(r.reason)));
});

test('evidence whose target os/arch differs from the matrix target is rejected', async () => {
  const m = await api();
  const dir = tmp();
  await forge(dir, { targetId: 'win-arm64', target: { os: HOST_OS, arch: HOST_ARCH } });
  const d = m.deriveTargetStates(matrix(), dir, ctx);
  assert.strictEqual(d.targets['win-arm64'].state, 'not-assessed');
  assert.ok(d.rejections.some((r) => /differs from matrix target/.test(r.reason)));
});

test('stale commit or tree is rejected', async () => {
  const m = await api();
  for (const o of [{ commit: 'd'.repeat(40) }, { tree: 'e'.repeat(40) }]) {
    const dir = tmp();
    await forge(dir, o);
    const d = m.deriveTargetStates(matrix(), dir, ctx);
    assert.strictEqual(d.targets.host.state, 'not-assessed');
    assert.ok(d.rejections.some((r) => r.reason === 'stale commit/tree'));
  }
});

test('tampered evidenceSha256 and post-hoc edited content are rejected', async () => {
  const m = await api();
  const dir = tmp();
  await forge(dir, {}, { resign: false });
  assert.ok(m.deriveTargetStates(matrix(), dir, ctx).rejections.some((r) => r.reason === 'tampered evidenceSha256'));

  const dir2 = tmp();
  m.recordTargetEvidence({
    targetId: 'host', os: HOST_OS, arch: HOST_ARCH, runnerKind: 'local', nativeExecution: true,
    commitSha: COMMIT, treeSha: TREE, suiteResults: [{ name: 'i', junitSha256: DIGEST, tests: 3, failures: 2 }], outDir: dir2
  });
  const f = path.join(dir2, 'platforms', 'host.json');
  const rec = JSON.parse(fs.readFileSync(f, 'utf8'));
  rec.suites[0].failures = 0; // edit without re-signing
  fs.writeFileSync(f, JSON.stringify(rec));
  const d = m.deriveTargetStates(matrix(), dir2, ctx);
  assert.strictEqual(d.targets.host.state, 'not-assessed');
});

test('duplicate and unknown targets are rejected', async () => {
  const m = await api();
  const dir = tmp();
  await forge(dir, {});
  await forge(dir, { fileId: 'host-copy' }); // second file claiming the same targetId
  await forge(dir, { targetId: 'ghost', target: { os: HOST_OS, arch: HOST_ARCH } });
  const d = m.deriveTargetStates(matrix(), dir, ctx);
  assert.strictEqual(d.targets.host.state, 'not-assessed');
  assert.ok(d.rejections.some((r) => r.reason === 'duplicate target evidence'));
  assert.ok(d.rejections.some((r) => r.reason === 'unknown targetId' && r.targetId === 'ghost'));
});

test('native run with failures, missing JUnit digest or zero tests stays built', async () => {
  const m = await api();
  const cases = [
    [{ name: 's', junitSha256: DIGEST, tests: 5, failures: 1 }],
    [{ name: 's', junitSha256: null, tests: 5, failures: 0 }],
    [{ name: 's', junitSha256: DIGEST, tests: 0, failures: 0 }],
    []
  ];
  for (const suites of cases) {
    const dir = tmp();
    await forge(dir, { suites });
    assert.strictEqual(m.deriveTargetStates(matrix(), dir, ctx).targets.host.state, 'built');
  }
});

test('qualified is unreachable without an independent verifier, even with an attestation field', async () => {
  const m = await api();
  const dir = tmp();
  await forge(dir, { attestation: { signer: 'self', signature: 'x' } });
  assert.strictEqual(m.deriveTargetStates(matrix(), dir, ctx).targets.host.state, 'tested');
  assert.strictEqual(
    m.deriveTargetStates(matrix(), dir, { ...ctx, attestationVerifier: () => false }).targets.host.state, 'tested'
  );
});

test('supported claim without evidence is flagged; experimental/unsupported are not', async () => {
  const m = await api();
  const mx = matrix();
  const v = m.verifyMatrixClaims(mx, m.deriveTargetStates(mx, tmp(), ctx));
  assert.strictEqual(v.verdict, 'claim-exceeds-evidence');
  assert.ok(!v.violations.some((x) => x.id === 'win-arm64'));
  mx.targetDefinitions[0].supportClaim = 'bogus';
  assert.strictEqual(m.verifyMatrixClaims(mx, m.deriveTargetStates(mx, tmp(), ctx)).verdict, 'invalid-matrix');
});

test('governed matrix: every target has a truthful claim and non-host supported claims are absent', async () => {
  const m = await api();
  const real = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/qualification/platform-matrix.json'), 'utf8'));
  for (const t of real.targetDefinitions) {
    assert.ok(m.SUPPORT_CLAIMS.includes(t.supportClaim), `${t.id} has valid supportClaim`);
    if (t.supportClaim === 'supported') assert.strictEqual(`${t.os}/${t.architecture}`, 'windows/amd64');
  }
  const d = m.deriveTargetStates(real, tmp(), ctx);
  for (const t of real.targetDefinitions) assert.strictEqual(d.targets[t.id].state, 'not-assessed');
  assert.strictEqual(m.verifyMatrixClaims(real, d).verdict, 'claim-exceeds-evidence');
});
