'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = process.env.UGONDU_ROOT || path.resolve(__dirname, '..');
const SCHEDULE = path.join(
  ROOT,
  '.governance',
  'cor',
  'cor_final_remediation_task_schedule.json'
);
const EVIDENCE_DIR =
  process.env.COR_EVIDENCE_DIR || path.join(ROOT, '.cor_evidence');
const EXECUTOR_DIR = path.join(ROOT, 'scripts', 'cor', 'streams');

function sha256(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function git(args) {
  return execFileSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8'
  }).trim();
}

function block(reason) {
  process.stderr.write(`COR BLOCKED: ${reason}\n`);
  process.exit(1);
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    block(`invalid JSON: ${path.relative(ROOT, file)}`);
  }
}

function assertClean() {
  if (git(['status', '--porcelain']) !== '') {
    block('candidate checkout is not clean');
  }
}

function assertSchedule(schedule) {
  if (!Array.isArray(schedule.streams) || schedule.streams.length !== 40) {
    block('schedule must contain exactly 40 streams');
  }

  const ids = new Set();

  for (const stream of schedule.streams) {
    if (!stream || typeof stream.id !== 'string') {
      block('stream without id');
    }

    if (ids.has(stream.id)) {
      block(`duplicate stream: ${stream.id}`);
    }

    ids.add(stream.id);

    if (stream.status !== 'PLANNED') {
      block(
        `${stream.id} is not PLANNED; schedule is a requirement manifest, not evidence`
      );
    }
  }
}

function loadExecutor(id) {
  const file = path.join(EXECUTOR_DIR, `${id}.js`);

  if (!fs.existsSync(file)) {
    block(`missing real verifier: ${path.relative(ROOT, file)}`);
  }

  let executor;

  try {
    executor = require(file);
  } catch {
    block(`cannot load verifier: ${id}`);
  }

  if (!executor || typeof executor.run !== 'function') {
    block(`verifier ${id} must export run(context)`);
  }

  return executor;
}

function verifyReceipt(stream, receipt, commitSHA, treeSHA) {
  if (!receipt || typeof receipt !== 'object') {
    block(`${stream.id} returned no receipt`);
  }

  for (const field of [
    'status',
    'streamId',
    'executionId',
    'commitSHA',
    'treeSHA',
    'startedAt',
    'completedAt',
    'evidenceDigest'
  ]) {
    if (!(field in receipt)) {
      block(`${stream.id} receipt missing ${field}`);
    }
  }

  if (receipt.status !== 'PASS') block(`${stream.id} did not PASS`);
  if (receipt.streamId !== stream.id) block(`${stream.id} identity mismatch`);
  if (receipt.commitSHA !== commitSHA) block(`${stream.id} commit mismatch`);
  if (receipt.treeSHA !== treeSHA) block(`${stream.id} tree mismatch`);

  const unsigned = { ...receipt };
  delete unsigned.evidenceDigest;

  const expected = sha256(JSON.stringify(unsigned));

  if (receipt.evidenceDigest !== expected) {
    block(`${stream.id} evidence digest mismatch`);
  }
}

async function main() {
  assertClean();

  const commitSHA = git(['rev-parse', 'HEAD']);
  const treeSHA = git(['rev-parse', 'HEAD^{tree}']);

  if (!fs.existsSync(SCHEDULE)) {
    block('qualification schedule missing');
  }

  const schedule = readJson(SCHEDULE);
  assertSchedule(schedule);

  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

  const ledger = {
    schemaVersion: '2.0.0',
    result: 'BLOCKED_PENDING_QUALIFICATION',
    candidate: {
      repository: 'Chicitadel/ugondu',
      commitSHA,
      treeSHA
    },
    scheduleDigest: sha256(JSON.stringify(schedule)),
    executionStartedAt: new Date().toISOString(),
    streams: []
  };

  for (const stream of schedule.streams) {
    const executor = loadExecutor(stream.id);

    const context = Object.freeze({
      root: ROOT,
      repository: 'Chicitadel/ugondu',
      streamId: stream.id,
      objective: stream.objective,
      declaredLocations: Array.isArray(stream.location)
        ? stream.location
        : [],
      commitSHA,
      treeSHA,
      executionId: `COR-${stream.id}-${crypto.randomUUID()}`,
      startedAt: new Date().toISOString()
    });

    let receipt;

    try {
      receipt = await executor.run(context);
    } catch {
      block(`${stream.id} verifier threw before producing evidence`);
    }

    verifyReceipt(stream, receipt, commitSHA, treeSHA);

    ledger.streams.push({
      ...receipt,
      objective: stream.objective
    });
  }

  if (ledger.streams.length !== 40) {
    block('exactly 40 stream receipts are required');
  }

  ledger.result = 'QUALIFICATION_PASS';
  ledger.executionCompletedAt = new Date().toISOString();
  ledger.evidenceRoot = sha256(JSON.stringify(ledger.streams));

  fs.writeFileSync(
    path.join(EVIDENCE_DIR, 'evidence-ledger.json'),
    JSON.stringify(ledger, null, 2) + '\n',
    { encoding: 'utf8', mode: 0o600 }
  );

  process.stdout.write(
    `QUALIFICATION PASS: ${ledger.streams.length} streams; candidate=${commitSHA}\n`
  );
}

main().catch(() => block('unexpected COR engine failure'));
