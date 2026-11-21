'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { assertNoVerifierStub } = require('./cor/stream-source-integrity');

const ROOT = process.env.UGONDU_ROOT || path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, '.governance', 'cor', 'ugondu-cor-qualification-manifest.json');
const EXECUTOR_DIR = path.join(ROOT, 'scripts', 'cor', 'streams');

const EXPECTED_IDS = [
    'A01','A02','A03','A04','A05','A06','A07','A08',
    'B09','B10','B11','B12','B13','B14','B15','B16',
    'C17','C18','C19','C20','C21','C22',
    'D23','D24','D25','D26','D27','D28',
    'E29','E30','E31','E32','E33','E34',
    'F35','F36','F37','F38','F39','F40'
];

const SHA_PATTERN = /^[0-9a-f]{40}$/;

function block(reason) {
    process.stderr.write(`COR BLOCKED: ${reason}\n`);
    process.exit(1);
}

function sha256Text(value) {
    return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

if (!fs.existsSync(MANIFEST_PATH)) {
    block('Manifest missing');
}

let manifest;
try {
    manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
} catch {
    block('Manifest invalid JSON');
}

if (manifest.repository !== 'Chicitadel/ugondu') {
    block('Manifest repository identity mismatch');
}

if (!Array.isArray(manifest.streams)) {
    block('Manifest streams is not an array');
}

if (manifest.streams.length !== 40) {
    block('Manifest must contain exactly 40 streams');
}

const manifestIds = manifest.streams.map(s => s && s.id);
if (new Set(manifestIds).size !== 40) {
    block('Manifest contains duplicate IDs');
}

if (JSON.stringify(manifestIds.sort()) !== JSON.stringify([...EXPECTED_IDS].sort())) {
    block('Manifest IDs do not exactly match A01-F40');
}

// The committed manifest is the objective plan, not a result ledger.
// Only runtime receipts bind execution to the exact commit/tree.
for (const [field, value] of [
    ['candidateCommit', manifest.candidateCommit],
    ['candidateTree', manifest.candidateTree]
]) {
    if (value !== null && value !== undefined && (typeof value !== 'string' || !SHA_PATTERN.test(value))) {
        block(`Manifest ${field} must be null or a full lowercase SHA-1`);
    }
}

const files = fs.readdirSync(EXECUTOR_DIR).filter(f => f.endsWith('.js'));
if (files.length !== 40) {
    block('There must be exactly 40 executor files, no more, no less');
}

for (const stream of manifest.streams) {
    if (stream.status !== 'PLANNED') {
        block(`Manifest stream ${stream.id || 'UNKNOWN'} must remain PLANNED; execution status belongs in candidate-bound receipts`);
    }
    if (typeof stream.objective !== 'string' || stream.objective.trim() === '') {
        block(`Manifest stream ${stream.id || 'UNKNOWN'} has no objective`);
    }
    if (!Array.isArray(stream.location) || stream.location.length === 0 ||
        stream.location.some(location => typeof location !== 'string' || location.trim() === '')) {
        block(`Manifest stream ${stream.id || 'UNKNOWN'} has invalid locations`);
    }

    const expectedFile = `${stream.id}.js`;
    if (!files.includes(expectedFile)) {
        block(`Executor file missing: ${expectedFile}`);
    }

    const executorPath = path.join(EXECUTOR_DIR, expectedFile);
    const executorSource = fs.readFileSync(executorPath, 'utf8');
    try { assertNoVerifierStub(executorSource, stream.id); } catch (error) { block(error.message); }
    let executor;
    try {
        executor = require(executorPath);
    } catch {
        block(`Could not load executor: ${expectedFile}`);
    }

    if (!executor || typeof executor.run !== 'function' || !executor.metadata) {
        block(`Executor ${stream.id} does not export metadata and run`);
    }

    if (executor.metadata.streamId !== stream.id) {
        block(`Executor ${stream.id} metadata streamId mismatch`);
    }

    const objectiveHash = sha256Text(stream.objective);
    if (executor.metadata.objectiveHash !== objectiveHash) {
        block(`Executor ${stream.id} objective hash mismatch`);
    }
}

console.log('Stream registry validation successful.');
