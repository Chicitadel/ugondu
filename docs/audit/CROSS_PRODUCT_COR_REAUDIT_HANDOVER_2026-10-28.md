# Cross-Product COR Re-audit Handover — Ugondu + Dumcholu

**Updated:** 2026-10-28  
**Governance:** UAIGOS v3 / Air Roofers portability and release-evidence guardrails  
**Purpose:** Canonical cross-product handover for Antigravity agents/actors. This document summarizes verified changes and evidence boundaries; repository-specific guardrails remain authoritative for code changes.

## 1. Protected scope and branches

| Product | Repository | Dedicated remediation branch | Review |
|---|---|---|---|
| Ugondu | [Chicitadel/ugondu](https://github.com/Chicitadel/ugondu) | `fix/cor-aws-physical-opt-in-2026-10-28` | [Draft PR #41](https://github.com/Chicitadel/ugondu/pull/41) |
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

## Active AWS run cancellation & qualification gate alignment — 2026-10-28

- **Cancellation receipt verified from the GitHub run record:** push-triggered COR run [#616 (40755624233)](https://github.com/Chicitadel/ugondu/actions/runs/40755624233) now has terminal state `completed / cancelled`. This confirms the workflow stopped; it does **not** prove that AWS resources were absent or cleaned up. A residual-resource scan / account reconciliation is still required if any physical step had begun.
- **Corrected gate contract:** `tests/qualification/aws-physical-opt-in-contract.test.mjs` covers the deliberate PR/non-opt-in path, while `tests/qualification/cor-workflow-gates.test.js` asserts the COR gate dependencies and old workflow invariants. Run both on the current exact SHA; a prior green receipt is not current-head evidence.
- **Repository governance policy:** the reported validator result was 4,695 tracked files with 0 violations. Treat as a historical receipt unless its tested SHA is confirmed equal to the current head.
- **Release evidence semantics:** a green PR COR run proves PR validation only. On run [#40761032939](https://github.com/Chicitadel/ugondu/actions/runs/40761032939), candidate `241023fc6c402577109c9eb57d29c2bdad752969`, the job succeeded, but the AWS physical gate, candidate-bound evidence freshness, COR trust-root verification and final COR signing steps were skipped. The final gate explicitly logged `PR VALIDATION PASSED ... NOT RELEASE CERTIFIED`. Do not describe this as a signed final certification or 100% commercial release readiness.
- **Known earlier candidate-specific failure:** COR run [#40759831952](https://github.com/Chicitadel/ugondu/actions/runs/40759831952) on `a0af51610d4a3124a5bb5ae74a7e54c635a0e6bf` failed; see its failed regression step/log before closing any related gate discrepancy.
- **Status:** `PARTIAL / RELEASE BLOCKED / NOT CERTIFIED`. PR #41 remains draft. No AWS deployment was performed.


## Re-audit update — release qualification scope correction (2026-10-28)

- **Confirmed workflow defect:** the candidate-bound evidence freshness check ran on every non-PR push, including ordinary `fix/**` remediation commits. That treated a routine development push as a release attempt and failed at freshness because the source/workflow changes correctly diverged from the frozen evidence candidate. The check was fail-closed, but the trigger scope caused repeated misleading release-attempt failures during remediation.
- **Physical fix:** `.github/workflows/cor.yml` now runs candidate freshness, trust-root verification and final authority signing only when a manual `workflow_dispatch` explicitly sets `run_aws_physical_qualification=true`, the repository variable `AWS_PHYSICAL_QUALIFICATION_ENABLED=true`, and the ref is `main` or `phase4/production-hardening`. Routine PR, audit and fix-branch pushes remain validation-only and cannot be reported as release certification.
- **Regression coverage:** `tests/qualification/cor-workflow-gates.test.js` now tests this shared condition for all three release-only steps and the generic `VALIDATION PASSED ... NOT RELEASE CERTIFIED` message. The tests must run on the new exact head before this finding is marked TESTED.
- **Release boundary:** this change does not weaken candidate freshness, trust-root verification or signing on an explicitly authorized release qualification. It does not create evidence, bypass stale evidence, deploy AWS or certify the product.
- **Latest historical receipts:** [CI #40763771653](https://github.com/Chicitadel/ugondu/actions/runs/40763771653) and [COR PR validation #40763771545](https://github.com/Chicitadel/ugondu/actions/runs/40763771545) passed on `190db660b8175221a9df877fc20506a76c6884c4`; push release attempt [#40763762669](https://github.com/Chicitadel/ugondu/actions/runs/40763762669) failed at freshness as expected for that non-evidence descendant. These are historical receipts, not results for the new workflow/test commits.
- **AWS incident:** [run #40755624233](https://github.com/Chicitadel/ugondu/actions/runs/40755624233) is `completed / cancelled`. Resource cleanup remains unverified until an authorized account-level residual scan is supplied.
- **Status:** code committed; exact-head CI pending. Commercial release remains `PARTIAL / RELEASE BLOCKED / NOT CERTIFIED`.


## 2026-10-29 exact-head evidence refresh

- Ugondu PR #41 branch `fix/cor-aws-physical-opt-in-2026-10-28`, head verified as `30849a07656f52307bce443114322b4ed3c2e550`.
- CI [run #40776073589](https://github.com/Chicitadel/ugondu/actions/runs/40776073589) completed success: Go formatting, vet, unit tests, Linux/amd64 race detector, Windows amd64/macOS/Linux arm64 build/test legs, workspace and integration jobs passed.
- COR validation [run #40776073510](https://github.com/Chicitadel/ugondu/actions/runs/40776073510) completed success on the same candidate: exact-SHA/clean-checkout, build, locale/I18N, architecture/import scans, type-check, workspace tests, COR regression, policy signature, evidence bundle, stream registry, fresh COR qualification, independent finalization and final integrity passed.
- **Scope:** evidence-freshness, signing trust-root and final signing were skipped; AWS physical qualification was skipped. These establish validation, not signed release certification or AWS deployment.
- Earlier push COR run [#40763762669](https://github.com/Chicitadel/ugondu/actions/runs/40763762669) failed frozen-candidate freshness before the release-only trigger scope correction. Validation skips this release-only gate; freshness stays mandatory for explicitly authorized release qualification.
- Legacy AWS run [#40755624233](https://github.com/Chicitadel/ugondu/actions/runs/40755624233) is cancelled, but cleanup is not proven. Authorized AWS account operator must supply residual-resource scan/account reconciliation.
- Dumcholu PR #10 product-name job remains blocked before steps (latest [#40752340292](https://github.com/Chicitadel/dumcholu/actions/runs/40752340292), job `123042066314`, zero steps). No code-level scanner assertion is evidenced. Keep exceptions narrow and classify CI as **BLOCKED / RUNNER ADMISSION UNCONFIRMED**.
- Dumcholu `AIBudgetService.recordCost` rejects non-finite values with `Double.isFinite(charge)`; tests cover NaN and +/-Infinity. The ledger reports `mvn test -Dtest=AIBudgetServiceTest` 9/9 pass, but this session did not independently execute tests at the latest branch SHA. Require exact-head receipt.
- No AWS deployment or verified live AeroBill/Mandatag staging transaction was supplied. Hosting policy: DirectAdmin where workload-compatible → measured small VPS if persistent services require it → AWS only after traction, official engagement/funding and explicit cost/account approval.
- Overall commercial status remains **`PARTIAL / RELEASE BLOCKED / NOT CERTIFIED`**.


## 2026-10-29 09:00 CET — cross-product follow-up findings

- Dumcholu branch `fix/cor-gap-remediation-2026-10-28` now includes `DUM-COR-ECS-TEMPLATE-RENDER-001`: a renderer for ECS task definitions, fail-closed validation and negative/positive regression tests. The AWS guide no longer instructs direct registration of a JSON template containing literal `${AWS_ACCOUNT_ID}`, `${AWS_REGION}` and `${IMAGE_TAG}` placeholders.
- The renderer requires a 12-digit account ID, valid region syntax, and `commit-<12..64 lowercase hex>` image tags; rejects unresolved placeholders; checks Fargate networking, role/account consistency and Secrets Manager references; and writes rendered output with owner-only permissions. The guide also requires ECR `IMMUTABLE` tag mutability. This is deployment preparation only, not AWS provisioning.
- `DUM-COR-REPOSITORY-BYTECODE-001`: removed three tracked `tools/__pycache__/*.pyc` files and added ignore rules.
- Added `.github/workflows/deployment-manifests.yml` to run renderer tests and a negative missing-environment test. Latest observed run before the renderer hardening failed before any job steps; its logs were unavailable (`BlobNotFound`). Treat as runner/workflow admission unverified, not a code-test pass. Exact-head test receipt is still required.
- The Dumcholu product-name workflow also remains blocked/failing without usable step logs. Do not broaden scanner exceptions.
- Ugondu current candidate `e3c6decee4b7d670112c4e619953092278fe6edb` had successful CI run [#40826286743](https://github.com/Chicitadel/ugondu/actions/runs/40826286743) and COR validation [#40826286716](https://github.com/Chicitadel/ugondu/actions/runs/40826286716). The AWS physical gate, candidate freshness, trust-root and final signing remain skipped in validation-only mode.
- No AWS resources were deployed by this work. AWS remains conditional on traction/official engagement/funding and explicit account/budget authorization; AeroBill and Mandatag remain the sole federation authorities.
- Status remains **`PARTIAL / RELEASE BLOCKED / NOT CERTIFIED`**.


## 2026-10-29 09:10 CET — latest cross-product handover

### Ugondu
- Exact candidate `81db0ec938e3279fb2d36ee063dbd8205117ac34` passed the prior CI/COR runs [#40826286743](https://github.com/Chicitadel/ugondu/actions/runs/40826286743) and [#40826286716](https://github.com/Chicitadel/ugondu/actions/runs/40826286716).
- A subsequent governance-only handover update started CI run [#40846046959](https://github.com/Chicitadel/ugondu/actions/runs/40846046959), which was in progress at the last query; COR run [#40846046924](https://github.com/Chicitadel/ugondu/actions/runs/40846046924) was pending. Do not transfer earlier green receipts to the later documentation SHA.
- AWS physical qualification, evidence freshness, trust-root verification and final signing were skipped on validation-only runs. No AWS deployment is claimed.

### Dumcholu
- Confirmed `DUM-COR-ECS-TEMPLATE-RENDER-001`: direct registration of the unresolved ECS JSON template was replaced by a fail-closed renderer and deployment guide. The renderer now requires complete Secrets Manager ARNs matching the chosen account and region, a commit-derived image tag, valid Fargate settings, and zero unresolved placeholders.
- The guide creates or updates ECR with `IMMUTABLE` tag mutability, defines variables before build/push, resolves full secret ARNs at deployment time, and registers only the rendered task definition.
- Added seven renderer regression cases; a local isolated Node execution passed **7/7**. This is not a remote exact-head CI artifact.
- Confirmed `DUM-COR-REPOSITORY-BYTECODE-001`: three tracked Python bytecode cache files removed and ignore rules added.
- Deployment Manifest Qualification run [#40846199856](https://github.com/Chicitadel/dumcholu/actions/runs/40846199856) and Product Name Governance run [#40846199886](https://github.com/Chicitadel/dumcholu/actions/runs/40846199886) failed before recording steps; logs were unavailable. These remain **RUNNER/WORKFLOW ADMISSION UNCONFIRMED**, not source-level test failures and not passing gates. A new candidate run was queued before the subsequent ledger/guardrail-only commits; a fresh exact-head receipt is required.

### Cross-product invariants
- No direct protected-branch writes or merges.
- DirectAdmin remains limited to supported workloads; a measured small VPS is the next step if persistent services require it. AWS remains conditional on traction/official engagement/funding and explicit budget/account authorization.
- AeroBill and Mandatag remain the only billing/usage-rating and licensing/entitlement authorities.
- Commercial status remains **`PARTIAL / RELEASE BLOCKED / NOT CERTIFIED`**.


## 2026-10-29 Ugondu credential-scope remediation

- Finding `UG-COR-SIGNING-SECRET-SCOPE-001`: moved `COR_SIGNING_KEY` out of job-level environment into the final signer step only; moved `COR_PUBLIC_KEY` into the conditional trust-root verification step only.
- Added regression coverage to `tests/qualification/aws-physical-opt-in-contract.test.mjs` asserting no signing credentials in job-wide env and preserving manual dispatch, repository opt-in and trusted release-branch guards.
- Implementation/test candidate before this documentation update: `b7fed10bd61d9d12134a68dbbb0022d0234e35e3`. Fresh exact-head CI/COR receipts are required after this change; earlier green runs do not qualify it.
- Dumcholu deployment renderer regression logic passed 7/7 in local isolated execution; GitHub Actions attempts have failed before steps with unavailable logs, so exact-head remote CI remains unverified. Its product-name gate remains independently unresolved.
- No AWS deployment, live federation transaction, rollback proof or resource reconciliation has been verified. Overall status remains **`PARTIAL / RELEASE BLOCKED / NOT CERTIFIED`**.
