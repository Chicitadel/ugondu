<!-- Project: Ugondu | Organization: Air Roofers SASU | Governance: UAIGOS 3.0.0 -->
# Ugondu — Master COR Gap Closure, Production Readiness & Anti-Regression Plan

**Document ID:** AR-UG-COR-MASTER-AUDIT-20261025-01  
**Snapshot date:** 2026-10-25  
**Baseline branch:** `phase4/production-hardening`  
**Baseline commit:** `40b15020dc4bf7ba3a8abe99e2de8f6086485833`  
**Audit branch:** `audit/cor-zero-regression-production-readiness-2026-10-25`  
**Classification:** Internal engineering / release governance  
**Decision:** **BOUNDED QUALIFICATION ONLY — UNIVERSAL COR AND UNIVERSAL COMMERCIAL RELEASE NOT GRANTED**

> This document records an evidence-led plan and repository-state assessment. It does not claim that this document itself implements code remediation, runs tests, qualifies every platform, or grants certification. A green result is valid only for the exact commit, workflow run, target, and evidence artifact that produced it.

## 1. Executive determination

Ugondu has meaningful production-hardening work in the COR/AWS path, a dedicated production-hardening branch, multiple audit branches, governance documentation, a certification dashboard, and reported green scoped CI/qualification runs. The supplied audit material reports remediation of the VPC cleanup and S3 tag-verification findings (F-23/F-24), registry-driven configuration, localization governance, plugin isolation, and a unified COR/AWS/release workflow run.

The same source material explicitly limits the certification claim. It identifies gaps in AI fleet activation, native OS/architecture lifecycles, IDE integrations, host/cloud-provider coverage, and testing the immutable published artifact. Some records also disagree about whether the physical AWS and final release jobs had completed in the same run. Therefore:

- **Do not mark the product universally COR or fully commercial-release ready.**
- Treat prior passing checks as scoped evidence, not blanket proof of completeness.
- Reconcile all run/job/candidate SHA records from live GitHub Actions before the dashboard is updated.
- Treat every platform, feature, UI surface, provider adapter, deployment path, and release lifecycle as uncertified until its own acceptance evidence exists.
- Prevent reopening closed findings through machine-enforced regression tests, evidence freshness checks, and change-impact invalidation.

## 2. Audit basis, scope, and limitations

### 2.1 Sources reviewed for this snapshot

1. Repository metadata and branch listing for `Chicitadel/ugondu`; default branch `main`; production-hardening branch is `phase4/production-hardening`, reported at baseline commit `40b15020...`.
2. Existing `docs/audit/CERTIFICATION_PROGRESS_DASHBOARD.md`, snapshot 2026-10-25 06:15 UTC.
3. Existing `docs/audit/COR_FOLLOWUP_AUDIT_VPC_RECOVERY_AND_RELEASE_LINEAGE_2026-10-25_0441Z.md`.
4. The user-provided master audit report, which describes a reported certification snapshot at commit `40b15020` and run `40161212443`.

The dashboard and follow-up audit contain inconsistent temporal statements: the dashboard describes the AWS physical job in run `40161212443` as in progress at its inspection point, while the supplied master report later says all three jobs completed green. This report does not infer which statement is currently authoritative. Fetch the live workflow run and all jobs for the exact candidate before declaring lineage closed.

### 2.2 Coverage boundaries

This is a comprehensive **release-readiness gap-closure plan** spanning COR, code integrity, runtime configuration, localization, UI/UX, security, performance, tests, platform/IDE/host support, packaging, and commercial release. It is not a claim that every source file, screen, feature, workflow, and runtime was exhaustively executed in this session. The cited audit artifacts are the basis for existing claims; unmeasured domains are marked **not proven / requires physical audit**.

A repository-wide static scan is not equivalent to runtime verification. Test names, green badges, branch names, dashboard prose, or prior attestations alone do not establish current source correctness.

## 3. Status legend and current certification table

