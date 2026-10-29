'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const registry = require('../.governance/cor/stream_k_expected_commands.json');
const { compareEvidenceContract, assertEvidenceContract } = require('../.governance/cor/stream_k_contract');

function validRecord(id = 'F-L01') {
  const expected = registry.findings[id];
  return {
    findingId: id,
    command: expected.command,
    arguments: structuredClone(expected.arguments),
    targetRoot: expected.targetRoot,
    verifierVersion: expected.verifierVersion,
  };
}

test('accepts only the reviewed command contract for a known finding', () => {
  const record = validRecord();
  assert.ok(Object.values(compareEvidenceContract('F-L01', record, registry)).every(Boolean));
  assert.deepEqual(assertEvidenceContract('F-L01', record, registry), registry.findings['F-L01']);
});

for (const [field, mutate] of [
  ['command', (r) => { r.command = 'sh'; }],
  ['arguments', (r) => { r.arguments[0] = '-c'; }],
  ['targetRoot', (r) => { r.targetRoot = '/tmp/attacker-controlled'; }],
  ['verifierVersion', (r) => { r.verifierVersion = 'untrusted'; }],
  ['findingId', (r) => { r.findingId = 'F-W01'; }],
]) {
  test(`rejects tampered ${field} before command execution`, () => {
    const record = validRecord();
    mutate(record);
    assert.throws(() => assertEvidenceContract('F-L01', record, registry), /contract mismatch/);
  });
}

test('rejects an unknown finding with no allowlisted command', () => {
  assert.throws(() => assertEvidenceContract('F-UNKNOWN', validRecord(), registry), /contract mismatch/);
});
