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
| COR-REM-001 | Current implementation branch | `87ac04242b4d55f38b4ef644549cea9ff38f57c7` | T03 dictionary failure semantics; T04 path boundary; verifier tests; root scripts | Implemented on branch; CI pending | This branch / PR to be linked after creation |
| COR-REM-002 | Unassigned | New candidate SHA after CI | AI provider fleet qualification | RED / blocked | Live candidate-bound provider receipts required |
| COR-REM-003 | Unassigned | New candidate SHA after CI | Native OS/IDE/host/cloud qualification | RED / blocked | Per-target lifecycle receipts required |
| COR-REM-004 | Unassigned | New candidate SHA after CI | Immutable customer artifact lifecycle | RED / blocked | Clean install → upgrade → rollback → uninstall digest chain |

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

This branch integrates the previously reported T03/T04 verifier scripts into a dedicated implementation branch, corrects three concrete fail-open/false-pass conditions, adds five regression tests, adds root commands `verify:t03`, `verify:t04`, and `test:governance`, and makes the governance contract test invoke the new regression suite. This is a targeted remediation, **not** a claim that all COR gaps are closed. CI and broader release blockers must be resolved before certification changes.
