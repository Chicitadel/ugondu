'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const crypto = require('crypto');

const root =
    process.env.UGONDU_ROOT ||
    path.resolve(__dirname, '..');

const schedulePath = path.join(
    root,
    '.governance',
    'cor',
    'cor_final_remediation_task_schedule.json'
);

const evidenceDir =
    process.env.COR_EVIDENCE_DIR ||
    path.join(root, '.cor_evidence');

fs.mkdirSync(evidenceDir, { recursive: true });

function sha256(value) {
    return crypto
        .createHash('sha256')
        .update(value, 'utf8')
        .digest('hex');
}

function runGit(args) {
    return execFileSync(
        'git',
        args,
        {
            cwd: root,
            encoding: 'utf8'
        }
    ).trim();
}

function fail(message) {
    console.error(`COR BLOCKED: ${message}`);
    process.exit(1);
}

const porcelain = runGit(['status', '--porcelain']);

if (porcelain !== '') {
    fail('source tree is not clean.');
}

const commitSHA = runGit(['rev-parse', 'HEAD']);
const treeSHA = runGit(['write-tree']);

const schedule =
    JSON.parse(
        fs.readFileSync(schedulePath, 'utf8')
    );

if (!Array.isArray(schedule.streams)) {
    fail('schedule.streams is not an array.');
}

if (schedule.streams.length !== 40) {
    fail(
        `authoritative schedule contains ${schedule.streams.length} streams; exactly 40 are required.`
    );
}

for (const stream of schedule.streams) {
    if (stream.status !== 'PLANNED') {
        fail(
            `${stream.id} is not PLANNED. ` +
            'The schedule is a requirement manifest, not an evidence source.'
        );
    }
}

const evidenceLedger = {
    schemaVersion: '1.0.0',
    candidate: {
        repository: 'Chicitadel/ugondu',
        commitSHA,
        treeSHA
    },
    scheduleDigest: sha256(
        JSON.stringify(schedule)
    ),
    executionTimestamp:
        new Date().toISOString(),
    streams: []
};

for (const stream of schedule.streams) {
    console.log(
        `Executing ${stream.id}: ${stream.objective}`
    );

    let stdout = '';
    let stderr = '';
    let exitCode = 0;

    try {
        stdout = execFileSync(
            'node',
            [
                path.join(
                    root,
                    'scripts',
                    'physical-stream-runner.js'
                ),
                stream.id
            ],
            {
                cwd: root,
                encoding: 'utf8'
            }
        );
    } catch (error) {
        exitCode =
            typeof error.status === 'number'
                ? error.status
                : 1;

        stdout =
            error.stdout
                ? error.stdout.toString()
                : '';

        stderr =
            error.stderr
                ? error.stderr.toString()
                : String(error.message || error);
    }

    const stdoutHash = sha256(stdout);
    const stderrHash = sha256(stderr);

    let executorReceipt = null;

    if (exitCode === 0) {
        try {
            executorReceipt =
                JSON.parse(stdout);

            if (
                executorReceipt.streamId !== stream.id ||
                executorReceipt.commitSHA !== commitSHA ||
                executorReceipt.treeSHA !== treeSHA ||
                executorReceipt.status !== 'PASS'
            ) {
                exitCode = 1;
            }
        } catch {
            exitCode = 1;
        }
    }

    const status =
        exitCode === 0
            ? 'PASS'
            : 'NOT_PROVEN';

    const receipt = {
        streamId: stream.id,
        objective: stream.objective,
        executionTimestamp:
            new Date().toISOString(),
        commitSHA,
        treeSHA,
        exitCode,
        stdoutHash,
        stderrHash,
        status,
        executorReceipt
    };

    receipt.evidenceDigest =
        sha256(JSON.stringify(receipt));

    evidenceLedger.streams.push(receipt);

    if (status !== 'PASS') {
        evidenceLedger.status = 'COR_BLOCKED';

        fs.writeFileSync(
            path.join(
                evidenceDir,
                'evidence-ledger.json'
            ),
            JSON.stringify(
                evidenceLedger,
                null,
                2
            ),
            'utf8'
        );

        fail(
            `${stream.id} did not produce an independently verifiable PASS.`
        );
    }
}

evidenceLedger.status =
    'COR_CERTIFIED_PENDING_INDEPENDENT_AUTHORITY_RECONCILIATION';

fs.writeFileSync(
    path.join(
        evidenceDir,
        'evidence-ledger.json'
    ),
    JSON.stringify(
        evidenceLedger,
        null,
        2
    ),
    'utf8'
);

console.log(
    'All physical streams passed. Independent governance/release authority reconciliation is still required before COR.'
);
