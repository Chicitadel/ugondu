<!--
Project: Ugondu Universal Delivery Operating System
Document: COR / UAIGOS Repository Re-audit, Findings and Remediation Plan
Authority: Ujomor Systems Engineering & Governance Authority
Organization: Air Roofers SASU
Classification: ENTERPRISE | INTERNAL | REGULATORY QUALIFICATION
Version: 1.0.0
Audit date: 2026-10-24
Target branch: phase4/production-hardening
-->

# Ugondu COR / UAIGOS Re-audit — Findings and Full Remediation Plan

**Audit date:** 2026-10-24  
**Repository:** [Chicitadel/ugondu](https://github.com/Chicitadel/ugondu)  
**Branch reviewed:** `phase4/production-hardening`  
**Authority:** Ujomor Systems Engineering & Governance Authority  
**Organization:** Air Roofers SASU  
**Governance baseline:** UAIGOS 3.0.0 and the repository's COR qualification gates  
**Overall verdict:** **QUALIFIED WITH BOUNDED TARGET SUPPORT — NOT UNIVERSAL CERTIFICATION**

## 1. Executive decision

The repository contains substantial implementation and governance work: a multi-workspace TypeScript/Node platform, Go thin client, centralized AI inference gateway, provider adapter registry, model catalog, credential broker, routing policy, target matrices, anti-stub governance validator, platform evidence generator, and CI/COR workflows. The supplied sign-off reports passing workspace, capability, anti-stub, localization, evidence-freshness, AWS-qualification and live AI canary gates.

That evidence is meaningful but does **not** justify declaring every OS, architecture, IDE, host, cloud, or AI provider green. The target matrix explicitly records Linux/ARM64 and macOS/AMD64 as cross-compiled only, VS Code as experimental, and JetBrains/Cursor/Windsurf/Neovim as unsupported. Cloud GCP and Azure are described as unsupported in the supplied sign-off. Those are intentional fail-closed states, not universal support.

The current audit therefore separates:
- **Implemented:** code or configuration exists.
- **Tested:** automated tests ran for the exact code and target.
- **Qualified:** reproducible evidence proves the declared support level on the exact commit.
- **Supported/green:** qualification criteria for the specific operation and target are satisfied.
- **Not qualified:** no qualifying evidence, stale evidence, or a matrix claim that exceeds proof.

A green CI run is not equivalent to universal platform certification. This report does not claim to have executed the repository's test suite in a local checkout; it inspected repository files through GitHub and cross-checked the supplied COR sign-off. All numerical test results below that originate from the supplied sign-off are identified as reported evidence rather than independently rerun results.

## 2. Evidence inspected

The following repository artifacts were fetched on `phase4/production-hardening`:

- `README.md` — architecture, edition capabilities and provider-support language.
- `package.json` — workspaces and build/test/governance commands.
- `config/qualification/target-matrix.json` — OS/architecture, IDE and host qualification declarations.
- `config/qualification/platform-matrix.json` — target definitions, support claims, commands and expected artifacts.
- `scripts/release/platform-evidence.mjs` — evidence derivation, digest, runner identity and support-claim validation.
- `tests/qualification/target-matrix-fail-closed.test.js` — fail-closed behavior for unsupported IDE/provider targets.
- `server/engine-core/src/ai/inference-gateway.ts` — inference orchestration.
- `server/engine-core/src/ai/provider-registry.ts` — provider adapter registry.
- `server/engine-core/src/ai/model-catalog.ts` — model/provider catalog.
- `server/engine-core/src/ai/credential-broker.ts` — credential reference and secret-handling layer.
- `server/engine-core/src/ai/routing-policy.ts` — routing and tool policy.
- `tests/ai-inference-gateway.test.js` — AI gateway tests.
- `docs/security/evidence/live_ai_canary_receipt.json` — stored live AI canary receipt.
- `.github/workflows/ci.yml` and `.github/workflows/cor.yml` — build and COR pipelines.
- `scripts/governance/validate-repository.mjs` — repository governance checks.

The supplied executive sign-off additionally reports COR run `40039228059`, CI run `40039227998`, PR CI run `40039234478`, brand-integrity run `40039234420`, and live AI canary run `40039094607`. These reported run statuses should be verified again against GitHub and the current branch SHA before a final certificate is issued.

## 3. Certification overview

| ID | Boundary | Current assessment | Evidence / gap | Exit criterion |
|---|---|---|---|---|
| COR-01 | Workspace build/typecheck/tests | 🟡 Reported green; not rerun in this audit | Supplied sign-off reports 9 workspaces and 11 integration suites; reproduce on exact HEAD | Required build, lint, typecheck, unit and integration commands pass on the candidate SHA |
| COR-02 | Anti-stub/mock/scaffold | 🟡 Reported green; scope needs continuing enforcement | Sign-off reports 4,548 tracked files and 14/14 adversarial tests; current validator exists | Production paths have zero mocks/stubs/scaffolds; tests prove validator catches adversarial evasions |
| COR-03 | AI provider activation | 🟡 Architecture present; live proof is narrow | Gateway, catalog, credential broker and registry exist; receipt proves one model result only | Discovery, routing, inference, failure, quota, region and credential behavior proven against live API |
| COR-04 | AI catalog freshness / scalability | 🟡 Needs stronger contract evidence | Receipt reports 30 available models, but one receipt does not prove all models/providers or future-provider onboarding | Catalog is discovered/config-driven; unknown provider/model and stale catalog fail closed |
| COR-05 | OS/architecture universality | 🟡 Bounded | Windows/AMD64, Linux/AMD64 and macOS/ARM64 reported native; Linux/ARM64 and macOS/AMD64 cross-compiled only | Each advertised target has native runner evidence for build, install, run, update, rollback and recovery |
| COR-06 | IDE universality | 🔴 Not universal | VS Code experimental; JetBrains, Cursor, Windsurf, Neovim unsupported in target matrix | Real extension/protocol and end-to-end tests per IDE, or explicit supported-scope restriction |
| COR-07 | Hosting/cloud universality | 🔴 Not universal | AWS and selected shared-host providers are in the matrix; supplied sign-off says GCP/Azure fail closed | Provider-by-provider live conformance; each operation certified individually |
| COR-08 | Target matrix consistency | 🔴 Needs reconciliation | Target matrix and platform matrix use different support vocabulary/claims; platform entries include experimental claims and future review dates | One canonical schema; derived claims only; no contradictory support labels |
| COR-09 | Evidence freshness / SHA binding | 🔴 Reconciliation required | Stored AI receipt is bound to `562632a05e0ffdc2af27b04bba8bda91c973f808`; supplied sign-off calls `61ca9233` active HEAD and references a different canary SHA `2bfa9f2c`. Reported CI rows also mention `1f20f10c`. These identities are not self-consistent. | Re-run every required gate on one exact immutable candidate SHA and regenerate manifests/receipts from that SHA |
| COR-10 | Release docs discoverability | 🟡 Needs consolidation | The supplied sign-off names a root-level closure file and a checklist; those exact files were not found at the expected paths tried in this audit. This does not prove no equivalent exists elsewhere. | Canonical docs index links to committed report, checklist, evidence and release decision |
| COR-11 | Zero hardcoded operational data | 🟡 Partial / needs proof | Registry/config pattern exists, but visible routing policy includes in-code `DEFAULT_TOOL_SCHEMAS`; review every provider/model/region/IDE/host list and operational default | No hardcoded mutable inventory or environment-specific operational values; static code constants limited to invariants and validated schemas |
| COR-12 | E2E realism | 🟡 Needs end-to-end proof | Existing AI test file and E2E script exist; static inspection alone cannot establish all external paths are live | Dedicated live contract/E2E suites with mocks prohibited in E2E lane and explicit environment prerequisites |
| COR-13 | Localization | 🟡 Reported green | Sign-off reports 12 Ugondu locales with 242 keys each and 6 Platform Core dictionaries; not rerun here | Exact-HEAD parity, runtime locale discovery and RTL/UI smoke tests pass |
| COR-14 | AWS physical qualification | 🟡 Reported green | Sign-off reports AWS Physical Qualification Gate success; must bind to current candidate | Fresh run, signed evidence, exact region/account/resource scope and cleanup evidence |
| COR-15 | Publication gate | 🟡 Deliberately gated | Sign-off says release publishing is tag-gated and skipped by design | Do not call release published until tag-triggered publish and artifact verification succeed |

## 4. Material findings

### F-01 — Universal support claim exceeds current qualified scope

**Severity:** Critical for a claim of universality  
**Evidence:** `config/qualification/target-matrix.json` explicitly marks `linux/arm64` and `darwin/amd64` as `cross-compiled-only`; VS Code is `experimental`; JetBrains, Cursor, Windsurf and Neovim are `unsupported`. The supplied sign-off describes GCP and Azure as unsupported.  
**Impact:** A universal green badge would be misleading and could cause users to rely on unqualified combinations.  
**Remediation:** Keep each target amber/red until native evidence meets the same release criteria. Either implement and qualify each IDE/cloud provider, or narrow the product claim to the exact certified matrix. A product-wide “universal” badge may be green only when every target marked in-scope is qualified and all excluded targets are explicitly labelled unsupported in product UX and docs.

### F-02 — Evidence is not consistently bound to one candidate SHA

**Severity:** Critical release-integrity gap  
**Evidence:** The committed receipt `docs/security/evidence/live_ai_canary_receipt.json` has `gitSha=562632a05e0ffdc2af27b04bba8bda91c973f808`. The supplied sign-off identifies `61ca9233` as active release HEAD, references canary SHA `2bfa9f2c`, and lists CI rows on `1f20f10c`.  
**Impact:** Passing results from different commits cannot be combined into a single release certification without proving the intervening changes are evidence-only and that evidence freshness verification accepts the exact final tree.  
**Remediation:** Freeze a candidate SHA; run all gates on it; generate a new live canary receipt with the exact SHA; generate and verify the evidence manifest; require clean checkout and exact-SHA assertions; publish a single release bundle that records all run IDs and artifact digests. Any source change invalidates dependent evidence and forces the affected gates to rerun.

### F-03 — Target support declarations are split across two matrices

**Severity:** High  
**Evidence:** `target-matrix.json` uses `tested`, `unsupported` and `cross-compiled-only`; `platform-matrix.json` uses support claims such as `supported` and `experimental`, while the visible runtime definitions do not align consistently (for example, Windows/AMD64 is declared supported while multiple other runtime rows are experimental). Review dates such as `2027-04-20` are future-dated relative to this audit and must be justified as review deadlines rather than treated as evidence.  
**Impact:** Different consumers can present different status for the same target.  
**Remediation:** Establish a canonical target registry with schema validation. Keep product target inventory in one source and evidence in separate signed records. Derive status from evidence rather than trusting a declared claim. Generate both runtime enforcement and certification dashboard from the same validated registry.

### F-04 — Live AI receipt is useful but narrow and stale relative to claimed release HEAD

**Severity:** High  
**Evidence:** Receipt reports HTTP 200 for discovery and inference, model `sentinel-guard-v1`, 30 available models, 594 ms total latency, and verification `AUTHENTIC_LIVE_INFERENCE_QUALIFIED`; it is bound to the older SHA shown in F-02.  
**Impact:** It demonstrates one successful end-to-end sample at the recorded time, not complete activation of all models, provider switching, regional/data-policy enforcement, rate-limit recovery, streaming, tool calls, quota enforcement, or future-provider onboarding.  
**Remediation:** Keep the receipt as historical evidence, not the current release receipt. Add live tests for model discovery, model selection, inference, invalid model, invalid credentials, timeout, 429/rate limit, upstream 5xx, cancellation, streaming if supported, tool-call schema enforcement, quota, circuit-breaker recovery, region/data-classification denial, redaction and audit correlation. Record provider/model IDs without secrets, response digest, request/correlation ID, timestamps, latency and exact commit SHA.

### F-05 — AI gateway exists, but “all models fully activated” needs an explicit contract

**Severity:** High  
**Evidence:** Code files exist for `InferenceGateway`, `ProviderAdapterRegistry`, `ModelCatalog`, `CredentialBroker`, and `RoutingPolicyEngine`. The registry imports `AirRoofersAiProviderAdapter`. This is good architecture evidence, but file existence does not prove every catalog model is invocable.  
**Impact:** A model can appear in discovery but fail at inference due to credential mapping, unsupported modalities, region restrictions, request-schema mismatch or routing errors.  
**Remediation:** Treat `https://ai.airroofers.eu` as the canonical AI platform integration. Implement provider capability negotiation against the real API contract; dynamically discover models/capabilities; validate each discovered model with a safe contract probe; maintain explicit status per model and region; and expose “discovered”, “eligible”, “smoke-tested”, “qualified” separately. Do not claim all models activated until every model marked active has a successful real inference test or a documented, machine-enforced exclusion.

### F-06 — Hardcoding policy needs a narrower, testable definition

**Severity:** High  
**Evidence:** `scripts/governance/validate-repository.mjs` contains static policy regexes, which can be legitimate validators. `server/engine-core/src/ai/routing-policy.ts` contains `DEFAULT_TOOL_SCHEMAS`, which may be a legitimate security schema but is still a code-owned operational inventory. The target matrix is already configuration-backed.  
**Impact:** “Zero hardcoding” can be interpreted either too broadly (making deterministic security invariants impossible) or too narrowly (allowing provider/model/region lists to drift in code).  
**Remediation:** Adopt the definition in §5. Move mutable product/provider/model/region/host/IDE support inventory, endpoints, limits, feature flags and customer-facing strings to validated configuration/catalogs. Keep only protocol invariants, cryptographic primitives, fail-closed semantics and immutable schema guards in code. If tool schemas are product-extensible, load signed schemas from the capability registry; otherwise document them as security invariants and test that runtime overrides cannot weaken them.

### F-07 — E2E tests must prove real behavior, not just internal wiring

**Severity:** High  
**Evidence:** `package.json` exposes `test:e2e`, `test:integration`, `test:security`, `test:compatibility` and `test:aws`; the AI test imports built modules. The source inspection does not establish which test lanes use live upstreams versus local test servers.  
**Impact:** Mock-based tests can pass while external integration, auth, DNS/TLS, real credentials, cloud IAM or rollback behavior fails.  
**Remediation:** Separate unit, component, contract, integration, live-E2E and physical qualification lanes. Mocks are allowed only in unit/component tests and must never satisfy E2E qualification. Live lanes must assert the actual hostname, TLS, authentication, real discovery and inference, negative cases, audit trail, and cleanup. When secrets or external infrastructure are unavailable, mark the lane BLOCKED/NOT RUN—not PASS.

### F-08 — “Zero stubs/mocks/scaffolding” requires production-path and evasion coverage

**Severity:** High  
**Evidence:** Supplied sign-off reports `UG-COR-NO-STUBS-001`, 4,548 tracked files, and 14/14 adversarial tests. The repository has a governance validator and test-coverage validator.  
**Impact:** Static token scans can be evaded by aliases, generated files, dynamic imports, alternate spellings, test-only fixture leaks or fake success paths. A blanket prohibition on all test doubles would also make deterministic unit tests impractical.  
**Remediation:** Define zero stubs/mocks/scaffolds for production code, production configuration, release artifacts and E2E qualification. Allow isolated unit-test doubles only when explicitly scoped and impossible to import into production. Extend AST/data-flow checks, dependency-graph checks, build artifact scans and adversarial tests. Verify no fake success, silent fallback, empty handler, TODO implementation, fixture-backed production response or skipped mandatory gate remains.

### F-09 — Host/provider matrix status is operation-specific

**Severity:** High  
**Evidence:** The target matrix includes operations such as discover, preflight, provision, verify, repair, rollback and cleanup for selected providers. A provider-wide `tested` label does not by itself prove each operation against every plan, OS and credential type.  
**Impact:** A provider can be marked green while one destructive operation is untested or unsafe.  
**Remediation:** Track evidence per provider × operation × OS/architecture × edition × authentication mode. Run tests in isolated disposable environments, verify actual postconditions, test rollback after injected failure, and prove cleanup. Require explicit human approval for destructive external operations where governance requires it.

## 5. UAIGOS interpretation of zero hardcoding, zero mocks and fail-closed behavior

### 5.1 Zero hardcoding

**Prohibited in operational paths:**
- Provider/model inventories, model aliases, base URLs, region availability, credentials, tenant/product allowlists, host/IDE support claims and mutable feature flags.
- Environment-specific IDs, endpoints, timeouts, quotas and retry policy where these are intended to be governed configuration.
- User-visible strings outside the localization/token registry.
- Duplicated platform/provider catalogs that can drift.

**Permitted only when immutable and justified:**
- Protocol constants, security invariants, cryptographic algorithms and fixed error codes.
- Schema validation rules and defensive upper bounds that cannot be weakened by tenant configuration.
- Test assertions and deterministic test data in unit-test-only paths.

Every exception must have a code owner, policy rationale and test. A validator must not simply ban all string literals; it must detect the categories above and reject unapproved operational literals.

### 5.2 Zero mocks/stubs/scaffolding

- Production/runtime paths: **zero** mock adapters, fake success responses, placeholder handlers, empty implementations, stubbed integrations or sample data used as live data.
- E2E/live qualification: **zero mocks** for the path under qualification. Use real service endpoints and real, scoped credentials.
- Unit/component tests: test doubles are permitted only when isolated and labelled; production builds must not package or import them.
- Scaffolding: no TODO-only implementations, generated placeholder modules, hardcoded “green” results, skipped required tests, fabricated evidence or empty adapters in release paths.

### 5.3 Fail closed

Unknown provider/model/IDE/host/region/capability, missing credentials, invalid catalog signatures, stale evidence, policy mismatch, missing test artifact or ambiguous regional/data-policy context must produce a typed failure and a non-green status. No implicit fallback to an unapproved provider or region.

## 6. AI platform activation plan — ai.airroofers.eu

### Phase AI-0 — Freeze the contract

1. Capture the canonical API contract from the deployed AI platform: authentication method, discovery route, inference route, streaming contract if supported, error schema, rate-limit headers, request/response schema, model capability metadata, region/data classification, and versioning policy.
2. Store a sanitized OpenAPI/contract artifact under `docs/integrations/ai-airroofers/`; never commit secrets.
3. Add schema compatibility tests that compare the Ugondu adapter to the deployed contract.
4. Define supported capability types (text, structured output, tool calling, embeddings, image/audio/video only if the API actually supports them). Do not infer support from model names.

### Phase AI-1 — Dynamic discovery and catalog reconciliation

1. Discovery is performed against the real `ai.airroofers.eu` service, authenticated through the credential broker.
2. Parse the returned catalog using strict schema validation; reject malformed or duplicate IDs.
3. Persist provider/model metadata in the canonical catalog or cache with timestamp, version, digest and expiry.
4. Keep separate states: `discovered`, `eligible`, `smoke-tested`, `qualified`, `disabled`, `blocked`.
5. Verify every configured active model against returned discovery; reject unknown configured IDs and surface newly discovered models as unqualified until policy and smoke tests pass.
6. Never print or store raw credentials in logs or evidence.

### Phase AI-2 — Real inference and provider adapter

1. Route requests through `InferenceGateway` → `RoutingPolicyEngine` → `ProviderAdapterRegistry` → `AirRoofersAiProviderAdapter`.
2. Use explicit timeouts, bounded retries for retryable errors, circuit breakers, cancellation and correlation IDs.
3. Validate request payloads and model capabilities before making the upstream call.
4. Validate response schema and map upstream errors to typed `AiGatewayError` codes without leaking secrets or prompts.
5. Enforce quota, product/tenant authorization, regional eligibility and data-classification policy before network dispatch.
6. Record auditable metadata and response digest; do not log sensitive prompt/response bodies unless an explicit approved policy allows it.

### Phase AI-3 — Provider extensibility

1. Provider adapters implement a documented interface and declare capabilities through signed, validated manifests.
2. No provider-specific conditionals in the gateway core; add providers by registering an adapter and catalog metadata.
3. Add conformance tests reusable by every provider: discovery, health, inference, invalid credentials, unsupported model, timeout, rate limit, upstream failure, schema mismatch, cancellation, quota and region denial.
4. Prove future-provider onboarding by adding a test-only adapter in an isolated test and then a real approved provider through configuration/registry without changing gateway core.
5. Do not advertise a provider as active merely because the adapter class compiles.

### Phase AI-4 — Live qualification

The live lane must use the real `https://ai.airroofers.eu` endpoint and an authorized secret stored in GitHub Actions Secrets or the approved credential broker.

Required scenarios:
- discovery returns valid catalog and non-empty model identifiers;
- one safe inference for each model marked qualified (or a documented sampling policy if the certification scope is explicitly a representative subset);
- unknown model fails closed;
- invalid/missing credential fails closed;
- timeout/rate-limit/upstream failure maps to expected typed errors;
- region and data-classification policy is enforced;
- quota and circuit-breaker transitions are observable;
- audit correlation and secret redaction hold;
- receipt records exact SHA, endpoint, timestamp, model/provider IDs, status, latency, response digest, correlation ID and test-suite version.

**Do not use a stored receipt as proof for a different SHA.** Re-run after changes to gateway, adapter, catalog, credentials, routing policy, API contract or governance scripts.

## 7. Universal OS / IDE / host / cloud qualification plan

### 7.1 OS and architecture

Create a native execution job for every in-scope tuple. Cross-compilation alone must never be called native qualification.

Minimum OS matrix to assess:
- Windows AMD64 and ARM64, where supported by runtime/toolchain.
- Linux AMD64 and ARM64.
- macOS ARM64 and AMD64.
- Additional OS/architecture combinations only when declared in the supported-product scope.

For each tuple: clean install, build, typecheck, unit tests, integration tests, CLI launch, health/readiness, authenticated deploy to a disposable target, resume/recovery, rollback, upgrade, uninstall/cleanup, filesystem/permission checks, path/line-ending checks and artifact signing/verification. Native runner evidence must include runner identity and architecture derived from the executing process.

### 7.2 IDE integrations

For each IDE, specify integration type (CLI-only, extension, language-server/protocol, task runner, remote workspace), minimum version, authentication, workspace trust model, supported commands and failure behavior. Qualification must test installation, authentication, command execution, cancellation, diagnostics, workspace boundaries, remote session reconnect and upgrade/uninstall. An IDE is green only when its actual integration is exercised. Unsupported integrations remain red and must be visibly labelled.

### 7.3 Hosts and cloud providers

Qualify each provider operation separately:
- discovery;
- preflight;
- provision/deploy;
- verification;
- repair;
- rollback;
- cleanup;
- credential rotation/expiry;
- interrupted run and resume.

Use isolated, billable-resource-limited accounts/projects and least-privilege credentials. AWS, cPanel, DirectAdmin, SSH/VPS, Docker, GCP, Azure, Kubernetes, VMware, Proxmox and any additional host/provider must be independently classified based on repository scope and actual adapter existence. Do not infer a provider is supported because the README lists it or the adapter compiles.

### 7.4 Product-level universality rule

The universal badge is green only if:
1. Every target marked in-scope is qualified at the required tier.
2. Every required operation is tested on that target.
3. All evidence is fresh and bound to the release SHA.
4. No unresolved critical/high finding affects that claim.
5. Unsupported targets are not hidden or silently included in “all platforms”.
6. The dashboard is generated from canonical registry plus verified evidence, not manually edited.

If universal scope is not complete, the truthful product label is **Qualified with bounded target support**.

## 8. Exact command runbook

Run from a clean checkout of the candidate branch after dependency/toolchain prerequisites are met. Capture stdout, stderr, exit code, environment versions and SHA for every command. Do not record a pass if a prerequisite is missing.

```bash
set -euo pipefail

git status --short
git rev-parse HEAD
node --version
npm --version
go version

npm ci
npm run build
npm run lint
npm run typecheck
npm run test
npm run test:contract
npm run test:integration
npm run test:e2e
npm run test:security
npm run test:compatibility
npm run governance:validate
node scripts/validate-locales.js
node scripts/governance/validate-repository.mjs
node scripts/governance/validate-capability-registry.mjs
node scripts/governance/validate-test-coverage.mjs
node scripts/governance/verify-policy-pack-digests.mjs
node scripts/release/platform-evidence.mjs --help
```

The last command is illustrative only if the module exposes a CLI/help interface; confirm the actual exported CLI before adopting it. Do not add a command to CI until its supported arguments and exit behavior are verified. Use the repository's documented evidence-generation and freshness-verification entry points, which the supplied sign-off identifies as `scripts/governance/generate-evidence-manifest.mjs` and `scripts/governance/verify-evidence-freshness.mjs`.

For live AI qualification, the runbook must be based on the actual checked-in canary workflow/script. Do not invent a script path: the two candidate paths `scripts/release/live-ai-canary.mjs` and `tests/qualification/live-ai-canary.test.js` were not found at those exact paths during this audit. Locate the real workflow and script, then document the exact supported invocation and required secret names in the integration runbook.

## 9. CI release gate requirements

The final release candidate must satisfy all of the following on the **same SHA**:
1. Clean checkout and exact SHA assertion.
2. Locked dependency installation.
3. All workspace build, lint, typecheck and unit tests.
4. Contract, integration and live E2E suites.
5. Security regression and SSRF/authentication tests.
6. Anti-stub/mock/scaffolding governance validation.
7. Localization parity and runtime discovery checks.
8. Platform evidence generation and freshness verification.
9. AI live canary against `ai.airroofers.eu`.
10. Native target matrix qualification.
11. Provider operation conformance and rollback/cleanup.
12. AWS physical qualification where in scope.
13. Evidence manifest digest/signature verification.
14. Final certification decision and signed release bundle.

Mandatory checks must not be skipped or softened to green when infrastructure or credentials are unavailable. The release gate must fail on missing evidence, stale SHA, digest mismatch, unrecognized target, unsupported required operation, skipped tests, empty artifacts or a declared claim higher than derived evidence.

## 10. Certification exit criteria and sign-off

A finding is closed only when:
- a code/config change is committed;
- the relevant test is added or updated;
- the required test is executed on the target candidate;
- evidence is generated from the candidate SHA;
- evidence freshness and signatures verify;
- regression checks pass;
- the certification table is updated with evidence links and reviewer/date.

**Current sign-off:** the supplied report supports substantial progress and a bounded qualification verdict, but the audit found material evidence-binding and universality gaps that must be resolved before asserting full universal green status. This document does not revoke previously successful CI results; it narrows what those results prove and identifies the evidence required for a defensible final claim.

## 11. Primary repository references

- [Repository README](https://github.com/Chicitadel/ugondu/blob/phase4/production-hardening/README.md)
- [Package scripts](https://github.com/Chicitadel/ugondu/blob/phase4/production-hardening/package.json)
- [Target matrix](https://github.com/Chicitadel/ugondu/blob/phase4/production-hardening/config/qualification/target-matrix.json)
- [Platform matrix](https://github.com/Chicitadel/ugondu/blob/phase4/production-hardening/config/qualification/platform-matrix.json)
- [Platform evidence implementation](https://github.com/Chicitadel/ugondu/blob/phase4/production-hardening/scripts/release/platform-evidence.mjs)
- [Target matrix fail-closed tests](https://github.com/Chicitadel/ugondu/blob/phase4/production-hardening/tests/qualification/target-matrix-fail-closed.test.js)
- [AI inference gateway](https://github.com/Chicitadel/ugondu/blob/phase4/production-hardening/server/engine-core/src/ai/inference-gateway.ts)
- [AI provider registry](https://github.com/Chicitadel/ugondu/blob/phase4/production-hardening/server/engine-core/src/ai/provider-registry.ts)
- [AI model catalog](https://github.com/Chicitadel/ugondu/blob/phase4/production-hardening/server/engine-core/src/ai/model-catalog.ts)
- [AI credential broker](https://github.com/Chicitadel/ugondu/blob/phase4/production-hardening/server/engine-core/src/ai/credential-broker.ts)
- [AI routing policy](https://github.com/Chicitadel/ugondu/blob/phase4/production-hardening/server/engine-core/src/ai/routing-policy.ts)
- [AI gateway tests](https://github.com/Chicitadel/ugondu/blob/phase4/production-hardening/tests/ai-inference-gateway.test.js)
- [Stored live AI canary receipt](https://github.com/Chicitadel/ugondu/blob/phase4/production-hardening/docs/security/evidence/live_ai_canary_receipt.json)
- [CI workflow](https://github.com/Chicitadel/ugondu/blob/phase4/production-hardening/.github/workflows/ci.yml)
- [COR workflow](https://github.com/Chicitadel/ugondu/blob/phase4/production-hardening/.github/workflows/cor.yml)
- [Repository governance validator](https://github.com/Chicitadel/ugondu/blob/phase4/production-hardening/scripts/governance/validate-repository.mjs)
