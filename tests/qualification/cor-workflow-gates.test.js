/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Qualification / COR Workflow Gate Guardrails
 * File           : cor-workflow-gates.test.js
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-21
 * Last Modified  : 2026-10-21
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance:
 * - Corporate Policy Governed
 * - Security Reviewed
 * - Architecture Controlled
 *
 * Guards COR audit findings P0-A (untagged AWS role-assumption fallback) and
 * P0-B (COR job able to succeed while the AWS physical gate fails).
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const WORKFLOW = path.resolve(__dirname, '../../.github/workflows/cor.yml');
const text = fs.readFileSync(WORKFLOW, 'utf8').replace(/\r\n/g, '\n');

// Minimal structural reader for the fixed layout of this workflow file.
// Deliberately dependency-free: the guard must run wherever `node` runs.
function parseJobs(src) {
  const body = src.slice(src.indexOf('\njobs:\n') + 6);
  const out = {};
  const parts = body.split(/^  ([A-Za-z0-9_-]+):\s*$/m);
  for (let i = 1; i < parts.length; i += 2) out[parts[i]] = parseJob(parts[i + 1]);
  return out;
}

function parseJob(block) {
  const stepsAt = block.search(/^    steps:\s*$/m);
  const head = stepsAt >= 0 ? block.slice(0, stepsAt) : block;
  const stepsSrc = stepsAt >= 0 ? block.slice(stepsAt) : '';
  const needsInline = head.match(/^    needs:\s*\[(.*)\]\s*$/m);
  const needsList = head.match(/^    needs:\s*\n((?:      - .+\n?)+)/m);
  const needs = needsInline
    ? needsInline[1].split(',').map((s) => s.trim()).filter(Boolean)
    : needsList
      ? needsList[1].split('\n').map((l) => l.replace(/^\s*-\s*/, '').trim()).filter(Boolean)
      : [];
  const ifMatch = head.match(/^    if:\s*(.+)$/m);
  const steps = stepsSrc
    .split(/^      - (?=name:)/m)
    .slice(1)
    .map((s) => {
      const name = (s.match(/^name:\s*(.+)$/m) || [])[1];
      const runAt = s.search(/^        run:\s*\|\s*$/m);
      const run = runAt >= 0
        ? s.slice(runAt).split('\n').slice(1)
            .filter((l, idx, a) => l.startsWith('          ') || l.trim() === '' )
            .join('\n')
        : ((s.match(/^        run:\s*(.+)$/m) || [])[1] || '');
      const envBlock = s.match(/^        env:\n((?:          .+\n?)+)/m);
      const env = {};
      if (envBlock) {
        for (const l of envBlock[1].split('\n')) {
          const m = l.match(/^\s+([A-Z0-9_]+):\s*(.*)$/);
          if (m) env[m[1]] = m[2];
        }
      }
      return { name: (name || '').trim(), run, env };
    });
  return { needs, if: ifMatch ? ifMatch[1].trim() : undefined, steps };
}

const jobs = parseJobs(text);

function step(job, name) {
  const s = job.steps.find((x) => x.name === name);
  assert.ok(s, `step not found: ${name}`);
  return s;
}
test('COR-WF-001 tagged assume-role step has no untagged fallback', () => {
  const run = step(jobs['aws-physical-gate'], 'Assume Tagged Execution Session').run;
  const assumeCalls = run.match(/aws sts assume-role/g) || [];
  assert.equal(assumeCalls.length, 1, 'exactly one assume-role call is permitted');
  assert.match(run, /--tags "Key=UgonduTransactionId,Value=\$TX_ID" "Key=UgonduCOR,Value=true"/);
  const callStart = run.indexOf('aws sts assume-role');
  const callEnd = run.indexOf(')', run.indexOf('--output text', callStart));
  const call = run.slice(callStart, callEnd + 1);
  assert.doesNotMatch(call, /\|\||&&|;/, 'assume-role must not be chained to any fallback');
  assert.doesNotMatch(run, /\|\|\s*\\\\?\s*\r?\n?\s*aws\s/, 'no || aws ... retry permitted');
  assert.doesNotMatch(run, /2>\/dev\/null/, 'assume-role errors must not be silenced');
  assert.match(run, /set -euo pipefail/);
});

test('COR-WF-002 assumed identity is verified before credentials are exported', () => {
  const run = step(jobs['aws-physical-gate'], 'Assume Tagged Execution Session').run;
  const verifyAt = run.indexOf('get-caller-identity');
  const exportAt = run.indexOf('GITHUB_ENV');
  assert.ok(verifyAt > 0 && exportAt > verifyAt, 'identity check must precede export');
  assert.match(run, /::add-mask::\$AK/);
  assert.match(run, /::add-mask::\$SK/);
  assert.match(run, /::add-mask::\$ST/);
});

test('COR-WF-003 physical gate mutating steps follow the tagged session step', () => {
  const names = jobs['aws-physical-gate'].steps.map((s) => s.name);
  const session = names.indexOf('Assume Tagged Execution Session');
  for (const n of [
    'Run physical certification',
    'Run physical fargate certification',
    'Assert zero residual resources cleanup verification',
  ]) {
    assert.ok(names.indexOf(n) > session, `${n} must run after the tagged session`);
  }
});

test('COR-WF-004 final release gate depends on every mandatory gate', () => {
  const gate = jobs['cor-final-release-gate'];
  assert.ok(gate, 'cor-final-release-gate job must exist');
  assert.deepEqual([...gate.needs].sort(), ['aws-physical-gate', 'cor']);
  assert.equal(gate.if, 'always()', 'gate must evaluate even when children fail or skip');
});

test('COR-WF-005 final gate accepts only success (rejects skipped/cancelled/failure)', () => {
  const run = step(jobs['cor-final-release-gate'], 'Require every mandatory gate to have succeeded').run;
  assert.match(run, /!= "success"/);
  assert.match(run, /exit 1/);
  const env = step(jobs['cor-final-release-gate'], 'Require every mandatory gate to have succeeded').env;
  assert.match(env.COR_RESULT, /needs\.cor\.result/);
  assert.match(env.AWS_RESULT, /needs\.aws-physical-gate\.result/);
});

test('COR-WF-006 every mandatory gate job is a dependency of the final gate', () => {
  const mandatory = Object.keys(jobs).filter((k) => k !== 'cor-final-release-gate');
  const needs = jobs['cor-final-release-gate'].needs;
  for (const j of mandatory) assert.ok(needs.includes(j), `final gate must need '${j}'`);
});
