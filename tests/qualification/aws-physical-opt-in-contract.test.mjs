import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const corPath = path.join(root, '.github', 'workflows', 'cor.yml');
const ciPath = path.join(root, '.github', 'workflows', 'ci.yml');
const cor = fs.readFileSync(corPath, 'utf8');
const ci = fs.readFileSync(ciPath, 'utf8');

function section(source, start, end) {
  const from = source.indexOf(start);
  assert.notEqual(from, -1, `missing workflow section: ${start}`);
  const to = source.indexOf(end, from + start.length);
  assert.notEqual(to, -1, `missing workflow section boundary: ${end}`);
  return source.slice(from, to);
}

test('manual dispatch defaults AWS physical qualification to disabled', () => {
  const dispatch = section(cor, '  workflow_dispatch:', '  push:');
  assert.match(dispatch, /run_aws_physical_qualification:/);
  assert.match(dispatch, /required:\s*true/);
  assert.match(dispatch, /default:\s*false/);
  assert.match(dispatch, /type:\s*boolean/);
});

test('AWS physical gate requires explicit opt-in and a trusted release branch', () => {
  const awsJob = section(cor, '  aws-physical-gate:', '  cor-final-release-gate:');
  assert.match(awsJob, /github\.event_name == 'workflow_dispatch'/);
  assert.match(awsJob, /inputs\.run_aws_physical_qualification == true/);
  assert.match(awsJob, /vars\.AWS_PHYSICAL_QUALIFICATION_ENABLED == 'true'/);
  assert.match(awsJob, /refs\/heads\/main/);
  assert.match(awsJob, /refs\/heads\/phase4\/production-hardening/);
  assert.doesNotMatch(awsJob, /if:\s*github\.event_name != 'pull_request'/);
});

test('final gate never treats skipped AWS qualification as release certification', () => {
  const finalGate = cor.slice(cor.indexOf('  cor-final-release-gate:'));
  assert.match(finalGate, /AWS_REQUIRED:/);
  assert.match(finalGate, /COR_RESULT.*success/s);
  assert.match(finalGate, /AWS_RESULT.*skipped/s);
  assert.match(finalGate, /NOT RELEASE CERTIFIED/);
  assert.match(finalGate, /AWS_PHYSICAL_GATE_NOT_SUCCESS/);
  assert.match(finalGate, /explicitly requested AWS qualification/);
});

test('dedicated fix branches trigger non-production CI and COR validation on push', () => {
  const ciStart = ci.indexOf('\non:');
  const ciEnd = ci.indexOf('\nconcurrency:', ciStart + 1);
  const corStart = cor.indexOf('\non:');
  const corEnd = cor.indexOf('\nconcurrency:', corStart + 1);
  assert.ok(ciStart >= 0 && ciEnd > ciStart, 'CI trigger section must be present');
  assert.ok(corStart >= 0 && corEnd > corStart, 'COR trigger section must be present');
  const ciTriggers = ci.slice(ciStart + 1, ciEnd);
  const corTriggers = cor.slice(corStart + 1, corEnd);
  assert.match(ciTriggers, /push:[\s\S]*?'fix\/\*\*'/);
  assert.match(corTriggers, /push:[\s\S]*?'fix\/\*\*'/);
  assert.match(ciTriggers, /pull_request:[\s\S]*?'fix\/\*\*'/);
  assert.match(corTriggers, /pull_request:[\s\S]*?'fix\/\*\*'/);
});


test('COR signing private key is scoped only to the trusted signing step', () => {
  const corJob = section(cor, '  cor:', '  aws-physical-gate:');
  const jobEnvStart = corJob.indexOf('    env:');
  const jobStepsStart = corJob.indexOf('    steps:');
  assert.ok(jobEnvStart >= 0 && jobStepsStart > jobEnvStart, 'COR job env and steps must be present');
  const jobEnv = corJob.slice(jobEnvStart, jobStepsStart);
  assert.doesNotMatch(jobEnv, /COR_SIGNING_KEY|COR_PUBLIC_KEY/, 'signing credentials must not be job-wide');

  const trustRoot = section(cor, '      - name: Verify COR signing trust root', '      - name: Validate stream registry');
  assert.match(trustRoot, /COR_PUBLIC_KEY:\s*\$\{\{\s*secrets\.COR_PUBLIC_KEY\s*\}\}/);
  assert.match(trustRoot, /if: github\.event_name == 'workflow_dispatch'/);

  const signer = section(cor, '      - name: Sign final COR authority', '      - name: Final candidate integrity check');
  assert.match(signer, /COR_SIGNING_KEY:\s*\$\{\{\s*secrets\.COR_SIGNING_KEY\s*\}\}/);
  assert.match(signer, /if: github\.event_name == 'workflow_dispatch'/);
  assert.match(signer, /vars\.AWS_PHYSICAL_QUALIFICATION_ENABLED == 'true'/);
  assert.match(signer, /refs\/heads\/main/);
  assert.match(signer, /refs\/heads\/phase4\/production-hardening/);
});