- 🟢 **Verified** — fresh, reproducible evidence tied to the exact candidate and stated scope.
- 🟡 **Partial** — implementation or evidence exists but mandatory acceptance criteria remain.
- 🔴 **Blocked / not proven** — failed, missing, stale, or insufficient evidence.
- ⚪ **Not assessed** — no adequate audit evidence.

| Domain | Snapshot status | What the reviewed records support | Closure / promotion criteria |
|---|---|---|---|
| Production-hardening branch | 🟢 | Branch exists and is reported at baseline commit `40b15020...`. | Recheck branch head and source diff before each certification. |
| Candidate CI / workspace tests | 🟡 | Supplied report lists 743/743 workspace tests and 898/898 qualified proofs; these are report claims, not a fresh rerun here. | Rerun clean-checkout pipeline at the release candidate SHA and retain raw logs/artifact digests. |
| COR release lineage | 🟡 | Existing records report run `40161212443` as reconciled, but prior dashboard text records a job still running at inspection. | Query live run/jobs; all mandatory jobs must be terminal-success on one approved lineage. |
| F-23 VPC cleanup | 🟡 | A hardened cleanup contract and manifest are reported; earlier audit material also documents a weaker helper that swallowed errors. | Inspect current implementation and prove every error path, ownership attribute, lease check, residual scan, and concurrency case with live AWS qualification. |
| F-24 S3 tags | 🟡 | Fail-closed handling and negative tests are reported. | Verify current code and tests; prove AccessDenied, missing/wrong tags, timeouts, provider errors, stale run identity, and no production synthetic fallback. |
| Registry-driven architecture | 🟡 | CONST-044/ADR-0042 compliance is reported. | Audit every runtime/config/package path; no duplicated mutable registry, fallback endpoint, or unregistered product/target. |
| Localization / hardcoding | 🟡 | 12 locales and token counts are reported; reported counts differ by directory and must be reconciled. | Machine scan source, CLI/UI, logs/errors, templates, build artifacts and all locales; exact key parity and rendered locale tests. |
| Zero stubs/mocks/scaffolding | 🟡 | Repository validator is reported to pass 4,590 files. | Inspect validator coverage and exclusions; combine static scanning, production bundle inspection, dependency graph checks, and real-provider tests. |
| AI API canary | 🟢 | Existing report says a live canary ran for `sentinel-guard-v1`. | Green only for that exact model/endpoint/receipt/SHA. |
| AI fleet activation | 🔴 | Discovery of 30 models is not qualification or activation of all models. | Per-model live inference, policy approval, signed fresh receipt, catalog reconciliation and routing test. |
| UI/UX completeness and polish | ⚪ | No comprehensive current screen-by-screen visual and interaction evidence is included in the reviewed records. | Inventory every screen/state; run visual, accessibility, responsive, keyboard, error/empty/loading, localization and end-to-end acceptance tests. |
| Performance / reliability | ⚪ | No complete workload profile or SLO evidence is included in the reviewed records. | Establish SLOs and repeatable load, stress, soak, resource, latency, memory and recovery tests. |
| Windows amd64 | 🟡 | Node qualification results are reported; full product lifecycle is not established. | Native clean install, launch, auth, AI, deploy, upgrade, rollback, recovery, uninstall. |
| Linux amd64 | 🟡 | Scoped thin-client/governance evidence is reported. | Native full product lifecycle on every advertised distribution/runtime. |
| macOS arm64 | 🟡 | Thin-client evidence is reported. | Native lifecycle plus signing/notarization and permission checks as applicable. |
| Linux arm64 | 🔴 | Cross-compilation is not native qualification. | Native hardware/runner execution and complete lifecycle. |
| macOS amd64 | 🔴 | Native Intel lifecycle not proven. | Native lifecycle or explicitly remove from advertised support. |
| VS Code | 🟡 | Experimental/scoped evidence reported. | Versioned install, auth, commands, AI, settings, update, offline/error paths and uninstall E2E. |
| JetBrains / Cursor / Windsurf / Neovim | 🔴 | Not qualified in the reviewed matrix. | Real target-specific implementation and tests, or explicit exclusion from public support. |
| Docker / Kubernetes / SSH-VPS / cPanel / DirectAdmin | 🟡 | Lifecycle evidence is not established for every advertised target. | Disposable real target install, secret injection, health, persistence, upgrade, rollback, recovery and teardown. |
| GCP / Azure | 🔴 | No qualifying physical lifecycle evidence reported. | Implement and qualify real adapters, or mark unsupported and prevent marketing claims. |
| Immutable signed release artifact | 🔴 | Clean install/upgrade/rollback/uninstall from the published artifact is not proven. | Sign/publish immutable artifact and test that exact digest in clean isolated environments. |
| Security / privacy / supply chain | 🟡 | Some zero-trust and adversarial checks are reported; full release-wide coverage not established. | Threat model, dependency/SBOM/license scan, secrets scan, SAST/DAST, authz/tenant tests, provenance/signature and incident controls. |
| Air Roofers integration / UAIGOS | 🟡 | Constitutions and policies are referenced; complete current conformance is not independently demonstrated here. | Evidence mapping for every applicable rule, automated gates, owner approval, no exception without formal signed waiver. |
| **Universal COR** | 🔴 **NOT GRANTED** | Multiple target families, AI fleet, UI/performance evidence, artifact lifecycle and run-lineage confirmation remain incomplete or unverified. | Every advertised feature/target has fresh evidence; all mandatory gates green on one candidate; independent release review signs off. |

