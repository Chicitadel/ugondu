'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const a02 = require('../scripts/cor/streams/A02');
const a04 = require('../scripts/cor/streams/A04');
const a05 = require('../scripts/cor/streams/A05');
const a06 = require('../scripts/cor/streams/A06');
const a03 = require('../scripts/cor/streams/A03');
const a07 = require('../scripts/cor/streams/A07');
const b09 = require('../scripts/cor/streams/B09');
const b10 = require('../scripts/cor/streams/B10');
const b11 = require('../scripts/cor/streams/B11');
const b12 = require('../scripts/cor/streams/B12');
const b13 = require('../scripts/cor/streams/B13');
const b14 = require('../scripts/cor/streams/B14');
const b15 = require('../scripts/cor/streams/B15');
const b16 = require('../scripts/cor/streams/B16');
const c22 = require('../scripts/cor/streams/C22');
const d25 = require('../scripts/cor/streams/D25');
const d26 = require('../scripts/cor/streams/D26');
const d27 = require('../scripts/cor/streams/D27');
const d28 = require('../scripts/cor/streams/D28');
const e29 = require('../scripts/cor/streams/E29');
const e30 = require('../scripts/cor/streams/E30');
const e31 = require('../scripts/cor/streams/E31');
const e32 = require('../scripts/cor/streams/E32');
const e33 = require('../scripts/cor/streams/E33');
const f35 = require('../scripts/cor/streams/F35');
const f36 = require('../scripts/cor/streams/F36');
const f37 = require('../scripts/cor/streams/F37');
const f38 = require('../scripts/cor/streams/F38');
const f39 = require('../scripts/cor/streams/F39');
const { findVerifierStub, assertNoVerifierStub } = require('../scripts/cor/stream-source-integrity');

const REPO_ROOT = path.resolve(__dirname, '..');

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ugondu-cor-stream-'));
  const policyDir = path.join(root, 'server/engine-core/src/upm');
  const recoveryDir = path.join(root, 'server/engine-core/src/routes');
  fs.mkdirSync(policyDir, { recursive: true });
  fs.mkdirSync(recoveryDir, { recursive: true });
  return { root, policyPath: path.join(policyDir, 'policy-gate.ts'), recoveryPath: path.join(recoveryDir, 'recovery.ts') };
}

