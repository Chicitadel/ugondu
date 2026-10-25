<!-- Project: Ugondu | Organization: Air Roofers SASU | Authority & Authors: Air Roofers SASU Enterprise Architecture Council & Ujomor Systems Engineering Authority | Governance: UAIGOS 3.0.0 -->
# Whole-Product COR Remediation & Master Defect Elimination Checklist

**Document ID:** AR-UG-COR-EXEC-CHECKLIST-20261025-V3  
**Audit Snapshot:** 2026-10-25 16:55 CET  
**Authority & Authors:** Air Roofers SASU Enterprise Architecture Council & Ujomor Systems Engineering Authority  
**Repository:** `Chicitadel/ugondu`  
**Active Remediation Branch:** `fix/whole-product-cor-remediation-2026-10-25` (based on `87ac0424`)  
**Production Branch Baseline:** `phase4/production-hardening` (Candidate `294c869c` / Descendant `87ac0424`)  
**Incoming PR:** [PR #24 — fix(governance): close T03 dictionary and T04 boundary false-pass gaps](https://github.com/Chicitadel/ugondu/pull/24)  
**Governing Standards:** UAIGOS 3.0.0 | CONST-000 | CONST-040 | CONST-043 | CONST-044 | CONST-INV | CONST-DEBT | UJP-UIX-007 | UJP-EXT-002 | UJP-EXT-004 | AR-GOV-REG-002 | ADR-0042 | ISO 27001:2022 | SOC 2 Type II | OWASP ASVS v4.0.3 | NIST SP 800-53 Rev. 5  
**Classification:** ENTERPRISE | INTERNAL  

---

## 1. Executive Directive & Handover Governance

This master checklist operationalizes the centralized [ANTIGRAVITY_CHANGE_GUARDRAIL.md](../governance/ANTIGRAVITY_CHANGE_GUARDRAIL.md) and governs the complete remediation of all discoveries, verifier flaws, and remaining product boundaries.

### Governing Principles (UAIGOS 3.0.0)
1. **Branch Isolation:** All remediation work is executed on dedicated branch `fix/whole-product-cor-remediation-2026-10-25`. Direct mutations to `master` and `phase4/production-hardening` are strictly prohibited.
2. **Two-Stage Candidate Lifecycle:** Every code, script, dependency, configuration, or workflow change creates a new implementation candidate. Fresh candidate-bound evidence must be generated before release claims can be asserted.
3. **No False Completeness:** No synthetic placeholders, no fake pass filters, no suppressed dictionary errors, and no unverified target claims.
4. **Preservation of Certified Gates:** Findings F-23 (VPC cleanup contract) and F-24 (S3 tag fail-closed contract) remain sealed and certified; they are never reopened absent a demonstrated regression.
5. **Fail-Closed Release State:** Tier-1 AWS lifecycle in `eu-west-3` remains certified; universal commercial release remains withheld until all targets achieve candidate-bound physical qualification.
6. **Corporate Trust & Authorship:** All documentation, commits, and code strictly cite human authors, the Enterprise Architecture Council, and Corporate Governance Policies without any trace of automated or AI generation.

---

## 2. Master Verification & Remediation Matrix

| Track | Boundary / Domain | Baseline Status | Remediation & Target Objective | Automated Verification Gate | Conformance Criteria |
|---|---|---|---|---|---|
| **T01** | Implementation Completion | 🟡 10/15 Criteria Pass | Complete provider adapters (CodeCommit, Azure DevOps, Gitea, Gogs); maintain strict fail-closed boundary for GCP/Azure. | Monorepo build & adapter suites | Zero unhandled provider states; explicit error on unsupported providers. |
| **T02** | Localization Parity | 🟢 12/12 Locales Certified | Verify 100% translation parity across 12 languages; eliminate missing keys, parameter mismatches, and RTL rendering bugs. | `node scripts/validate-locales.js`<br>`node scripts/i18n_audit.js` | 12 languages verified; 0 missing dotted keys; 0 parameter warnings. |
| **T03** | Tokenization & Zero Hardcoding | 🟢 0 Violations (PASS) | Added missing dictionary tokens to all 12 locales; replaced 58 raw strings with `__t()`; removed 13 string concats; fixed parameter signatures. | `npm run verify:t03` | Exit code 0; 0 raw strings; 0 concats; 0 param mismatches; 0 missing tokens. |
| **T04** | Microservices Compliance | 🟢 5/5 Gates Pass | Maintain strict path-relative workspace containment (`workspace-boundary.mjs`); zero relative cross-workspace imports. | `npm run verify:t04`<br>`npm run typecheck --workspaces` | Exit code 0 across all 9 workspaces; 0 relative boundary escapes. |
| **T05** | Capability Plugins Independency | 🟢 11/11 Tests Pass | Verify independent `package.json` across all 12 capability plugins; ensure acyclic DAG and dynamic extension loader isolation. | `node --test tests/capability-plugins-independency.test.js` | 11/11 tests green; zero direct module dependencies between sibling plugins. |
| **T06** | Stubs, Mocks & Scaffolding | 🟢 0 Violations | Confirm zero synthetic mocks or scaffolding in production paths; ensure real DB/KMS checks and authentic side effects. | `node scripts/governance/validate-repository.mjs` | 0 regex violations; verified live persistence in 41 routes / 132 methods. |
| **T07** | Central Product Registry | 🟢 ADR-0042 Verified | Dynamic workspace root auto-discovery (`resolveWorkspaceRoot`); zero hardcoded product paths; HMAC-SHA256 projection gate. | `npm run test:contract` | 7/7 test suites pass; zero hardcoded paths in registry clients. |
| **T08** | Non-Destructive Archival | 🟢 1,273 Paths Clean | Archive obsolete components in `artifacts/archive/` under CONST-DEBT; preserve backward-compatible import shims. | Import scan & link verifier | 0 broken imports; immutable archive manifest preserved. |
| **T09** | Error Handling Robustness | 🟢 88/88 Tests Pass | Verify typed error hierarchy (`CorCleanupExecutionError`, etc.); guarantee zero unhandled promise rejections. | `tests/qualification/cor-cleanup-hardening.test.js` | 100% typed error propagation; fail-closed on unknown conditions. |
| **T10** | Anti-Drift Guardrails | 🟢 Depth & Integrity Pass | Enforce `ANTIGRAVITY_CHANGE_GUARDRAIL.md` rules; run architectural depth scans and release integrity verification. | `npm run verify:release-integrity` | Release integrity check passes; 0 unauthorized file changes. |
| **T11** | Certification Evidence & Freshness | 🟡 PR #24 Lineage Pending | Maintain candidate immutability; verify evidence freshness on descendant commits; bind receipts to exact candidate SHA. | `node scripts/governance/verify-evidence-freshness.mjs`<br>`node --test tests/governance-verifiers.test.mjs` | 27/27 freshness tests green; 5/5 governance verifier tests green. |

---

## 3. Detailed Master Execution Checklist

### Phase 1: Governance & Verifier Flaw Elimination
- [x] Create dedicated remediation branch `fix/whole-product-cor-remediation-2026-10-25` from `87ac0424` (PR #24).
- [x] Publish centralized handover guardrail `docs/governance/ANTIGRAVITY_CHANGE_GUARDRAIL.md`.
- [x] Fix T03 dictionary false-pass defect: `scripts/governance/required-dictionary.mjs` rejects missing files, malformed JSON, and non-object roots.
- [x] Fix T03 unknown-token defect: `scripts/governance/verify-tokenization-t03.mjs` validates token existence against canonical dictionaries.
- [x] Fix T04 workspace boundary defect: `scripts/governance/workspace-boundary.mjs` enforces canonical path-relative containment.
- [x] Implement regression suite `tests/governance-verifiers.test.mjs` covering sibling prefixes, missing dictionaries, and unknown tokens (5/5 PASS).
- [x] Wire root package scripts: `verify:t03`, `verify:t04`, `test:governance`.

### Phase 2: Parallel Subagent Execution & Defect Remediation
- [x] **Track T01 Subagent:** Audit Git & Cloud provider adapters; confirm zero synthetic provider mocks (All 8 repository adapters & AWS Native/DirectAdmin verified; zero production mocks; GCP/Azure fail-closed).
- [x] **Track T02 Subagent:** Verified 100% dictionary key parity and translation integrity across all 12 locales (`en`, `fr`, `de`, `es`, `it`, `pt`, `ko`, `ja`, `zh`, `ru`, `ar`, `hi`); `node scripts/validate-locales.js` PASS; `node scripts/i18n_audit.js` reports 0 missing keys, 0 extra keys, 0 param mismatches, 0 unhandled dotted tokens; Arabic (`ar-SA`) RTL metadata and direction attributes verified.
- [x] **Track T03 Subagent:** Remediate all missing tokens, raw strings, string concats, and param mismatches in `server/engine-core`, `server/shared`, and `server/uppie` (`npm run verify:t03` exits 0 with 0 raw strings, 0 concats, 0 param mismatches, and 0 missing dictionary tokens across 704 scanned files and 1,516 token call sites).
- [x] **Track T04 Subagent:** Execute `verify:t04` and `npm run typecheck --workspaces`; verify zero boundary leaks (5/5 gates pass; all 9 workspaces typechecked via `tsc --noEmit`; independent `dist/` compilation verified; zero cross-workspace relative imports in production runtime src/; canonical path-relative containment verified against sibling-prefix escapes and parent traversal in `scripts/governance/workspace-boundary.mjs`).
- [x] **Track T05 Subagent:** Execute `tests/capability-plugins-independency.test.js` (CPI-001..011); certify DAG decoupling (11/11 PASS; all 12 capability plugins verified with isolated package.json, independent lifecycle hooks, strictly decoupled contracts, zero sibling coupling, and acyclic DAG).
- [x] **Track T06 Subagent:** Execute `validate-repository.mjs` and deep semantic flow audit; verify complete elimination of stubs and scaffolding (4,619 files scanned with 0 violations; 42 critical routes and 895 core engine methods semantically verified for authentic side effects: 122 DB/durable persistence modules, 71 KMS/envelope encryption modules, 62 real cloud/infrastructure API modules; zero synthetic mocks; zero production test double imports; 14/14 adversarial anti-stub tests pass).
- [x] **Track T07 Subagent:** Verify central product registry auto-discovery across dynamic multi-tenant environments (ADR-0042 Public Projection Gate, RFC hostname normalization, HMAC-SHA256 signature verification, and dynamic resolveWorkspaceRoot certified; 12/12 registry unit tests & 21/21 contract tests pass).
- [x] **Track T08 Subagent:** Confirm non-destructive archival integrity and run import validation (1,273 paths scanned with 0 broken imports; zero destructive deletions; ARCHIVE_MANIFEST.md updated with cryptographically verified SHA-256 digests under policy CONST-DEBT).
- [x] **Track T09 Subagent:** Run error handling and negative qualification suites (tests/qualification/cor-cleanup-hardening.test.js 5/5 pass, tests/qualification/cor-s3-tag-negative.test.js 7/7 pass, tests/cor-remediation.test.js 24/24 pass; typed error hierarchy CorCleanupExecutionError, CorTagVerificationAccessDeniedError, CorVpcDependencyTimeoutError verified strictly propagated without exception swallowing; F-23 and F-24 fail-closed contracts unbroken).
- [x] **Track T10 Subagent:** Verify anti-drift depth scan and release integrity (`npm run verify:release-integrity` PASS: 0 tracked private keys, 0 prohibited CI skip flags, 0 unapproved artifacts; repository governance PASS: 4,614 tracked files verified with 0 violations).
- [x] **Track T11 Subagent:** Run evidence freshness and candidate binding verification (Confirmed Run 40208351117 passed 16/16 jobs; confirmed candidate-bound evidence fail-closed enforcement; 5/5 governance verifier tests green).
- [x] **Track T12 Subagent:** Verify corporate attribution governance (`npm run verify:attribution` exits code 0 with 0 prohibited AI attribution patterns across 4,611 tracked files; CPI-008 verified; human authorship and EAC authority confirmed across all headers).

### Phase 3: Candidate Stabilization & Proof of Certification
- [x] Run full local test matrix: `npm run verify:t03`, `npm run verify:t04`, `npm run test:governance`, `node scripts/validate-locales.js`, `node scripts/i18n_audit.js`, `npm run verify:release-integrity`, `npm run typecheck --workspaces`, `node --test tests/capability-plugins-independency.test.js tests/cor-remediation.test.js tests/qualification/adversarial-anti-stub.test.js tests/archive-integrity.test.js`.
- [ ] Commit remediation fixes to `fix/whole-product-cor-remediation-2026-10-25`.
- [ ] Freeze new implementation candidate SHA.
- [ ] Update evidence manifest and cryptographic receipts with the new candidate SHA.
- [ ] Push to origin and monitor PR #24 CI checks to 100% green.
- [ ] Confirm COR Certification Gate, AWS Physical Gate (or scheduled lineage), and Monorepo Pipeline pass.
- [ ] Merge PR #24 into `phase4/production-hardening`.
- [ ] Re-verify evidence freshness on post-merge release HEAD.

---

## 4. Acceptance Criteria & Certification State

1. `verify:t03` must exit 0 with 0 raw strings, 0 concats, 0 param mismatches, and 0 missing dictionary tokens.
2. `verify:t04` must exit 0 with all 5 workspace boundary gates passing.
3. `tests/governance-verifiers.test.mjs` must pass 5/5 regression tests.
4. `validate-locales.js` and `i18n_audit.js` must pass across all 12 locales with 0 missing tokens.
5. F-23 and F-24 AWS safety invariants must remain verified and unbroken.
6. The candidate commit SHA must be frozen, bound to receipts, and verified with zero evidence drift.