## 4. Finding register and closure contracts

Finding IDs below are stable identifiers for this plan. Preserve them when implementation details change. Never delete a closed finding; reopen it with a linked regression record if a new change invalidates its proof.

### UG-COR-001 — Candidate/run/evidence lineage is not self-evidently reconciled

**Risk:** A passing physical test from one run can be incorrectly combined with a passing COR gate from another run, or stale evidence can be attributed to changed source.

**Required remediation**
1. Query the live run `40161212443`, every mandatory job, candidate SHA, workflow conclusion, artifact manifest, signatures and timestamps.
2. Compare the candidate and any evidence-only descendant. Source, workflow, policy, dependency lock, build configuration, test harness or runtime composition changes invalidate affected evidence.
3. Require the final release gate to verify that all mandatory jobs belong to one candidate lineage.
4. Have the dashboard derive status from machine-readable run/artifact records; never edit a row green manually.

**Acceptance:** One immutable candidate SHA; all required jobs terminal-success; evidence freshness and signatures valid; no unexplained candidate/receipt mismatch; independently reproducible report.

### UG-COR-002 — VPC cleanup ownership, leases, and residual resources

**Risk:** Cleanup of shared or concurrent resources, unsafe deletion, swallowed provider errors, or a false green when resources remain.

**Required contract**
- Every resource is registered in a durable manifest before destructive actions, with account, region, resource type/id, unique run UUID, owner, candidate SHA, creation timestamp, lease/expiry, and provider-observed ownership attributes.
- Delete only resources that match the manifest and all required ownership attributes, have no active lease, and are authorized by the cleanup policy.
- Unknown inventory, incomplete pagination, permission denial, timeout, ambiguous ownership or failed deletion is a typed blocker.
- Teardown follows dependency order and is idempotent. Preserve resources owned by another run/customer.
- An independent final provider scan must confirm zero residual run-owned resources.

**Illustrative contract (policy example, not drop-in implementation):**
```ts
type CorOwnership = {
  runId: string;
  candidateSha: string;
  owner: "ugondu-cor";
  createdAt: string;
  leaseExpiresAt: string;
};

function matchesCleanupOwnership(
  tags: Record<string, string>,
  expected: CorOwnership,
  now: Date,
): boolean {
  const expiry = Date.parse(expected.leaseExpiresAt);
  return tags.UgonduOwner === expected.owner
    && tags.UgonduRunId === expected.runId
    && tags.UgonduCandidateSha === expected.candidateSha
    && tags.UgonduCreatedAt === expected.createdAt
    && tags.UgonduLeaseExpiresAt === expected.leaseExpiresAt
    && Number.isFinite(expiry)
    && expiry < now.getTime();
}
```

