const crypto = require('crypto');
const { execSync } = require('child_process');

const streamId = process.argv[2];

const EXECUTORS = new Map([
    // Blank to fail closed naturally as instructed
]);

const executor = EXECUTORS.get(streamId);

if (!executor) {
    console.error(\COR BLOCKED: no physical executor registered for \\);
    process.exit(2);
}

const commitSHA = execSync('git rev-parse HEAD').toString().trim();
const treeSHA = execSync('git write-tree').toString().trim();

executor({ root: process.cwd(), streamId, commitSHA, treeSHA })
    .then(receipt => {
        if (!receipt || receipt.status !== 'PASS') process.exit(1);
        receipt.repository = "Chicitadel/ugondu";
        receipt.executionId = crypto.randomUUID();
        receipt.evidenceDigest = crypto.createHash('sha256').update(JSON.stringify(receipt)).digest('hex');
        console.log(JSON.stringify(receipt));
        process.exit(0);
    })
    .catch(() => process.exit(1));
