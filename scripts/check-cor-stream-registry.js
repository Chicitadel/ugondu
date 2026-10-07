'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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

if (!Array.isArray(manifest.streams)) {
    block('Manifest streams is not an array');
}

if (manifest.streams.length !== 40) {
    block('Manifest must contain exactly 40 streams');
}

const manifestIds = manifest.streams.map(s => s.id);
if (new Set(manifestIds).size !== 40) {
    block('Manifest contains duplicate IDs');
}

if (JSON.stringify(manifestIds.sort()) !== JSON.stringify([...EXPECTED_IDS].sort())) {
    block('Manifest IDs do not exactly match A01-F40');
}

const files = fs.readdirSync(EXECUTOR_DIR).filter(f => f.endsWith('.js'));
if (files.length !== 40) {
    block('There must be exactly 40 executor files, no more, no less');
}

for (const stream of manifest.streams) {
    const expectedFile = `${stream.id}.js`;
    if (!files.includes(expectedFile)) {
        block(`Executor file missing: ${expectedFile}`);
    }
    
    const executorPath = path.join(EXECUTOR_DIR, expectedFile);
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
