'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const root =
    process.env.UGONDU_ROOT ||
    path.resolve(__dirname, '..');

const streamId = process.argv[2];

if (!streamId) {
    console.error('COR BLOCKED: stream id is required.');
    process.exit(2);
}

const schedulePath = path.join(
    root,
    '.governance',
    'cor',
    'cor_final_remediation_task_schedule.json'
);

if (!fs.existsSync(schedulePath)) {
    console.error('COR BLOCKED: qualification schedule is missing.');
    process.exit(2);
}

const schedule = JSON.parse(
    fs.readFileSync(schedulePath, 'utf8')
);

const stream = schedule.streams.find(
    item => item.id === streamId
);

if (!stream) {
    console.error(
        `COR BLOCKED: stream ${streamId} is not declared by the authoritative schedule.`
    );
    process.exit(2);
}

/*
 * The schedule declares the objective.
 * It is NEVER evidence of completion.
 */
if (stream.status !== 'PLANNED') {
    console.error(
        `COR BLOCKED: stream ${streamId} has non-PLANNED source status ${stream.status}. ` +
        'The schedule cannot self-certify execution.'
    );
    process.exit(2);
}

const executorPath = path.join(
    root,
    'scripts',
    'cor',
    'streams',
    `${streamId}.js`
);

if (!fs.existsSync(executorPath)) {
    console.error(
        `COR BLOCKED: no physical executor exists for ${streamId}: ${executorPath}`
    );
    process.exit(2);
}

let executor;

try {
    executor = require(executorPath);
} catch (error) {
    console.error(
        `COR BLOCKED: executor ${streamId} could not be loaded.`
    );
    console.error(error);
    process.exit(2);
}

if (
    !executor ||
    typeof executor.run !== 'function'
) {
    console.error(
        `COR BLOCKED: executor ${streamId} does not export run(context).`
    );
    process.exit(2);
}

const commitSHA = execFileSync(
    'git',
    ['rev-parse', 'HEAD'],
    { cwd: root, encoding: 'utf8' }
).trim();

const treeSHA = execFileSync(
    'git',
    ['write-tree'],
    { cwd: root, encoding: 'utf8' }
).trim();

const context = {
    root,
    streamId,
    objective: stream.objective,
    declaredLocations: stream.location,
    commitSHA,
    treeSHA,
    executionId:
        `COR-${streamId}-${crypto.randomBytes(16).toString('hex')}`,
    startedAt: new Date().toISOString()
};

Promise.resolve()
    .then(() => executor.run(context))
    .then(receipt => {
        if (!receipt || receipt.status !== 'PASS') {
            console.error(
                `COR BLOCKED: ${streamId} executor did not produce PASS.`
            );
            process.exit(1);
        }

        if (receipt.streamId !== streamId) {
            console.error(
                `COR BLOCKED: ${streamId} executor returned another stream identity.`
            );
            process.exit(1);
        }

        if (receipt.commitSHA !== commitSHA) {
            console.error(
                `COR BLOCKED: ${streamId} receipt is not bound to current commit.`
            );
            process.exit(1);
        }

        const finalReceipt = {
            ...receipt,
            streamId,
            commitSHA,
            treeSHA,
            executionId: context.executionId,
            completedAt: new Date().toISOString()
        };

        finalReceipt.evidenceDigest =
            crypto
                .createHash('sha256')
                .update(
                    JSON.stringify(finalReceipt),
                    'utf8'
                )
                .digest('hex');

        process.stdout.write(
            JSON.stringify(finalReceipt)
        );

        process.exit(0);
    })
    .catch(error => {
        console.error(
            `COR BLOCKED: physical executor ${streamId} failed.`
        );
        console.error(error);
        process.exit(1);
    });
