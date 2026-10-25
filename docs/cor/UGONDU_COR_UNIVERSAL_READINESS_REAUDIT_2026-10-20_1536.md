# Ugondu COR Universal Readiness — Re-audit & Remediation Plan

> **Product:** Ugondu — Universal Delivery Operating System  
> **Legal entity:** Air Roofers SASU  
> **Audit date:** 2026-10-20  
> **Source ref inspected:** `phase4/production-hardening`  
> **Prior audit:** [Universal Readiness Re-audit](./UGONDU_COR_UNIVERSAL_READINESS_REAUDIT_2026-10-20.md)  
> **Disposition:** 🔴 **BLOCKED — NOT COR CERTIFIED**  
> **Audit method:** Remote source inspection. No local suite execution and no independent live AWS account verification were performed in this review.

## 1. Executive decision

The supplied “100% remediated & certified” summary is **not substantiated by the inspected source**. Important changes are visible: the current `.github/workflows/ci.yml` pins several actions by full SHA, the inspected Go smoke-test block no longer contains the earlier `|| true` fallback, and the asset validator now attempts exact manifest/checksum/disk set equality. These are real improvements in source. However, the claimed native test report remediation is incomplete: `scripts/release/native-reporter-harness.cjs` still synthesizes JUnit test cases by parsing `console.log` / `console.error` lines with pass/fail regular expressions. That is not a native test-runner report and can miss assertion failures that do not emit matching text. The parser is regex-based rather than a full XML parser. AWS qualification, platform status derivation, evidence authenticity, and universal UI/IDE/model/non-model/automation parity remain insufficiently evidenced.

The supplied short commit `16f4d4c9` and prior long SHA `736e7adc18e8df5cbcc3469baae05da82c443657` were not resolved by the repository commit search used in this audit. The source findings below refer to the accessible branch ref, not to a claimed immutable commit. Before release sign-off, record and verify the full candidate SHA from the actual checked-out repository and bind all evidence to it.

## 2. Colour key

| State | Meaning | Required handling |
|---|---|---|
| 🟢 **Certified / frozen** | Exact commit + target + runtime + mode passed independently reviewed qualification | Freeze scope; rerun only impact-selected contract/regression tests when dependencies change |
| 🔵 **Stabilized / guarded** | Source contract is established, but not fully COR-certified | Preserve baseline; run focused contract tests on change |
| 🟡 **Partial / evidence pending** | Implementation or limited checks exist; qualification incomplete | Continue remediation and attach evidence |
| 🔴 **Blocked / uncertified** | Trust, correctness, safety, or qualification gap blocks certification | Must not be marketed as certified; fail closed |
| ⚪ **Not assessed** | No adequate evidence was inspected | Explicitly list as unknown; do not infer support |

**No zones are certified 🟢 by this audit.** “Certified list walked down to zero” is interpreted as *the outstanding uncertified list must progressively shrink to zero*; the certified list should grow, not shrink.

## 3. Colour-coded progress list

