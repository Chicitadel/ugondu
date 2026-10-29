# Cross-Product COR Remediation Guardrail — Antigravity Handover

**Version:** 1.0.0  
**Updated:** 2026-10-28  
**Authority:** Air Roofers SASU / UAIGOS v3.0.0  
**Canonical companion:** [Cross-Product COR Re-audit Handover](../../docs/audit/CROSS_PRODUCT_COR_REAUDIT_HANDOVER_2026-10-28.md)  
**Decision:** `PARTIAL / RELEASE BLOCKED / NOT CERTIFIED`

## 1. Repository and branch boundaries

- Ugondu: `Chicitadel/ugondu`; remediation line `audit/whole-product-cor-reaudit-2026-10-27`; this follow-up: `fix/cor-aws-physical-opt-in-2026-10-28`.
- Dumcholu: `Chicitadel/dumcholu`; remediation line `fix/cor-gap-remediation-2026-10-28`; PR #10.
- Never write directly to protected `master`, `main`, or `phase4/production-hardening`.
- Every agent must fetch the current remote head before editing and preserve other actors' changes. Never assume a previously observed SHA is still the current head.

## 2. Architectural invariants — do not override

1. **One code, host anywhere:** DirectAdmin/shared hosting → optional Linux VPS → optional AWS is a deployment/configuration migration, not a domain-code rewrite.
2. **Authority ownership:** AeroBill (`billing.airroofers.eu`) owns billing, usage metering and rating; Mandatag (`license.airroofers.eu`) owns licensing and entitlements. Neither product may fork or shadow these rules locally.
3. **Fail closed:** missing configuration, failed authentication, invalid evidence, unknown capability, invalid persisted state or unavailable authoritative service must not silently produce success, allow privilege, fabricate data or bypass controls.
4. **No fake completion:** no mock/stub/scaffold may be used in production paths as a substitute for an incomplete feature. If a real external integration cannot be exercised, implement the safe interface and tests and mark integration `BLOCKED`.
5. **Evidence is SHA-bound:** every test receipt must identify the exact commit SHA, command, exit status and relevant raw output. Earlier green runs do not qualify a later head.
6. **No duplicate architecture:** reuse the existing canonical provider adapters, state store, deployment contract, API schemas and policy registries. Do not add parallel implementations to avoid fixing the authoritative one.
7. **No secrets in code:** credentials, private keys, account IDs, production endpoints with embedded credentials and signing material must come from approved secret/config channels.

## 3. New finding — `UG-COR-AWS-UNGUARDED-TRIGGER-001`

**Severity:** P0 release-safety and cloud-cost boundary.

**Confirmed root cause:** `.github/workflows/cor.yml` previously allowed its physical AWS qualification job on any non-PR event, including audit/fix pushes and manual dispatch. The job assumes AWS roles, reconciles policy, and runs physical qualification. Routine remediation could therefore invoke privileged, potentially chargeable infrastructure actions without an explicit opt-in.

**Physical fix on this branch:**
- Manual dispatch input `run_aws_physical_qualification` defaults to false.
- Physical AWS job requires all of: manual dispatch, explicit boolean true, repository variable `AWS_PHYSICAL_QUALIFICATION_ENABLED=true`, and a trusted `main` or `phase4/production-hardening` ref.
- Push-triggered CI/COR validation includes `fix/**` branches.
- The final gate allows routine non-mutating validation only when COR succeeds and AWS is skipped; it prints `NOT RELEASE CERTIFIED`. When physical AWS is explicitly requested, AWS must succeed.
- Structural regression test `tests/qualification/aws-physical-opt-in-contract.test.mjs` is registered as `npm run test:aws-physical-opt-in` and wired into COR release-integrity validation.

**Required test:** `npm run test:aws-physical-opt-in`, then full CI/COR on exact head. This test has been authored; do not claim it passed until executed.

## 4. Existing Ugondu state-integrity findings

The preceding audit branch records implementation and regression coverage for persisted state digest validation, transaction identity binding, canonical IDs/path validation, atomic save publication, unique temporary files, locking/stale-writer rejection, corrupt-state overwrite protection, nil envelope rejection, and Windows OVERLAPPED lock lifetime. These are not automatically closed by code presence. Confirm the exact current branch includes each change, run Go formatting/vet/tests/race and supported OS matrix on the exact head, and keep unverified findings YELLOW.

