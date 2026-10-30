'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const canonicalizeModule = require('canonicalize');
const canonicalize = canonicalizeModule.default || canonicalizeModule;

const STREAM_ID = 'C22';
const OBJECTIVE = 'Verify zero hardcoded fmt strings in client repair CLI';

const metadata = {
  streamId: STREAM_ID,
  verifierVersion: '3.0.0',
  objectiveHash: crypto.createHash('sha256').update(OBJECTIVE, 'utf8').digest('hex'),
  evidenceSchemaVersion: '3.0.0',
  verificationMode: 'TEST',
};

function verifyObjective(context, observations, artifacts) {
  const relPath = 'client/cmd/repair.go';
  const targetPath = path.join(context.root, relPath);
  if (!fs.existsSync(targetPath)) {
    throw new Error('C22_REPAIR_CLI_MISSING');
  }

  const source = fs.readFileSync(targetPath, 'utf8');

  if (!source.includes('"ugondu/client/i18n"') || !source.includes('i18n.T(')) {
    throw new Error('C22_I18N_INTEGRATION_MISSING');
  }

  if (/fmt\.(?:Println|Print|Printf|Errorf)\s*\(\s*["`]/.test(source)) {
    throw new Error('C22_HARDCODED_FMT_STRING_DETECTED');
  }

  const sprintfMatches = source.match(/fmt\.Sprintf\s*\([^)]*\)/g) || [];
  for (const call of sprintfMatches) {
    if (!/fmt\.Sprintf\(\s*"%s%s"\s*,\s*i18n\.T\("bearer"\)/.test(call)) {
      throw new Error(`C22_UNAUTHORIZED_FMT_SPRINTF:${call}`);
    }
  }

  // A TEST-mode localization claim requires both the real token registry and the Go runtime test.
  const bootstrapRel = 'client/i18n/bootstrap.go';
  const bootstrapPath = path.join(context.root, bootstrapRel);
  if (!fs.existsSync(bootstrapPath)) {
    throw new Error('C22_I18N_BOOTSTRAP_MISSING');
  }
  {
    const bootstrapSource = fs.readFileSync(bootstrapPath, 'utf8');
    const tokenKeyMatches = [...source.matchAll(/i18n\.T\(\s*"([^"]+)"/g)].map((m) => m[1]);
    if (tokenKeyMatches.length === 0) {
      throw new Error('C22_NO_I18N_TOKENS_FOUND');
    }
    for (const tokenKey of tokenKeyMatches) {
      if (!bootstrapSource.includes(`"${tokenKey}":`)) {
        throw new Error(`C22_MISSING_BOOTSTRAP_TOKEN:${tokenKey}`);
      }
    }
    observations.push(`Verified all ${tokenKeyMatches.length} i18n.T token keys in client/cmd/repair.go resolve in client/i18n/bootstrap.go`);
    artifacts.push(bootstrapRel);
  }

  // Runtime behavioral execution is mandatory for TEST mode; never silently skip it.
  const repairTestRel = 'client/cmd/repair_test.go';
  const repairTestPath = path.join(context.root, repairTestRel);
  if (!fs.existsSync(repairTestPath)) {
    throw new Error('C22_REPAIR_RUNTIME_TEST_MISSING');
  }
  const goCheck = spawnSync('go', ['version'], { encoding: 'utf8', timeout: 5000 });
  if (goCheck.status !== 0) {
    throw new Error('C22_GO_TOOLCHAIN_MISSING');
  }
  const testRes = spawnSync('go', ['test', '-run', 'TestRepairCommandLocalizedExecution', './cmd'], {
    cwd: path.join(context.root, 'client'),
    encoding: 'utf8',
    timeout: 60000,
  });
  if (testRes.status !== 0) {
    throw new Error(`C22_GO_REPAIR_RUNTIME_TEST_FAILED:${String(testRes.stderr || testRes.stdout).slice(0, 1000)}`);
  }
  observations.push('Executed go test -run TestRepairCommandLocalizedExecution ./cmd: confirmed runtime localized output and adversarial status handling');
  artifacts.push(repairTestRel);

  observations.push('Confirmed client/cmd/repair.go routes all user-facing output through i18n.T with zero hardcoded fmt strings');
  artifacts.push(relPath);
  return true;
}

async function run(context) {
  if (!context || context.streamId !== STREAM_ID) {
    throw new Error('STREAM_CONTEXT_MISMATCH');
  }

  const observations = [];
  const artifacts = [];

  if (!verifyObjective(context, observations, artifacts)) {
    throw new Error('COR_OBJECTIVE_NOT_PROVEN');
  }

  const receipt = {
    status: 'PASS',
    streamId: STREAM_ID,
    executionId: context.executionId,
    commitSHA: context.commitSHA,
    treeSHA: context.treeSHA,
    objectiveHash: metadata.objectiveHash,
    startedAt: context.startedAt,
    completedAt: new Date().toISOString(),
    observations,
    artifacts,
  };

  receipt.evidenceDigest = crypto.createHash('sha256').update(canonicalize(receipt), 'utf8').digest('hex');
  return receipt;
}

module.exports = {
  metadata,
  run,
};
