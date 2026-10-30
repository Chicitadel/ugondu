# Ugondu Whole-Product Re-audit, COR Remediation & Portable AWS Handover

- **Document ID:** UG-COR-REAUDIT-HANDOVER-2026-10-29
- **Revision:** 1.0.0
- **Status:** IMPLEMENTED SOURCE FIX / EXACT-HEAD CI PENDING / RELEASE BLOCKED
- **Repository:** https://github.com/Chicitadel/ugondu
- **Dedicated branch:** `audit/cor-remediation-aws-portability-2026-10-29`
- **Base candidate:** `5b6774ef2a1b41ae00b795a5656c876f30de89eb`
- **Protected refs:** `main`, `phase4/production-hardening`, and all other actor-owned branches
- **Governance:** UAIGOS v3, existing COR controls, `docs/governance/ANTIGRAVITY_CHANGE_GUARDRAIL.md`
- **Commercial decision:** NO RELEASE CERTIFICATION until all mandatory exact-head, live-target and independent assurance evidence is complete.

## 1. Execution decision

Continue the existing Ugondu remediation journey in a **new isolated branch**, based on the latest known qualification-receipt candidate commit. Do not start a replacement project, do not modify `main` or `phase4/production-hardening`, and do not reset or overwrite prior remediation branches.

This is an incremental re-audit. Existing plans and fixes are retained. Every source change invalidates previous exact-head receipts; rerun all required checks against the final branch HEAD.

## 2. Re-audit evidence and confirmed physical fix

### UG-COR-BUILD-PREFLIGHT-FAIL-OPEN-001 — confirmed and patched

**Source observed:** `scripts/run-cor-gates.js` compiled `server/engine-core` before tests. When `npx tsc` returned a non-zero status, the runner printed a warning that gates might report `[SKIP]` but continued running suites. This can permit a green-looking subset of tests to execute against stale generated `dist/` output even though the source build failed. This violates fail-closed qualification and evidence integrity.

**Physical implementation on this branch:**
- Added `scripts/cor/build-preflight.js` as a small reusable, deterministic preflight function.
- Updated `scripts/run-cor-gates.js` to stop before any suite runs if the engine build fails, is terminated, cannot start, or its required TypeScript configuration is missing.
- The runner writes a failure summary to `cor-test-results.json` with `failed: 1`, all suites marked not run, and the preflight diagnostic; the process exits non-zero.
- `UGONDU_SKIP_BUILD=true` is explicitly rejected: the runner cannot independently prove that a prior build used this exact candidate. The regression test asserts that the skip path fails closed.
- Added `tests/cor-build-preflight.test.js` for failed build, timeout/signal, missing configuration, successful build and explicit skip behavior.
- Wired this regression test into `npm run test:governance`.

**Source-change commits on this branch:**
- `465523d189d0dcbdf39c364eea2563d8bae1e380` — fail-closed COR build preflight integration.
- `4753345ef92f9e88c504e7d4070b016c15d6bc6c` — reusable preflight implementation.
- `ab62eb6ff9522bfe4762f225d31a93c86f3d64e2` — focused regression tests.
- `71bdb44bdee292322f3ed303fa91d00c7e863046` — governance test wiring.

**Validation boundary:** these are committed physical source changes, but this session did not have a checked-out Ugondu worktree to execute the Node test runner. The tests are authored and wired, not claimed as passed. Run them on the exact current HEAD in GitHub Actions or a clean checkout and preserve the raw logs and exit codes.

## 3. Existing COR blockers carried forward — do not mark closed

The following findings remain part of the prior audit ledger and must be verified against the current branch HEAD. The handover materials and prior audit records explicitly identify them as open or requiring exact-head/live evidence.

### UG-COR-QUALIFICATION-MANIFEST-COVERAGE-001
- The committed manifest is a plan registry with 40 streams intentionally marked `PLANNED`.
- Qualification requires execution of all 40 independent streams, candidate-bound receipts, independent digest/identity checks, and rejection of missing, duplicate, stale, failed or malformed receipts.
- Never change manifest entries to PASS to simulate execution. A plan is not an execution result.
- Inspect `scripts/cor-engine.js`, `scripts/cor-finalize.js`, `scripts/cor-signer.js`, `scripts/check-cor-stream-registry.js`, `scripts/cor/streams/*.js`, and `.github/workflows/cor.yml` together. Ensure the verifier does not trust a receipt that can be constructed from a static manifest or self-reported status.

