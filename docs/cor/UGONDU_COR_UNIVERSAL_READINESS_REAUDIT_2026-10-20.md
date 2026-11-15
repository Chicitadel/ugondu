# Ugondu COR Universal Readiness Re-audit — Brand Integration Re-run

- **Product:** Ugondu — Universal Delivery Operating System
- **Legal entity:** Air Roofers SASU
- **Audit date:** 2026-10-20
- **Source branch inspected:** `phase4/production-hardening`
- **Audit branch:** `audit/cor-universal-readiness-brand-rerun-2026-10-20`
- **Scope:** COR release evidence, AWS stability, OS/runtime, deployment hosts, IDE and terminal actors, UI/CLI parity, model-assisted and non-model execution, fine-grained and automated execution, localization, and the newly added brand assets.
- **Disposition:** 🔴 **BLOCKED — NOT COR CERTIFIED**
- **Evidence boundary:** Remote source inspection only. This audit did not run the repository tests on a local machine, access a live AWS account, or independently observe the claimed logo integration CI runs.

## 1. Status legend and rules

| Mark | State | Meaning |
|---|---|---|
| 🟢 | Certified / frozen | Independent, reproducible evidence meets the stated acceptance criteria for the exact scope and commit. Protected from unnecessary revalidation. |
| 🔵 | Stabilized / guarded | Source and interface contract are reviewed and may be treated as a baseline, but this is not a COR certification claim. Run only the defined contract/regression suite when touched. |
| 🟡 | Partial / evidence pending | Some implementation or tests exist; coverage or evidence is incomplete. |
| 🔴 | Uncertified / blocked | A correctness, trust, safety, platform, or evidence gap prevents certification. |
| ⚪ | Not assessed | Not inspected or no usable evidence available. |

**Do not mark a zone 🟢 based on a declared matrix entry, generated report, successful compilation alone, source comments, or an unverified operator summary.** Certification is scoped to commit + platform + version + execution mode + evidence bundle. A change to a frozen zone triggers impact analysis, not a blanket rerun of every zone.

## 2. Executive finding

The repository has useful governance and branding foundations, but universal COR readiness is not demonstrated. The current inspected source contains a qualification collector that parses console output to create JUnit XML, a platform matrix whose declared tiers are not inherently tied to actual target execution, a client smoke-test command that can mask failure with `|| true`, and an asset validator that does not establish exact inventory equality across the manifest, checksum file, and filesystem. AWS live stability and universal host/OS/IDE support remain unproven by source inspection.

The user-reported brand tests and governance suite results are recorded as **reported, not independently verified**. The supplied commit `736e7adc18e8df5cbcc3469baae05da82c443657` could not be resolved through the available repository commit lookup during this re-audit. The source was therefore inspected using the live branch ref `phase4/production-hardening`; do not infer that it is identical to the reported commit.

## 3. Zone register: certified, stabilized, and uncertified

There are **no zones certified 🟢 by this re-audit**. The following are source-reviewed baselines only.