| Zone / capability | State | Evidence observed | Remaining gate / freeze rule |
|---|---|---|---|
| Action pinning in inspected CI workflow | 🔵 Stabilized | `.github/workflows/ci.yml` uses full SHA pins for checkout, setup and artifact upload actions in inspected sections | Inventory every workflow, reusable workflow, composite action and container image. Freeze once every external action/image is pinned and automated pin verification passes. |
| Go client build matrix | 🟡 Partial | Linux amd64/arm64, macOS amd64/arm64, Windows amd64 build rows exist | Only selected rows execute native smoke commands; Linux arm64 and macOS amd64 are cross-builds on different host architecture unless native runner labels prove otherwise. Split build and native runtime qualification states. |
| Go CLI smoke failure handling | 🔵 Improved, not certified | Inspected CI block has no `|| true` and executes smoke commands on selected targets | Add explicit output/exit-code assertions, JSON mode, cancellation, signal, shell/quoting, terminal/no-TTY and locale tests; inspect all workflows for hidden error suppression. |
| Native test-report production | 🔴 Blocked | `native-reporter-harness.cjs` turns console lines into synthetic JUnit testcases | Replace console interception with actual runner-native XML/JSON or structured event adapter. Prove assertion failures and uncaught errors are always represented. |
| JUnit parser | 🔴 Blocked | `junit-parser.mjs` counts tags using regex and checks presence of tags, not a complete XML parse | Use maintained XML parser with DTD/entity expansion disabled; validate root, suite/case nesting, count attributes, failure/error/skipped semantics, duplicate IDs, commit metadata and schema. |
| Evidence collector commit binding | 🟡 Partial | Collector records Git commit/tree and injects the commit into the harness environment | Harness-generated commit attribute is self-asserted by the same process. Bind external report provenance to CI run identity and immutable checkout metadata; do not trust an env value alone. |
| Platform matrix truthfulness | 🔴 Blocked | `config/qualification/platform-matrix.json` has intended target definitions and `minimumRequiredTier` | Target definitions are not results. Generate a separate execution ledger from actual runner attestations; target status must be derived from verified native artifacts, not copied from manifest or locally generated summaries. |
| Brand inventory and checksums | 🟡 Improved, not certified | `validate-assets.mjs` now compares manifest/checksum/disk sets and verifies SHA-256 | Fix recursive string collection for manifest paths, verify digest format and safe path canonicalization on Windows/POSIX, reject symlinks, parse SVG as XML and validate PNG/ICO structure beyond magic/header checks. Add adversarial fixtures. |
| Brand component and asset URL resolution | ⚪ / 🟡 Not fully assessed | Shared logo component exists; the current inspection did not independently exercise all consumers | Test web, docs, desktop, mobile, CLI/package release paths, basePath/CDN prefixes, CSP, offline install, missing asset fallback, alt tokens and decorative semantics. |
| Localization | 🟡 Partial | Report claims 12 locale copies; source contains locale validators | Verify authoritative locale roots and runtime consumers; exact key and ICU placeholder parity, semantic translation review, RTL, plural rules, long strings, fallback and all UI/CLI/IDE/automation messages. |
| AWS region/account boundary | 🔴 Blocked | `run-aws-conformance.mjs` defaults region to `eu-west-3` and hardcodes expected account ID `971671216490`; probes STS and read-only EC2 discovery | Inject target account/region through governed deployment profile; validate approved account/region allowlist; do not default silently for certification. Use isolated account and short-lived OIDC identity. |
| AWS deployment/recovery/rollback | 🔴 Blocked | Workflow invokes physical certification modules and a residual scanner; source presence does not prove the workflow passed or that cleanup is complete | Verify actual run artifacts and resource inventories. Demonstrate create, readiness, failure injection, rollback, retry/resume, deletion, orphan scan and post-run zero-residual proof in isolated AWS. |
| Evidence provenance and trust | 🔴 Blocked | Collector builds local evidence envelopes; finalizer verifies self-contained receipts; signer requires injected keys and self-tests key correspondence | Require independently trusted builder identity/attestation and signed artifact manifest. Ensure evidence comes from raw runner output; receipts generated from planned stream IDs alone are not proof of execution. Review trust root and key custody outside the candidate tree. |
| COR finalizer | 🔴 Blocked pending evidence semantics | `scripts/cor-finalize.js` checks 40 stream receipts, their digests, and source commit/tree | A digest over self-created receipt only proves receipt integrity. Require each receipt to reference immutable raw evidence and a verified test/target result; do not equate “40 receipts exist” with “40 real streams passed.” |
| COR signer | 🟡 Partial | `scripts/cor-signer.js` requires private/public keys, clean tree, ledger and finalization | Signing a weak/self-generated evidence ledger does not certify reality. Validate signature algorithm against key type, independent trust-root policy, key rotation/revocation, and release authority. Move repository identity/configuration into governed config where portability requires it. |
| Secret scanning | 🔴 Blocked | Collector scans tracked files for private-key header patterns | Regex-only scanning is not complete secret scanning and does not cover full Git history, untracked build output or entropy/provider patterns. Add maintained scanner + history scan + SARIF and false-negative fixtures. |
| Dependency/SBOM scan | 🟡 Partial | `npm audit --omit=dev` and lockfile-derived SBOM generation exist | Verify scanner exit status and full report provenance, include all shipped runtimes and Go dependencies, validate SBOM schema and compare against actual release artifact contents. |
| Repository providers | 🔴 Blocked | Matrix has GitHub/GitLab/Bitbucket/CodeCommit entries with minimum tiers | Shared adapter unit tests do not qualify each provider. Require provider-specific contract tests and live sandbox evidence per claimed capability. Explicitly label unavailable/implemented/tested/qualified. |
| Hosts/cloud providers | 🔴 Blocked / ⚪ Not assessed by provider | AWS, DirectAdmin and Docker Compose are represented; other provider rows are partial or not assessed | Build capability-by-provider matrix. Do not imply Azure/GCP/OCI/IBM/VMware/Proxmox/Kubernetes/cPanel/DirectAdmin support unless implemented and tested on that provider. |
| UI, CLI, API and IDE parity | 🟡 Partial / ⚪ Not assessed | Mode-parity test file is present and report claims 6 passing checks | Inspect test assertions for genuine execution, not just state mocks. Add each declared IDE integration and headless terminal/UI/API entrypoint; compare normalized plans, authorization, durable state and evidence. |
| Model-assisted and model-free use | 🟡 Partial | Shared execution/mode parity architecture is claimed | Demonstrate all core capabilities work with no model credentials/network. Model suggestions must pass the same policy, approval and authorization pipeline; test prompt injection, malformed response, outage, timeout and provider switch. |
| Fine-grained execution | ⚪ Not assessed | Complete independent evidence not available | Test action-level plan digest, approval binding, dry-run, pause/cancel/resume, partial execution, rollback, audit and policy recheck. |
| Automation execution | 🟡 Partial | Automation mode is represented in the target model | Test workload identity, least privilege, idempotency/deduplication, concurrency, retry ceilings, deadlines, cancellation, stale plan rejection, secret expiry, notifications and recovery. |
| Accessibility and inclusive use | ⚪ Not assessed | Logo alt attributes alone do not prove product accessibility | Test keyboard, screen reader, contrast, zoom, reduced motion, RTL, small screens, focus order, error announcements and non-colour-only state cues. |
| Overall COR sign-off | 🔴 Withheld | No independently verified immutable candidate evidence bundle was available to this audit | Keep sign-off unsigned until all P0/P1 blockers close and independent reviewers approve. |

