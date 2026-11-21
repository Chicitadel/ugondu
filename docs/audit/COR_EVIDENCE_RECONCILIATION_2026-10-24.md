# COR Reconciliation Addendum — Evidence Integrity, AI Qualification and Universal Support

**Audit date:** 2026-10-24  
**Repository:** `Chicitadel/ugondu`  
**Base branch:** `phase4/production-hardening`  
**Evidence candidate:** `2646ac244973f5c03fd26b5adee71e6a12b4daa5`  
**Evidence-only release HEAD claimed in the manifest lineage:** `0964dc76421ba08d3438a1ddb05370502f9dde98`  
**Workflow run inspected:** [40086572196](https://github.com/Chicitadel/ugondu/actions/runs/40086572196)  
**Disposition:** **🔴 COR UNIVERSAL CERTIFICATION WITHHELD — evidence integrity and real-E2E gaps remain.**

This is a fresh reconciliation of the newly reported completion claims against repository artifacts and GitHub Actions job outcomes. It does not treat a checklist, green sub-gate, manifest `unproven: []`, or a passing static validator as proof that every capability is real and universally qualified.

## 1. Executive result

Several substantial implementation changes are present: candidate-bound manifest semantics, a model lifecycle module, a live AI canary receipt, native runner evidence, and an anti-stub validator. However, the evidence set contains a **material mismatch between the claimed qualification and the actual execution path**.

The strongest confirmed issue is in `scripts/qualification/qualify-ai-models.mjs`:

- When live credentials and base URL are not both configured, it enters `CATALOG_OFFLINE` mode.
- If the catalog file is absent, it creates a synthetic sentinel model.
- For every discovered model it injects an `executeFn` that returns a fabricated string, `Verified qualification output for ...`, rather than calling the real provider.
- It passes `requireCredentials: false`.
- `ModelLifecycle.verifyInference()` itself has a fallback output `pong-inference-verification` when no executor is supplied.
- `ModelLifecycle.qualify()` can derive an inference digest from the model alias if the inference digest is absent.

The checked-in report at `docs/security/evidence/ai_model_qualification_report.json` records `qualificationMode: "CATALOG_OFFLINE"`, yet reports 12 qualified and 12 active models. That report **cannot be accepted as live qualification evidence**. These are direct source-level findings, not speculation about the intention of the implementation.

Separately, workflow run 40086572196 shows successful build/workspace/governance jobs but its Integration Tests job and Docker image job are cancelled; language-pack tests were cancelled, AI inference gateway and UPLM conformance steps were skipped, and release publishing was cancelled. A partial or cancelled workflow is not a complete E2E pass.

## 2. Colour-coded certification table

Legend: 🟢 verified for exact stated scope; 🟡 partial evidence; 🟠 blocked/incomplete; 🔴 failed or materially invalid evidence; ⚪ not run/not evidenced.

| ID | Domain | Current status | Evidence-based finding | Closure required |
|---|---|---:|---|---|
| COR-01 | Candidate manifest SHA semantics | 🟡 | `releaseHeadSha` removed and candidate SHA retained; reported freshness gate passed. | Re-run all dependent gates on final source candidate and verify evidence-only allowlist is narrow. |
| COR-02 | Evidence-only descendant allowlist | 🟠 | Candidate commit diff expands `EVIDENCE_ONLY_PREFIXES` from `docs/governance/evidence/` to all `docs/governance/`. This allows non-evidence governance documents to change without changing the candidate source baseline. | Restrict to explicit evidence paths or a strict path+schema allowlist; add negative tests for policy, workflow and implementation files. |
| AI-01 | Live AI canary | 🟡 | Receipt records HTTP 200 discovery and execution for one model and 30 available models on candidate `2646ac...`. | Verify workflow logs/artifacts and API contract; this proves one live inference, not 30 models qualified. |
| AI-02 | All-model qualification | 🔴 | Report says `CATALOG_OFFLINE`, 12/12 qualified and active; source uses fabricated inference output and disables credential requirement. | Replace synthetic executor with real provider adapter; offline mode must never produce QUALIFIED/ACTIVE or production qualification receipts. |
| AI-03 | Synthetic model fallback | 🔴 | Missing catalog creates a sentinel model and can still flow through the same qualification loop. | Missing catalog is a hard error in production; development fixtures are test-only and cannot emit certification evidence. |
| AI-04 | Credential enforcement | 🟠 | Qualifier passes `requireCredentials: false`; live mode is only selected if both key and base URL exist. | Production qualification must require credentials and explicit live mode; absent configuration fails closed and exits nonzero. |
| AI-05 | Provider model routing | 🟠 | Lifecycle module exists, but live canary only demonstrates one model; offline report cannot prove provider-specific route execution. | Per-model real inference, capability-specific tests and routing receipts for each advertised ACTIVE model. |
| GOV-01 | Anti-stub validator | 🟡 | Static AST/regex validator reports zero violations; source contains a synthetic successful inference path that the existing pattern set does not reject. | Add targeted regression rules/tests for fabricated inference output, fallback success values, alias-derived digests, offline ACTIVE state and false certification metadata. |
| GOV-02 | Zero operational hardcoding | 🟠 | Model qualification runner hardcodes allowed host names and key-format regex; catalog has a hardcoded default endpoint and provider allowlist in the runner. Security boundaries can be constants, but must be governed and must not duplicate mutable inventory. | Centralize approved egress policy in signed/validated registry; separate immutable security invariants from operational inventory and test config drift. |
| NAT-01 | Windows/AMD64 | 🟢 | Evidence claims native qualification suite 148/148 passed on Windows x64 at candidate SHA. | Preserve raw logs, host provenance and digest; rerun if source changes. |
| NAT-02 | Linux/AMD64 | 🟡 | Native evidence is for Go thin-client and governance gates; not full Node suite on Linux. | Run complete declared product qualification suite natively. |
| NAT-03 | macOS/ARM64 | 🟡 | Evidence explicitly says Go thin-client only; Node qualification suite was not run. | Full product/runtime tests on native Apple Silicon. |
| NAT-04 | Linux/ARM64 | 🟠 | Cross-compiled only. | Native execution and operation receipts on ARM64 hardware/runner. |
| NAT-05 | macOS/Intel | 🟠 | Cross-compiled only. | Native execution on Intel macOS. |
| IDE-01 | VS Code | 🟠 | Experimental, not qualified. | Install/connect/auth/workflow/update/uninstall E2E. |
| IDE-02 | JetBrains | 🟠 | Unsupported by target matrix. | Implement and qualify each claimed IDE family/version, or explicitly exclude from universal claims. |
| IDE-03 | Cursor/Windsurf/Neovim | 🟠 | Unsupported by target matrix. | Implement and qualify individually; a generic adapter or matrix row is not proof. |
| HOST-01 | AWS | 🟠 | Target matrix says tested, but native evidence says per-operation disposable-infrastructure receipts are not attached. AWS physical qualification gate was awaited in the reported run; this inspected run does not establish its successful completion. | Verified real provision/read-back/rollback/cleanup receipts and successful physical gate on exact candidate. |
| HOST-02 | cPanel/DirectAdmin/SSH/VPS | 🟠 | Matrix declares operations tested but receipts proving each operation are not present in the reviewed native evidence. | Real target mutation, independent verification, rollback and cleanup receipts. |
| HOST-03 | Docker/Kubernetes | 🟠 | Run 40086572196 cancelled Docker image validation before smoke test; no complete successful Docker E2E from this run. Kubernetes receipts not demonstrated by this run. | Successful build/start/health/data/rollback/cleanup on real disposable environment. |
| HOST-04 | GCP/Azure | 🟠 | Adapter support and operation evidence not established by the reviewed artifacts. | Provider-specific real integration and receipt suite. |
| REL-01 | Full CI/E2E | 🔴 | Run 40086572196 includes cancelled integration and Docker jobs; AI inference gateway and UPLM conformance skipped; release publishing cancelled. | A new complete run with all mandatory jobs successful, none cancelled/skipped. |
| REL-02 | Tag-gated publication | 🟠 | Publish job in inspected run was cancelled. | Controlled signed-tag publication test, artifact hashes, provenance and signature verification. |
| GOV-03 | Manifest `unproven: []` | 🔴 | Manifest's empty list conflicts with native evidence's explicit cross-compiled-only, unsupported IDE and missing provider receipts. | Derive `unproven` from the target matrix and evidence inventory; reject unsupported or missing rows instead of trusting a manually authored empty array. |
| COR-99 | Universal certification | 🔴 | Mandatory AI, native platform, IDE, provider and release rows remain open. | All required rows green with current evidence and independent COR finalization. |

## 3. Exact source-level findings and required fixes

### F-01 — Synthetic inference can produce a successful qualification

File: `scripts/qualification/qualify-ai-models.mjs`

Current problematic pattern:

```js
await lifecycle.runFullLifecycle({
  requireCredentials: false,
  executeFn: async () => ({
    output: `Verified qualification output for ${lifecycle.alias}`
  }),
});
```

This calls the lifecycle with a synthetic executor regardless of whether the model is from the live catalog. The output is not proof that the selected provider/model performed inference.

**Required remediation:** qualification must receive a provider-bound executor created by the actual configured adapter. If no adapter or credentials exist, mark the model `DISABLED` or `UNQUALIFIED`; never return a qualification receipt. Keep synthetic executors only in test files and inject them only into unit tests.

Target contract:

```ts
interface LiveQualificationContext {
  mode: "LIVE";
  candidateSha: string;
  providerId: string;
  modelId: string;
  credentialHandle: string;
  executeProbe: (request: QualificationProbe) => Promise<ProviderInferenceResult>;
}
```

The production qualification function should reject any context without a live adapter, credential handle, real provider response and correlation ID. Never log credential material.

### F-02 — Offline mode can claim ACTIVE models

Current code selects `CATALOG_OFFLINE` when credentials or base URL are absent, then runs the same qualification and activation lifecycle. It also creates a synthetic sentinel model when the catalog is missing. The report shows 12 active models under offline mode.

**Required remediation:**

```js
if (process.env.NODE_ENV === "production" && qualificationMode !== "LIVE_SOVEREIGN") {
  throw new QualificationGatewayError(
    "LIVE_QUALIFICATION_REQUIRED",
    "Production certification requires live provider discovery and inference",
    503
  );
}
```

Also enforce the rule in the evidence verifier, not just the runner:

```js
if (report.qualificationMode !== "LIVE_SOVEREIGN") {
  throw new EvidenceFreshnessError(
    "Offline catalog reports cannot satisfy live AI qualification"
  );
}
if (report.summary.activeCount !== report.receipts.filter(
  r => r.status === "QUALIFIED" && r.liveExecution === true
).length) {
  throw new EvidenceFreshnessError(
    "Active model count does not match real live qualification receipts"
  );
}
```

These snippets are remediation targets, not claims that they are already implemented. The report schema must add `liveExecution`, provider response identity, correlation ID, check outcomes and candidate binding from the actual execution receipt. A bare boolean must never be trusted without verifying the receipt provenance and digest.

### F-03 — Fallback inference output and alias-derived digest

In `server/engine-core/src/ai/model-lifecycle.ts`, `verifyInference()` supplies `pong-inference-verification` when no `executeFn` is passed. `qualify()` falls back to a digest of the model alias if no inference digest exists.

**Required remediation:** remove both production success fallbacks. Missing executor or missing inference digest must throw a typed error. Add adversarial tests proving no state transition to `INFERENCE_VERIFIED`, `QUALIFIED` or `ACTIVE` can occur without a real provider result.

### F-04 — Evidence freshness allowlist is too broad

Candidate commit `2646ac244973f5c03fd26b5adee71e6a12b4daa5` expands the allowed evidence-only prefix from `docs/governance/evidence/` to `docs/governance/`. That can permit policy documents or other governance controls to change in a descendant commit without requiring a new source candidate.

**Required remediation:** allow only narrowly defined generated evidence directories and named report patterns. Deny governance policies, workflows, scripts, configuration, package manifests, tests, registries and source. Add mutation tests for every forbidden path class.

### F-05 — Empty unproven list is not derived from coverage

The manifest says `unproven: []`, but the native-runner evidence explicitly records Linux/ARM64 and macOS/Intel as cross-compiled only, multiple IDEs as unsupported, and provider operation receipts as missing. Therefore the manifest field cannot be treated as an authoritative summary of universal readiness.

**Required remediation:** calculate the unresolved list by comparing every mandatory row in `config/qualification/target-matrix.json` with signed, schema-valid, candidate-bound evidence. A row marked supported/tested without required receipts is a hard failure. Any unsupported row prevents a universal claim; no manual override to an empty list is permitted.

### F-06 — Target matrix overstates provider status

The target matrix lists AWS, DirectAdmin, cPanel, SSH/VPS, Docker and Kubernetes operations as `tested`. The reviewed native evidence says operation receipts are not attached, and the current inspected workflow's Docker job was cancelled before smoke testing. Matrix status is an assertion, not proof.

**Required remediation:** separate `declaredSupport`, `implementationStatus`, `executionStatus`, `evidenceStatus` and `certificationStatus`. Only the verifier may set certification status to `CERTIFIED`, after validating the actual operation receipt set. A static JSON matrix must never self-certify its own claims.

### F-07 — Full CI run did not complete

Run [40086572196](https://github.com/Chicitadel/ugondu/actions/runs/40086572196) had successful build, workspace and governance jobs, but:
- Integration Tests: cancelled; language-pack tests cancelled; AI inference gateway and UPLM conformance steps skipped.
- Docker image validation: cancelled during image build; smoke test skipped.
- Build & Publish Release: cancelled.

Therefore the run cannot support a claim of full integration/E2E, Docker certification or release publication completion. Re-run all mandatory jobs after fixes and reject cancelled/skipped required jobs.

## 4. AI qualification acceptance suite

The next AI milestone is not “all models show ACTIVE”; it is “all advertised ACTIVE models have independently verifiable live receipts.”

For each model discovered from `https://ai.airroofers.eu`:

1. Validate the live catalog response against a versioned schema.
2. Preserve the actual provider-issued model identifier and provider binding.
3. Apply region, data classification, capability, tenant/product, cost and authorization policies.
4. Execute a non-sensitive real inference against that model through the provider adapter.
5. Verify HTTP status, provider/model identity, response schema, correlation ID and output digest.
6. Persist a redacted receipt tied to candidate SHA and qualification-suite version.
7. Activate only if all mandatory checks pass.
8. Record every rejected, unavailable, rate-limited or unsupported model with an explicit non-active disposition.
9. Repeat for newly discovered models automatically; catalog growth must not require source-code edits.
10. Verify that failure of one model does not silently route requests to an unqualified model or synthetic fallback.

Negative cases: missing/expired credential, wrong audience/scope, endpoint host not allowlisted, redirect, DNS/TLS failure, timeout, 401/403, 404, 429, 5xx, malformed JSON, empty catalog, duplicate model IDs, unsupported capability, mismatched provider ID and evidence digest tampering.

Do not publish prompt contents or credentials in receipts. Use minimal benign probes and provider-approved test operations.

## 5. Zero-hardcoding and zero-stub governance

“Zero hardcoding” does not mean removing security invariants. Cryptographic rules, protocol constants and explicit security boundaries may remain constants when governed and tested. The requirement is zero embedded mutable operational facts, hidden inventories, credentials, environment-specific account references or user-facing strings outside approved registries/locales.

Required controls:

- One authoritative, signed provider/model/target registry; no duplicate hardcoded model inventory or host list in qualification scripts.
- Runtime configuration schema validation and fail-closed startup on missing production configuration.
- Production dependency-injection graph must not bind test doubles.
- Unit fixtures and fake transports isolated to test-only paths and excluded from shipped bundles.
- Static AST checks plus targeted semantic tests for fabricated outputs, alias-derived evidence, empty/no-op mutations, swallowed exceptions and fallback-success paths.
- No `|| true`, ignored exit codes, auto-success defaults or skipped mandatory test jobs.
- All locale keys resolved from catalogs, with parity, placeholder and RTL checks for supported languages.
- Unsupported capability is unavailable by default, not marked green because it fails closed.
- Every exception has owner, rationale, expiry and tests; expired exceptions fail CI.

The current static anti-stub validator is a useful layer but is not sufficient alone: the synthetic inference pattern demonstrates that semantic fake-success paths can evade its current checks.

## 6. Mandatory CI/release corrections

1. Add a test that runs the qualifier without credentials and asserts it exits nonzero for certification mode and creates no qualification report with ACTIVE models.
2. Add a test with a fake transport in a test-only module and prove production qualification cannot import or invoke it.
3. Add a regression test proving absence of `executeFn` throws and cannot advance lifecycle.
4. Add a verifier test proving `CATALOG_OFFLINE` receipts are rejected by release freshness verification.
5. Add a coverage reconciler that derives unresolved target rows from the signed matrix and evidence receipts.
6. Narrow `EVIDENCE_ONLY_PREFIXES` and test that edits under `.governance/policies/`, `.github/workflows/`, `scripts/`, `config/`, `tests/`, `server/` and package manifests invalidate candidate binding.
7. Make every required CI job a required check; a cancelled or skipped required job must fail finalization.
8. Ensure AWS physical qualification is a mandatory dependency of the final release gate for push/tag events, not an optional or merely awaited job.
9. Ensure COR signing/finalization occurs only after all required qualification jobs succeed and all evidence has been reconciled.
10. Rerun the entire pipeline on the exact new candidate; do not reuse the current manifest to claim the code fixes are verified.

## 7. Exact next-run command checklist

On a clean checkout of the new remediation candidate:

```bash
set -euo pipefail
git fetch --all --tags --prune
git checkout --detach "$CANDIDATE_SHA"
test "$(git rev-parse HEAD)" = "$CANDIDATE_SHA"
test -z "$(git status --porcelain)"

npm ci
npm run build
npm run lint --workspaces
npm run typecheck --workspaces
npm run test --workspaces

node --test tests/qualification/model-lifecycle-qualification.test.js
node --test tests/qualification/evidence-freshness.test.js
node --test tests/qualification/native-runner-evidence.test.js
node --test tests/qualification/target-matrix-fail-closed.test.js
node --test tests/qualification/runtime-config-zero-hardcode.test.js
node scripts/governance/validate-repository.mjs
npm run verify:release-integrity
node scripts/governance/verify-evidence-freshness.mjs

# Run only after the real adapter and verifier have been corrected:
UGONDU_AI_QUALIFICATION_MODE=live npm run ai:models:qualify -- --all-discovered
npm run ai:models:verify-evidence
npm run certification:platforms
npm run certification:providers:e2e
npm run certification:release-publication
```

The final five commands are required capabilities; if they do not exist or are not wired to real operations, treat that as an implementation gap. Do not add scripts that simply echo success or write synthetic evidence.

## 8. UAIGOS/COR finalization criteria

Universal certification remains blocked until all of these are true:

- No offline, fixture-backed or synthetic model can be marked `QUALIFIED` or `ACTIVE` in certification evidence.
- Every active AI model has a verified live inference receipt.
- Every supported OS/architecture has native product execution evidence, not merely cross-compilation.
- Every claimed IDE and hosting provider has real operation-level E2E evidence, including rollback and cleanup where applicable.
- The target matrix, unresolved list and certification summary are computed from evidence rather than copied claims.
- All required CI jobs complete successfully; no mandatory test is skipped or cancelled.
- Candidate binding and digest checks pass under a narrow evidence-only policy.
- Independent COR finalization and signature verification succeed on the same candidate/evidence lineage.

**Current verdict: 🔴 HOLD / NO-GO for universal certification.** Bounded components may be described as qualified only within the exact scope evidenced. Do not mark universal platform, IDE, host or AI support green.

## 9. Source links reviewed

- [AI qualification runner](https://github.com/Chicitadel/ugondu/blob/0964dc76421ba08d3438a1ddb05370502f9dde98/scripts/qualification/qualify-ai-models.mjs)
- [AI lifecycle implementation](https://github.com/Chicitadel/ugondu/blob/0964dc76421ba08d3438a1ddb05370502f9dde98/server/engine-core/src/ai/model-lifecycle.ts)
- [AI model qualification report](https://github.com/Chicitadel/ugondu/blob/0964dc76421ba08d3438a1ddb05370502f9dde98/docs/security/evidence/ai_model_qualification_report.json)
- [Live AI canary receipt](https://github.com/Chicitadel/ugondu/blob/0964dc76421ba08d3438a1ddb05370502f9dde98/docs/security/evidence/live_ai_canary_receipt.json)
- [Native runner evidence](https://github.com/Chicitadel/ugondu/blob/0964dc76421ba08d3438a1ddb05370502f9dde98/docs/governance/evidence/native-runner-evidence.json)
- [Evidence manifest](https://github.com/Chicitadel/ugondu/blob/0964dc76421ba08d3438a1ddb05370502f9dde98/docs/governance/evidence/evidence-manifest.json)
- [Target matrix](https://github.com/Chicitadel/ugondu/blob/0964dc76421ba08d3438a1ddb05370502f9dde98/config/qualification/target-matrix.json)
- [Repository anti-stub validator](https://github.com/Chicitadel/ugondu/blob/0964dc76421ba08d3438a1ddb05370502f9dde98/scripts/governance/validate-repository.mjs)
- [Evidence freshness verifier](https://github.com/Chicitadel/ugondu/blob/0964dc76421ba08d3438a1ddb05370502f9dde98/scripts/governance/verify-evidence-freshness.mjs)
- [COR workflow](https://github.com/Chicitadel/ugondu/blob/0964dc76421ba08d3438a1ddb05370502f9dde98/.github/workflows/cor.yml)
- [Inspected GitHub Actions run 40086572196](https://github.com/Chicitadel/ugondu/actions/runs/40086572196)

## Audit integrity statement

This report is a source-and-evidence reconciliation. The inspected code and checked-in JSON artifacts substantiate the findings above. It does not claim the remediation has been implemented, that the AWS physical gate passed, or that universal certification has been granted. The report itself is documentation, not a substitute for rerunning and verifying the gates.