| Zone / level | State | Current basis | Guardrail / next action |
|---|---|---|---|
| Brand asset directory structure and named master assets | 🔵 Stabilized baseline | Brand paths and validator exist in source | Keep filenames stable; use the asset contract tests only for unrelated changes; any source/master change requires checksum regeneration and visual/alpha review. |
| Brand logo HTML helper | 🟡 Partial | `server/shared/brand/logo.ts` provides escaping and accessible image markup | Replace hardcoded strings/paths/dimensions with typed manifest + locale tokens; test SSR, CSP, paths under nested base paths, missing asset fallback and decorative semantics. |
| Brand asset integrity | 🔴 Blocked | `scripts/branding/validate-assets.mjs` validates listed checksums and selected properties | Require exact manifest/checksum/disk-set equality, safe relative paths, duplicate detection, hash algorithm validation, file-type decoding and independent test fixtures. |
| Locale token additions | 🟡 Partial | Brand tokens reportedly added to 12 locales in multiple directories | Verify every authoritative locale root and runtime namespace; validate semantic translations, ICU placeholders, RTL layout, fallback behavior and parity. Do not equate key presence with translation quality. |
| CI build and unit tests | 🟡 Partial | `.github/workflows/ci.yml` declares Node and Go matrix jobs | Remove swallowed failures; pin actions by full commit SHA; upload raw reports; prove each matrix row executed on its intended runner. |
| Native Go client smoke execution | 🔴 Blocked | CI command includes `|| true` for selected targets | Remove fallback; invoke one canonical smoke command with deterministic exit codes; execute native binaries on native runners. |
| Qualification/JUnit evidence | 🔴 Blocked | `scripts/release/collect-qualification-evidence.mjs` parses console output into test cases and renders zero failures/errors | Consume native test-runner XML/JSON; reject absent, malformed, stale, mismatched-commit or zero-test artifacts. |
| Platform qualification matrix | 🔴 Blocked | `config/qualification/platform-matrix.json` declares `tested` for target rows | Derive state only from target-bound execution records; unknown/unrun targets stay `not-assessed`, never `tested`. |
| Provider qualification | 🔴 Blocked | Provider operations and matrix entries exist | Require real provider-specific contract evidence and, where claimed, isolated live credentials/environment evidence. |
| AWS stability (eu-west-3) | 🔴 Blocked | Read-only conformance probe is not full lifecycle proof | Execute least-privilege isolated-account provisioning, readiness, injected failure, rollback, cleanup, restart/resume, idempotency and cost/TTL checks. |
| Provenance and evidence trust | 🔴 Blocked | Local construction of provenance-like fields is not a trusted builder attestation | Bind signed provenance to immutable source SHA, workflow identity, builder identity, artifact digests, timestamps and independently managed trust roots. |
| Secrets/security scanning | 🟡 Partial | Existing regex-based checks do not establish complete secret/history scanning | Add maintained secret scanner, repository history scan, SARIF, allowlist governance and false-negative adversarial fixtures. |
| CLI/terminal and non-interactive JSON | 🟡 Partial | Existing CLI and mode-parity tests are reported | Verify stable machine-readable output, no banners/prompts in JSON/CI, stdin/TTY behavior, exit codes, signals, cancellation, resume and rollback. |
| UI and accessibility | 🟡 Partial | Shared logo helper is a framework-agnostic HTML generator, not evidence of all UI integrations | Inventory every UI entrypoint and test keyboard, screen reader, reduced motion, zoom, contrast, small screens and missing assets. |
| IDE integrations | ⚪ Not assessed | No complete IDE/provider execution inventory evidenced in this review | Declare supported IDEs explicitly; test each extension/adapter and headless fallback, or label unsupported/unassessed. |
| Model-assisted execution | 🟡 Partial | Architecture describes a shared execution pipeline | Prove AI proposals use the same policy gate and authorization as manual commands; validate timeout, model outage, prompt injection, redaction, budgets and no-model fallback. |
| Non-model-assisted execution | 🟡 Partial | README claims agentless parity | Prove all released capabilities are invocable manually through CLI and supported UI, without any LLM service configured. |
| Fine-grained execution and approvals | ⚪ Not assessed | No complete evidence matrix was inspected | Test per-action scopes, dry-run, plan diff, approval, deny, partial execution, cancellation, resume and audit evidence. |
| Automation execution | 🟡 Partial | Automation is represented in matrix/architecture | Test scheduler/runner identity, idempotency, retry ceilings, concurrency locks, deduplication, policy freshness, secret expiry, failure notifications and rollback. |
| DirectAdmin/cPanel/shared hosts | 🟡 Partial | README calls discovery behavior tested; live deployment qualification is not established | Test constrained permissions, no root assumptions, no unsupported systemd/Docker assumptions, backup/restore and rollback on actual account types. |
| Other clouds/hosts (Azure, GCP, OCI, IBM Cloud, VMware, Proxmox, Kubernetes) | 🔴 Uncertified or ⚪ not assessed per adapter | README itself distinguishes some as implemented/unavailable | Maintain one status per provider and capability; do not advertise universal support where the adapter or live evidence is absent. |
| Documentation / sign-off | 🔵 Baseline only | This addendum and companion sign-off record the gate | Keep sign-off unsigned until independent evidence is reviewed and blockers are closed. |

