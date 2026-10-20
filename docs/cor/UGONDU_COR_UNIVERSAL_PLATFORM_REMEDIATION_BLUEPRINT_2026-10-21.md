# Ugondu COR — Universal Platform Readiness & Remediation Blueprint

- Audit date: 2026-10-21
- Repository: [Chicitadel/ugondu](https://github.com/Chicitadel/ugondu)
- Baseline under inspection: `phase4/production-hardening`
- Audit companion: [Independent re-audit](./UGONDU_COR_UNIVERSAL_READINESS_REAUDIT_2026-10-21_INDEPENDENT.md)
- Sign-off companion: [Separate sign-off record](./UGONDU_COR_UNIVERSAL_READINESS_SIGN_OFF_2026-10-21_INDEPENDENT.md)
- Current decision: 🔴 **UNIVERSAL COR NOT CERTIFIED**
- Nature of this file: source-grounded remediation specification and code snapshots. It does **not** claim that proposed code has been implemented or that a target is certified.

## 1. Colour-coded state register

Legend: 🟢 certified only for the named exact SHA + target tuple + evidence; 🔵 stabilized/guarded but certification incomplete; 🟡 partially evidenced; 🔴 blocked/failing; ⚪ not assessed/no qualifying evidence. Never infer 🟢 from declarations, docs, cross-compilation, a skipped test, or a green wrapper job.

| ID | Zone / level / function | State | Current evidence boundary | Exit condition |
|---|---|---|---|---|
| Z-001 | TypeScript workspace build/typecheck/tests | 🟢 bounded | COR workflow run 39509689375 reports these steps successful on its checked-out SHA; preserve full run/SHA/artifact binding | Re-run on release candidate SHA and retain raw reports |
| Z-002 | Go thin client: Linux amd64/arm64, macOS amd64/arm64, Windows amd64 | 🟢 bounded | CI matrix in `.github/workflows/ci.yml`; jobs passed in run 39509689401. Some smoke commands are only run for selected targets, so do not claim identical runtime coverage | Per-target native smoke/integration tests; exact SHA evidence |
| Z-003 | Release integrity/governance gates | 🟢 bounded | Run 39509689401 reports the named gate successful; only applies to its actual commit | Verify the candidate SHA and attach signed reports |
| Z-004 | Locale validation and I18N audit scripts | 🟢 bounded script run / 🟡 overall locale readiness | `.github/workflows/cor.yml` runs `scripts/validate-locales.js` and `scripts/i18n_audit.js`; passing static checks do not establish runtime coverage, RTL, screen-reader, or locale parity on every surface | Runtime tests per UI/CLI/API/IDE and all shipped locales |
| Z-005 | COR evidence finalization | 🔴 release-control defect | In `.github/workflows/cor.yml`, `cor` and `aws-physical-gate` are separate jobs without a `needs:` dependency. The COR job can report success while the AWS job fails | A single authoritative final gate must require all mandatory child gates to succeed |
| Z-006 | AWS role assumption and transaction tags | 🔴 security/governance defect | `.github/workflows/cor.yml` tries tagged `sts assume-role`, then falls back to an untagged call via shell `||`. This weakens transaction-tag enforcement and must not be used as a fallback | Remove untagged fallback; tagged assumption must fail closed |
| Z-007 | AWS physical deploy/readiness/recovery/rollback/teardown | 🔴 blocked | Run 39509689375: `Assume Tagged Execution Session` failed; read-only conformance probes, physical certification, Fargate certification and residual cleanup were skipped | Successful controlled disposable-target lifecycle plus independent zero-residual scan |
| Z-008 | Docker/OCI image build and runtime qualification | 🟡 partial | Repo defines `docker:up/down/logs`; this alone is not host/provider qualification | Build, scan, start, health, persistence, upgrade, rollback and cleanup evidence per architecture |
| Z-009 | Windows/macOS/Linux desktop + terminal | 🟡 partial | Five Go target tuples exist; no evidence from that matrix establishes all OS releases, shells, package managers, privilege levels or terminal emulators | Expand versioned native target matrix and record each tuple separately |
| Z-010 | UI ↔ CLI ↔ API ↔ IDE behavior/policy parity | ⚪ | No complete independently inspected evidence matrix | Same policy contract and differential tests for each entrypoint |
| Z-011 | Model-assisted ↔ model-free behavior parity | ⚪ | A test file named `tests/qualification/shared-execution-and-mode-parity.test.js` is invoked by COR; existence/run is not proof of all providers, IDEs, actions, outages or approvals | Evidence matrix with provider failures, prompt injection, model-free path, denial and audit parity |
| Z-012 | Fine-grained approvals, pause/cancel/resume/retry/idempotency | ⚪ | Not established by the surfaced run metadata | Fault-injection and state-transition tests for each adapter and entrypoint |
| Z-013 | Automation, scheduling, concurrency, crash recovery | ⚪ | No end-to-end cross-host/multi-runner evidence established here | Parallel execution, lease/lock, retry, deduplication, crash recovery and rollback evidence |
| Z-014 | AWS | 🔴 | Physical gate blocked as above | Complete target-specific AWS evidence |
| Z-015 | Azure, Google Cloud, OCI, other cloud providers | ⚪ | No native qualification evidence surfaced | Only claim support after provider-specific adapter contract and runtime test pass |
| Z-016 | VPS / dedicated server / private cloud / bare metal | ⚪ | No native qualification evidence surfaced | Per-distro, architecture, SSH privilege, firewall, service-manager and rollback test |
| Z-017 | cPanel / DirectAdmin / Plesk / shared hosting | ⚪ | No provider/plan-specific live evidence surfaced; shared hosts may prohibit daemons, containers, privileged operations or long-running processes | Capability detection and explicit safe subset; verify on each declared panel/version/plan |
| Z-018 | SSH/SFTP/rsync/FTP-style deployment adapters | ⚪ | Adapter names or dependencies are not evidence of production safety | Host-key pinning, least privilege, path containment, atomic upload/switch, rollback and failure injection |
| Z-019 | Docker Compose / container hosts / Kubernetes / Helm | ⚪ | Not universally qualified by workspace tests | Per-version/architecture deployment, readiness, secrets, persistence, rollback and uninstall evidence |
| Z-020 | IDEs / extensions / editor-integrated agents | ⚪ | No exhaustive list or evidence matrix inspected | Named IDE/version/extension/OS combinations, permission parity and offline/model-free fallback |
| Z-021 | Localization, accessibility, right-to-left and low-bandwidth use | 🟡 partial | Static scripts exist; no complete user-surface accessibility matrix established | All supported locales/surfaces, keyboard-only, screen-reader, RTL, contrast, zoom, narrow viewport and offline/slow-network tests |
| Z-022 | Zero hardcoding/configuration portability | 🟡 partial | Static scans and configuration claims require independent coverage; no global proof | Configuration schemas, no account/region/host/locale/credential literals, audited allowlists |
| Z-023 | Secret scanning, SBOM, dependency and artifact provenance | 🟡 partial | Existing workflow includes integrity checks; complete history scan and all supply-chain artifacts were not established by surfaced evidence | Full-history secret scan, SCA/SBOM, provenance attestations, pinned actions, raw outputs |
| Z-024 | Certified-zone protection / dependency-aware revalidation | 🔵 intended guardrail | Existing reports specify the policy; no claim that all invalidation paths are implemented | Automated ownership/dependency map and proof that only impacted zones rerun |
| Z-025 | Universal COR release | 🔴 withheld | AWS lifecycle blocked and broad host/mode/IDE matrix unassessed | All required gates pass on one exact SHA and independent sign-off |

## 2. Source-grounded findings

### 2.1 COR and AWS qualification are not currently joined by a required dependency

File: [`.github/workflows/cor.yml`](https://github.com/Chicitadel/ugondu/blob/phase4/production-hardening/.github/workflows/cor.yml)

Current structural snapshot (abridged to the relevant relationship):

```yaml
jobs:
  cor:
    name: COR Certification
    runs-on: ubuntu-latest
    # builds, tests, finalizes and uploads COR evidence

  aws-physical-gate:
    name: AWS Physical Qualification Gate
    runs-on: ubuntu-latest
    if: github.event_name != 'pull_request'
    # live AWS role assumption and physical qualification
```

There is no `needs: [aws-physical-gate]` relationship on a single authoritative release-finalization job. The observed run confirms that `COR Certification` can conclude success while `AWS Physical Qualification Gate` fails. A green top-level COR job is therefore not universal COR approval.

**Required remediation:** keep the offline/static evidence job separate if useful, but create a final job that explicitly depends on all mandatory jobs and validates their conclusions and SHA. The final job must be the only source of overall COR release status/signature.

### 2.2 AWS tagged role assumption silently retries without tags

File: [`.github/workflows/cor.yml`](https://github.com/Chicitadel/ugondu/blob/phase4/production-hardening/.github/workflows/cor.yml)

Current snapshot from `Assume Tagged Execution Session`:

```bash
CREDS=$(aws sts assume-role \
  --role-arn "$EXECUTION_ROLE_ARN" \
  --role-session-name "$TX_ID" \
  --tags "Key=UgonduTransactionId,Value=$TX_ID" "Key=UgonduCOR,Value=true" \
  --query 'Credentials.[AccessKeyId,SecretAccessKey,SessionToken]' \
  --output text 2>/dev/null || \
aws sts assume-role \
  --role-arn "$EXECUTION_ROLE_ARN" \
  --role-session-name "$TX_ID" \
  --query 'Credentials.[AccessKeyId,SecretAccessKey,SessionToken]' \
  --output text)
```

The second call removes the required tags. Do not use it as a recovery path: it can turn a tagging/permissions failure into an untagged session, undermining traceability and any downstream cleanup policy that depends on tags.

**Required remediation:** remove fallback, do not suppress the primary error, require both tags, validate caller identity and session tags before any mutation, and abort before cloud changes if any requirement is missing.

Safe pattern (illustrative; adapt to existing shell conventions and test with shellcheck):

```bash
set -Eeuo pipefail
: "${EXECUTION_ROLE_ARN:?EXECUTION_ROLE_ARN must be configured}"
: "${TX_ID:?transaction id is required}"

aws sts assume-role \
  --role-arn "$EXECUTION_ROLE_ARN" \
  --role-session-name "ugondu-cor-$TX_ID" \
  --tags "Key=UgonduTransactionId,Value=$TX_ID" "Key=UgonduCOR,Value=true" \
  --query 'Credentials.[AccessKeyId,SecretAccessKey,SessionToken]' \
  --output text > "$RUNNER_TEMP/assumed-credentials.txt"

# Validate output shape and caller identity without printing credentials.
# If validation fails, exit non-zero before any deployment or cleanup mutation.
```

Do not print the credentials file or export its contents into workflow logs. Prefer the AWS credentials action or an ephemeral credential mechanism already approved by the repository's security design. The above is a design snapshot, not a drop-in complete credential-management implementation.

### 2.3 Five Go target tuples are not universal OS certification

File: [`.github/workflows/ci.yml`](https://github.com/Chicitadel/ugondu/blob/phase4/production-hardening/.github/workflows/ci.yml)

The current matrix includes:
- Ubuntu runner → Linux/amd64
- Ubuntu runner → Linux/arm64
- macOS runner → Darwin/amd64
- macOS runner → Darwin/arm64
- Windows runner → Windows/amd64

This is useful coverage, but it does not automatically qualify all Linux distributions, Windows releases, macOS releases, architectures, shells, terminals, install methods, or host restrictions. In the current workflow, smoke invocations are conditional for selected tuples, so a successful binary build should be reported as **built**, not automatically **runtime-certified**.

## 3. Universal target model: support is a tuple, not a marketing label

Each supported combination must be a named, versioned target:

```ts
export type EntryPoint = "ui" | "cli" | "api" | "ide";
export type ExecutionMode = "model-free" | "model-assisted" | "automated" | "fine-grained";
export type QualificationState =
  | "certified" | "stabilized" | "partial" | "blocked" | "not-assessed" | "unsupported";

export interface QualificationTarget {
  id: string;                 // stable registry identifier, never derived from display text
  provider: string;           // e.g. aws, azure, gcp, oracle, self-hosted
  hostKind: string;           // cloud, vps, dedicated, private, bare-metal, shared-host
  controlPlane?: string;      // cPanel, DirectAdmin, Plesk, Kubernetes, Compose, systemd, etc.
  os: string;
  osVersion: string;
  architecture: string;
  runtime: string;
  runtimeVersion: string;
  entryPoint: EntryPoint;
  executionMode: ExecutionMode;
  capabilityProfile: string;
  state: QualificationState;
  evidenceRefs: string[];
  evidenceCommit: string;
  invalidationKeys: string[];
}
```

Do not enumerate every possible provider as “supported” merely because this schema can represent it. Registry entries begin as `not-assessed`; only trusted target evidence can promote a target.

### Target families to inventory

| Family | Qualification dimensions that must be explicit |
|---|---|
| OS and workstation | Windows release/build, macOS release, Linux distro/release, CPU architecture, shell, terminal, package/install route |
| Runtime | Node.js version, Go binary/runtime assumptions, container runtime, required system libraries and permissions |
| Cloud | AWS, Azure, Google Cloud, OCI and any additional provider actually implemented; region, identity method, network, resource types, teardown guarantees |
| VPS/dedicated/private/bare metal | Provider/OS image, SSH trust, sudo policy, systemd/OpenRC/service manager, firewall, storage, rollback and cleanup |
| Shared hosting/panels | cPanel, DirectAdmin, Plesk and actual plan capabilities; PHP/Node support, cron, SSH/SFTP, writable paths, process lifetime, outbound network, resource limits |
| Container/orchestration | Docker/OCI runtime, Compose version, Kubernetes version, Helm version, image architecture, registry, secrets, volumes, probes, upgrade and rollback |
| IDE/editor | Exact IDE and version, extension version, local/remote development, workspace trust, terminal integration, permissions and model provider settings |
| Model integration | Provider/API version, model identifier, rate limit, outage, timeout, invalid output, deprecation, model-free fallback and policy equivalence |
| User surface | UI, CLI, API, IDE, headless automation, scheduled jobs, interactive and non-interactive shells |
| Execution policy | Preview/dry run, per-step approval, batch approval, automated mode, cancellation, resume, retries, rollback and audit event integrity |

## 4. Evidence contract and promotion rules

Every test must emit a machine-generated record bound to a full 40-character candidate SHA, target tuple, exact command, native runner, timestamps, exit status, raw evidence digest and trusted CI identity. No manually authored record may simulate success.

```json
{
  "schemaVersion": "1.0",
  "candidateCommit": "<full-40-character-sha>",
  "zoneId": "Z-000",
  "targetId": "<registered-target-id>",
  "qualification": "native-runtime",
  "result": "passed",
  "runner": "<trusted-runner-id>",
  "command": "<exact-command>",
  "exitCode": 0,
  "startedAt": "<UTC timestamp>",
  "completedAt": "<UTC timestamp>",
  "rawEvidenceDigest": "sha256:<digest>",
  "attestation": "<verified CI provenance reference>"
}
```

Promotion rules:
1. `not-assessed → partial`: only after a real run emits valid evidence but coverage is incomplete.
2. `partial → stabilized`: negative cases, recovery and relevant regression checks pass, with remaining explicit gaps.
3. `stabilized → certified`: all target-specific acceptance criteria pass on the same SHA; reviewer verifies evidence.
4. Any source/dependency/toolchain/policy/runner-image/trust-root change invalidates only impacted evidence, but may invalidate many zones if shared dependencies changed.
5. Failed mandatory gate or missing/malformed evidence means 🔴 blocked; skipped means not passed.
6. Overall COR can be 🟢 only if every mandatory target and required safety gate is green, not merely because a weighted score is high.

## 5. Fail-closed release finalizer — implementation snapshot

This is a reference contract, not a claim that this exact code is integrated. Map it to the existing COR evidence schema and finalizer; do not add a competing second signing authority.

```ts
type GateResult = {
  conclusion: "success" | "failure" | "cancelled" | "skipped";
  candidateCommit: string;
  evidenceDigest?: string;
  attestationVerified: boolean;
};

const REQUIRED_GATES = [
  "release-integrity",
  "native-tests",
  "platform-evidence",
  "security-scan",
  "localization-accessibility",
  "ui-cli-api-ide-parity",
  "execution-safety",
  "host-adapter-qualification",
  "aws-live-lifecycle"
] as const;

export function assertReleaseEligible(
  candidateCommit: string,
  gates: Record<string, GateResult | undefined>
): void {
  if (!/^[0-9a-f]{40}$/i.test(candidateCommit)) {
    throw new Error("COR blocked: candidate SHA must be full 40-character hex");
  }

  for (const id of REQUIRED_GATES) {
    const gate = gates[id];
    if (!gate) throw new Error(`COR blocked: missing gate ${id}`);
    if (gate.conclusion !== "success") {
      throw new Error(`COR blocked: ${id} concluded ${gate.conclusion}`);
    }
    if (gate.candidateCommit !== candidateCommit) {
      throw new Error(`COR blocked: SHA mismatch for ${id}`);
    }
    if (!gate.evidenceDigest || gate.attestationVerified !== true) {
      throw new Error(`COR blocked: unverified evidence for ${id}`);
    }
  }
}
```

**Required CI wiring:** an authoritative final job must declare `needs:` for every mandatory job; inspect each job's actual conclusion; fail on `skipped`, `cancelled`, missing output, SHA mismatch, missing artifact, signature failure or invalid evidence. Pull-request validation must not sign a production authority. Physical infrastructure qualification must use a gated environment and least-privilege OIDC trust.

## 6. Certified-zone guardrails and selective revalidation

Certified zones must be immutable by default. A change must explicitly declare modification zones and dependency zones before execution. If the change touches a certified zone or any transitive dependency, invalidate and rerun only the affected qualification set. Never mutate a frozen zone silently.

```ts
interface ZoneEvidence {
  id: string;
  state: QualificationState;
  ownedPaths: string[];
  dependencyIds: string[];
  evidenceDigest?: string;
  candidateCommit?: string;
  frozen: boolean;
}

interface ChangeImpact {
  changedPaths: string[];
  deletedPaths: string[];
  renamedFromPaths: string[];
  changedLockfiles: string[];
  workflowOrPolicyChanged: boolean;
  toolchainOrRunnerChanged: boolean;
  trustRootChanged: boolean;
  approvedModificationZones: string[];
}

export function mustRevalidate(
  zone: ZoneEvidence,
  impact: ChangeImpact,
  transitiveDependencyPaths: string[]
): boolean {
  if (zone.state !== "certified") return true;
  if (!zone.frozen || !zone.evidenceDigest || !zone.candidateCommit) return true;

  const relevant = [
    ...impact.changedPaths,
    ...impact.deletedPaths,
    ...impact.renamedFromPaths,
    ...impact.changedLockfiles,
    ...transitiveDependencyPaths
  ];

  return relevant.some(path => zone.ownedPaths.includes(path)) ||
    impact.workflowOrPolicyChanged ||
    impact.toolchainOrRunnerChanged ||
    impact.trustRootChanged;
}
```

Before touching a frozen zone:
- produce an impact report listing changed paths, owning zone, dependent zones, and why revalidation is required;
- require an explicit approved modification-zone declaration;
- snapshot baseline tests and evidence digests;
- run the narrow impacted tests plus cross-boundary contract tests;
- compare outputs against baseline and reject unexplained drift;
- restore/revert on failure; never relabel a failing zone as certified;
- keep an append-only audit event with actor, reason, old/new digests and approvals.

The function above is a design sketch. Production code must resolve transitive dependency IDs (not just direct file names), generated files, symlinks, globbed build inputs, environment/config files, CI workflows, lockfiles, scripts, policy packs and trust roots. An unknown dependency is a reason to widen revalidation, not to skip it.

## 7. Model-assisted and model-free execution must share one deterministic policy boundary

Model output is untrusted suggestion data. A model must never bypass authorization, typed action validation, plan digest binding, host capability restrictions, approval rules, secret redaction, audit logs or rollback controls.

```ts
interface ExecutionIntent {
  planId: string;
  planDigest: string;
  actorId: string;
  targetId: string;
  actions: Array<{
    id: string;
    operation: string;
    parameters: Record<string, unknown>;
    risk: "read" | "write" | "destructive";
    approvalRequired: boolean;
  }>;
}

async function executeThroughPolicyBoundary(
  intent: ExecutionIntent,
  origin: "ui" | "cli" | "api" | "ide" | "automation",
  mode: "model-free" | "model-assisted"
) {
  validateSchema(intent);
  await verifyActorAndTargetPermissions(intent.actorId, intent.targetId);
  await verifyPlanDigest(intent.planId, intent.planDigest);
  await enforceTargetCapabilityProfile(intent.targetId, intent.actions);
  await enforceRiskApprovalPolicy(intent, origin, mode);
  await appendImmutableAuditEvent("execution.accepted", {
    planId: intent.planId, planDigest: intent.planDigest, origin, mode
  });
  return executeWithCheckpointsAndRollback(intent);
}
```

Tests must prove that identical intents produce identical allow/deny decisions regardless of UI, CLI, API, IDE, model provider, or model-free path. Model-generated plans require schema validation and policy re-evaluation after every model call. Test provider timeout, malformed response, refusal, prompt injection, tool-call hallucination, rate limit, deprecated model ID and unavailable credentials. If the model fails, deterministic model-free execution remains available only when the requested operation and user permissions allow it.

## 8. Fine-grained and automated execution contract

Required lifecycle states include at minimum: `DRAFT → VALIDATED → AWAITING_APPROVAL → READY → RUNNING → PAUSED/CANCELLING → SUCCEEDED/FAILED/CANCELLED → ROLLING_BACK → ROLLED_BACK/ROLLBACK_FAILED`. Persist state before side effects. Every action must be idempotency-keyed, checkpointed, deadline-bounded and tied to the immutable plan digest.

Required negative and fault-injection cases:
- deny one step while allowing independent read-only inspection;
- modify plan after approval and ensure digest mismatch blocks execution;
- cancel before and during a mutating operation;
- crash after remote side effect but before local acknowledgement;
- retry duplicate request and prove no duplicate deployment/resource;
- concurrent runs against the same target and lock/lease expiry;
- partial upload, interrupted SSH, lost connection, provider rate limit and expired credentials;
- rollback itself fails and system preserves recovery instructions/evidence;
- automation runs without an interactive TTY and does not silently auto-approve destructive actions;
- dry-run produces no side effects, verified by before/after inventory;
- replay/duplicate webhook or scheduler trigger does not duplicate work.

## 9. Host adapter contract: capability detection before action

Every adapter must publish a machine-readable capability profile. Never assume shared hosting can run containers, system services, background workers or privileged commands.

```ts
interface HostCapabilities {
  adapterId: string;
  detected: boolean;
  capabilities: {
    shell: boolean;
    ssh: boolean;
    sftp: boolean;
    rsync: boolean;
    containers: boolean;
    systemServiceManager: boolean;
    cron: boolean;
    writableReleaseDirectory: boolean;
    atomicSymlinkSwitch: boolean;
    outboundNetwork: boolean;
    privilegedOperations: boolean;
  };
  restrictions: string[];
  probeEvidence: string[];
}
```

Rules:
- If required capability is absent, reject the plan before mutation and explain a localized remediation.
- Use a capability-safe deployment mode for cPanel/DirectAdmin/shared hosting (e.g. upload to a release directory and atomically switch only if the host supports it); otherwise mark the target unsupported rather than improvising.
- SSH must verify host keys and constrain remote paths. SFTP uploads must reject traversal, symlinks escaping the release root, unsafe archive paths and unexpected file types.
- Avoid exposing provider secrets to model context, command previews, process arguments, logs or audit records.
- Rollback must be based on a recorded previous release, not a guessed path or hardcoded provider layout.
- Each provider adapter has contract tests, negative tests, native smoke tests and teardown evidence.

## 10. Zero-hardcoding and localization policy

Configuration values that vary by environment/provider/region/host/OS/runtime/locale must be validated from typed configuration and environment inputs. Security-sensitive identifiers must never silently fall back to a developer's account or default region.

Prohibited examples:
- hardcoded cloud account IDs, role ARNs, regions, hostnames, user paths, credentials, API endpoints, model IDs that are assumed permanent;
- user-facing strings embedded in UI/CLI/IDE/API errors instead of locale tokens;
- hardcoded locale lists duplicated across subsystems;
- implicit fallback from tagged to untagged cloud identity or from secure transport to insecure transport;
- adapter capability inferred from provider name instead of a live/declared capability probe.

Required controls:
- schema-validated configuration with provenance and explicit defaults only for non-security-sensitive settings;
- secret manager/environment injection, no secrets committed or echoed;
- locale token registry as the source of truth, key parity across all supported locales, plural/gender/number/date/units handling as applicable;
- missing required locale key fails CI; no English fallback that hides missing production strings unless policy explicitly allows and records it;
- runtime locale switch test, RTL layout, keyboard-only use, screen-reader labels, 200% zoom, narrow viewport and high-contrast modes;
- scan source, tests, scripts, manifests, workflows, generated output and templates for literals; use narrow documented allowlists with owners and expiry.

## 11. Security, evidence and supply-chain guardrails

- Pin GitHub Actions to full commit SHA and review version changes.
- Use GitHub OIDC for cloud identity; constrain role trust to exact repository, workflow/ref/environment and audience. Never add long-lived cloud keys to repository secrets.
- Separate read-only conformance permissions from mutation permissions; isolate physical qualification in a protected environment.
- Validate every evidence artifact structurally, cryptographically and against the exact SHA. Reject empty/malformed JUnit, fake counts, missing test cases, duplicate IDs, missing raw output and test results disconnected from process exit status.
- Scan complete reachable Git history for secrets; test scanners with synthetic fixtures in isolated tests and verify they fail the build.
- Produce SBOM and dependency vulnerability reports; bind reports to artifact digests and release provenance.
- Treat workflow skip/cancel as failure for mandatory qualification. A green parent must never mask a red child.
- Cloud teardown is not proven by a successful delete command alone: enumerate resources using tags and independent inventory, then prove zero residual resources within the declared account/region/scope.
- Never run destructive physical qualification against production by default. Require an explicit protected-environment approval and cost/resource bounds.

## 12. Parallel execution plan with protected boundaries

This is a workstream plan, not a claim that external subagents have been spawned. Workstreams can run concurrently only after ownership and dependency boundaries are recorded.

| Workstream | Owned zone | Parallel? | Deliverable | Boundary rule |
|---|---|---|---|---|
| A. COR finalizer + SHA integrity | `.github/workflows/cor.yml`, COR finalization | yes, isolated owner | Required-gates join, skipped-job failure, exact-SHA/artifact checks | Do not edit AWS adapter internals |
| B. AWS OIDC/tagging/lifecycle | AWS physical gate and cloud scripts | yes, isolated owner | Remove untagged fallback, least-privilege trust, full lifecycle evidence | No production mutation; protected test environment only |
| C. OS/runtime matrix | `.github/workflows/ci.yml`, client target tests | yes | Native smoke tests and target evidence registry | Preserve current five targets; no weakening existing tests |
| D. Host/provider adapters | adapter modules and capability schemas | yes, per adapter owner | cPanel/DirectAdmin/VPS/private/cloud/container contracts | Do not change shared execution policy without interface review |
| E. Mode/entrypoint parity | shared execution policy, UI/CLI/API/IDE contracts | yes | Differential authorization and audit tests | One shared policy boundary; no per-surface bypass |
| F. Execution safety | state machine, approval, pause/cancel/retry/rollback | yes | Fault-injection suite and state transition evidence | Do not change frozen state schema without migration and compatibility review |
| G. Localization/accessibility | locale registry, UI/CLI/IDE surfaces | yes | Locale parity, RTL/accessibility report | No direct strings; preserve existing token IDs |
| H. Security/supply chain | scanners, SBOM, evidence verifier | yes | Full-history scan, SBOM/SCA, artifact provenance | Never expose secrets; no self-attestation as sole trust root |
| I. Regression/certification review | evidence registry and protected zones | coordinates after workstreams | Impact map, test report, final sign-off recommendation | Independent reviewer; cannot sign own implementation |

Integration protocol:
1. Freeze baseline commit and collect baseline test/evidence digests.
2. Assign one owner per file/zone; publish declared modification zones and dependencies.
3. Run workstreams concurrently only when write sets do not overlap; otherwise serialize or use explicit interface contracts.
4. Merge one workstream at a time into integration branch; run targeted tests plus cross-boundary contract suite.
5. Recompute impact graph after every merge; only affected zones are revalidated, while shared dependency changes invalidate dependents.
6. Run complete mandatory suite on one final candidate SHA; no cherry-picking green statuses across commits.
7. Independent reviewer inspects raw evidence and then updates the separate sign-off record.
8. If any mandatory gate fails, overall status remains 🔴 and no release certification is issued.

## 13. Priority-ordered remediation backlog

| ID | Priority | Action | Acceptance criterion | State |
|---|---|---|---|---|
| R-001 | P0 | Remove untagged AWS role-assumption fallback | Tagged assumption required; failure aborts before mutation; no credential output in logs | 🔴 |
| R-002 | P0 | Join mandatory physical gate to authoritative finalizer | Final release gate depends on AWS and every required job; skipped/failure blocks sign-off | 🔴 |
| R-003 | P0 | Reconcile full candidate SHA across report, PR, run, artifacts and sign-off | All full SHAs match exactly and artifacts attest to candidate | 🔴 |
| R-004 | P0 | Run AWS disposable target lifecycle | Assume identity, probe, deploy, readiness, fault/recovery, rollback, teardown, independent zero-residual inventory all pass | 🔴 |
| R-005 | P1 | Expand native OS/runtime target evidence | Every claimed target tuple has native runtime evidence; build-only status distinguished | 🟡 |
| R-006 | P1 | Inventory all actually implemented host/provider adapters | Each adapter classified supported/unsupported/not-assessed; no inferred coverage | ⚪ |
| R-007 | P1 | Prove UI/CLI/API/IDE and model-free/model-assisted parity | Same allow/deny and audit semantics; all supported providers and offline cases tested | ⚪ |
| R-008 | P1 | Prove fine-grained and automation safety | State transitions, idempotency, concurrency, cancellation, crash recovery, rollback tests pass | ⚪ |
| R-009 | P1 | Complete locale and accessibility qualification | Runtime locale parity, RTL, keyboard/screen-reader, zoom, narrow screen and missing-key failure | 🟡 |
| R-010 | P1 | Complete security/supply-chain evidence | Full history scan, seeded-secret tests, SBOM/SCA, provenance and evidence verification | 🟡 |
| R-011 | P2 | Implement certified-zone freeze and dependency-aware invalidation | Only impacted zones rerun; frozen zones cannot mutate without approved change record | 🔵 |
| R-012 | P2 | Remove remaining hardcoding and validate config schema | Static + runtime checks; no security-sensitive silent defaults; reviewed allowlists | 🟡 |

## 14. Release checklist

- [ ] Exact full candidate SHA is consistent across source, workflows, evidence bundle, audit and sign-off.
- [ ] AWS tagged role assumption succeeds; untagged fallback is absent.
- [ ] AWS deploy/readiness/fault/recovery/rollback/teardown/zero-residual lifecycle succeeds on a disposable, protected target.
- [ ] The authoritative finalizer requires all mandatory gates and rejects skipped, cancelled, missing or mismatched evidence.
- [ ] Every advertised OS/runtime/architecture/host/IDE/provider/mode tuple has native qualifying evidence.
- [ ] UI, CLI, API and IDE policy behavior is equivalent.
- [ ] Model-assisted and model-free modes share authorization, approvals, audit, cancellation and rollback invariants.
- [ ] Fine-grained and automated execution pass negative and fault-injection tests.
- [ ] Every supported locale and accessibility target passes runtime qualification.
- [ ] Secret scan, SCA, SBOM and provenance artifacts are bound to the exact release.
- [ ] Frozen certified zones are protected; modifications trigger dependency-aware revalidation.
- [ ] Independent engineering, security, platform and cloud reviewers sign the final evidence record.

**Disposition:** 🔴 **NOT CERTIFIED.** The immediate P0 issues are the untagged AWS fallback and the lack of an enforced dependency between AWS physical qualification and the authoritative COR result. The broader claim of universal readiness must remain withheld until every advertised target tuple has qualifying evidence. Documentation alone does not remediate source code or confer certification.