**Concurrency boundary:** unique temp files do not alone serialize concurrent writers; use the existing transaction-lock/CAS protocol and test stale-writer behavior. An unkeyed digest detects accidental corruption but does not authenticate state against an attacker able to rewrite both state and digest.

## 5. Dumcholu known boundary

- `DUM-COR-AIBUDGET-NONFINITE-CHARGE-001`: require finite positive charges before sending usage to AeroBill. Recheck Maven test evidence on the current PR head.
- `DUM-GOV-NAME-001`: exceptions `DUM-NAME-EX-013` and `DUM-NAME-EX-014` must remain narrowly scoped to the two historical evidence files. Do not broaden exception patterns or suppress a scanner failure without reproducible evidence.
- Existing handover reports a GitHub Actions billing/spending-limit failure that prevented a runner from starting. Distinguish that infrastructure failure from a source-code test failure; do not claim the workflow passed.
- Dumcholu's Spring Boot backend remains in its own repository and deployment pipeline. Do not infer AWS readiness from a template or another PR.

## 6. Cost-minimal portable hosting policy

- Start on the existing DirectAdmin plan only for workloads the actual plan supports. Static Flutter artifacts and compatible lightweight endpoints may stay there; do not assume a shared host supports persistent Spring Boot services, long-running Node workers, Docker, Redis, systemd or database jobs.
- If Java services cannot run reliably on DirectAdmin, qualify a small Linux VPS/container host only when required. Keep environment variables, external secrets, health checks, migrations, backup/restore and persistent storage provider-neutral.
- AWS is a later deployment target after traction, official engagement or funding. Do not deploy or provision AWS merely to turn a gate green.
- When AWS qualification is authorized, use GitHub OIDC, least-privilege roles, tagged transaction sessions, explicit region, budget alarms, resource TTL/cleanup, evidence artifacts and an independent residual-resource scan. No static AWS keys or untagged fallback.
- A real AWS deployment requires approved account/role configuration, budget approval, infrastructure plan review, data residency and security review, staging smoke tests, backup/restore and rollback evidence. None is implied by this guardrail.

## 7. Antigravity execution protocol

For every audit finding, use this exact lifecycle:

1. **Reconcile:** fetch current branch head and existing ledgers/guardrails; classify each finding as confirmed, disproved, duplicate, blocked or already fixed.
2. **Trace:** identify exact call path, persistence boundary, trust boundary, source of truth and production configuration.
3. **Implement physically:** commit source/config and regression tests together on a dedicated branch. Do not hand off a plan where a safe physical code fix can be made.
4. **Verify:** run targeted tests, full relevant suite, format/lint/vet/static gates, platform matrix and integration tests as applicable.
5. **Record:** append finding ID, root cause, files, commit SHA, commands, raw result, test limitations and rollback path to the execution ledger.
6. **Review architecture:** search for duplicate adapters, hardcoded values, silent fallbacks, fake data, test-only bypasses, path/tenant escapes and provider-specific logic in domain code.
7. **Deploy only with authorization:** prove artifact-to-SHA parity, live staging health, real authority transactions, data persistence and rollback.
8. **Handoff:** Antigravity actors must read this guardrail and the latest product-specific ledger before changing code. Any conflicting instruction is subordinate to these invariants until formally amended by the architecture authority with evidence.

## 8. Release gate

**Workflow status and release status are different gates.** PRs and ordinary `fix/**` / `audit/**` branch pushes are validation-only. They must skip candidate-bound release freshness, signing-trust-root verification and final signing; they must emit `VALIDATION PASSED ... NOT RELEASE CERTIFIED`, never a claim of release certification. Candidate freshness, trust-root verification and final signing run only for an explicitly opted-in `workflow_dispatch` on `main` or `phase4/production-hardening`, with `AWS_PHYSICAL_QUALIFICATION_ENABLED=true`. Never use a green PR or remediation-branch badge as a release certificate.