### UG-COR-STREAM-K-COMMAND-ALLOWLIST-001
- Existing dedicated implementation uses a reviewed expected-command contract and regression tests.
- Reconfirm the allowlist is checked before any evidence-supplied command executes; tests must cover command, arguments, finding ID, target-root provenance, verifier version, unknown findings, and pre-execution ordering.
- A plain SHA-256 digest is integrity detection, not a keyed signature or independent provenance.

### Evidence authenticity / synthetic qualification / release scope
- Do not claim live AWS, external-provider, identity, billing, licensing, restore, rollback, or production qualification based only on local tests, manifest labels, constructed provenance, mock integrations or generated evidence.
- Prior audit history reported synthetic or manifest-derived evidence risks, swallowed smoke failures, incomplete scanner/localization coverage, mutable action references, missing live AWS qualification and no authoritative external evidence. Re-audit each of these against current source and workflows; do not assume they are fixed or still present without inspecting the current implementation.
- `assurance-synthetic` tests may test synthetic-evidence detection, but their existence is not evidence of live provider qualification.
- A successful COR workflow may intentionally emit `NOT RELEASE CERTIFIED` for validation PRs where physical qualification is skipped. Preserve that distinction.

### Dumcholu backend / citizen applications
- Prior handover explicitly reports a backend gap: the citizen applications UI seeded local application records and withdrawal acted on an in-memory list, with no verified authoritative durable backend endpoint for the claimed workflow.
- This is a cross-product release blocker for that feature. It is not closed by Ugondu changes. Track the Dumcholu backend work in its own repository and branch with authenticated, identity-scoped durable persistence and end-to-end contract tests.
- Do not copy billing or entitlement business logic into either product. Air Roofers federation remains the authority for AeroBill billing and Mandatag entitlements.

## 4. Portable, minimum-cost AWS deployment decision

### Hosting model
Keep one application codebase and isolate host-specific behavior behind infrastructure, deployment and configuration adapters. A deployment target is configuration, not a fork of product code.

- **Current host:** DirectAdmin shared hosting remains supported where compatible.
- **AWS physical test/staging:** use the existing AWS account only under an explicitly approved budget and execution role. Prefer Paris `eu-west-3`.
- **Initial low-cost runtime:** a small EC2 instance running hardened Docker Compose can host isolated staging services as a temporary low-cost option, provided measured resource needs and security review support it. Keep Ugondu and Dumcholu service identities, data stores, secrets, networks, ports and deployment lifecycles logically isolated even if they temporarily share a host.
- **Production:** do not create or expose a public production environment until the owner explicitly authorizes it and mandatory security, backups, observability, restore, domain/TLS, secrets, release and rollback gates pass.
- **Scale path:** retain the same container images and external configuration when moving EC2 to ECS on EC2 or ECS Fargate. Do not couple business logic to instance metadata, local disks, fixed IPs or a specific orchestrator. Use durable external persistence where required and a deployment strategy that keeps the old healthy revision serving until the new revision passes readiness.
- **Avoid premature spend:** do not begin with Aurora/RDS, NAT gateways, multi-AZ managed databases, always-on Redis, or Fargate for every microservice unless a verified requirement justifies the cost. These can materially exceed a small launch budget. For low-traffic early pilots, evaluate one EC2 host plus encrypted EBS and backups; external managed persistence may be necessary for production durability and must be budgeted separately.
- **Cost controls:** configure AWS Budgets/CloudWatch alarms and owner alerts, tag every resource, set log retention, automate cleanup for ephemeral test stacks, and periodically review unused EBS, snapshots, public IPs, load balancers and NAT gateways. A budget alert is not a hard spending cap.
- **Never claim deployment complete** until actual account/region, stack ID, deployed image digest, health checks, smoke tests, rollback and cleanup evidence are captured.

### Infrastructure review flags
The existing `infrastructure/aws/dumcholu-pilot-staging.yaml` is an existing proposal, not proof of a running deployment. Review before any execution:
- It describes a public subnet and one EC2 host and has a `MonthlyBudgetLimit` parameter; confirm this drives an actual budget/alarm and do not describe it as a hard cap.
- It hardcodes an AMI ID and Availability Zone. Resolve a validated region-specific image at deploy time or use an explicit, verified parameter.
- It attaches several security groups to the same EC2 instance; review their combined effective ingress and avoid assuming SG-to-SG rules isolate processes on one host.
- Confirm backend ports are not public, administration uses SSM rather than exposed SSH, TLS terminates at a hardened edge, secrets are not embedded in UserData or repository files, and persistent application data survives instance replacement.
- Confirm instance profile permissions are least-privilege and no deployment role can silently expand its own permissions.
- Validate CloudFormation template syntax, IAM effective permissions, policy pack, stack change set, teardown and recovery before provisioning.

