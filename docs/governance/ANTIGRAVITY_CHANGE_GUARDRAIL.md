# Ugondu — Antigravity Shared Change Guardrail & Handover

**Document ID:** AR-UG-ENG-ANTIGRAVITY-GUARDRAIL-2026-10-25  
**Repository:** https://github.com/Chicitadel/ugondu  
**Protected production branch:** `phase4/production-hardening`  
**Protected branch policy:** Never commit, push, reset, force-push, or merge directly to `master`. Do not change protected production branches except through an explicitly reviewed PR.  
**Purpose:** One canonical handover for Antigravity agents/actors so parallel work remains coordinated and does not duplicate, overwrite, regress, fork, or downgrade an existing implementation.

## 1. Non-negotiable operating rules

1. **Branch isolation:** Every actor works on a dedicated branch from the declared current base SHA. No direct writes to `master`, `phase4/production-hardening`, or another actor's branch. Use a PR for integration.
2. **One change owner per file/concern:** Before editing, declare the task ID, files owned, base SHA, intended behavior, tests, and dependencies in the PR description or handover ledger below. If a file is already owned by another active task, coordinate rather than overwrite.
3. **Inspect before implement:** Read the current implementation, tests, ADRs, contracts, and related guardrails first. Reuse and improve the existing architecture; do not introduce parallel abstractions, duplicate services, shadow registries, or replacement implementations without an approved ADR.
4. **No architecture downgrades:** Do not weaken type safety, security boundaries, tenancy isolation, fail-closed behavior, localization, evidence freshness, idempotency, observability, or error contracts to make a test pass. Do not delete a failing test instead of fixing the cause.
5. **No fake completeness:** No placeholders, synthetic fixtures in production paths, mocked integrations presented as live, stubs, TODO-based completion, hardcoded product/provider/OS lists where the registry is authoritative, or claims of 100% coverage without reproducible evidence. Tests may use explicit isolated fixtures, never as proof of live-provider qualification.
6. **Evidence is candidate-bound:** Any source, script, dependency, workflow, policy, runtime configuration, or build change requires a new implementation candidate and rerunning affected checks. Documentation-only descendants must not edit source or weaken freshness rules. Never rewrite an old receipt to imply it tested a new SHA.
7. **Keep certified findings closed:** F-23 and F-24 remain closed unless a reproducible regression demonstrates failure. Add regression tests; do not reopen them merely because unrelated product-wide gaps remain.
8. **Fail closed:** A missing verifier, missing dictionary, malformed manifest, skipped mandatory test, unqualified provider, unsupported target, stale receipt, or unknown status is FAIL/UNQUALIFIED—not PASS. Report partial coverage honestly.
9. **No silent scope change:** Preserve the intended behavior and API contracts. If a scope change is necessary, explain it, update the ADR/specification, add migration/backward-compatibility tests, and obtain review before implementation.
10. **No secret leakage:** Never commit credentials, private keys, tokens, production payloads, customer data, or raw environment dumps. Use approved secret references and redacted diagnostics.

## 2. Mandatory change protocol

For each task, the actor must:

1. Record task ID, owner/agent, base SHA, scope, files, risk, and acceptance criteria.
2. Inspect implementation and existing tests before coding; cite the exact evidence or reproduce the defect.
3. Make the smallest coherent fix in the owning module. Avoid unrelated refactors.
4. Add a regression test that fails on the defect before the fix and passes after it. Add negative/adversarial tests for security and boundary checks.
5. Run focused tests, module tests, typecheck/lint, localization/governance checks, and relevant integration/E2E suites. Record exact commands, exit codes, runtime, commit SHA, and logs/receipts.
6. Run repository integrity, anti-stub/scaffolding, dependency, secret, and evidence-freshness checks when applicable.
7. Review the final diff for duplicate logic, accidental scope, API drift, removed tests, untracked files, secrets, and architecture regression.
8. Open a PR with the defect, root cause, changed files, before/after behavior, tests/evidence, residual risks, and rollback notes. Keep draft until evidence is complete.
9. Require independent review and green mandatory CI. Never self-certify a skipped or unavailable check.
10. Update this shared note or its task ledger in the same PR. Do not mark a gap closed until the acceptance evidence is reproducible on the candidate SHA.

## 3. Required acceptance states

- **GREEN / CLOSED:** Code and tests exist on the candidate; mandatory checks pass; evidence is current, traceable, and independently reviewable.
- **YELLOW / PARTIAL:** Some implementation/evidence exists, but a defined acceptance criterion remains unproven.
- **RED / BLOCKED:** Confirmed defect, missing evidence, failed mandatory check, unsafe behavior, or unsupported target.
- **N/A:** Explicitly out of scope, approved and documented; never use N/A to hide a gap.

Overall release readiness is the least-ready mandatory dimension. A green AWS lifecycle does not imply universal OS, IDE, host, cloud, or AI-provider qualification. No aggregate “100% COR gap close” claim is permitted while any mandatory item is yellow/red.

## 4. Current verified defects addressed by this branch

- **T03 dictionary false-pass path:** The prior verifier silently returned an empty dictionary when a required locale file was absent or malformed. That could suppress placeholder mismatch detection while still allowing a PASS. This branch changes missing/malformed/non-object dictionaries into a fail-closed error.
- **T03 unknown-token false-pass:** The prior verifier did not require each statically extracted token key to exist in the merged canonical dictionaries. This branch reports missing dictionary tokens and exits non-zero.
- **T04 workspace prefix boundary flaw:** The prior verifier used `resolvedPath.startsWith(wsDir)`; a sibling such as `server/shared2` can share the prefix `server/shared` and be incorrectly accepted. This branch uses canonical `path.relative` containment and adds adversarial tests.
- **Production-branch integration gap:** The prior production branch did not contain the reported T03/T04 verifiers. This branch brings reviewed verifier scripts into the implementation candidate and wires explicit root scripts. Their results must be executed on CI before they can be treated as certification evidence.
- **Governance gate wiring gap:** The attribution, T03, and T04 verifier commands existed as standalone package scripts but were not invoked by the aggregate `governance:validate` command or the CI release-integrity job. The remediation branch now wires them into both places and adds a regression test to prevent future removal. This finding is only GREEN after the latest-head CI run proves those exact steps pass.

## 5. Current release blockers — do not paper over

- AI model fleet report currently records `CATALOG_OFFLINE`, zero qualified and zero active models; only models with authentic live candidate-bound receipts may be activated.
- Native full-lifecycle qualification is incomplete for some OS/architecture combinations; cross-compilation is not native lifecycle evidence.
- JetBrains, Cursor, Windsurf, Neovim and other non-VSCode integrations remain unsupported until each has an end-to-end receipt.
- Universal multi-cloud/host/provider support and immutable commercial artifact install/upgrade/rollback/uninstall lifecycle are not granted until their acceptance suites pass.
- T03's static scan is a heuristic, not a mathematical proof of zero hardcoded user-facing strings. Treat findings as bounded by its scanner rules and supplement with AST/runtime/UI tests.
- T04's static checks complement, but do not replace, independent workspace builds, package export tests, dependency graph checks, and integration/E2E execution.

## 6. Shared work ledger

| Task ID | Owner/agent | Base SHA | Files/concern | Status | Evidence / PR |
|---|---|---|---|---|---|
| COR-REM-001 | Enterprise Architecture Council | `87ac04242b4d55f38b4ef644549cea9ff38f57c7` | T03/T04 verifiers, 12-locale parity, tokenization, plugin manifests, anti-stub validation, attribution gate | GREEN / IMPLEMENTED | PR #24 (`verify:t03`, `verify:t04`, `verify:attribution`, `test:governance`, 55/55 test suites pass) |
| COR-REM-002 | Systems Engineering & Governance Authority | `fix/whole-product-cor-remediation-2026-10-25` | AI provider fleet qualification | RED / Blocked (Fail-Closed) | Catalog offline; live canary proves single endpoint; universal commercial release withheld |
| COR-REM-003 | Systems Engineering & Governance Authority | `fix/whole-product-cor-remediation-2026-10-25` | Native OS/IDE/host/cloud qualification | YELLOW / Partial (Fail-Closed) | Windows amd64 native pass; Linux thin-client pass; GCP/Azure & non-VSCode IDEs fail-closed |
| COR-REM-004 | Systems Engineering & Governance Authority | `fix/whole-product-cor-remediation-2026-10-25` | Immutable customer artifact lifecycle | RED / Blocked (Fail-Closed) | Clean install → upgrade → rollback → uninstall digest chain pending disposable environment receipts |
| COR-REM-005 | Systems Engineering & Governance Authority | `fb8f66d34ef66fa253452d19d5079a892d35925d` | COR workflow PR-vs-release gate semantics (`.github/workflows/cor.yml`, `tests/qualification/cor-workflow-gates.test.js`) | GREEN / PR VALIDATION VERIFIED | PR #24 (COR run #408: 40223142347 passed with PR validation notice; CI/CD run #521: 40223142249 passed 16/16 jobs; COR-WF-017 & COR-WF-018 verified passing in CI; Universal release remains fail-closed) |
| COR-REM-006 | Systems Engineering & Governance Authority | `3267d637b1473ab02aff906e697aefafb297040e` | Mandatory attribution/T03/T04 verifier CI wiring (`package.json`, `.github/workflows/ci.yml`, `tests/governance-verifiers.test.mjs`) | GREEN / PR CI verified | CI/CD run #541 `40236147953`: attribution PASS, T03 PASS, T04 PASS, governance verifier regression suite 8/8 PASS; COR run #428 `40236147971` passed PR validation only; AWS gate skipped as required for PR |
| COR-REM-007 | Systems Engineering & Governance Authority | `3267d637b1473ab02aff906e697aefafb297040e` | T04 CI build prerequisite (`package.json`, `.github/workflows/ci.yml`, `tests/governance-verifiers.test.mjs`) | GREEN / PR CI verified | Run #533 failure reproduced and fixed; CI/CD run #541 `40236147953` proves locked install/build prerequisite, T04 5/5 gates PASS, regression suite 8/8 PASS |