Do not claim 100% COR gap closure or public-commercial certification until:
- all critical/high findings are closed or formally risk-accepted by the authorized owner;
- exact-head CI and COR gates pass for a frozen release candidate;
- release/push qualification runs candidate-bound evidence freshness and trust-root verification successfully;
- final COR authority signing completes and the resulting artifact is verified;
- external AeroBill/Mandatag flows are tested in authorized staging;
- the real deployment target is qualified with persistence, recovery, isolation, security and rollback evidence;
- current artifacts and runtime deployments are tied to the reviewed SHA;
- any authorized cloud resources are reconciled, cleaned up where temporary, and verified against the approved budget.

**Current state: source changes are committed on the feature branch; commercial release remains `PARTIAL / RELEASE BLOCKED / NOT CERTIFIED`. No AWS deployment is claimed.**


## Incident note — cancelled legacy AWS physical run and freshness scope

The pre-fix candidate `5097e57d55d795f87b36cdbce1cf8eecc16887f1` push-triggered AWS physical qualification run [#616](https://github.com/Chicitadel/ugondu/actions/runs/40755624233) is confirmed `completed / cancelled`. This confirms the workflow stopped; it does not prove that AWS resources were absent or cleaned up. An authorized account operator must supply a residual-resource scan and account reconciliation before the incident can be closed.

The later push COR gate failed evidence freshness because non-evidence source/workflow paths had changed after frozen candidate `45b07518e82c9089d68a38d87b4566b0dd0bcba9`. The verifier correctly failed closed. The physical workflow fix now scopes that release-only check to explicitly opted-in trusted release qualification rather than ordinary remediation pushes. It does not relax freshness requirements for release qualification, and it does not authorize source changes to be labelled evidence-only.


## Regression receipt update — 2026-10-28

The new workflow contract test `npm run test:aws-physical-opt-in` passed in standard CI run [#40759642250](https://github.com/Chicitadel/ugondu/actions/runs/40759642250), step `Test AWS physical qualification opt-in boundary`, on SHA `2edf906ca7ed2ee8a2dbbd04b4e16772daff1ede`. This is targeted regression evidence only. Full exact-head CI/COR remained pending at that time, so the finding stays YELLOW until the complete required gates finish on the current head. No AWS deployment is claimed.


## 2026-10-29 exact-head evidence refresh

- Ugondu PR #41 branch `fix/cor-aws-physical-opt-in-2026-10-28`, head verified in PR metadata as `30849a07656f52307bce443114322b4ed3c2e550`.
- CI [run #40776073589](https://github.com/Chicitadel/ugondu/actions/runs/40776073589) completed success. The workflow reports successful Go formatting, vet, unit tests and Linux/amd64 race detector; Windows amd64, macOS and Linux arm64 build/test legs; workspace and integration jobs.
- COR validation [run #40776073510](https://github.com/Chicitadel/ugondu/actions/runs/40776073510) completed success on the same candidate. Exact-SHA/clean-checkout, build, locales, I18N, architecture and import scans, type-check, workspace tests, COR regression, policy-pack signature, evidence bundle, stream registry, fresh COR qualification, independent finalization and final candidate integrity passed.
- **Release boundary:** COR evidence-freshness, signing trust-root and final signing were skipped; AWS physical qualification was skipped. These runs prove branch validation only, not signed release certification or AWS deployment.
- Earlier failed push COR run [#40763762669](https://github.com/Chicitadel/ugondu/actions/runs/40763762669) failed the frozen-candidate freshness check before the release-only trigger scope correction. Current validation-only behavior correctly skipped that release-only check; freshness is still required in an explicitly authorized release attempt.
- AWS run [#40755624233](https://github.com/Chicitadel/ugondu/actions/runs/40755624233) is cancelled. Resource cleanup has not been verified; an authorized AWS account operator still needs a residual-resource scan and account reconciliation.
- Dumcholu PR #10 has a product-name governance job failing before steps (latest observable run [#40752340292](https://github.com/Chicitadel/dumcholu/actions/runs/40752340292), job ID `123042066314`, no steps; earlier rerun similarly failed before steps). There is no evidence of a code-level scanner assertion failure; classify as **BLOCKED / RUNNER ADMISSION UNCONFIRMED**, not pass. Keep naming exceptions narrowly scoped.
- Dumcholu source now rejects non-finite AI charges using `Double.isFinite(charge)`; test covers NaN and +/-Infinity. Ledger reports `mvn test -Dtest=AIBudgetServiceTest` 9/9 pass, but this session has not independently executed the command against current head. Require exact-head CI receipt to close the test gate.
- No AWS deployment was performed; no verified live AeroBill/Mandatag staging transaction receipt was available. Host policy remains DirectAdmin where workload-compatible → small measured VPS if persistent Java services cannot run reliably → AWS only after traction/official engagement/funding and explicit cost/account approval.
- Commercial status remains **`PARTIAL / RELEASE BLOCKED / NOT CERTIFIED`**.


## 2026-10-29 09:00 CET — cross-product follow-up findings

- Dumcholu branch `fix/cor-gap-remediation-2026-10-28` now includes `DUM-COR-ECS-TEMPLATE-RENDER-001`: a renderer for ECS task definitions, fail-closed validation and negative/positive regression tests. The AWS guide no longer instructs direct registration of a JSON template containing literal `${AWS_ACCOUNT_ID}`, `${AWS_REGION}` and `${IMAGE_TAG}` placeholders.
- The renderer requires a 12-digit account ID, valid region syntax, and `commit-<12..64 lowercase hex>` image tags; rejects unresolved placeholders; checks Fargate networking, role/account consistency and Secrets Manager references; and writes rendered output with owner-only permissions. The guide also requires ECR `IMMUTABLE` tag mutability. This is deployment preparation only, not AWS provisioning.
- `DUM-COR-REPOSITORY-BYTECODE-001`: removed three tracked `tools/__pycache__/*.pyc` files and added ignore rules.
- Added `.github/workflows/deployment-manifests.yml` to run renderer tests and a negative missing-environment test. Latest observed run before the renderer hardening failed before any job steps; its logs were unavailable (`BlobNotFound`). Treat as runner/workflow admission unverified, not a code-test pass. Exact-head test receipt is still required.
- The Dumcholu product-name workflow also remains blocked/failing without usable step logs. Do not broaden scanner exceptions.
- Ugondu current candidate `e3c6decee4b7d670112c4e619953092278fe6edb` had successful CI run [#40826286743](https://github.com/Chicitadel/ugondu/actions/runs/40826286743) and COR validation [#40826286716](https://github.com/Chicitadel/ugondu/actions/runs/40826286716). The AWS physical gate, candidate freshness, trust-root and final signing remain skipped in validation-only mode.
- No AWS resources were deployed by this work. AWS remains conditional on traction/official engagement/funding and explicit account/budget authorization; AeroBill and Mandatag remain the sole federation authorities.
- Status remains **`PARTIAL / RELEASE BLOCKED / NOT CERTIFIED`**.


## 2026-10-29 additional Ugondu security finding — UG-COR-SIGNING-SECRET-SCOPE-001

- **Confirmed defect:** `.github/workflows/cor.yml` injected `COR_SIGNING_KEY` at the whole `cor` job level, exposing the private signing key to ordinary build, dependency-install and test steps even though only the final signer needs it. The trust-root public key was also job-wide.
- **Physical fix:** removed both values from job-level `env`; `COR_PUBLIC_KEY` is scoped only to the trusted conditional trust-root verification step and `COR_SIGNING_KEY` only to the trusted conditional final-signing step. Both remain gated by manual workflow dispatch, explicit repository opt-in and the trusted release-branch allowlist.
- **Regression test:** extended `tests/qualification/aws-physical-opt-in-contract.test.mjs` to fail if signing credentials return to job-wide scope or if the trust-root/signing steps lose the trusted dispatch/branch conditions.
- **Current source/test candidate before this documentation update:** `b7fed10bd61d9d12134a68dbbb0022d0234e35e3`. Exact-head CI/COR evidence is pending; do not claim the new regression test passed until the current SHA's workflow completes.
- This change does not deploy AWS resources and does not weaken any release gate.


## 2026-10-29 re-audit addendum — canonical change-control and release-gate test

This repository file remains the **single canonical cross-product guardrail**. Do not create a competing guardrail in another path or copy it into the Dumcholu repository. Link to this file from the product PRs and local agent instructions.

### New follow-up branch
- Ugondu follow-up branch: `fix/cor-guardrail-release-gates-2026-10-29`
- Follow-up PR: https://github.com/Chicitadel/ugondu/pull/42 (draft; base is the existing dedicated remediation branch).
- Do not merge PR #42 independently of its parent remediation PR; review the stacked PR sequence and rebase/reconcile only with explicit coordination.
- Latest known follow-up source commit when this addendum was prepared: `f54faf6a1ab866dfc3778a9f34648da738e19ae5`. Re-query the branch before relying on this SHA.

### Physical source and regression changes
- Added `tests/qualification/release-gate-scope.test.mjs` to assert that candidate-bound evidence freshness, signing trust-root verification, final signing, and the AWS physical gate use the same exact manual-dispatch + explicit repository opt-in + trusted-branch predicate.
- The test also guards against job-wide signing/AWS credential exposure and requires the physical AWS job to be explicitly gated.
- Wired both `aws-physical-opt-in-contract.test.mjs` and `release-gate-scope.test.mjs` into the COR workflow's remediation regression step.
- Added the test source and workflow invocation physically on the follow-up branch. **Execution is pending**: no current-head CI run or local execution receipt was available at handover time. Do not record this as a passing test until the exact candidate CI confirms it.

### Hosting decision and no-spend boundary
- DirectAdmin/shared hosting is suitable only for components supported by the actual plan. Static frontends may be hosted there; persistent Node/Go/Spring Boot processes, workers, and containerized services may require a VPS. Verify plan limits before choosing.
- AWS remains a prepared migration target, not an automatically authorized launch action. Migrate only after traction, meaningful official engagement or funding, and explicit account/budget/deployment approval. Do not provision AWS or incur charges during ordinary remediation.
- Preserve portable containerization, standard environment configuration, host-neutral domain logic, migration/restore support, health checks, graceful shutdown, and rollback capability. No provider-specific SDK dependencies in core domain logic.
- AeroBill remains authoritative for billing, usage metering, and rating; Mandatag remains authoritative for license and entitlement decisions. No local business-logic duplication or mock/fallback authorization.

### Required closeout
For each finding, physically implement before handover; add a regression that fails on the defect; run it against the exact candidate; record command, exit code, SHA, and evidence. If the environment or external service is unavailable, report **NOT RUN / BLOCKED**. Historical results are not current-head evidence. Release remains **PARTIAL / RELEASE BLOCKED / NOT CERTIFIED** until every required gate and live qualification has fresh candidate-bound evidence.


## 2026-10-29 finding: canonical transaction ID enforcement

- **Finding ID:** `UG-COR-STATE-ID-CANONICALIZATION-001`
- **Severity:** Medium (state identity/path aliasing; fail-closed input validation)
- **Reproduction:** `GetTransactionDir` trimmed surrounding whitespace and resolved a padded ID to the same directory as its canonical ID. `SaveState` already rejected padded IDs, but path resolution and `LoadState` could accept the alias. This created inconsistent identifier semantics and allowed a noncanonical caller value to address an existing transaction.
- **Physical fix:** `client/engine/state.go` now rejects whitespace-padded IDs in `GetTransactionDir`; `GetStateFilePath` and `LoadState` inherit the rejection through the shared resolver. Canonical IDs continue to resolve normally.
- **Regression test:** `client/engine/state_test.go` adds `TestTransactionPathResolversRejectWhitespacePaddedIDs`, covering transaction-directory lookup, state-file path lookup, and `LoadState` with a padded alias, followed by a successful load using the canonical ID.
- **Branch:** `fix/cor-state-id-canonicalization-2026-10-29` (stacked on the dedicated PR #42 branch; no protected branch writes).
- **Verification:** Source and test are committed. Exact-head CI is required before closure; no local test execution is claimed by this handover.
- **Rollback:** Revert the two source/test commits together if compatibility evidence reveals an approved caller depends on whitespace normalization; do not weaken the regression test without a reviewed ADR.
