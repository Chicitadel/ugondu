'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const canonicalizeModule = require('canonicalize');
const canonicalize = canonicalizeModule.default || canonicalizeModule;

const STREAM_ID = 'B13';
const OBJECTIVE = 'Verify Ugondu manifest does not contain EAORCS inheritance';

const metadata = {
  streamId: STREAM_ID,
  verifierVersion: '3.0.0',
  objectiveHash: crypto.createHash('sha256').update(OBJECTIVE, 'utf8').digest('hex'),
  evidenceSchemaVersion: '3.0.0',
  verificationMode: 'TEST',
};

function verifyObjective(context, observations, artifacts) {
  const manifestRel = '.governance/cor/ugondu-cor-qualification-manifest.json';
  const manifestPath = path.join(context.root, manifestRel);
  if (!fs.existsSync(manifestPath)) {
    throw new Error('B13_MANIFEST_MISSING');
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    throw new Error(`B13_MANIFEST_INVALID_JSON:${error.message}`);
  }

  if (manifest.repository !== 'Chicitadel/ugondu' || /eaorcs/i.test(String(manifest.repository || ''))) {
    throw new Error('B13_REPOSITORY_IDENTITY_INVALID');
  }

  for (const forbiddenField of ['inherits', 'parentManifest', 'extends', 'baseManifest', 'sourceRepository']) {
    if (forbiddenField in manifest) {
      throw new Error(`B13_FORBIDDEN_INHERITANCE_FIELD:${forbiddenField}`);
    }
  }

  if (!Array.isArray(manifest.streams) || manifest.streams.length === 0) {
    throw new Error('B13_STREAMS_MISSING');
  }

  for (const stream of manifest.streams) {
    if (/eaorcs/i.test(String(stream.id || '')) || /eaorcs/i.test(String(stream.status || ''))) {
      throw new Error(`B13_STREAM_METADATA_EAORCS_CONTAMINATION:${stream.id}`);
    }
    if (stream.id !== 'B13' && /eaorcs/i.test(String(stream.objective || ''))) {
      throw new Error(`B13_STREAM_OBJECTIVE_EAORCS_CONTAMINATION:${stream.id}`);
    }
    if (!Array.isArray(stream.location) || stream.location.some((loc) => /eaorcs/i.test(String(loc)))) {
      throw new Error(`B13_STREAM_LOCATION_EAORCS_CONTAMINATION:${stream.id}`);
    }
  }

  // Runtime execution proof when check-cor-stream-registry.js is present
  const validatorRel = 'scripts/check-cor-stream-registry.js';
  const validatorPath = path.join(context.root, validatorRel);
  if (fs.existsSync(validatorPath)) {
    const pos = spawnSync(process.execPath, [validatorPath], {
      cwd: context.root,
      env: { ...process.env, UGONDU_ROOT: context.root },
      encoding: 'utf8',
      timeout: 30000,
    });
    if (pos.status !== 0) {
      throw new Error(`B13_REGISTRY_VALIDATOR_RUNTIME_FAILED:${String(pos.stderr || pos.stdout).slice(0, 500)}`);
    }

    let tmpRoot;
    try {
      tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ugondu-b13-runtime-'));
      const tmpGov = path.join(tmpRoot, '.governance', 'cor');
      fs.mkdirSync(tmpGov, { recursive: true });
      const contaminated = {
        ...manifest,
        repository: 'Chicitadel/eaorcs-platform',
      };
      fs.writeFileSync(path.join(tmpGov, 'ugondu-cor-qualification-manifest.json'), JSON.stringify(contaminated, null, 2), 'utf8');

      const neg = spawnSync(process.execPath, [validatorPath], {
        cwd: context.root,
        env: { ...process.env, UGONDU_ROOT: tmpRoot },
        encoding: 'utf8',
        timeout: 15000,
      });
      if (neg.status === 0 || !String(neg.stderr).includes('Manifest repository identity mismatch')) {
        throw new Error('B13_ADVERSARIAL_EAORCS_REPOSITORY_NOT_REJECTED');
      }
      observations.push('Executed scripts/check-cor-stream-registry.js at runtime: confirmed positive pass on Chicitadel/ugondu and rejection of adversarial EAORCS repository identity');
      artifacts.push(validatorRel);
    } finally {
      if (tmpRoot) {
        fs.rmSync(tmpRoot, { recursive: true, force: true });
      }
    }
  }

  observations.push('Confirmed Ugondu COR qualification manifest is bound exclusively to Chicitadel/ugondu with zero EAORCS inheritance');
  artifacts.push(manifestRel);
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
