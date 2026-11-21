import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { resolvePolicyTemplatePath } from '../scripts/governance/verify-policy-pack-digests.mjs';

test('policy pack template resolution accepts files contained in the pack', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ugondu-policy-pack-contained-'));
  const pack = path.join(root, 'pack');
  fs.mkdirSync(path.join(pack, 'policies'), { recursive: true });
  const template = path.join(pack, 'policies', 'read.json');
  fs.writeFileSync(template, '{"Version":"2012-10-17"}', 'utf8');
  try {
    const result = resolvePolicyTemplatePath(pack, 'policies/read.json');
    assert.equal(result.error, null);
    assert.equal(result.file, fs.realpathSync(template));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('policy pack template resolution rejects parent traversal, absolute paths and missing files', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ugondu-policy-pack-traversal-'));
  const pack = path.join(root, 'pack');
  const outside = path.join(root, 'outside.json');
  fs.mkdirSync(pack);
  fs.writeFileSync(outside, '{}', 'utf8');
  try {
    assert.match(resolvePolicyTemplatePath(pack, '../outside.json').error, /escapes policy pack directory/);
    assert.match(resolvePolicyTemplatePath(pack, outside).error, /invalid or absolute/);
    assert.match(resolvePolicyTemplatePath(pack, 'missing.json').error, /missing/);
    assert.match(resolvePolicyTemplatePath(pack, '.').error, /escapes policy pack directory/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('policy pack template resolution rejects symlinks that point outside the pack', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ugondu-policy-pack-symlink-'));
  const pack = path.join(root, 'pack');
  const outside = path.join(root, 'outside.json');
  fs.mkdirSync(pack);
  fs.writeFileSync(outside, '{"outside":true}', 'utf8');
  const link = path.join(pack, 'outside-link.json');
  try {
    try {
      fs.symlinkSync(outside, link);
    } catch (error) {
      if (['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) {
        t.skip(`symlink creation unavailable in this environment: ${error.code}`);
        return;
      }
      throw error;
    }
    const result = resolvePolicyTemplatePath(pack, 'outside-link.json');
    assert.equal(result.file, null);
    assert.match(result.error, /resolves outside policy pack directory/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