## 4. Findings and required remediation

### COR-RE-001 — Native test reports, not console-derived JUnit (P0)

**Files:** `scripts/release/collect-qualification-evidence.mjs`; native test runner configs; evidence schema and finalizer.

The collector recognizes lines beginning with `[PASS]`, `✓`, or `PASS `, turns them into test cases, and renders XML with failures/errors/skipped set to zero. This is a fabricated summary format, even when the script itself exits zero. Console text is not a native test report and can omit failures, retries, skipped cases, setup errors, or test identity.

**Remediation**
1. Configure each runner to emit native JUnit or structured JSON: Node test runner/Jest/Vitest output, Go `go test -json` or JUnit generated by a trusted adapter that parses the structured event stream, plus native integration/e2e reports.
2. Copy raw reports into a run-specific evidence directory before collection; never overwrite the source report.
3. Validate schema, suite counts, failure/error/skipped counts, start/end time, source SHA, workflow run ID, OS/architecture, runtime version, and report digest.
4. Fail closed if a report is missing, empty, stale, has zero tests where tests are expected, does not match the current source SHA, or has failed/skipped cases outside the approved policy.
5. Store raw logs as supporting artifacts, not as the source of test-case truth.
6. Add adversarial tests: success-looking console output with a failing native report must fail; missing report must fail; report from another commit must fail; malformed XML must fail.

**Illustrative implementation contract (adapt to repository conventions):**

```js
import fs from 'node:fs';
import crypto from 'node:crypto';

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

export function loadNativeJUnit({ file, expectedCommit, actualCommit }) {
  if (expectedCommit !== actualCommit) {
    throw new Error('Evidence commit does not match the checked-out source commit');
  }
  if (!fs.existsSync(file)) throw new Error(`Required native test report missing: ${file}`);

  const bytes = fs.readFileSync(file);
  if (bytes.length === 0) throw new Error('Native test report is empty');

  // Use a maintained, non-network-fetching XML parser in production.
  // Validate the parsed testsuites/testsuite schema and calculate counts
  // from testcase/failure/error/skipped elements; never hardcode counts.
  const reportDigest = sha256(bytes);
  const xml = bytes.toString('utf8');
  if (!xml.includes('<testsuite') && !xml.includes('<testsuites')) {
    throw new Error('Report is not a native JUnit document');
  }
  return { file, reportDigest, byteLength: bytes.length, xml };
}
```

The snippet shows the trust boundary only; it is **not** a replacement for a real XML parser or a complete collector.

### COR-RE-002 — Truthful platform/provider matrix (P0)

**Files:** `config/qualification/platform-matrix.json`; collector; finalizer; matrix schemas.

The manifest is a plan of intended targets, not evidence that they ran. Do not copy `qualificationTier` or provider rows into a result report as proof.

**Remediation**
- Separate `targetDefinitions` from `targetExecutionResults`.
- Each execution result must contain a unique run ID, immutable commit/tree SHA, exact runner image/OS/version/architecture, runtime versions, command, exit code, start/end times, raw artifact paths and SHA-256 digests.
- Status must be calculated by policy: `not-assessed`, `implemented`, `tested`, `qualified`, `blocked`, or `unsupported`. Unknown values fail schema validation.
- Mark a target `tested` only after the expected commands actually execute on that target and the native reports pass.
- Mark a target `qualified` only after the required live environment qualification has passed.
- A cross-compiled binary is a build result, not a native runtime test.
- Do not infer provider qualification from shared unit tests against mocks.

**Illustrative status derivation:**