**No AWS infrastructure was created or modified in this execution.** The AWS deployment is a gated next step, not an implied side effect of a code commit.

## 5. Required exact-head verification

Run on a clean checkout of `audit/cor-remediation-aws-portability-2026-10-29` and record `git rev-parse HEAD` before and after all commands:

1. `npm ci`
2. `node --test tests/cor-build-preflight.test.js`
3. `npm run test:governance`
4. `npm run build`
5. `npm run lint`
6. `npm run typecheck`
7. `npm run test --workspaces`
8. `npm run test:security`
9. `npm run test:integration`
10. `npm run test:e2e`
11. `npm run test:compatibility`
12. `npm run test:locales`
13. `npm run test:aws` only with the required safe test setup; physical AWS mutation must remain explicitly opt-in.
14. Full `npm run governance:validate` and COR workflow.
15. Applicable Go client `gofmt`, `go vet ./...`, `go test ./...`, `go test -race ./...`, and cross-platform build matrix.
16. Adversarial tests for synthetic evidence, stale receipts, missing streams, forged digests, missing signing roots, swallowed smoke failures, wrong AWS account/region/role, permission escalation, tenant crossing and failed rollback.
17. For actual AWS qualification: capture approved account and region, IAM identity, change set, resource IDs, deployed image digests, health checks, authenticated end-to-end tests, rollback and cleanup receipts.

Any missing command, skipped mandatory gate, failed test, absent artifact or mismatched SHA keeps the gate blocked. Do not weaken gates to make a run green.

## 6. Agent change protocol and shared ownership

Before every edit, the agent must:
1. Read this handover and `docs/governance/ANTIGRAVITY_CHANGE_GUARDRAIL.md`.
2. Inspect the current source, callers, tests, policy, contracts, workflows and prior fix branch.
3. Record task ID, current HEAD, files owned, finding, threat model, acceptance criteria and test plan.
4. Make the smallest compatible fix on a dedicated branch.
5. Add adversarial/regression tests before closing the finding.
6. Run tests locally when possible; otherwise state plainly that they are authored but unexecuted.
7. Upload exact-head CI logs and machine-readable evidence. Never synthesize evidence or reuse receipts from another commit.
8. Update this document only with observed facts and append-only execution notes; do not rewrite history to claim earlier candidates passed.
9. Open a PR and wait for required independent review. Never merge or certify from the same evidence generator that claims the result.

### Architecture guardrails
- Central policy and schemas remain in the canonical governance source; enforcement is local at each trust boundary.
- Reuse existing components; no shadow registry, duplicate security service, new central synchronous dependency, or product-specific business logic in shared core without an approved ADR.
- Preserve typed contracts, idempotency, tenant isolation, durable state, atomic replacement, signed provenance, fail-closed defaults and backward compatibility.
- Keep Aerobill/Mandatag as the only billing/entitlement authority.
- No hardcoded credentials, fixed signing keys, fake success, silent catches, ignored process exit codes, broad test skips or synthetic production evidence.
- Keep all cloud resources portable and disposable by IaC. Never make a cloud mutation without explicit opt-in and account/region/role validation.
- No claim of "100% COR gap close" or commercial certification until all mandatory gates are independently evidenced. A document or test count is not a certification.

## 7. Current disposition

| Item | Status |
|---|---|
| COR build preflight failure behavior | Implemented on branch; exact-head tests pending |
| Existing 40-stream qualification and receipt contract | Re-audit required; not certified by this change |
| Synthetic/provenance/live provider evidence | Open until current code and external evidence are independently verified |
| Ugondu + Dumcholu AWS deployment | Infrastructure proposal exists; deployment not performed here |
| Production launch | **BLOCKED / NOT CERTIFIED** |
| `main` and frozen production baseline | Not modified by this execution |

**Handover instruction:** implement and test each confirmed code defect physically before assigning it to Antigravity. The agent is a reviewer/continuation actor, not a substitute for implementation or evidence. Close only what is proven on the exact candidate HEAD.


## 2026-10-29 infrastructure follow-up — low-cost staging template hardening

**Finding:** `UG-AWS-PILOT-BOOTSTRAP-SAFETY-001` (implementation present; template validation pending).

