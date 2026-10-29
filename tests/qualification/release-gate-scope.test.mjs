import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const workflow = fs.readFileSync(
  path.resolve(process.cwd(), '.github/workflows/cor.yml'),
  'utf8'
);
const requiredPredicate = "github.event_name == 'workflow_dispatch' && inputs.run_aws_physical_qualification == true && vars.AWS_PHYSICAL_QUALIFICATION_ENABLED == 'true' && (github.ref == 'refs/heads/main' || github.ref == 'refs/heads/phase4/production-hardening')";

function stepBlock(name, nextName) {
  const start = workflow.indexOf(`      - name: ${name}`);
  assert.notEqual(start, -1, `missing step: ${name}`);
  const end = workflow.indexOf(`      - name: ${nextName}`, start + 1);
  assert.notEqual(end, -1, `missing boundary step: ${nextName}`);
  return workflow.slice(start, end);
}

test('all release-only COR checks share the exact opt-in predicate', () => {
  for (const [name, next] of [
    ['Verify evidence freshness (candidate-bound, evidence-only descendant)', 'Verify release integrity'],
    ['Verify COR signing trust root', 'Validate stream registry'],
    ['Sign final COR authority', 'Final candidate integrity check']
  ]) {
    const block = stepBlock(name, next);
    assert.ok(block.includes(requiredPredicate), `${name} must require explicit opt-in and trusted branch`);
  }
});

test('AWS credentials and signing secrets are not job-wide', () => {
  const corStart = workflow.indexOf('\n  cor:\n');
  const awsStart = workflow.indexOf('\n  aws-physical-gate:\n');
  assert.ok(corStart >= 0 && awsStart > corStart, 'expected COR and AWS job boundaries');
  const corJobHeader = workflow.slice(corStart, workflow.indexOf('    steps:\n', corStart));
  assert.doesNotMatch(corJobHeader, /COR_SIGNING_KEY|COR_PUBLIC_KEY|AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY/);
  assert.match(workflow, /COR_SIGNING_KEY:\s*\$\{\{\s*secrets\.COR_SIGNING_KEY\s*\}\}/);
  assert.match(workflow, /COR_PUBLIC_KEY:\s*\$\{\{\s*secrets\.COR_PUBLIC_KEY\s*\}\}/);
});

test('physical AWS gate cannot run on push or pull request', () => {
  const awsJob = workflow.slice(workflow.indexOf('  aws-physical-gate:'));
  const condition = awsJob.match(/^    if:\s*(.+)$/m);
  assert.ok(condition, 'AWS physical job must have an explicit if condition');
  assert.equal(condition[1].trim(), requiredPredicate);
  assert.match(workflow, /default:\s*false/);
});