```ts
type QualificationState =
  | 'not-assessed' | 'implemented' | 'tested'
  | 'qualified' | 'blocked' | 'unsupported';

interface TargetEvidence {
  targetId: string;
  sourceCommit: string;
  runnerTarget: string;
  exitCode: number;
  nativeReportDigests: string[];
  requiredReportCount: number;
  liveQualificationEvidence?: string[];
}

function deriveTargetState(e: TargetEvidence): QualificationState {
  if (!e.targetId || !e.sourceCommit || !e.runnerTarget) return 'blocked';
  if (e.exitCode !== 0) return 'blocked';
  if (e.nativeReportDigests.length < e.requiredReportCount) return 'not-assessed';
  if (e.liveQualificationEvidence?.length) return 'qualified';
  return 'tested';
}
```

In production, additionally verify signatures and each digest against the actual bytes. Do not accept arbitrary non-empty strings as proof.

### COR-RE-003 — Remove swallowed client smoke failures (P0)

**File:** `.github/workflows/ci.yml`.

The current build step contains a command chain that ends in `|| true`. This can turn a failed `--help` and failed `version` smoke test into success.

**Remediation**
- Replace the fallback chain with the canonical command and let non-zero exit codes fail the job.
- If command aliases are intentionally supported, test them individually with explicit expected output and exit code.
- Run the binary only on a matching native runner. Cross-target builds should be named `cross-build`, not `runtime-tested`.
- Add tests for Windows executable suffix, PowerShell/cmd quoting, Unix signals, terminal detection, non-TTY stdin, JSON output and locale overrides.

```yaml
- name: Native CLI smoke test
  shell: bash
  run: |
    set -euo pipefail
    ./ugondu --help
    ./ugondu version
```

Use platform-specific shell/command handling where needed. Never restore `|| true` as a workaround.

### COR-RE-004 — Exact asset inventory, manifest and checksum agreement (P1)

**Files:** `scripts/branding/validate-assets.mjs`; `assets/brand/manifest.json`; `assets/brand/checksums.sha256`; brand tests.

The current validator checks every listed checksum and several required SVG/ICO properties, but a file omitted from both the checksum file and its manifest may go unnoticed. It also embeds approved colors, expected SVG names, a minimum checksum count, and manifest schema/product assumptions in code.

**Remediation**
1. Make the manifest the single authoritative typed inventory, with each asset’s logical ID, relative path, media type, dimensions, locale/variant, digest, usage contexts, and accessibility policy.
2. Generate checksums from the manifest; validate every manifest entry and reject duplicate paths/IDs, missing files, unexpected files, path traversal, absolute paths, symlinks escaping the root, digest mismatch, and algorithm ambiguity.
3. Load approved color tokens from the governed brand token source; do not duplicate the source of truth in validators.
4. Decode image formats using a maintained library; validate actual dimensions, alpha channel, multi-resolution ICO directory entries and SVG XML. String prefix checks alone are insufficient.
5. Add mutation tests that remove an asset, add an untracked asset, alter one byte, duplicate a path, use `../`, change the manifest without checksums, and introduce unsafe SVG features.

```js
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

function safeAssetPath(root, relativePath) {
  if (path.isAbsolute(relativePath)) throw new Error('Absolute asset paths are forbidden');
  const full = path.resolve(root, relativePath);
  const rel = path.relative(root, full);
  if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`Asset path escapes asset root: ${relativePath}`);
  }
  return full;
}

function digestFile(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

// Production validator must compare sets:
// manifestPaths === checksumPaths === actualRegularFilePaths (excluding
// the manifest/checksum metadata files themselves), after canonicalization.
// Reject duplicate logical IDs and paths before comparing these sets.
```

### COR-RE-005 — Remove hardcoded logo copy, paths and dimensions (P1)

**File:** `server/shared/brand/logo.ts`.

The helper currently defines asset URLs, pixel dimensions, and default alt text directly in TypeScript. This is a single integration utility, not proof every UI, CLI, installer, desktop shell, mobile client, docs site, and release archive consumes it.

