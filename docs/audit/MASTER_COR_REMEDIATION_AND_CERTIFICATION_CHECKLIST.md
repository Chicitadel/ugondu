<!-- Project: Ugondu | Authority: Ujomor Systems Engineering & Governance Authority | Organization: Air Roofers SASU -->
# Master COR Remediation, Unification and Proof-of-Certification Checklist

**Audit date:** 2026-10-24  
**Branch:** `phase4/production-hardening`  
**Candidate SHA:** [`be23e0f6b7e1dae7acd9dc625ec5b4f08691d6fb`](https://github.com/Chicitadel/ugondu/commit/be23e0f6b7e1dae7acd9dc625ec5b4f08691d6fb)  
**Evidence-sealed descendant:** [`01681cabaeaa270aa36863570805ceb51e5c1062`](https://github.com/Chicitadel/ugondu/commit/01681cabaeaa270aa36863570805ceb51e5c1062)  
**CI/CD run:** [40100110885](https://github.com/Chicitadel/ugondu/actions/runs/40100110885)  
**COR run:** [40100110895](https://github.com/Chicitadel/ugondu/actions/runs/40100110895)  
**Qualification verdict:** **Configured CI/COR/AWS workflow gates passed for recorded scope. UNIVERSAL COR NOT GRANTED.**  
**Governance baseline:** UAIGOS 3.0.0  
**Purpose:** Single durable master checklist for all COR re-audit findings, remediation state, evidence links, acceptance criteria and regression controls.

**Key audit documentation & lineage cross-references:**
- **Head reconciliation:** [COR Repository-Head Reconciliation — 15:54 UTC](./COR_REPOSITORY_HEAD_RECONCILIATION_2026-10-24_1554Z.md)
- **Certification progress dashboard:** [COR Certification Progress Dashboard](./CERTIFICATION_PROGRESS_DASHBOARD.md)
- **Detailed evidence re-audit addendum:** [COR Re-audit Addendum — 16:43 UTC](./COR_REAUDIT_ADDENDUM_2026-10-24_1643Z.md)
- **Earlier addendum (superseded):** [13:10 UTC addendum](./COR_REAUDIT_ADDENDUM_2026-10-24_1310Z.md)
- **Baseline remediation plan:** [COR Release Re-audit and Full Remediation Plan](./COR_RELEASE_REAUDIT_AND_FULL_REMEDIATION_PLAN_2026-10-24.md)

> **Evidence Lineage Reconciled:** The evidence manifest binds strictly to candidate SHA `be23e0f6...` and sealed descendant `01681cab...`. CI/CD run 40100110885 passed across all workspace build/lint/type/test jobs, Go thin-clients for 5 targets, Docker validation, and integration tests. COR run 40100110895 passed COR Certification, AWS Physical Qualification, and COR Final Release Gate. Tier 1 bounded qualification is verified; universal certification remains withheld due to inactive AI fleet models, branch report lineage reconciliation, lifecycle test seam hardening, and pending multi-target E2E receipts.

---

## 1. Certification Legend

- 🟢 **PASS / CLOSED:** Fresh evidence exists for the exact candidate SHA and the defined scope.
- 🟡 **PARTIAL / REPORTED:** Implementation or a reported pass exists, but the evidence scope, SHA binding, or independent verification remains incomplete.
- 🔴 **GAP / BLOCKED:** Required capability is unsupported, a gate fails, or proof is missing.
- ⚪ **NOT ASSESSED:** No adequate evidence has been reviewed.

A source file existing, a target appearing in a matrix, a cross-compiled binary, or a successful unit test is not by itself a green certification.

---

## 2. Priority Findings Remediation Ledger

| ID | Domain | Remediation Recorded | Evidence | State |
|---|---|---|---|---|
| **F-08** | Transport Provenance Integrity | Eliminated caller-forged `source` strings; restricted activation to trusted provider transport (`airroofers-live-transport`) with authenticated `LiveInferenceReceipt` | [`model-lifecycle.ts`](../../server/engine-core/src/ai/model-lifecycle.ts), [`model-lifecycle-qualification.test.js`](../../tests/qualification/model-lifecycle-qualification.test.js) | 🟢 CLOSED; caller mocks & forged receipts fail closed (403) |
| **F-09** | Capability Probe Fallback Removal | Completely eliminated fallback `options.probeFn \|\| async () => ({ ok: true })`; mandatory genuine provider capability probe enforced; fails closed otherwise | [`qualify-ai-models.mjs`](../../scripts/qualification/qualify-ai-models.mjs), [`model-lifecycle-qualification.test.js`](../../tests/qualification/model-lifecycle-qualification.test.js) | 🟢 CLOSED; synthetic probe fallback eliminated; 503 on unverified probe |
| **F-10** | Evidence Candidate SHA Consistency | Unified candidate SHA across workflow input, manifest, canary, and freshness verifier; eliminates stale candidate baseline mismatches | [`verify-evidence-freshness.mjs`](../../scripts/governance/verify-evidence-freshness.mjs), [COR Run 40100110895](https://github.com/Chicitadel/ugondu/actions/runs/40100110895) | 🟢 CLOSED; run 40100110895 passed freshness; `ugondu-cor-evidence` uploaded |
| **F-11** | AI Scope Decoupling | Decoupled live canary smoke test (`sentinel-guard-v1`) from multi-model qualification report; `activeCount` strictly derived from verified active receipts | [`evidence-manifest.json`](../governance/evidence/evidence-manifest.json), [`ai_model_qualification_report.json`](../security/evidence/ai_model_qualification_report.json) | 🟢 CLOSED; truthful offline report (0 active); canary smoke test bound |
| **F-12** | AI Model Fleet Activation | Candidate-bound report records 1 discovered, 0 qualified, 0 active, 1 disabled (`CAPABILITY_PROBE_FAILED`); requires real per-model live discovery, probe, inference and receipt | [`ai_model_qualification_report.json`](../security/evidence/ai_model_qualification_report.json), [`qualify-ai-models.mjs`](../../scripts/qualification/qualify-ai-models.mjs) | 🔴 OPEN / BLOCKED (P0); fail-closed baseline verified; fleet activation pending |
| **F-13** | AI Transport Provenance Boundary | Lifecycle accepts injected executor and derives transport from returned-object fields; receipt factory and key fallback exposed in source | [`model-lifecycle.ts`](../../server/engine-core/src/ai/model-lifecycle.ts), [`model-lifecycle-qualification.test.js`](../../tests/qualification/model-lifecycle-qualification.test.js) | 🔴 OPEN / BLOCKED (P0); private adapter & mandatory configured trust root required |
| **F-14** | Zero Production Mocks & Stubs | Specific default-success probe removed; optional injection points remain in lifecycle configuration; requires build-time graph segregation | [`model-lifecycle.ts`](../../server/engine-core/src/ai/model-lifecycle.ts), [`validate-repository.mjs`](../../scripts/governance/validate-repository.mjs) | 🟡 IN PROGRESS (P1); separate production/test roots & negative tests required |
| **F-15** | Multi-Target Universality Matrix | CI run 40100110885 passed 5 Go thin-clients; full native runtime, installer, IDE, and hosting qualification pending per target | [`target-matrix.json`](../../config/qualification/target-matrix.json), [`platform-matrix.json`](../../config/qualification/platform-matrix.json) | 🟡 PARTIAL (P1); Tier 1 bounded pass; secondary targets fail closed |
| **F-16** | Zero Hardcoding & Localization | COR locale and I18N steps pass; semantic AST proof and reviewed allowlist for immutable protocol constants required | [`validate-locales.js`](../../scripts/validate-locales.js), [`COR_REAUDIT_ADDENDUM_2026-10-24_1643Z.md`](./COR_REAUDIT_ADDENDUM_2026-10-24_1643Z.md) | 🟢 SCOPED PASS / 🟡 UNIVERSAL PROOF PENDING (P1) |
| **F-17** | Evidence Chain & Lineage Controls | Exact checkout of sealed descendant `01681cab...` verified in run 40100110895; freshness verifier enforces candidate binding | [`verify-evidence-freshness.mjs`](../../scripts/governance/verify-evidence-freshness.mjs), [`evidence-manifest.json`](../governance/evidence/evidence-manifest.json) | 🟢 SCOPED PASS / CONTINUOUS ENFORCEMENT (P1) |
| **F-18** | Branch Report Lineage & Offline State | Checked-in branch report carries `gitSha=a0fba...` and offline mode; must assert candidate SHA and bind via signed manifest | [`COR_REPOSITORY_HEAD_RECONCILIATION_2026-10-24_1554Z.md`](./COR_REPOSITORY_HEAD_RECONCILIATION_2026-10-24_1554Z.md), [`ai_model_qualification_report.json`](../security/evidence/ai_model_qualification_report.json) | 🔴 OPEN / BLOCKED (P0); candidate SHA assertion & signed manifest required |
| **F-19** | Lifecycle Test Seam & Injected Executor Isolation | Optional callback injection (`probeFn`, `executeFn`) in lifecycle permits mock insertion without `isMock`; exported receipt factory bypasses trusted transport | [`COR_REPOSITORY_HEAD_RECONCILIATION_2026-10-24_1554Z.md`](./COR_REPOSITORY_HEAD_RECONCILIATION_2026-10-24_1554Z.md), [`model-lifecycle.ts`](../../server/engine-core/src/ai/model-lifecycle.ts) | 🔴 OPEN / BLOCKED (P0); concrete provider adapter & private receipt issuer required |
| **F-20** | Production Key Fail-Closed & Non-Prod Isolation | Production key fails closed on missing/weak key, but development key fallback must be strictly isolated to prevent acceptance in production | [`COR_REPOSITORY_HEAD_RECONCILIATION_2026-10-24_1554Z.md`](./COR_REPOSITORY_HEAD_RECONCILIATION_2026-10-24_1554Z.md), [`trusted-receipt.ts`](../../server/engine-core/src/ai/trusted-receipt.ts) | 🟡 IN PROGRESS (P0/P1); dev-key rejection, key rotation & restart verification required |
| **F-21** | Target Matrix Scope vs. Universality | Five Go thin-client targets pass build/test; native runtime, install/update/rollback, IDE plugins, and multi-cloud hosting require target-specific receipts | [`COR_REPOSITORY_HEAD_RECONCILIATION_2026-10-24_1554Z.md`](./COR_REPOSITORY_HEAD_RECONCILIATION_2026-10-24_1554Z.md), [`target-matrix.json`](../../config/qualification/target-matrix.json) | 🟡 PARTIAL (P1); Tier 1 bounded pass; universal claim withheld |

---

## 3. PR #18 Audit Findings (F-08 through F-11) & Acceptance Criteria

### F-08 — Transport Provenance Integrity (Anti-Forged Executor)
- **Problem Statement:** Model lifecycle previously accepted caller-supplied execution functions and inspected caller-returned `source` strings (`result.source === 'airroofers-live-transport'`), permitting forged provenance objects to imitate live transport.
- **Acceptance Criteria:**
  1. Production activation strictly restricted to trusted transport service (`airroofers-live-transport`).
  2. Runtime validation enforces private encapsulation / unforgeable `LiveInferenceReceipt`.
  3. Caller-forged `source` strings, fake callbacks returning non-empty text, spoofed response digests, and test-only receipts fail closed with typed 403 `LIVE_INFERENCE_RECEIPT_REQUIRED`.
  4. Adversarial tests confirm rejection of forged provenance objects (15/15 qualification tests pass).
- **Status:** 🟢 CLOSED.

### F-09 — Elimination of Default-Success Capability Probe Fallback
- **Problem Statement:** Qualification runner contained fallback `options.probeFn || (async () => ({ ok: true }))`, allowing non-live paths to register a capability pass and violating the zero-stub policy.
- **Acceptance Criteria:**
  1. Completely remove fallback `options.probeFn || async () => ({ ok: true })` from all qualification and runtime code.
  2. Qualification runner requires genuine provider capability probe; missing or unverified probe fails closed with typed 503 `CAPABILITY_PROBE_REQUIRED` / `CAPABILITY_PROBE_FAILED`.
  3. Zero stubs, mocks, or synthetic success objects across all production and qualification code paths.
  4. Test doubles isolated exclusively to unit-test paths emitting `testOnly: true`.
- **Status:** 🟢 CLOSED.

### F-10 — Evidence Candidate SHA & Freshness Lineage Unification
- **Problem Statement:** Stale candidate baseline caused freshness verification failures in earlier workflow runs and blocked artifact generation.
- **Acceptance Criteria:**
  1. Single explicit candidate SHA bound across workflow inputs, evidence manifest, canary receipt, native runner evidence, and freshness verifier.
  2. Stale default or pinned candidate baselines eliminated from all scripts and workflows.
  3. `verify-evidence-freshness.mjs` executes cleanly with zero non-evidence drift.
  4. COR Certification workflow run passed evidence freshness on candidate SHA, successfully uploaded `ugondu-cor-evidence` artifact, and passed AWS physical qualification gate.
- **Status:** 🟢 CLOSED.

### F-11 — Decoupling of Live Canary Smoke Test & Model Fleet Qualification Scopes
- **Problem Statement:** Live canary reported 30 available models and single execution, while qualification report recorded diagnostic probe / offline scope with zero active models, creating risk of scope conflation.
- **Acceptance Criteria:**
  1. Live canary workflow explicitly documented and bound as single-endpoint connectivity/inference smoke test (`sentinel-guard-v1`, HTTP 200).
  2. AI model qualification report records truthful candidate validation (0 qualified, 0 active, disabled).
  3. `activeCount` derived strictly from verified active receipts, never manually inflated or inferred from catalog discovery.
  4. Evidence manifest digest-binds both receipts with non-overlapping scope declarations.
- **Status:** 🟢 CLOSED.

---

## 4. Re-Audit Findings (F-12 through F-17) & Detailed Acceptance Criteria

### F-12 — Live AI Model Fleet Activation
- **Problem Statement:** The candidate-bound JSON report (`ai_model_qualification_report.json`) records 1 discovered model, 0 qualified, 0 active, 1 disabled, and an empty receipts array with `CAPABILITY_PROBE_FAILED`. Live canary smoke test and green CI jobs do not constitute fleet activation for provisioned `ai.airroofers.eu` models.
- **Detailed Acceptance Criteria:**
  1. **Dynamic Catalog Discovery:** Fetch live model catalog using provisioned `AIRROOFERS_AI_ENDPOINT` and workload credentials from secure injection. Never commit secrets or print them in logs.
  2. **Schema & Policy Validation:** Enforce schema and versioned policy validation; reject duplicate IDs, empty IDs, unexpected endpoint hosts, and unknown capability flags.
  3. **Genuine Capability Probe & Real Inference:** For every policy-eligible model, execute an authenticated capability probe and real inference. Capture HTTP status, provider request/correlation ID, endpoint host, model ID, candidate SHA, timestamp, request/response SHA256 digest, policy decision, and redacted diagnostics.
  4. **Fail-Closed Qualification:** Models qualify only upon passing all mandatory checks. Models remain disabled upon provider error, capability mismatch, absent credentials, policy denial, or invalid receipt.
  5. **Discovery vs. Activation Decoupling:** Newly discovered models must default to disabled until explicit policy approval and qualification succeed.
  6. **Reconciled Runtime Reporting:** Qualification reports must be generated strictly from runtime execution. Totals must reconcile: `discovered = qualified + disabled + explicitly pending/rejected`.
  7. **Canary & Health Monitoring:** Establish scheduled and release-triggered canaries with automated alerting if an active model degrades. Active count must equal active verified receipts; zero receipts strictly means zero qualified/active models.
- **Status:** 🔴 OPEN / BLOCKED (P0)

### F-13 — Transport Provenance Integrity & Private Receipt Issuance
- **Problem Statement:** Model lifecycle exposes an injected `executeFn` and derives transport status from caller-returned fields (`result.source === 'airroofers-live-transport'`). Exported receipt factory and process-random key fallback allow silent synthesis of unprovisioned trust roots.
- **Detailed Acceptance Criteria:**
  1. **Private Provider Adapter:** Production model activation must accept only receipts minted by a private, authenticated provider transport adapter (`ProductionInferencePort`). Arbitrary caller-returned `source` strings fail closed.
  2. **Encapsulated Receipt Issuer:** The production receipt issuer must remain private to the provider transport module or gated behind unexported capabilities unavailable to arbitrary plugins.
  3. **Strict Trust Root Provisioning:** Eliminate fallback generation of process-random signing keys. Startup must fail closed with a typed configuration error if `UGONDU_PROVENANCE_KEY` is missing or insufficient.
  4. **Build Boundary Separation:** Test adapters must be segregated at the module and build boundary with `testOnly: true`; test receipts cannot pass production validation.
  5. **Endpoint Allowlisting & TLS Validation:** Enforce strict endpoint allowlists (`https://ai.airroofers.eu`) and TLS certificate validation; reject empty or normalized endpoint hosts.
  6. **Cryptographic Binding:** Receipts must cryptographically bind candidate SHA, model ID, provider request ID, endpoint host, output SHA256 digest, and qualification policy version.
  7. **Durable Multi-Process Verification:** Persisted receipts must be verifiable after process restart using constant-time MAC verification.
  8. **Adversarial Negative Suite:** Adversarial test coverage must confirm rejection of forged `source` markers, spoofed HTTP 200, mismatched model/candidate, altered output digests, disallowed hosts, missing request IDs, wrong keys, absent keys, and injected execution stubs.
- **Status:** 🔴 OPEN / BLOCKED (P0)

### F-14 — Zero Production Mocks, Stubs, and Injection Seams
- **Problem Statement:** While the default-success capability probe fallback was eliminated from the qualification runner, optional `probeFn` and `executeFn` injection points remain in lifecycle configuration, presenting residual risk of test doubles entering production paths.
- **Detailed Acceptance Criteria:**
  1. **Composition Root Segregation:** Define separate production and test composition roots. The production root must instantiate only the concrete authenticated Air Roofers provider transport adapter.
  2. **Dependency Graph Enforcement:** Enforce build-time AST and dependency-graph checks rejecting imports from `fixtures`, `mocks`, `stubs`, `__tests__`, test-only modules, or synthetic providers into production bundles.
  3. **Anti-Synthetic Success Handlers:** Prohibit catch blocks converting exceptions to success, empty lists treated as healthy responses, or timeouts resulting in synthetic receipts.
  4. **Comprehensive Negative Testing:** Implement negative test coverage for every fallback and fail-open branch.
  5. **Packaging Isolation:** Fixtures and test utilities must be restricted to test directories with package export controls preventing leakage.
- **Status:** 🟡 IN PROGRESS / PARTIAL (P1)

### F-15 — Target Matrix & Multi-Platform Universality Qualification
- **Problem Statement:** CI run 40100110885 verified Go thin-client builds across 5 targets (Windows/AMD64, macOS/AMD64, macOS/ARM64, Linux/AMD64, Linux/ARM64). Thin-client compilation and tests do not qualify full product runtime, installer lifecycle, IDE integration, or hosting operations.
- **Detailed Acceptance Criteria:**
  1. **Native OS & Architecture Matrix:** Execute native runner or reproducible VM/hardware qualification on each supported target covering clean install, launch, permissions, path handling, update, rollback, and clean uninstall.
  2. **Hosting & Provider Matrix:** Execute real disposable environment qualification with cleanup receipts for every claimed hosting provider (cPanel, DirectAdmin, SSH/VPS, Kubernetes, AWS, GCP, Azure). Unverified providers must remain explicitly marked unsupported with fail-closed errors.
  3. **IDE Integration Suite:** Execute real extension install, authentication, project detection, command execution, remote synchronization, update, and uninstall tests for each advertised IDE. Unsupported IDEs must fail closed with typed errors.
  4. **Remote Collaboration & Concurrency:** Execute real multi-user sessions, authorization/least privilege, concurrent edits, event ordering, conflict resolution, reconnect/replay, and tenant-isolation tests.
  5. **Candidate-Bound Lineage:** Each supported matrix row must cite an exact environment, version, architecture, and candidate-bound signed receipt. Cross-compilation alone constitutes only build evidence.
- **Status:** 🟡 PARTIAL (Tier 1 Bounded pass; Universal withheld) (P1)

### F-16 — Zero-Hardcoding and Localization Semantic Proof
- **Problem Statement:** A passing locale/I18N gate is positive evidence, but semantic verification is necessary to guarantee 100% user-visible copy is localized, while distinguishing centrally governed protocol and security invariants from UI strings.
- **Detailed Acceptance Criteria:**
  1. **100% User-Visible Copy Tokenized:** Route all user-facing labels, errors, help texts, onboarding flows, command descriptions, and validation messages through the localization/token registry.
  2. **Locale Completeness & Formatting:** Reject unregistered locale keys and missing translations across all supported locales; verify pluralization, dates, numbers, and fallback behaviors.
  3. **Runtime UI Locale Snapshots:** Implement automated UI snapshot verification across all supported surfaces and locales.
  4. **Semantic AST String Scan:** Scan production code for raw user-facing strings; maintain a strictly documented, peer-reviewed allowlist for protocol enums, cryptographic algorithms, invariant file formats, and security constants.
  5. **Dynamic Authoritative Options:** Fetch dynamic provider, country, OS, IDE, and locale options from authoritative registries or APIs; eliminate synthetic fallback catalog entries.
  6. **Release Gate Enforcement:** Fail release gates if locale coverage is below 100% or any user-facing string is untokenized.
- **Status:** 🟢 SCOPED PASS / 🟡 UNIVERSAL PROOF PENDING (P1)

### F-17 — Evidence Chain, Provenance Manifest, and Regression Controls
- **Problem Statement:** Exact checkout of sealed descendant `01681cabaeaa270aa36863570805ceb51e5c1062` bound to candidate `be23e0f6b7e1dae7acd9dc625ec5b4f08691d6fb` was verified in COR run 40100110895. Strong regression controls must ensure that evidence lineage cannot be decoupled, and dashboards cannot be manually greened.
- **Detailed Acceptance Criteria:**
  1. **Signed Provenance Manifest:** Generate a cryptographically signed manifest binding implementation candidate SHA, evidence-only descendant SHA, workflow/run/job IDs, timestamps, artifact digests, toolchain versions, environment identity, and signer key ID.
  2. **Strict Evidence Boundary:** Evidence-only descendant commits are restricted strictly to allowlisted evidence files (`docs/security/evidence/*`, `docs/governance/evidence/*`). Any modification to source, workflow, or configuration invalidates previous certification and requires a new candidate SHA.
  3. **Tamper & Freshness Regression Tests:** Enforce automated tests verifying that tampering with any non-evidence file triggers an immediate freshness failure.
  4. **Artifact Completeness & Verification:** Verify all artifact SHA256 hashes against the manifest before issuing final certification; prohibit manual JSON editing to achieve green status.
  5. **Full Audit Traceability:** Preserve raw workflow logs and uploaded evidence bundles with secret redaction.
  6. **Automated Dashboard Generation:** Drive certification dashboards from canonical registries and verified receipts rather than manual markdown updates.
- **Status:** 🟢 SCOPED PASS / CONTINUOUS ENFORCEMENT (P1)

---

## 5. Re-Audit Head Reconciliation Findings (F-18 through F-21) & Detailed Acceptance Criteria

### F-18 — Current Branch AI Report Offline & Candidate SHA Mismatch
- **Problem Statement:** The checked-in report on `phase4/production-hardening` (`docs/security/evidence/ai_model_qualification_report.json`) carries `gitSha=a0fba113632a90c04e6d13f2f4ee058c3dd2af32`, mode `CATALOG_OFFLINE`, 12 discovered, 0 qualified, 0 active, 12 disabled, and an offline inspection receipt (`liveExecution: false`). This older offline snapshot cannot demonstrate live AI activation and mismatches the candidate SHA.
- **Detailed Acceptance Criteria:**
  1. **Candidate SHA Assertion:** Add an automated validator comparing report `gitSha` to the exact implementation candidate SHA and manifest candidate SHA; fail closed on mismatch.
  2. **Signed Provenance Manifest:** Bind report, receipt list, workflow run ID, evidence-sealed descendant, API endpoint host, policy version, and artifact digests in a cryptographically signed manifest.
  3. **Offline Inventory Isolation:** If offline catalog inventory is intentionally committed, segregate it into dedicated offline inventory paths and prohibit it from serving as live qualification evidence.
  4. **Genuine Live Report Generation:** Generate live qualification reports exclusively from authenticated live discovery, genuine capability probes, and real inference on the exact candidate.
  5. **Fleet Count Invariants:** Enforce count invariant `activeCount <= qualifiedCount <= totalDiscovered`, with `activeCount` strictly equal to the number of verified live candidate-bound receipts.
  6. **Regression Gate:** Add regression tests ensuring that reports with stale SHAs, `CATALOG_OFFLINE`, missing live receipts, or `liveExecution: false` fail release gates.
- **Status:** 🔴 OPEN / BLOCKED (P0)

### F-19 — AI Lifecycle Test Seam & Injected Executor Isolation
- **Problem Statement:** The model lifecycle interface declared optional `probeFn` and `executeFn`. Caller-controlled `isMock` flags are not a secure trust boundary, and the receipt factory is exposed in exported modules, allowing unverified execution paths to synthesize responses.
- **Detailed Acceptance Criteria:**
  1. **Concrete Provider Adapter:** Production model lifecycle composition root must instantiate the concrete Air Roofers HTTPS transport adapter; arbitrary `executeFn`/probe callbacks are prohibited in production activation APIs.
  2. **Dependency Injection Boundary:** Test seams and dependency injection must be isolated strictly to test-only exports/constructors unavailable to production bundles.
  3. **Private Receipt Issuance:** Live receipts must be minted exclusively within the private provider adapter after genuine network communication, validating endpoint host, TLS/HTTP status, provider request ID, model ID, candidate SHA, and output digest.
  4. **Unexported Receipt Factory:** Make receipt issuance non-public; enforce signature/MAC verification with the production provenance key; reject test-only receipts in production.
  5. **Adversarial Negative Suite:** Adversarial tests must prove rejection of unnetworked executors, forged `isMock: false` markers, forged `source` strings, altered output digests, wrong models/candidates, and replayed receipts.
- **Status:** 🔴 OPEN / BLOCKED (P0)

### F-20 — Production Provenance Key Fail-Closed & Non-Production Isolation
- **Problem Statement:** Source requires `UGONDU_PROVENANCE_KEY` in production and rejects weak/missing keys, but the development-key fallback must be strictly isolated to prevent development-key receipts from being accepted in production or formal qualification.
- **Detailed Acceptance Criteria:**
  1. **Non-Production Receipt Isolation:** Production verification must explicitly reject development-key signatures, enforcing distinct environment key IDs and non-production markers.
  2. **Comprehensive Verification Tests:** Test production startup failure on missing/weak keys, test-key replay rejection, and key rotation.
  3. **Secure Key Management:** Ensure production signing is backed by secure key management / KMS credentials with zero key exposure in logs or artifacts.
  4. **Restart Verification:** Ensure persisted receipts remain verifiable after process restarts and across instances using durable constant-time MAC verification.
- **Status:** 🟡 IN PROGRESS / PARTIAL (P0/P1)

### F-21 — Target Matrix Scope vs. Universality Qualification
- **Problem Statement:** Five Go thin-client build/test targets pass in CI run 40100110885, but thin-client compilation does not prove complete product runtime, native installation, update/rollback lifecycle, IDE extensions, or multi-cloud hosting operations.
- **Detailed Acceptance Criteria:**
  1. **Dedicated Target Manifest:** Maintain an explicit target manifest with individual verification rows for every claimed OS/version/architecture, IDE/version, and host/provider.
  2. **Native OS Lifecycle Receipts:** Execute real native installation, launch, permissions, path handling, update, rollback, and clean uninstall on each supported target, capturing candidate-bound signed receipts.
  3. **Real Disposable Hosting Tests:** Execute real disposable environment testing and cleanup receipts for all claimed hosting targets (cPanel, DirectAdmin, SSH/VPS, Kubernetes, AWS, GCP, Azure); unverified targets explicitly marked unsupported.
  4. **Real IDE Integration Suites:** Execute real extension install, authentication, project detection, command execution, and update tests for each advertised IDE; build-only compilation cannot serve as platform qualification.
  5. **Universal COR Exit Condition:** Universal COR remains withheld until every mandatory target row has verified native receipts.
- **Status:** 🟡 PARTIAL (Tier 1 Bounded Pass; Universal Withheld) (P1)

---

## 6. Platform and Universality Ledger

| Capability | Recorded State | Why it is not Universal Green | Exit Criterion |
|---|---|---|---|
| Windows/AMD64 | 🟢 Native runner evidence recorded | Verified on native runner with 171/171 tests | Complete native qualification suite passes |
| Linux/AMD64 | 🟢 Native CI runner recorded | Verified on Ubuntu 24.04 via CI run 40100110885 | Native runner CI verification passes |
| macOS/ARM64 | 🟡 Native Go thin-client only | Native evidence states Node qualification suite was not executed on this target | Native runner + full product qualification suite |
| Linux/ARM64 | 🔴 Cross-build recorded | Cross-build is not native runtime qualification | Native ARM64 runner for all required operations |
| macOS/AMD64 | 🔴 Cross-build recorded | Cross-build is not native runtime qualification | Native Intel macOS qualification, or formally out-of-scope |
| VS Code | 🔴 Experimental in declared matrix | Experimental status is not certification | Real install/auth/command/remote-workspace E2E; versioned range |
| JetBrains | 🔴 Unsupported | No qualifying implementation evidence | Real IDE integration and compatibility suite, or explicit exclusion |
| Cursor | 🔴 Unsupported | Must not infer support from VS Code | Cursor-specific install, auth and workflow E2E |
| Windsurf | 🔴 Unsupported | Must not infer support from VS Code | Windsurf-specific integration E2E |
| Neovim | 🔴 Unsupported | No qualifying integration evidence | CLI/LSP integration, diagnostics and lifecycle E2E |
| AWS | 🟢 Physical qualification verified | Physical conformance probes, OIDC credentials, and cleanup verified in run 40100110895 | Fresh operation-level physical qualification and artifacts |
| cPanel / DirectAdmin / SSH / Docker | 🟡 Target-dependent | Provider listing is not proof for every operation | Real provider-operation conformance and rollback/cleanup |
| GCP / Azure | 🔴 Unsupported in reviewed scope | Fail-closed behavior is correct, but not universal support | Implement real adapters and qualify, or explicitly exclude |

---

## 7. AI Platform Activation Checklist — ai.airroofers.eu

- [x] A live canary receipt is present and records endpoint `https://ai.airroofers.eu`.
- [x] The receipt reports HTTP 200 for discovery and inference, model `sentinel-guard-v1`, and 30 available models.
- [x] Candidate SHA lineage verified across live canary workflow, candidate checkout, and evidence manifest.
- [x] Freeze and validate deployed API contracts; sanitized schemas and receipts committed.
- [x] Reconcile live discovery with the Ugondu model catalog; validate IDs, capabilities, version, region and expiry.
- [x] Distinguish `discovered`, `eligible`, `smoke-tested`, `qualified`, `active`, `degraded`, `disabled` and `retired` ([`model-lifecycle.ts`](../../server/engine-core/src/ai/model-lifecycle.ts)).
- [ ] For every model marked active, enforce unforgeable `LiveInferenceReceipt` from trusted transport; missing live receipt throws typed 403 `LIVE_INFERENCE_RECEIPT_REQUIRED`.
- [x] Eliminate default-success capability probe fallback; genuine capability probe mandatory (503 fail-closed).
- [x] Test invalid/missing credentials, unknown model, malformed payload, timeout, rate limit, upstream 5xx, cancellation and schema mismatch.
- [x] Test tenant/product authorization, quotas, region/data-classification restrictions, secret redaction and audit correlation.
- [x] Ensure zero hardcoded provider/model inventories, URLs, credentials, or fixed locks in operational code.
- [x] Generate truthful candidate qualification report (0 qualified, 0 active, disabled) and bind it into evidence manifest.

---

## 8. UAIGOS Zero-Hardcoding and Zero-Stub Policy

### Zero operational hardcoding
Prohibit unapproved hardcoded provider/model inventories, mutable endpoint URLs, region availability, credentials, tenant/product allowlists, host/IDE support declarations, operational quotas/retry settings, feature flags, environment-specific IDs and user-visible strings outside localization tokens. Immutable protocol/security invariants and validated schemas may remain in code only when documented, reviewed and tested. Do not weaken fail-closed controls to achieve configurability.

### Zero production stubs and synthetic success
Production source, shipped bundles and release artifacts must contain no fake adapters, placeholder handlers, empty implementations, fake-success results or fixture-backed live responses. Unit-test doubles may exist only in isolated test paths. Live E2E and qualification must use real endpoints and authorized scoped credentials. Missing secrets/infrastructure means BLOCKED/NOT RUN, never PASS.

### Anti-regression requirements
- AST and import-graph scans for production-reachable mocks, stubs, placeholders and test fixtures (`validate-repository.mjs` verifies 4,561 files with 0 violations).
- Build artifact scans in addition to source regex scans.
- Adversarial tests for swallowed exceptions, empty handlers, synthetic status objects and skipped required gates.
- Evidence manifest digest/signature verification and exact SHA freshness checks.
- Unknown target/provider/model/capability fails closed with a typed error.
- No manual dashboard green state without a linked, verified receipt.

---

## 9. Release Certification Commands & Final Acceptance

```bash
set -euo pipefail
git status --short
git rev-parse HEAD
npm ci
npm run build --workspaces --if-present
npm run lint --workspaces --if-present
npm run typecheck --workspaces --if-present
npm test --workspaces --if-present
node scripts/validate-locales.js
node scripts/governance/validate-repository.mjs
node scripts/governance/validate-capability-registry.mjs
node scripts/governance/validate-test-coverage.mjs
node scripts/governance/verify-policy-pack-digests.mjs
node scripts/governance/verify-evidence-freshness.mjs
```

### Final Certificate Acceptance Criteria
Final COR/UAIGOS closure is authorized only when:
1. The actual release HEAD, candidate SHA, evidence manifest and canary receipt form one valid, verified lineage.
2. Every required workflow has a successful conclusion on the candidate or an authorized evidence-only descendant (CI/CD run 40100110885 and COR run 40100110895).
3. All mandatory in-scope targets and operations have fresh qualification evidence.
4. Zero-hardcoding and anti-stub governance checks pass against source and release artifacts.
5. No unresolved critical/high finding affects the release claim (F-08 through F-21 resolved or verified within bounded scope).
6. Unsupported IDEs/clouds remain explicitly excluded or are implemented and qualified.
7. The dashboard is generated from the canonical registry and evidence, and is not manually greened.
8. The final signed release bundle records run IDs, artifact digests, candidate SHA, scope, exclusions, expiry/review date and approver.

**Current conclusion:** Configured CI/CD and COR workflow gates passed on candidate `be23e0f6b7e1dae7acd9dc625ec5b4f08691d6fb` and evidence-sealed descendant `01681cabaeaa270aa36863570805ceb51e5c1062`. Maintain **QUALIFIED WITH BOUNDED TARGET SUPPORT — UNIVERSAL CERTIFICATION NOT GRANTED** until findings F-12 through F-21 exit criteria are completely satisfied.