## 4. Detailed findings and remediation

### COR-RERUN-001 — Synthetic JUnit remains (P0)

**Files**
- `scripts/release/native-reporter-harness.cjs`
- `scripts/release/junit-parser.mjs`
- `scripts/release/collect-qualification-evidence.mjs`
- Test runner package scripts and CI workflows.

The file named “native reporter harness” intercepts console methods and creates JUnit testcase entries from strings matching `PASS_REGEX` / `FAIL_REGEX`. This is still console-derived JUnit. A test can throw an assertion without logging a matching failure line; a suite can log a pass and then fail; a helper can log multiple pass lines for one actual test; and skipped/retried cases are not faithfully represented. The parser then regex-counts XML tags rather than parsing XML structurally.

**Required change**
1. Use each runner’s native reporter: Node test runner/Jest/Vitest JUnit or JSON report; Go’s structured `go test -json` events or a tested adapter that maps event types, not stdout text; integration/e2e frameworks’ native reports.
2. Store native report bytes before any aggregation; hash raw bytes; never synthesize pass cases from console lines.
3. Parse XML with a maintained parser with external entities/DTD disabled. Verify counts against actual child elements; reject malformed nesting, mismatched counts, zero tests, missing report, unexpected skips and source mismatch.
4. Verify CI run ID, repository, workflow, ref, full source SHA/tree, target, runtime, command, timestamps and artifact digest from trusted workflow context.
5. Keep console logs as diagnostic artifacts only.
6. Add adversarial tests for assertion-without-console, console-pass-then-throw, malformed XML, count mismatch, missing/stale report, report from another commit, skipped tests and empty suite.

**Illustrative runner contract (Node test runner; adapt to package runner):**

```json
{
  "scripts": {
    "test:cor": "node --test --test-reporter=spec",
    "test:cor:junit": "node scripts/qualification/run-native-node-tests.mjs"
  }
}
```

The wrapper should launch the actual test runner, collect its structured event stream or native report, and convert events only with a separately tested adapter. It must not parse arbitrary console messages into test results.

```js
// scripts/qualification/assert-native-report.mjs — illustrative contract
import fs from 'node:fs';
import crypto from 'node:crypto';

export function assertReportBytes(file, expectedSha256) {
  if (!fs.existsSync(file)) throw new Error(`Required report missing: ${file}`);
  const bytes = fs.readFileSync(file);
  if (bytes.length === 0) throw new Error('Native report is empty');
  const actual = crypto.createHash('sha256').update(bytes).digest('hex');
  if (expectedSha256 && actual !== expectedSha256) {
    throw new Error('Native report digest mismatch');
  }
  return { bytes, sha256: actual };
}

// Then parse bytes with a maintained XML/JSON parser. Validate the complete
// schema and count actual test/failure/error/skipped nodes. Do not use regex
// matching of console output as the source of test truth.
```