**Remediation**
- Resolve asset paths from a validated manifest/base-path resolver so reverse proxies and nested deployments work.
- Keep visible/non-decorative alt text in localization resources; for decorative images, use empty alt and ensure the parent control has its own accessible name.
- Use responsive CSS classes/tokens instead of inline dimensions/style where framework conventions permit.
- Inventory all actual app shells and their entrypoints; integrate per-platform assets using each platform’s supported mechanism (web SVG/PNG, ICO, desktop icon, PWA/mobile icons, docs logo, package metadata).
- Verify generated assets are actually included in npm package/release archives and referenced paths exist after extraction. A GoReleaser `files` rule alone does not prove all consumers can resolve them.
- Test restrictive CSP, offline/local installs, non-root base paths, missing SVG fallback, RTL, high DPI, and reduced-data settings.

### COR-RE-006 — Locale parity is more than key presence (P1)

**Files:** `locales/*.json`, `server/shared/locales/*.json`, `client/locales/*.json`, `scripts/validate-locales.js`, `scripts/i18n_audit.js`.

**Remediation**
- Identify the canonical source locale and generated/synchronized locale sets. Do not maintain independent divergent copies without a declared ownership rule.
- Validate exact key parity, value type, placeholder/ICU parity, no empty strings, no untranslated source-language values except approved brand/product names, valid BCP 47 locale IDs, and runtime resolution.
- Include plural/select rules, long-text overflow, RTL visual order, font fallback, screen-reader names, date/number formatting and keyboard navigation.
- Add locale-specific snapshots and behavioral tests; the audit should fail if a new key is copied verbatim into every locale without an approved translation exception.
- User-facing strings, errors, CLI help, confirmations, approval prompts and automation notifications must use locale tokens. Machine protocols and JSON schema keys remain locale-neutral and stable.

### COR-RE-007 — Trusted provenance and evidence chain (P0)

**Files:** `scripts/release/collect-qualification-evidence.mjs`; `scripts/release/evidence-scanners.mjs`; finalizer/signing workflows; trust configuration.

**Remediation**
- Separate evidence collection from attestation signing.
- Generate an evidence manifest from immutable native artifacts and record every artifact’s digest, size, source commit/tree, workflow/run identity, target, runtime and tool versions.
- Sign using a managed key or workload identity controlled outside the candidate tree. The verification key must be provisioned through an independent approved trust path.
- Where SLSA/in-toto claims are made, conform to the relevant schema and verify the builder identity and signature; do not label locally assembled JSON as a trusted attestation.
- Reject missing keys, untrusted issuer, wrong repository/ref, fork/untrusted workflow, mismatched SHA, expired or revoked key, duplicate artifact, and changed evidence bytes.
- Preserve raw evidence and verification logs for review. A digest proves integrity relative to a trusted digest, not that the underlying test was honest or meaningful.

### COR-RE-008 — AWS stability requires full lifecycle evidence (P0)

**Files:** `scripts/aws-conformance/run-aws-conformance.mjs`, AWS workflow, IAM policies, target adapter, recovery/rollback code and runbooks.

**Qualification must run in a dedicated disposable AWS account or isolated test boundary**, preferably in the required region `eu-west-3`, with least-privilege short-lived credentials. Never run destructive tests against production.

Required scenarios:
1. Identity and policy simulation, region guard, explicit resource allowlist and budget/TTL enforcement.
2. Provision VPC/subnets/security groups/roles and each supported service only where the adapter claims capability.
3. Readiness and health checks against real endpoints, not only mocked responses.
4. Inject denied permission, unavailable dependency, timeout, partial create, process crash, network interruption and expired credential.
5. Verify deterministic failure state, resumable execution, idempotent retry, rollback, cleanup, and no orphaned resources.
6. Verify deployed version, IAM effective permissions, encryption, logs/metrics/traces, alarms, backups and restore where in scope.
7. Upload raw logs/API response metadata (with secrets redacted), resource inventory before/after, command exit codes and signed evidence.
8. Run a scheduled stability soak and repeated deployment/rollback cycle; document duration, sample size, error budget and accepted residual risk.

A read-only probe is a useful preflight, not a deployment qualification. If no live AWS evidence is attached and independently verified, AWS remains 🔴.

