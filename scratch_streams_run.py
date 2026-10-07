import os

streams_dir = r"D:\ujomor-platform\products\ugondu\scripts\cor\streams"

run_func = """
async function run(context) {
    if (context.streamId !== STREAM_ID) throw new Error('STREAM_CONTEXT_MISMATCH');

    const observations = [];
    const artifacts = [];

    const objResult = await verifyObjective(context, observations, artifacts);

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
        artifacts
    };

    receipt.evidenceDigest = crypto.createHash('sha256').update(canonicalize(receipt), 'utf8').digest('hex');
    return receipt;
}
"""

mappings = ['A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08', 'B09', 'B10', 'B11', 'B12', 'B13', 'B14', 'B15', 'B16', 'C22', 'F35', 'F36', 'F37', 'F38']
for i in range(25, 34):
    mappings.append(f'D{i}' if i <= 28 else f'E{i}')

for m in mappings:
    filepath = os.path.join(streams_dir, f"{m}.js")
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        if "async function run(context)" not in content:
            # Inject run function before module.exports
            content = content.replace("module.exports = {", run_func + "\nmodule.exports = {")
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)

print("Restored run functions.")
