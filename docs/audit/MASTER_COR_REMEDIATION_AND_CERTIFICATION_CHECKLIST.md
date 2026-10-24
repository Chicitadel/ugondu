<!-- Project: Ugondu | Authority: Ujomor Systems Engineering & Governance Authority | Organization: Air Roofers SASU -->
# Master COR Remediation, Unification and Proof-of-Certification Checklist

**Audit date:** 2026-10-24  
**Branch:** `phase4/production-hardening`  
**Candidate SHA:** `55447c495c1c086286774170f706fcbe9b6f6646`  
**Qualification verdict:** **QUALIFIED WITH BOUNDED TARGET SUPPORT — UNIVERSAL CERTIFICATION NOT GRANTED**  
**Governance baseline:** UAIGOS 3.0.0  
**Purpose:** Single durable master checklist for all COR re-audit findings, remediation state, evidence links, acceptance criteria and regression controls.

> **Evidence Lineage Reconciled:** The evidence manifest binds strictly to candidate SHA `55447c495c1c086286774170f706fcbe9b6f6646`. CI/CD run [40096092008](https://github.com/Chicitadel/ugondu/actions/runs/40096092008) passed across all 9 workspaces, all 5 Go thin-clients, Docker Compose validation and integration tests. COR run [40096091974](https://github.com/Chicitadel/ugondu/actions/runs/40096091974) passed COR Certification (uploading `ugondu-cor-evidence`) and AWS physical qualification. Live canary run [40095440577](https://github.com/Chicitadel/ugondu/actions/runs/40095440577) verified HTTP 200 API connectivity. Native runner execution (166/166 pass on native Windows host), offline model qualification report, and all evidence digests verify with zero non-evidence drift. Bounded target qualification is fully verified; universal certification remains withheld as experimental and out-of-scope targets (secondary IDEs, alternate clouds) fail closed by design.

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
| **P0** | AI Lifecycle Trust Boundary | Enforced unforgeable `LiveInferenceReceipt` from trusted transport (`airroofers-live-transport`) for production model activation; eliminated synthetic fallbacks; removed synthetic sentinel model default; enforced preflight endpoint and credentials format verification | [`model-lifecycle.ts`](../../server/engine-core/src/ai/model-lifecycle.ts), [`qualify-ai-models.mjs`](../../scripts/qualification/qualify-ai-models.mjs), [`model-lifecycle.spec.ts`](../../server/engine-core/src/ai/__tests__/model-lifecycle.spec.ts) | 🟢 17/17 spec tests pass; 15/15 qualification tests pass; synthetic fallbacks eliminated |
| **P1** | Per-Model Live AI Qualification | Separated dynamic live discovery from model activation; missing catalog fails closed (`MODEL_CATALOG_UNAVAILABLE`); report reflects 12 discovered, 0 qualified, 0 active, 12 disabled under offline candidate validation | [`ai_model_qualification_report.json`](../security/evidence/ai_model_qualification_report.json), [`qualify-ai-models.mjs`](../../scripts/qualification/qualify-ai-models.mjs) | 🟢 Truthful offline report committed; activeCount = 0 |
| **P2** | Evidence Manifest Completeness & Binding | Added `ai_model_qualification_report.json` to `REQUIRED_EVIDENCE_FILES` and manifest `evidenceFiles`; freshness verifier computes on-disk SHA256 digest and validates manifest inclusion | [`generate-evidence-manifest.mjs`](../../scripts/governance/generate-evidence-manifest.mjs), [`verify-evidence-freshness.mjs`](../../scripts/governance/verify-evidence-freshness.mjs), [`evidence-manifest.json`](../governance/evidence/evidence-manifest.json) | 🟢 8/8 manifest tests pass; 21/21 freshness tests pass; candidate digest bound |
| **P3** | Native OS/Architecture Matrix | Native runner executed on Windows host with 166/166 passing qualification tests; Ubuntu 24.04 verified in CI run 40096092008; macOS/ARM64 thin-client verified | [`native-runner-evidence.json`](../governance/evidence/native-runner-evidence.json), [CI Run 40096092008](https://github.com/Chicitadel/ugondu/actions/runs/40096092008) | 🟢 Windows/AMD64 166/166 pass; unproven: 0; Tier 1 bounded support granted |
| **P4** | IDE Integration Bounds | Declared VS Code as experimental; JetBrains, Cursor, Windsurf, Neovim declared unsupported; verified typed fail-closed errors on unverified capabilities | [`target-matrix.json`](../../config/qualification/target-matrix.json), [`target-matrix-fail-closed.test.js`](../../tests/qualification/target-matrix-fail-closed.test.js) | 🟢 10/10 fail-closed tests pass; unsupported IDEs fail closed by contract |
| **P5** | Cloud Provider Operation Matrix | AWS physical qualification verified in workflow 40096091974 with live EC2/Fargate and cleanup; secondary providers harmonized to `partial` with `receiptStatus: "receipts_pending"` | [`target-matrix.json`](../../config/qualification/target-matrix.json), [`platform-matrix.json`](../../config/qualification/platform-matrix.json), [COR Run 40096091974](https://github.com/Chicitadel/ugondu/actions/runs/40096091974) | 🟢 Matrix harmonized; secondary providers downgraded to partial |
| **P6** | Evidence Manifest / Target Matrix Discrepancy | Resolved discrepancy between `target-matrix.json` and `native-runner-evidence.json`; provider status derivation unified; target matrix reflects truth | [`generate-native-runner-evidence.mjs`](../../scripts/governance/generate-native-runner-evidence.mjs), [`native-runner-evidence.test.js`](../../tests/qualification/native-runner-evidence.test.js) | 🟢 7/7 native runner tests pass; matrix and runner reconciled |
| **P7** | Credential Hygiene & Sanitization | Redacted sample `raw_key` tokens in `admin_portal_provisioning_receipt.json` to `"REDACTED"`; verified zero active secrets leaked across repository | [`admin_portal_provisioning_receipt.json`](../security/evidence/admin_portal_provisioning_receipt.json) | 🟢 Provisioning receipt redacted; zero credential leaks |
| **F-08** | Transport Provenance Integrity | Eliminated caller-forged `source` strings; restricted activation to trusted provider transport (`airroofers-live-transport`) with authenticated `LiveInferenceReceipt` | [`model-lifecycle.ts`](../../server/engine-core/src/ai/model-lifecycle.ts), [`model-lifecycle-qualification.test.js`](../../tests/qualification/model-lifecycle-qualification.test.js) | 🟢 CLOSED; caller mocks & forged receipts fail closed (403) |
| **F-09** | Capability Probe Fallback Removal | Completely eliminated fallback `options.probeFn \|\| async () => ({ ok: true })`; mandatory genuine provider capability probe enforced; fails closed otherwise | [`qualify-ai-models.mjs`](../../scripts/qualification/qualify-ai-models.mjs), [`model-lifecycle-qualification.test.js`](../../tests/qualification/model-lifecycle-qualification.test.js) | 🟢 CLOSED; synthetic probe fallback eliminated; 503 on unverified probe |
| **F-10** | Evidence Candidate SHA Consistency | Unified candidate SHA across workflow input, manifest, canary, and freshness verifier; eliminates stale candidate baseline mismatches | [`verify-evidence-freshness.mjs`](../../scripts/governance/verify-evidence-freshness.mjs), [COR Run 40096091974](https://github.com/Chicitadel/ugondu/actions/runs/40096091974) | 🟢 CLOSED; run 40096091974 passed freshness; `ugondu-cor-evidence` uploaded |
| **F-11** | AI Scope Decoupling | Decoupled live canary smoke test (`sentinel-guard-v1`) from multi-model qualification report; `activeCount` strictly derived from verified active receipts | [`evidence-manifest.json`](../governance/evidence/evidence-manifest.json), [`ai_model_qualification_report.json`](../security/evidence/ai_model_qualification_report.json) | 🟢 CLOSED; truthful offline report (0 active); canary smoke test bound |

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
- **Problem Statement:** Stale candidate baseline (`d641981...` vs `55447c...`) caused freshness verification failures in earlier workflow runs and blocked artifact generation.
- **Acceptance Criteria:**
  1. Single explicit candidate SHA (`COR_CANDIDATE_SHA`) bound across workflow inputs, evidence manifest, canary receipt, native runner evidence, and freshness verifier.
  2. Stale default or pinned candidate baselines eliminated from all scripts and workflows.
  3. `verify-evidence-freshness.mjs` executes cleanly with zero non-evidence drift.
  4. COR Certification workflow run `40096091974` passed evidence freshness on candidate `55447c495c1c086286774170f706fcbe9b6f6646`, successfully uploaded `ugondu-cor-evidence` artifact, and passed AWS physical qualification gate.
- **Status:** 🟢 CLOSED.

### F-11 — Decoupling of Live Canary Smoke Test & Model Fleet Qualification Scopes
- **Problem Statement:** Live canary reported 30 available models and single execution, while qualification report recorded diagnostic probe / offline scope with zero active models, creating risk of scope conflation.
- **Acceptance Criteria:**
  1. Live canary workflow run `40095440577` explicitly documented and bound as single-endpoint connectivity/inference smoke test (`sentinel-guard-v1`, HTTP 200).
  2. AI model qualification report records truthful offline candidate validation (12 discovered, 0 qualified, 0 active, 12 disabled).
  3. `activeCount` derived strictly from verified active receipts, never manually inflated or inferred from catalog discovery.
  4. Evidence manifest digest-binds both receipts with non-overlapping scope declarations.
- **Status:** 🟢 CLOSED.

---

## 4. Platform and Universality Ledger

| Capability | Recorded State | Why it is not Universal Green | Exit Criterion |
|---|---|---|---|
| Windows/AMD64 | 🟢 Native runner evidence recorded | Verified with 166/166 tests on native runner | Complete native qualification suite passes |
| Linux/AMD64 | 🟢 Native CI runner recorded | Verified on Ubuntu 24.04 via CI run 40096092008 | Native runner CI verification passes |
| macOS/ARM64 | 🟡 Native Go thin-client only | Native evidence explicitly states Node qualification suite was not executed on this target | Native runner + full product qualification suite |
| Linux/ARM64 | 🔴 Cross-build recorded | Cross-build is not native runtime qualification | Native ARM64 runner for all required operations |
| macOS/AMD64 | 🔴 Cross-build recorded | Cross-build is not native runtime qualification | Native Intel macOS qualification, or formally out-of-scope |
| VS Code | 🔴 Experimental in declared matrix | Experimental status is not certification | Real install/auth/command/remote-workspace E2E; versioned support range |
| JetBrains | 🔴 Unsupported | No qualifying implementation evidence | Real IDE integration and compatibility suite, or explicit exclusion from product claim |
| Cursor | 🔴 Unsupported | Must not infer support from VS Code | Cursor-specific install, auth and workflow E2E |
| Windsurf | 🔴 Unsupported | Must not infer support from VS Code | Windsurf-specific integration E2E |
| Neovim | 🔴 Unsupported | No qualifying integration evidence | CLI/LSP integration, diagnostics and lifecycle E2E |
| AWS | 🟢 Physical qualification verified | Physical conformance probes, OIDC credentials, and policy reconciliation verified in COR run 40096091974 | Fresh operation-level physical qualification and artifacts |
| cPanel / DirectAdmin / SSH / Docker | 🟡 Target-dependent | Provider listing is not proof for every operation | Real provider-operation conformance and rollback/cleanup |
| GCP / Azure | 🔴 Unsupported in reviewed scope | Fail-closed behavior is correct, but not universal support | Implement real adapters and qualify, or explicitly exclude from universal scope |

---

## 5. AI Platform Activation Checklist — ai.airroofers.eu

- [x] A live canary receipt is present and records endpoint `https://ai.airroofers.eu`.
- [x] The receipt reports HTTP 200 for discovery and inference, model `sentinel-guard-v1`, and 30 available models.
- [x] Receipt SHA strictly equals candidate SHA (`55447c495c1c086286774170f706fcbe9b6f6646`) from live canary workflow run 40095440577.
- [x] Freeze and validate deployed API contracts; sanitized schemas and receipts committed.
- [x] Reconcile live discovery with the Ugondu model catalog; validate IDs, capabilities, version, region and expiry.
- [x] Distinguish `discovered`, `eligible`, `smoke-tested`, `qualified`, `active`, `degraded`, `disabled` and `retired` ([`model-lifecycle.ts`](../../server/engine-core/src/ai/model-lifecycle.ts)).
- [x] For every model marked active, enforce unforgeable `LiveInferenceReceipt` from trusted transport; missing live receipt throws typed 403 `LIVE_INFERENCE_RECEIPT_REQUIRED`.
- [x] Eliminate default-success capability probe fallback; genuine capability probe mandatory (503 fail-closed).
- [x] Test invalid/missing credentials, unknown model, malformed payload, timeout, rate limit, upstream 5xx, cancellation and schema mismatch.
- [x] Test tenant/product authorization, quotas, region/data-classification restrictions, secret redaction and audit correlation.
- [x] Ensure zero hardcoded provider/model inventories, URLs, credentials, or fixed locks in operational code.
- [x] Generate truthful offline qualification report (12 discovered, 0 qualified, 0 active, 12 disabled) and bind it into evidence manifest.

---

## 6. UAIGOS Zero-Hardcoding and Zero-Stub Policy

### Zero operational hardcoding
Prohibit unapproved hardcoded provider/model inventories, mutable endpoint URLs, region availability, credentials, tenant/product allowlists, host/IDE support declarations, operational quotas/retry settings, feature flags, environment-specific IDs and user-visible strings outside localization tokens.

Immutable protocol/security invariants and validated schemas may remain in code only when documented, reviewed and tested. Do not weaken fail-closed controls to achieve configurability.

### Zero production stubs and synthetic success
Production source, shipped bundles and release artifacts must contain no fake adapters, placeholder handlers, empty implementations, fake-success results or fixture-backed live responses. Unit-test doubles may exist only in isolated test paths. Live E2E and qualification must use real endpoints and authorized scoped credentials. Missing secrets/infrastructure means BLOCKED/NOT RUN, never PASS.

### Anti-regression requirements
- AST and import-graph scans for production-reachable mocks, stubs, placeholders and test fixtures (`validate-repository.mjs` verifies 4,561 files with 0 violations).
- Build artifact scans in addition to source regex scans.
- Adversarial tests for swallowed exceptions, empty handlers, synthetic status objects and skipped required gates (14/14 pass).
- Evidence manifest digest/signature verification and exact SHA freshness checks (21/21 pass).
- Unknown target/provider/model/capability fails closed with a typed error (10/10 pass).
- No manual dashboard green state without a linked, verified receipt.

---

## 7. Release Certification Commands

```bash
set -euo pipefail
git status --short
git rev-parse HEAD
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
node scripts/governance/verify-evidence-freshness.mjs
```

---

## 8. Final Certificate Acceptance

Final COR/UAIGOS closure is authorized only when:
1. The actual release HEAD, candidate SHA, evidence manifest and canary receipt form one valid, verified lineage.
2. Every required workflow has a successful conclusion on the candidate or an authorized evidence-only descendant (CI/CD run 40096092008 and COR run 40096091974).
3. All mandatory in-scope targets and operations have fresh qualification evidence.
4. Zero-hardcoding and anti-stub governance checks pass against source and release artifacts.
5. No unresolved critical/high finding affects the release claim (F-08 through F-11 resolved and verified).
6. Unsupported IDEs/clouds remain explicitly excluded or are implemented and qualified.
7. The dashboard is generated from the canonical registry and evidence, and is not manually greened.
8. The final signed release bundle records run IDs, artifact digests, candidate SHA, scope, exclusions, expiry/review date and approver.

**Current conclusion:** All mandatory in-scope Tier 1 targets and COR remediation requirements are verified and closed under candidate `55447c495c1c086286774170f706fcbe9b6f6646`. The evidence lineage is unified and passes freshness verification with zero non-evidence drift. Maintain **QUALIFIED WITH BOUNDED TARGET SUPPORT — UNIVERSAL CERTIFICATION NOT GRANTED** in accordance with corporate governance standards.
