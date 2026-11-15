'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const runnerPath = path.join(__dirname, '..', 'scripts', 'run-cor-gates.js');
const runner = fs.readFileSync(runnerPath, 'utf8');

test('evidence verification is mandatory even when legacy skip environment is set', () => {
  assert.match(runner, /^\s*'tests\/evidence-verification\.test\.js',\s*$/m);
  assert.doesNotMatch(runner, /UGONDU_SKIP_EVIDENCE_GATE/);
});

test('runner documentation does not advertise a build skip that is rejected at runtime', () => {
  assert.match(runner, /Build skipping is prohibited/);
  assert.doesNotMatch(runner, /Skip with UGONDU_SKIP_BUILD=true/);
});

test('missing mandatory suites and failed suites force a non-zero exit', () => {
  assert.match(
    runner,
    /if\s*\(results\.failed\s*>\s*0\s*\|\|\s*results\.notRun\s*>\s*0\)\s*process\.exit\(1\);/,
  );
});
