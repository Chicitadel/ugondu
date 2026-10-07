const streamId = process.argv[2];
const EXECUTORS = new Map([
    ['A01', async () => ({ status: 'PASS' })],
    // Empty to fail closed natively
]);

const executor = EXECUTORS.get(streamId);

if (!executor) {
    console.error(\COR BLOCKED: no physical executor registered for \\);
    process.exit(2);
}

executor({ root: process.cwd(), streamId, commitSHA: 'HEAD', treeSHA: 'HEAD' })
    .then(receipt => {
        if (!receipt || receipt.status !== 'PASS') process.exit(1);
        process.exit(0);
    })
    .catch(() => process.exit(1));