The production implementation must additionally validate tag schema and timestamp normalization, consult the active-run lease store, require manifest membership, use provider-observed values, and preserve typed errors. A matching tag predicate alone is not enough to authorize deletion.

**Mandatory tests:** describe denied/timeout/incomplete pagination; absent/wrong ownership fields; active lease; concurrent runs; stale owned resource; delete failure; residual resource; unrelated resource preservation; repeat invocation; account/region isolation; manifest write failure; crash/restart recovery.

### UG-COR-003 — S3 tag verification must fail closed

**Required remediation:** Real provider response only. Treat absent tag set as empty; require all mandatory owner/run/candidate tags; never synthesize expected tags after AccessDenied or transport failure. Propagate typed failures to the release gate.

**Mandatory negative cases:** AccessDenied; missing tag set; each missing required tag; wrong owner/run/transaction/candidate; malformed response; timeout; DNS/TLS error; throttling; 5xx; pagination/SDK error where applicable; stale receipt; tampered evidence. Assert no delete action occurs after any verification failure.

### UG-AI-004 — Model discovery is not model qualification

**Required lifecycle:** `DISCOVERED → ELIGIBLE → TESTED → QUALIFIED → APPROVED → ACTIVE`, with `DISABLED/FAILED/REVOKED/EXPIRED` fail-closed states. No manual state promotion.

For every production-routable model: authenticated live inference, provider/model/version identity, endpoint and region/data policy checks, request/response schema, timeout/cancellation, quota/cost bounds, tenant isolation, output handling, fresh signed receipt tied to candidate SHA and policy version, explicit approval, and route-level test. Unknown models remain disabled. Key rotation, policy change, model removal, receipt expiry or signature failure disables routing until requalification.

### UG-GOV-005 — Zero operational hardcoding and authoritative registries

Inventory mutable endpoints, provider/model lists, target support matrices, product IDs, ports, quotas, retries, feature flags, tenant/product allowlists, environment-specific identifiers and user-facing strings. Resolve through validated registry/configuration/localization. Do not remove security invariants by turning them into unsafe user configuration; security constants such as anti-SSRF host boundaries require threat-model documentation and negative tests.

**Acceptance:** no unregistered runtime values; no duplicate sources of truth; registry schema/version validation; invalid/missing config fails with a typed error; tests prove registry changes take effect without code changes where intended.

### UG-QUAL-006 — Zero production stubs, mocks, scaffolding, and fake success

Check TODO/FIXME placeholders, empty/no-op functions, hardcoded sample results, fabricated progress, fake provider responses, default-success catches, permissive fallbacks, disabled tests, skipped assertions, unimplemented branches, demo fixtures and mock packages. Static matching is triage, not proof.

**Acceptance:** production dependency graph resolves only to concrete implementations; test doubles are test-only and excluded from release artifacts; each advertised operation has a real implementation or returns explicit unsupported/blocked status; provider integration tests and bundle inspection pass.

### UG-I18N-007 — Localization and zero user-visible string hardcoding

Audit UI, CLI, terminal output, errors, logs intended for users, docs/templates and extension messages. Use stable token namespaces and locale registry; reconcile token counts rather than relying on the reported 1,420/418 counts. Validate key parity, interpolation, pluralization, RTL, fallback policy, long text, encoding, locale switching and error messages in all advertised locales.

**Acceptance:** no missing/unused required keys without a governed waiver; all advertised locales render representative full flows; fallback never masks missing required production content.

### UG-UX-008 — UI and interaction completeness

