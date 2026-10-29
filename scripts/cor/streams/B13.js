'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const canonicalizeModule = require('canonicalize');
const canonicalize = canonicalizeModule.default || canonicalizeModule;

const STREAM_ID = 'B13';
const OBJECTIVE = 'Verify Ugondu manifest does not contain EAORCS inheritance';

const metadata = {
  streamId: STREAM_ID,
  verifierVersion: '2.0.0',
  objectiveHash: crypto.createHash('sha256').update(OBJECTIVE, 'utf8').digest('hex'),
  evidenceSchemaVersion: '3.0.0',
  verificationMode: 'STATIC',
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