Before taking a task, update the ledger in the same PR and check for an existing owner. After completion, record the PR, commit SHA, test commands/results, and remaining limitations.

## 7. Anti-drift merge checklist

- [ ] Base SHA and branch protection confirmed; no `master` mutation.
- [ ] No overlapping file ownership or duplicate implementation.
- [ ] Regression tests prove the original defect is caught.
- [ ] Focused and full required CI checks pass on the exact PR head.
- [ ] All source/policy/dependency/config/workflow changes have fresh evidence; stale receipts are not reused.
- [ ] No failing/skipped required gate is described as green.
- [ ] API contracts, localization, security, tenancy, rollback and compatibility reviewed.
- [ ] Diff contains no unrelated changes, secrets, generated junk, or removed safeguards.
- [ ] Release matrix updated with evidence links and honest residual status.
- [ ] Independent review completed; merge only through reviewed PR.

## 8. Change summary for handover

This branch integrates the previously reported T03/T04 verifier scripts, seals dictionary/boundary false-pass gaps, completes whole-product tokenization (0 raw strings, 0 concats, 0 param mismatches across 704 files and 1,516 callsites), establishes 100% dictionary key parity across all 12 supported enterprise languages (2,184 keys each), adds independent package.json manifests for capability plugins (11/11 tests pass), adds non-destructive archival integrity tests (6/6 pass, 1,273 source imports verified), introduces the corporate attribution verification gate (`verify-ai-attribution.mjs`, 0 violations across 4,611 files), and verifies 0 typecheck errors across all 9 monorepo workspaces. In strict accordance with UAIGOS 3.0.0, Tier-1 AWS lifecycle in `eu-west-3` remains certified; universal commercial release remains withheld until unverified targets achieve genuine physical qualification.


## 9. Newly confirmed CI orchestration defect — COR-REM-005

**Root cause:** `.github/workflows/cor.yml` intentionally skips `aws-physical-gate` on `pull_request` events to avoid live infrastructure mutation from unmerged code, while `cor-final-release-gate` unconditionally required both `cor` and `aws-physical-gate` to be `success`. Consequently, a pull request could pass the COR Certification job and still fail the final release gate solely because the AWS job was deliberately skipped. This made PR validation and release certification semantics inconsistent.

**Direct implementation:** The final gate now has an explicit `pull_request` branch. It requires COR result `success` and AWS result `skipped`, emits a notice stating that this is PR validation only and **NOT RELEASE CERTIFIED**, then exits successfully. For push/workflow-dispatch release qualification, both COR and AWS physical gates must still be `success`; skipped/failure/cancelled/missing remain failures.

**Regression protection:** Added `COR-WF-017` in `tests/qualification/cor-workflow-gates.test.js` to assert the explicit PR-only branch and non-certification notice. The test assertion was corrected in the follow-up commit to match the actual shell condition.

**Evidence boundary:** The workflow and test were changed after the candidate recorded in the current evidence manifest. The existing candidate-bound evidence is therefore stale for this new workflow code until the approved candidate-freeze/requalification/evidence-descendant process completes. Do not treat the upcoming CI result as final COR certification.

### COR-REM-005 follow-up: release-only evidence freshness

A second workflow defect was confirmed: the candidate-bound freshness check ran on unmerged pull requests even though PR code is expected to differ from the last frozen release candidate. This caused the PR to fail the release evidence-binding step before the PR-specific final-gate semantics could be exercised.

**Direct fix:** The `Verify evidence freshness (candidate-bound, evidence-only descendant)` step now runs only when `github.event_name != 'pull_request'`. The check remains mandatory for push and workflow-dispatch release qualification. The PR workflow still runs build, typecheck, locale/I18N, architecture/import, workspace tests, governance, release-integrity and COR qualification checks, but its successful result is explicitly **PR validation only**, never release certification.

**Regression:** `COR-WF-018` asserts the freshness step's event condition and the explicit non-certification wording. `COR-WF-017` preserves the PR final-gate semantics. Both assertions passed in local regression (18/18 PASS) and on GitHub Actions CI.

This separation does not weaken release certification: the release event still requires fresh candidate-bound evidence and both COR and AWS physical gate success.

### COR-REM-005 CI Verification Result — 2026-10-25 18:55 UTC

- **PR Head:** `c6cb12f03bb69c40c07d4165309968c53b89ed36`
- **COR Certification Run #408 ([40223142347](https://github.com/Chicitadel/ugondu/actions/runs/40223142347)):** **SUCCESS**.
  - `COR Certification` job: ✓ Passed in 2m5s (clean execution of all 24 COR tests, 19 adversarial evidence tests, 6 mode-parity tests, and 18 workflow gate tests including `COR-WF-017` and `COR-WF-018`).
  - `AWS Physical Qualification Gate`: Intentionally skipped for PR events (0s).
  - `COR Final Release Gate`: ✓ Passed in 2s with verified notice: `PR VALIDATION PASSED for f915ba665dbaf1dc13fd546b895e0c3da115060a; AWS physical qualification was intentionally skipped. NOT RELEASE CERTIFIED.`
- **Ugondu CI/CD Pipeline Run #521 ([40223142249](https://github.com/Chicitadel/ugondu/actions/runs/40223142249)):** **SUCCESS (16/16 jobs green)**:
  - `Release Integrity & Governance Gates`: ✓ Passed in 16s.
  - `Build Go Thin-Client` (all 5 targets: darwin/amd64, darwin/arm64, linux/amd64, linux/arm64, windows/amd64): ✓ Passed.
  - `Build Microservices & Workspaces` (all 9 workspaces): ✓ Passed.
  - `Integration Tests` (11 test suites): ✓ Passed in 1m9s.
- **Fail-Closed Release Boundary:** Universal commercial release remains strictly withheld. Only Tier-1 AWS lifecycle in `eu-west-3` is certified under candidate `45b07518e82c9089d68a38d87b4566b0dd0bcba9` / evidence descendant `fb8f66d34ef66fa253452d19d5079a892d35925d`. Unverified targets remain fail-closed until physical qualification receipts are produced.


## Latest-head verification update — 2026-10-25 20:25 UTC

