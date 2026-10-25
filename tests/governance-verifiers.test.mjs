import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { isPathWithinDirectory } from '../scripts/governance/workspace-boundary.mjs';
import { loadRequiredDictionary } from '../scripts/governance/required-dictionary.mjs';

test('T04 regression: workspace sibling sharing a path prefix is outside the boundary', () => {
  const root = path.join(os.tmpdir(), 'ugondu-boundary-fixture');
  assert.equal(isPathWithinDirectory(path.join(root, 'server', 'shared'), path.join(root, 'server', 'shared', 'src', 'index.ts')), true);
  assert.equal(isPathWithinDirectory(path.join(root, 'server', 'shared'), path.join(root, 'server', 'shared2', 'src', 'index.ts')), false);
  assert.equal(isPathWithinDirectory(path.join(root, 'server', 'shared'), path.join(root, 'server', 'engine-core', 'src', 'index.ts')), false);
  assert.equal(isPathWithinDirectory(path.join(root, 'server', 'shared'), path.join(root, 'server', 'shared', '..', 'engine-core', 'src', 'index.ts')), false);
  assert.equal(isPathWithinDirectory(path.join(root, 'server', 'shared'), path.join(root, 'server', 'shared')), true);
});

test('T03 regression: required locale dictionary fails closed when missing', () => {
  const missing = path.join(os.tmpdir(), 'ugondu-missing-locale-dictionary.json');
  assert.throws(() => loadRequiredDictionary(missing, (value) => value), /is missing/);
});

test('T03 regression: malformed locale JSON fails closed', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ugondu-locale-'));
  const file = path.join(temp, 'en.json');
  try {
    fs.writeFileSync(file, '{invalid', 'utf8');
    assert.throws(() => loadRequiredDictionary(file, (value) => value), /invalid JSON/);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('T03 regression: non-object locale dictionary roots are rejected', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ugondu-locale-root-'));
  const file = path.join(temp, 'en.json');
  try {
    fs.writeFileSync(file, '[]', 'utf8');
    assert.throws(() => loadRequiredDictionary(file, (value) => value), /root must be an object/);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('T03 regression: unknown static token is not treated as dictionary-compliant', async () => {
  const { hasDictionaryToken } = await import('../scripts/governance/required-dictionary.mjs');
  assert.equal(hasDictionaryToken({ 'profile.title': 'Title' }, 'profile.title'), true);
  assert.equal(hasDictionaryToken({ 'profile.title': 'Title' }, 'profile.missing'), false);
});

test('T03 regression: dictionary flattener requires function argument', () => {
  assert.throws(() => loadRequiredDictionary('locales/en.json', null), /flattenDictionary must be a function/);
});

test('T03 regression: token lookup rejects inherited prototype properties', async () => {
  const { hasDictionaryToken } = await import('../scripts/governance/required-dictionary.mjs');
  assert.equal(hasDictionaryToken({}, 'toString'), false);
  assert.equal(hasDictionaryToken({}, 'valueOf'), false);
  assert.equal(hasDictionaryToken({}, '__proto__'), false);
});