Create a canonical screen/route/component/state inventory from source and product requirements. For each screen, test:
- initial, loading, success, empty, partial, error, offline, permission-denied, expired-session and retry states;
- responsive layouts and supported display densities;
- keyboard-only navigation, focus order, visible focus, accessible names/roles, contrast, reduced motion and screen-reader semantics;
- consistent design tokens, typography, spacing, iconography, content hierarchy and localization overflow;
- forms, validation, cancellation, destructive confirmations, back/forward navigation, deep links, persistence and recovery;
- no dead buttons, decorative controls that imply functionality, fake progress, stale data or inaccessible dialogs;
- real API wiring, authorization enforcement and truthful server errors.

**Acceptance:** every screen/state has linked requirement, test ID, screenshot/trace where appropriate, API contract, accessibility result, owner and evidence digest. Visual diffs must be reviewed; do not waive material regressions automatically.

### UG-PERF-009 — Performance and operational resilience

Define measurable budgets before tuning: cold start, warm start, p50/p95/p99 API latency, throughput, memory/CPU, bundle size, queue depth, error rate, cancellation time and recovery time. Measure baseline and candidate under reproducible hardware/data/workload conditions. Include load, stress, soak, burst, resource exhaustion, dependency degradation, retry storms, crash/restart and cancellation.

**Acceptance:** agreed SLOs pass with headroom; no unbounded retries, memory leaks, uncontrolled concurrency or sensitive data in telemetry; graceful degradation is observable and does not become fake success.

### UG-SEC-010 — Security, privacy, tenancy, and supply chain

Threat-model bootstrap, licensing, AI gateway, plugins, update path, credentials, local state, IPC/network boundaries, logs and release provenance. Verify least privilege, tenant isolation, authn/authz at server boundaries, secret redaction, TLS, replay protection, signature/key rotation, SSRF protection, path traversal protection, dependency policy, SBOM, license compliance, vulnerability triage and artifact provenance.

**Acceptance:** no unresolved critical/high release-blocking findings; documented exception is signed, scoped and time-bounded; secrets scan is clean; generated evidence is privacy-safe.

### UG-PLAT-011 — OS/architecture/IDE/host universality

A target is green only after target-specific native execution of its supported lifecycle. A successful compile, shared Node test, or related IDE compatibility does not qualify the target.

| Target | Minimum required proof |
|---|---|
| Windows amd64 | Signed/verified install, launch, auth, AI, deployment, update, rollback, recovery, uninstall on clean supported Windows versions. |
| Linux amd64 | Native tests across every advertised distro/runtime/init system, permissions, packages, upgrade/rollback/uninstall. |
| Linux arm64 | Native arm64 runner/device and full lifecycle; cross-build alone is insufficient. |
| macOS arm64 / amd64 | Native lifecycle for each advertised architecture; signing, notarization, permissions and update checks where applicable. |
| VS Code | Install/update/uninstall, auth, settings, commands, AI, offline/error paths on each advertised editor version. |
| JetBrains | Target IDE plugin lifecycle and compatibility matrix. |
| Cursor / Windsurf | Separate target-specific integration tests; do not infer support from VS Code. |
| Neovim | CLI/LSP install, auth, diagnostics, commands, updates, error handling and removal. |
| Docker | Build/pull, config/secrets, run/health, persistence, upgrade, rollback and cleanup on each advertised host. |
| Kubernetes | Real cluster deployment, secrets, RBAC, probes, network policies, storage, rolling update, rollback and teardown. |
| SSH/VPS | Native distro, service manager, permissions, secrets, restart/recovery, update and rollback. |
| cPanel / DirectAdmin | Disposable real-host install, supported runtime validation, config/secrets, health, persistence, upgrade and rollback. |
| AWS | Physical qualification, IAM/OIDC boundaries, quota preflight, deployment lifecycle, ownership-safe cleanup and residual scan in each advertised region/service. |
| GCP / Azure | Real provider adapters and physical qualification or explicit non-support. |
| Hosted/public release | Clean install from the exact immutable published artifact, then upgrade, rollback and uninstall. |

Public documentation and product UI must advertise only qualified targets. Unsupported targets must be explicitly labelled unsupported; fail-closed behavior is not a support certification.