- **Observed PR head:** `a5f978e177c54762daccdc5d785c772abc372339` (PR #24 remains open, draft, unmerged).
- **COR workflow:** [run 40230376169](https://github.com/Chicitadel/ugondu/actions/runs/40230376169) completed successfully. Its COR Certification job passed; the AWS Physical Qualification Gate was intentionally skipped for the PR; the final gate passed with the explicit notice `NOT RELEASE CERTIFIED`.
- **CI/CD pipeline:** [run 40230376160](https://github.com/Chicitadel/ugondu/actions/runs/40230376160) completed successfully. All 16 substantive build, governance, workspace and integration jobs passed; Docker validation and release publishing were skipped.
- **Regression evidence from COR job logs:** COR remediation suite 24/24, adversarial evidence suite 19/19, mode-parity suite 6/6, workflow gate suite 18/18. Both `COR-WF-017` and `COR-WF-018` passed on this run's tested PR merge candidate `ecfec790d411bbffec270f1d700350bb3f26243c`.
- **Scope limitation:** These are PR validation results, not a fresh non-PR AWS physical qualification or universal commercial release certification. Existing AI fleet, native target and customer artifact lifecycle blockers remain open.


## Latest re-audit addendum — mandatory governance verifier wiring

**Finding COR-REM-006 (confirmed):** `package.json` exposed `verify:attribution`, `verify:t03`, and `verify:t04`, but the aggregate `governance:validate` command did not execute them and `.github/workflows/ci.yml` did not invoke them in the Release Integrity & Governance Gates job. Thus a green existing CI run could not prove these standalone policy checks were enforced in CI.

**Direct code remediation on this branch:**
- `package.json`: `governance:validate` now runs attribution, T03, and T04 verifiers before the remaining governance validators.
- `.github/workflows/ci.yml`: added explicit required steps for attribution, T03, T04, and `test:governance`.
- `tests/governance-verifiers.test.mjs`: added a regression test asserting that both aggregate command wiring and CI workflow steps remain present.

**Acceptance state:** YELLOW until a CI run on the resulting PR merge candidate passes these steps and the expanded regression suite. No evidence manifests were edited or rebound. No direct change to `master` or `phase4/production-hardening`.


## Latest re-audit addendum — T04 clean-runner build prerequisite

**Finding COR-REM-007 (confirmed by CI run #533, 40235932762):** The T04 verifier requires generated `dist/` artifacts, but the isolated Release Integrity & Governance Gates job invoked `verify:t04` on a clean checkout before building workspaces. T04 therefore failed with `Missing dist/ directory` for eight runtime workspaces. Attribution and T03 passed; the governance regression suite was skipped because the job stopped at T04.

**Direct remediation on the dedicated branch:**
- `package.json` commit `8841996f0367d12e3ec72ffb3e45d8429c56ca8f`: aggregate `governance:validate` now builds workspaces before T04.
- `.github/workflows/ci.yml` commit `5313447ccecae303b75f2d2fc1ce2b7d49128c69`: added `npm ci && npm run build` immediately before T04 in the same CI job.
- `tests/governance-verifiers.test.mjs` commit `8b637c47fcddc6430f1f08c5d47e2f966b8048e9`: asserts aggregate build-before-T04 ordering and the CI build prerequisite step.

**Acceptance state:** YELLOW until latest-head CI confirms dependency installation/build succeeds, T04 passes, and the expanded regression suite runs and passes. Do not skip T04 or weaken its dist-artifact requirement. Keep the release fail-closed; universal commercial release remains not certified.


## Latest-head verification — 2026-10-25 21:35 UTC

**Observed PR source head:** `3267d637b1473ab02aff906e697aefafb297040e`. PR #24 remains draft/open/unmerged. The latest CI/CD run [#541 / `40236147953`](https://github.com/Chicitadel/ugondu/actions/runs/40236147953) and COR run [#428 / `40236147971`](https://github.com/Chicitadel/ugondu/actions/runs/40236147971) completed successfully for PR validation.

- Attribution verifier: PASS.
- T03 tokenization: PASS.
- Workspace build prerequisite before T04: PASS.
- T04 microservice/workspace conformance: `ALL 5/5 GATES PASSED`.
- Governance verifier regression suite: `8 tests, 8 pass, 0 fail`.
- COR certification tests passed; the AWS Physical Qualification Gate was intentionally skipped on the PR event; the final gate explicitly says `PR VALIDATION PASSED ... NOT RELEASE CERTIFIED`.

This closes the CI acceptance state for COR-REM-006 and COR-REM-007 on this PR validation run. It does **not** certify universal commercial release or rebind the older evidence manifest. AI model qualification remains `CATALOG_OFFLINE` (0 qualified, 0 active, 12 disabled); broader native target/IDE/host/cloud support and immutable artifact lifecycle qualification remain open. No evidence receipts or manifests were manually edited. Do not merge until the release authority's remaining gates and candidate-freeze protocol are satisfied.


## 16. Re-audit addendum — workspace coverage validator path containment (2026-10-25)

**Task:** UG-GOV-PATH-001  
**Implementation branch:** `fix/cor-workspace-coverage-path-containment-2026-10-25`  
**Scope:** `scripts/governance/validate-test-coverage.mjs` and `tests/governance-verifiers.test.mjs` only.

### Confirmed defect
The workspace coverage verifier joined each `package.json` workspace declaration to the repository root without first proving the resolved workspace path remained inside that root. A malformed or adversarial declaration such as `../outside-workspace` could make the verifier inspect a package manifest outside the repository and report on it as if it were an in-repository workspace. This undermined the verifier's repository-boundary contract.

### Direct remediation
- Added exported `isWorkspacePathWithinRoot(root, workspacePath)` using canonical `path.resolve` and `path.relative` containment.
- Rejects empty/non-string paths, absolute paths, parent traversal and any resolved path outside the root before reading a workspace manifest.
- Added regression coverage for valid relative paths, traversal, absolute paths, empty values and null values.
- No production branch or `master` was modified. No existing workspace architecture or script contract was replaced.

### Verification and release boundary
- Source and regression test changes are committed on the dedicated branch; CI execution is required to establish test PASS.
- Do not mark this finding GREEN until the workflow run checks out the exact branch head and the governance regression suite passes.
- This targeted verifier fix does not close AI fleet, native OS/IDE/host/cloud, immutable artifact lifecycle, or universal commercial qualification gaps. Overall release remains **NOT CERTIFIED** until the current candidate and all mandatory scope evidence pass.

## 2026-10-26 Task Ledger: UG-COR-SEC-012 — Policy-pack template path containment

- **Task ID:** UG-COR-SEC-012
- **Concern:** Policy-pack verifier (`scripts/governance/verify-policy-pack-digests.mjs`) allowed `templatePath` entries to escape policy-pack directory via traversal (`../`), absolute paths, or symlinks.
- **Owning Subagent / Authority:** Lead System Architect Ignatus Chika UJOMOR & Enterprise Architecture Council.
- **Code Changes:** Implemented `resolvePolicyTemplatePath()` with lexical containment, realpath containment, and regular file validation in `scripts/governance/verify-policy-pack-digests.mjs`.
- **Regression Tests:** Added `tests/policy-pack-path-containment.test.mjs` (3/3 tests pass).
- **Gate Wiring:** Added `npm run test:policy-pack-boundary` to `package.json` (`governance:validate`) and `.github/workflows/ci.yml`.
- **Status:** PASS locally (3/3 tests). Pushed to PR #24 branch for whole-product validation. Universal commercial release remains **NOT CERTIFIED**.



## 2026-10-26 Whole-Product Re-audit Addendum — consolidated implementation ledger

**Integration branch:** `fix/whole-product-cor-remediation-2026-10-25`  
**Base:** `phase4/production-hardening` at `87ac04242b4d55f38b4ef644549cea9ff38f57c7`  
**Rule:** Keep all findings below on this integration branch and in the canonical PR #24; do not create competing copies of the same remediation on parallel branches. Close or mark superseded any duplicate PR only after this branch contains the same code and its exact-head checks are recorded.

### UG-COR-AWS-BOOTSTRAP-001 — false-success AWS mutation paths

- **Owner scope:** `scripts/aws-conformance/reconcile-bootstrap-policy-pack.mjs` and `tests/qualification/bootstrap-fail-closed.test.mjs`.
- **Change:** Require verified RDS service-linked-role read-back; fail closed on generic policy update/attachment failures; require policy create/attach read-back; verify the final required-policy inventory.
- **Gate:** `npm run test:bootstrap-fail-closed`, added to `governance:validate` and CI Release Integrity & Governance Gates.
- **Acceptance:** Pending exact-head CI; no live AWS mutation is performed by unit tests.

### UG-COR-IMPL-001 — tenant policy digest placeholder

- **Owner scope:** `server/engine-core/src/tenant/policy/digest.ts` and `digest.spec.ts`.
- **Change:** Replace constant `digest-hash` with SHA-256; canonicalize JSON using the existing engine-core `canonicalize` dependency; validate unsupported/circular/non-finite input fail-closed.
- **Gate:** Engine-core Jest suite, all-workspaces tests and build.
- **Acceptance:** Pending exact-head CI; no digest result may be described as certified before tests pass.

### UG-COR-POLICY-REGION-001 / UG-COR-POLICY-DIGEST-001 — renderer scope and canonical digest

- **Owner scope:** `server/capabilities/src/continuity/RegionPolicyRenderer.ts` and `src/tests/region-policy-renderer.spec.ts`.
- **Change:** Accept multi-segment region naming forms; expand `aws:RequestedRegion` consistently with explicitly allowed multi-region resource rendering; delegate renderer digest to `CanonicalPolicyRegistry.computePolicyDigest`.
- **Gate:** Capabilities workspace tests, all-workspaces tests and build.
- **Acceptance:** Pending exact-head CI. Syntax acceptance is not live region-availability proof. Explicit allowed regions remain mandatory.

### Consolidated anti-drift requirements

1. Treat this file as the canonical coordination contract; update this ledger instead of creating alternate governance authorities.
2. Preserve the original baseline and keep `master` and `phase4/production-hardening` untouched directly.
3. Re-run affected suites after any source, package, test, workflow or evidence change; record exact candidate SHA and workflow URL.
4. Do not mark any finding GREEN until exact-head CI passes. Mocked AWS responses test error handling only and do not constitute live cloud qualification.
5. Universal COR remains **NOT CERTIFIED** while account/region portability of the signed pack, physical target matrix, AI model fleet, and immutable artifact lifecycle remain open.


### UG-COR-IMPL-002 — tenant policy resolver default-allow defect

- **Owner scope:** `server/engine-core/src/tenant/policy/resolver.ts` and `resolver.spec.ts`.
- **Confirmed defect:** missing rules could produce ALLOW; rule effects were not scoped to action/resource; the resource argument was ignored.
- **Change:** default deny for missing/malformed/unmatched input; scoped action/resource/principal/attribute matching; explicit DENY overrides ALLOW; wildcard matching escapes regex metacharacters.
- **Gate:** engine-core resolver Jest suite and all-workspaces build/test.
- **Acceptance:** Pending latest exact-head CI.

### UG-COR-IMPL-003 — policy impact analysis count-only defect

- **Owner scope:** `server/engine-core/src/tenant/policy/impact.ts` and `impact.spec.ts`.
- **Confirmed defect:** rule-array length differences missed same-length content mutations and could incorrectly report LOW risk/no approval.
- **Change:** recursively canonical rule fingerprints and multiset comparison; additions require approval; removals/changes are HIGH risk; unsupported rule values fail conservatively.
- **Gate:** engine-core impact Jest suite and all-workspaces build/test.
- **Acceptance:** Pending latest exact-head CI.

- **Handover:** `docs/audit/REAUDIT_HANDOVER_TENANT_POLICY_RESOLUTION_2026-10-26.md`.


## 2026-10-26 Addendum — Portable Shared-Host Launch & Federated Billing Boundary

**Task ID:** UG-PORTABILITY-BILLING-001  
**Owner branch:** `fix/hosting-portability-billing-persistence-2026-10-26`  
**Stacked PR:** [#29](https://github.com/Chicitadel/ugondu/pull/29), based on the whole-product candidate at `4cabc3533e81e0fb0e3890a9290489414984439c`.  
**Release posture:** implementation candidate only; exact-head CI/COR and target qualification pending.

### Required architecture invariants

1. **One codebase, host by configuration.** Hosting provider selection must not alter billing/entitlement semantics, policy contracts, service APIs, or canonical capability registry.
2. **AeroBill/Mandatag remain the entitlement authority.** In production the billing gateway must query the configured federated authority for each authorization. A local cache, local JSON file, replay cache, or stale idempotency response must not grant entitlement after authority revocation.
3. **Authority failure is fail-closed.** Missing production authority configuration, corrupt storage required by the current mode, or failed persistence must not be reported as ready and must not create a fallback authorization.
4. **Shared-host constraints are explicit.** Do not require Docker, root, systemd, or arbitrary background daemons for the shared-host profile. Use host-managed Node runtime/process supervisor, host TLS, private persistent storage, and cron only for bounded scheduled tasks. If prerequisites are absent, report the host unsupported/unqualified; do not emulate unsupported capabilities.
5. **DirectAdmin filesystem safety.** Shell quoting is not path containment. Validate path-segment identifiers before any remote filesystem mutation. Never delete a customer's domain tree unless ownership and created-resource provenance are independently verified.
6. **Truthful lifecycle status.** A directory existing does not prove an application has deployed, started, or passed health checks. The current native DirectAdmin application operation remains unqualified until installation/start/HTTP health is genuinely implemented and independently tested.
7. **Legal-policy source of truth.** Legal policies live at https://policies.airroofers.eu. Keep links and authority references in the repository; do not fork central legal text into parallel repo-owned versions.

### UG-PORTABILITY-BILLING-001 implementation ledger

- `server/engine-core/src/fabric/providers/directadmin-native-client.ts`: identifier and SSH-port validation; refused false app-deployment success; unqualified application deletion without ownership proof; safe identifier requirements on DB/storage/snapshot operations.
- `server/billing-gateway/src/db.ts`: strict load validation, no silent temporary fallback, atomic private-file writes, explicit readiness and write failures, preserve corrupt evidence, typed/localized storage errors.
- `server/billing-gateway/src/index.ts`: production authority required; production authorization bypasses cached local tokens and queries Air Roofers authority for each decision; no in-process idempotency authorization cache in production.
- `server/billing-gateway/src/__tests__/license-store-portability.spec.ts`: private file mode, reload persistence, corrupt-store behavior, configured path failure, write-failure mutation safety.
- `server/billing-gateway/src/__tests__/billing-gateway.spec.ts`: production authority freshness, missing-authority fail-closed cases.
- `server/engine-core/src/targets/__tests__/directadmin.spec.ts`: path traversal, SSH-port bounds, unqualified app deploy/delete behavior.
- `.governance/platform/deployment/shared-hosting.json` and `docs/deployment/SHARED_HOSTING_LAUNCH_AND_MIGRATION.md`: portable shared-host launch requirements and shared-host → VPS → AWS migration contract.
- Server and root locale catalogs: 7 new error keys across all 12 locale files; locale parity and T03 remain mandatory gates.

### Acceptance criteria

- Run all workspace builds/typechecks/tests on exact PR head, including the new billing/store and DirectAdmin suites.
- Run locale-parity and T03 checks; all 12 locales in both catalogs must contain each new key and preserve placeholders.
- Verify billing production tests prove a stale local token cannot authorize and upstream outage returns 503.
- Verify DirectAdmin negative tests run without connecting to a production host and no destructive command is performed for an unqualified application.
- Keep PR #29 draft until exact-head CI/COR results are fully known.
- Do not claim a live DirectAdmin deployment or shared-host support receipt without a non-destructive probe and authorized smoke test on the actual host.

### Qualification gaps intentionally left open

The profile is a deployment contract, not a claim that the current hosting account meets it. The actual hosting runtime and outbound authority connectivity need qualification. GCP/Azure physical qualification, AI model fleet receipts, and immutable release-artifact lifecycle remain separate universal-COR blockers.


## 2026-10-26 Addendum — UG-UPLM-BOOTSTRAP-UNIVERSAL-001 (Immediate Action)

**Owner branch:** `fix/universal-bootstrap-cloud-provisioning-2026-10-26`  
**Base:** `fix/hosting-portability-billing-persistence-2026-10-26`  
**Status:** IMMEDIATE ACTION / SPECIFICATION ADDED / RUNTIME IMPLEMENTATION AND PHYSICAL QUALIFICATION OPEN  
**Canonical specification:** [Universal Bootstrap & Cloud Provisioning Remediation](../audit/UNIVERSAL_BOOTSTRAP_CLOUD_PROVISIONING_REMEDIATION_2026-10-26.md)  
**Canonical capability registry:** [universal-bootstrap-capabilities.json](../../.governance/platform/bootstrap/universal-bootstrap-capabilities.json)

### Task boundary and anti-drift rules

- This task owns the canonical bootstrap capability manifest and its implementation blueprint. Before source edits, inspect and reuse the current UPLM/COR bootstrap, policy-pack registry, signer/digest logic, and tests. Do not add a second policy engine, duplicate capability registry, or interface-specific authorization.
- Root cause is an authority gap during first physical AWS staging deployment. Do not solve it by self-escalation or by granting `cloudformation:*` to the current IAM user or OIDC runner as the default.
- Bootstrap must return `AUTHORITY_GAP`, non-zero status and a durable checkpoint on denied required mutation. No dependent mutation, success status, or resume may occur before read-only reconciliation and authorization.
- Preserve separation between OIDC/base runner, execution role, CloudFormation service role, and workload runtime roles. Restrict `iam:PassRole` to explicitly approved service roles. Verify existing provider, trust, policies, boundaries, SCPs, region and account before create/change.
- Terraform, Route 53, ACM, CloudFront, CloudFormation and all other providers must use the same plan/approval/apply/verify/evidence lifecycle. CloudFront ACM viewer certificates require `us-east-1`; regional services use their target region.
- Community retains a safe useful deployment route. Higher editions add scale, automation breadth, policy granularity and governance depth; no tier bypasses safety or Air Roofers AeroBill/Mandatag entitlement authority.
- Do not mark a capability supported or this task GREEN until exact-head CI, positive/negative policy tests, and relevant physical provider receipts are fresh and independently reviewable.

### Task ledger

| Task ID | Owner branch | Concern | Status | Acceptance evidence |
|---|---|---|---|---|
| UG-UPLM-BOOTSTRAP-UNIVERSAL-001 | `fix/universal-bootstrap-cloud-provisioning-2026-10-26` | Single bootstrap manifest; IAM authority handoff; CloudFormation/Terraform/DNS/ACM/CloudFront; provider-neutral adapter contract; edition matrix; UI/CLI/IDE/agent parity | YELLOW / SPECIFIED, NOT IMPLEMENTED OR CERTIFIED | Source audit, regression tests, policy validation, exact-head CI/COR, authorized staging receipts, DNS/TLS checks, independent UAIGOS review |

### Immediate execution order

1. Re-audit source entrypoints, existing bootstrap/policy files and test coverage on the branch head; reconcile against the uploaded V9 policy bundle and existing UPLM specification.
2. Reproduce the exact denied AWS API operation and distinguish IAM policy denial from trust, SCP, permission-boundary, service-role, subnet/prerequisite and region/account failures.
3. Implement typed fail-closed authority handling and no-false-success regression tests before broadening permissions.
4. Integrate the single manifest into the existing capability registry and generate target-scoped AWS policy/handoff output; do not create an independent runtime registry.
5. Add governed Terraform, Route 53, ACM and CloudFront adapter paths, then additional provider/host adapters only when implemented.
6. Run focused tests, all relevant workspace/governance checks and exact-head CI/COR. Physical cloud tests must be authorized, isolated, cost-bounded and cleanup-safe.
7. Keep release certification withheld until authentic evidence covers each advertised capability. Existing AWS evidence does not certify the new candidate or other providers.



## 4. Universal bootstrap bundle completeness gate — UG-UPLM-BOOTSTRAP-UNIVERSAL-001

**Canonical package manifest:** `.governance/platform/bootstrap/universal-bootstrap-bundle.json`

The bundle manifest is the single required-artifact inventory for the universal bootstrap specification. The coordinated role and policy contracts are:
- `.governance/platform/bootstrap/universal-bootstrap-capabilities.json` — capability/provider/lifecycle registry.
- `.governance/platform/bootstrap/role-catalog.json` — logical role boundaries and role-binding invariants.
- `.governance/platform/bootstrap/policy-pack-contract.json` — plan-derived policy generation, validation, approval, installation, read-back, and rollback contract.
- `docs/audit/UNIVERSAL_DEPLOYMENT_RESOURCE_AUTHORIZATION_CATALOGUE_2026-10-26.md` — cross-platform resource/authorization inventory.
- `docs/audit/UNIVERSAL_BOOTSTRAP_CLOUD_PROVISIONING_REMEDIATION_2026-10-26.md` — implementation and remediation specification.
- `scripts/bootstrap/validate-bundle.mjs` and `tests/bootstrap-bundle-integrity.test.mjs` — structural validator and regression coverage.

### Mandatory implementation rules
1. Every runnable operation must map to a provider capability, lifecycle step, logical role, provider-native permission/action, target scope, prerequisite reads, mutation, wait/poll, rollback, verification and evidence action. Missing or ambiguous mapping is `AUTHORITY_GAP`.
2. Generate policy from the normalized approved operation graph and bind it to exact provider, account/tenant/project, region/location, environment, resource identifiers/tags, role identifiers, plan digest and approval. Do not use a static universal super-policy to claim coverage.
3. Maintain separate runner/base, bootstrap authority, execution, IaC service, workload runtime, DNS/TLS, state/artifact and verifier roles where applicable. A role may be collapsed only with explicit provider support and a proof that least privilege is preserved.
4. Verify effective authority including trust policies, identity/resource policies, permission boundaries, organization/SCP/tenant restrictions, session policies, service-role delegation and explicit denies. An attached policy alone is not proof of effective authority.
5. For every provider, distinguish `implemented`, `capability-probed`, `physically-qualified`, `unsupported` and `AUTHORITY_GAP`. Unknown must never become PASS. No provider is certified solely by a registry entry or JSON artifact.
6. The integrity validator is not a provider runtime or physical qualification test. Keep the PR draft until the validator and regression tests run on the exact candidate SHA, then implement and test provider adapters and produce target-bound execution receipts.
7. Never commit secrets or live credentials. Never grant standing administrator access, permit self-escalation, or broaden permissions merely to suppress an authorization failure.

### Validation commands
- `npm run bootstrap:validate` — manifest and cross-artifact integrity only.
- `npm run test:bootstrap-bundle` — bundle regression tests (6/6 PASS including runtime `UniversalBootstrapRuntime` derivation and validation).
- `npm run test:bootstrap-fail-closed` — existing fail-closed qualification tests plus bundle regressions (10/10 PASS).
- `npm run bootstrap:validate:strict` — intentionally exits nonzero until separate runtime/provider qualification is available; it must not be reported as a passing live qualification.

### 2026-10-26 Runtime Integration & Defect Remediation Update — UG-UPLM-BOOTSTRAP-UNIVERSAL-001

1. **Defect Fix — `.governance/platform/bootstrap/role-catalog.json` (`runner_base.scope`):**
   - *Root cause:* `runner_base` omitted the mandatory `scope` field required by `role-catalog.schema.json` and `scripts/bootstrap/validate-bundle.mjs`, causing `npm run bootstrap:validate` to exit with `ROLE_CONTRACT_INCOMPLETE: runner_base`.
   - *Fix:* Added `"scope": "approved caller identity, OIDC issuer/audience/repository/environment, and read-only target discovery plus scoped assume-role targets"` to `runner_base`. Verified `npm run bootstrap:validate` exits `0`.
2. **Defect Fix — `server/billing-gateway/src/__tests__/license-store-portability.spec.ts` (`./db` import):**
   - *Root cause:* Import path referenced `./db` instead of `../db`, failing TypeScript compilation under Jest (`TS2307`).
   - *Fix:* Updated import to `../db`. Verified `npm --workspace=server/billing-gateway test` passes `2/2 suites (14/14 tests)`.
3. **Runtime Integration — `server/capabilities/src/continuity/UniversalBootstrapRuntime.ts` & `CanonicalPolicyRegistry.ts`:**
   - Wired `.governance/platform/bootstrap/universal-bootstrap-bundle.json`, `universal-bootstrap-capabilities.json`, `role-catalog.json`, `policy-pack-contract.json`, and the 3 JSON schemas directly into `CanonicalPolicyRegistry` (`getUniversalBootstrapGovernance`, `listUniversalCatalogRoles`) and `UniversalBootstrapRuntime` without introducing duplicate policy engines or shadow registries.
   - Implemented CloudFormation template resource parser (`parseCloudFormationTemplateResources`) and plan-derived operation graph compiler (`derivePlanOperationGraph`) supporting `infrastructure/aws/dumcholu-pilot-staging.yaml` (all 14 resources + stack control-plane lifecycle + scoped `iam:PassRole`), Terraform S3/DynamoDB/KMS state backend and resources, Route 53 DNS record changes, ACM certificate region validation (`us-east-1` required for `CLOUDFRONT_VIEWER`; target region required for `REGIONAL_ALB_OR_APIGW`), and CloudFront distributions.
   - Implemented `generatePlanBoundPolicyPack`, `validatePolicyPackAgainstContract`, `diagnoseBootstrapDenial` (classifying IAM policy missing, explicit deny, SCP deny, permissions boundary deny, session policy deny, trust policy deny, missing `iam:PassRole`, and missing service-linked role into `AUTHORITY_GAP` with `exitCode: 1` and 0 subsequent mutations), and `resolveUniversalCapabilityAccess` across `community`, `professional`, and `enterprise` editions.
   - Added unit and adversarial regression tests in `server/capabilities/src/tests/universal-bootstrap-runtime.spec.ts` (`8/8 PASS`) and `tests/bootstrap-bundle-integrity.test.mjs` (`6/6 PASS`).

**Current evidence status:** Runtime integration, defect fixes, and regression suites pass locally; exact-head CI/COR verification on PR #30 is required before marking CI gates green. Physical cloud roles/policies and multi-provider live targets remain uncertified until candidate-bound physical receipts are produced.

### 2026-10-26 Exact-head verification — UG-UPLM-BOOTSTRAP-UNIVERSAL-001

- **Candidate:** `8f4a8244781e05a6d911e4ad67c49d46ad9219bf` (PR #30 branch; integrated via PR #31, draft, base `phase4/production-hardening`).
- **Ugondu CI/CD Pipeline:** run 40355055649 (pull_request) SUCCESS; run 40348557767 (workflow_dispatch) SUCCESS. Earlier run 40347263796 on `225f2ec1` failed on two tests (billing replay headers, DirectAdmin repair executor); both corrected in `8f4a8244`.
- **COR Certification:** run 40355055685 SUCCESS in PR-validation mode; AWS Physical Qualification Gate intentionally skipped. **NOT RELEASE CERTIFIED.**
- **Open (fail-closed):** authorised AWS staging receipts for the bootstrap runtime, GCP/Azure, AI model fleet (CATALOG_OFFLINE), actual DirectAdmin host qualification, immutable artifact lifecycle. Universal commercial release remains withheld.


## 2026-10-27 Addendum — UG-DIRECTADMIN-STAGING-PATH-001

**Owner branch:** `fix/directadmin-staging-path-containment-2026-10-27`  
**Parent candidate:** `326a7f75272ecbcfabc60cc19ba3b9c3c182a15e`  
**Finding status:** IMPLEMENTED IN CODE / REGRESSION WORKFLOW ADDED / EXACT-HEAD WORKFLOW PENDING  
**Canonical handover:** [DirectAdmin staging path containment](../audit/REAUDIT_HANDOVER_DIRECTADMIN_STAGING_PATH_CONTAINMENT_2026-10-27.md)

### Confirmed defect and physical remediation

- `tools/deploy-directadmin-staging.ps1` previously joined an untrusted `TargetSubdomain` to a path without validating DNS labels or verifying canonical path containment.
- The staging script and committed `health.json` used `STAGING_READY`, although the script does not upload, deploy, probe or physically qualify the live host.
- The script now validates DNS label syntax/length, resolves the staging root and target, requires the target to be a direct child of the canonical root, rejects path escapes, and verifies that `.htaccess` is a file resolved inside the target directory.
- Generated and committed health evidence now states `ARTIFACT_STAGED_NOT_HOST_QUALIFIED`, `host_qualification: NOT_RUN`, and `evidence_scope: artifact-only`.
- Added `tools/tests/Test-DeployDirectAdminStaging.ps1` for positive staging, traversal rejection, malformed DNS rejection and truthful evidence assertions.
- Added `.github/workflows/directadmin-staging-safety.yml` to execute the regression test on Windows without Pester or live-host credentials.

### Acceptance and anti-drift

1. Wait for the dedicated Windows workflow on the exact branch head; do not claim the new tests passed before the run completes.
2. Re-run repository CI and COR for the exact candidate SHA after all code, test, workflow and handover commits.
3. Treat this fix as local staging-path safety only. It does not qualify the actual DirectAdmin account or make the DirectAdmin application adapter production-ready.
4. Never claim live deployment/health from a staged artifact, a directory, or generated JSON alone.
5. Do not modify `master` or `phase4/production-hardening` directly; keep the work isolated in the dedicated branch and PR.
6. Universal COR remains **NOT CERTIFIED** until authentic, candidate-bound AWS, GCP/Azure, AI fleet, DirectAdmin host and immutable artifact lifecycle evidence is reviewed.


### UG-DIRECTADMIN-RESOURCE-LIFECYCLE-002 — fail closed on unqualified provider operations

- **Confirmed risks:** DirectAdmin database create/delete reported success without provider read-back/ownership proof; storage removal used `rm -rf` based only on a validated identifier; capability metadata overstated compute/database/delete/rollback support.
- **Code:** `server/engine-core/src/fabric/providers/directadmin-native-client.ts` now refuses unqualified database create/delete and storage deletion. Storage creation rejects an existing target and verifies directory presence/writability before returning. `server/engine-core/src/fabric/providers/directadmin.ts` now accurately marks hosted-app and database operations unsupported, storage conditional, and rollback/delete unsupported.
- **Tests:** `server/engine-core/src/targets/__tests__/directadmin.spec.ts` adds negative regression assertions for unqualified mutations. Run the engine-core workspace suite and full CI/COR on the final exact SHA.
- **Anti-drift:** Do not re-enable these operations by removing the fail-closed checks. Re-enable only after a durable ownership/provenance ledger, provider-native read-back, safe rollback, localized typed errors, positive/negative adapter tests, and authorized physical qualification exist.
- **Status:** IMPLEMENTED IN CODE / EXACT-HEAD FULL CI-COR PENDING. No DirectAdmin DB/app lifecycle certification is implied.


## 2026-10-27 Addendum — UG-GCP-BOOTSTRAP-UX-001

**Branch:** `feat/gcp-one-step-bootstrap-2026-10-27`  
**Handover:** [GCP One-Step Bootstrap Re-audit Handover](../audit/REAUDIT_HANDOVER_GCP_ONE_STEP_BOOTSTRAP_2026-10-27.md)  
**Status:** IMPLEMENTED IN CODE / EXACT-HEAD TESTS AND COR PENDING / GCP DEPLOYMENT NOT QUALIFIED

### Finding
The GCP setup path depended on manual console navigation and did not provide a one-command, plan-bound WIF bootstrap comparable to the AWS bootstrap bundle. The operator-facing experience risked confusing inherited organization-level IAM grants with the project's intended least-privilege configuration.

### Physical changes
- Added `scripts/bootstrap/gcp-one-step-bootstrap.mjs` with read-only plan generation and digest-approved apply.
- Added a canonical GCP bootstrap profile and registered its runtime, tests and workflow in the universal bundle.
- Added `npm run bootstrap:gcp` and `npm run test:bootstrap:gcp`.
- Added regression tests and `.github/workflows/gcp-bootstrap-safety.yml`.
- Apply mode enables only the bootstrap APIs, creates/reuses a repository-restricted GitHub OIDC provider and dedicated service account, grants only `roles/iam.workloadIdentityUser` to the exact repository principal, and verifies read-back.
- The bootstrap does not grant Owner, Editor, or workload deployment roles and does not create service-account keys.

### Mandatory invariants
1. Plan/apply must use the same stable SHA-256 plan digest. Any plan change requires fresh approval.
2. Never silently switch the active gcloud project. Require explicit target and verify project identity before mutation.
3. Never widen roles to bypass organization policy, IAM deny, permission boundary or missing mapping. Return a typed authority gap and stop.
4. Provider configuration and IAM bindings require post-mutation read-back; failed read-back is not success.
5. No user-supplied key material in chat, source control, bundle, or evidence.
6. WIF bootstrap success is not GCP workload deployment qualification. Workload services, scoped IAM synthesis, deployment, rollback and physical receipts remain outstanding.
7. Preserve central legal authority `https://policies.airroofers.eu` and Air Roofers AeroBill/Mandatag entitlement authority.
8. Keep changes on this dedicated branch; do not directly modify `master` or `phase4/production-hardening`.

### Required verification
Run `npm run test:bootstrap:gcp`, `npm run bootstrap:validate`, full CI, and COR on the exact final SHA. Then conduct authorized GCP staging qualification with read-back evidence before making any deployment-support claim.

- **Additional hardening:** read back enabled APIs and the WIF pool; verify the repository-restricted provider before adding the impersonation binding; refuse to attach federation to an existing service account with direct project-level grants. Prefer a fresh dedicated account and inspect inherited organization/folder IAM before any workload use.
- **Regression coverage:** a mocked successful bootstrap must pass API/pool/provider/IAM read-back; an existing privileged service account must be rejected before the WIF binding is added.

## 2026-10-27 Integration Head — Commit 2d44914

- **Candidate Branch:** `fix/universal-bootstrap-cloud-provisioning-2026-10-26` (PR #30)
- **Merged PRs:** Integrated `feat/gcp-one-step-bootstrap-2026-10-27` (PR #33 / `43dc2129`) containing GCP one-step WIF bootstrap, DirectAdmin staging path containment, truthful qualification labeling, and regression suites.
- **Verification Summary on Local HEAD:**
  - `npm run test:bootstrap:gcp`: 8/8 PASS
  - `npm run bootstrap:validate`: PASS (structural and schema cross-artifact integrity)
  - `node --test tests/deploy-directadmin-config.test.mjs`: 5/5 PASS
  - `node --test tests/policy-pack-path-containment.test.mjs`: 3/3 PASS
  - `powershell -ExecutionPolicy Bypass -File tools/tests/Test-DeployDirectAdminStaging.ps1`: PASS
  - `node scripts/governance/verify-ai-attribution.mjs`: PASS (0 prohibited phrases across 4,676 files)
  - `node scripts/governance/verify-tokenization-t03.mjs`: PASS (704 files, 1,527 callsites, 0 raw strings, 0 concats, 0 missing tokens)
  - `node scripts/governance/verify-microservices-t04.mjs`: PASS (5/5 gates conformant across 9 workspaces)
  - `node scripts/governance/validate-repository.mjs`: PASS (4,676 files verified with 0 violations)
  - `node scripts/governance/validate-capability-registry.mjs`: PASS (4 registries verified with 0 conflicts)
  - `node scripts/governance/validate-test-coverage.mjs`: PASS (9 workspaces verified)
  - `npm run test --workspaces`: 81/81 test suites PASS (798/798 tests pass)
  - `npm run test:security`: 24/24 PASS
  - `npm run test:integration`: 17/17 PASS
  - `npm run test:locales`: PASS (12 languages synchronized)
- **Status:** Integrated, clean, verified, fail-closed boundaries preserved. Universal release withheld until authorized physical cloud staging receipts exist.

## 2026-10-27 Integration Head — Azure Target Routing & Portability (PR #34)

- **Candidate Branch:** `fix/universal-bootstrap-cloud-provisioning-2026-10-26` (PR #30, PR #31)
- **Merged PRs:** Integrated `fix/azure-portability-cor-remediation-2026-10-27` (PR #34) delivering Azure Target Planning Adapter, TargetFabric routing for Kubernetes and Azure, target schema extension (`target.v1.json`), cost-gated fail-closed planning, and full 12-language localization.
- **Physical Changes:**
  - Added `server/engine-core/src/targets/azure.ts` with `AzureTargetAdapter` (<= 500 LOC, tokenized via `__t`, fail-closed executor registration requirement, cost-approval gates, and path traversal rejection).
  - Extended `server/engine-core/src/targets/fabric.ts` and `server/engine-core/src/targets/index.ts` to wire Kubernetes and Azure target adapters alongside DirectAdmin and Docker.
  - Extended `server/shared/schemas/target.v1.json` with `azure` targetType and `managed_identity`, `workload_federation`, `service_principal` authTypes.
  - Added 9 new Azure localization keys across all 12 supported languages in both `server/shared/locales/` and `locales/`.
  - Added regression tests in `tests/roadmap-r1-targets.test.js` (5/5 PASS).
  - Maintained zero raw strings across all 705 scanned files and 1,531 token callsites (Track T03 PASS).
- **Verification Summary on Local HEAD:**
  - `node tests/roadmap-r1-targets.test.js`: 5/5 PASS
  - `npm run verify:attribution`: PASS (0 prohibited phrases across 4,679 files)
  - `npm run verify:t03`: PASS (0 raw strings, 0 concats, 0 missing tokens across 705 files)
  - `npm run verify:t04`: PASS (5/5 gates conformant across 9 workspaces)
  - `node scripts/governance/validate-repository.mjs`: PASS (4,679 files verified with 0 violations)
  - `npm run test:bootstrap:gcp`: 8/8 PASS
  - `npm run test:bootstrap-fail-closed`: 10/10 PASS
  - `node --test tests/policy-pack-path-containment.test.mjs`: 3/3 PASS
  - `node --test tests/deploy-directadmin-config.test.mjs`: 5/5 PASS
  - `powershell -ExecutionPolicy Bypass -File tools/tests/Test-DeployDirectAdminStaging.ps1`: PASS
  - `npm run test:security`: 24/24 PASS
  - `npm run test:integration`: 17/17 PASS
  - `npm run test:locales`: PASS (12 languages synchronized)
- **Status:** Integrated, clean, verified, fail-closed boundaries preserved. Universal release withheld until authorized physical cloud staging receipts exist.


## 2026-10-27 Addendum — UG-GO-CLIENT-VET-001

**Owner branch:** `fix/go-thin-client-vet-and-module-imports-2026-10-27`  
**Handover:** [Go thin-client vet remediation](../audit/REAUDIT_HANDOVER_GO_CLIENT_VET_2026-10-27.md)  
**Status:** IMPLEMENTED IN CODE / EXACT-HEAD CI PENDING

### Confirmed finding
Integrated CI/CD run [40526372443](https://github.com/Chicitadel/ugondu/actions/runs/40526372443) failed all Go thin-client platform jobs at `go vet ./...` because `client/i18n/pack.go` used `strings.TrimSpace` without importing `strings`, and `client/engine/executor_test.go` imported a package path inconsistent with `client/go.mod`'s module declaration `ugondu/client`.

### Physical remediation
- Added the standard-library `strings` import in `client/i18n/pack.go`.
- Corrected the engine test import to `ugondu/client/i18n` matching `client/go.mod`.
- Aligned `ExecutionState` struct literal in `client/engine/executor_test.go` (`StateSequence: 1`, removed non-existent fields).
- Completed `VerifyCryptographicBindings` in `client/engine/executor.go` to enforce `ExecutionId` and `TransactionId` parity check against tampered states.
- Synchronized cryptographic binding mismatch tokens (`msg_cryptographic_binding_mismatch_executionid`, `msg_cryptographic_binding_mismatch_transactionid`) across all 12 corporate languages in `locales/` and `server/shared/locales/`.
- Added regression tests for trusted public-key override trimming and fallback behavior in `client/i18n/pack_test.go`.
- Added a focused handover note with exact failed-run evidence and mandatory verification commands.
- Verified locally in Docker container (`golang:1.22-alpine`):
  - `go vet ./...`: PASS (0 errors)
  - `go test ./...`: PASS (`cmd`, `engine`, `i18n` all passing)
  - Cross-compilation across all 5 target architectures (`linux/amd64`, `linux/arm64`, `windows/amd64`, `darwin/amd64`, `darwin/arm64`): PASS (`CROSS_BUILD_SUCCESS`)

### Non-negotiable follow-up
1. Re-run Go vet, tests, and cross-platform builds on the exact final SHA through CI.
2. Do not remove Go vet or skip affected packages to force green.
3. Keep the module path authoritative; fix imports rather than renaming the module as a workaround.
4. Cross-compilation is not native platform lifecycle qualification.
5. No direct changes to `master` or protected production branches. COR PR validation does not imply physical cloud qualification or public-release certification.


## 2026-10-27 Addendum — UG-COR-BINDING-001

**Owner branches:** `fix/universal-bootstrap-cloud-provisioning-2026-10-26` & `fix/cor-binding-reaudit-2026-10-27` (PR #37)  
**Handover:** [Cryptographic binding fail-closed handover](../audit/REAUDIT_HANDOVER_GO_CLIENT_VET_2026-10-27.md)  
**Status:** IMPLEMENTED IN CODE & REGRESSION TESTED IN DOCKER CONTAINER

### Confirmed defect
`VerifyCryptographicBindings` in `client/engine/executor.go` returned nil success when `state` or `env` was nil, and skipped comparisons when the envelope value was empty. This allowed empty envelope inputs to bypass persisted state verification upon resume.

### Physical remediation
- In `client/engine/executor.go`: nil inputs fail closed with `invalid_envelope_format`. Populated persisted bindings (`ExecutionId`, `TransactionId`, `PlanHash`, `TenantId`, `ProjectId`, `EnvironmentId`, `PolicyHash`) are strictly verified against supplied envelope values; empty supplied envelope values trigger mismatch errors.
- In `client/engine/executor_test.go`: added `TestVerifyCryptographicBindingsFailsClosedOnMissingInputs` covering nil state, nil envelope, empty executionId, and empty transactionId.
- In `client/engine/state.go`: `GetTransactionDir` sanitizes input by trimming whitespace and rejecting empty values.
- Verified in Docker container (`golang:1.22-alpine`):
  - `go vet ./...`: PASS (0 errors)
  - `go test -v -run TestVerifyCryptographicBindings ./engine`: PASS (both tests green)
  - Full client test suite (`cmd`, `engine`, `i18n`): PASS (0.190s)


## 7. Re-audit update — UG-COR-BINDING-001 (2026-10-27 17:39Z)

**Candidate commit examined:** `99d89092739cd7ff2cb7e0c43e394d12019005e0`  
**Remediation branch:** `fix/cor-binding-reaudit-2026-10-27`  
**Related PR:** [#37 — Fail-closed execution binding remediation](https://github.com/Chicitadel/ugondu/pull/37)

### Code and regression scope
- `client/engine/executor.go`: `VerifyCryptographicBindings` fails closed for nil state/envelope and compares each populated persisted binding against the envelope, including an empty supplied value. Localized error tokens are retained.
- `client/engine/executor_test.go`: fail-closed tests cover nil inputs and missing/mismatched binding cases.
- `client/engine/state.go`: `GetTransactionDir` validates the transaction identifier against empty/path traversal inputs in the candidate source. Do not count this as a new change without a candidate diff proving it changed in this remediation.

### Candidate-bound GitHub workflow evidence
- [COR Certification run 40545111554](https://github.com/Chicitadel/ugondu/actions/runs/40545111554): completed successfully for commit `99d89092739cd7ff2cb7e0c43e394d12019005e0`. Workspace build/tests, locale validation, I18N audit, architecture/import scans, typecheck, COR regression suite, evidence integrity and fresh COR qualification steps reported success.
- [Ugondu CI run 40545111529](https://github.com/Chicitadel/ugondu/actions/runs/40545111529): completed successfully; attribution, T03 tokenization, repository governance/anti-stub validation, workspace builds, T04 conformance and workspace tests reported success.
- [DirectAdmin Staging Safety run 40545111655](https://github.com/Chicitadel/ugondu/actions/runs/40545111655): path-containment and evidence-scope safety tests passed. This is a safety test, not proof of a completed live deployment.
- COR evidence artifact: `ugondu-cor-evidence-1e3a5488a719bc8c335a071e7d8a58f1db62e11a`, SHA-256 `f639183c5de286f499363e8cac1225d0db9df693a0851cf7b816ad53c9bcad56`.

### Mandatory limitations
- The COR workflow's **AWS Physical Qualification Gate was skipped**. Its signing-trust-root step was also skipped. The successful workflow is not a signed, complete multi-host production release certification.
- The uploaded Antigravity execution log reports Go `vet`, Go tests and five-target cross-compilation as passing, but it also records earlier failed/cancelled attempts and does not include the complete raw command logs. Treat those Go results as reported, not independently reproducible evidence, until exact-head CI artifacts or complete logs are attached.
- Live, candidate-bound physical execution receipts remain required for DirectAdmin and any AWS/GCP target included in the release scope.
- Public commercial release remains **BLOCKED / NOT FULLY CERTIFIED** until every mandatory physical gate and the final authorized COR decision passes on the release candidate.

### Required next action
PR #37 was merged into `fix/go-thin-client-vet-and-module-imports-2026-10-27` (not `master`/`main`). The merge does not waive exact-head Go `go vet ./...`, `go test ./...`, race tests where supported, cross-build results, repository governance checks, or required physical staging receipts. Any descendant source or test change invalidates prior candidate-bound evidence and requires rerunning affected checks.


## 8. Whole-product re-audit follow-up — localization test integrity (2026-10-27)

**Audit base:** `d283132258d9f7240eb1d71b1cc61630b3edfa85`  
**Dedicated remediation branch:** `audit/whole-product-cor-reaudit-2026-10-27`

### Confirmed defect: localization regression checks were permissive and mutated shared repository state

- The drop-in localization test accepted either the exact localized value or a debug-prefixed variant, and some assertions used broad substring alternatives. This could allow unintended output formatting or incomplete positional interpolation to pass.
- The test wrote `sw.json` into the repository's shared `locales/` directory. If a run terminated before its later cleanup section, the file could leak into a subsequent run and make results order-dependent.

### Physical remediation on the dedicated branch

- Replaced permissive OR/substring assertions with exact assertions for English, French, German, custom drop-in interpolation, English fallback, and unknown-token fallback.
- Moved the custom locale fixture into a unique operating-system temporary directory selected through `UGONDU_LOCALES_DIR`; added exit-time cleanup and restoration of the prior environment variable. The repository's shared locale directory is no longer written by this test.
- This is a regression-test integrity fix, not proof of complete product COR closure.

### Evidence and release boundary

- The changes are committed on the dedicated branch and are proposed through a draft PR; exact-head CI is still required.
- The reported 65 local COR suites are not equivalent to all physical provider/host qualification gates. The previously recorded AWS physical qualification and signing-trust-root steps were skipped, and the uploaded Antigravity log does not provide complete raw output for every Go command.
- Overall COR remains **PARTIAL / RELEASE BLOCKED** until mandatory exact-head checks and authorized physical qualification receipts are complete.


## 9. Whole-product re-audit follow-up — persisted state integrity (2026-10-27)

**Finding ID:** UG-COR-STATE-INTEGRITY-001  
**Audit base:** d283132258d9f7240eb1d71b1cc61630b3edfa85  
**Dedicated branch:** audit/whole-product-cor-reaudit-2026-10-27

### Confirmed defect

ExecutionState.ComputeHash and SaveState generated a deterministic SHA-256 state digest, but LoadState did not recompute or compare it before returning persisted state to the execution resume path. A changed state field could therefore be consumed without the existing integrity digest detecting the inconsistency. The digest is an integrity checksum, not a keyed signature; it detects inconsistent modification but is not proof against an attacker able to rewrite both state and digest.

### Physical remediation

- client/engine/state.go: LoadState now quarantines and rejects persisted state when stateHash is missing or differs from a freshly computed digest.
- client/engine/state_test.go: added regression cases for a modified state field and a missing digest; each requires ErrStateCorrupt and quarantine.
- The prior localization test-integrity changes remain in this same dedicated branch.

### Verification boundary

These code and regression changes are committed on the branch, but exact-head Go tests, go vet, race tests, and CI have not yet been independently observed as passing for this new head. The new test code must be formatted and run with gofmt, go test ./..., go test -race ./..., and go vet ./... before this finding can be marked GREEN.

This check validates the consistency of the stored digest. It does not make an unkeyed SHA-256 digest tamper-proof against an actor able to rewrite the entire state file. A stronger authenticity requirement would need a separately governed keyed MAC or signature design and key lifecycle, not a misleading claim about this digest.

Overall COR remains **PARTIAL / RELEASE BLOCKED** pending exact-head CI and mandatory physical qualification.

## 2026-10-28 re-audit addendum — persisted-state permissions and replacement safety

**Finding:** `UG-COR-STATE-IO-SECURITY-001` (confirmed in `client/engine/state.go`). The state writer ignored errors from `os.Chmod` when securing the transaction directory and temporary state file. It also deleted the prior `state.json` after a generic `os.Rename` failure before attempting a fallback rename. A permission-setting failure could therefore be treated as success, and an unrelated replacement error could destroy the last known-good state.

**Physical remediation on `audit/whole-product-cor-reaudit-2026-10-27`:**
- Check and propagate directory/file permission-setting failures; do not promote a state file when required permissions cannot be established.
- Replace the delete-before-retry path with `replaceStateFile`, preserving the previous state on failure.
- Use same-directory atomic rename on non-Windows systems and Windows `MoveFileExW` via `kernel32.dll` with `MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH` for replacement semantics.
- Extend `state_test.go` to assert POSIX directory mode `0700` and state-file mode `0600`; Windows ACL qualification is not inferred from POSIX mode bits.

**Acceptance:** `YELLOW / EXACT-HEAD CI PENDING`. This connector session authored the code and regression assertions but did not execute Go locally. Require `gofmt`, `go vet ./...`, `go test ./...`, Windows native build/test, and supported race tests on the resulting exact head. A failed replacement must leave the previous state intact. The unkeyed state digest remains a consistency check, not an authenticity guarantee.

Do not close whole-product COR from this focused fix. AI fleet qualification, provider/host/IDE coverage, physical lifecycle receipts, and immutable commercial artifact qualification remain separately gated.


## 2026-10-28 re-audit addendum — failed-save in-memory state rollback

**Finding:** `UG-COR-STATE-COMMIT-ATOMICITY-001` (confirmed in `client/engine/state.go`). `SaveState` previously advanced `StateSequence`, `PrevStateHash`, `UpdatedAt`, and `StateHash` on the caller's object before the new file had been durably replaced. If persistence failed, disk retained the old state while the in-memory state advanced, allowing a later retry to create a broken or misleading hash chain.

**Physical remediation:** `SaveState` now prepares a `nextState` copy, serializes and persists that candidate, and copies it back to the caller only after `stateFileReplacer` succeeds. A package-private replacement seam enables deterministic failure injection. `TestSaveStateReplacementFailurePreservesCommittedState` verifies that injected replacement failure leaves the previously committed file and persistence metadata unchanged while preserving the caller's intended domain mutation.

**Verification:** `YELLOW / EXACT-HEAD TESTS PENDING`. Source and regression test are committed; full Go tests/vet and CI have not been run in this session. Do not mark this finding GREEN until exact-head tests and platform builds pass.


## 2026-10-28 re-audit addendum — concurrent state-save temporary-file collision

**Finding:** `UG-COR-STATE-TEMP-COLLISION-001` (confirmed in `client/engine/state.go`). The fixed `state.json.tmp` name allowed concurrent writers for the same transaction to truncate or rename the same in-progress file. `SaveState` now uses `os.CreateTemp` in the transaction directory, sets explicit private permissions before replacement, and cleans up its unique temporary path. `TestConcurrentSaveStateUsesDistinctTemporaryFiles` injects replacement failures after both concurrent writers reach the replacement boundary, asserts distinct temporary paths, and verifies the previously committed file remains byte-for-byte unchanged. This prevents temp-file collision; it does not provide serialized multi-writer transaction semantics or resolve last-writer-wins business conflicts. Status remains `YELLOW / EXACT-HEAD TESTS PENDING`.

## 2026-10-28 re-audit addendum — persisted transaction identity binding

**Finding ID:** `UG-COR-STATE-IDENTITY-BINDING-001`.

**Confirmed defect:** `LoadState(txID)` opened the requested transaction's `state.json` and validated that the stored transaction ID was non-empty, but did not require it to equal the requested ID. A validly hashed state copied or placed under another transaction directory could therefore be returned as the requested transaction's state.

**Physical remediation:** `client/engine/state.go` now rejects empty or mismatched transaction IDs before digest verification, quarantines the offending file, and returns `ErrStateCorrupt`. `client/engine/state_test.go` adds `TestLoadStateRejectsTransactionIDMismatch`, using a valid self-consistent hash stored beneath a different transaction directory and asserting fail-closed rejection plus quarantine.

**Verification:** `YELLOW / EXACT-HEAD TESTS PENDING`. Source and regression test are committed on this dedicated branch; Go formatting, vet, tests, race tests, and platform builds have not been executed in this session. Do not close the finding until exact-head CI proves the test passes.

This identity check is not a substitute for an authenticated state MAC/signature or process-level concurrency control. Whole-product COR remains `PARTIAL / RELEASE BLOCKED`.

## 2026-10-28 re-audit addendum — dot-segment transaction path

**Finding ID:** `UG-COR-STATE-PATH-SEGMENT-001`.

**Confirmed defect:** `GetTransactionDir` rejected empty IDs, `..`, and path separators, but accepted the exact ID `.`. Joining this ID to the transaction root resolves to the root itself, so `state.json` would not be isolated under a transaction-specific directory.

**Physical remediation:** `client/engine/state.go` now rejects `.` in `GetTransactionDir` using the existing invalid-transaction-ID error path. `client/engine/state_test.go` adds `TestGetTransactionDirRejectsDotTransactionID` and verifies rejection by both path helpers and `SaveState`.

**Verification:** `YELLOW / EXACT-HEAD TESTS PENDING`. The source and regression test are committed on the dedicated branch; no Go test/vet/race/platform run has been executed in this session. Do not close without exact-head evidence.

Whole-product COR remains `PARTIAL / RELEASE BLOCKED`.

## 2026-10-28 re-audit addendum — canonical transaction ID on save

**Finding ID:** `UG-COR-STATE-CANONICAL-ID-001`.

**Confirmed defect:** `GetTransactionDir` trims transaction IDs for path construction, while `SaveState` serialized the original untrimmed ID. A save using a whitespace-padded ID could write to the canonical directory and return success, but `LoadState` would reject the saved payload because its embedded ID did not match the canonical transaction identity.

**Physical remediation:** `SaveState` now rejects IDs whose surrounding whitespace would be removed by `strings.TrimSpace`. `TestSaveStateRejectsWhitespacePaddedTransactionID` verifies the save fails and does not create the canonical transaction directory.

**Verification:** `YELLOW / EXACT-HEAD TESTS PENDING`. Whole-product COR remains `PARTIAL / RELEASE BLOCKED`.

## 2026-10-28 follow-up — nil execution-envelope constructor guard

**Finding ID:** `UG-COR-STATE-ENVELOPE-NIL-001`

- **Confirmed defect:** `InitStateFromEnvelope(env)` dereferenced `env` without validating it. A nil envelope caused a panic instead of a controlled fail-closed outcome.
- **Physical remediation:** `client/engine/state.go` now returns `nil` when `env == nil`, before constructing execution state. This avoids fabricating an unbound state when the required envelope is absent.
- **Regression coverage:** `client/engine/state_test.go` adds `TestInitStateFromEnvelopeRejectsNil`.
- **Contract note:** The existing constructor signature returns only a pointer and has no error channel. Returning nil preserves the public signature; callers must treat a nil result as invalid and must not proceed with execution.
- **Verification:** Source and regression test were committed to `audit/whole-product-cor-reaudit-2026-10-27`. Go formatting, tests, vet, race, and platform builds have **not** been executed in this session. Do not close the finding until exact-head CI evidence exists.
- **Release status:** This is a targeted fix only. Whole-product COR remains `PARTIAL / RELEASE BLOCKED`.

## 2026-10-28 follow-up — envelope transaction identity validation

**Finding ID:** `UG-COR-STATE-ENVELOPE-IDENTITY-001`

- **Confirmed defect:** The nil-envelope guard did not prevent a non-nil envelope with an empty or whitespace-padded `TransactionId` from producing an execution state that cannot be consistently persisted and reloaded.
- **Physical remediation:** `InitStateFromEnvelope` now returns nil when `TransactionId` is empty or is not canonical under `strings.TrimSpace`. The constructor's existing signature is preserved; callers must treat nil as a rejected envelope and stop execution.
- **Regression coverage:** `TestInitStateFromEnvelopeRejectsInvalidTransactionID` covers empty, whitespace-only, and whitespace-padded transaction IDs.
- **Verification:** Source and test committed on `audit/whole-product-cor-reaudit-2026-10-27`. Go formatting, unit tests, vet, race detector, and cross-platform builds have not been executed in this session. Do not close the finding until exact-head CI output is captured.
- **Release status:** Whole-product COR remains `PARTIAL / RELEASE BLOCKED`.

## 2026-10-28 follow-up — Go CI verification coverage

**Finding ID:** `UG-COR-CI-GO-QUALITY-GATES-001`

- **Confirmed gap:** The Go client CI job ran vet and tests but did not enforce repository Go formatting or run the race detector.
- **Physical remediation:** `.github/workflows/ci.yml` now fails the Go client job if `gofmt -s -l .` reports files needing formatting, and runs `go test -race ./...` on the Linux amd64 matrix leg. Race testing is deliberately not run on unsupported matrix legs.
- **Evidence boundary:** Workflow changes are committed on the dedicated branch, but this session has not observed a completed run for the resulting exact head. A workflow definition is not test evidence; the finding remains pending until the exact-head run and logs are inspected.
- **Release status:** Whole-product COR remains `PARTIAL / RELEASE BLOCKED`.


## 2026-10-28 re-audit — PR trigger coverage and AWS boundary

**Finding ID:** `UG-COR-CI-PR-BASE-FILTER-001`

- **Confirmed gap:** Both `.github/workflows/ci.yml` and `.github/workflows/cor.yml` included `audit/**` in PR base filters but omitted `fix/**`, while PR #39 targets `fix/go-thin-client-vet-and-module-imports-2026-10-27`. This made the workflow definitions in this branch insufficient to enable PR-triggered checks for that base pattern.
- **Physical change:** Added `fix/**` to the `pull_request.branches` filters in both workflow files on the dedicated audit branch. Commits: `9a2563bb61dec8eaf303ee832db6b1eae3d11cff` (`ci.yml`) and `84065ccba005b7318a29d3046960fd0e45694904` (`cor.yml`).
- **Important GitHub behavior:** A PR-triggered workflow is evaluated using the workflow definition available from its base branch. Since PR #39's current base does not yet contain this trigger change, this head-only edit does not by itself prove or guarantee that PR #39 will run those workflows. Do not modify the base branch outside the reviewed PR. Push-triggered runs on the audit branch should be inspected directly in GitHub Actions; the available workflow lookup here does not expose push-triggered runs.
- **Acceptance:** Keep this finding YELLOW until workflow runs are observed and their tested SHA equals the candidate SHA. Workflow YAML edits are not execution evidence.

**AWS and portability boundary:** Ugondu's Go thin client and its existing TypeScript workspaces remain this repository's scope. Dumcholu's Flutter/Spring Boot implementation belongs in `Chicitadel/dumcholu`; do not transplant Java/Flutter tasks into Ugondu. Any AWS deployment design must preserve configuration-driven provider adapters, keep Air Roofers Aerobill/Mandatag as the sole billing/entitlement authority, and avoid making AWS-specific assumptions mandatory for DirectAdmin/VPS portability. No AWS deployment or live physical qualification is claimed by this workflow change.

## 2026-10-28 re-audit addendum — multi-process transactional locking and stale state prevention

**Finding ID:** `UG-COR-STATE-LOCKING-001` (COR Track 7)

- **Confirmed defect:** Unique temporary files in `client/engine/state.go` prevented temporary filename collisions during concurrent writes, but did not provide multi-process transactional serialization or prevent stale writers from overwriting newer state. A process with a stale in-memory state could overwrite a newer sequence committed by another process.
- **Physical remediation:**
  - Implemented cross-platform transactional file locking for `SaveState` via an exclusive lock on `<txDir>/.lock` (`state_lock_unix.go` using `syscall.Flock`, `state_lock_windows.go` using `LockFileEx` via `kernel32.dll`).
  - Added package-private `stateLockAcquirer` hook in `client/engine/state.go` and defined `ErrStateStale`.
  - Inside the exclusive lock, `SaveState` checks committed disk state: if disk sequence exceeds caller sequence or if base hashes mismatch, it rejects the write with `ErrStateStale`, protecting committed state from stale or divergent overwrites.
  - Added comprehensive regression tests in `client/engine/state_test.go`: `TestConcurrentSaveStateSerializesWritersAndPreventsStaleState` and `TestStateFileLockAcquireAndRelease`.
- **Verification:** `YELLOW / EXACT-HEAD TESTS PENDING`. All Node.js governance, security, and contract test suites pass (attribution 0 violations across 4,690 files, T03 PASS, T04 PASS, 9/9 governance tests, 24/24 security tests, 21/21 contract tests). Go CI toolchain run is required on the exact candidate SHA before marking GREEN. Whole-product COR remains `PARTIAL / RELEASE BLOCKED`.

