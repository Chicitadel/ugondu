# Ugondu COR Re-Audit — Universal Readiness Remediation Plan

**Classification:** ENTERPRISE | INTERNAL  
**Product:** Ugondu — Universal Delivery Operating System  
**Repository:** [Chicitadel/ugondu](https://github.com/Chicitadel/ugondu)  
**Audit date:** 2026-10-20  
**Audit type:** Evidence-led repository re-audit and remediation specification  
**Audit branch:** `audit/cor-universal-readiness-2026-10-20`  
**Primary release branch in scope:** `phase4/production-hardening`  
**Related remediation PR:** [#4 — fail closed on AWS and release evidence claims](https://github.com/Chicitadel/ugondu/pull/4)  
**Disposition:** **NOT CERTIFIED — remediation and independent qualification required**  
**Business entity naming:** Air Roofers SASU (France)

> This document is a remediation plan, not a certification certificate. A repository claim, local run, test fixture, generated report, or signature does not establish that a platform was actually qualified. Results must be tied to the exact commit/tree and reproducible execution logs.

## 1. Executive decision

The target is a universal, dependable delivery product that supports every *incorporated and explicitly advertised* platform, OS, host, IDE, user interface, terminal workflow, model-assisted workflow, non-model workflow, fine-grained/manual execution, and authorized automation mode. “Universal” must mean a defined, testable support contract—not an unbounded promise that every environment works.

The current evidence pipeline has material assurance gaps. In `scripts/release/collect-qualification-evidence.mjs`, observed source behavior includes:
- synthesizing JUnit XML from parsed console lines; when no pass lines are parsed, emitting a testcase named `executed <script>` rather than importing the test runner's native result;
- writing an exception register with zero exceptions and an ADR fallback record when source records may be absent;
- constructing a dependency report with zero vulnerabilities without invoking a vulnerability scanner;
- constructing an SBOM from top-level `package.json` dependencies rather than a complete resolved dependency inventory;
- writing a provenance statement itself rather than verifying an authenticated build attestation;
- emitting compatibility `status: PASS` from a single current host and static metadata checks, not a complete target matrix;
- treating an absent HTTP error as a wait condition but not consistently asserting every probe's HTTP status, body contract, trace propagation, and lifecycle result;
- allowing a repository-local public-key fallback for policy-pack verification in the collector.
These are source-level observations, not proof that every produced artifact is malicious or invalid. They do mean the artifacts cannot, by themselves, substantiate the claims they purport to certify.

GitHub evidence also shows failed CI runs for the supplied historical candidate commits, including CI/CD run 39354923358 for commit `00d39930482eafbcb835c9d6e30ee0b084c7a3f6`, and failed runs associated with `a8863f84cdf1047b6db489d4df7833a4b2c731ef`. A passing current run has not been established by the evidence available to this audit. The user-supplied checklist claims additional local verification, but those claims are recorded as reported results until the corresponding raw logs and exact commit-bound artifacts are independently available.

**Release rule:** no COR sign-off and no “universally ready” marketing claim until all P0/P1 gates below pass on a clean checkout, the AWS gate runs with real isolated credentials in the intended account, and each supported matrix cell has direct evidence.

## 2. Scope and support contract

### 2.1 Actors and interaction modes

The release contract must explicitly test:
1. Human using graphical UI only.
2. Human using terminal/CLI only.
3. Human using IDE extension or IDE-integrated interface.
4. Model-assisted user: suggestions and plans are visible, attributable, and reviewable.
5. Non-model user: all core workflows remain available without any model provider, API key, network dependency on an inference service, or model-generated decision.
6. Fine-grained execution: inspect, plan, simulate, approve, run one step, pause, resume, cancel, retry, roll back where supported, inspect evidence.
7. Automation execution: unattended jobs run only within explicit policy, scope, credential, budget, and autonomy limits.
8. Accessibility, keyboard-only, screen-reader, reduced-motion, high-contrast, RTL and localized workflows.
9. Headless CI and air-gapped/local environments where claimed.
10. Multi-tenant and delegated/least-privilege actors, including denial tests.

Model assistance is an optional capability, never a prerequisite for safety, correctness, localization, authorization, or core execution. Model output is untrusted input. The deterministic policy engine and typed action validator remain authoritative.

### 2.2 Platform inventory is a contract

Create a versioned support manifest that lists only incorporated targets and defines exact supported versions, architectures, prerequisites, qualification command, and support tier. Do not infer support from a successful compile or from a provider adapter being present.

Required dimensions:
- OS: Windows, macOS, Linux distributions actually supported; architectures such as x86_64/amd64 and arm64 only where built and tested.
- Runtime: supported Node.js/npm versions and Go versions, plus any native runtime requirements.
- Delivery targets: local filesystem, SSH/SFTP, cPanel/DirectAdmin shared hosting, Docker/Compose, Kubernetes/Helm, AWS, and each other provider/host actually implemented in the repository.
- Repository providers: each declared adapter (for example GitHub, GitLab, Bitbucket, and AWS CodeCommit only if included in the manifest).
- IDEs: only named extensions/adapters present in source; test each supported IDE version/OS combination.
- UI: supported browsers and responsive viewport classes for any web UI.
- Terminal: shells and shells versions explicitly supported (PowerShell, cmd.exe, Bash, zsh, etc. only where tests exist).
- AI providers: each model provider and protocol adapter declared in the model catalog; include provider unavailable, quota-exceeded, timeout, malformed response, and deprecation cases.
- Locale packs: each locale and script direction included in the release, including pluralization, dates, numbers, error paths, CLI, UI, API, docs, and accessibility text.

A target not represented by a manifest row is **UNQUALIFIED**, not implicitly supported.

## 3. Findings and required remediation

### P0 — Evidence pipeline can overstate qualification

**Affected files**
- `scripts/release/collect-qualification-evidence.mjs`
- `scripts/release/verify-evidence-bundle.mjs`
- `evidence/manifest.json`
- `evidence/signatures/evidence-manifest.sig`
- `.github/workflows/ci.yml`
- `.github/workflows/cor.yml`

**Required changes**
1. Delete the console-output-to-JUnit conversion as a certification source. Each test framework must emit its native machine-readable result (JUnit, TAP, Go JSON, etc.); preserve raw output and exit code.
2. Do not create “zero exceptions”, fallback ADRs, “zero vulnerabilities”, “trace OK”, or “deployment completed” records by default. Collect these from the authoritative system; if unavailable, mark `NOT_COLLECTED` and fail the gate.
3. Run a real dependency/SCA scanner against the resolved lockfiles and preserve tool version, command, exit code, database timestamp, and raw report. Scanner unavailable = blocked, not zero findings.
4. Generate a full SBOM from the resolved build graph and all shipped artifacts; compare it with the final image/binary contents. Do not treat the root manifest as the complete SBOM.
5. Generate provenance in the trusted build workflow and verify its identity, repository, ref, commit, workflow, builder, and artifact digests. A script that writes a provenance-shaped JSON object is not an authenticated attestation.
6. Do not permit stale evidence from a previous run. Use a unique clean workspace per run; delete or isolate previous output; record execution ID and exact source SHA/tree for every artifact.
7. Enforce a schema per artifact, validate all required fields and status enums, and bind artifact commit/tree/run IDs to the manifest. Reject unknown status values and inconsistent timestamps.
8. Sign only after all gates pass. Use KMS/HSM or managed secret custody with key separation, rotation, revocation, and independently pinned trust roots. A public key embedded in the same candidate bundle is not an independent trust anchor.
9. Separate signing from verification. Release consumers verify against an externally provisioned public key and key ID; do not trust the public key carried by the signed envelope as the sole trust source.
10. Add negative tests that corrupt each artifact, change the commit/tree, reuse stale artifacts, alter a signature, remove a scanner, report skips, and supply mismatched key IDs. Each must fail.

**Acceptance:** evidence generator refuses incomplete or stale evidence; no result is synthesized from source-code assumptions or console parsing; signature verifies against an externally pinned key; artifact digest and provenance verification passes for the exact release candidate.

### P0 — AWS physical qualification must be real and fail closed

**Affected files**
- `scripts/aws-conformance/aws-env.mjs`
- `scripts/aws-conformance/run-aws-conformance.mjs`
- `policy-packs/aws/cor/pack.yaml`
- `policy-packs/aws/cor/templates/**`
- `.github/workflows/cor.yml`
- `.github/workflows/ci.yml`

The corrected ARN shape is `arn:aws:iam::ACCOUNT_ID:role/ROLE_NAME`. Retain the fix, but a syntactically valid ARN and a source-level assertion are not physical AWS qualification.

**Required AWS gates**
- Use GitHub OIDC with a tightly scoped trust policy; deny long-lived user access keys in release CI. Require an assumed-role caller identity and verify expected account, role, session tags, region, audience and repository/ref claims.
- Validate the role trust policy and effective permissions, including permission boundaries, session policies, SCPs, resource policies, KMS key policies and explicit denies.
- Test both allowed and denied paths. A denial test must prove it attempted the intended API and received an authorization denial; malformed requests, invalid ARNs, missing credentials, network failures and wrong regions are not successful denial evidence.
- Test only in a dedicated sandbox account or isolated test resources with budgets and explicit cleanup. Never run destructive or billable tests against production resources without explicit authorization.
- For resource mutation, record before/after inventory, resource tags, unique run ID, cleanup action/result, residual scan and timeout behavior. A read-only probe cannot claim cleanup or zero residuals.
- Validate CloudFormation/Terraform plans, IAM policy simulation where useful, deployment and rollback, health/ready checks, log/metric/trace delivery, alarms, quotas, throttling, regional outage behavior, and recovery.
- Verify least privilege using positive and negative operations for every required service action. Avoid claiming “all IAM statements verified” from JSON parsing alone.
- Preserve CloudTrail evidence, AWS CLI/SDK versions, caller identity, region, request IDs, sanitized outputs, timestamps, and exact policy digest. Do not publish secrets or sensitive resource identifiers.
- Use an independent reviewer for account and policy boundaries; never make a report PASS solely because expected source strings exist.

**Acceptance:** live AWS run is green in the intended account/region, both positive and negative operations behave as designed, actual resource mutation/cleanup is evidenced where relevant, no residual resources remain after the run, and the signed evidence is linked to the exact commit. Until then AWS status is **UNQUALIFIED**.

### P0 — CI and COR workflow integrity

**Affected files**
- `.github/workflows/ci.yml`
- `.github/workflows/cor.yml`
- `scripts/cor-engine.js`
- `scripts/cor-finalize.js`
- `scripts/run-cor-gates.js`

Required:
- Trigger on every protected release branch and pull request; validate workflow filters with a branch-trigger contract test.
- Pin third-party actions to immutable commit SHAs; set minimal job-level permissions and isolate jobs with different trust levels.
- Use concurrency groups to prevent duplicate conflicting release runs. Never use `pull_request_target` to execute untrusted PR code with secrets.
- Separate untrusted PR validation from trusted signing/deployment. Only protected-branch, approved-environment workflows may access signing keys or AWS OIDC roles.
- Fail closed if required secrets/vars are absent, but distinguish missing configuration from an actual authorization-denial proof.
- Require all gates: format/lint, typecheck, unit, contract, integration, e2e, security, SCA, SBOM, provenance, i18n, accessibility, platform matrix, provider matrix, AWS physical qualification, evidence verification, and independent approval.
- Verify the 40-stream COR engine validates each stream against real assertions and artifacts, not just non-empty observations or self-consistent hashes. A verifier must not be allowed to fabricate both the expected result and its proof.
- Bind manifest candidate SHA/tree to the exact checked-out commit; require clean checkout and re-check the tree after tests.
- Ensure finalization refuses any failed, skipped, missing, duplicated, stale or unsupported stream. The expected stream set must come from a versioned trusted manifest, and all streams must have unique execution IDs.
- Upload raw logs and test artifacts even on failure (without secrets), with retention and access controls. A failed gate must remain visible; no rewriting the result to PASS.

**Acceptance:** required checks are present, current and green for the exact SHA; no required check is absent, skipped, neutral, stale, or sourced from a different commit.

### P1 — Universal platform/OS/host qualification

Add `config/qualification/platform-matrix.json` (or equivalent governed manifest) with schema validation. Each row should include:
`id`, `targetType`, `os`, `architecture`, `runtimeVersion`, `provider`, `mode`, `qualificationTier`, `command`, `expectedArtifacts`, `supportOwner`, `expiry/reviewDate`.

Do not hard-code platform lists in a report generator. The generator must read the governed manifest and require one fresh passing evidence record per required matrix row. If a row is intentionally excluded, record an approved, dated exception and remove it from marketing claims.

**Minimum gates per row**
1. Clean install from lockfile.
2. Build/typecheck/lint where applicable.
3. Unit and contract tests.
4. Runtime launch and graceful shutdown.
5. Readiness/liveness semantics and structured diagnostics.
6. Real operation against a disposable test target or provider sandbox.
7. Authorization/tenant isolation and path/SSRF boundaries.
8. Offline/provider-unavailable behavior where applicable.
9. Cancellation, timeout, retry, idempotency, resume and rollback semantics.
10. Artifact integrity, signature and provenance verification.
11. Localization and accessibility checks for UI/CLI surfaces.
12. Evidence upload bound to OS/runtime/architecture/provider/commit.

Compile-only tests are not runtime qualification. A Linux runner does not qualify Windows or macOS. A provider adapter compile test does not prove authenticated provider operations. Docker image build does not qualify Kubernetes or cPanel. Browser tests do not qualify terminal UX.

### P1 — Shared execution core and zero-regression contract

All UI, CLI, IDE, model-assisted and automation actors must call the same governed application/use-case layer. UI and CLI must not implement separate authorization, policy, execution, retry, or evidence rules.

Required common execution contract:
- `discover -> classify -> plan -> simulate -> authorize -> execute -> verify -> certify -> handoff`
- Explicit durable states: `PENDING`, `PLANNED`, `AWAITING_APPROVAL`, `RUNNING`, `PAUSED`, `RETRY_WAIT`, `CANCEL_REQUESTED`, `SUCCEEDED`, `FAILED`, `CANCELLED`, `ROLLBACK_PENDING`, `ROLLED_BACK`, `QUARANTINED`.
- Typed action allowlist; no arbitrary shell/eval execution. Every action has schema, risk class, required capability, preconditions, timeout, idempotency behavior, output schema and evidence contract.
- Durable state store with atomic transitions, monotonic version/sequence, append-only audit events, lease/lock for concurrent workers, replay protection, and crash recovery.
- Deterministic plan compilation; model suggestions cannot alter policy or bypass authorization.
- Fine-grained approval per action/risk scope, plus bounded automation policies for max duration, cost, target scope, concurrency, retry budget and rollback.
- Dry-run/simulation must be clearly marked and never reported as real deployment success.
- Cancellation must be cooperative, bounded and recorded. A process killed without a confirmed stop is `CANCEL_UNCONFIRMED`, not `CANCELLED`.
- Exactly-once execution is not assumed. Use idempotency keys and reconciliation for at-least-once delivery.
- Never silently fall back from a failed secure path to a less secure path.

**Illustrative typed action boundary (adapt to existing repository APIs; this is a design snapshot, not a claim that this exact code is already implemented):**

```ts
export type ActionRisk = "read" | "change" | "destructive" | "privileged";

export interface ActionEnvelope<TInput = unknown> {
  schemaVersion: string;
  executionId: string;
  stepId: string;
  tenantId: string;
  actorId: string;
  actorMode: "human-ui" | "human-cli" | "ide" | "model-assisted" | "automation";
  actionType: string;              // must resolve in the governed registry
  input: TInput;
  idempotencyKey: string;
  requestedCapabilities: string[];
  policyDigest: string;
  sourceCommit: string;
  locale: string;
}

export interface ActionDecision {
  allowed: boolean;
  risk: ActionRisk;
  requiresHumanApproval: boolean;
  reasonCode: string;              // locale token, not display prose
  policyDigest: string;
}

export async function dispatchAction(envelope: ActionEnvelope) {
  validateEnvelopeSchema(envelope);
  assertKnownActionType(envelope.actionType);
  assertTenantAndActor(envelope);
  assertSourceAndPolicyDigest(envelope);
  const decision = await policyEngine.authorize(envelope);
  await audit.appendDecision(envelope, decision);
  if (!decision.allowed) throw new PolicyDeniedError(decision.reasonCode);
  if (decision.requiresHumanApproval) {
    return approvalQueue.create(envelope, decision);
  }
  return executionEngine.executeRegisteredAction(envelope, decision);
}
```

### P1 — Model-assisted and non-model operation parity

- Model service is an optional provider behind a vendor-neutral interface and centrally governed catalog/registry.
- Model configuration, availability, pricing, deprecation, data residency, allowed regions and feature flags are externalized to configuration; no model name, endpoint, API key, locale, host, or account ID is embedded in source code.
- Model lifecycle states: `DISCOVERED`, `EVALUATING`, `APPROVED`, `ACTIVE`, `DEPRECATED`, `DISABLED`, `RETIRED`, `QUARANTINED`. Retirement must never silently switch a model into production without policy checks, compatibility tests, cost/privacy approval and a canary.
- Failover is explicit, deterministic and policy-governed; never send restricted data to another provider/region automatically.
- Tool calls from models are proposals only. Validate against typed action schemas, capability grants, tenant scope, budgets, risk thresholds and human approval rules.
- If every model provider is unavailable, non-model core workflows must still work; model-specific features should show a localized, actionable degraded state.
- Test prompt injection, untrusted repository content, tool output poisoning, refusal/timeout, malformed JSON, context overflow, rate limiting, provider deprecation, key rotation, data redaction, and cross-tenant leakage.
- Audit records must distinguish model suggestion, human decision, policy decision, and actual action outcome.

### P1 — Zero hardcoding and localization

- Use a token registry and locale packs for every user-visible string, CLI message, API error, validation error, progress state, notification, email, log message intended for users, and accessibility label.
- Do not localize machine identifiers, protocol enums, stable error codes, JSON field names or log keys. Map stable codes to locale tokens at presentation boundaries.
- No silent fallback for missing required translations in a release locale. Validate token parity, interpolation parameters, plural forms, locale-specific formatting, RTL layout, Unicode paths, keyboard navigation, screen-reader names and CLI width.
- Detect hard-coded user-facing strings using AST-aware scans plus tests; simple grep alone is insufficient.
- Locale preference precedence must be explicit and consistent across user profile, environment, CLI flag, UI preference and organization policy. Email and background jobs must use the persisted recipient/job locale, not the server host locale.
- Locale pack signature, digest, publisher trust and rollback must be verified. New locale packs must not execute code.
- Use neutral machine-readable reason codes and localized UI copy. Never parse localized prose as control flow.

### P1 — Host and repository adapters

- Every adapter declares truthful lifecycle: `implemented`, `tested`, `qualified`, `unavailable`; do not collapse these into one `supported` boolean.
- Normalize provider differences behind capability interfaces, but do not pretend unsupported capabilities exist. The planner must reject a plan requiring a missing capability before mutation.
- Protect against SSRF, redirects to private/link-local/metadata IPs, DNS rebinding, credential forwarding across redirects, path traversal, archive bombs, symlink escape, command injection, repository token leakage, and untrusted build scripts.
- Enforce per-tenant secret references, short-lived credentials, least privilege, redaction, rotation, revocation, and no secret persistence in state/evidence.
- Test create/update/delete only in disposable sandbox targets; use a two-phase plan/apply flow and verified postconditions.
- Shared hosting: detect quotas, unsupported process managers, unavailable root privileges, filesystem permission limits and restricted network egress. Fail clearly; never assume root or silently install privileged components.
- IDE integration: isolate extension host permissions, avoid running repository code on opening a workspace, display planned actions and trust boundary, require explicit consent for mutation, and support disabling model calls.

### P1 — UI, CLI and accessibility

- All interfaces must consume the same API and execution state. Provide parity for discover, plan, simulate, approve, run, pause, resume, cancel, retry, inspect logs/evidence, and rollback where supported.
- Responsive UI must preserve all critical actions on small screens; no horizontal clipping, inaccessible modal, or hidden destructive action.
- CLI must have stable exit codes, JSON output mode, machine-readable errors, localized human output, safe non-interactive mode, and explicit confirmation for destructive changes. CI must not hang on a prompt.
- Automation must use non-interactive credentials and policy. Never infer consent from a missing terminal.
- Provide keyboard and screen-reader support, focus order, contrast, reduced motion, text scaling, RTL layout, and clear distinction between simulation and execution.
- Error messages must include localized explanation, stable reason code, recovery guidance and correlation ID without exposing secrets.

### P1 — Security, reliability and recovery

- Threat model: tenant isolation, confused deputy, supply-chain compromise, compromised model, malicious repo, poisoned plugin, stolen credential, worker crash, stale lease, replay, partial deployment and evidence tampering.
- Enforce least privilege, deny-by-default action registry, schema validation, signed artifacts, SBOM/SCA, provenance, audit logging, secret redaction, rate limits, quotas, timeouts and bounded retries.
- Chaos tests must inject worker crash, network partition, provider 429/5xx, credential revocation, target drift, storage unavailability, duplicate events, clock skew and partial rollback.
- Recovery must reconcile real target state rather than blindly replaying all steps.
- Metrics must be derived from observed events; no fabricated DORA/availability metrics. Define numerator, denominator, window and missing-data behavior.
- Health endpoints: liveness reports process viability; readiness reports dependency readiness; neither should leak secrets or report ready while critical dependencies are unavailable.
- Establish SLOs and alerting for success rate, queue age, execution duration, provider failures, recovery time, stuck executions, evidence failures and tenant isolation violations.

## 4. Evidence schema and sample snapshots

Every evidence record must include at least:
```json
{
  "schemaVersion": "1.0.0",
  "evidenceId": "generated-unique-id",
  "executionId": "run-unique-id",
  "gateId": "COR-PLATFORM-<manifest-row-id>",
  "status": "PASS",
  "source": {
    "repository": "Chicitadel/ugondu",
    "commit": "<full-commit-sha>",
    "tree": "<full-tree-sha>",
    "workflowRunId": "<provider-run-id>"
  },
  "target": {
    "os": "<actual-os>",
    "architecture": "<actual-architecture>",
    "runtime": "<actual-version>",
    "provider": "<actual-provider>",
    "mode": "<actual-mode>"
  },
  "startedAt": "<RFC3339>",
  "completedAt": "<RFC3339>",
  "command": ["<executable>", "<arg>"],
  "exitCode": 0,
  "rawLogSha256": "<digest>",
  "artifacts": [{"path": "<relative-path>", "sha256": "<digest>"}],
  "limitations": []
}
```
Values above are schema examples, not observed evidence. A `PASS` is permitted only when the underlying tool executed and all assertions passed. A report must not include untested platforms in `platformsVerified`.

## 5. Required tests and acceptance gates

| Gate | Required proof | Fail-closed behavior |
|---|---|---|
| Evidence integrity | Native test outputs, schemas, exact SHA/tree, digest and signature | Missing/stale/mismatched artifact blocks |
| Dependency/SBOM | Real scanner + lockfile + final artifact inventory | Scanner unavailable or incomplete blocks |
| AWS physical | OIDC identity, positive/negative API tests, logs, cleanup and residual inventory | Wrong identity, malformed test or unknown result blocks |
| Platform matrix | One current result per manifest row | Missing OS/arch/runtime/provider row blocks universal claim |
| Host adapters | Real sandbox operations and postcondition checks | Compile-only result stays implemented, not qualified |
| UI/CLI/IDE | Workflow parity, accessibility, non-interactive CI tests | Any critical actor/mode regression blocks |
| Model/no-model | Model failure cases and fully functioning core without model | Provider outage must not disable non-model core |
| i18n | Token parity, locale rendering, RTL/accessibility tests | Missing required token blocks release |
| Execution safety | Typed action validation, authorization, replay/idempotency, approvals | Unknown action or policy failure denies |
| Resilience | Crash, network, partial failure, resume/reconcile, rollback | Unknown target state quarantines execution |
| Governance | Independent review, signed exception register, clean source tree | Unapproved exception blocks |
| Release signature | External trust anchor and authenticated provenance | Missing/invalid key or attestation blocks |

### Release gate order

1. Freeze scope and candidate commit.
2. Validate manifest and policy digests.
3. Run static, type, lint, unit, contract and integration gates.
4. Run provider/host and cross-platform matrix in isolated environments.
5. Run security, SCA, SBOM, secret scan and provenance checks.
6. Run live AWS qualification separately in the authorized sandbox account.
7. Execute UI/CLI/IDE, model-assisted/no-model, locale and accessibility parity tests.
8. Run fault-injection/recovery tests.
9. Collect native evidence from clean workspaces and verify schemas/digests.
10. Independent reviewer checks raw artifacts and trust chain.
11. Sign final manifest with managed key custody.
12. Verify signature from a clean consumer environment using an independently provisioned trust anchor.
13. Issue sign-off only for the exact commit, tree, scope, expiry and exceptions recorded.

## 6. No-regression guardrails

- Add regression tests before changing execution, auth, state, policy, provider, localization or evidence code.
- Keep tests that cover existing behavior; do not weaken/delete an assertion to make a gate green. Any assertion change needs a documented rationale and a regression test for the corrected behavior.
- Use a baseline suite and compare coverage/test inventory before and after changes. A lower test count or new skip is a release blocker unless independently approved.
- No source-only string checks as sole proof of runtime security. Pair static checks with behavior tests.
- Do not mass-edit product modules during this evidence remediation unless the affected behavior is covered by targeted tests.
- Feature flags must default to the safest state; rollout changes must be reversible.
- Use canary/blue-green deployments and verify postconditions; rollback is not assumed until tested.
- Preserve raw failing logs; do not overwrite prior run artifacts.
- Require clean working tree and exact SHA before and after test execution.
- No hardcoded credentials, private keys, account IDs, environment paths, user-facing strings, provider endpoints, platform result lists or success values in evidence generation. Environment-specific account/region policy may be supplied through validated protected configuration, not embedded as a universal constant.

## 7. Implementation sequence

### Phase 0 — Contain certification risk
- Keep COR status blocked.
- Mark generated/historical evidence as historical unless re-collected on the candidate SHA.
- Confirm exposed historical private keys have been rotated/revoked; repository history must be assessed separately from the current tree.
- Restrict signing and AWS credentials to trusted workflows and protected environments.

### Phase 1 — Evidence correctness
- Replace synthesized JUnit with native test-runner outputs and raw logs.
- Integrate real SCA, SBOM, provenance and secrets scanning.
- Remove default-pass/fallback evidence records.
- Validate schema, freshness, commit/tree binding, target identity and external signature.
- Add adversarial tests for tampering and stale evidence.

### Phase 2 — AWS and cloud physical tests
- Validate OIDC trust and least-privilege policy.
- Build sandbox fixtures and cleanup/reconciliation.
- Execute positive/negative API probes, deployment, health, observability, rollback and residual scan.
- Capture independently verifiable run evidence.

### Phase 3 — Universal target matrix
- Inventory actual incorporated adapters and declared support.
- Build OS/architecture/runtime/provider/host/IDE matrix from configuration.
- Add native runners and real disposable provider tests.
- Remove unsupported combinations from release claims until qualified.

### Phase 4 — Shared UX and execution safety
- Consolidate UI, CLI, IDE, model-assisted and automation entry points through the same policy and execution APIs.
- Validate fine-grained control, approval, pause/resume/cancel, idempotency, recovery and rollback.
- Test non-model workflow parity and model-provider failure/deprecation.

### Phase 5 — Localization and accessibility
- Enforce tokenized strings and locale completeness across UI/CLI/API/background jobs/emails.
- Add RTL, screen reader, keyboard-only, scaling and responsive viewport checks.
- Verify locale persistence across asynchronous tasks and actor surfaces.

### Phase 6 — Independent certification
- Run all gates on a frozen commit.
- Independently review raw evidence and trust roots.
- Generate a signed report with exact support scope and expiry.
- Re-audit after material code, dependency, policy, platform or provider changes.

## 8. File-level remediation map

| File/path | Action |
|---|---|
| `scripts/release/collect-qualification-evidence.mjs` | Refactor to orchestrate tools and import native outputs only; no default-pass records |
| `scripts/release/verify-evidence-bundle.mjs` | Strict schemas, freshness, commit/tree/run binding, external trust anchor, scanner/SBOM/provenance validation |
| `scripts/aws-conformance/run-aws-conformance.mjs` | Retain correct ARN/fail-closed behavior; add verified request identity, positive controls, resource cleanup and raw logs |
| `scripts/aws-conformance/aws-env.mjs` | Default credential chain/OIDC; reject long-lived credentials in release mode |
| `scripts/cor-engine.js` | Validate independent assertions and artifact provenance per stream; reject self-authored proof |
| `scripts/cor-finalize.js` | Require exact stream inventory, no skips, current evidence, external signature and independent review |
| `tests/cor-remediation.test.js` | Behavioral tests; do not treat source substring checks as certification |
| `.github/workflows/ci.yml` | Protected gates, OS/provider matrix, immutable action pins, minimal permissions |
| `.github/workflows/cor.yml` | Separate trusted signing/AWS jobs; enforce physical evidence and exact candidate |
| `config/qualification/platform-matrix.json` (new) | Governed declared support matrix and test commands |
| `schemas/qualification-evidence.schema.json` (new) | Strict versioned evidence schema |
| `tests/qualification/` (new or existing suite) | Negative, stale, cross-platform, mode-parity and evidence-tampering tests |
| `locales/**`, `scripts/i18n_audit.js` | Token parity and actual UI/CLI/background locale behavior |
| `server/engine-core/**`, `server/repository-adapter/**`, `client/**` | Test shared policy boundary and actual adapters; avoid speculative broad refactors |

## 9. Corporate naming and metadata hygiene

Use **Air Roofers SASU** where the French legal entity is identified. Do not use “Air Roofers Ltd” in new headers, reports, evidence metadata or sign-off records. Correct existing incorrect headers only in scoped, reviewable changes with tests and no unrelated churn. This is a metadata hygiene requirement, not the central certification blocker.

## 10. Final audit conclusion
Current conclusion: **CONDITIONAL / NOT CERTIFIED**.
The repository contains useful hardening work, but available source inspection and failed CI history do not support a universal production-readiness claim. In particular, evidence generation, actual AWS physical qualification, cross-platform/provider qualification, and independent release verification must be demonstrated rather than asserted.
No one should represent Ugondu as “universally ready” until:
- every claimed support-matrix row is qualified;
- model-assisted and non-model workflows both pass;
- UI, CLI, IDE, fine-grained and automated execution modes pass the same policy and safety contract;
- locale and accessibility requirements pass;
- live AWS and host tests pass with real evidence;
- native outputs, provenance, hashes and signature are independently verified;
- the exact release commit is reviewed and signed off.
## Appendix A — Recommended CI matrix snapshot
Illustrative workflow structure; adapt matrix entries from the governed manifest and only include targets with available runners and credentials.
```yaml
jobs:
  unit-contract:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@<PINNED_COMMIT_SHA>
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test -- --runInBand
      - name: Upload native test output
        if: always()
        uses: actions/upload-artifact@<PINNED_COMMIT_SHA>
        with:
          name: test-results-${{ github.sha }}
          path: artifacts/test-results/
  platform-qualification:
    strategy:
      fail-fast: false
      matrix:
        include: ${{ fromJSON(vars.UGONDU_QUALIFICATION_MATRIX_JSON) }}
    runs-on: ${{ matrix.runner }}
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@<PINNED_COMMIT_SHA>
      - run: ./scripts/qualification/run-target.sh "${{ matrix.target_id }}"
      - name: Upload target evidence
        if: always()
        uses: actions/upload-artifact@<PINNED_COMMIT_SHA>
        with:
          name: target-${{ matrix.target_id }}-${{ github.sha }}
          path: artifacts/qualification/${{ matrix.target_id }}/
  release-attestation:
    needs: [unit-contract, platform-qualification]
    if: github.event_name == 'push' && github.ref_protected
    environment: release-signing
    permissions:
      contents: read
      id-token: write
      attestations: write
    steps:
      # Verify all matrix cells and evidence first. Sign only after validation.
      - run: node scripts/release/verify-qualification-set.mjs
      # Use the approved managed signing/attestation integration here.
```
**Important:** the sample uses placeholders for immutable action SHAs and a protected variable containing a governed matrix. Do not copy placeholder values into a production workflow. If the platform matrix or trusted runner is unavailable, the gate must fail rather than silently skip the target.
## Appendix B — Required audit vocabulary
- **Implemented:** source exists.
- **Tested:** a named test executed and passed.
- **Qualified:** all required target-specific runtime/security/postcondition checks passed with evidence.
- **Certified:** independent review approved the exact evidence bundle and trust chain for a defined scope and validity period.
- **Unavailable:** intentionally not provided.
- **Unqualified:** support is claimed or planned but evidence is incomplete.
- **Blocked:** required gate failed, was skipped, lacked credentials, or did not produce trustworthy evidence.
These terms are not interchangeable.