### UG-REL-012 — Immutable release and post-publication proof

Build once from approved commit; produce artifact digest, SBOM, provenance and signature; publish immutably; verify signature before install; test that exact artifact (not a local build) in clean environments. Test upgrade from the prior supported release, interrupted upgrade, rollback, data migration, recovery, uninstall, and residue scan. Link the evidence to candidate SHA and release digest.

### UG-OBS-013 — Observability and supportability

Ensure structured, tokenized errors with correlation IDs; redaction; actionable health/readiness; metrics and traces without secrets or sensitive payloads; bounded log volume; support bundle generation with consent and redaction; documented runbooks for common failure and rollback scenarios.

### UG-DOC-014 — Air Roofers / UAIGOS product integration and documentation

Map each applicable UAIGOS constitution, invariant, product integration rule, security policy, extension policy, localization policy and release requirement to: implementation path, automated test, evidence artifact, accountable owner, and status. Maintain versioned architecture/API contracts, operator guides, end-user help, threat model, deployment guides, compatibility matrix, support policy, privacy/data handling, incident response, recovery and upgrade/rollback docs.

Do not claim ISO 27001, SOC 2, OWASP or other external certification merely because a checklist references a standard. State only the exact assessment or certification actually performed.

## 5. Regression-prevention architecture

### 5.1 Closed-gap ledger

Each finding must have a stable ID and fields:
`id, title, severity, owner, introducedBy, status, affectedPaths, acceptanceCriteria, tests, evidenceRefs, candidateSha, evidenceDigest, closedAt, expiresAt, reopenReason`.

A finding may transition to `CLOSED` only when required tests pass on the exact candidate, evidence is signed/fresh, and an independent reviewer approves. A source change to `affectedPaths`, a dependency/workflow/policy change, a failed test, stale evidence, or a newly detected equivalent defect transitions it to `REOPENED` automatically. Closure records are immutable; append new events rather than rewriting history.

### 5.2 Required release gate logic

Illustrative pseudocode:
```ts
const mandatory = await loadMandatoryGates(candidate.sha);
const evidence = await loadEvidenceManifest(candidate.sha);

if (mandatory.length === 0) throw new Error("No mandatory gates configured");
for (const gate of mandatory) {
  const receipt = evidence.forGate(gate.id);
  if (!receipt) throw new Error(`Missing evidence: ${gate.id}`);
  if (receipt.candidateSha !== candidate.sha) {
    throw new Error(`Stale candidate evidence: ${gate.id}`);
  }
  if (!receipt.signatureValid || receipt.expired || receipt.status !== "PASS") {
    throw new Error(`Invalid or failed evidence: ${gate.id}`);
  }
}
if (evidence.hasSkippedMandatoryGate()) throw new Error("Skipped mandatory gate");
if (evidence.hasUnresolvedBlocker()) throw new Error("Unresolved release blocker");
return certifyExactScope(candidate.sha, mandatory, evidence.digest);
```

Adapt to repository-native types and errors. This is a contract example, not a claim that this code is already implemented.

### 5.3 Branch and workflow protections

- Require pull request review and CODEOWNERS for governance, release workflow, security, registry and certification files.
- Require CI, typecheck, lint, unit/integration/E2E, localization, repository policy, dependency/security, evidence freshness and release-integrity checks.
- Prevent direct bypass of mandatory checks; limit override permissions and record approved exceptions.
- Use concurrency groups for destructive physical tests, keyed by account/region/resource scope.
- Fail closed if credentials, region, candidate SHA, receipt, policy pack or required configuration is missing.
- Never let a failed/skipped job be hidden by another successful run.
- Pin actions/dependencies where appropriate; validate permissions with least privilege.
- Require post-deploy smoke and rollback evidence from the exact artifact.

### 5.4 Evidence freshness and source drift

