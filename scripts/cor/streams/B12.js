'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const canonicalizeModule = require('canonicalize');
const canonicalize = canonicalizeModule.default || canonicalizeModule;

const STREAM_ID = 'B12';
const OBJECTIVE = 'Verify locale validation script checks key parity';

const metadata = {
  streamId: STREAM_ID,
  verifierVersion: '3.0.0',
  objectiveHash: crypto.createHash('sha256').update(OBJECTIVE, 'utf8').digest('hex'),
  evidenceSchemaVersion: '3.0.0',
  verificationMode: 'TEST',
};

const REQUIRED_LOCALES = [
  'ar.json', 'de.json', 'es.json', 'fr.json', 'hi.json',
  'it.json', 'ja.json', 'ko.json', 'pt.json', 'ru.json', 'zh.json',
];

function createMinimalLocalesSet(dir, modifier) {
  const en = { greeting: 'Welcome', farewell: 'Goodbye' };
  fs.writeFileSync(path.join(dir, 'en.json'), JSON.stringify(en, null, 2), 'utf8');

  for (const locale of REQUIRED_LOCALES) {
    let content = { greeting: `Translated ${locale}`, farewell: `Bye ${locale}` };
    if (modifier && modifier.locale === locale) {
      content = modifier.transform(content);
    }
    fs.writeFileSync(path.join(dir, locale), JSON.stringify(content, null, 2), 'utf8');
  }
}

function runValidatorProcess(scriptPath, cwd, targetDir) {
  return spawnSync(process.execPath, [scriptPath, targetDir], {
    cwd,
    encoding: 'utf8',
    timeout: 15000,
  });
}

function verifyObjective(context, observations, artifacts) {
  const targetPath = path.join(context.root, 'scripts', 'validate-locales.js');
  if (!fs.existsSync(targetPath)) {
    throw new Error('B12_VALIDATE_LOCALES_SCRIPT_MISSING');
  }

  const source = fs.readFileSync(targetPath, 'utf8');

  if (!source.includes('requiredLocales') || !source.includes('function flatten(')) {
    throw new Error('B12_FLATTEN_OR_REQUIRED_LOCALES_MISSING');
  }
  if (!source.includes('sourceKeyNames.filter(k => !targetKeyNames.includes(k))')) {
    throw new Error('B12_MISSING_KEY_PARITY_CHECK_ABSENT');
  }
  if (!source.includes('targetKeyNames.filter(k => !sourceKeyNames.includes(k))')) {
    throw new Error('B12_EXTRA_KEY_PARITY_CHECK_ABSENT');
  }
  if (!source.includes('getPlaceholders(') || !source.includes('fakePrefixPattern')) {
    throw new Error('B12_PLACEHOLDER_OR_PREFIX_CHECK_ABSENT');
  }

  // Runtime behavioral execution against repository locales if available
  const hasRepoLocales = fs.existsSync(path.join(context.root, 'locales')) ||
                         fs.existsSync(path.join(context.root, 'server', 'shared', 'locales'));

  if (hasRepoLocales) {
    const positive = spawnSync(process.execPath, [targetPath], {
      cwd: context.root,
      encoding: 'utf8',
      timeout: 30000,
    });
    if (positive.error) {
      throw new Error(`B12_LOCALE_VALIDATOR_PROCESS_ERROR:${positive.error.message}`);
    }
    if (positive.status !== 0 || !String(positive.stdout).includes('Localization validation PASS')) {
      throw new Error(`B12_POSITIVE_REPO_VALIDATION_FAILED:${String(positive.stderr || positive.stdout).slice(0, 500)}`);
    }
    observations.push('Executed scripts/validate-locales.js on live repository locales: confirmed exit status 0 and positive PASS confirmation');

    // Negative tests in isolated fixtures
    let fixtureDir;
    try {
      fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ugondu-b12-locales-'));

      // Case 1: Missing key in a required locale
      createMinimalLocalesSet(fixtureDir, {
        locale: 'fr.json',
        transform: (c) => {
          const copy = { ...c };
          delete copy.farewell;
          return copy;
        },
      });
      const negMissing = runValidatorProcess(targetPath, context.root, fixtureDir);
      if (negMissing.status === 0 || !String(negMissing.stderr).includes('Missing keys in fr.json: farewell')) {
        throw new Error('B12_FAILED_TO_DETECT_MISSING_LOCALE_KEY');
      }

      // Case 2: Extra key in a required locale
      createMinimalLocalesSet(fixtureDir, {
        locale: 'de.json',
        transform: (c) => ({ ...c, unauthorizedExtra: 'value' }),
      });
      const negExtra = runValidatorProcess(targetPath, context.root, fixtureDir);
      if (negExtra.status === 0 || !String(negExtra.stderr).includes('Extra keys in de.json: unauthorizedExtra')) {
        throw new Error('B12_FAILED_TO_DETECT_EXTRA_LOCALE_KEY');
      }

      // Case 3: Fake prefix in translation string
      createMinimalLocalesSet(fixtureDir, {
        locale: 'es.json',
        transform: (c) => ({ ...c, greeting: '[ES] Bienvenido' }),
      });
      const negPrefix = runValidatorProcess(targetPath, context.root, fixtureDir);
      if (negPrefix.status === 0 || !String(negPrefix.stderr).includes('Fake locale prefix not allowed for key greeting in es.json')) {
        throw new Error('B12_FAILED_TO_DETECT_FAKE_LOCALE_PREFIX');
      }

      observations.push('Verified runtime behavioral rejection of missing keys, extra keys, and fake locale prefix in isolated test fixtures');
    } finally {
      if (fixtureDir) {
        fs.rmSync(fixtureDir, { recursive: true, force: true });
      }
    }
  }

  artifacts.push('scripts/validate-locales.js');
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