### COR-RE-009 — Cross-platform/host/IDE support is an explicit capability matrix (P0)

**Targets to enumerate:** Linux distributions/architectures, Windows versions/shells, macOS versions/architectures; Node and Go runtime versions; Docker/OCI and Kubernetes; AWS; shared hosts such as cPanel/DirectAdmin; supported repository providers; each declared IDE/editor integration; browser/UI; terminal/SSH; CI runner; interactive and non-interactive actors.

For each target/capability row, define:
- stable target ID and supported/unsupported boundary;
- installation, upgrade, uninstall and recovery behavior;
- prerequisites, privilege model and network requirements;
- supported execution modes (UI, CLI, API, IDE, automation);
- locale and accessibility requirements;
- native tests, contract tests, live qualification requirements and owner;
- failure mode when capability is absent.

Never claim “universal” support by listing every platform in a manifest. Unsupported capabilities must be visible, machine-readable and blocked before execution. A target not yet tested is `not-assessed`, not supported.

### COR-RE-010 — Model-assisted and agentless execution parity (P0)

All entrypoints must converge on the same governed pipeline:

```text
UI / CLI / API / IDE / scheduler / model proposal
                    |
                    v
        Parse + schema validation
                    |
                    v
       Capability discovery + plan
                    |
                    v
        Policy evaluation (deny by default)
                    |
                    v
     Explicit authorization / approval
                    |
                    v
       Durable execution state machine
                    |
                    v
    Independent postcondition verification
                    |
                    v
      Evidence manifest + audit record
```

**Guardrails**
- A model may propose intent or explain output; it must not bypass policy, authorization, capability checks, approval, or evidence validation.
- Model calls must be optional for core deployment functionality. No API key/network access to a model may be required for ordinary CLI/UI use unless a specific paid/AI-only feature is explicitly selected.
- Model timeout, provider outage, malformed response, refusal, token limit or unsupported model must lead to a clear recoverable result; never silently perform a different destructive action.
- Use allowlisted tools, structured schemas, output validation, secret/PII redaction, prompt-injection isolation, spend/rate limits and model/provider policy.
- Human and model-assisted execution must produce equivalent plan semantics, authorization records, durable state transitions, verification and evidence for the same action.
- Add differential tests that execute identical plans through UI, CLI, API, IDE and model-assisted proposal paths and compare normalized plan/evidence, excluding only actor-specific metadata.

### COR-RE-011 — Fine-grained and automated execution safety (P0)

**Fine-grained path:** support plan-only, dry-run, action selection, dependency visualization, approval per risk tier, pause, cancel, resume, rollback, and evidence inspection. Authorization must bind to the exact plan digest and target; changing either invalidates approval.

**Automation path:** require a workload identity, narrowly scoped credentials, explicit policy and concurrency key, idempotency key, bounded retries with backoff/jitter, deadline, cancellation, deduplication, stale-plan rejection, secret rotation, rate limits, failure notifications and rollback policy. A scheduled task must never inherit a human’s ambient privileges implicitly.

**Acceptance tests:** duplicate trigger; overlapping runs; process restart mid-step; stale approval; credential expiry; rate limit; partial success; cancellation; failed rollback; unavailable evidence store; operator takeover; localization of alerts. Each scenario must leave a durable state and truthful operator-facing status.

### COR-RE-012 — Action pinning, secret scanning and fail-closed release policy (P1)

- Pin GitHub Actions to reviewed full commit SHAs and automate update PRs with provenance/review.
- Add a maintained secret scanner for working tree and full Git history, plus dependency/SBOM/vulnerability checks. Test known synthetic secret fixtures and ensure no real secrets are emitted into logs.
- Require required checks on protected release branches; no manual bypass except documented, approved emergency process with incident record.
- Ensure CI permissions are least privilege and read-only by default. Only release/deployment jobs receive narrowly scoped OIDC roles after trust validation.
- Never use `continue-on-error`, `|| true`, ignored test failures, or `if: always()` to convert a failed required check into a passing release. `always()` may be used for evidence upload, but the job conclusion must preserve the original failure.
- Test all gates against missing configuration, malformed data, revoked keys, unexpected files, network failure and malicious pull requests.