Re-audit of `infrastructure/aws/dumcholu-pilot-staging.yaml` confirmed that its budget parameter did not create a budget/alarm resource, the AMI was pinned to a literal regional ID, Docker Compose downloaded from a mutable `releases/latest` URL, and the host bootstrap exposed 80/443 before configuring a TLS edge or deploying applications.

Physical changes on this branch:
- Added an actual `AWS::Budgets::Budget` with email notifications at 80% actual spend and 100% forecasted spend. It is an alert, not a hard cap.
- Made Availability Zone a parameter and resolved the Amazon Linux 2023 AMI through the AWS public SSM parameter.
- Required an explicit Docker Compose version and 64-character SHA-256 input; bootstrap verifies the binary digest before making it executable.
- Removed public ingress from the bootstrap security group. A separately reviewed TLS edge is required before opening public ingress.
- Ensured curl and coreutils are installed for download and digest verification.
- Corrected the template description to state that it bootstraps a host only; it does not deploy product containers.

Added `tests/qualification/aws-staging-template-safety.test.mjs` and wired it into `npm run test:governance`. The test checks single-document structure, region-portable AMI/AZ, actual budget notifications, no public ingress/SSH, pinned Compose download and internal-only backend ports.

**Important scope boundary:** this does not deploy Ugondu or Dumcholu application images and does not create AWS resources. The template remains a gated bootstrap component. Application deployment requires approved immutable image digests, the correct runtime/secret contracts, a reviewed TLS edge, authenticated end-to-end tests, rollback and cleanup evidence. Do not report AWS deployment as complete from this template change.

**Validation status:** source and tests are committed; no local CloudFormation lint/deploy or test execution is claimed. Exact-head CI plus `cfn-lint`/CloudFormation validation is required before using the template.


### Build bypass closure follow-up

A second re-audit closed the explicit skip bypass as well: `UGONDU_SKIP_BUILD=true` now returns a failed preflight because the runner has no independently verifiable exact-HEAD receipt for a prior build. The regression case now expects rejection. The diagnostic newline was also corrected. This follow-up changes the candidate again, so all prior CI/COR results are stale for release decisions.


## Follow-up CI re-audit — mandatory evidence gate and AWS template expectation

### UG-COR-EVIDENCE-GATE-SKIP-001 — confirmed and physically fixed

- **Observed:** `scripts/run-cor-gates.js` omitted `tests/evidence-verification.test.js` when `UGONDU_SKIP_EVIDENCE_GATE=true`. This was an environment-variable bypass of a mandatory evidence gate.
- **Fix:** The evidence-verification suite is now unconditional. The stale comment advertising `UGONDU_SKIP_BUILD=true` as an accepted prior-build optimization was corrected because the current preflight intentionally rejects that bypass.
- **Regression guard:** Added `tests/cor-runner-mandatory-gates.test.js`, wired into `npm run test:governance`. It asserts the evidence suite cannot be removed by the legacy environment variable, the build-skip documentation is accurate, and missing/failed suites cause non-zero exit.

### UG-COR-AWS-TEMPLATE-RESOURCE-COUNT-DRIFT-001 — confirmed and physically fixed

