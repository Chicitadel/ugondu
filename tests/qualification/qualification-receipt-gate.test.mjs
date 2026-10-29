/**
 * Candidate-bound qualification contract regression tests.
 *
 * The committed manifest is the 40-stream objective registry; PLANNED is
 * intentional and is not a pass claim. Runtime completion is represented by
 * the generated evidence ledger and independently checked by cor-finalize.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifestPath = path.join(root, '.governance/cor/ugondu-cor-qualification-manifest.json');
const registryValidatorPath = path.join(root, 'scripts/check-cor-stream-registry.js');
const enginePath = path.join(root, 'scripts/cor-engine.js');
const finalizerPath = path.join(root, 'scripts/cor-finalize.js');
const workflowPath = path.join(root, '.github/workflows/cor.yml');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const registryValidator = fs.readFileSync(registryValidatorPath, 'utf8');
const engine = fs.readFileSync(enginePath, 'utf8');
const finalizer = fs.readFileSync(finalizerPath, 'utf8');
const workflow = fs.readFileSync(workflowPath, 'utf8');

const expectedIds = [
  'A01','A02','A03','A04','A05','A06','A07','A08',
  'B09','B10','B11','B12','B13','B14','B15','B16',
  'C17','C18','C19','C20','C21','C22',
  'D23','D24','D25','D26','D27','D28',
  'E29','E30','E31','E32','E33','E34',
  'F35','F36','F37','F38','F39','F40',
];

test('qualification manifest remains an objective registry, never a self-certified result', () => {
  assert.equal(manifest.repository, 'Chicitadel/ugondu');
  assert.deepEqual(manifest.streams.map((stream) => stream.id), expectedIds);
  assert.ok(manifest.streams.every((stream) => stream.status === 'PLANNED'));
  assert.ok(manifest.streams.every((stream) => typeof stream.objective === 'string' && stream.objective.trim()));
  assert.ok(manifest.streams.every((stream) => Array.isArray(stream.location) && stream.location.length > 0));
});

test('registry validator fails closed on statuses that imply execution or certification', () => {
  assert.match(registryValidator, /stream\.status\s*!==\s*['"]PLANNED['"]/);
  assert.match(registryValidator, /objective\.trim\(\)/);
  assert.match(registryValidator, /location\.length\s*===\s*0/);
  assert.match(registryValidator, /candidateCommit/);
  assert.match(registryValidator, /candidateTree/);
});

test('COR engine binds all receipts to one immutable commit and tree and requires all 40 streams', () => {
  assert.match(engine, /git\(\[['"]rev-parse['"],\s*['"]HEAD['"]\]\)/);
  assert.match(engine, /git\(\[['"]rev-parse['"],\s*['"]HEAD\^\{tree\}['"]\]\)/);
  assert.match(engine, /receipt\.commitSHA\s*!==\s*commitSHA/);
  assert.match(engine, /receipt\.treeSHA\s*!==\s*treeSHA/);
  assert.match(engine, /ledger\.streams\.length\s*!==\s*40/);
  assert.match(engine, /ledger\.evidenceRoot/);
  assert.match(engine, /evidence-ledger\.json/);
  assert.match(engine, /gate-summary\.json/);
});

test('independent finalizer requires exact 40-stream coverage and candidate-bound evidence', () => {
  assert.match(finalizer, /ledger\.streams\.length\s*!==\s*40/);
  assert.match(finalizer, /receiptIds/);
  assert.match(finalizer, /new Set\(receiptIds\)\.size\s*!==\s*40/);
  assert.match(finalizer, /ledger\.candidate\.commitSHA/);
  assert.match(finalizer, /ledger\.candidate\.treeSHA/);
  assert.match(finalizer, /receipt\.commitSHA\s*!==\s*commitSHA/);
  assert.match(finalizer, /receipt\.treeSHA\s*!==\s*treeSHA/);
  assert.match(finalizer, /evidenceDigest/);
  assert.match(finalizer, /ledger\.evidenceRoot/);
  assert.match(finalizer, /READY_FOR_COR_SIGNATURE/);
});

test('COR workflow runs the engine before independent finalization and must upload evidence', () => {
  const engineAt = workflow.indexOf('run: node scripts/cor-engine.js');
  const finalizeAt = workflow.indexOf('run: node scripts/cor-finalize.js');
  const uploadAt = workflow.indexOf('name: Upload COR evidence');
  assert.ok(engineAt >= 0 && finalizeAt > engineAt, 'engine must precede independent finalization');
  assert.ok(uploadAt > finalizeAt, 'evidence upload must follow finalization');
  const uploadBlock = workflow.slice(uploadAt, workflow.indexOf('\n\n  aws-physical-gate:', uploadAt));
  assert.match(uploadBlock, /if: always\(\)/);
  assert.match(uploadBlock, /if-no-files-found: error/);
  assert.match(uploadBlock, /ugondu-cor-evidence-\$\{\{ github\.sha \}\}/);
});