## 5. Zero-regression and frozen-zone protocol

1. Create a baseline inventory of tests and contracts for each zone, including owner, evidence ID, source SHA and last qualified environment.
2. Freeze only zones that meet 🟢 criteria; current zones in this report are not certified.
3. For every PR, compute a dependency-based impact set. Run affected unit/contract tests, interface compatibility tests and all mandatory global security/governance gates.
4. Do not rerun unrelated live cloud qualification unless the dependency graph, policy, runtime, IAM, target adapter, or shared execution contract changed. Record why a live retest was or was not required.
5. A failed guardrail reopens only the impacted certification scope plus dependent zones. It never silently leaves a dependent zone green.
6. Keep compatibility fixtures and golden outputs versioned. Changes require explicit migration notes and tests.
7. Any skipped test or unexecuted target is visible in the final report. “Not run” is never reported as “passed”.
8. Maintain a machine-readable state ledger; the human-readable Markdown tables are generated from or checked against it to prevent drift.

## 6. Required release gates and evidence layout

Suggested evidence layout (adapt paths only through a reviewed schema migration):

```text
evidence/cor/<source-sha>/<run-id>/
  manifest.json
  provenance/
    builder-attestation.json
    signature.bundle
    verification.json
  tests/
    native/
      node-junit.xml
      go-events.json
      integration-junit.xml
      e2e-junit.xml
    raw-logs/
  platforms/
    <target-id>/execution.json
    <target-id>/environment.json
  providers/
    <provider-id>/<capability-id>/result.json
  aws/
    preflight.json
    resource-inventory-before.json
    deployment.json
    failure-injection.json
    rollback.json
    resource-inventory-after.json
  security/
    secret-scan.sarif
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
    reviewer-decision.json
```

The final manifest must hash every included artifact and be signed only after collection completes. Redact credentials before writing evidence; never write secret values into artifacts. Retain evidence according to an approved retention policy.

## 7. Acceptance checklist — do not close blockers until all applicable items pass

- [ ] Native test reports imported and failure counts independently checked.
- [ ] Each target’s evidence binds to the exact source SHA, runner and runtime.
- [ ] No swallowed smoke-test failures; all cross-builds distinguished from native execution.
- [ ] Manifest/checksum/filesystem inventory equality enforced with adversarial tests.
- [ ] Brand assets render correctly in every declared UI, installer, docs and package consumer.
- [ ] All locale roots have exact key/placeholder parity and runtime behavior verified.
- [ ] Action references pinned to reviewed full SHAs.
- [ ] Secret scanning covers current tree and Git history.
- [ ] Evidence provenance signature and trust root verified independently.
- [ ] AWS create/readiness/failure-injection/recovery/rollback/cleanup evidence complete.
- [ ] Provider matrix distinguishes implemented, tested, qualified, unsupported and not assessed.
- [ ] CLI/UI/API/IDE/automation/model-assisted paths share policy and execution contracts.
- [ ] Core workflows pass without any model provider configured.
- [ ] Fine-grained approval, pause/cancel/resume/rollback and automation idempotency tests pass.
- [ ] Accessibility, RTL, small viewport, keyboard and screen-reader checks pass.
- [ ] All blocking/high-severity findings have evidence-backed closure and independent review.
- [ ] Candidate is rebuilt from clean checkout and release artifact digests match the attested source.

## 8. Current audit decision

**🔴 BLOCKED — NOT COR CERTIFIED.**

This is a source-inspection and evidence-gap assessment, not a claim that all listed tests failed. The available evidence is insufficient to certify AWS stability or universal OS/host/IDE support. The reported logo checks and governance test totals remain unverified until native CI reports and artifacts are tied to a resolvable commit and independently reviewed.

**No production deployment, release promotion, or public claim of universal COR certification should be based on this audit addendum alone.**