function writeFile(root, relPath, content) {
  const full = path.join(root, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
  return full;
}

const context = (root, streamId) => ({
  root, streamId, executionId: `test-${streamId}`,
  commitSHA: 'a'.repeat(40), treeSHA: 'b'.repeat(40),
  startedAt: new Date().toISOString(),
});

test('A02 passes only when exact and embedded wildcard actions are rejected', async () => {
  const f = fixture();
  try {
    fs.writeFileSync(f.policyPath, "if (context.envelope.allowedActions.some(action => action === '*' || action.includes('*'))) { throw new Error('WILDCARD_CAPABILITY_NOT_PERMITTED'); }\n");
    const receipt = await a02.run(context(f.root, 'A02'));
    assert.equal(receipt.status, 'PASS');
    assert.ok(receipt.artifacts.includes('server/engine-core/src/upm/policy-gate.ts'));
  } finally { fs.rmSync(f.root, { recursive: true, force: true }); }
});

test('A02 rejects a file that merely contains wildcard-related words', async () => {
  const f = fixture();
  try {
    fs.writeFileSync(f.policyPath, "// wildcard reject is discussed here, but no guard is enforced\n");
    await assert.rejects(a02.run(context(f.root, 'A02')), /A02_WILDCARD_REJECTION_GUARD_MISSING/);
  } finally { fs.rmSync(f.root, { recursive: true, force: true }); }
});

test('A03 passes only when recovery binds the computed envelope hash to policy verification and seal', async () => {
  const f = fixture();
  try {
    fs.writeFileSync(f.recoveryPath, "const envelopeHash = sha256(context.envelope);\nUpmExecutionGate.verifyAuthorization(auth, ir, { intentHash: canonicalIntentHash, twinHash, envelopeHash, policyVersion: context.policyVersion });\n");
    fs.writeFileSync(f.policyPath, "if (auth.envelopeHash !== expected.envelopeHash) throw new Error('ENVELOPE_HASH_MISMATCH');\nconst authPayload = { envelopeHash: auth.envelopeHash };\n");
    const receipt = await a03.run(context(f.root, 'A03'));
    assert.equal(receipt.status, 'PASS');
    assert.equal(receipt.artifacts.length, 2);
  } finally { fs.rmSync(f.root, { recursive: true, force: true }); }
});

test('A03 rejects recovery that omits envelope hash binding', async () => {
  const f = fixture();
  try {
    fs.writeFileSync(f.recoveryPath, "const envelopeHash = sha256(context.envelope);\nUpmExecutionGate.verifyAuthorization(auth, ir, { intentHash: canonicalIntentHash, twinHash, policyVersion: context.policyVersion });\n");
    fs.writeFileSync(f.policyPath, "if (auth.envelopeHash !== expected.envelopeHash) throw new Error('ENVELOPE_HASH_MISMATCH');\nconst authPayload = { envelopeHash: auth.envelopeHash };\n");
    await assert.rejects(a03.run(context(f.root, 'A03')), /A03_RECOVERY_ENVELOPE_HASH_NOT_BOUND_TO_AUTHORIZATION/);
  } finally { fs.rmSync(f.root, { recursive: true, force: true }); }
});

test('A02 and A03 reject mismatched stream identities', async () => {
  const f = fixture();
  try {
    fs.writeFileSync(f.policyPath, "if (context.envelope.allowedActions.some(action => action === '*' || action.includes('*'))) { throw new Error('WILDCARD_CAPABILITY_NOT_PERMITTED'); }\n");
    fs.writeFileSync(f.recoveryPath, "const envelopeHash = sha256(context.envelope);\nUpmExecutionGate.verifyAuthorization(auth, ir, { intentHash: canonicalIntentHash, twinHash, envelopeHash, policyVersion: context.policyVersion });\n");
    await assert.rejects(a02.run(context(f.root, 'WRONG')), /STREAM_CONTEXT_MISMATCH/);
    await assert.rejects(a03.run(context(f.root, 'WRONG')), /STREAM_CONTEXT_MISMATCH/);
  } finally { fs.rmSync(f.root, { recursive: true, force: true }); }
});

test('shared COR source guard rejects known placeholder verifier patterns', () => {
  assert.equal(findVerifierStub('function assertCheck() { return true; }'), 'ASSERT_CHECK_ALWAYS_TRUE');
  assert.equal(findVerifierStub('// We pretend to check the file'), 'PRETEND_CHECK_COMMENT');
  assert.equal(findVerifierStub("const scope = { baselineFingerprint: 'mock-fingerprint' };"), 'MOCK_FINGERPRINT');
  assert.equal(findVerifierStub("artifacts.push('verified_source');"), 'SYNTHETIC_VERIFIED_SOURCE');
  assert.equal(findVerifierStub('function verify() { return observedResult === true; }'), null);
  assert.throws(() => assertNoVerifierStub('function assertCheck() { return true; }', 'A02'), /COR_STREAM_VERIFIER_STUB_REJECTED:A02/);
});

test('all 40 stream verifiers in scripts/cor/streams pass assertNoVerifierStub', () => {
  const streamsDir = path.join(REPO_ROOT, 'scripts', 'cor', 'streams');
  const files = fs.readdirSync(streamsDir).filter((f) => f.endsWith('.js')).sort();
  assert.equal(files.length, 40);
  for (const file of files) {
    const streamId = path.basename(file, '.js');
    const source = fs.readFileSync(path.join(streamsDir, file), 'utf8');
    assert.doesNotThrow(() => assertNoVerifierStub(source, streamId), `${file} failed assertNoVerifierStub`);
  }
});

test('A07 verifies stream registry validator checks and rejects incomplete validator', async () => {
  const receipt = await a07.run(context(REPO_ROOT, 'A07'));
  assert.equal(receipt.status, 'PASS');
  assert.ok(receipt.artifacts.includes('scripts/check-cor-stream-registry.js'));

  const f = fixture();
  try {
    writeFile(f.root, 'scripts/check-cor-stream-registry.js', "if (manifest.repository !== 'Chicitadel/ugondu') {}\n");
    await assert.rejects(a07.run(context(f.root, 'A07')), /A07_STREAM_COUNT_CHECK_MISSING/);
  } finally { fs.rmSync(f.root, { recursive: true, force: true }); }
});

test('B09 and B10 verify jest.setup.ts UPM bypass removal and unit-test translation fixture', async () => {
  const r09 = await b09.run(context(REPO_ROOT, 'B09'));
  assert.equal(r09.status, 'PASS');
  const r10 = await b10.run(context(REPO_ROOT, 'B10'));
  assert.equal(r10.status, 'PASS');

  const f = fixture();
  try {
    writeFile(f.root, 'server/engine-core/jest.setup.ts', 'process.env.UGONDU_UPM_BYPASS = "1";\n');
    await assert.rejects(b09.run(context(f.root, 'B09')), /B09_GLOBAL_UPM_BYPASS_PRESENT/);
    await assert.rejects(b10.run(context(f.root, 'B10')), /B10_GLOBAL_TRANSLATION_FIXTURE_MISSING/);
  } finally { fs.rmSync(f.root, { recursive: true, force: true }); }
});

test('B11 and B12 verify locale update preservation and locale key parity checks', async () => {
  const r11 = await b11.run(context(REPO_ROOT, 'B11'));
  assert.equal(r11.status, 'PASS');
  const r12 = await b12.run(context(REPO_ROOT, 'B12'));
  assert.equal(r12.status, 'PASS');

  const f = fixture();
  try {
    writeFile(f.root, 'scripts/update-locales.js', 'function mergeMissing(src, tgt) { sortedTarget[k] = src[k]; }\n');
    writeFile(f.root, 'scripts/validate-locales.js', 'function flatten(obj) { return obj; }\n');
    await assert.rejects(b11.run(context(f.root, 'B11')), /B11_EXISTING_TRANSLATION_PRESERVATION_MISSING/);
    await assert.rejects(b12.run(context(f.root, 'B12')), /B12_FLATTEN_OR_REQUIRED_LOCALES_MISSING/);
  } finally { fs.rmSync(f.root, { recursive: true, force: true }); }
});

test('B13 verifies Ugondu manifest has zero EAORCS inheritance and rejects contaminated manifests', async () => {
  const r13 = await b13.run(context(REPO_ROOT, 'B13'));
  assert.equal(r13.status, 'PASS');

  const f = fixture();
  try {
    writeFile(f.root, '.governance/cor/ugondu-cor-qualification-manifest.json', JSON.stringify({
      repository: 'Chicitadel/ugondu',
      inherits: 'eaorcs-manifest',
      streams: [{ id: 'A01', status: 'PLANNED', objective: 'test', location: ['a.ts'] }],
    }));
    await assert.rejects(b13.run(context(f.root, 'B13')), /B13_FORBIDDEN_INHERITANCE_FIELD/);
  } finally { fs.rmSync(f.root, { recursive: true, force: true }); }
});

test('B14, B15, and B16 verify capability duplicate rejection, diagnosis delegation, and absence of out-of-bounds bash execution', async () => {
  assert.equal((await b14.run(context(REPO_ROOT, 'B14'))).status, 'PASS');
  assert.equal((await b15.run(context(REPO_ROOT, 'B15'))).status, 'PASS');
  assert.equal((await b16.run(context(REPO_ROOT, 'B16'))).status, 'PASS');

  const f = fixture();
  try {
    writeFile(f.root, 'server/engine-core/src/deise/engine/recovery/capability-registry.ts', 'export class CapabilityRegistry {}\n');
    writeFile(f.root, 'server/engine-core/src/routes/recovery.ts', 'export const recoveryRouter = {};\n');
    writeFile(f.root, 'server/engine-core/package.json', JSON.stringify({ scripts: { start: 'bash -c ./run.sh' } }));
    writeFile(f.root, 'server/engine-core/src/deise/engine/recovery/recovery-orchestrator.ts', 'export class RecoveryOrchestrator {}\n');

    await assert.rejects(b14.run(context(f.root, 'B14')), /B14_DUPLICATE_CAPABILITY_CHECK_MISSING/);
    await assert.rejects(b15.run(context(f.root, 'B15')), /B15_CAPABILITY_LOOKUP_MISSING/);
    await assert.rejects(b16.run(context(f.root, 'B16')), /B16_PACKAGE_SCRIPT_SHELL_EXECUTION_DETECTED/);
  } finally { fs.rmSync(f.root, { recursive: true, force: true }); }
});

test('C22 verifies client repair CLI uses i18n.T without hardcoded fmt strings', async () => {
  assert.equal((await c22.run(context(REPO_ROOT, 'C22'))).status, 'PASS');

  const f = fixture();
  try {
    writeFile(f.root, 'client/cmd/repair.go', 'package cmd\nimport (\n\t"fmt"\n\t"ugondu/client/i18n"\n)\nfunc Run() {\n\tfmt.Println(i18n.T("ok"))\n\tfmt.Println("Hardcoded string")\n}\n');
    await assert.rejects(c22.run(context(f.root, 'C22')), /C22_HARDCODED_FMT_STRING_DETECTED/);
  } finally { fs.rmSync(f.root, { recursive: true, force: true }); }
});

test('D25-D28 and E29-E33 verify target locale files exist and match top-level keys of en.json', async () => {
  const localeVerifiers = [
    ['D25', d25, 'ar.json'],
    ['D26', d26, 'de.json'],
    ['D27', d27, 'es.json'],
    ['D28', d28, 'fr.json'],
    ['E29', e29, 'it.json'],
    ['E30', e30, 'ja.json'],
    ['E31', e31, 'pt.json'],
    ['E32', e32, 'ru.json'],
    ['E33', e33, 'zh.json'],
  ];

  for (const [id, verifier, fileName] of localeVerifiers) {
    const receipt = await verifier.run(context(REPO_ROOT, id));
    assert.equal(receipt.status, 'PASS');
    assert.ok(receipt.artifacts.includes(`server/shared/locales/${fileName}`));
  }

  const f = fixture();
  try {
    writeFile(f.root, 'server/shared/locales/en.json', JSON.stringify({ a: 'Hello', b: 'World' }));
    writeFile(f.root, 'server/shared/locales/ar.json', JSON.stringify({ a: 'مرحبا' }));
    await assert.rejects(d25.run(context(f.root, 'D25')), /D25_AR_LOCALE_KEY_PARITY_MISMATCH/);
    await assert.rejects(d26.run(context(f.root, 'D26')), /D26_DE_LOCALE_MISSING/);
  } finally { fs.rmSync(f.root, { recursive: true, force: true }); }
});

test('F39 verifies atomic drift check and rollback on real RecoveryOrchestrator', async () => {
  const receipt = await f39.run(context(REPO_ROOT, 'F39'));
  assert.equal(receipt.status, 'PASS');
  assert.equal(receipt.driftDetected, true);
  assert.equal(receipt.executionContinued, false);
  assert.equal(receipt.rollbackInvoked, true);
  assert.ok(receipt.artifacts.includes('server/engine-core/src/deise/engine/recovery/recovery-orchestrator.ts'));
});


test('F39 proves drift refusal and rollback error propagation using the built orchestrator contract', async () => {
  const f = fixture();
  try {
    writeFile(
      f.root,
      'server/engine-core/dist/deise/engine/recovery/recovery-orchestrator.js',
      `module.exports = { RecoveryOrchestrator: class {
        async executeAtomically(plan, adapter, scope) {
          if (!await adapter.checkDrift(scope, scope.baselineFingerprint)) {
            throw new Error('environment_drift_detected');
          }
          const result = await adapter.executeAtomicRecovery(plan, scope);
          if (!result.success) {
            await adapter.rollback(result.checkpointId);
            throw new Error('atomic_execution_failed_and_wa');
          }
          return { success: true };
        }
      } };`,
    );
    const receipt = await f39.run(context(f.root, 'F39'));
    assert.equal(receipt.status, 'PASS');
    assert.equal(receipt.driftDetected, true);
    assert.equal(receipt.executionContinued, false);
    assert.equal(receipt.rollbackInvoked, true);
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
});

test('F39 rejects an orchestrator that rolls back but silently returns after atomic failure', async () => {
  const f = fixture();
  try {
    writeFile(
      f.root,
      'server/engine-core/dist/deise/engine/recovery/recovery-orchestrator.js',
      `module.exports = { RecoveryOrchestrator: class {
        async executeAtomically(plan, adapter, scope) {
          if (!await adapter.checkDrift(scope, scope.baselineFingerprint)) {
            throw new Error('environment_drift_detected');
          }
          const result = await adapter.executeAtomicRecovery(plan, scope);
          if (!result.success) {
            await adapter.rollback(result.checkpointId);
            return { success: false };
          }
          return { success: true };
        }
      } };`,
    );
    await assert.rejects(
      f39.run(context(f.root, 'F39')),
      /F39_ATOMIC_FAILURE_NOT_PROPAGATED/,
    );
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
});


test('F35-F38 execute compiled recovery behaviors and reject adversarial conditions', async () => {
  for (const [id, verifier] of [['F35', f35], ['F36', f36], ['F37', f37], ['F38', f38]]) {
    const receipt = await verifier.run(context(REPO_ROOT, id));
    assert.equal(receipt.status, 'PASS', id);
    assert.ok(receipt.observations.length > 0, id);
    assert.ok(receipt.artifacts.length > 0, id);
  }
});


test('A04-A06 execute engine/finalizer independence and cryptographic signer behavior', async () => {
  for (const [id, verifier] of [['A04', a04], ['A05', a05], ['A06', a06]]) {
    const receipt = await verifier.run(context(REPO_ROOT, id));
    assert.equal(receipt.status, 'PASS', id);
    assert.ok(receipt.observations.length > 0, id);
    assert.ok(receipt.artifacts.length > 0, id);
  }
});


test('Antigravity guardrail preserves behavioral verifier and certification boundaries', () => {
  const guardrail = fs.readFileSync(
    path.join(REPO_ROOT, 'docs/governance/ANTIGRAVITY_CHANGE_GUARDRAIL.md'),
    'utf8',
  );
  for (const requirement of [
    'verificationMode: TEST',
    'Source substring presence is not behavioral proof',
    'A04-A06 are now runtime-tested',
    'F35-F38 are now runtime-tested',
    '`READY_FOR_COR_SIGNATURE` is not a signed certificate',
    'No AWS resources were provisioned',
  ]) {
    assert.ok(guardrail.includes(requirement), 'Missing Antigravity guardrail requirement: ' + requirement);
  }
});