### COR-RERUN-002 — Matrix definitions must not become qualification results (P0)

**File:** `config/qualification/platform-matrix.json`.

`targetDefinitions` and `minimumRequiredTier` are requirements, not proof of test execution. The listed runtime version strings and future review dates do not demonstrate the runner used those versions. Cross-compilation does not establish native runtime support.

**Required change**
- Keep static target definitions in the manifest and store results separately under the evidence run.
- Every target result must include full source SHA/tree, run ID, runner image, OS version, architecture, runtime/tool versions, exact commands, exit codes, native reports/digests, and start/end times.
- Derive `tested` only from successful target-bound native test evidence; derive `qualified` only after the live capability test required for that target.
- Use `not-assessed` for absent evidence, `blocked` for failed evidence, and `unsupported` only when intentionally excluded by product policy.
- Mark cross-builds as `cross-built`, not `runtime-tested`.
- Validate every result against the declared target; reject unexpected or duplicate target IDs.

```ts
type State = 'not-assessed' | 'implemented' | 'cross-built' | 'tested' |
  'qualified' | 'blocked' | 'unsupported';

interface VerifiedTargetEvidence {
  targetId: string;
  sourceSha: string;
  runnerOs: string;
  runnerArch: string;
  targetOs: string;
  targetArch: string;
  nativeExecution: boolean;
  exitCode: number;
  reportDigests: string[];
  requiredReportCount: number;
  attestationVerified: boolean;
  liveQualificationPassed: boolean;
}

export function deriveState(e: VerifiedTargetEvidence): State {
  if (!e.targetId || !e.sourceSha || !e.runnerOs || !e.runnerArch) return 'blocked';
  if (!e.attestationVerified || e.exitCode !== 0) return 'blocked';
  if (e.reportDigests.length < e.requiredReportCount) return 'not-assessed';
  if (!e.nativeExecution) return 'cross-built';
  if (e.liveQualificationPassed) return 'qualified';
  return 'tested';
}
```

The real implementation must verify each digest against immutable artifact bytes and the signed runner attestation; the illustrative function alone is not a trust mechanism.

### COR-RERUN-003 — Asset validation needs structural and cross-platform hardening (P1)

**File:** `scripts/branding/validate-assets.mjs`.

The current implementation is materially improved by checking three sets. Remaining risks: manifest path extraction recursively treats every string under `assets` as a path; path normalization differs across POSIX/Windows; symlinks are not included in the regular-file walk and are not explicitly rejected; SVG validation is string-based rather than XML parsing; PNG validation checks signature/IHDR/dimensions but not complete decoding/CRC/alpha; ICO validation checks the header and a minimum entry count without validating each entry’s bounds and embedded image data.

**Required change**
- Define a strict manifest schema with an explicit `assets[].path` field and reject unknown types/duplicate logical IDs/duplicate paths.
- Normalize to POSIX relative paths, reject absolute paths, drive letters, UNC paths, NUL, `.`, `..`, alternate separators and paths that escape after canonicalization.
- Use `lstat` and reject symlinks unless a narrowly scoped policy explicitly allows them; if allowed, resolve real paths and ensure containment.
- Parse SVG with a safe XML parser and reject scripts, event handlers, external references and unsafe CSS/URLs.
- Fully decode PNG and each ICO image entry with a maintained library; verify expected sizes, alpha policy and all offsets/sizes stay within file bounds.
- Require manifest paths = checksum paths = physical regular files exactly, excluding only the explicitly declared metadata files.
- Load approved brand colours from the canonical brand token source; do not maintain duplicate magic colour lists in scripts.
- Add tamper/missing/untracked/duplicate/path traversal/symlink/invalid-format tests.

### COR-RERUN-004 — AWS account/region selection must be explicit and live lifecycle qualification must be evidenced (P0)

**Files**
- `scripts/aws-conformance/run-aws-conformance.mjs`
- `scripts/aws-conformance/aws-env.mjs`
- `.github/workflows/cor.yml`
- `server/engine-core/physical-certification.ts`
- `server/engine-core/physical-fargate-certification.ts`
- `scripts/ci/residual-scanner.ts`

