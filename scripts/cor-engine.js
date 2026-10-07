const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

const root = process.env.UGONDU_ROOT || path.resolve(__dirname, '..');
const schedulePath = path.join(root, '.governance', 'cor', 'cor_final_remediation_task_schedule.json');
const evidenceDir = process.env.COR_EVIDENCE_DIR || path.join(root, '.cor_evidence');

if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
}

// 1. Verify clean checkout
const status = execSync('git status --porcelain', { cwd: root }).toString().trim();
if (status !== '') {
    console.error('COR BLOCKED: Source tree is not clean.');
    process.exit(1);
}

const sha = execSync('git rev-parse HEAD', { cwd: root }).toString().trim();
const treeSha = execSync('git write-tree', { cwd: root }).toString().trim();

const schedule = JSON.parse(fs.readFileSync(schedulePath, 'utf8'));

// We will build a dynamic evidence ledger, we DO NOT modify the schedule.
const evidenceLedger = {
    candidate: {
        repository: "Chicitadel/ugondu",
        commitSHA: sha,
        treeSHA: treeSha,
    },
    environmentIdentity: process.env.GITHUB_RUN_ID ? `GitHub-Action-${process.env.GITHUB_RUN_ID}` : 'Local-Runner',
    executionTimestamp: new Date().toISOString(),
    streams: []
};

let allPass = true;

function runStream(stream) {
    console.log(`Executing ${stream.id}: ${stream.objective}`);
    const executionId = 'EXEC-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    const ts = new Date().toISOString();
    
    let command = 'node scripts/physical-stream-runner.js ' + stream.id;
    if (stream.id === 'A01') command = 'node ' + path.join(root, 'scripts', 'i18n_audit.js');
    if (stream.id === 'B01') command = 'npm run build --if-present';
    if (stream.id === 'C01') command = 'npm run test --if-present';
    
    let exitCode = 0;
    let stdoutStr = '';
    let stderrStr = '';
    
    try {
        if (command === 'SIMULATION') {
            stdoutStr = 'Simulated'; exitCode = 1;
        } else {
            stdoutStr = execSync(command, { cwd: root, stdio: 'pipe' }).toString();
        }
    } catch (e) {
        exitCode = e.status || 1;
        stdoutStr = e.stdout ? e.stdout.toString() : '';
        stderrStr = e.stderr ? e.stderr.toString() : e.message;
    }
    
    const stdoutHash = crypto.createHash('sha256').update(stdoutStr).digest('hex');
    const stderrHash = crypto.createHash('sha256').update(stderrStr).digest('hex');
    
    const success = exitCode === 0 && command !== 'SIMULATION';
    let streamStatus = command === 'SIMULATION' ? 'NOT_PROVEN' : (success ? 'PASS' : 'FAIL');
    const receipt = {
        streamId: stream.id,
        executionId: executionId,
        executionTimestamp: ts,
        command: command,
        exitCode: exitCode,
        stdoutHash: stdoutHash,
        stderrHash: stderrHash,
        status: streamStatus
    };
    
    receipt.evidenceDigest = crypto.createHash('sha256').update(JSON.stringify(receipt)).digest('hex');
    
    return receipt;
}

for (const stream of schedule.streams) {
    const receipt = runStream(stream);
    evidenceLedger.streams.push(receipt);
    if (receipt.status !== 'PASS') {
        allPass = false;
        console.error(`Stream ${stream.id} failed!`);
        break; // Fail fast
    }
}

evidenceLedger.status = allPass ? 'COR_CERTIFIED' : 'COR_BLOCKED';

const ledgerPath = path.join(evidenceDir, 'evidence-ledger.json');
fs.writeFileSync(ledgerPath, JSON.stringify(evidenceLedger, null, 2));

if (!allPass) {
    console.error('COR BLOCKED');
    process.exit(1);
} else {
    console.log('COR Engine finished. Status: COR_CERTIFIED');
}





