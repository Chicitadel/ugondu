<!-- Project: Ugondu | Organization: Air Roofers SASU | Governance: UAIGOS 3.0.0 -->
# COR Post-Merge Re-Audit — Evidence Freshness Regression and AWS Residual-Scan Blocker

**Document ID:** AR-UG-COR-POST-MERGE-RECHECK-20261025-02  
**Audit snapshot:** 2026-10-25 06:55 UTC (workflow evidence available through 06:51 UTC)  
**Repository:** `Chicitadel/ugondu`  
**Production branch:** `phase4/production-hardening`  
**Candidate examined:** `734e2f56f56f64ee109ece01d0476c51195ba3f6`  
**Prior reported passing run:** [40161212443](https://github.com/Chicitadel/ugondu/actions/runs/40161212443)  
**Current COR run:** [40169337848](https://github.com/Chicitadel/ugondu/actions/runs/40169337848)  
**Current CI run:** [40169342976](https://github.com/Chicitadel/ugondu/actions/runs/40169342976)  
**Current brand-asset audit:** [40169342989](https://github.com/Chicitadel/ugondu/actions/runs/40169342989)  
**Verdict:** **RELEASE BLOCKED — current candidate COR certification failed. Do not use the earlier passing run as proof for this candidate.**

> This is a follow-up to the master audit plan. It records new live GitHub Actions evidence. It does not claim to have changed source code, repaired AWS permissions, or verified that no residual resources remain.

## 1. Executive decision

The merged master audit plan is present on `phase4/production-hardening` at commit `734e2f56...`. The current CI/CD and brand-asset workflows for that SHA completed successfully, but the mandatory COR certification workflow failed. The AWS physical qualification gate and final release gate also failed in the same run. This means the candidate is **not COR-certified**, regardless of green non-COR workflows.

Two independently actionable blockers were observed:

1. **Evidence freshness failed** in COR Certification run `40169337848`, job `121096822261`. The workflow reported: `Stale evidence: 181 non-evidence path(s) changed since candidate 1f05cccb4a0148a91ec2f177dd0ecd5af11e7b82`. Downstream release integrity, trust-root validation, stream registry, fresh qualification, independent finalization and signing steps were skipped by the fail-closed dependency chain.
2. **AWS residual-resource scan failed closed** in the physical job `121096822564` in the same run. The execution role `UgonduCORExecutionRole` was denied `s3:ListAllMyBuckets` during `AwsResidualScanner.scanForLeakedResources`. The failure is correctly surfaced as `PermissionDeniedError`; the residual scan is incomplete and therefore residual-resource absence is **not proven**.

The CI/CD pipeline run `40169342976` and brand-asset audit run `40169342989` succeeded, but they do not override the failed COR and AWS mandatory gates. The final release gate `121100433196` correctly failed because COR and AWS results were both `failure`.

## 2. Current run evidence matrix

| Gate / workflow | Run / job | Live result | Interpretation |
|---|---|---|---|
| COR Certification | [40169337848](https://github.com/Chicitadel/ugondu/actions/runs/40169337848), job 121096822261 | 🔴 **FAIL** | Evidence freshness reports 181 changed non-evidence paths. |
| AWS Physical Qualification Gate | [40169337848](https://github.com/Chicitadel/ugondu/actions/runs/40169337848), job 121096822564 | 🔴 **FAIL** | Physical certification reaches residual scan; `s3:ListAllMyBuckets` denied. |
| COR Final Release Gate | [40169337848](https://github.com/Chicitadel/ugondu/actions/runs/40169337848), job 121100433196 | 🔴 **FAIL** | Correctly blocks because COR and AWS gates did not succeed. |
| Ugondu CI/CD Pipeline | [40169342976](https://github.com/Chicitadel/ugondu/actions/runs/40169342976) | 🟢 PASS | Non-COR pipeline success only; not a release certification. |
| Brand Asset Integrity & Usage Audit | [40169342989](https://github.com/Chicitadel/ugondu/actions/runs/40169342989) | 🟢 PASS | Brand asset scope only. |
| Prior reconciled COR/AWS run | [40161212443](https://github.com/Chicitadel/ugondu/actions/runs/40161212443) | 🟢 PASS for its exact candidate/run | Historical scoped evidence; does not certify SHA `734e2f56...`. |

## 3. Finding POST-COR-001 — Evidence baseline drift (P0)

### Observed evidence

- Failing step: **Verify evidence freshness (candidate-bound, evidence-only descendant)**.
- Candidate in the error: `1f05cccb4a0148a91ec2f177dd0ecd5af11e7b82`.
- Current tested SHA: `734e2f56f56f64ee109ece01d0476c51195ba3f6`.
- Failure: 181 changed paths outside the approved evidence-only set. The log lists, among others, `artifacts/archive/ARCHIVE_MANIFEST.md`, `artifacts/archive/engine_core_test_result.txt`, and locale files `locales/ar.json`, `locales/de.json`, and `locales/en.json`.

This is not safely resolvable by weakening or bypassing the freshness check. It indicates that the candidate/evidence relationship must be reconciled. A documentation-only commit message does not make its ancestry or changed tree an evidence-only descendant.

### Required remediation

1. Retrieve the full diff between candidate `1f05cccb...`, evidence descendant `162b45898591546b66b789a433b069abe838338b`, baseline `40b15020...`, and current SHA `734e2f56...`. Classify every changed path.
2. Determine whether the 181 paths represent pre-existing source/config/policy/dependency drift, generated evidence, archive updates, locale changes, or a manifest mistake. Record the actual classification; do not assume.
3. Define the evidence-only allowlist narrowly and review every exception. Do not allow locales, source, workflow, package manifests/lockfiles, policy packs, build configuration or runtime composition to be reclassified as evidence merely to pass.
4. If source/config/policy/dependency/build/workflow changes occurred after the qualification candidate, select a new implementation candidate and rerun all affected tests, COR qualification and AWS physical qualification on that candidate.
5. Seal a new evidence manifest against the exact candidate SHA. Any evidence-only descendant must be proven to change only approved evidence paths.
6. Ensure the dashboard derives the candidate, run, gate status, and manifest digest from the new run; preserve the failed run as an immutable audit event.
7. Add a regression test for the exact scenario: one non-evidence path changed after qualification must fail freshness; an approved evidence-only change may pass only after manifest and digest verification.

### Acceptance criteria

- No unexplained changed paths remain.
- The evidence manifest binds to the candidate SHA, policy digest, dependency digest and relevant target.
- Fresh COR qualification, physical AWS qualification and final release gate all pass in one new run lineage.
- No manual override or stale receipt is used to mark the candidate green.

## 4. Finding POST-COR-002 — AWS residual scanner lacks required S3 list permission (P0)

### Observed evidence

The physical qualification log reports:

```text
Permission denied: assumed-role/UgonduCORExecutionRole/40169337848
is not authorized to perform: s3:ListAllMyBuckets
because no identity-based policy allows the s3:ListAllMyBuckets action
```

The error is surfaced from `AwsResidualScanner.scanForLeakedResources` at `server/engine-core/src/assurance/fault/aws-residual-scanner.ts`, around the logged line 81, and propagates into `server/engine-core/physical-certification.ts` around the logged line 220. The run also logs that dependency-aware rollback completed and a VPC deletion was attempted; however, the independent residual scan failed, so a zero-residual result cannot be asserted.

### Required remediation — do not blindly broaden IAM

1. Inspect `aws-residual-scanner.ts`, the AWS COR V9 policy pack, the effective role policy, and the intended residual-scan scope.
2. Prefer scanning the durable run-owned resource manifest and known resource identifiers rather than requiring account-wide S3 bucket enumeration, if that satisfies the assurance contract.
3. If account-wide enumeration is a genuine documented requirement, add the minimum required permission to the **governed, signed policy pack** and the role's effective policy, then verify the resulting policy digest and effective permissions. `s3:ListAllMyBuckets` is account-level and should not be added casually; assess the scope and risk explicitly.
4. Ensure the scanner can independently enumerate all resource types that the run can create, including paginated results, without turning denied or incomplete inventory into success.
5. Add tests for AccessDenied, missing permissions, partial/incomplete pagination, timeout, unknown resource ownership, residual resources and successful zero-residual verification.
6. Re-run physical qualification in the isolated account/region; retain the run manifest and scan output. If scan remains incomplete, status remains blocked and cleanup requires authorized investigation.

### Acceptance criteria

- Scanner's inventory scope is documented and complete for resources the candidate may create.
- Effective least-privilege policy authorizes exactly the intended scan operations.
- Denied/incomplete scan fails closed with typed diagnostics.
- A successful independent final scan confirms zero run-owned residual resources; unrelated resources remain unchanged.
- Physical qualification and final gate pass on the same fresh candidate lineage.

## 5. Anti-regression finding POST-COR-003 — Current dashboard needs a fresh snapshot (P1)

The current dashboard's header snapshot is `2026-10-25 06:15 UTC`. It correctly records run `40161212443` as green for its own scope, but does not include the subsequent failed run `40169337848` on candidate `734e2f56...`.

Do not rewrite the prior record as though the old run failed. Append a new audit event or refresh the current-status section from machine-readable workflow data. Preserve both:
- historical success for the exact old candidate and run; and
- current failure for the new candidate and run.

The latest status must be determined by the candidate being considered for release, not by selecting whichever historical run is green.

## 6. Additional repository observations

### Root package scripts

The current root `package.json` declares nine workspaces and scripts for build, lint, typecheck, tests, integration, E2E, security, compatibility, locale validation, AWS gates, governance validation and release integrity. The successful CI run is positive evidence for its configured scope. It does not, by itself, establish that all advertised OS/IDE/host lifecycles or every UI state have been tested.

### Governance validator limits

The inspected `scripts/governance/validate-repository.mjs` is a static policy scanner using regular expressions and tracked-file enumeration. This is useful defense-in-depth, but a zero-violation result cannot alone prove there are no runtime stubs, synthetic data paths, fake success behavior or untested operations. Retain the static gate and supplement it with:
- production composition/dependency graph verification;
- emitted artifact inspection;
- live provider contract tests;
- failure injection and negative tests;
- target-specific E2E;
- human review of suspicious findings and scan exclusions.

The inspected `scripts/governance/validate-test-coverage.mjs` verifies mandatory root/workspace scripts and disallows selected bypass flags. Presence of a test script does not prove assertion quality, meaningful branch coverage, integration with real providers, or that every feature has an acceptance test.

### Current status of broad scope

The existing master audit plan remains the governing work plan for UI/UX, accessibility, performance, security/privacy, AI fleet, localization, platform universality and immutable artifact lifecycle. These domains must not be marked green solely because the CI/CD pipeline passed. Each advertised capability requires evidence tied to the exact candidate and target.

## 7. Exact remediation and verification sequence

Run from a clean checkout of the chosen candidate. Confirm each command exists in the target revision and preserve raw logs/exit codes.

```bash
set -euo pipefail
git status --short
git rev-parse HEAD
git diff --check

# Compare the source candidate, evidence descendant, and current branch.
git diff --stat 1f05cccb4a0148a91ec2f177dd0ecd5af11e7b82..734e2f56f56f64ee109ece01d0476c51195ba3f6
git diff --name-status 1f05cccb4a0148a91ec2f177dd0ecd5af11e7b82..734e2f56f56f64ee109ece01d0476c51195ba3f6

npm ci
npm run build
npm run lint
npm run typecheck
npm test
npm run test:security
npm run test:compatibility
npm run test:locales
npm run governance:validate
```

These local commands do not replace the required live workflow. After the diff is reconciled:
1. Run the repository's canonical evidence-freshness check on the chosen candidate.
2. Run COR remediation and evidence-integrity gates.
3. Run the AWS physical gate with the corrected least-privilege scanner contract.
4. Verify independent residual scan and cleanup receipts.
5. Require the final gate to confirm every mandatory job succeeded on that exact candidate.
6. Update the dashboard from machine-readable results and link raw evidence.
7. Repeat relevant tests after every source, workflow, dependency, policy, or runtime change.

Do not run destructive cleanup against shared/customer infrastructure without explicit authorization and exact run ownership.

## 8. Updated colour-coded status

| Area | Status now | Next action |
|---|---|---|
| Master audit plan committed | 🟢 | Preserve as governed baseline. |
| CI/CD pipeline on `734e2f56` | 🟢 scoped | Do not confuse with COR release qualification. |
| Brand asset audit on `734e2f56` | 🟢 scoped | Retain evidence link. |
| Evidence freshness on `734e2f56` | 🔴 **FAIL** | Reconcile 181 changed paths and produce fresh candidate-bound evidence. |
| AWS physical qualification on `734e2f56` | 🔴 **FAIL** | Fix/justify scanner permissions and complete independent residual scan. |
| Final release gate on `734e2f56` | 🔴 **FAIL** | Cannot pass until COR and AWS gates both succeed. |
| F-23 / F-24 prior implementation proofs | 🟡 historical/scoped | Re-run affected tests against the new release candidate; do not infer they are invalid, but requalify where source drift affects them. |
| AI fleet activation | 🔴 not proven | Per-model live receipts and approvals. |
| UI/UX and performance total coverage | ⚪/🟡 not established | Complete the screen/state and measurable SLO evidence matrix. |
| All OS/IDE/host/cloud targets | 🔴 universal claim withheld | Native lifecycle proof for every advertised target, or explicitly narrow support. |
| Immutable signed artifact lifecycle | 🔴 not proven | Test install/upgrade/rollback/uninstall from exact published artifact. |
| **Universal COR** | 🔴 **NOT GRANTED** | New unified run must pass and all advertised targets must be qualified. |

## 9. Closure checklist

- [ ] Reconcile all 181 changed paths against the prior candidate and evidence-only allowlist.
- [ ] Select and freeze a fresh implementation candidate if any source/config/policy/dependency/build/workflow path changed.
- [ ] Update evidence manifest, signatures, and dashboard without deleting the failed-run history.
- [ ] Inspect residual scanner source and current signed/effective AWS policy.
- [ ] Resolve `s3:ListAllMyBuckets` denial by a documented least-privilege design, not an ad hoc broad grant.
- [ ] Test denied/incomplete residual inventory and prove it cannot produce green.
- [ ] Complete a new physical AWS qualification and independent residual scan.
- [ ] Complete COR certification and final release gate on the same candidate lineage.
- [ ] Requalify affected F-23/F-24, AI, localization and governance paths on the final candidate.
- [ ] Keep universality red until every advertised target has complete target-specific lifecycle evidence.
- [ ] Publish no commercial readiness claim beyond the exact certified scope.

## 10. Final decision

**Current candidate `734e2f56...`: RELEASE BLOCKED.**

The successful CI/CD and brand audit runs are useful but do not override the failed COR certification, failed AWS physical gate, or failed final release gate. The fail-closed behavior is correct and must not be weakened. First reconcile the evidence baseline; then correct the residual scanner's least-privilege contract and obtain a fresh independent scan. Only a new candidate with a unified successful COR/AWS/final-gate run can regain bounded release qualification.

Universal COR and universal commercial release remain withheld until all advertised platforms, IDEs, hosts, AI models, product features, UI states and immutable artifact lifecycle tests have their own current evidence.