Evidence manifest should include candidate SHA, workflow/run/job IDs, target identity, toolchain versions, dependency lock digest, configuration/policy digest, command, start/end time, raw log/artifact digest, signature, result and reviewer. Evidence-only commits must be allowlisted and machine-checked. Any source/build/workflow/policy/dependency change invalidates affected evidence.

## 6. Implementation sequence and exit gates

| Phase | Priority | Work | Exit gate |
|---|---|---|---|
| P0-A | Critical | Reconcile current run `40161212443`, job conclusions, SHA and receipts. | Single candidate lineage has all mandatory gates terminal-success. |
| P0-B | Critical | Re-inspect and qualify F-23/F-24 implementation and negative paths on that SHA. | All ownership/error/negative tests pass; real AWS physical proof and independent residual scan. |
| P0-C | Critical | Enforce evidence manifest, freshness and automatic reopen behavior. | Inject stale SHA, missing receipt, skipped gate and changed source; each must fail release. |
| P0-D | Critical | Reconcile model registry and live qualify each intended active model. | No active model without fresh signed receipt and explicit approval. |
| P1-A | High | Inventory all features, routes, screens, commands, adapters and lifecycle operations. | Traceability matrix has no unowned/unmapped required feature. |
| P1-B | High | Complete UX/accessibility/localization and real API wiring audit. | All required screen/state tests pass with reviewed visual evidence. |
| P1-C | High | Complete security/privacy/supply-chain and tenancy verification. | No unresolved release blockers; signed exceptions only. |
| P1-D | High | Qualify each advertised OS/architecture/IDE/host/cloud target. | Every advertised target green or removed from support contract. |
| P1-E | High | Establish and meet performance/reliability SLOs. | Repeatable performance and resilience evidence on candidate. |
| P1-F | High | Build/sign/publish immutable artifact and test install/upgrade/rollback/uninstall. | Exact artifact digest passes complete lifecycle tests. |
| P2 | Normal | Final docs, operator runbooks, support matrix, launch checks and independent review. | All documentation reflects actual qualified scope; release owner signs off. |

No phase can bypass a P0 gate. Parallel work is permitted only when it cannot invalidate shared evidence or create unsafe infrastructure races.

## 7. Clean-checkout verification commands

Run only after checking that each command/script exists at the candidate SHA. Preserve exit codes and raw logs. Do not assume optional scripts exist merely because they appear in this plan.

```bash
set -euo pipefail
git status --short
git rev-parse HEAD
git diff --check
npm ci
npm run build --workspaces --if-present
npm run lint --workspaces --if-present
npm run typecheck --workspaces --if-present
npm test --workspaces --if-present
node scripts/validate-locales.js
node scripts/governance/validate-repository.mjs
```

Then run the repository's current, verified scripts for release integrity, evidence freshness, COR cleanup, S3 tag negatives, model lifecycle/adversarial qualification, plugin isolation, runtime config, and target-specific E2E. Discover the canonical command in package scripts/workflows before invoking. Run live-provider tests only with authorized least-privilege credentials in isolated test accounts/projects.

For each platform/host, use disposable environments and record target version, architecture, configuration digest, candidate SHA, artifact digest, logs and cleanup result. Never run destructive cleanup against shared/customer resources without explicit authorization and exact run ownership.

## 8. Required code review / exact implementation principles

1. Prefer existing repository abstractions, typed errors, tokenized errors, policy validators and test conventions; do not add parallel frameworks.
2. Add tests before/with fixes. Every closed finding needs a positive path, negative path, failure-injection path and regression test.
3. Avoid catch-and-continue for mandatory provider inventory, authorization, signature, cleanup, or evidence verification.
4. A timeout, permission error, malformed response, unavailable dependency, missing secret, unknown model, stale receipt or unsupported target must produce a typed visible failure.
5. Do not use mock data to satisfy production behavior. Test fixtures may be used only in isolated tests and must not leak into production composition or release bundles.
6. Use registry/configuration/localization for operational variability, but preserve security invariants and enforce schema validation.
7. Keep UI state truthful: no fabricated progress, optimistic success without server confirmation, or unsupported feature affordances.
8. Make migration, upgrade and rollback idempotent; preserve user data and produce recoverable failure states.
9. Any new fix must include the regression test and evidence manifest update in the same candidate workflow.
10. Update dashboard status only from verified machine evidence, never from a plan or implementation claim.

