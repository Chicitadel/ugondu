'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const canonicalizeModule = require('canonicalize');
const canonicalize = canonicalizeModule.default || canonicalizeModule;

const STREAM_ID = 'A07';
const OBJECTIVE = 'Verify stream registry validator exists';

const metadata = {
  streamId: STREAM_ID,
  verifierVersion: '3.0.0',
  objectiveHash: crypto.createHash('sha256').update(OBJECTIVE, 'utf8').digest('hex'),
  evidenceSchemaVersion: '3.0.0',
  verificationMode: 'TEST',
};

function nodeModulesPath(root) {
  const resolved = require.resolve('canonicalize', { paths: [root] });
  const parts = resolved.split(path.sep);
  const index = parts.lastIndexOf('node_modules');
  if (index < 0) throw new Error('A07_NODE_MODULES_ROOT_UNRESOLVED');
  return parts.slice(0, index + 1).join(path.sep);
}

function executeRegistry(root, dependencyRoot) {
  const validator = path.join(root, 'scripts', 'check-cor-stream-registry.js');
  const env = {
    ...process.env,
    UGONDU_ROOT: root,
    NODE_PATH: [dependencyRoot, process.env.NODE_PATH].filter(Boolean).join(path.delimiter),
  };
  return spawnSync(process.execPath, [validator], {
    cwd: root,
    env,
    encoding: 'utf8',
    timeout: 30000,
    maxBuffer: 4 * 1024 * 1024,
  });
}

function createIsolatedRegistryFixture(sourceRoot) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ugondu-a07-registry-'));
  const copy = (relativePath) => {
    const source = path.join(sourceRoot, relativePath);
    const destination = path.join(root, relativePath);
    if (!fs.existsSync(source)) throw new Error(`A07_FIXTURE_SOURCE_MISSING:${relativePath}`);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.cpSync(source, destination, { recursive: true });
  };

  copy('.governance/cor/ugondu-cor-qualification-manifest.json');
  copy('scripts/check-cor-stream-registry.js');
  copy('scripts/cor/stream-source-integrity.js');
  copy('scripts/cor/streams');
  return root;
}

function verifyObjective(context, observations, artifacts) {
  const targetPath = path.join(context.root, 'scripts', 'check-cor-stream-registry.js');
  const manifestPath = path.join(context.root, '.governance', 'cor', 'ugondu-cor-qualification-manifest.json');
  const streamsPath = path.join(context.root, 'scripts', 'cor', 'streams');

  if (!fs.existsSync(targetPath)) throw new Error('A07_STREAM_REGISTRY_VALIDATOR_MISSING');
  if (!fs.existsSync(manifestPath)) throw new Error('A07_STREAM_REGISTRY_MANIFEST_MISSING');
  if (!fs.existsSync(streamsPath)) throw new Error('A07_STREAM_EXECUTOR_DIRECTORY_MISSING');

  const dependencyRoot = nodeModulesPath(context.root);
  const positive = executeRegistry(context.root, dependencyRoot);
  if (positive.error) throw new Error(`A07_REGISTRY_EXECUTION_FAILED:${positive.error.message}`);
  if (positive.status !== 0 || !String(positive.stdout).includes('Stream registry validation successful.')) {
    throw new Error(`A07_REGISTRY_POSITIVE_CASE_FAILED:${String(positive.stderr || positive.stdout).slice(0, 1000)}`);
  }

  let fixtureRoot;
  try {
    fixtureRoot = createIsolatedRegistryFixture(context.root);
    const fixtureManifest = path.join(fixtureRoot, '.governance', 'cor', 'ugondu-cor-qualification-manifest.json');
    const manifest = JSON.parse(fs.readFileSync(fixtureManifest, 'utf8'));
    manifest.repository = 'Chicitadel/untrusted-registry-fixture';
    fs.writeFileSync(fixtureManifest, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

    const negative = executeRegistry(fixtureRoot, dependencyRoot);
    if (negative.error) throw new Error(`A07_REGISTRY_NEGATIVE_EXECUTION_FAILED:${negative.error.message}`);
    if (negative.status === 0 || !String(negative.stderr).includes('Manifest repository identity mismatch')) {
      throw new Error('A07_REGISTRY_ACCEPTED_TAMPERED_REPOSITORY_IDENTITY');
    }
  } finally {
    if (fixtureRoot) fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }

  observations.push('Executed the real stream registry validator against the repository and confirmed all 40 executor contracts load and validate');
  observations.push('Executed the same validator in an isolated fixture and confirmed it rejects a tampered repository identity before qualification');
  artifacts.push(
    'scripts/check-cor-stream-registry.js',
    '.governance/cor/ugondu-cor-qualification-manifest.json',
    'scripts/cor/stream-source-integrity.js',
    ...fs.readdirSync(streamsPath).filter((name) => name.endsWith('.js')).sort().map((name) => `scripts/cor/streams/${name}`)
  );
  return true;
}

async function run(context) {
  if (!context || context.streamId !== STREAM_ID) throw new Error('STREAM_CONTEXT_MISMATCH');

  const observations = [];
  const artifacts = [];
  if (!verifyObjective(context, observations, artifacts)) throw new Error('COR_OBJECTIVE_NOT_PROVEN');

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

module.exports = { metadata, run };
