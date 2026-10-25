import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { isPathWithinDirectory } from '../scripts/governance/workspace-boundary.mjs';
import { loadRequiredDictionary } from '../scripts/governance/required-dictionary.mjs';
import { isWorkspacePathWithinRoot } from '../scripts/governance/validate-test-coverage.mjs';

test('T04 regression: workspace sibling sharing a path prefix is outside the boundary', () => {
  const root = path.join(os.tmpdir(), 'ugondu-boundary-fixture');
  assert.equal(isPathWithinDirectory(path.join(root, 'server', 'shared'), path.join(root, 'server', 'shared', 'src', 'index.ts')), true);
  assert.equal(isPathWithinDirectory(path.join(root, 'server', 'shared'), path.join(root, 'server', 'shared2', 'src', 'index.ts')), false);
  assert.equal(isPathWithinDirectory(path.join(root, 'server', 'shared'), path.join(root, 'server', 'engine-core', 'src', 'index.ts')), false);
  assert.equal(isPathWithinDirectory(path.join(root, 'server', 'shared'), path.join(root, 'server', 'shared', '..', 'engine-core', 'src', 'index.ts')), false);
  assert.equal(isPathWithinDirectory(path.join(root, 'server', 'shared'), path.join(root, 'server', 'shared')), true);
});

test('governance regression: workspace declarations cannot escape the repository root', () => {
  const root = path.join(os.tmpdir(), 'ugondu-repository-root');
  assert.equal(isWorkspacePathWithinRoot(root, 'server/shared'), true);
  assert.equal(isWorkspacePathWithinRoot(root, 'server/shared2'), true);
  assert.equal(isWorkspacePathWithinRoot(root, '../outside-workspace'), false);
  assert.equal(isWorkspacePathWithinRoot(root, 'server/../../outside-workspace'), false);
  assert.equal(isWorkspacePathWithinRoot(root, path.join(root, 'external-workspace')), false);
  assert.equal(isWorkspacePathWithinRoot(root, ''), false);
  assert.equal(isWorkspacePathWithinRoot(root, null), false);
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

test('governance regression: attribution, T03, and T04 verifiers are mandatory in both aggregate and CI gates', () => {
  const root = process.cwd();
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const aggregate = packageJson.scripts['governance:validate'];
  assert.match(aggregate, /npm run verify:attribution/);
  assert.match(aggregate, /npm run verify:t03/);
  assert.match(aggregate, /npm run build/);
  assert.ok(aggregate.indexOf('npm run build') < aggregate.indexOf('npm run verify:t04'), 'aggregate validation must build workspace artifacts before T04');
  assert.match(aggregate, /npm run verify:t04/);
  assert.match(aggregate, /npm run test:governance/);

  const workflow = fs.readFileSync(path.join(root, '.github/workflows/ci.yml'), 'utf8');
  assert.match(workflow, /name: Verify corporate AI attribution policy\n        run: npm run verify:attribution/);
  assert.match(workflow, /name: Verify T03 tokenization conformance\n        run: npm run verify:t03/);
  assert.match(workflow, /name: Build workspace artifacts required by T04\n        run: npm ci && npm run build/);
  assert.match(workflow, /name: Verify T04 microservice workspace boundaries\n        run: npm run verify:t04/);
  assert.ok(workflow.indexOf('name: Build workspace artifacts required by T04') < workflow.indexOf('name: Verify T04 microservice workspace boundaries'), 'CI must build workspace artifacts before T04');
  assert.match(workflow, /name: Run governance verifier regression tests\n        run: npm run test:governance/);
});
