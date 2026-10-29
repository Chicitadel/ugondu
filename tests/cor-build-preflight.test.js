'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { runEngineBuildPreflight } = require('../scripts/cor/build-preflight');

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ugondu-cor-build-'));
  fs.mkdirSync(path.join(root, 'server', 'engine-core'), { recursive: true });
  fs.writeFileSync(path.join(root, 'server', 'engine-core', 'tsconfig.json'), '{}\n');
  return root;
}

test('failed TypeScript build fails closed and preserves failure diagnostics', () => {
  const root = fixture();
  const errors = [];
  try {
    const result = runEngineBuildPreflight({
      root,
      spawnSync: () => ({ status: 2, signal: null, stdout: '', stderr: 'TS compilation failed' }),
      stderr: (value) => errors.push(value),
    });
    assert.equal(result.ok, false);
    assert.equal(result.exitCode, 2);
    assert.match(result.reason, /status 2/);
    assert.match(errors.join(''), /TS compilation failed/);
    assert.match(errors.join(''), /BUILD PREFLIGHT FAILED/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('indeterminate timeout/signal result fails closed', () => {
  const root = fixture();
  try {
    const result = runEngineBuildPreflight({
      root,
      spawnSync: () => ({ status: null, signal: 'SIGTERM', error: null }),
    });
    assert.equal(result.ok, false);
    assert.match(result.reason, /signal SIGTERM/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('missing engine build configuration fails closed rather than using stale dist', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ugondu-cor-build-missing-'));
  try {
    const result = runEngineBuildPreflight({ root, spawnSync: () => { throw new Error('must not run'); } });
    assert.equal(result.ok, false);
    assert.match(result.reason, /tsconfig.json is missing/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('successful build permits COR suites', () => {
  const root = fixture();
  try {
    const result = runEngineBuildPreflight({
      root,
      spawnSync: () => ({ status: 0, signal: null, stdout: '', stderr: '' }),
    });
    assert.equal(result.ok, true);
    assert.equal(result.skipped, false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('explicit build skip is visible and distinct from a successful build', () => {
  const root = fixture();
  const messages = [];
  try {
    const result = runEngineBuildPreflight({
      root,
      skipBuild: true,
      spawnSync: () => { throw new Error('skip must not invoke compiler'); },
      stdout: (value) => messages.push(value),
    });
    assert.equal(result.ok, true);
    assert.equal(result.skipped, true);
    assert.match(messages.join(''), /explicit UGONDU_SKIP_BUILD=true/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
