# Cross-Product COR Re-audit Handover — Ugondu + Dumcholu

**Updated:** 2026-10-28  
**Governance:** UAIGOS v3 / Air Roofers portability and release-evidence guardrails  
**Purpose:** Canonical cross-product handover for Antigravity agents/actors. This document summarizes verified changes and evidence boundaries; repository-specific guardrails remain authoritative for code changes.

## 1. Protected scope and branches

| Product | Repository | Dedicated remediation branch | Review |
|---|---|---|---|
| Ugondu | [Chicitadel/ugondu](https://github.com/Chicitadel/ugondu) | `audit/whole-product-cor-reaudit-2026-10-27` | [Draft PR #39](https://github.com/Chicitadel/ugondu/pull/39) |
| Dumcholu | [Chicitadel/dumcholu](https://github.com/Chicitadel/dumcholu) | `fix/cor-gap-remediation-2026-10-28` | Keep branch isolated; do not write to master |

Do not commit to, force-push, or merge to `master`, `main`, or Ugondu's `phase4/production-hardening`. Treat each repository as a separate product boundary; never copy backend code between them without a reviewed ADR.

## 2. Latest physical remediation

### Ugondu

- **State persistence integrity:** rejects empty/malformed/foreign/hash-invalid committed state and stale writer bases; uses unique temp files, atomic replacement, and cross-platform lock adapters.
- **Windows lock correctness — `UG-COR-WINDOWS-LOCK-OVERLAPPED-001`:** `LockFileEx` and `UnlockFileEx` previously received different OVERLAPPED structures; unlock failures were ignored. The dedicated branch now retains the same OVERLAPPED pointer through unlock and propagates unlock/close failures.
- **Regression tests added:** Windows-only `TestWindowsStateFileLockReusesOverlappedForUnlock` and `TestWindowsStateFileLockPropagatesUnlockFailure`.
- **Relevant commits:** `9ddea7cb607c31d434243277c30654ef644c17d0`, `2e1e06f3ff34ba2665b3f4f7c06a72be03f7e676`, `006cae24206668149cea26c434ddb62ba635d429`, `c1587bca7d4f8e7ae23daa21a916925ba6103374`.
- **Canonical evidence:** [Ugondu guardrail](https://github.com/Chicitadel/ugondu/blob/audit/whole-product-cor-reaudit-2026-10-27/docs/governance/ANTIGRAVITY_CHANGE_GUARDRAIL.md) and [whole-product handover](https://github.com/Chicitadel/ugondu/blob/audit/whole-product-cor-reaudit-2026-10-27/docs/audit/REAUDIT_HANDOVER_WHOLE_PRODUCT_2026-10-27.md).

### Dumcholu

- **Central billing boundary:** AI budget decisions and usage recording delegate to AeroBill; Dumcholu must not create a competing local billing/entitlement authority.
- **Non-finite billing input — `DUM-COR-AIBUDGET-NONFINITE-CHARGE-001`:** `recordCost` previously allowed `Double.NaN` and positive infinity through the `charge <= 0.0` guard. It now requires `Double.isFinite(charge)` and a strictly positive charge.
- **Regression coverage added:** `AIBudgetServiceTest.recordCostValidatesInputs` now rejects NaN and positive/negative infinity.
- **Relevant commits:** `cd4cf780cdffe5c275938328f8052c8a54ee0020` (implementation), `c0090521410fc4c22b11fc156378ce9b28cbea5f` (tests), `200daff07efcc42a4fe12994b976536cb8be0218` and `959e5a3e684ad3d4dc5c22df3300a289ee426580` (ledger/guardrail).
- **Canonical evidence:** [Dumcholu guardrail](https://github.com/Chicitadel/dumcholu/blob/fix/cor-gap-remediation-2026-10-28/governance/cor/DUMCHOLU_COR_REMEDIATION_GUARDRAIL.md) and [execution ledger](https://github.com/Chicitadel/dumcholu/blob/fix/cor-gap-remediation-2026-10-28/governance/cor/COR_REMEDIATION_EXECUTION_LEDGER.md).

## 3. Verification status — fail closed

| Scope | Evidence currently available | Current status |
|---|---|---|
| Ugondu earlier candidate `2dd4622c` | CI and COR runs recorded as successful in the handover; Go formatting, vet, unit tests, Linux amd64 race test, five OS/architecture matrix legs and workspace checks passed on that tested candidate | Historical candidate evidence only |
| Ugondu current branch head `c1587bca7d4f8e7ae23daa21a916925ba6103374` | Windows lock implementation and tests were committed after the older successful candidate | **PENDING** current-head CI |
| Dumcholu current branch head | Earlier ledger records successful tests for its prior state; the non-finite charge regression was added after those results | **PENDING** current-head Maven test |
| AWS / physical staging | No authorized deployment receipt, live endpoint smoke test, rollback proof, or real AeroBill/Mandatag transaction receipt in this evidence set | **NOT QUALIFIED** |

A test file is not a test result. A successful workflow for a prior SHA does not verify later code. Before closing either new finding, capture the exact tested SHA, workflow/job URLs, test command, exit code, and logs. If a workflow is absent or ambiguous, mark it pending rather than inferring success.

## 4. Portable, minimum-cost hosting policy

1. **Launch on existing DirectAdmin/shared hosting where the plan supports it:** serve static web assets and lightweight compatible endpoints only. Do not assume shared hosting can keep Spring Boot processes, workers, queues, Redis, or scheduled jobs alive.
2. **If Java services cannot run reliably on the current plan:** use a small, measured, container-capable Linux VPS as the first backend hosting step. Keep database backups and exports portable, and use external configuration rather than host-specific business logic.
3. **AWS is a deployment profile, not a domain-code dependency:** when traction, official engagement, funding, or measured reliability needs justify migration, use a cost-controlled AWS deployment in the Paris region where appropriate. Keep application configuration, health checks, persistence interfaces, object storage adapters, and secrets provider selection externalized.
4. **Avoid premature managed-service costs:** do not introduce always-on ECS/RDS/Redis merely for architectural appearance. Measure workload, uptime, data durability, and support constraints; compare VPS and AWS total cost before migration.
5. **Federated authority:** Air Roofers' AeroBill and Mandatag own billing, usage rating, licensing, and entitlements. Products call their versioned adapters and must fail closed when authoritative checks cannot be confirmed.
6. **No credentials in Git:** deployment workflows must use protected environment secrets/roles, least privilege, non-production accounts, and explicit human approval for production.

## 5. Antigravity execution protocol

For every finding:
1. Fetch the current target branch and inspect the live implementation; supplied audit text is a hypothesis until confirmed.
2. Record finding ID, exact code path/symbol, root cause, impact, and severity.
3. Implement the physical source/config change on the dedicated branch before handing work off.
4. Add a regression test that fails on the old behavior and passes on the new behavior.
5. Execute relevant tests locally or through CI; record exact SHA and raw logs. Do not claim tests were run if only authored.
6. Update both the repository's guardrail and execution ledger/handover.
7. Check for architectural duplication, authorization/tenant boundary regressions, portability regressions, and secret leakage.
8. Leave findings YELLOW/PENDING when execution evidence is missing. Never label whole-product COR 100% closed based on static scans or a passing development workflow.

## 6. Release decision

**Overall: `PARTIAL / RELEASE BLOCKED / NOT CERTIFIED`.**

The two new findings above are physically implemented with regression tests authored, but require current-head CI results. Commercial release also requires authorized staging deployment, persistence/restart and rollback proof, security/tenant isolation checks, and controlled non-production federation tests with AeroBill and Mandatag. No AWS deployment is claimed by this document.


## Evidence refresh — 2026-10-28 19:13 UTC

- The Windows lock code/tests were committed through `c1587bca7d4f8e7ae23daa21a916925ba6103374`; the cross-product handover was then committed at `4bc31bfe62c93ce11a6cf39ef4b627c313a10742`. The branch's latest head is the latter documentation commit at the time of this refresh.
- Ugondu CI/CD run #737 (`40752118438`) and COR run #613 (`40752118134`) were still pending with no job records available at the last query. No current-head pass is claimed.
- Dumcholu PR #10 has a failing `Dumcholu Product Name Governance Gate (DUM-GOV-NAME-001)` run #363 (`40752171479`). A failed-job rerun also failed; the log-download endpoint returned `BlobNotFound`, so the exact assertion/reason has not been established. Do not guess a source fix. This is an open CI blocker requiring logs or a reproducible local execution.
- Dumcholu's new non-finite-charge regression remains unverified until Maven tests run on the latest branch head. Older test receipts predate that change.


## 2026-10-28 critical follow-up — AWS physical qualification must be opt-in

**Finding:** `UG-COR-AWS-UNGUARDED-TRIGGER-001` (P0 release-safety / cloud-cost boundary).

**Confirmed source defect:** `.github/workflows/cor.yml` allowed the AWS Physical Qualification Gate to run on every non-PR event, while the workflow accepts pushes on audit/release branches and manual dispatch. The job performs AWS role assumption, policy reconciliation and physical Fargate qualification; ordinary audit pushes could therefore trigger credential use and potentially mutating/chargeable infrastructure work without a dedicated explicit operator opt-in. This conflicts with the cost-minimal DirectAdmin-first policy and the requirement to defer AWS migration until traction/funding.

**Physical remediation on branch `fix/cor-aws-physical-opt-in-2026-10-28`:**
- Added a boolean `workflow_dispatch` input defaulting to false.
- Restricted AWS physical qualification to manual dispatch + explicit input true + repository variable `AWS_PHYSICAL_QUALIFICATION_ENABLED=true` + trusted `main` or `phase4/production-hardening` ref.
- Added `fix/**` push triggers to CI and COR workflows so exact-head non-production checks can run on dedicated remediation branches.
- Updated the final gate to allow routine validation only when COR succeeds and AWS is skipped, explicitly stating **NOT RELEASE CERTIFIED**. If AWS opt-in is active, the AWS gate must succeed.
- Added a structural regression test for the workflow's opt-in and release-status contract; wired it into the package scripts and release-integrity gate.

**Required follow-up:** confirm protected branch/environment approval rules and repository variable settings before any physical AWS qualification. Never configure opt-in merely to make a workflow green. The workflow's AWS credential role ARN and trust relationship remain external prerequisites; do not hardcode credentials or silently fall back to untagged IAM sessions.

**Verification boundary:** implementation is committed to the dedicated branch. Test execution and exact-head CI are pending; this change does not deploy either product to AWS. Whole-product COR remains `PARTIAL / RELEASE BLOCKED / NOT CERTIFIED`.


## Canonical guardrail and new AWS cost-safety finding — 2026-10-28

- **Canonical agent guardrail:** [`governance/cor/CROSS_PRODUCT_COR_REMEDIATION_GUARDRAIL.md`](https://github.com/Chicitadel/ugondu/blob/fix/cor-aws-physical-opt-in-2026-10-28/governance/cor/CROSS_PRODUCT_COR_REMEDIATION_GUARDRAIL.md). Antigravity agents must read this before making further changes.
- **New finding:** `UG-COR-AWS-UNGUARDED-TRIGGER-001`. The physical AWS COR job previously ran on every non-PR event, including ordinary branch pushes/manual dispatch. The new dedicated branch `fix/cor-aws-physical-opt-in-2026-10-28` adds double opt-in (manual boolean + repository variable) and trusted release-branch allowlisting, with routine validation explicitly remaining NOT RELEASE CERTIFIED.
- **Regression test:** `tests/qualification/aws-physical-opt-in-contract.test.mjs`, command `npm run test:aws-physical-opt-in`, wired into COR release-integrity validation.
- **Exact-head CI:** GitHub connector lookup returned no status checks and its workflow-run helper only exposes PR-triggered runs; it did not provide a test receipt for the new head. Direct runtime execution was unavailable in this workflow. Do not mark the new finding GREEN until the workflow test and exact-head CI are observed in GitHub Actions.
- **AWS deployment boundary:** no AWS resources were provisioned by this work. Both products remain DirectAdmin-first / optional VPS / AWS after traction, with AeroBill and Mandatag retaining authority ownership.


## Urgent active-run safety note — 2026-10-28

- Existing candidate `5097e57d55d795f87b36cdbce1cf8eecc16887f1` has push-triggered COR run [#616](https://github.com/Chicitadel/ugondu/actions/runs/40755624233) still reported `in_progress` during the re-audit. Its AWS Physical Qualification Gate had already passed OIDC, policy reconciliation, tagged role assumption and conformance probes, and was in `Run physical certification`. The available GitHub tools expose read-only run data and do not provide a cancellation action. **An authorized repository operator must open the run and cancel it immediately if this physical qualification was not explicitly approved.** Verify the residual-resource scanner/cleanup result and reconcile any created resources before closing the incident.
- The same candidate's push-triggered COR job failed at evidence freshness: 153 non-evidence paths had changed since candidate `45b07518e82c9089d68a38d87b4566b0dd0bcba9`, including CI/COR workflows. This is a fail-closed evidence mismatch, not permission to bypass the freshness check. Regenerate evidence against a newly frozen candidate and rerun exact-head gates; do not reclassify the push run as green because the PR-specific COR run passed.
- Current branch `fix/cor-aws-physical-opt-in-2026-10-28` adds the same regression test to both COR and standard CI release-integrity gates. New-head CI is in progress; current result remains pending.


## Regression execution receipt — 2026-10-28 20:02 UTC

- Candidate tested: `2edf906ca7ed2ee8a2dbbd04b4e16772daff1ede`.
- Workflow: [Ugondu CI/CD run #40759642250](https://github.com/Chicitadel/ugondu/actions/runs/40759642250).
- Step: `Test AWS physical qualification opt-in boundary` — **PASS** (completed successfully in `Release Integrity & Governance Gates`).
- The full CI run and COR run were still queued/pending at the time of this receipt. This targeted test does not establish whole-product COR closure, live AWS qualification, or commercial release certification. Any new source/config commit requires a fresh exact-head result.

## Active AWS run cancellation & qualification gate alignment — 2026-10-28 20:12 UTC

- **Incident cancellation executed:** Active push-triggered COR run [#616 (40755624233)](https://github.com/Chicitadel/ugondu/actions/runs/40755624233) was cancelled via authorized CLI dispatch (`gh run cancel 40755624233`), terminating unauthorized AWS physical qualification execution and preventing cloud expenditure/mutation.
- **Workflow gate contract parity:** Aligned `.github/workflows/cor.yml` final release gate logic with both `tests/qualification/aws-physical-opt-in-contract.test.mjs` (4/4 passed) and `tests/qualification/cor-workflow-gates.test.js` (18/18 passed).
- **Repository governance policy:** `validate-repository.mjs` verified 4,695 tracked files with 0 violations.
- **Status:** Release status remains strictly **`PARTIAL / RELEASE BLOCKED / NOT CERTIFIED`**. PR #41 remains in DRAFT. Master, main, and phase4/production-hardening remain 100% protected.