The conformance script hardcodes an expected account ID and defaults the region to `eu-west-3`. This is a brittle portability boundary and risks qualifying the wrong target if configuration is incomplete. The read-only discovery probe is useful, but not sufficient evidence of deployment stability. The workflow’s presence and the existence of physical-certification scripts do not prove successful live execution or complete resource cleanup.

**Required change**
1. Load account, region, approved resource prefixes/tags, budget and TTL from a validated environment profile or signed deployment target configuration.
2. Fail closed if account/region/profile is missing or not explicitly approved. Do not silently default a certification target.
3. Verify OIDC issuer, repository/ref/workflow claims, assumed role, session tags and effective permissions before any write action.
4. Run only in an isolated disposable account/environment; never run destructive qualification against production.
5. Exercise create → readiness → controlled fault injection → recovery/resume → rollback → deletion → residual scan; capture raw API outcome metadata, inventory before/after, costs/TTL and all exit codes.
6. Verify logs, metrics, traces, encryption, secrets, backup/restore and alarm behavior in scope.
7. Upload evidence even on failure, but preserve the job’s failing conclusion. Ensure cleanup is attempted on failure and independently verified afterward.
8. Test denied IAM actions and wrong account/region as mandatory fail-closed cases.

```yaml
- name: Validate explicit AWS qualification target
  shell: bash
  env:
    AWS_REGION: ${{ vars.AWS_REGION }}
    UGONDU_EXPECTED_ACCOUNT_ID: ${{ vars.UGONDU_EXPECTED_ACCOUNT_ID }}
  run: |
    set -euo pipefail
    test -n "${AWS_REGION}"
    test -n "${UGONDU_EXPECTED_ACCOUNT_ID}"
    aws sts get-caller-identity --output json > caller-identity.json
    node scripts/aws-conformance/validate-target-identity.mjs caller-identity.json
```

This preflight is only the identity gate, not the lifecycle qualification itself.

### COR-RERUN-005 — Trustworthy evidence, finalization and signing (P0)

**Files:** `scripts/release/collect-qualification-evidence.mjs`, `scripts/release/evidence-scanners.mjs`, `scripts/cor-finalize.js`, `scripts/cor-signer.js`, `.github/workflows/cor.yml`.

The collector creates evidence envelopes and test reports inside the candidate workflow. The finalizer validates receipt IDs/digests and the signer signs the resulting payload. These controls can protect integrity of generated files, but they do not by themselves prove the underlying activities happened. A locally generated receipt can be internally consistent and still be false.

**Required change**
- Bind evidence to raw artifacts emitted by the actual runner and to immutable workflow identity.
- Verify a builder attestation signed by a trust root managed outside the candidate branch. Record repository, ref, workflow, run ID, source SHA/tree, runner image, tools, artifact subject digests and invocation parameters.
- Validate every receipt’s referenced artifacts exist and their bytes match the claimed digest; require native report results and target IDs.
- Reject generated or fixture-only evidence in release qualification unless explicitly labeled and excluded from production qualification.
- Use a schema-validated canonical serialization, algorithm allowlist, key rotation/revocation policy and independent trust-root verification.
- Separate “evidence collected”, “evidence verified”, “qualification passed” and “release signed” statuses. Never collapse these into one PASS flag.
- A signing key must be injected through approved secret/key service or workload identity, with custody and key ID documented. A key pair signing and verifying itself is not independent trust.

### COR-RERUN-006 — Secret scanning is currently too narrow (P0/P1)

**File:** `scripts/release/collect-qualification-evidence.mjs`.

The inspected collector searches tracked files for private-key header patterns. It does not establish comprehensive secret scanning or Git history scanning.

**Required change**
- Add a maintained secret scanner for working tree and full history; add provider-specific token rules, high-entropy detection, SARIF output and governed false-positive allowlist.
- Scan release artifacts and generated evidence before upload.
- Add synthetic test fixtures for AWS keys, GitHub tokens, generic API tokens, PEM keys and secrets split across lines. Assert no secret value appears in logs.
- Treat scanner failure/unavailable binary as blocked, not clean.

### COR-RERUN-007 — Multi-locale and accessibility parity must be tested at runtime (P1)

