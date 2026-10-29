'use strict';

function findVerifierStub(source) {
  if (typeof source !== 'string') return 'SOURCE_NOT_TEXT';
  const checks = [
    ['ASSERT_CHECK_ALWAYS_TRUE', /function\s+assertCheck\s*\(\s*\)\s*\{\s*return\s+true\s*;?\s*\}/],
    ['PRETEND_CHECK_COMMENT', /pretend to check|assert function to bypass the cor-engine stub rejection/i],
    ['MOCK_FINGERPRINT', /mock-fingerprint/i],
    ['SYNTHETIC_VERIFIED_SOURCE', /artifacts\.push\s*\(\s*['"]verified_source['"]\s*\)/],
  ];
  for (const [code, pattern] of checks) {
    if (pattern.test(source)) return code;
  }
  return null;
}

function assertNoVerifierStub(source, streamId) {
  const finding = findVerifierStub(source);
  if (finding) throw new Error(`COR_STREAM_VERIFIER_STUB_REJECTED:${streamId}:${finding}`);
}

module.exports = { findVerifierStub, assertNoVerifierStub };
