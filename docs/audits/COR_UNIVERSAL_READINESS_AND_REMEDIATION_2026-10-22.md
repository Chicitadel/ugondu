# Ugondu COR Universal Readiness Audit & Remediation Master Plan

**Audit date:** 2026-10-22  
**Repository:** https://github.com/Chicitadel/ugondu  
**Target branch:** `phase4/production-hardening`  
**Target checkpoint SHA at audit start:** `fed1d52c10201e53c4059d917562ff4858f5721e`  
**Disposition:** **HOLD / NOT UNIVERSALLY CERTIFIED**  
**Purpose:** Reconcile implementation claims with evidence; provide a sequenced, testable remediation plan for COR, UAIGOS, live AI integration, and universal platform qualification.

> This is an evidence-led engineering audit, not a claim that the entire repository was executed in this session. GitHub metadata, selected source/configuration files, prior checkpoint results supplied by the operator, and historical audit reports were inspected. Anything not backed by a reproducible, target-SHA evidence artifact remains **UNVERIFIED**, not PASS.

## 1. Executive determination

Ugondu has meaningful implementation and governance infrastructure: a multi-workspace Node/TypeScript service architecture, Go CLI build matrix, a model catalog and AI inference gateway, repository governance scripts, localization validation, and CI workflows. The latest observed branch checkpoint (`fed1d52c10201e53c4059d917562ff4858f5721e`) has both a successful GitHub Actions CI/CD run ([run 39794583218](https://github.com/Chicitadel/ugondu/actions/runs/39794583218)) and a successful COR Certification workflow run ([run 39794575804](https://github.com/Chicitadel/ugondu/actions/runs/39794575804)), and the local execution record reports focused unit, contract, adversarial, and governance test suites passing.

That is evidence of progress, **not evidence of universal production readiness**. The most important unresolved issue is the gap between *declared capability*, *unit/integration-test behavior*, and *authenticated real-world behavior on each claimed target*. The audit therefore retains a release hold (**HOLD / NOT UNIVERSALLY CERTIFIED**) until all remaining live-environment, native-matrix, and administrative gates in this document are closed with fresh, immutable evidence bound to the exact candidate SHA.

### 1.1 Current evidence-based status

| Gate | Status | What is established | What is still required |
|---|---|---|---|
| Branch identity | 🟢 PASS (checkpoint only) | Branch exists; observed SHA is `fed1d52c10201e53c4059d917562ff4858f5721e` | Re-check immediately before release; bind all evidence to final SHA |
| CI/CD & COR workflows | 🟢 PASS (checkpoint runs) | Commit `fed1d52c10201e53c4059d917562ff4858f5721e` passed CI/CD ([run 39794583218](https://github.com/Chicitadel/ugondu/actions/runs/39794583218)) and COR Certification ([run 39794575804](https://github.com/Chicitadel/ugondu/actions/runs/39794575804): jobs `119887724433`, `119887725049`, `119901232439`) | Re-run on final remediation SHA and inspect all artifacts to ensure required gates did not skip or allow missing artifacts |
| Localization | 🟢 Reported PASS | Paused checkpoint reports 1,872 keys across 12 locales; parity and negative tests passed | Re-run on candidate SHA and prove locale discovery, fallback, interpolation, pluralization and UI/CLI parity |
| Engine core | 🟢 Reported PASS | Paused checkpoint reports TypeScript build and 37 suites / 164 tests passing | Re-run clean install/build/test; include all workspaces and exact command logs |
| AI gateway unit/contract tests | 🟢 Source & unit PASS / 🔴 live E2E open | Source-level policy gaps in `airroofers-provider.ts` remediated and verified via unit/contract/adversarial tests | Current unit tests inject a custom HTTP transport and deterministic test credential; live authenticated `ai.airroofers.eu` network E2E remains open |
| Anti-stub / repository governance | 🟢 Reported PASS / 🟠 scope to validate | Reported anti-stub tests and repository policy pass; `.github/CODEOWNERS` created | Prove checks cannot be bypassed, scan generated/vendor/test fixtures appropriately, and validate runtime behavior rather than only text patterns |
| Zero hardcoding | 🟠 Source remediated / 🔴 full E2E open | Model catalog and `airroofers-provider.ts` enforce catalog-governed endpoint/route resolution | Validate all runtime config paths, supported provider endpoints/regions/IDs, scripts, tests, docs, CLI, installer and CI on final SHA |
| Real cloud/provider operations | 🟠 CI gate passed / 🔴 fresh report open | COR run `39794575804` passed `AWS Physical Qualification Gate` (`119887724433`); historical 2026-10-05 report superseded | Regenerate and archive fresh target-SHA live lifecycle evidence without preflight failure, fake delay, or simulated drift caveats |
| Universal OS/architecture matrix | 🟠 PARTIAL / NOT CERTIFIED | CI defines Linux amd64/arm64, macOS amd64/arm64, Windows amd64 Go builds | Compile/test alone is not native behavioral certification; execute CLI smoke, install, auth, filesystem, signals, permissions and upgrade/rollback per target |
| IDE/host/platform support | 🟠 Target registry enforced / 🔴 live open | Capability/target registry and fail-closed `UNSUPPORTED_CAPABILITY` preflight exist | Certify each declared integration separately on live/sandbox targets; unsupported combinations must fail closed and never be shown green |
| AI multi-provider readiness | 🟠 DECLARED / LIVE UNVERIFIED | Catalog lists AWS Bedrock, OpenAI, Anthropic, Gemini, Azure OpenAI, deterministic and Air Roofers AI providers | Verify each adapter contract and actual eligible provider; remove any “enabled” claim without configured credentials, live health and E2E evidence |
| Rollback, resume, idempotency | 🟠 PARTIAL | URRE state-machine, durable store, and crash/resume/rollback tests exist | Execute real cloud/host resource rollback and kill-process/resume E2E with postcondition checks on candidate SHA |
| Evidence/provenance/release | 🟠 CI gate passed / 🔴 final bundle open | COR run `39794575804` passed `COR Final Release Gate` (`119901232439`); historical reports marked superseded | Confirm final candidate-SHA evidence bundle is fresh, signed, externally pinned, non-vacuous and complete; verify artifacts/signatures/SBOM/provenance |
| COR sign-off | 🔴 HOLD | No basis for unconditional universal certification yet | Close all P0/P1 findings, meet all release gates and obtain independent review |

**Colour semantics:** 🟢 PASS = evidence satisfies the stated scope; 🟠 PARTIAL = implementation/evidence exists but scope is incomplete; 🔴 BLOCKED/OPEN = required evidence is absent or a defect remains. “Reported PASS” means the execution checkpoint supplied by the operator reports it; it must be bound to the final candidate SHA before release.

## 2. Repository evidence reviewed

1. Branch listing shows `phase4/production-hardening` at `fed1d52c10201e53c4059d917562ff4858f5721e`; `.github/CODEOWNERS` is now present in the repository, while GitHub repository branch protection settings still require administrative verification.
2. Commit `fed1d52c10201e53c4059d917562ff4858f5721e` passed both GitHub Actions CI/CD ([run 39794583218](https://github.com/Chicitadel/ugondu/actions/runs/39794583218)) and COR Certification ([run 39794575804](https://github.com/Chicitadel/ugondu/actions/runs/39794575804), including `AWS Physical Qualification Gate` job `119887724433`, `COR Certification` job `119887725049`, and `COR Final Release Gate` job `119901232439`).
3. `package.json` defines build, lint, typecheck, test, contract, integration, E2E, security, compatibility, AWS and governance scripts. Script existence alone is not evidence that each target was exercised or that each test is non-vacuous.
4. `.github/workflows/ci.yml` defines Node workspace gates, a Go cross-compilation matrix and repository/evidence checks. The Go matrix builds five OS/architecture combinations, but smoke execution is explicitly limited to Linux/amd64, macOS/arm64 and Windows/amd64 in the observed workflow. Cross-compiled binaries not run on their native target must not be labelled native certified.
5. `config/model-catalog.json` declares the UAIGOS zero-hardcoding invariant and provider entries including `airroofers-ai`, with `UGONDU_AIRROOFERS_AI_BASE_URL` and `UGONDU_AIRROOFERS_AI_KEY`. Source-level policy remediation in `server/engine-core/src/ai/airroofers-provider.ts` now enforces catalog-governed endpoint validation, throws `MODEL_CATALOG_EMPTY` when no enabled catalog models exist, and records transport/auth provenance in `healthCheck()`, while live external network E2E remains open.
6. `tests/ai-inference-gateway.test.js` creates an in-process gateway, registers a deterministic credential, and injects a custom HTTP transport in unit tests. These are valid unit-test techniques, but do not establish live external-provider E2E.
7. `COR_PHYSICAL_CERTIFICATION_REPORT.md` is dated 2026-10-05 and records a failed IAM simulation preflight, an implicit waiter with a fake delay, and simulated out-of-band drift. It now carries an explicit `HISTORICAL RECORD — SUPERSEDED` banner and is not reused as current sign-off.
8. `UGONDU_EVIDENCE_RECONCILIATION_AUDIT.md` (2026-10-04) explicitly invalidated an earlier certification claim and documented historical DirectAdmin, DEISE, transaction wiring and distribution gaps. It now carries an explicit `HISTORICAL RECORD — SUPERSEDED` banner pointing to the canonical 2026-10-22 dashboard.
9. The repository previously contained multiple historical reports without supersession notices; explicit supersession banners now direct readers to `docs/audits/COR_CERTIFICATION_PROGRESS_2026-10-22.md` and this master plan as the single canonical status authority.
10. The operator checkpoint and local remediation verification report 12-language parity (1,872 keys), localization-negative tests (6/6), engine-core TypeScript build (0 errors), Jest suites passing, AI gateway and provider policy tests passing, anti-stub governance passing, repository governance (0 violations, all files <= 500 LOC), and zero prohibited AI strings. Re-run all on the final candidate SHA and preserve logs.

## 3. Findings and priorities

### F-001 — Certification claims exceed the demonstrated scope (P0)
**Evidence:** Successful CI/CD (`39794583218`) and COR (`39794575804`) runs and architecture/catalog claims exist on `fed1d52c10201e53c4059d917562ff4858f5721e`, while full native target execution across every OS/IDE/host combination and live external AI E2E are not all demonstrated by committed target-SHA artifacts. Older audit reports conflicted before supersession banners were added.
**Risk:** A green summary can be interpreted as universal support when it may only mean compilation or mocked/unit coverage.
**Remediation:**
- Set the single release state to `HOLD` by default.
- Store every gate result with candidate SHA, workflow/run URL, command, runner/target, timestamps, exit code, evidence digest, and assessor.
- Separate `implemented`, `unit-tested`, `integration-tested`, `live-verified`, `certified`, `unsupported` and `blocked` states.
- Reject a certification if a mandatory test is skipped, missing, marked expected-failure, has zero relevant assertions, uses fake transports for a live gate, or is bound to a different SHA.
- Supersede old reports with a clearly labelled historical notice; never silently rewrite historical results.
**Acceptance:** One canonical certification manifest reports no mandatory gate as missing and is bound to the final release SHA.

### F-002 — Air Roofers AI integration is declared; source policy remediated, live activation remains open (P0)
**Evidence:** The model catalog includes provider `airroofers-ai`, endpoint configuration `UGONDU_AIRROOFERS_AI_BASE_URL`, credential reference `env://UGONDU_AIRROOFERS_AI_KEY`, and a 30-second timeout. The three source-level policy gaps previously identified in `server/engine-core/src/ai/airroofers-provider.ts` (literal hostname allowlist in `getBaseUrl()`, fallback capability object on empty catalog in `capabilities()`, and contract route/transport provenance in `healthCheck()`) have been remediated in source and verified via unit, contract, and adversarial tests. However, live authenticated network E2E against `https://ai.airroofers.eu` remains open.
**Risk:** Without live network E2E evidence on the candidate SHA, production reachability and live credential exchange with `ai.airroofers.eu` remain unverified.
**Remediation:**
1. Read the authoritative API contract from the provisioned `ai.airroofers.eu` service and version it as an explicit client contract. Do not invent endpoint paths, token claims, request/response fields or model identifiers.
2. Resolve base URL and credentials only from runtime configuration/secret broker. Fail closed if required configuration is absent, malformed, or disallowed.
3. Implement/verify the Air Roofers adapter against the actual contract: authentication, request schema, response schema, timeout/deadline, cancellation, retry budget, rate limits, correlation ID, error taxonomy, telemetry redaction and provider health.
4. Route AI features through the central `InferenceGateway` and `ModelCatalog`; no product feature may call a provider SDK directly or hardcode a vendor URL/model ID.
5. Provide admin/actor-controlled provider and model enablement using signed policy/config. Provider status must be `configured`, `credential-valid`, `health-verified`, `live-e2e-verified` and `enabled` only when all required preconditions pass.
6. Keep deployment execution deterministic and policy-governed. Model output is advisory/untrusted input; it must never bypass authorization, policy gates, plan review, approval, or execution invariants.
7. Add a live E2E workflow using short-lived CI credentials and an approved non-destructive test request. Do not print secrets, prompts containing sensitive data, or full authorization headers in logs.
8. Test timeout, 401/403, 404/429/5xx, invalid JSON/schema, expired credential, disallowed region/data classification, provider outage, cancellation and safe fallback. Assert that fallback does not silently turn a failed live test into PASS.

**Source-level policy items in `server/engine-core/src/ai/airroofers-provider.ts` (remediated in source; verify in live E2E):**
- `getBaseUrl()` now validates endpoints through the catalog-governed endpoint policy and egress guard rather than a hardcoded literal hostname allowlist, rejecting IP literals, localhost/private/link-local destinations, and disallowed hosts.
- `capabilities()` no longer returns a literal fallback capability object when no enabled catalog models exist; it throws a typed `MODEL_CATALOG_EMPTY` error (`503`) so an empty catalog never implies support.
- `healthCheck()` resolves contract routes from catalog metadata and distinguishes transport/reachability from authenticated live inference (`liveAuthVerified` / `transportMode`).
- Live certification must instantiate the default production transport (`native-fetch`) and assert that the test did not replace it with a fixture transport.

**Code-level policy pattern (now enforced in `airroofers-provider.ts`):**
```ts
const endpoint = this.endpointPolicy.resolveAndValidate({
  providerId: this.providerId,
  configuredBaseUrl: rawUrl,
  purpose: "inference",
});
const models = this.catalog.listModels(true)
  .filter(m => m.providerId === this.providerId && m.status === "enabled");
if (models.length === 0) {
  throw new AiGatewayError("MODEL_CATALOG_EMPTY" as any, __t("ai.error.model_catalog_empty"), 503, { providerId: this.providerId });
}
return models.map(model => model.capabilities);
```

**Live E2E acceptance (must be proven):**
- With no credentials, the request fails closed with a stable error and zero external request.
- With valid CI identity, the test reaches the configured Air Roofers endpoint, authenticates, sends a non-sensitive canary request and validates a schema-conforming response.
- The response records provider ID, model alias, request/correlation ID, latency and outcome without logging secrets or confidential payload.
- Disabling the provider blocks egress before request transmission.
- Provider outage returns a declared degraded/error outcome; it does not fabricate model output.
- A second provider can be activated by configuration/catalog change without source edits, and policy-equivalent fallback behavior is tested.
- The test report states the actual provider/model tested and its configured environment/region. Never assert that every catalog entry is live-tested because one provider passed.

### F-003 — Zero-hardcoding invariant needs whole-system enforcement (P0)
**Remediation scope:** Source, scripts, tests, CI, docs/examples, CLI prompts, installer, deployment templates, provider adapters and runtime defaults.
**Prohibit:** hardcoded production URLs, region/account identifiers, hostnames, local filesystem paths, credentials, model IDs, resource names, supported-target lists duplicated across code, locale strings, feature defaults that bypass policy, and invented provider outputs. Test fixtures may use explicit synthetic values only when clearly isolated and never treated as production defaults.
**Required behavior:** configuration is typed, validated and provenance-tracked; missing required values produce an actionable prompt or fail-closed error. For AWS region, accept a region ID or a human-friendly region/country/city selection resolved via a maintained registry; never silently assume a region. Multiple regions must be explicitly selected and independently qualified.

**Example configuration contract (inject at runtime from secret store; never commit populated values):**
```dotenv
UGONDU_AIRROOFERS_AI_BASE_URL=
UGONDU_AIRROOFERS_AI_KEY=
UGONDU_AI_CONNECT_TIMEOUT_MS=
UGONDU_AI_REQUEST_TIMEOUT_MS=
UGONDU_AI_POLICY_REGISTRY=
```

**Example fail-closed validator:**
```ts
type AiRuntimeConfig = { baseUrl: URL; apiKey: string; requestTimeoutMs: number };
export function loadAiRuntimeConfig(env: NodeJS.ProcessEnv): AiRuntimeConfig {
  const rawUrl = env.UGONDU_AIRROOFERS_AI_BASE_URL?.trim();
  const apiKey = env.UGONDU_AIRROOFERS_AI_KEY?.trim();
  const rawTimeout = env.UGONDU_AI_REQUEST_TIMEOUT_MS?.trim();
  if (!rawUrl || !apiKey || !rawTimeout) throw new Error("AI_CONFIGURATION_INCOMPLETE");
  let baseUrl: URL;
  try { baseUrl = new URL(rawUrl); } catch { throw new Error("AI_BASE_URL_INVALID"); }
  if (baseUrl.protocol !== "https:") throw new Error("AI_BASE_URL_MUST_USE_HTTPS");
  const requestTimeoutMs = Number(rawTimeout);
  if (!Number.isSafeInteger(requestTimeoutMs) || requestTimeoutMs < 1 || requestTimeoutMs > 120_000) {
    throw new Error("AI_REQUEST_TIMEOUT_INVALID");
  }
  return { baseUrl, apiKey, requestTimeoutMs };
}
```
Avoid echoing secret values in validation errors.

### F-004 — Universal platform certification matrix is incomplete (P0)
Universal means **all explicitly declared supported combinations**, not every conceivable platform. Maintain a versioned target registry (`config/qualification/target-matrix.json`) that includes OS/distribution/version, CPU architecture, shell/runtime prerequisites, host type, IDE integration, interaction mode, provider adapter, test environment and support lifecycle.
Minimum target dimensions to assess:
- OS: Windows (supported versions and PowerShell/CMD), macOS Intel and Apple Silicon, Linux glibc distributions and musl/Alpine where claimed.
- Architecture: amd64/x86_64 and arm64/aarch64 wherever claimed.
- Interaction: CLI terminal, non-AI-assisted user, AI-assisted user, UI/control plane where applicable, CI/non-interactive automation.
- IDE: VS Code, JetBrains family, Visual Studio and other IDEs only where an integration is actually declared. A generic CLI working in a terminal does not certify an IDE extension.
- Hosts/providers: AWS, Kubernetes, Linux/systemd on an existing host, cPanel/DirectAdmin and any other declared provider. Each resource-kind/operation pair must be explicitly supported or explicitly rejected.
- Install/distribution: direct binary, package manager, container and OS-native packages only where shipped.
**Required test layers per target:** compile/package; native startup/version/help; install/uninstall; config and secret loading; path/permissions; TLS/proxy; signal/cancellation; terminal encoding; auth/device flow; dry-run/plan; one safe real lifecycle operation; resume/rollback; upgrade/downgrade; uninstall cleanup; evidence generation.
**Rules:**
- Build-on-host and execute-on-target for native qualification. Cross-compilation alone is not native certification.
- Each matrix row must link to a successful run executed on the target, exact artifact digest, runner image/version and test report.
- A target with no available runner remains 🟠 PARTIAL/UNVERIFIED, never green.
- Unsupported capabilities must return a structured `UNSUPPORTED_CAPABILITY` before mutation. Never silently map an unsupported resource to a different resource kind.
- No blanket “all platforms supported” claim from a five-row Go build matrix.

### F-005 — Provider adapters and operations need physical, non-mocked lifecycle evidence (P0)
Historical evidence specifically flagged DirectAdmin adapter methods returning synthetic “running/healthy” status, lack of a physical SSH client, DEISE repair modeled without actual SSH repair, and incomplete source/destination transaction wiring. Re-check each in current HEAD and record one of:
- `implemented`: production handler exists but not yet adequately tested;
- `unit-tested`: meaningful unit contract tests pass;
- `integration-tested`: adapter tested against a real local/container service or official sandbox;
- `live-verified`: actual authorized environment operation succeeded and postconditions were read back;
- `certified`: all required security, lifecycle, rollback, and evidence gates pass;
- `unsupported`: deliberately unavailable, with fail-closed preflight behavior.
Never equate method existence with support. Never return fabricated resource state. Use actual provider APIs/SSH with host-key verification, bounded command execution, least-privilege identity, structured exit status and postcondition reads. If a provider is not configured, report `NOT_CONFIGURED`, not healthy.

### F-006 — AWS physical certification report contains invalidating caveats (P0)
The historical 2026-10-05 `COR_PHYSICAL_CERTIFICATION_REPORT.md` records a failed `iam:SimulatePrincipalPolicy` preflight, an implicit waiter with a fake delay, and simulated drift; it is now marked `HISTORICAL RECORD — SUPERSEDED`. While COR Certification run [39794575804](https://github.com/Chicitadel/ugondu/actions/runs/39794575804) passed `AWS Physical Qualification Gate` (job `119887724433`) on `fed1d52c10201e53c4059d917562ff4858f5721e`, any final release sign-off must preserve these strict physical rules:
1. Fix preflight permission or use a documented, approved alternative that checks the exact permissions without overstating its assurance.
2. Use AWS SDK waiters or bounded polling on actual API state; no fixed sleep as proof of readiness.
3. Create uniquely tagged ephemeral resources in an explicitly actor-selected region.
4. Read back every resource from the provider API and assert actual state and relationships.
5. Induce drift only in an isolated test resource, observe it through live discovery, repair through the real adapter, and read back the repaired state.
6. Always run teardown in `finally`; then independently enumerate tagged resources and assert zero residuals.
7. Capture sanitized API outcomes, resource IDs, region, timestamps, run ID and evidence digests. Never publish credentials/account secrets.
8. Make cleanup failures fail the gate and open a remediation incident.

### F-007 — Mock/stub/scaffold/partial implementation controls must validate semantics (P0)
The adversarial anti-stub tests are valuable but must be paired with comprehensive semantic controls:
- AST/static scans for `TODO`, `FIXME`, `throw new Error("not implemented")`, placeholder returns, fake IDs, fixed success values, sleeps used as readiness, no-op adapters, empty catch blocks, disabled assertions and fake network transports outside test-only boundaries.
- A maintained allowlist for intentional test doubles, fixture directories and generated code; each exception has an owner, reason, expiry and test scope.
- Mutation testing: introduce representative failures and verify tests fail. Target zero surviving mutants for authorization, policy gates, provider state, rollback, evidence verification and AI routing.
- Contract tests that assert outputs derive from provider responses, not constants.
- Runtime integration tests with a local HTTP server or official provider sandbox; separate them from live external E2E.
- No “success” result when a command was skipped, an adapter is absent, a response was fabricated, a resource was not queried, or a rollback was merely planned.
- Every user-visible feature mapped to an implementation path and a test. Remove dead menu actions, empty handlers, unreachable commands and placeholder UI.

### F-008 — Test/evidence integrity needs exact-SHA binding (P0)
Each test result must include: `candidate_sha`, `workflow_run_id`, `target_id`, `test_suite_id`, `started_at`, `completed_at`, `exit_code`, `assertion_count`, `skipped_count`, `evidence_uri`, `sha256`, `toolchain`, `environment_class`, `provider_mode` (mock/sandbox/live), `assessor`, and `result`.
A result is invalid if the SHA differs, a required job was skipped, the report is stale, the artifact is missing, its signature is invalid, the report cannot be reproduced, or its test mode is mislabelled. Do not rely on workflow names or a summary badge alone.

### F-009 — Historical documentation supersession (P1 — Remediated in repository docs)
The repository contains historical reports (`COR_PHYSICAL_CERTIFICATION_REPORT.md` from 2026-10-05 and `UGONDU_EVIDENCE_RECONCILIATION_AUDIT.md` from 2026-10-04) that must remain immutable historical records while current status is unambiguous.
**Remediation status:** Explicit `> [!WARNING] HISTORICAL RECORD — SUPERSEDED` banners have been prepended to both files pointing to `docs/audits/COR_CERTIFICATION_PROGRESS_2026-10-22.md` and this master plan. No old status may be treated as current sign-off.

### F-010 — Branch protection and independent approval (P1 — CODEOWNERS created; GitHub settings open)
`.github/CODEOWNERS` has been created to require `@Chicitadel` review across `/.governance/`, `/scripts/governance/`, `/config/model-catalog.json`, `/config/qualification/`, `/policy-packs/`, `/server/engine-core/src/ai/`, `/server/engine-core/src/targets/`, `/server/capabilities/src/continuity/`, `/.github/workflows/`, and `/docs/audits/`. Verify repository rules/branch protection in GitHub settings and require:
- required CI and governance checks;
- up-to-date branch and no force push/deletion;
- required independent review for certification changes;
- CODEOWNERS enforcement for `.governance/`, `scripts/governance/`, `config/model-catalog.json`, provider adapters and release workflows;
- signed release tags/attestations where supported;
- restricted bypass permissions with audit trail.
Do not claim GitHub branch protection rules are enabled until the repository administrative settings are inspected and verified.

## 4. UAIGOS governance invariants

Treat the following as release-blocking invariants:
1. **Zero hardcoding:** environment-specific values resolve from validated config/registries/secret managers; no silent production defaults.
2. **Zero mock data in production paths:** synthetic fixtures are confined to tests and cannot be selected as a runtime provider.
3. **Zero stubbing/scaffolding:** no placeholder handler, empty implementation, fake-success return, or unfinished UI action may be included in a certified capability.
4. **No partial implementation marked complete:** capability status is evidence-derived; incomplete operation sets cannot certify a provider.
5. **Fail-closed security:** missing identity, credential, policy, region, provider support, signature, or evidence causes a safe refusal before mutation/egress.
6. **Deterministic execution:** AI may propose; deterministic policy and execution engines authorize and execute.
7. **Complete localization:** user-visible strings, errors, CLI help, UI labels and documentation-generated prompts use locale keys; all supported locales pass parity and runtime rendering checks.
8. **No silent degradation:** fallback is explicit, policy-equivalent, observable and reported; it cannot manufacture a successful outcome.
9. **Evidence provenance:** all certification artifacts are content-addressed, signed/verified as required, target-SHA-bound and retained.
10. **Reproducibility:** clean checkout, locked dependencies, deterministic scripts where possible, pinned toolchain/actions, and recorded environment.
11. **No secret leakage:** redact credentials, authorization headers, private prompts and sensitive provider payloads from logs and evidence.
12. **Universal means truthful:** each platform/host/IDE/OS combination is individually certified or explicitly marked partial/unsupported.

## 5. Ordered implementation plan

### Phase 0 — Freeze and baseline (P0)
1. Record branch name, candidate SHA, working-tree state and remote refs before changes.
2. Create a baseline manifest with the current CI run and every reported local test.
3. Inventory current code and test paths for AI, provider adapters, URRE, DEISE, repository/source/destination flows, distribution, localization, UI and CLI.
4. Reconcile existing docs into current, historical, superseded and unverified classifications.
5. Prohibit release/tagging while any P0 gate remains open.
**Exit:** reproducible baseline exists; no undocumented changes; status is HOLD.

### Phase 1 — Capability inventory and truthful registry (P0)
1. Enumerate every command, menu action, API endpoint, UI action, provider, resource kind, lifecycle operation, OS/architecture, host and IDE integration.
2. Map each capability to implementation entry point, authorization/policy, runtime dependencies, test IDs, evidence path and support state.
3. Compare UI/CLI/API advertised functionality to actual executable handlers; remove or disable unreachable/placeholder actions.
4. Add preflight rejection for unsupported combinations before any side effect.
5. Generate a certification matrix from the registry rather than maintaining hand-edited status tables.
**Exit:** 100% of advertised capabilities mapped; zero orphaned UI actions; zero unsupported operation silently accepted.

### Phase 2 — Zero-hardcoding and anti-stub enforcement (P0)
1. Extend `scripts/governance/validate-repository.mjs` with semantic checks and documented allowlist.
2. Scan source and scripts for hardcoded endpoints, account IDs, regions, absolute paths, provider/model IDs, fake resource IDs, fake success and no-op handlers.
3. Scan all locale keys and ensure dynamic locale loading and parity across all 12 languages.
4. Add mutation tests proving the governance gates fail when a stub, hardcoded endpoint or bypass is introduced.
5. Validate production bundles exclude test fixtures and mock adapters.
6. Make every governance failure fatal in CI and release verification.
**Exit:** all scans pass; allowlist exceptions are reviewed/expiring; representative mutation tests are killed.

### Phase 3 — Activate ai.airroofers.eu end to end (P0)
1. Inspect and pin the real central API contract and supported authentication method.
2. Wire the existing Air Roofers adapter to validated configuration and the secret broker.
3. Ensure model catalog and registry are the single source of provider/model capabilities.
4. Add signed policy/config for provider enablement and actor-visible health states.
5. Route CLI/UI/API AI use through the shared gateway.
6. Add live E2E with ephemeral credentials and non-sensitive canary request.
7. Add failure-path tests, egress-policy tests, redaction checks, quota/concurrency checks and fallback tests.
8. Prove a new model can be enabled via catalog/configuration without source-code changes when it conforms to the central contract.
**Exit:** live test passes on candidate SHA; missing credentials fail closed; model activation is policy-controlled; evidence identifies the real provider/model tested.

### Phase 4 — Physical provider and lifecycle certification (P0)
1. Re-audit every adapter against current source; re-check historical DirectAdmin, SSH, DEISE and transaction-wiring findings.
2. For each claimed provider, test discovery, auth, metadata, create/provision, wait, readback, update, drift detection, repair, rollback, resume, idempotency and cleanup where supported.
3. Run safe lifecycle tests in isolated disposable accounts/sandboxes.
4. Ensure each operation has timeout, retry bounds, cancellation and structured errors.
5. For each unsupported resource/operation, assert fail-closed preflight and zero mutation.
6. Rebuild the AWS physical report with real waiters, live drift and zero-residual cleanup.
**Exit:** all declared operations are either live-certified or explicitly unsupported/partial; no provider is green on unit tests alone.

### Phase 5 — Native platform/OS/IDE/host matrix (P0)
1. Generate matrix rows from the target registry.
2. Add native runners for every declared OS/architecture and supported version; run target binaries on target hosts.
3. Test install/uninstall, auth, config, filesystem permissions, TLS/proxy, terminal encoding, cancellation, resume, rollback and upgrade.
4. Test IDE integration only where an actual integration exists; verify commands, auth, cancellation and error parity with terminal mode.
5. Test hosts independently; for cPanel/DirectAdmin/Linux, validate actual API/SSH capability and permissions, not only compile-time adapters.
6. Verify no-AI-assisted operation retains full supported deterministic functionality; AI assistance must remain optional where not a product requirement.
7. Publish per-target artifacts and reports; mark unavailable runners PARTIAL, never PASS.
**Exit:** every declared target has successful target-bound evidence, or support is explicitly narrowed and documented.

### Phase 6 — E2E, resilience and regression (P0)
1. Clean-checkout install with lockfile and pinned toolchains.
2. Run all workspace build/lint/typecheck/unit/contract/integration/E2E/security/compatibility/localization/governance tests.
3. Exercise successful deploy, failed deploy, interruption, restart/resume, rollback, drift repair and cleanup with real test resources.
4. Run adversarial cases: expired credentials, revoked permissions, invalid signatures, stale evidence, policy mismatch, network loss, rate limits, duplicate requests and concurrent mutations.
5. Run mutation testing for critical policy and lifecycle logic; no surviving critical mutants.
6. Validate no secret or personal data leakage in logs, screenshots, reports or artifacts.
7. Verify test counts and assertions; missing tests, zero assertions, skipped required tests or swallowed errors fail the release.
**Exit:** all required gates pass on the exact candidate SHA and all critical mutation tests are killed.

### Phase 7 — Evidence, provenance and release certification (P0/P1)
1. Produce a machine-readable certification manifest and human-readable dashboard.
2. Include target IDs, exact SHA, workflow/run links, evidence digests, signatures, test modes and assessor.
3. Verify SBOM, artifact checksums, signatures and provenance for actual produced artifacts.
4. Verify release evidence is externally pinned/verified and not just regenerated to agree with the source.
5. Enable branch protections and independent governance/security review.
6. Generate final COR report and sign-off only after all required rows are green.
7. Publish a release candidate; perform install/upgrade/rollback rehearsal from published artifacts before GA.
**Exit:** reproducible, signed, exact-SHA-bound evidence bundle; independent approval; no P0/P1 open.

## 6. Required test commands

Run from a clean checkout on the candidate branch, preserving stdout/stderr and exit codes. If any script name or command has changed, update this runbook to the actual repository script rather than silently omitting the gate.

```powershell
# 1. Identity and cleanliness
git status --short
git rev-parse HEAD
git branch --show-current
git fetch origin --prune
# 2. Clean dependency install and all declared quality gates
npm ci
npm run build
npm run lint
npm run typecheck
npm test
npm run test:contract
npm run test:integration
npm run test:e2e
npm run test:security
npm run test:compatibility
npm run governance:validate
# 3. Explicit focused checks from the current checkpoint
node scripts/validate-locales.js
node --test tests/qualification/localization-negative.test.js
npm --prefix server/engine-core run build
npm --prefix server/engine-core test
node --test tests/ai-inference-gateway.test.js
node --test tests/qualification/adversarial-anti-stub.test.js
node scripts/governance/validate-repository.mjs
# 4. CLI native tests must be run on each target, not only cross-compiled
cd client
go vet ./...
go test -count=1 ./...
cd ..
# 5. Final identity after tests
git status --short
git rev-parse HEAD
```

These commands are a complete gate sequence based on scripts present in `package.json`; some tests may require environment-specific services or credentials. A missing prerequisite must be recorded as BLOCKED with an owner, not skipped and counted as PASS. Do not run destructive cloud tests until the actor has selected the target region/account and approved the cost/resource boundary.

## 7. CI gate requirements

The CI workflow must fail if any mandatory job is skipped or lacks evidence. Recommended logical job structure:

```yaml
jobs:
  source-governance:
    # Zero-hardcoding, anti-stub, localization parity, registry integrity.
    # Must run before build and be required for merge.
  build-and-unit:
    # Locked install, all workspaces, lint, typecheck, unit and contract tests.
  integration:
    # Real local/container service dependencies; never label mock transport as live E2E.
  ai-live-e2e:
    # Protected environment, short-lived secret, non-sensitive canary.
    # Explicitly report provider ID/model alias and environment class.
  native-target-matrix:
    # One row per declared OS/architecture/host/interaction target.
    # Target-native execution is mandatory for green certification.
  provider-physical-e2e:
    # Explicit opt-in, isolated disposable resources, bounded cost, guaranteed cleanup.
  evidence-verify:
    # Exact SHA, required result completeness, digests, signatures, provenance.
  certification:
    needs:
      - source-governance
      - build-and-unit
      - integration
      - ai-live-e2e
      - native-target-matrix
      - provider-physical-e2e
      - evidence-verify
    # Generate PASS only if every mandatory dependency succeeded and evidence is complete.
```

Preserve existing action pinning and repository-specific runner/secret configuration. Ensure optional or manually gated destructive jobs have an explicit release policy and cannot be silently treated as passed.

## 8. Certification dashboard schema

Maintain the canonical dashboard in the repository and generate it from evidence rather than manually editing statuses.

| ID | Domain | Required proof | Status now | Gate to turn green |
|---|---|---|---|---|
| COR-001 | Git identity | Exact SHA, clean tree, remote synchronization | 🟢 Checkpoint verified | Recheck final candidate SHA |
| COR-002 | Build/test | Clean all-workspace gates | 🟢 CI + local PASS | Re-run on final candidate SHA with logs |
| COR-003 | Localization | 12-locale runtime parity + negative tests | 🟢 Parity + negative PASS | Add full UI/CLI runtime rendering evidence on final SHA |
| COR-004 | Anti-stub | Static + mutation + runtime semantics | 🟢 Adversarial + repo PASS | Validate full mutation suite on final candidate SHA |
| COR-005 | Zero hardcoding | Whole-repository scan + mutation tests | 🟠 Source remediated | Prove zero forbidden literals across all runtime paths on final SHA |
| COR-006 | AI central gateway | Live authenticated ai.airroofers.eu request | 🟠 Source/unit PASS / 🔴 live open | Real authenticated network E2E on candidate SHA |
| COR-007 | Multi-model | At least two configured providers plus controlled switch/fallback | 🟠 Unit/contract PASS / 🔴 live open | Real contract/live E2E evidence for each enabled provider |
| COR-008 | AWS | Preflight, create, wait, readback, drift, repair, rollback, zero residuals | 🟠 CI gate `119887724433` PASS | Archive fresh candidate-SHA physical report; old 2026-10-05 report superseded |
| COR-009 | Provider adapters | Per-operation real adapter evidence | 🟠 Adapter + SSH tests PASS | Live/sandbox verification for every claimed provider operation |
| COR-010 | URRE | Durable state, crash/restart, resume, idempotency, rollback | 🟠 Durable + fault tests PASS | Live cloud/host fault-injected lifecycle E2E |
| COR-011 | OS/architecture | Native run for every declared target | 🟠 PARTIAL (3/5 native smoke) | Native behavioral execution on all declared OS/arch targets |
| COR-012 | IDE integrations | Real integration commands/auth/cancel/error parity | 🟠 Target registry enforced | Certify each declared IDE or maintain explicit `UNSUPPORTED_CAPABILITY` |
| COR-013 | Hosts/platforms | Per-host/resource-kind capability proof | 🟠 Registry + preflight PASS | Live sandbox proof or explicit unsupported status |
| COR-014 | UI/CLI/API parity | Every advertised action mapped to handler and tests | 🟠 Inventory + contract PASS | Full end-to-end surface verification on final SHA |
| COR-015 | Security | Secret scanning, authz, SSRF, signatures, redaction, least privilege | 🟠 Security + egress tests PASS | Fresh security suite and independent review on final SHA |
| COR-016 | Evidence/provenance | Exact-SHA manifest, artifact digests/signatures/SBOM | 🟠 COR gate `119901232439` PASS | Bind final candidate-SHA manifest, SBOM, signatures and external verification |
| COR-017 | Governance controls | Protected branch, required reviews/checks, CODEOWNERS | 🟠 CODEOWNERS created | Verify and enable GitHub branch protection rules and required reviews |
| COR-018 | COR sign-off | No P0/P1 blockers; complete evidence and independent approval | 🔴 HOLD | All mandatory rows green |

A dashboard row may only turn 🟢 when the evidence verifier confirms its acceptance criteria. “Not run”, “not configured”, “runner unavailable”, “skipped” and “historical only” must remain distinct states and must never be coerced to PASS.

## 9. Evidence directory and naming

Use a consistent evidence tree, with no credentials or sensitive user payloads:

```text
evidence/
  cor/
    <candidate-sha>/
      manifest.json
      summary.md
      source-governance/
      build-and-unit/
      localization/
      ai-live-e2e/
      providers/
        aws/
        kubernetes/
        linux-systemd/
        cpanel/
        directadmin/
      platforms/
        windows-amd64/
        macos-amd64/
        macos-arm64/
        linux-amd64/
        linux-arm64/
      ide/
      resilience/
      security/
      distribution/
      provenance/
      cleanup/
```

Only create folders when the corresponding evidence is produced; an empty directory is not proof. Each report should identify the environment class (unit, local integration, provider sandbox, live test), tool versions, start/end time, exit code, exact SHA and digest. Use synthetic IDs in documentation examples. Do not commit secrets or raw production logs.

## 10. Acceptance and sign-off criteria

COR universal readiness may be declared only when all are true:
- All P0 and P1 findings are closed with linked evidence and independent review.
- Every advertised capability has a real implementation, an explicit support state and tests that exercise the behavior.
- Zero-hardcoding and anti-stub checks are enforced and mutation-tested.
- All 12 locales pass parity and runtime behavior checks.
- Air Roofers AI is authenticated and live-tested through the actual central API; model/provider switching is policy-governed and no source edits are needed for a conforming catalog addition.
- Every claimed OS/architecture/IDE/host combination has target-bound evidence; unsupported combinations fail closed.
- Provider lifecycle, rollback, resume, drift repair and cleanup are physically verified for every claimed operation.
- No required CI job is skipped; all evidence is fresh and bound to the exact candidate SHA.
- Release artifacts, SBOM, signatures and provenance are verified.
- Repository protection and independent approval are confirmed.
- Final dashboard and report agree, and no historical report is presented as current sign-off.