- **Observed:** The exact-head COR workflow failed in `server/capabilities/src/tests/universal-bootstrap-runtime.spec.ts`: expected 14 CloudFormation resources but the pilot template correctly contained 15 after the new `MonthlyCostBudget` resource was added.
- **Fix:** Updated the expected resource count to 15 and added `MonthlyCostBudget` to the asserted logical-ID set. The test continues to validate the generated operation graph and policy pack.
- **Evidence:** This was a real CI failure, not a passing receipt. The fix is committed on the follow-up branch and must be revalidated by exact-head CI/COR. The previous run [#40967106726](https://github.com/Chicitadel/ugondu/actions/runs/40967106726) failed the capabilities workspace test on the stale resource count; do not reuse it as a pass.

### Follow-up branch and release gate

- **Branch:** `fix/cor-runner-mandatory-evidence-gate-2026-10-29`, based on PR #56 candidate `7b2922baa45da502f6d3d025d8d5d4483f61083d`.
- **PR:** https://github.com/Chicitadel/ugondu/pull/57 (draft; exact-head validation pending).
- **Protected refs:** No direct changes to `main` or `phase4/production-hardening`.
- **Release posture:** `PARTIAL / RELEASE BLOCKED / NOT CERTIFIED` until exact-head tests, independent review, authorized AWS qualification, live external evidence and corporate approval are complete.


### UG-COR-AWS-BUDGET-RESOURCE-AUTHORITY-GAP-001 — confirmed and physically fixed

- **Observed after the resource-count correction:** the capability workspace progressed further but the plan graph returned `AUTHORITY_GAP` because `AWS::Budgets::Budget` had no resource-to-capability mapping. This proved that updating the expected resource count alone was insufficient.
- **Physical fix:** Added a dedicated `cap.cost.aws_budget` mapping with budget create/modify, describe/read-back, and delete/rollback actions. The ARN builder resolves the exact nested `BudgetName` from CloudFormation `!Sub`/JSON `Fn::Sub`, substitutes the selected environment, and fails closed if unresolved placeholders remain. The provider capability registry now explicitly lists AWS Budgets.
- **Regression evidence added:** The plan graph test asserts the budget resource is mapped, the scoped ARN is exactly `arn:aws:budgets::971671216490:budget:airroofers-staging-monthly-cost-budget`, and the required actions are present. With 15 template resources plus the CloudFormation stack operation, the expected operation count is 16.
- **Prior CI:** Run [#40968027920](https://github.com/Chicitadel/ugondu/actions/runs/40968027920) failed at `graph.status` because the budget mapping was missing. It is a failure receipt, not a pass. The follow-up branch now includes the mapping; exact-head CI/COR must rerun.


## Budget mapping test contract correction

- The first budget-mapping regression attempt correctly resolved the exact scoped ARN and mapped create/modify actions, but the test incorrectly expected `budgets:DescribeBudget` in `providerActions` instead of the separate `verificationActions` field.
- Corrected the test to assert create/modify in `providerActions`, describe/read-back in `verificationActions`, and delete in `rollbackActions`. The implementation's lifecycle separation remains intact.
- The failed run is not a pass; rerun the capabilities workspace and full CI/COR on the newest head.


## 2026-10-30 re-audit — AWS bootstrap region portability

**Finding ID:** `UG-COR-AWS-BOOTSTRAP-REGION-PINNING-001`

- **Confirmed defect:** The pilot CloudFormation template parameterized the Availability Zone but retained a default of `eu-west-3a`; the VPC Region tag and output description also hardcoded Paris-specific values. Deploying the same template into another AWS region could select an invalid AZ or report incorrect region metadata, contrary to the one-template/multi-region portability rule.
- **Physical remediation:** Removed the fixed AZ default so the deployment must supply a valid `AWS::EC2::AvailabilityZone::Name` in the stack's region; changed the resource Region tag to the `AWS::Region` pseudo parameter; generalized the template description and subnet output to the selected region.
- **Regression coverage:** Extended `tests/qualification/aws-staging-template-safety.test.mjs` to require no AZ default, require the Region tag to use `!Ref AWS::Region`, and reject hardcoded `eu-west-3a`/region tag values.
- **Verification:** Source and test changes are committed to the dedicated PR #57 branch. Exact-head CI/COR must rerun; prior successful receipts for `1826e14e` do not apply to this newer candidate.
- **Scope boundary:** This corrects infrastructure portability only. The template still bootstraps a host; it does not deploy application containers, configure a TLS edge, or establish persistent production data services. No AWS resources were provisioned.


## 2026-10-30 follow-up — AWS Budgets IAM/ARN contract defect

**Finding ID:** `UG-COR-AWS-BUDGET-IAM-ARN-CONTRACT-001`

- **Confirmed defect:** The first `cap.cost.aws_budget` mapping used a colon after `budget` in the resource ARN and IAM action names `budgets:CreateBudget`, `budgets:DescribeBudget`, and `budgets:DeleteBudget`. AWS's current Service Authorization Reference maps the CreateBudget, UpdateBudget, and DeleteBudget API operations to `budgets:ModifyBudget`; the read operations use `budgets:ViewBudget`. The canonical budget ARN separator is a slash: `arn:PARTITION:budgets::ACCOUNT:budget/BUDGET_NAME`.
- **Physical remediation:** Updated the mapping to use `budget/${budgetName}`, `budgets:ModifyBudget` for create/update and rollback, and `budgets:ViewBudget` for read-back. Kept least-privilege account/name scoping and fail-closed unresolved-name handling.
- **Regression coverage:** Updated the plan-graph test to assert the canonical slash-form ARN and valid IAM action names; explicitly rejects the prior nonexistent action strings and colon-form ARN.
- **Authoritative reference:** AWS Service Authorization Reference: https://docs.aws.amazon.com/service-authorization/latest/reference/list_budgets.html ; AWS Budget API ARN pattern: https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_budgets_Budget.html
- **Verification:** Code and test committed on PR #57 branch. Exact-head CI/COR must pass; previous receipts predate this fix and cannot close the finding.


## 2026-10-30 re-audit — COR stream executor placeholder evidence

**Finding IDs:** `UG-COR-STREAM-EXECUTOR-STUBS-001`, `UG-COR-STREAM-A02-WILDCARD-VERIFIER-001`, `UG-COR-STREAM-A03-ENVELOPE-BINDING-VERIFIER-001`.

- **Confirmed defects:** A02 only checked whether the source contained the words `wildcard` and `reject`, but did not fail if either was absent; it then invoked `assertCheck() { return true; }`. A03 inspected the wrong file (`policy-gate.ts` rather than `recovery.ts`), searched only for generic words, and used the same always-true assertion. Both could emit candidate-bound PASS receipts without verifying their stated objectives.
- **Physical fixes:** Replaced A02 with explicit source verification of the exact wildcard predicate and fail-closed error. Replaced A03 with checks that the recovery route hashes the active capability envelope, passes that expected hash to `verifyAuthorization`, and the policy gate compares it and includes it in the seal payload.
- **Regression coverage:** Added `tests/cor-stream-objective-verifiers.test.js` for positive and negative A02/A03 cases, identity mismatch, and shared stub detection; wired it into `npm run test:governance`.
- **Systemic guard:** Added `scripts/cor/stream-source-integrity.js`; both `scripts/cor-engine.js` and `scripts/check-cor-stream-registry.js` now reject known always-true `assertCheck`, “pretend to check”, synthetic `verified_source`, and `mock-fingerprint` patterns before a verifier can be treated as eligible.
- **Additional open executor findings from the same source scan:** The source scan also found obvious placeholder patterns in A07, B09-B16, C22, D25-D28, E29-E33, and a mock fingerprint in F39. These are now rejected by the shared guard where the matching patterns occur, but their objectives have **not** been implemented by this change. Each must be replaced with a real verifier and regression test; do not claim all 40 streams qualified.
- **Verification:** Source/test wiring is committed on PR #57. Exact-head CI/COR must rerun. The registry gate is expected to remain blocked until the remaining placeholder executors are replaced; this is an intentional fail-closed result, not a regression to hide.
- **Release status:** `PARTIAL / RELEASE BLOCKED / NOT CERTIFIED`. No AWS resources were provisioned.


## 2026-10-30 independent re-audit — locale verifier false-pass closure

**Finding ID:** `UG-COR-LOCALE-BASELINE-OPTIONAL-001`

- **Confirmed defect:** Locale objective verifiers D25-D28 and E29-E33 compared locale keys to `en.json` only when the English baseline existed. If the baseline was absent, these verifiers still emitted PASS while their observations claimed top-level key parity. This is a fail-open evidence defect.
- **Physical remediation:** All nine verifiers now require `server/shared/locales/en.json`; absence raises a stream-specific `*_EN_LOCALE_BASELINE_MISSING` error before any PASS receipt can be emitted. Existing locale JSON parsing, non-empty object checks, and key-parity checks remain in place.
- **Regression coverage:** Added `tests/cor-locale-objective-verifiers.test.js`, covering missing-baseline rejection and positive exact-key-parity qualification for all nine streams, plus a negative key-drift case. Added `test:cor-locale-objective-verifiers` and wired it into `test:governance`.
- **Candidate branch:** `fix/cor-runner-mandatory-evidence-gate-2026-10-29`.
- **Latest known commit at handover update:** `31fe9b8c194887c91060c6a22d8e45d09286e512` (governance test wiring; includes preceding per-file remediation commits).
- **Verification status:** Physical source and regression test are committed. Exact-head GitHub Actions must execute on the new head; no prior CI/COR receipt applies to this new candidate. Do not mark this finding GREEN until the new locale test and all mandatory CI/COR checks pass.
- **Additional audit concern:** A07 and several other source-inspection verifiers still rely on literal substring/regex presence rather than executing the authoritative validator or exercising its negative behavior. The 40/40 stream count and absence of known stub signatures are not, by themselves, proof that every objective is behaviorally verified. These remain subject to objective-by-objective adversarial review.
- **Release posture:** `PARTIAL / RELEASE BLOCKED / NOT CERTIFIED`. No AWS staging or production resources were provisioned by this change.


## 2026-10-30 follow-up — F39 atomic failure propagation false-pass

**Finding ID:** `UG-COR-F39-ATOMIC-FAILURE-PROPAGATION-001`

- **Confirmed defect:** F39 captured the exception from its second atomic recovery scenario in `expectedAtomicError` but never asserted that the exception existed. An orchestrator could invoke rollback and then silently return `success: false` without propagating the atomic failure, while F39 still emitted PASS.
- **Physical remediation:** F39 now fails with `F39_ATOMIC_FAILURE_NOT_PROPAGATED` unless the failed atomic recovery path throws after rollback.
- **Regression coverage:** Added a positive F39 test using a fixture orchestrator that refuses drift and propagates atomic failure after rollback, and a negative test whose orchestrator rolls back but silently returns. The negative fixture must be rejected.
- **Candidate branch:** `fix/cor-runner-mandatory-evidence-gate-2026-10-29`.
- **Verification:** Source and regression tests committed; exact-head governance/COR/CI rerun required. Prior 40/40 and 15/15 receipts predate this correction and are historical only.
- **Release posture:** `PARTIAL / RELEASE BLOCKED / NOT CERTIFIED`.


## 2026-10-30 follow-up — recovery transaction stale revision conflict

**Finding ID:** `UG-COR-RECOVERY-DOUBLE-FAILURE-UPDATE-001`

- **Confirmed defect:** `RecoveryOrchestrator.executeAtomically` marked a failed transaction as FAILED inside the failure branch, then its catch block attempted a second update using the same stale `tx.revision + 1`. `TransactionAuthority.update` increments the revision on the first write, so the second write could throw `TRANSACTION_REVISION_CONFLICT` and mask the original atomic execution failure.
- **Physical remediation:** Removed the duplicate failure-state update from the failed-result branch. The catch block now reloads the authoritative transaction revision and writes FAILED only if the current state is not already terminal/FAILED.
- **Regression coverage:** Added `tests/recovery-transaction-failure.test.js`, which exercises the compiled real RecoveryOrchestrator/TransactionAuthority, verifies rollback invocation, asserts the original failure is not replaced by a revision conflict, and checks the persisted transaction ends at FAILED revision 3. Wired the test into both `test:governance` and the mandatory COR gate suite.
- **F39 strengthening:** F39 now also rejects `TRANSACTION_REVISION_CONFLICT` as a failed atomic recovery receipt.
- **Candidate branch:** `fix/cor-runner-mandatory-evidence-gate-2026-10-29`.
- **Verification:** Source, F39, regression test and gate wiring are committed. New exact-head build, governance, COR and CI checks are required; earlier receipts are invalidated for release decisions.
- **Release posture:** `PARTIAL / RELEASE BLOCKED / NOT CERTIFIED`.


## 2026-10-30 independent follow-up — nested locale parity false-pass

**Finding ID:** `UG-COR-LOCALE-NESTED-KEY-PARITY-001`

- **Confirmed defect:** D25-D28 and E29-E33 required `en.json` but compared only `Object.keys()` at the root. Nested locale structures could drift while the stream reported key parity. The existing `scripts/validate-locales.js` recursively flattened dictionary paths, so the stream objective was weaker than the repository's canonical locale validator.
- **Physical remediation:** Added shared `scripts/cor/locale-key-parity.js`, which recursively enumerates leaf paths (including array indexes), rejects prototype-pollution dictionary keys, and compares sorted missing/extra nested paths. Updated all nine locale stream verifiers to use the shared helper instead of top-level key comparison. Empty objects retain the canonical locale validator's no-leaf behavior.
- **Regression coverage:** Extended `tests/cor-locale-objective-verifiers.test.js` with nested leaf-key drift rejection for each of the nine streams and a positive nested parity case covering objects and arrays. The earlier missing-English-baseline and top-level mismatch cases remain.
- **Physical candidate commits:** helper `79bf138b7baa2e25cc82a9cf5b39e9b27ea9e616`; verifier updates D25-D28/E29-E33; nested regression `2c50fb32c5e7df668d569fb0076375e339364d0b`; empty-object semantic alignment `df3f9a0e1dbf9b0db0e134302dbd951a21bba733`.
- **Verification:** Source and tests are committed. Exact-head CI must rebuild and run the expanded locale suite; previous 40/40 COR evidence is stale for this candidate. Do not count this finding closed until nested mutation tests and all mandatory gates pass on the new head.
- **Release posture:** `PARTIAL / RELEASE BLOCKED / NOT CERTIFIED`. No AWS resources were provisioned.


## 2026-10-30 independent follow-up — behavioral verification closure for A04-A06 and F35-F38

**Finding IDs:** `UG-COR-ENGINE-SIGNER-INDEPENDENCE-001`, `UG-COR-FINALIZER-SIGNER-INDEPENDENCE-001`, `UG-COR-SIGNATURE-CRYPTO-VERIFICATION-001`, `UG-COR-RECOVERY-OBJECTIVE-BEHAVIORAL-VERIFICATION-001`.

- **A04 — COR engine independence:** Refactored `scripts/cor-engine.js` so importing the module is side-effect-free while the CLI still executes through `require.main === module`. Exported its public engine/verifier functions. A04 now starts a child Node process with signing keys removed, instruments module loading, and proves the actual engine imports without loading `cor-signer.js`.
- **A05 — finalizer independence:** Refactored `scripts/cor-finalize.js` to expose `finalize`, `verifyReceipt`, and `digest` while only executing finalization as a CLI entry point. A05 dynamically loads it without signing keys, verifies a correctly digested PASS receipt, and proves a FAIL receipt is rejected in a negative child process.
- **A06 — cryptographic signing:** Replaced source keyword checks with an isolated temporary Git repository. The verifier generates ephemeral RSA keys, runs the actual signer, verifies the emitted RSA-SHA256 bundle, and proves that a mismatched trusted public key is rejected. No key material is committed or persisted.
- **F35-F38 — recovery behavior:** Replaced source-presence checks with compiled runtime tests of approval decisions, governed route denial before mutation, immutable snapshot content hashing, blast-radius enforcement, and dry-run safety.
- **Regression coverage:** Extended `tests/cor-stream-objective-verifiers.test.js`. The A04-A06 group passes 19/19 objective tests; the prior F35-F38 behavioral group also passes. These suites are wired into governance and fresh COR qualification.
- **Exact candidate:** branch head `b6f64f2bc207198851d7dea09747806279890802`; evaluated merge candidate `59e630d7aa1e94d3153db7462a89dcfdce49666f`.
- **Verification:** CI/CD #40987744466 SUCCESS. COR Certification #40987744216 SUCCESS. Fresh ledger reports 40/40 PASS, zero failed/skipped/not-run streams. Independent finalization is `READY_FOR_COR_SIGNATURE`. Evidence artifact #12947368564; SHA-256 `e3aa780a793f7c07bdde524c2094615585691b1e32e3e10c49f8c88a79cc1f18`.
- **Still not certified:** trusted signing root verification and final COR authority signature were skipped; AWS physical qualification was skipped. No AWS resources were provisioned. This is qualification evidence, not a signed commercial release certificate.
- **Release posture:** `PARTIAL / RELEASE BLOCKED / NOT CERTIFIED`.


---

## 2026-10-30 runtime-verifier depth re-audit

**Candidate parent:** `01498bfa6064be8bcb6db008f740ec2f41420fa1`  
**Branch:** `fix/cor-runtime-verifier-depth-2026-10-30`

### A07 — stream registry validator execution proof

- Confirmed the prior verifier only searched source strings and did not execute the validator.
- Changed A07 to `verificationMode: TEST`.
- It executes the actual registry CLI against the repository and requires success; then copies the manifest, registry script, source-integrity guard and 40 executor files into a temporary fixture, tampers the repository identity, and requires the validator to reject it.
- Added `tests/cor-a07-runtime-verifier.test.js` and wired it into governance.

### B11 — locale updater behavior proof

- Confirmed the prior verifier checked implementation tokens rather than executing the updater.
- Changed B11 to `verificationMode: TEST`.
- It executes the actual locale updater CLI against temporary fixture trees, confirms existing translated strings are preserved, and requires missing/extra translation keys to fail closed.
- Added `tests/cor-b11-locale-updater-runtime.test.js` and wired it into governance.

### Exact-head qualification and remaining work

- The new branch changes source, tests and governance test wiring. The previous successful CI/COR receipts for `01498bfa` do not apply.
- Run both focused tests and the complete governance suite, then require exact-head CI/CD and COR certification.
- B09, B10, B12-B16 and C22 are not closed by this work. They require separate objective-level assessment; where static inspection is inherently appropriate, it must test the complete contract and meaningful negative cases.
- AWS physical deployment remains intentionally deferred. The code must stay portable and must not require AWS runtime services for DirectAdmin execution.
- Release posture remains `PARTIAL / RELEASE BLOCKED / NOT CERTIFIED`.
