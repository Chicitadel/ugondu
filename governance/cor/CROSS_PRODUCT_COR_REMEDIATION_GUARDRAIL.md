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
