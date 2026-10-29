'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const a02 = require('../scripts/cor/streams/A02');
const a03 = require('../scripts/cor/streams/A03');
const { findVerifierStub, assertNoVerifierStub } = require('../scripts/cor/stream-source-integrity');

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ugondu-cor-stream-'));
  const policyDir = path.join(root, 'server/engine-core/src/upm');
  const recoveryDir = path.join(root, 'server/engine-core/src/routes');
  fs.mkdirSync(policyDir, { recursive: true });
  fs.mkdirSync(recoveryDir, { recursive: true });
  return { root, policyPath: path.join(policyDir, 'policy-gate.ts'), recoveryPath: path.join(recoveryDir, 'recovery.ts') };
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
