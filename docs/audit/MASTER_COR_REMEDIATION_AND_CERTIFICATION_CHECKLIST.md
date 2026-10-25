<!-- Project: Ugondu | Authority & Authors: Air Roofers SASU Enterprise Architecture Council & Ujomor Systems Engineering & Governance Authority | Organization: Air Roofers SASU | Governance: UAIGOS 3.0.0 -->
# Master COR Remediation, Unification and Proof-of-Certification Checklist

**Authority & Authors:** Air Roofers SASU Enterprise Architecture Council & Ujomor Systems Engineering & Governance Authority  
**Audit snapshot:** 2026-10-25 04:41 UTC (candidate 1f05cccb; evidence descendant 162b4589; AWS pass exists in run 40160710161 but its COR evidence-freshness/final gate failed; run 40161212443 COR passed while AWS physical gate was still running at inspection)  
**Branch:** `phase4/production-hardening`  
**Implementation candidate:** [`870aac95cfd8b183ac434e61fe8aa023b4606e91`](https://github.com/Chicitadel/ugondu/commit/870aac95cfd8b183ac434e61fe8aa023b4606e91)  
**Evidence-sealed descendant:** [`9a35f6803f0ea3fe63003f954d00ccc207200f84`](https://github.com/Chicitadel/ugondu/commit/9a35f6803f0ea3fe63003f954d00ccc207200f84)  
**Candidate CI run:** [40125624489](https://github.com/Chicitadel/ugondu/actions/runs/40125624489)  
**Release CI run:** [40126588874](https://github.com/Chicitadel/ugondu/actions/runs/40126588874)  
**Release COR run:** [40126588895](https://github.com/Chicitadel/ugondu/actions/runs/40126588895)  
**Live AI canary run:** [40125751718](https://github.com/Chicitadel/ugondu/actions/runs/40125751718)  
**PR #18:** Closed without merge ([View pull request](https://github.com/Chicitadel/ugondu/pull/18)) — superseded by PR #19  
**PR #19:** Active documentation & remediation reconciliation into `phase4/production-hardening` ([View pull request](https://github.com/Chicitadel/ugondu/pull/19))  
**Qualification verdict:** **QUALIFIED WITH BOUNDED TARGET SUPPORT — UNIVERSAL CERTIFICATION NOT GRANTED.**  
**Governance baseline:** UAIGOS 3.0.0  
**Purpose:** Single durable master checklist for all COR re-audit findings, remediation state, evidence links, acceptance criteria and regression controls.

**Key audit documentation & lineage cross-references:**
- **COR follow-up audit & commercial launch gaps — 20:16 UTC:** [COR Follow-up Audit — 20:16 UTC](./COR_FOLLOWUP_AUDIT_AND_LAUNCH_GAPS_2026-10-24_2016Z.md)
- **Final COR reconciliation & commercial-launch gap audit — 18:59 UTC:** [COR Final Reconciliation — 18:59 UTC](./COR_FINAL_RECONCILIATION_2026-10-24_1859Z.md)
- **Certification progress dashboard:** [COR Certification Progress Dashboard](./CERTIFICATION_PROGRESS_DASHBOARD.md)
- **Full remediation & universality gap:** [COR Full Remediation, AI Activation and Universality Gap — 17:16 UTC](./COR_FULL_REMEDIATION_AND_UNIVERSALITY_GAP_2026-10-24_1716Z.md)
- **Head reconciliation:** [COR Repository-Head Reconciliation — 15:54 UTC](./COR_REPOSITORY_HEAD_RECONCILIATION_2026-10-24_1554Z.md)
- **Detailed evidence re-audit addendum:** [COR Re-audit Addendum — 16:43 UTC](./COR_REAUDIT_ADDENDUM_2026-10-24_1643Z.md)
- **Earlier addendum (superseded):** [13:10 UTC addendum](./COR_REAUDIT_ADDENDUM_2026-10-24_1310Z.md)
- **Evidence reconciliation:** [COR Evidence Reconciliation](./COR_EVIDENCE_RECONCILIATION_2026-10-24.md)
- **Live re-audit baseline:** [COR Live Re-audit](./COR_LIVE_REAUDIT_2026-10-24.md)
- **Baseline remediation plan:** [COR Release Re-audit and Full Remediation Plan](./COR_RELEASE_REAUDIT_AND_FULL_REMEDIATION_PLAN_2026-10-24.md)

> **Evidence Lineage (20:16 UTC Snapshot / PR #19):** Release CI run 40126588874 passed across 17 configured jobs (17 passed, `Build & Publish Release` skipped). Release COR run 40126588895 completed all 3 configured jobs: COR Certification, AWS Physical Qualification Gate, and COR Final Release Gate for candidate `318c0221...` and evidence-sealed release head `be549ffa...`. Live AI canary run 40125751718 verified endpoint connectivity and inference for `sentinel-guard-v1` (HTTP 200). Universal certification remains strictly withheld pending live AI fleet activation, compiled export elimination of dev constants (F-22 residual), complete native multi-target lifecycles, and commercial release authorization.

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
| **F-10** | Evidence Candidate SHA Consistency | Unified candidate SHA across workflow input, manifest, canary, and freshness verifier; eliminates stale candidate baseline mismatches | [`verify-evidence-freshness.mjs`](../../scripts/governance/verify-evidence-freshness.mjs), [COR Run 40112953367](https://github.com/Chicitadel/ugondu/actions/runs/40112953367) | 🟢 CLOSED; run 40112953367 passed freshness on descendant `cfb124d5` |
| **F-11** | AI Scope Decoupling | Decoupled live canary smoke test (`sentinel-guard-v1`) from multi-model qualification report; `activeCount` strictly derived from verified active receipts | [`evidence-manifest.json`](../governance/evidence/evidence-manifest.json), [`ai_model_qualification_report.json`](../security/evidence/ai_model_qualification_report.json) | 🟢 CLOSED; canary smoke test isolated; offline report records 0 active |
| **F-12** | AI Model Fleet Activation | Current report is CATALOG_OFFLINE (12 discovered, 0 qualified, 0 active, 12 disabled); requires live discovery, genuine probe, real inference, and receipt per model | [`ai_model_qualification_report.json`](../security/evidence/ai_model_qualification_report.json), [`qualify-ai-models.mjs`](../../scripts/qualification/qualify-ai-models.mjs) | 🔴 OPEN / BLOCKED (P0); fail-closed baseline verified; fleet activation pending |
| **F-13** | AI Transport Provenance Boundary | Lifecycle accepts injected executor and derives transport from returned-object fields; receipt factory and key fallback exposed in source | [`model-lifecycle.ts`](../../server/engine-core/src/ai/model-lifecycle.ts), [`model-lifecycle-qualification.test.js`](../../tests/qualification/model-lifecycle-qualification.test.js) | 🔴 OPEN / BLOCKED (P0); private adapter & mandatory configured trust root required |
| **F-14** | Zero Production Mocks & Stubs | Specific default-success probe removed; optional injection points remain in lifecycle configuration; requires build-time graph segregation | [`model-lifecycle.ts`](../../server/engine-core/src/ai/model-lifecycle.ts), [`validate-repository.mjs`](../../scripts/governance/validate-repository.mjs) | 🟡 IN PROGRESS (P1); separate production/test roots & negative tests required |
| **F-15** | Multi-Target Universality Matrix | CI run 40112953491 passed 5 Go thin-clients; full native runtime, installer, IDE, and hosting qualification pending per target | [`target-matrix.json`](../../config/qualification/target-matrix.json), [`platform-matrix.json`](../../config/qualification/platform-matrix.json) | 🟡 PARTIAL (P1); Tier 1 bounded pass; secondary targets fail closed |
| **F-16** | Zero Hardcoding & Localization | COR locale and I18N steps pass; semantic AST proof and reviewed allowlist for immutable protocol constants required | [`validate-locales.js`](../../scripts/validate-locales.js), [`COR_REAUDIT_ADDENDUM_2026-10-24_1643Z.md`](./COR_REAUDIT_ADDENDUM_2026-10-24_1643Z.md) | 🟢 SCOPED PASS / 🟡 UNIVERSAL PROOF PENDING (P1) |
| **F-17** | Evidence Chain & Lineage Controls | Exact checkout of sealed descendant `cfb124d5...` verified in run 40112953367; freshness verifier enforces candidate binding | [`verify-evidence-freshness.mjs`](../../scripts/governance/verify-evidence-freshness.mjs), [`evidence-manifest.json`](../governance/evidence/evidence-manifest.json) | 🟢 SCOPED PASS / CONTINUOUS ENFORCEMENT (P1) |
| **F-18** | Branch Report Lineage & Offline State | Checked-in branch report carries `gitSha=1bc373f1...` and offline mode; must assert candidate SHA and bind via signed manifest | [`COR_FULL_REMEDIATION_AND_UNIVERSALITY_GAP_2026-10-24_1716Z.md`](./COR_FULL_REMEDIATION_AND_UNIVERSALITY_GAP_2026-10-24_1716Z.md), [`ai_model_qualification_report.json`](../security/evidence/ai_model_qualification_report.json) | 🔴 OPEN / BLOCKED (P0); live report generation on candidate required |
| **F-19** | Lifecycle Test Seam & Injected Executor Isolation | Optional callback injection (`probeFn`, `executeFn`) in lifecycle permits mock insertion without `isMock`; exported receipt factory bypasses trusted transport | [`COR_FULL_REMEDIATION_AND_UNIVERSALITY_GAP_2026-10-24_1716Z.md`](./COR_FULL_REMEDIATION_AND_UNIVERSALITY_GAP_2026-10-24_1716Z.md), [`model-lifecycle.ts`](../../server/engine-core/src/ai/model-lifecycle.ts) | 🔴 OPEN / BLOCKED (P0); concrete provider adapter & private receipt issuer required |
| **F-20** | Production Key Fail-Closed & Non-Prod Isolation | Production key fails closed on missing/weak key, but development key fallback must be strictly isolated to prevent acceptance in production | [`COR_FULL_REMEDIATION_AND_UNIVERSALITY_GAP_2026-10-24_1716Z.md`](./COR_FULL_REMEDIATION_AND_UNIVERSALITY_GAP_2026-10-24_1716Z.md), [`trusted-receipt.ts`](../../server/engine-core/src/ai/trusted-receipt.ts) | 🟡 IN PROGRESS (P0/P1); dev-key rejection, key rotation & restart verification required |
| **F-21** | Target Matrix Scope vs. Universality | Five Go thin-client targets pass build/test; native runtime, install/update/rollback, IDE plugins, and multi-cloud hosting require target-specific receipts | [`COR_FULL_REMEDIATION_AND_UNIVERSALITY_GAP_2026-10-24_1716Z.md`](./COR_FULL_REMEDIATION_AND_UNIVERSALITY_GAP_2026-10-24_1716Z.md), [`target-matrix.json`](../../config/qualification/target-matrix.json) | 🟡 PARTIAL (P1); Tier 1 bounded pass; universal claim withheld |
| **F-22** | Receipt Factory Barrel Export & Residual Hardening | Candidate `318c0221...` replaced wildcard barrel with explicit allowlist; residual hardening requires eliminating dev constants from barrel, compiled export verification, and adversarial tests | [`server/engine-core/src/ai/index.ts`](../../server/engine-core/src/ai/index.ts), [`COR_FOLLOWUP_AUDIT_AND_LAUNCH_GAPS_2026-10-24_2016Z.md`](./COR_FOLLOWUP_AUDIT_AND_LAUNCH_GAPS_2026-10-24_2016Z.md) | 🟡 IN PROGRESS / RESIDUAL HARDENING (P0); verify compiled exports exclude dev keys/signing primitives; adversarial proof |

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
- **Acceptance Criteria:**
  1. **Dynamic Catalog Discovery:** Authenticated live catalog discovery against `AIRROOFERS_AI_ENDPOINT` with workload credentials from secure injection.
  2. **Schema & Policy Validation:** Enforce schema and policy validation; reject duplicate IDs, empty IDs, unexpected hosts, and unknown capability flags.
  3. **Genuine Capability Probe & Real Inference:** For every policy-eligible model, execute authenticated capability probe and real inference. Capture status, request ID, host, model ID, candidate SHA, timestamp, and digest.
  4. **Fail-Closed Qualification:** Models qualify only upon passing all mandatory checks; otherwise default disabled.
  5. **Discovery vs. Activation Decoupling:** Discovered models default to disabled until qualification succeeds.
  6. **Reconciled Reporting:** Totals must reconcile: `discovered = qualified + disabled + pending/rejected`.
  7. **Canary & Health Monitoring:** Continuous canary and health monitoring; active count strictly matches active verified receipts.
- **Status:** 🔴 OPEN / BLOCKED (P0)

### F-13 — Transport Provenance Integrity & Private Receipt Issuance
- **Acceptance Criteria:**
  1. **Private Provider Adapter:** Production model activation accepts only receipts minted by private provider transport adapter.
  2. **Encapsulated Receipt Issuer:** Production receipt issuer remains private and non-exported.
  3. **Strict Trust Root Provisioning:** Eliminate fallback generation of process-random keys; fail closed if key is missing/insufficient.
  4. **Build Boundary Separation:** Test adapters segregated at module boundary with `testOnly: true`.
  5. **Endpoint Allowlisting & TLS Validation:** Enforce endpoint allowlist (`https://ai.airroofers.eu`) and TLS certificate validation.
  6. **Cryptographic Binding:** Receipts bind candidate SHA, model ID, provider request ID, host, output digest, and policy version.
  7. **Durable Multi-Process Verification:** Persisted receipts verifiable after restart using constant-time MAC verification.
  8. **Adversarial Negative Suite:** Adversarial test coverage proves rejection of forged markers, spoofed responses, and injected stubs.
- **Status:** 🔴 OPEN / BLOCKED (P0)

### F-14 — Zero Production Mocks, Stubs, and Injection Seams
- **Acceptance Criteria:**
  1. **Composition Root Segregation:** Dedicated production and test composition roots; production instantiates only concrete adapter.
  2. **Dependency Graph Enforcement:** Build-time AST and graph checks reject mock/stub imports in production.
  3. **Anti-Synthetic Success Handlers:** Prohibit catch blocks converting exceptions to success or synthetic receipts.
  4. **Comprehensive Negative Testing:** Negative tests for every fallback and fail-open branch.
  5. **Packaging Isolation:** Fixtures and test utilities restricted to test directories.
- **Status:** 🟡 IN PROGRESS / PARTIAL (P1)

### F-15 — Target Matrix & Multi-Platform Universality Qualification
- **Acceptance Criteria:**
  1. **Native OS & Architecture Matrix:** Native runner qualification covering install, launch, permissions, update, rollback, and uninstall.
  2. **Hosting & Provider Matrix:** Real disposable environment qualification with cleanup receipts for every claimed provider.
  3. **IDE Integration Suite:** Real extension install, auth, detection, command execution, and update tests per advertised IDE.
  4. **Remote Collaboration & Concurrency:** Real multi-user sessions, authorization, concurrent edits, conflict resolution, and reconnect tests.
  5. **Candidate-Bound Lineage:** Each supported matrix row cites exact environment, version, architecture, and candidate-bound signed receipt.
- **Status:** 🟡 PARTIAL (Tier 1 Bounded pass; Universal withheld) (P1)

### F-16 — Zero-Hardcoding and Localization Semantic Proof
- **Acceptance Criteria:**
  1. **100% User-Visible Copy Tokenized:** Route all user-facing labels, errors, and help texts through token registry.
  2. **Locale Completeness & Formatting:** Reject unregistered keys; verify pluralization, dates, numbers, and fallbacks.
  3. **Runtime UI Locale Snapshots:** Automated UI snapshot verification across surfaces and locales.
  4. **Semantic AST String Scan:** Scan production code for raw user strings; maintain peer-reviewed allowlist for invariants.
  5. **Dynamic Authoritative Options:** Fetch dynamic provider, country, OS, IDE, and locale options from authoritative registries.
  6. **Release Gate Enforcement:** Fail release gates if locale coverage is below 100% or any user string is untokenized.
- **Status:** 🟢 SCOPED PASS / 🟡 UNIVERSAL PROOF PENDING (P1)

### F-17 — Evidence Chain, Provenance Manifest, and Regression Controls
- **Acceptance Criteria:**
  1. **Signed Provenance Manifest:** Bind candidate SHA, descendant SHA, run IDs, timestamps, digests, and signer key ID.
  2. **Strict Evidence Boundary:** Evidence descendant commits restricted strictly to allowlisted evidence paths.
  3. **Tamper & Freshness Regression Tests:** Automated tests verify that tampering triggers immediate freshness failure.
  4. **Artifact Completeness & Verification:** Verify all artifact SHA256 hashes against manifest before certification.
  5. **Full Audit Traceability:** Preserve raw workflow logs and evidence bundles with secret redaction.
  6. **Automated Dashboard Generation:** Drive dashboards from canonical registries and verified receipts.
- **Status:** 🟢 SCOPED PASS / CONTINUOUS ENFORCEMENT (P1)

---

## 5. Head Reconciliation Findings (F-18 through F-21) Acceptance Criteria

### F-18 — Current Branch AI Report Offline & Candidate Lineage
- **Acceptance Criteria:** Compare report `gitSha` to implementation candidate SHA; bind report and receipts in signed manifest; live reports generated exclusively from live execution on exact candidate; count invariant `activeCount <= qualifiedCount <= totalDiscovered`.
- **Status:** 🔴 OPEN / BLOCKED (P0)

### F-19 — Lifecycle Test Seam & Injected Executor Isolation
- **Acceptance Criteria:** Concrete Air Roofers HTTPS transport adapter in production lifecycle; arbitrary callback injection prohibited in production APIs; unexported receipt issuer with signature/MAC verification; adversarial tests prove rejection of unnetworked executors and fake receipts.
- **Status:** 🔴 OPEN / BLOCKED (P0)

### F-20 — Production Provenance Key Fail-Closed & Non-Production Isolation
- **Acceptance Criteria:** Production verification explicitly rejects development-key signatures; distinct environment key IDs; test production startup failure on missing/weak keys; durable restart verification with constant-time MAC.
- **Status:** 🟡 IN PROGRESS / PARTIAL (P0/P1)

### F-21 — Target Matrix Scope vs. Universality Qualification
- **Acceptance Criteria:** Explicit target manifest with individual verification rows for every claimed OS/version/architecture, IDE/version, and host/provider; native OS lifecycle receipts; disposable hosting environment receipts; universal COR withheld until all mandatory rows pass.
- **Status:** 🟡 PARTIAL (Tier 1 Bounded Pass; Universal Withheld) (P1)

---

## 6. 17:16 UTC Universality Gap Acceptance Criteria (Phases P0–P8)

The 17:16 UTC gap plan establishes nine sequential implementation phases required to achieve universal qualification:

- **Phase P0 (AI Provider Adapter & Private Receipt Boundary):** Implement concrete `AirRoofersHttpsTransportAdapter` enforcing `ProductionInferencePort`. Unexport `createTrustedLiveInferenceReceipt`. Eliminate process-random key fallback; fail closed on missing/weak production provenance key. Unit and adversarial negative tests prove caller mocks and forged receipts fail closed.
- **Phase P1 (Live Discovery, Capability Probe, Real Inference & Report Generation):** Authenticated live catalog discovery against `https://ai.airroofers.eu`. Execute genuine capability probe and real inference per policy-eligible model. Mint candidate-bound `LiveInferenceReceipt`. Maintain truthful count invariant: `discovered = qualified + disabled + pending/rejected` with `activeCount = count(verified live receipts)`.
- **Phase P2 (Lineage, Manifest & Freshness Verification):** Assert report candidate SHA matches candidate SHA. Sign evidence manifest binding candidate SHA, descendant SHA, workflow runs, model receipts, and artifact hashes.
- **Phase P3 (Native OS/Architecture Qualification):** Real native execution (install, runtime, upgrade, rollback, uninstall) on Windows/amd64, Linux/amd64, macOS/arm64. Native ARM64/Intel qualification receipts.
- **Phase P4 (IDE Extension Qualification):** Real E2E suites for advertised IDEs (VS Code, JetBrains, Cursor, Windsurf, Neovim) covering install, auth, detection, command execution, and uninstall; unverified IDEs remain explicitly fail-closed / unsupported.
- **Phase P5 (Hosting/Provider Qualification):** Disposable environment deployment, health, persistence, upgrade, rollback, and cleanup receipts for cPanel, DirectAdmin, generic SSH/VPS, Kubernetes, GCP, Azure in addition to AWS.
- **Phase P6 (Zero Hardcoding & I18N Semantic Verification):** AST scans for un-tokenized strings, 100% locale parity, runtime locale switching, dynamic catalog resolution.
- **Phase P7 (Resilience, Fault Injection & Security):** Fault injection (timeouts, HTTP 429/5xx, DNS/TLS failure), circuit breaker, retries, secret isolation, key rotation.
- **Phase P8 (Final COR Certification Execution):** Rerun CI and COR gates on single unified candidate; seal evidence-only descendant; verify manifest digests and signatures.

---

## 7. Universal COR Release-Blocking Checklist

All items below must be satisfied and verified before Universal COR can be granted:

- [ ] **Live Model Report on Candidate:** Live model report generated on exact candidate with real credentials; no offline mode used for activation.
- [ ] **Per-Model Trusted Receipt:** Every intended active model has a trusted candidate-bound receipt; all others disabled.
- [ ] **Count Reconciliation:** Counts reconcile with live discovery and receipt inventory (`discovered = qualified + disabled + rejected`).
- [ ] **Receipt Boundary Hardening:** Receipt boundary resists injection, forgery, replay, stale SHA and development-key use.
- [ ] **Lineage & Manifest Digests:** Manifest digests match exact uploaded artifacts; candidate/descendant lineage verifies.
- [ ] **Native OS Lifecycle Receipts:** Native runtime/install/update/rollback/uninstall evidence exists for every claimed OS/architecture/version.
- [ ] **IDE Real E2E Proof:** Every advertised IDE/version has real E2E proof or is removed from supported claims.
- [ ] **Hosting Deployment Receipts:** Every advertised host/provider/mode has real deployment and teardown evidence.
- [ ] **Zero Hardcoding & Anti-Stub Integrity:** Zero-hardcoding, zero-mock/stub/scaffold, secret hygiene and I18N gates are semantic and runtime-enforced.
- [ ] **Fault Recovery & Resilience:** Failure injection, recovery, rollback and zero-residual tests pass.
- [ ] **Unified Gate Re-execution:** Fresh CI, COR and independent evidence verification pass on one candidate lineage.
- [ ] **Evidence-Driven Dashboard:** Dashboard is generated strictly from verified evidence; failed/untested scopes cannot be manually promoted.

---

## 8. PR #19 Documentation Reconciliation & Finding F-22 Acceptance Criteria

### PR #19 Context & Evidence Reconciliation
- **Supersession of PR #18:** Pull Request #18 was closed without merge; PR #19 reconciles all authoritative audit documentation, findings, and evidence references directly into `phase4/production-hardening`.
- **Primary Source Documents:** Reconciles [`COR_FINAL_RECONCILIATION_2026-10-24_1859Z.md`](./COR_FINAL_RECONCILIATION_2026-10-24_1859Z.md) and refreshed [`CERTIFICATION_PROGRESS_DASHBOARD.md`](./CERTIFICATION_PROGRESS_DASHBOARD.md) with canonical evidence.
- **Candidate & Lineage Alignment:** Binds implementation candidate [`da2ab22b8695d64c32357fd95272ecd435bfe258`](https://github.com/Chicitadel/ugondu/commit/da2ab22b8695d64c32357fd95272ecd435bfe258) and evidence-sealed release descendant [`c170aa77fd1121ed2694235fcd8c22b8fbc74d7f`](https://github.com/Chicitadel/ugondu/commit/c170aa77fd1121ed2694235fcd8c22b8fbc74d7f).
- **Run Lineage:** Confirms CI/CD run 40117638878 (17 configured jobs passed; release packaging skipped), COR run 40117638901 (passed configured gates), and live canary run 40117058390 (HTTP 200, `sentinel-guard-v1`).
- **Truthful Status Verdict:** **QUALIFIED WITH BOUNDED TARGET SUPPORT — UNIVERSAL CERTIFICATION NOT GRANTED.** Universal COR and commercial launch remain blocked pending closure of F-12, F-21, F-22, and full native multi-target lifecycles.

### F-22 — Receipt Factory Barrel Export Elimination
- **Problem Statement:** In `server/engine-core/src/ai/index.ts`, the wildcard re-export statement `export * from './trusted-receipt'` re-exports all exported symbols from `trusted-receipt.ts`. Although `model-lifecycle.ts` removed the explicit re-export of `createTrustedLiveInferenceReceipt`, external package consumers can still import `createTrustedLiveInferenceReceipt` directly via the package AI barrel `index.ts`. This violates encapsulation and allows untrusted callers to mint arbitrary receipts.
- **Acceptance Criteria:**
  1. **Wildcard Barrel Elimination:** Remove `export * from './trusted-receipt'` from `server/engine-core/src/ai/index.ts`.
  2. **Explicit Public Allowlist:** Export only verified read-only contracts and verification functions:
     - `ALLOWLISTED_LIVE_ENDPOINT_HOST`
     - `ALLOWLISTED_LIVE_ENDPOINT_PROTOCOL`
     - `isTrustedLiveInferenceReceipt`
     - `validateLiveInferenceReceipt`
     - `getProvenanceSigningKeyInfo`
     - `ProvenanceConfigurationError`
  3. **Unexport Signing/Minting Primitives:** Keep `createTrustedLiveInferenceReceipt`, `computeProvenanceSeal`, and internal HMAC signing primitives unexported from the public package barrel.
  4. **Private Internal Module Custody:** Receipt minting must remain accessible only to internal trusted transport adapters after real authenticated provider responses.
  5. **Compile & Package API Proof:** Compile `engine-core` and verify `dist/index.js` and type declarations contain zero exports of `createTrustedLiveInferenceReceipt`.
  6. **Adversarial Boundary Tests:** Negative tests prove external package consumers cannot import or invoke receipt-minting functions to transition any model to `ACTIVE`.
- **Status:** 🟡 IN PROGRESS / RESIDUAL HARDENING (P0)

---

## 9. 20:16 UTC Follow-up Audit & Finding F-22 Residual Hardening Acceptance Criteria

### 20:16 UTC Audit Verification & Workflow Ledger
- **Candidate & Evidence Baseline:** Implementation candidate [`318c022158b1dabf1d9c12c62ed497a837a692df`](https://github.com/Chicitadel/ugondu/commit/318c022158b1dabf1d9c12c62ed497a837a692df) and evidence-sealed release head [`be549ffa6a2ddb1655c83f2b458dab56957aa0fb`](https://github.com/Chicitadel/ugondu/commit/be549ffa6a2ddb1655c83f2b458dab56957aa0fb).
- **Candidate CI run 40125624489:** Verified candidate pipeline run on candidate `318c0221...`.
- **Release CI run 40126588874:** 18 jobs configured; 17 passed successfully (workspaces, thin-clients, Docker validation, integration, governance); `Build & Publish Release` job was skipped (signed distribution not established).
- **Release COR run 40126588895:** All 3 configured jobs completed successfully: COR Certification, AWS Physical Qualification Gate, and COR Final Release Gate.
- **Live AI canary run 40125751718:** Single live canary verified HTTP 200 connectivity and inference for `sentinel-guard-v1` against provisioned endpoint.
- **Truthful Status Determination:** Configured COR gates pass for stated scope; Universal COR and unrestricted commercial launch remain **NOT GRANTED**.

### Finding F-22 Residual Hardening Acceptance Criteria
1. **Confirmed Improvement (Candidate `318c0221...`):**
   - Wildcard export `export * from './trusted-receipt'` in `server/engine-core/src/ai/index.ts` eliminated and replaced with explicit allowlist.
   - `createTrustedLiveInferenceReceipt` unexported from public AI barrel.
   - `TrustedReceiptService` restricts interface to validation and trust checks, eliminating public receipt-minting methods.
2. **Residual Hardening & Removal of Dev Constants:**
   - **Dev Keys Elimination:** Public barrel `server/engine-core/src/ai/index.ts` must NOT export development key identifiers or fallback constants (`DEV_FALLBACK_KEY`, `DEV_KEY_ID`). All development signing material must remain strictly non-exported and isolated to internal test fixtures.
   - **Endpoint Policy & SSRF Boundary:** Pinned host allowlist (`ai.airroofers.eu`) must be formally governed as an immutable security boundary invariant with documented anti-SSRF justification.
3. **Compiled Package Export Verification:**
   - Build-time assertion inspecting emitted declaration files (`dist/**/*.d.ts`) and compiled JavaScript artifacts (`dist/**/*.js`)—not merely TypeScript source files.
   - Regression contract asserting `createTrustedLiveInferenceReceipt`, `computeProvenanceSeal`, `getProvenanceSigningKey`, and `DEV_FALLBACK_KEY` are strictly absent from emitted package exports.
   - Packaging validation wired into CI build pipeline without silent skipping if build output is absent.
4. **Concrete Production Composition Path:**
   - Verify reachable production dependency graph instantiates only concrete HTTPS provider transport adapter without accepting arbitrary caller callback or transport injection.
5. **Adversarial & Tamper Negative Suite:**
   - Comprehensive automated adversarial tests covering:
     - Production key rotation and multi-process restart verification.
     - Revoked or unknown key rejection.
     - Development-key rejection in production configuration.
     - Replay attacks and stale candidate SHA rejection.
     - Malformed receipt structure, tampered provenance signatures, and host allowlist mismatches.

---

## 10. Platform and Universality Ledger

| Capability | Recorded State | Why it is not Universal Green | Exit Criterion |
|---|---|---|---|
| Windows/AMD64 | 🟢 Native runner evidence recorded | Verified on native runner with 186/186 tests | Complete native qualification suite passes |
| Linux/AMD64 | 🟡 Thin-client / CI runner recorded | Verified on Ubuntu via CI run 40112953491; full product lifecycle pending | Native runner full product verification passes |
| macOS/ARM64 | 🟡 Thin-client scope | Go thin-client passed; native-runner record limits claim to thin-client | Full product suite on native arm64, signing/notarization |
| Linux/ARM64 | 🔴 Cross-build recorded | Cross-build is not native runtime qualification | Native ARM64 runner for all required operations |
| macOS/AMD64 | 🔴 Cross-build recorded | Cross-build is not native runtime qualification | Native Intel macOS qualification, or formally out-of-scope |
| VS Code | 🔴 Experimental in declared matrix | Experimental status is not certification | Real install/auth/command/remote-workspace E2E; versioned range |
| JetBrains | 🔴 Unsupported | No qualifying implementation evidence | Real IDE integration and compatibility suite, or explicit exclusion |
| Cursor | 🔴 Unsupported | Must not infer support from VS Code | Cursor-specific install, auth and workflow E2E |
| Windsurf | 🔴 Unsupported | Must not infer support from VS Code | Windsurf-specific integration E2E |
| Neovim | 🔴 Unsupported | No qualifying integration evidence | CLI/LSP integration, diagnostics and lifecycle E2E |
| AWS | 🟢 Physical qualification verified | Physical conformance probes, OIDC credentials, and cleanup verified in runs 40112953367 and 40126588895 | Fresh operation-level physical qualification and artifacts |
| cPanel / DirectAdmin / SSH / Docker | 🟡 Target-dependent | Provider listing is not proof for every operation | Real provider-operation conformance and rollback/cleanup |
| GCP / Azure | 🔴 Unsupported in reviewed scope | Fail-closed behavior is correct, but not universal support | Implement real adapters and qualify, or explicitly exclude |

---

## 11. AI Platform Activation Checklist — ai.airroofers.eu

- [x] A live canary receipt is present and records endpoint `https://ai.airroofers.eu` (Run 40125751718; canary smoke test `sentinel-guard-v1`).
- [x] The receipt reports HTTP 200 for discovery and inference, model `sentinel-guard-v1`, and 30 available models.
- [x] Candidate SHA lineage verified across live canary workflow, candidate checkout, and evidence manifest (`318c022158b1dabf1d9c12c62ed497a837a692df`).
- [x] Freeze and validate deployed API contracts; sanitized schemas and receipts committed.
- [x] Reconcile live discovery with the Ugondu model catalog; validate IDs, capabilities, version, region and expiry (12 catalog entries vs 30 endpoint models).
- [x] Distinguish `discovered`, `eligible`, `smoke-tested`, `qualified`, `active`, `degraded`, `disabled` and `retired` ([`model-lifecycle.ts`](../../server/engine-core/src/ai/model-lifecycle.ts)).
- [ ] For every model marked active, enforce unforgeable `LiveInferenceReceipt` from trusted transport; missing live receipt throws typed 403 `LIVE_INFERENCE_RECEIPT_REQUIRED`.
- [x] Eliminate default-success capability probe fallback; genuine capability probe mandatory (503 fail-closed).
- [x] Test invalid/missing credentials, unknown model, malformed payload, timeout, rate limit, upstream 5xx, cancellation and schema mismatch.
- [x] Test tenant/product authorization, quotas, region/data-classification restrictions, secret redaction and audit correlation.
- [x] Ensure zero hardcoded provider/model inventories, URLs, credentials, or fixed locks in operational code.
- [x] Generate truthful candidate qualification report (0 qualified, 0 active, disabled) and bind it into evidence manifest.

---

## 12. UAIGOS Zero-Hardcoding and Zero-Stub Policy

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

## 13. Release Certification Commands & Final Acceptance

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
2. Every required workflow has a successful conclusion on the candidate or an authorized evidence-only descendant (Release CI run 40126588874 and Release COR run 40126588895 on candidate `318c0221...` and release head `be549ffa...`).
3. All mandatory in-scope targets and operations have fresh qualification evidence.
4. Zero-hardcoding and anti-stub governance checks pass against source and release artifacts.
5. No unresolved critical/high finding affects the release claim (F-08 through F-22 resolved or verified within bounded scope).
6. Unsupported IDEs/clouds remain explicitly excluded or are implemented and qualified.
7. The dashboard is generated from the canonical registry and evidence, and is not manually greened.
8. The final signed release bundle records run IDs, artifact digests, candidate SHA, scope, exclusions, expiry/review date and approver.

**Current conclusion:** Configured CI/CD and COR workflow gates passed on candidate `318c022158b1dabf1d9c12c62ed497a837a692df` and evidence-sealed release head `be549ffa6a2ddb1655c83f2b458dab56957aa0fb`. Maintain **QUALIFIED WITH BOUNDED TARGET SUPPORT — UNIVERSAL CERTIFICATION NOT GRANTED** until findings F-12 through F-22 and universality gap exit criteria are completely satisfied.


## Section 10 — 2026-10-25 03:43 UTC release-head failure reconciliation

**Authoritative update:** the prior 20:16 UTC status is superseded for the current candidate. Candidate `870aac95cfd8b183ac434e61fe8aa023b4606e91` has successful configured CI and a successful live AI canary, but evidence descendant `9a35f6803f0ea3fe63003f954d00ccc207200f84` failed the AWS Physical Qualification Gate in run [40139407362](https://github.com/Chicitadel/ugondu/actions/runs/40139407362). The COR Final Release Gate failed as expected. Do not report the current release head as COR-complete.

### F-23 — VPC quota exhaustion
- [ ] Inspect run log and AWS inventory/CloudTrail for the configured region.
- [ ] Determine whether stale resources are run-owned; never delete unowned/customer resources.
- [ ] Add quota preflight using actual service quota and current inventory.
- [ ] Serialize physical runs per account/region; use bounded retry and classify quota exhaustion as a non-retryable blocker until capacity is restored.
- [ ] Persist an ownership-tagged resource manifest immediately after each create.
- [ ] Exercise rollback after partial creation and verify no residual run-owned resources.
- [ ] Re-run physical qualification and require pass on the exact candidate SHA.

### F-24 — Synthetic S3 tag evidence on AccessDenied
- [ ] Remove the catch branch in `server/engine-core/physical-certification.ts` that returns expected tags on AccessDenied.
- [ ] Make AccessDenied, missing required tags, wrong transaction/run ID and provider errors fail closed.
- [ ] Add regression tests for AccessDenied, NoSuchTagSet, missing tag, wrong tag value, wrong run ID and successful observed tags.
- [ ] Verify the test's positive result comes from the actual AWS SDK response, not a synthetic fallback.
- [ ] Rerun all affected tests and physical qualification.

### AI and universality release blockers
- [ ] Keep model report in offline state until live per-model inference receipts and policy approval qualify models. Current report: 12 discovered, 0 qualified, 0 active, 12 disabled.
- [ ] Keep native scope explicit: Windows amd64 215/215 Node qualification tests; Linux amd64 Go thin-client/governance; macOS arm64 Go thin-client only; Linux arm64 and macOS amd64 cross-compiled only.
- [ ] Implement/qualify IDEs or remove unsupported IDEs from advertised support; unsupported behavior passing is not support certification.
- [ ] Complete real disposable host/cluster lifecycle tests for cPanel, DirectAdmin, VPS/SSH and Kubernetes; GCP/Azure remain unsupported until physical provider qualification.
- [ ] Publish/sign the release and test install, upgrade, rollback and uninstall from the published artifact; release-publishing job was skipped in run 40139407350.
- [ ] Refresh evidence manifest and dashboard from raw run outputs; no stale evidence may be carried forward.

**Exit rule:** Universal COR remains red until the latest AWS physical gate passes, no synthetic provider evidence remains, every mandatory AI model is qualified and approved, every advertised platform completes its native/physical lifecycle suite, and the signed release is install-tested from its published artifact.

**Detailed evidence and remediation:** [03:43 UTC follow-up audit](./COR_FOLLOWUP_AUDIT_AWS_PHYSICAL_FAILURE_AND_UNIVERSALITY_2026-10-25_0343Z.md).  
**Current colour-coded status:** [Certification dashboard](./CERTIFICATION_PROGRESS_DASHBOARD.md).


## Section 11 — 2026-10-25 04:41 UTC follow-up: quota recovery, run-lineage split and cleanup hardening

**Authoritative latest report:** [COR Follow-up Audit — VPC Recovery and Release Lineage, 04:41 UTC](./COR_FOLLOWUP_AUDIT_VPC_RECOVERY_AND_RELEASE_LINEAGE_2026-10-25_0441Z.md).  
**Dashboard:** [Certification Progress Dashboard](./CERTIFICATION_PROGRESS_DASHBOARD.md).  
**Candidate:** [`1f05cccb4a0148a91ec2f177dd0ecd5af11e7b82`](https://github.com/Chicitadel/ugondu/commit/1f05cccb4a0148a91ec2f177dd0ecd5af11e7b82).  
**Evidence-only descendant:** [`162b45898591546b66b789a433b069abe838338b`](https://github.com/Chicitadel/ugondu/commit/162b45898591546b66b789a433b069abe838338b).

### Current evidence reconciliation

| Evidence | Result at 04:41 UTC | Status meaning |
|---|---|---|
| Candidate CI run 40160710160 | Reported configured 18 jobs successful | 🟢 Scoped CI pass |
| AWS physical job 121071472638 in run 40160710161 | Passed physical certification, Fargate certification and residual scan | 🟢 Scoped physical pass |
| COR Certification in run 40160710161 | Evidence-freshness step failed; downstream release steps skipped | 🔴 That run is not release-green |
| Final gate in run 40160710161 | Failed | 🔴 Correct fail-closed outcome |
| COR Certification in run 40161212443 | Passed including evidence freshness, release integrity, trust root, fresh qualification and signing | 🟢 Scoped COR pass |
| AWS physical job in run 40161212443 | Still in progress at inspection | 🟡 Do not infer completion |
| Universal COR | Not proven | 🔴 Not granted |

**Mandatory rule:** Do not combine the physical pass from run 40160710161 with the COR pass from run 40161212443 as if one workflow run had passed every mandatory gate. Recheck the latest run after the physical job and final gate terminate. Confirm exact SHA, manifest hashes, receipt hashes and evidence-only diff. Any source/config/policy/workflow/dependency drift invalidates affected proof.

### F-23 status: quota incident recovered, cleanup safety still needs hardening

- [x] A later AWS physical job passed after the VPC quota incident.
- [ ] Resolve evidence-freshness failure from run 40160710161.
- [ ] Close run 40161212443 and record actual AWS physical/final gate conclusions.
- [ ] Harden `cleanupStaleTestVpcs`: require unique run UUID, owner marker, candidate SHA, creation timestamp/lease and durable resource manifest.
- [ ] Do not swallow DescribeVpcs/DescribeSubnets/DescribeSecurityGroups or delete failures; incomplete inventory or failed cleanup must block COR.
- [ ] Delete only resources proven owned by the expired run; never use `UgonduCOR=true` plus “different transaction ID” as the sole deletion authorization.
- [ ] Add active-run lease/concurrency protection, bounded retries, paginated inventory, idempotent cleanup and explicit residual resource IDs.
- [ ] Test permission denied, timeout, partial creation, deletion failure, incomplete pagination, active lease and unrelated-resource preservation.

### F-24 status: synthetic S3 fallback absent in inspected source; negative proof still required

- [x] Inspected current source no longer returns synthetic expected tags for AccessDenied.
- [x] `NoSuchTagSet` becomes an empty observation and required-tag assertions fail closed.
- [ ] Add/verify direct negative tests for AccessDenied, NoSuchTagSet, missing/wrong tags, stale transaction/run ID, timeout and 5xx.
- [ ] Confirm the positive case relies on the actual provider-observed SDK response.
- [ ] Run the tests and physical gate on the exact final candidate lineage.

### AI fleet activation

- [x] Live canary receipt records `https://ai.airroofers.eu`, discovery/execution HTTP 200, `sentinel-guard-v1`, and 30 endpoint-available models for candidate `1f05cccb...`.
- [ ] Do not infer fleet qualification or activation from endpoint discovery count.
- [ ] For every intended active model, perform authenticated live inference and validate endpoint identity, model/version, request ID, output digest, policy, region/data class, quotas and response schema.
- [ ] Issue a trusted signed receipt bound to candidate SHA and policy version for each qualified model.
- [ ] Require explicit policy approval before activation; unknown/stale/revoked/failed models remain disabled.
- [ ] Test credential rotation/expiry, replay, stale SHA, 401/403, 429, 5xx, timeout, DNS/TLS failure, malformed responses and secret redaction.

### Universal support and commercial release

- [ ] Windows amd64 full product lifecycle beyond 215/215 scoped Node tests.
- [ ] Linux amd64 and macOS arm64 full native product lifecycle.
- [ ] Linux arm64 and macOS amd64 native execution; cross-build alone is insufficient.
- [ ] IDE-specific E2E for every advertised IDE, or remove unqualified IDEs from support claims.
- [ ] Real disposable host/cluster lifecycle receipts for cPanel, DirectAdmin, SSH/VPS, Kubernetes and every advertised Docker host.
- [ ] Implement and physically qualify GCP/Azure or explicitly exclude them from support claims.
- [ ] Publish/sign an immutable release and test clean install, upgrade, rollback and uninstall from the actual published artifact.
- [ ] Generate the certification dashboard from verified machine-readable evidence and block release on any mandatory red/yellow/skipped row.

**Current conclusion:** **QUALIFIED WITH BOUNDED TARGET SUPPORT — UNIVERSAL CERTIFICATION NOT GRANTED.** The quota-related physical job success is meaningful progress, but evidence-freshness failure on run 40160710161 and the still-running physical job in run 40161212443 mean there was no fully verified all-gates-green release at the time of this snapshot.