**Files:** locale roots, `scripts/validate-locales.js`, `scripts/i18n_audit.js`, UI/CLI/IDE integrations.

- Declare one canonical locale source and deterministic generation/sync process.
- Validate exact key parity, ICU placeholder parity, plural/select rules, no empty strings, approved brand-name exceptions, BCP 47 locale IDs and runtime fallback.
- Test Arabic RTL layout, Japanese/Chinese font fallback, long German/French labels, Hindi glyphs, keyboard navigation and screen-reader accessible names.
- Localize all human-facing UI/CLI/IDE prompts, confirmations, errors and automation notifications; keep protocol keys and JSON schema field names stable and language-neutral.
- Verify the user can complete the workflow without relying on colour alone or a model explanation.

### COR-RERUN-008 — Model-assisted and non-model execution must converge on the same governed pipeline (P0)

All entrypoints—UI, terminal/CLI, API, IDE, automation scheduler, and model proposal—must share the same plan schema, policy evaluation, authorization, durable state machine, postcondition verification and evidence format.

```text
UI / CLI / API / IDE / scheduler / model proposal
                    |
                    v
        Schema validation + capability discovery
                    |
                    v
             Deterministic execution plan
                    |
                    v
        Policy evaluation (deny by default)
                    |
                    v
       Authorization / risk-based approval
                    |
                    v
        Durable resumable execution engine
                    |
                    v
     Independent postcondition verification
                    |
                    v
      Evidence manifest + audit record
```

**Required tests**
- Same plan through UI, CLI, API, IDE, automation and model-assisted proposal produces equivalent normalized plan and evidence.
- Core operations work with no model key and no model network access.
- Model timeout, outage, invalid schema, prompt injection, malicious repository instructions, provider deprecation, budget exhaustion and refusal never bypass policy or cause silent action substitution.
- Approval is bound to exact plan digest, target and policy version. Any change invalidates approval.
- All destructive actions require explicit scope and configured approval policy.

### COR-RERUN-009 — Fine-grained and automated execution safeguards (P0)

**Fine-grained execution:** plan-only, dry-run, action selection, dependency graph, approval per risk tier, pause, cancel, resume, rollback, partial-failure state, and inspectable evidence. Every state transition must be durable and idempotent.

**Automation:** dedicated workload identity, minimum privileges, concurrency key, idempotency key, bounded retries with backoff/jitter, deadline, cancellation, stale-plan rejection, secret rotation/expiry, deduplication, notifications and cleanup/rollback policy. Never inherit the initiating human’s ambient permissions by default.

Required fault tests: duplicate trigger, overlapping run, restart mid-step, stale approval, expired credentials, API throttling, partial success, cancellation, rollback failure, evidence store outage and operator takeover.

### COR-RERUN-010 — Zero-regression freeze protocol

1. Keep a machine-readable zone ledger with zone ID, state, scope, exact source SHA, platform/runtime/mode, evidence IDs/digests, reviewer and date.
2. A zone becomes 🟢 only after independent evidence review. Until then, use 🔵/🟡/🔴/⚪.
3. On each PR, compute the impacted zones from the dependency graph and run their contract/regression suite plus mandatory global security and governance gates.
4. A frozen zone is not rerun for unrelated changes. Any change to its source, interface, dependencies, runtime, policy, or transitive dependency reopens only that zone and dependents according to the impact map.
5. A failed contract reopens impacted zones and marks dependent certifications stale. No green state may survive a failed required gate.
6. The progress report must distinguish code implementation, test execution, target qualification, and independent certification.
7. No “zero regression” claim is valid until the clean checkout, required tests, live target tests, artifact digests and independent review all agree.

## 5. Target coverage register (minimum inventory to qualify)

Do not imply support for a target merely because a matrix row exists. For each actual supported target, create one row per combination of OS/architecture/runtime/provider/mode where behavior differs.

