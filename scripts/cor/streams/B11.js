'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const canonicalizeModule = require('canonicalize');
const canonicalize = canonicalizeModule.default || canonicalizeModule;

const STREAM_ID = 'B11';
const OBJECTIVE = 'Verify locale update script does not overwrite translations';

const metadata = {
  streamId: STREAM_ID,
  verifierVersion: '3.0.0',
  objectiveHash: crypto.createHash('sha256').update(OBJECTIVE, 'utf8').digest('hex'),
  evidenceSchemaVersion: '3.0.0',
  verificationMode: 'TEST',
};

function createFixture(sourceRoot, targetLocale) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ugondu-b11-locale-'));
  const scriptSource = path.join(sourceRoot, 'scripts', 'update-locales.js');
  if (!fs.existsSync(scriptSource)) throw new Error('B11_UPDATE_LOCALES_SCRIPT_MISSING');
  const scriptTarget = path.join(root, 'scripts', 'update-locales.js');
  const localeDir = path.join(root, 'server', 'shared', 'locales');
  fs.mkdirSync(path.dirname(scriptTarget), { recursive: true });
  fs.mkdirSync(localeDir, { recursive: true });
  fs.copyFileSync(scriptSource, scriptTarget);
  fs.writeFileSync(path.join(localeDir, 'en.json'), JSON.stringify({
    greeting: 'Hello',
    nested: { farewell: 'Goodbye' },
  }, null, 2));
  fs.writeFileSync(path.join(localeDir, 'fr.json'), JSON.stringify(targetLocale, null, 2));
  return { root, scriptTarget, localeTarget: path.join(localeDir, 'fr.json') };
}

function executeUpdater(fixture) {
  return spawnSync(process.execPath, [fixture.scriptTarget], {
    cwd: fixture.root,
    encoding: 'utf8',
    timeout: 15000,
    maxBuffer: 1024 * 1024,
  });
}

function verifyObjective(context, observations, artifacts) {
  const scriptPath = path.join(context.root, 'scripts', 'update-locales.js');
  if (!fs.existsSync(scriptPath)) throw new Error('B11_UPDATE_LOCALES_SCRIPT_MISSING');

  const fixtures = [];
  try {
    const valid = createFixture(context.root, {
      greeting: 'Bonjour',
      nested: { farewell: 'Au revoir' },
    });
    fixtures.push(valid);
    const validRun = executeUpdater(valid);
    if (validRun.error) throw new Error(`B11_VALID_EXECUTION_FAILED:${validRun.error.message}`);
    if (validRun.status !== 0) throw new Error(`B11_VALID_LOCALE_UPDATE_REJECTED:${String(validRun.stderr).slice(0, 500)}`);
    const preserved = JSON.parse(fs.readFileSync(valid.localeTarget, 'utf8'));
    if (preserved.greeting !== 'Bonjour' || preserved.nested.farewell !== 'Au revoir') {
      throw new Error('B11_EXISTING_TRANSLATION_OVERWRITTEN');
    }

    const missing = createFixture(context.root, { greeting: 'Bonjour' });
    fixtures.push(missing);
    const missingRun = executeUpdater(missing);
    if (missingRun.error) throw new Error(`B11_MISSING_KEY_EXECUTION_FAILED:${missingRun.error.message}`);
    if (missingRun.status === 0 || !String(missingRun.stderr).includes('Cannot silently insert English source')) {
      throw new Error('B11_MISSING_TRANSLATION_KEY_NOT_BLOCKED');
    }

    const extra = createFixture(context.root, {
      greeting: 'Bonjour',
      nested: { farewell: 'Au revoir' },
      unexpected: 'Unexpected',
    });
    fixtures.push(extra);
    const extraRun = executeUpdater(extra);
    if (extraRun.error) throw new Error(`B11_EXTRA_KEY_EXECUTION_FAILED:${extraRun.error.message}`);
    if (extraRun.status === 0 || !String(extraRun.stderr).includes('Extra translation key')) {
      throw new Error('B11_EXTRA_TRANSLATION_KEY_NOT_BLOCKED');
    }
  } finally {
    for (const fixture of fixtures) fs.rmSync(fixture.root, { recursive: true, force: true });
  }

  observations.push('Executed the real locale updater in an isolated fixture and confirmed existing translated leaf values remain unchanged');
  observations.push('Executed adversarial missing-key and extra-key fixtures and confirmed both are rejected with non-zero exit');
  artifacts.push('scripts/update-locales.js');
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
