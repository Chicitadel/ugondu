# Ugondu COR Resume Audit — Universal Platform Qualification

- **Audit date:** 2026-10-21
- **Repository:** [Chicitadel/ugondu](https://github.com/Chicitadel/ugondu)
- **Branch:** `cor/resume-checkpoint-hardening-2026-10-21`
- **Baseline:** `phase4/production-hardening`, candidate before this remediation `be67628bd26abf18886e958e8467dbb8492d32bc`
- **Audit candidate after remediation commits:** `9fe83e58ce7d97e16f78221b8b56e99c023ff8b1`
- **Decision:** 🔴 **UNIVERSAL COR NOT CERTIFIED**
- **Execution boundary:** source and test changes below are committed on this branch. They are not considered verified until the candidate's required CI jobs pass. No AWS physical deployment was attempted from this audit.

## 1. Colour legend

- 🟢 **Certified — evidence-bounded:** exact candidate SHA, exact target tuple, native test and retained evidence are all present.
- 🔵 **Stabilized / guarded:** implementation guard exists, but qualification or independent proof remains incomplete.
- 🟡 **Partial:** some tests or static evidence exist; runtime or target coverage is incomplete.
- 🔴 **Blocked / failed:** a mandatory control failed or prerequisite is absent.
- ⚪ **Unassessed:** no adequate evidence for the claimed target or function.

Never promote a zone to 🟢 based only on a configuration declaration, successful compilation, documentation, cross-compilation, a skipped step, or a green non-authoritative workflow job.

## 2. Resume checkpoint and SHA reconciliation

The prior master checklist names `be67628bd26abf18886e958e8467dbb8492d32bc` as the current branch head, while its embedded evidence describes candidate `ce1c3b8dea432bcbc0588504ad0e48f7bac94bf5`. These are not the same SHA. Earlier run IDs must therefore be treated as historical evidence for the SHA actually tested by those runs, not as evidence for this new candidate.

The new remediation branch starts at `be67628bd26abf18886e958e8467dbb8492d32bc` and contains:
1. `69c4dfe4512aef167aa4feec4422becfff072d8b` — scanner input errors now fail closed.
2. `9fe83e58ce7d97e16f78221b8b56e99c023ff8b1` — regression test for Git enumeration failure.

**CI status for this candidate: pending/unverified in this record.** Do not reuse the previous CI green state as if it belongs to this candidate.

## 3. Verified source observations

### 3.1 AWS role session guard

File: [`.github/workflows/cor.yml`](https://github.com/Chicitadel/ugondu/blob/phase4/production-hardening/.github/workflows/cor.yml)

The inspected workflow has a single tagged `aws sts assume-role` call, uses `set -euo pipefail`, checks returned credentials, masks them, verifies caller identity before exporting credentials, and has no untagged retry fallback.

Snapshot (guarded behavior):

```bash
set -euo pipefail
# Tagged assumption is mandatory. There is intentionally no untagged fallback.
if [ -z "${EXECUTION_ROLE_ARN}" ]; then
  echo "::error::AWS_EXECUTION_ROLE_MISSING: execution role is not configured."
  exit 1
fi
CREDS=$(aws sts assume-role \
  --role-arn "$EXECUTION_ROLE_ARN" \
  --role-session-name "$TX_ID" \
  --tags "Key=UgonduTransactionId,Value=$TX_ID" "Key=UgonduCOR,Value=true" \
  --query 'Credentials.[AccessKeyId,SecretAccessKey,SessionToken]' \
  --output text)
```

Status: 🔵 guarded, 🔴 live AWS qualification blocked until the configured OIDC/trust policy permits the required tagged session and physical lifecycle completes.

### 3.2 Authoritative COR release gate

File: [`.github/workflows/cor.yml`](https://github.com/Chicitadel/ugondu/blob/phase4/production-hardening/.github/workflows/cor.yml)

Snapshot:

```yaml
cor-final-release-gate:
  name: COR Final Release Gate
  if: always()
  needs:
    - cor
    - aws-physical-gate
  steps:
    - name: Require every mandatory gate to have succeeded
      env:
        COR_RESULT: ${{ needs.cor.result }}
        AWS_RESULT: ${{ needs.aws-physical-gate.result }}
      run: |
        set -euo pipefail
        for gate in "cor:${COR_RESULT}" "aws-physical-gate:${AWS_RESULT}"; do
          name="${gate%%:*}"
          result="${gate#*:}"
          if [ "${result}" != "success" ]; then
            echo "::error::COR_GATE_NOT_SUCCESS: ${name} result is ${result}"
            exit 1
          fi
        done
```

Status: 🔵 guarded. The structural regression tests exist in `tests/qualification/cor-workflow-gates.test.js`; re-run them and confirm actual GitHub Actions behavior on this exact candidate.

### 3.3 Secret scanner fail-closed correction (new modification zone)

Files:
- [`scripts/release/secret-scan.mjs`](https://github.com/Chicitadel/ugondu/blob/cor/resume-checkpoint-hardening-2026-10-21/scripts/release/secret-scan.mjs)
- [`tests/security/secret-scan.test.js`](https://github.com/Chicitadel/ugondu/blob/cor/resume-checkpoint-hardening-2026-10-21/tests/security/secret-scan.test.js)

The inspected baseline had silent recovery paths where allowlist parsing could return an empty list, Git file enumeration could produce an empty tracked-file list, and unreadable tracked files could be skipped. That behavior contradicts the stated fail-closed policy.

Implemented correction on the remediation branch:

```js
if (!fs.existsSync(ALLOWLIST_PATH)) {
  throw new Error(`Required secret allowlist is missing: ${ALLOWLIST_PATH}`);
}
try {
  const raw = JSON.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf8'));
  // Validate and load time-bounded allowlist entries.
} catch (err) {
  throw new Error(
    `Failed to load or validate secret allowlist: ${err instanceof Error ? err.message : String(err)}`
  );
}
```

Tracked-file enumeration and tracked-file read errors now also throw descriptive errors instead of continuing. Test `SEC-SCAN-006` verifies that a Git enumeration failure rejects the scan instead of reporting a clean/empty result.

Status: 🔵 implemented, pending candidate CI. This is a declared modification zone because a newly discovered failure mode invalidated the prior scanner guard claim. Existing scan detection and allowlist semantics must remain covered by all earlier tests.

## 4. Full zone and target register

| ID | Zone / level / feature / function | State | Evidence boundary / required exit |
|---|---|---|---|
| COR-001 | Candidate SHA reconciliation | 🔴 | Historical reports name different SHAs. Re-run CI on full current SHA and bind artifacts to it. |
| COR-002 | TypeScript workspaces, build, typecheck and tests | 🟡 | Previous runs report passes, but current candidate must rerun. |
| COR-003 | Go thin client: Linux amd64 | 🟡 | Prior target reported green; current SHA rerun required. |
| COR-004 | Go thin client: Linux arm64 | 🟡 | Prior target reported green; current SHA rerun required. |
| COR-005 | Go thin client: macOS amd64 | 🟡 | Prior target reported green; current SHA rerun required. |
| COR-006 | Go thin client: macOS arm64 | 🟡 | Prior target reported green; current SHA rerun required. |
| COR-007 | Go thin client: Windows amd64 | 🟡 | Prior target reported green; current SHA rerun required. |
| COR-008 | AWS tagged STS session and transaction tags | 🔵 / 🔴 | Workflow rejects untagged fallback; live role trust / TagSession is blocked until proven. |
| COR-009 | AWS physical deployment and health verification | 🔴 | No successful live lifecycle evidence in the checkpoint. |
| COR-010 | AWS recovery, rollback, teardown and zero residuals | 🔴 | Must complete on an approved disposable target; preserve raw evidence. |
| COR-011 | COR final gate, failure/skip/cancel semantics | 🔵 | Workflow and structural tests exist; exact-candidate tests and remote run required. |
| COR-012 | Full-history secret scan | 🔵 | New fail-closed correction committed; all scanner regression tests and history scan must pass on candidate. |
| COR-013 | Secret allowlist integrity and expiry | 🟡 | Prior SEC-SCAN-005 claim requires exact-candidate revalidation after changes. |
| COR-014 | Brand manifest/checksum/disk parity | 🟡 | Prior run reported 14/14; exact candidate evidence required if branding changes. |
| COR-015 | 12 locale key parity and token coverage | 🟡 | Static parity is not runtime UI/CLI/API/IDE or accessibility certification. |
| COR-016 | Runtime localization: UI, CLI, API, IDE, errors, validation | ⚪ | Build tests for every shipped locale and surface, including fallback behavior. |
| COR-017 | RTL layouts and Arabic locale | ⚪ | Native responsive and keyboard/screen-reader testing required. |
| COR-018 | Accessibility and low-bandwidth/small-screen use | ⚪ | WCAG-oriented keyboard, contrast, focus, zoom, screen-reader and mobile tests required. |
| COR-019 | Model-assisted vs model-free parity | 🟡 | Existing parity tests are bounded; test provider outage, missing credentials, policy and output invariance. |
| COR-020 | UI vs CLI vs API vs IDE parity | ⚪ | Each entry point must produce the same authorization, plan and policy decision. |
| COR-021 | Fine-grained approvals, dry-run, policy evaluation | ⚪ | Verify per-action approvals, immutable plan digest, actor/tenant authorization and cancellation. |
| COR-022 | Automated execution, resumability and idempotency | ⚪ | Fault injection, duplicate replay, retry, partial failure and recovery proofs required. |
| COR-023 | Linux distributions / Windows releases / macOS releases | ⚪ | Only the explicitly tested OS/version/architecture tuples may be advertised as qualified. |
| COR-024 | Docker and Docker Compose | 🟡 | Static/CI checks do not qualify production runtime, rootless mode, storage or rollback. |
| COR-025 | Kubernetes / Helm | ⚪ | Live mutation, RBAC, namespace isolation, rollout and rollback evidence required. |
| COR-026 | AWS cloud adapter | 🔴 | Live qualification blocked by IAM prerequisite and uncompleted physical lifecycle. |
| COR-027 | Azure cloud adapter | ⚪ | No qualification evidence supplied in the checkpoint. |
| COR-028 | Google Cloud Platform adapter | ⚪ | No qualification evidence supplied in the checkpoint. |
| COR-029 | OCI and other implemented cloud adapters | ⚪ | Discover actual registered adapters; qualify each implemented adapter independently. |
| COR-030 | VPS / dedicated server / bare metal / private host | 🟡 / ⚪ | SSH adapter exists; qualify OS, permissions, network, secrets, rollback and recovery per target tuple. |
| COR-031 | cPanel | 🔵 | Adapter exists; host plan capabilities and real deployment/rollback still need qualification. |
| COR-032 | DirectAdmin | 🔵 | Dedicated adapter exists; contract tests and live plan qualification remain required. |
| COR-033 | Plesk | ⚪ | Not certified unless a concrete adapter and evidence exist; roadmap is not support. |
| COR-034 | Shared hosting and restricted shells | ⚪ | Detect capabilities, never assume root/systemd/container privileges; unsupported actions must be rejected before mutation. |
| COR-035 | DirectAdmin/cPanel SFTP/FTP limitations | ⚪ | Test API/SFTP-specific permissions and ensure no unsafe fallback to shell/root behavior. |
| COR-036 | IDE integrations | ⚪ | Qualify each implemented IDE/plugin and version; do not infer from CLI support. |
| COR-037 | Secret management and credential redaction | 🟡 | Verify all logs, exceptions, telemetry and generated evidence under adversarial secret injection. |
| COR-038 | Supply-chain integrity, action pinning, SBOM/provenance | 🟡 | Exact-candidate evidence and independent artifact verification required. |
| COR-039 | Repository governance, no-stubs, file size policy | 🟡 | Previous reported static checks need rerun on current candidate. |
| COR-040 | Universal COR release authority | 🔴 | Remains withheld until every mandatory gate and every advertised support tuple is evidence-qualified. |

## 5. Universal host and platform policy

Ugondu must not treat a marketing label as a capability. A target is usable only after capability discovery and policy evaluation for that actual account, plan, OS, architecture, runtime and permissions.

Required target inventory categories:
- Public clouds: AWS, Azure, Google Cloud, OCI and any other adapter actually registered in source.
- Hosting: VPS, dedicated, bare metal, private host, cPanel, DirectAdmin, Plesk (only if implemented), and shared hosting.
- Container/orchestration: Docker, Compose, Kubernetes and Helm only where concrete adapters exist.
- Execution surfaces: UI, terminal/CLI, API, IDE integrations and headless automation.
- Execution modes: model-free and model-assisted; fine-grained/manual approvals and authorized automation.
- OS/runtime combinations: exact supported versions and architectures, not an unbounded claim of “all OS”.

Unsupported or insufficiently privileged targets must return a localized, actionable capability report and must not partially mutate infrastructure.

## 6. Guarded boundaries and regression policy

1. Mark each zone as `FROZEN_CERTIFIED`, `STABILIZED`, `MODIFICATION_ZONE`, `DEPENDENCY_INVALIDATED`, `BLOCKED` or `UNASSESSED`.
2. Any edit to a frozen zone requires an explicit change record naming the affected zone, reason, dependency graph, expected behavior and rollback plan.
3. If a dependency changes, invalidate only the dependency closure and directly affected evidence; do not silently keep stale green status.
4. Do not rerun unrelated expensive physical qualification unless the dependency graph shows impact.
5. Require unit, contract, integration, adversarial, failure-injection and target-native tests for the changed zone.
6. CI evidence must bind candidate full SHA, workflow run ID, target tuple, test command, exit status and artifact digest.
7. A missing, skipped, cancelled, stale-SHA or unverifiable mandatory result is not a pass.
8. Do not launch destructive cloud mutation without explicit approved target, least-privilege credentials, cost bounds, transaction tags and a tested teardown plan.

## 7. Required source snapshots for final release guardrails

The following are proposed invariants, not claims that all are implemented:

```ts
type QualificationState =
  | 'UNASSESSED'
  | 'PARTIAL'
  | 'STABILIZED'
  | 'CERTIFIED'
  | 'BLOCKED'
  | 'DEPENDENCY_INVALIDATED';

interface TargetQualification {
  candidateSha: string;
  provider: string;
  hostKind: string;
  os: string;
  osVersion: string;
  architecture: string;
  runtimeVersion: string;
  executionSurface: 'ui' | 'cli' | 'api' | 'ide' | 'automation';
  modelMode: 'model-free' | 'model-assisted';
  approvalMode: 'fine-grained' | 'automation';
  state: QualificationState;
  evidenceDigests: string[];
  lastVerifiedAt: string | null;
}
```

```ts
function mayExecute(target: TargetQualification): boolean {
  return target.state === 'CERTIFIED'
    && /^[0-9a-f]{40}$/.test(target.candidateSha)
    && target.evidenceDigests.length > 0
    && target.lastVerifiedAt !== null;
}
```

Production implementation must additionally verify signed evidence, expiry/revocation, policy version, actor and tenant scope, current target capabilities, and dependency freshness. The illustrative predicate above is not sufficient on its own for production authorization.

## 8. Prioritized remediation

### P0 — Release integrity and AWS
- Reconcile full SHA and run all mandatory CI on that exact candidate.
- Re-run `COR-WF-001..006`; require final gate to fail on child failure, skip, cancellation and missing result.
- Resolve AWS OIDC trust and tagged-session permissions with the infrastructure owner; do not weaken tagging or introduce an untagged fallback.
- Execute provision → verify → recover/rollback → teardown → independent zero-residual scan on an explicitly approved disposable target.
- Verify signed evidence is tied to the exact candidate and transaction.

### P0 — Scanner regression
- Run all `SEC-SCAN-001..006`, plus full-history scan and allowlist-expiry tests on the new branch.
- Ensure malformed/missing allowlist, failed Git enumeration, unreadable tracked files, spawn errors and non-zero history scan fail the job.
- Confirm expected empty-repository handling is explicit and tested, not a blanket suppression.

### P1 — Target and mode parity
- Generate a source-derived adapter inventory; each advertised adapter must have capability contracts and at least one native/integration qualification profile.
- Test UI/CLI/API/IDE/automation against shared authorization and plan semantics.
- Prove model credentials/provider state cannot change authorization or bypass policy.
- Test dry-run, approvals, idempotency keys, resumability, cancellation and rollback under injected faults.

### P1 — Localization, accessibility and safety
- Runtime locale tests for all shipped locales and all supported surfaces.
- RTL, keyboard-only, screen reader, contrast, zoom, narrow viewport and low-bandwidth tests.
- No hardcoded user-facing strings, host assumptions, account IDs, regions, file paths or credentials in production paths.
- Configuration schema must validate at startup; missing critical configuration fails before mutation.

### P2 — Broader ecosystem qualification
- Expand CI only for platforms that Ugondu actually claims and can run/test.
- Use native runners where runtime behavior matters; cross-compilation alone is not certification.
- Record unsupported platforms as unsupported, not silently as compatible.
- Qualify versioned host plans and provider capabilities; do not claim universal support from an adapter class existing.

## 9. Exit criteria

Universal COR may be considered only when:
- All mandatory gates pass on the same full candidate SHA.
- AWS live role assumption, deployment, health verification, rollback and cleanup succeed with zero residuals.
- Every advertised target tuple has native or justified equivalent evidence.
- All execution surfaces and model modes pass policy/authorization parity tests.
- Localization, accessibility, security, supply chain and failure recovery gates pass.
- An independent reviewer verifies artifacts and approves the separate sign-off record.

**Current conclusion: 🔴 NOT CERTIFIED.** This audit records bounded implementation progress and explicitly retains all unsupported or unverified combinations as blocked or unassessed.
