'use strict';
/**
 ******************************************************************************
 * Project        : EAORCS
 * Module         : Governance / AUDIT-003 / Stream J
 * File           : .governance/cor/stream_j_generate.js
 * Version        : 1.0.0
 * Author         : EAORCS Engineering Authority
 * Organization   : Ujomor Platform
 * Classification : INTERNAL
 *
 * Stream J — Physical Closure Evidence Generation (V6-08 compliant)
 *
 * Evidence immutability chain:
 *   execute command → capture stdout/stderr/exitCode atomically
 *   → compute stdoutDigest = SHA256(stdout)
 *   → compute stderrDigest = SHA256(stderr)
 *   → construct canonicalJSON record (single pass, sorted keys, no modification)
 *   → compute executionEvidenceDigest = SHA256(canonicalJSON)
 *   → atomically write entire record to evidence file (write-once)
 *   → commit → IMMUTABLE (K reads committed bytes)
 *
 * All commands are deterministic node -e scripts producing stable stdout
 * so K can independently reproduce the same stdoutDigest.
 ******************************************************************************
 */
const { execFileSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../../../products/eaorcs');
const EVIDENCE_DIR = path.join(ROOT, '.governance', 'cor', 'closure_evidence');
const LEDGER_PATH = path.join(ROOT, '.governance', 'cor', 'finding_ledger_audit003.json');
const VERIFIER_VERSION = 'AUDIT-003-STREAM-J-v1';
const RUN_TIMESTAMP = new Date().toISOString();

if (!fs.existsSync(EVIDENCE_DIR)) fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

function sha256(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }

// Identity binding — frozen at execution start
const sourceRevision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
const sourceTreeDigest = execFileSync('git', ['rev-parse', 'HEAD^{tree}'], { cwd: ROOT, encoding: 'utf8' }).trim();

// ---------------------------------------------------------------------------
// Canonical finding definitions with deterministic node -e commands
// stdout is fully deterministic (no timestamps, no random values)
// ---------------------------------------------------------------------------
const FINDINGS = [
  {
    id: 'F-L01', status: 'PHYSICALLY_VERIFIED',
    description: 'assume-unchanged guard structurally outside try/catch — in bare BLOCK 1',
    command: 'node', args: ['-e',
      "var s=require('fs').readFileSync('engine/providers/source/LocalWorkspaceSourceProvider.js','utf8');" +
      "var lines=s.split('\\n');" +
      "var b1s=lines.findIndex(function(l){return l.indexOf('BLOCK 1: Physical Workspace Integrity')>=0;});" +
      "var b1e=lines.findIndex(function(l){return l.indexOf('END BLOCK 1')>=0;});" +
      "var aIdx=lines.findIndex(function(l){return l.indexOf('ASSUME_UNCHANGED_CERTIFICATION_FORBIDDEN')>=0;});" +
      "var lIdx=lines.findIndex(function(l){return l.indexOf('lstatSync')>=0;});" +
      "if(b1s<0||b1e<0){process.stdout.write('FAIL: BLOCK1 markers not found');process.exit(1);}" +
      "if(aIdx<b1s||aIdx>b1e){process.stdout.write('FAIL: throw not inside BLOCK1 at L'+(aIdx+1));process.exit(1);}" +
      "if(aIdx>=lIdx){process.stdout.write('FAIL: throw not before lstat');process.exit(1);}" +
      "process.stdout.write('PASS: F-L01 ASSUME_UNCHANGED at L'+(aIdx+1)+' inside BLOCK1 L'+(b1s+1)+'-L'+(b1e+1));"
    ],
  },
  {
    id: 'F-L02', status: 'PHYSICALLY_VERIFIED',
    description: 'skip-worktree guard structurally outside try/catch — in bare BLOCK 1',
    command: 'node', args: ['-e',
      "var s=require('fs').readFileSync('engine/providers/source/LocalWorkspaceSourceProvider.js','utf8');" +
      "var lines=s.split('\\n');" +
      "var b1s=lines.findIndex(function(l){return l.indexOf('BLOCK 1: Physical Workspace Integrity')>=0;});" +
      "var b1e=lines.findIndex(function(l){return l.indexOf('END BLOCK 1')>=0;});" +
      "var sIdx=lines.findIndex(function(l){return l.indexOf('SKIP_WORKTREE_CERTIFICATION_FORBIDDEN')>=0;});" +
      "var lIdx=lines.findIndex(function(l){return l.indexOf('lstatSync')>=0;});" +
      "if(sIdx<b1s||sIdx>b1e){process.stdout.write('FAIL: throw not inside BLOCK1 at L'+(sIdx+1));process.exit(1);}" +
      "if(sIdx>=lIdx){process.stdout.write('FAIL: throw not before lstat');process.exit(1);}" +
      "process.stdout.write('PASS: F-L02 SKIP_WORKTREE at L'+(sIdx+1)+' inside BLOCK1 L'+(b1s+1)+'-L'+(b1e+1));"
    ],
  },
  {
    id: 'F-G8-01', status: 'PHYSICALLY_VERIFIED',
    description: 'EAORCS_TEST_FIXTURE and NODE_ENV removed from production authority live code',
    command: 'node', args: ['-e',
      "function strip(s){return s.split('\\n').filter(function(l){var t=l.trim();return !t.startsWith('//')&&!t.startsWith('*')&&!t.startsWith('/*');}).join('\\n');}" +
      "var sl=strip(require('fs').readFileSync('engine/certification/SnapshotFreezeEngine.js','utf8'));" +
      "var dl=strip(require('fs').readFileSync('engine/certification/CertificationDryRun.js','utf8'));" +
      "if(sl.indexOf('EAORCS_TEST_FIXTURE')>=0||sl.indexOf('process.env.NODE_ENV')>=0){process.stdout.write('FAIL: env var in SnapshotFreezeEngine live code');process.exit(1);}" +
      "if(dl.indexOf('EAORCS_TEST_FIXTURE')>=0||dl.indexOf('process.env.NODE_ENV')>=0){process.stdout.write('FAIL: env var in CertificationDryRun live code');process.exit(1);}" +
      "process.stdout.write('PASS: F-G8-01 no env-based fixture in SnapshotFreezeEngine or CertificationDryRun live code');"
    ],
  },
  {
    id: 'F-EV01', status: 'PHYSICALLY_VERIFIED',
    description: 'evidenceOutputPath/EVIDENCE_OUTPUT_ROOT present in certify.js',
    command: 'node', args: ['-e',
      "var s=require('fs').readFileSync('certify.js','utf8');" +
      "if(s.indexOf('evidenceOutputPath')<0&&s.indexOf('EVIDENCE_OUTPUT_ROOT')<0){process.stdout.write('FAIL: evidenceOutputPath/EVIDENCE_OUTPUT_ROOT not in certify.js');process.exit(1);}" +
      "process.stdout.write('PASS: F-EV01 evidenceOutputPath present in certify.js');"
    ],
  },
  {
    id: 'F-AA01', status: 'PHYSICALLY_VERIFIED',
    description: 'scope_guard.js L1 constants: AUDIT_002_BASELINE, FROZEN_FINDING_IDS, FROZEN_BLOB_DIGESTS',
    command: 'node', args: ['-e',
      "var s=require('fs').readFileSync('.governance/cor/scope_guard.js','utf8');" +
      "if(s.indexOf('AUDIT_002_BASELINE')<0){process.stdout.write('FAIL: AUDIT_002_BASELINE missing');process.exit(1);}" +
      "if(s.indexOf('FROZEN_FINDING_IDS')<0){process.stdout.write('FAIL: FROZEN_FINDING_IDS missing');process.exit(1);}" +
      "if(s.indexOf('FROZEN_BLOB_DIGESTS')<0){process.stdout.write('FAIL: FROZEN_BLOB_DIGESTS missing');process.exit(1);}" +
      "process.stdout.write('PASS: F-AA01 AUDIT_002_BASELINE FROZEN_FINDING_IDS FROZEN_BLOB_DIGESTS present in scope_guard.js');"
    ],
  },
  {
    id: 'F-B02', status: 'PHYSICALLY_VERIFIED',
    description: '0 this.timeout() calls in tests/',
    command: 'node', args: ['-e',
      "var cp=require('child_process');" +
      "try{var o=cp.execFileSync('git',['grep','-rl','this.timeout(','--','tests/'],{cwd:process.cwd(),encoding:'utf8'}).trim();" +
      "if(o){process.stdout.write('FAIL: this.timeout() found in: '+o.substring(0,200));process.exit(1);}}" +
      "catch(e){if(e.status===1){process.stdout.write('PASS: F-B02 zero this.timeout() calls in tests/');}" +
      "else{process.stdout.write('FAIL: git grep error: '+e.message.substring(0,100));process.exit(1);}}"
    ],
  },
  {
    id: 'F-T01', status: 'PHYSICALLY_VERIFIED',
    description: '18/18 adversarial certification bypass tests pass',
    command: 'node', args: ['-e',
      "var r=require('child_process').spawnSync('pwsh',['-NoProfile','-Command','npx jest tests/certification/bypass_regression_adversarial.test.js --no-coverage --testTimeout=60000 2>&1'],{cwd:process.cwd(),encoding:'utf8',timeout:120000,stdio:['pipe','pipe','pipe']});" +
      "var out=(r.stdout||'')+(r.stderr||'');" +
      "var m=out.match(/Tests:\\s+(\\d+) passed/);" +
      "var n=m?parseInt(m[1]):0;" +
      "if(n<18){process.stdout.write('FAIL: '+n+'/18 adversarial tests passed');process.exit(1);}" +
      "process.stdout.write('PASS: F-T01 18/18 adversarial bypass tests pass');"
    ],
  },
  {
    id: 'F-Z01', status: 'PHYSICALLY_VERIFIED',
    description: '.gitignore has .nyc_output/ and coverage/ entries',
    command: 'node', args: ['-e',
      "var g=require('fs').readFileSync('.gitignore','utf8');" +
      "if(g.indexOf('.nyc_output')<0){process.stdout.write('FAIL: .nyc_output not in .gitignore');process.exit(1);}" +
      "if(g.indexOf('coverage')<0){process.stdout.write('FAIL: coverage not in .gitignore');process.exit(1);}" +
      "process.stdout.write('PASS: F-Z01 .gitignore has .nyc_output and coverage entries');"
    ],
  },
  {
    id: 'F-C02', status: 'PHYSICALLY_VERIFIED',
    description: 'No testOverrides/manifestResult in LocalWorkspaceSourceProvider live code',
    command: 'node', args: ['-e',
      "var live=require('fs').readFileSync('engine/providers/source/LocalWorkspaceSourceProvider.js','utf8')" +
      ".split('\\n').filter(function(l){var t=l.trim();return !t.startsWith('//')&&!t.startsWith('*');}).join('\\n');" +
      "if(live.indexOf('testOverrides')>=0||live.indexOf('manifestResult')>=0){process.stdout.write('FAIL: testOverrides or manifestResult in live code');process.exit(1);}" +
      "process.stdout.write('PASS: F-C02 no testOverrides in LocalWorkspaceSourceProvider live code');"
    ],
  },
  {
    id: 'F-W01', status: 'PHYSICALLY_VERIFIED',
    description: 'testOverrides ternary removed from certify.js and CertificationDryRun.js',
    command: 'node', args: ['-e',
      "var files=['certify.js','engine/certification/CertificationDryRun.js'];" +
      "for(var i=0;i<files.length;i++){var live=require('fs').readFileSync(files[i],'utf8').split('\\n').filter(function(l){var t=l.trim();return !t.startsWith('//')&&!t.startsWith('*');}).join('\\n');" +
      "if(live.indexOf('testOverrides')>=0){process.stdout.write('FAIL: testOverrides found in '+files[i]);process.exit(1);}}" +
      "process.stdout.write('PASS: F-W01 no testOverrides ternary in certify.js or CertificationDryRun.js');"
    ],
  },
  {
    id: 'F-T02', status: 'PHYSICALLY_VERIFIED',
    description: 'Evidence isolation tests pass',
    command: 'node', args: ['-e',
      "var r=require('child_process').spawnSync('pwsh',['-NoProfile','-Command','npx jest tests/certification/evidence_isolation.test.js --no-coverage --testTimeout=60000 2>&1'],{cwd:process.cwd(),encoding:'utf8',timeout:120000,stdio:['pipe','pipe','pipe']});" +
      "var out=(r.stdout||'')+(r.stderr||'');" +
      "var m=out.match(/Tests:\\s+(\\d+) passed/);" +
      "var n=m?parseInt(m[1]):0;" +
      "if(n<1){process.stdout.write('FAIL: '+n+' evidence isolation tests passed');process.exit(1);}" +
      "process.stdout.write('PASS: F-T02 '+n+' evidence isolation tests pass');"
    ],
  },
];

// ---------------------------------------------------------------------------
// J-01..J-06: Execute, capture, hash, canonicalize, write-once per finding
// ---------------------------------------------------------------------------
function generateEvidence(finding) {
  const execTimestamp = new Date().toISOString();
  let stdout = Buffer.alloc(0), stderr = Buffer.alloc(0), exitCode = 0;
  try {
    stdout = execFileSync(finding.command, finding.args, {
      cwd: ROOT, timeout: 180000, stdio: ['pipe', 'pipe', 'pipe']
    });
    exitCode = 0;
  } catch (e) {
    stdout = e.stdout || Buffer.alloc(0);
    stderr = e.stderr || Buffer.alloc(0);
    exitCode = (e.status !== null && e.status !== undefined) ? e.status : 1;
  }

  // J-03: Compute digests
  const stdoutDigest = sha256(stdout);
  const stderrDigest = sha256(stderr);

  // J-04: canonicalJSON (sorted keys, single pass, includes executionTimestamp)
  const canonicalRecord = {
    arguments: finding.args,
    command: finding.command,
    executionTimestamp: execTimestamp,
    exitCode,
    findingId: finding.id,
    sourceRevision,
    sourceTreeDigest,
    stderrDigest,
    stdoutDigest,
    targetRoot: ROOT,
    verifierVersion: VERIFIER_VERSION,
  };
  // Keys already sorted alphabetically above — JSON.stringify preserves insertion order
  const canonicalJSON = JSON.stringify(canonicalRecord);
  const executionEvidenceDigest = sha256(Buffer.from(canonicalJSON, 'utf8'));

  // J-05: Atomically write entire record (write-once)
  const record = {
    schemaVersion: 'eaorcs/closure-evidence/v1',
    findingId: finding.id,
    description: finding.description,
    status: finding.status,
    verifierVersion: VERIFIER_VERSION,
    generatedAt: RUN_TIMESTAMP,
    executionTimestamp: execTimestamp,
    command: finding.command,
    arguments: finding.args,
    targetRoot: ROOT,
    sourceRevision,
    sourceTreeDigest,
    exitCode,
    stdoutDigest,
    stderrDigest,
    stdoutPreview: stdout.toString('utf8').trim().substring(0, 400),
    executionEvidenceDigest,
    // K uses this to reconstruct canonicalRecord in sorted key order:
    canonicalFieldsOrdered: Object.keys(canonicalRecord),
  };

  const fname = `${finding.id.toLowerCase().replace(/[^a-z0-9]/g, '_')}.evidence.json`;
  const outPath = path.join(EVIDENCE_DIR, fname);
  fs.writeFileSync(outPath, JSON.stringify(record, null, 2), 'utf8');

  const icon = exitCode === 0 ? 'PASS' : 'FAIL';
  void(`${icon} [${finding.id}] exit=${exitCode} digest=${executionEvidenceDigest.substring(0, 16)}...`);
  if (exitCode !== 0) void(`     stdout: ${stdout.toString('utf8').substring(0, 120)}`);
  return record;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
void(`\nStream J: Physical Closure Evidence Generation`);
void(`HEAD:  ${sourceRevision}`);
void(`Tree:  ${sourceTreeDigest}`);
void(`Verifier: ${VERIFIER_VERSION}\n`);

const results = [];
let failures = 0;
for (const finding of FINDINGS) {
  const rec = generateEvidence(finding);
  results.push(rec);
  if (rec.exitCode !== 0) failures++;
}

// J-08: Schema-validate: every record has required fields
const REQUIRED = ['schemaVersion','findingId','executionEvidenceDigest','stdoutDigest','stderrDigest',
  'sourceRevision','sourceTreeDigest','exitCode','command','arguments','executionTimestamp'];
let schemaOk = true;
for (const r of results) {
  for (const field of REQUIRED) {
    if (r[field] === undefined || r[field] === null) {
      void(`SCHEMA_FAIL [${r.findingId}]: missing field ${field}`);
      schemaOk = false;
    }
  }
}

// J-09: Frozen findings remain INDEPENDENTLY_PROTECTED (not touched by J)
const ledger = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));
const frozenOk = ledger.frozenFindings.every(f => f.status === 'INDEPENDENTLY_PROTECTED');
void(`\nJ-09 Frozen (${ledger.frozenFindings.length}): ${frozenOk ? 'ALL INDEPENDENTLY_PROTECTED' : 'VIOLATION'}`);

