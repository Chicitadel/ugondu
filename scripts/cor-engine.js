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
    executionTimestamp: new Date().toISOString(),
    streams: []
};

let allPass = true;

for (const stream of schedule.streams) {
    console.log(Executing \: \);
    
    let stdoutStr = '';
    let exitCode = 0;
    
    try {
        stdoutStr = execSync(
ode scripts/physical-stream-runner.js \, { cwd: root, stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
    } catch (e) {
        exitCode = e.status || 1;
        stdoutStr = e.stdout ? e.stdout.toString().trim() : '';
    }

    let receipt;
    try {
        receipt = JSON.parse(stdoutStr.split('\n').pop());
    } catch {
        receipt = null;
    }
    
    if (!receipt || receipt.status !== 'PASS' || receipt.commitSHA !== sha || receipt.treeSHA !== treeSha || receipt.streamId !== stream.id) {
        console.error(COR BLOCKED: Stream \ failed verification or missing valid receipt.);
        allPass = false;
        break;
    }
    
    evidenceLedger.streams.push(receipt);
}

if (!allPass || evidenceLedger.streams.length !== schedule.streams.length) {
    evidenceLedger.status = 'COR_BLOCKED';
    const ledgerPath = path.join(evidenceDir, 'evidence-ledger.json');
    fs.writeFileSync(ledgerPath, JSON.stringify(evidenceLedger, null, 2));
    console.error('COR BLOCKED');
    process.exit(1);
}

const finalCertificate = {
    repository: "Chicitadel/ugondu",
    commitSHA: sha,
    treeSHA: treeSha,
    status: "COR_CERTIFIED",
    receipts: evidenceLedger.streams.map(r => r.evidenceDigest)
};

const certHash = crypto.createHash('sha256').update(JSON.stringify(finalCertificate)).digest('hex');
finalCertificate.certificateDigest = certHash;

evidenceLedger.status = 'COR_CERTIFIED';
evidenceLedger.finalCertificate = finalCertificate;

fs.writeFileSync(path.join(evidenceDir, 'evidence-ledger.json'), JSON.stringify(evidenceLedger, null, 2));
fs.writeFileSync(path.join(evidenceDir, 'final-certificate.json'), JSON.stringify(finalCertificate, null, 2));

console.log('COR Engine finished. Status: COR_CERTIFIED');
process.exit(0);