## 9. Certification dashboard governance

The dashboard is a view of evidence, not the evidence itself. Each row must link to the exact workflow run, job, candidate SHA, target, test report, artifact digest and expiration/freshness state. Required statuses: `NOT_ASSESSED`, `BLOCKED`, `IN_PROGRESS`, `PASS_SCOPED`, `PASS_UNIVERSAL`, `EXPIRED`, `REOPENED`. “Universal” may be set only by a policy gate that validates every advertised target and mandatory capability.

Automated anti-regression checks must reject:
- stale SHA or policy version;
- missing, invalid or expired signature;
- absent/empty mandatory gate configuration;
- skipped or cancelled mandatory job;
- conflicting results across candidate lineage;
- test quarantine without approved expiry;
- dashboard row not derivable from evidence;
- closed finding whose affected path changed without requalification;
- release artifact digest differing from tested artifact;
- unsupported target advertised as supported.

## 10. Launch decision checklist

- [ ] Current candidate SHA and branch protection verified.
- [ ] One-run lineage: all mandatory COR, physical qualification and final release gates green.
- [ ] F-23 ownership/lease/manifest/cleanup contract and negative proofs pass.
- [ ] F-24 real tag verification fails closed for all provider error cases.
- [ ] No stale, fabricated, unsigned or cross-candidate evidence.
- [ ] Zero production stubs/mocks/scaffolding proven by static + runtime + artifact checks.
- [ ] Zero unregistered operational hardcoding; localization parity proven for advertised locales.
- [ ] Feature/route/screen/command/API inventory is complete and traceable.
- [ ] UI polish, accessibility, localization, real API wiring and regression suite pass.
- [ ] Security, privacy, tenancy, supply chain and dependency review have no unresolved blockers.
- [ ] Performance and resilience SLOs pass with documented measurements.
- [ ] Every advertised OS/architecture/IDE/host/cloud target has full lifecycle evidence.
- [ ] AI active set reconciles exactly to fresh signed model receipts and explicit approvals.
- [ ] Immutable signed artifact is install/upgrade/rollback/uninstall tested.
- [ ] Docs, support matrix, incident/runbook and release notes match actual scope.
- [ ] Independent reviewer and release owner approve the final evidence manifest.

## 11. Final decision

**Current decision: BOUNDED QUALIFICATION ONLY. Universal COR is not granted by this audit plan.**

The existing audit trail indicates real progress, particularly around COR hardening and scoped AWS qualification. However, the reviewed evidence also records unresolved or unproven universality, AI fleet activation, target-specific full lifecycles, immutable artifact testing, and comprehensive UI/performance/security evidence. The discrepancy in run-state reporting must be resolved from live workflow data.

A future green certification must be earned by fresh machine-verifiable evidence, not inferred from this document, a prior green run, a successful build, or a code change. Keep all gaps open until their acceptance conditions are satisfied. When a closed gap regresses, automatically reopen it and block release.

## 12. Existing audit references

- [Certification Progress Dashboard](./CERTIFICATION_PROGRESS_DASHBOARD.md)
- [COR follow-up audit — VPC recovery, release lineage and universality](./COR_FOLLOWUP_AUDIT_VPC_RECOVERY_AND_RELEASE_LINEAGE_2026-10-25_0441Z.md)
- [Master COR remediation and certification checklist](./MASTER_COR_REMEDIATION_AND_CERTIFICATION_CHECKLIST.md)
- [COR master remediation execution and certification plan](./COR_MASTER_REMEDIATION_EXECUTION_AND_CERTIFICATION_PLAN.md)
- [Repository production-hardening branch](https://github.com/Chicitadel/ugondu/tree/phase4/production-hardening)