| Target family | Required state now | Required evidence |
|---|---|---|
| Linux amd64 | 🟡 Partial | Native tests, CLI smoke, package install, integration and deployment recovery |
| Linux arm64 | 🟡 Cross-build / runtime unverified | Native arm64 runner for runtime qualification |
| macOS arm64 | 🟡 Partial | Native test/smoke, signing/notarization where applicable, path and permission checks |
| macOS amd64 | 🟡 Cross-build / runtime unverified unless runner proves native | Native Intel runtime test or explicitly scoped Rosetta policy |
| Windows amd64 | 🟡 Partial | Native PowerShell/cmd tests, paths/permissions/signals and package install/uninstall |
| Other Windows/macOS/Linux architectures | ⚪ Not assessed unless explicitly in product support policy | Add target or declare unsupported; never imply universal support |
| AWS eu-west-3 | 🔴 Blocked | Isolated live lifecycle, failure injection, rollback, cleanup, residual scan, signed evidence |
| DirectAdmin/cPanel/shared hosting | 🟡 Partial | Real constrained-account deployment, backup/restore, rollback and no-root tests |
| Docker Compose/Kubernetes | 🟡/⚪ Per adapter | Real target-specific lifecycle and health tests; unsupported operations must fail closed |
| GitHub/GitLab/Bitbucket/CodeCommit | 🔴 Per-provider qualification pending | Provider-specific API/permission/webhook/branch protection tests in sandbox |
| IDEs | ⚪ Not assessed per IDE unless individually named and tested | Extension/API/terminal/headless parity evidence |
| Browser/UI, CLI/terminal, API | 🟡 Partial | End-to-end mode parity, accessibility and non-interactive tests |
| Model-assisted execution | 🟡 Partial | Adversarial and provider outage tests plus same policy/approval pipeline |
| Model-free execution | 🟡 Partial | Complete core workflow with all model credentials absent |
| Fine-grained approvals | ⚪ Not assessed | Plan-digest-bound approval, pause/cancel/resume/rollback tests |
| Automation | 🟡 Partial | Identity, idempotency, concurrency, retries, cancellation, restart and notification evidence |

## 6. Release evidence directory contract

```text
evidence/cor/<full-source-sha>/<run-id>/
  manifest.json
  provenance/
    builder-attestation.json
    signature.bundle
    verification.json
  tests/native/
    node-report.xml
    go-events.json
    integration-report.xml
    e2e-report.xml
  tests/raw-logs/
  platforms/<target-id>/
    execution.json
    environment.json
  providers/<provider-id>/<capability-id>/
    result.json
  aws/
    target-identity.json
    resource-inventory-before.json
    deployment.json
    failure-injection.json
    rollback.json
    resource-inventory-after.json
    residual-scan.json
  security/
    secrets-scan.sarif
    dependency-scan.sarif
    sbom.cdx.json
  localization/
    parity.json
    runtime-results.json
  accessibility/
    web.json
    desktop.json
    mobile.json
  final/
    qualification-summary.json
    independent-review.json
```

Each file must be hashed in the manifest; every claim must point to raw evidence; secret values must be redacted; the final manifest must be signed by an independently trusted builder/authority.

## 7. Acceptance checklist

- [ ] Candidate full SHA and tree are resolved and reproducible from clean checkout.
- [ ] No console-derived test cases; all required test reports originate from native runners/structured events.
- [ ] XML/JSON reports parsed structurally; failures, errors, skips and counts validated.
- [ ] Every platform row is backed by exact target-bound execution evidence.
- [ ] Cross-build and native runtime test states are distinct.
- [ ] No swallowed required test failures in any workflow.
- [ ] All actions/images pinned and verified across all workflows.
- [ ] Asset manifest/checksum/disk equality, safe paths, symlink rejection and deep image decoding pass adversarial tests.
- [ ] Locale key/placeholder/runtime parity and accessibility tests pass.
- [ ] AWS target identity is explicit; isolated live lifecycle and residual cleanup evidence pass.
- [ ] Provenance and signing chain verified against an independently controlled trust root.
- [ ] Maintained secret scanner covers working tree, Git history and release artifacts.
- [ ] Provider/host/IDE support is truthful and qualified individually.
- [ ] Model-assisted and model-free execution share the same policy/authorization/state/evidence path.
- [ ] Fine-grained and automation fault tests pass.
- [ ] Independent reviewer approves P0/P1 closure; sign-off is tied to the exact immutable candidate.

## 8. Final disposition

**🔴 BLOCKED — NOT COR CERTIFIED.** The current source shows meaningful remediation progress, but the report claiming “100% remediated & certified” is not supported by the inspected evidence collector, JUnit parser, platform qualification semantics, AWS evidence available to this audit, or proof of universal target coverage. Do not promote the product or claim AWS-stable universal COR certification until the acceptance checklist is satisfied and independently reviewed.