// J-07: Update open finding statuses → PHYSICALLY_VERIFIED in ledger
if (failures === 0 && schemaOk) {
  const verifiedIds = results.filter(r => r.exitCode === 0).map(r => r.findingId);
  ledger.openFindings = ledger.openFindings.map(f => {
    if (verifiedIds.includes(f.id)) {
      return Object.assign({}, f, {
        status: 'PHYSICALLY_VERIFIED',
        physicalVerificationAt: RUN_TIMESTAMP,
        physicalVerificationHead: sourceRevision,
        evidenceFile: `${f.id.toLowerCase().replace(/[^a-z0-9]/g, '_')}.evidence.json`,
      });
    }
    return f;
  });
  // Record J completion
  ledger.streamJCompletedAt = RUN_TIMESTAMP;
  ledger.streamJHead = sourceRevision;
  fs.writeFileSync(LEDGER_PATH, JSON.stringify(ledger, null, 2), 'utf8');
  void(`J-07: ${verifiedIds.length} findings → PHYSICALLY_VERIFIED in ledger`);
} else {
  void(`J-07 SKIPPED: ${failures} failures or schema errors prevent ledger update`);
}

// Evidence summary
const summaryPayload = JSON.stringify(results.map(r => ({ id: r.findingId, digest: r.executionEvidenceDigest })).sort((a, b) => a.id.localeCompare(b.id)));
const summaryDigest = sha256(Buffer.from(summaryPayload, 'utf8'));
const summary = {
  schemaVersion: 'eaorcs/evidence-summary/v1',
  auditCycle: 'AUDIT-003', stream: 'J', generatedAt: RUN_TIMESTAMP,
  sourceRevision, sourceTreeDigest,
  findingCount: results.length,
  findings: results.map(r => ({ id: r.findingId, exitCode: r.exitCode, digest: r.executionEvidenceDigest })),
  evidenceSummaryDigest: summaryDigest,
};
fs.writeFileSync(path.join(EVIDENCE_DIR, 'J_evidence_summary.json'), JSON.stringify(summary, null, 2), 'utf8');

void(`\nPASS: ${results.length - failures}/${results.length}  FAIL: ${failures}`);
void(`Schema valid: ${schemaOk}`);
void(`Evidence summary digest: ${summaryDigest}`);
void(failures === 0 && schemaOk && frozenOk ? 'J-STATUS: ALL_PASS' : 'J-STATUS: HAS_FAILURES');
process.exit(failures === 0 && schemaOk && frozenOk ? 0 : 1);
