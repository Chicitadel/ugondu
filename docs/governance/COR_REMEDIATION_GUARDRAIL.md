# COR Remediation Guardrail & Antigravity Handover

- **Document ID:** AR-UG-COR-GUARDRAIL-2026-10-29
- **Owner:** Air Roofers SASU / Ujomor Systems Engineering & Governance Authority
- **Products:** Ugondu and Dumcholu (separate repositories and release candidates)
- **Status:** PARTIAL — RELEASE BLOCKED — NOT CERTIFIED
- **Authority:** UAIGOS v3.0.0; security > governance > compliance > architecture/protocol freeze > contracts > domain rules > implementation > optimization/refactoring.

## 1. Source of truth and change isolation

- Ugondu repository: https://github.com/Chicitadel/ugondu
- Current Ugondu work branch: `fix/cor-guardrail-release-gates-2026-10-29`
- Parent remediation branch / PR: `fix/cor-aws-physical-opt-in-2026-10-28`, draft PR #41.
- Dumcholu repository: https://github.com/Chicitadel/dumcholu
- Existing Dumcholu work branch / PR: `fix/cor-gap-remediation-2026-10-28`, draft PR #10.
- Never commit to, reset, force-push, or merge into `main`, `master`, or `phase4/production-hardening` as part of remediation. Never rewrite a candidate branch's history to make evidence appear fresh.
- Keep product changes in their own repository. Do not copy backend/domain code between Ugondu and Dumcholu without an approved Architecture Decision Record (ADR).
- This file is the shared handover contract. Update it in the same remediation branch whenever scope, evidence, status, or architecture decisions change. Do not let local Antigravity notes override this repository artifact.

## 2. Non-negotiable architecture and operations

1. **One code, host anywhere:** business/domain logic must not depend on AWS SDKs, filesystem layouts, a specific reverse proxy, or provider-specific managed services. Infrastructure-specific wiring belongs in adapters, deployment manifests, and environment configuration.
2. **Hosting is a deployment choice, not a code fork:** prefer DirectAdmin/shared hosting only for static frontend, compatible PHP workloads, and other services the actual plan supports. If persistent Node/Go/Java workers, containers, background jobs, or database controls are unavailable, use a small managed VPS. Keep Docker Compose and environment-based configuration portable. AWS is a later deployment target after traction, meaningful official engagement/funding, explicit account/budget approval, and deployment authorization.
3. **No unapproved cloud spend:** ordinary push/PR validation must not assume AWS roles, provision/delete resources, or run physical qualification. AWS physical COR requires manual `workflow_dispatch`, `run_aws_physical_qualification=true`, repository variable `AWS_PHYSICAL_QUALIFICATION_ENABLED=true`, and trusted branch `main` or `phase4/production-hardening`. Fail closed if any predicate is absent.
4. **Federated commercial authority:** AeroBill (`billing.airroofers.eu`) owns billing, rating, and usage metering. Mandatag (`license.airroofers.eu`) owns licensing and entitlements. Do not duplicate, shadow, mock, or silently fall back from these business decisions inside either product.
5. **Production-safe defaults:** no demo tokens, implicit allow, mock data in production, secret literals, fail-open authentication, or unbounded AI charges. Fail closed on missing configuration, invalid signatures, malformed state, and authorization failures.
6. **No architecture downgrade:** preserve domain boundaries, contracts, tenant isolation, localization/tokenization, observability, rollback, state integrity, and security controls. Do not add duplicate registries, parallel business logic, replacement frameworks, or weaker validators to get green CI.
7. **No certification by assertion:** passing unit tests or PR validation is not final COR certification. Candidate-bound evidence must match the exact commit, trust-root verification and signing must succeed in the authorized release process, and deployment/federation/recovery checks must be evidenced.

## 3. Required remediation loop for every finding

For each audit finding, record a stable ID, severity, source path/line, reproducible failure, root cause, physical code fix, regression test, command, exact candidate SHA, test result, evidence location, and residual risk. Then:
1. Reproduce against the current branch head; distinguish confirmed defects from unverified claims.
2. Implement the fix in physical source/configuration before handing anything to an Antigravity agent.
3. Add a regression test that fails before the fix and passes after it; test negative/fail-closed paths, not only happy paths.
4. Run targeted tests, affected workspace tests, build/type checks, and relevant governance validators. Capture exit codes and exact SHA.
5. Inspect the diff for secrets, scope creep, duplication, architecture weakening, generated artifacts, and unrelated edits.
6. Update the ledger and this handover in the same branch. Do not reuse evidence from an earlier SHA.
7. If local execution or a live dependency is unavailable, mark it **NOT RUN / BLOCKED**; never invent a pass.
8. Hand over only a committed, reviewable patch with the failing evidence, fix, tests, remaining work, and rollback instructions.

## 4. AWS and low-cost hosting decision

- **No AWS deployment is authorized by this remediation alone.** No account, budget, region, or production credentials should be inferred from repository configuration.
- Keep the AWS path ready through portable container images, externalized configuration/secrets, health checks, graceful shutdown, stateless application nodes where appropriate, persistent database migrations, backups, and deployment/rollback manifests.
- Keep secrets out of source and logs. Use host-provided secret/environment configuration on shared hosting/VPS and a secrets manager only in the AWS adapter/deployment layer.
- Before AWS migration: approve a monthly budget and hard limits; select the Paris region (`eu-west-3`) only after account approval; estimate always-on compute, database, NAT/egress, logs, storage, backups, and certificate costs; validate teardown; and prove backup restore and rollback.
- A static SPA can be served on shared hosting, but a backend requiring a persistent process cannot be assumed deployable on a basic shared-host plan. Verify actual DirectAdmin plan capabilities first; otherwise choose a small VPS. This is an operations decision, not permission to fork or rewrite core code.

## 5. Evidence and current release gate

The supplied forensic report records historic receipts, but explicitly states that some runs were pending and some receipts were from earlier candidate SHAs. Treat those as historical only. Re-query CI on the exact current candidate before relying on them.

Outstanding prerequisites include:
- exact-head CI, COR workflow, regression suite, build/type checks, and governance validators all green;
- candidate-bound evidence freshness, pinned trust-root verification, and final authorized signing;
- controlled non-production deployment on the actual selected host, with routing, persistence, restart/recovery, rollback, and tenant isolation verified;
- live non-production AeroBill billing/metering and Mandatag entitlement checks;
- AWS residual-resource/account reconciliation before any physical AWS qualification;
- explicit release-owner approval.

Until each applicable prerequisite has fresh evidence, release status remains **PARTIAL / RELEASE BLOCKED / NOT CERTIFIED**. Never describe COR as 100% closed or the products as commercially certified based only on this document.

## 6. Antigravity execution rules

- Read this guardrail and the current execution ledger before making changes.
- Work only on the designated remediation branch; inspect `git status`, current SHA, and branch before edits.
- Do not overwrite other actors' changes. Re-fetch and reconcile if the branch advances; use small commits and explicit file ownership.
- Avoid parallel edits to the same file. Coordinate shared contracts and generated files through one designated owner.
- Every claimed fix must point to physical changed files and a regression test. No docs-only closure for a code defect.
- Do not change frozen protocols, APIs, data contracts, or security policy without a reviewed ADR and migration/compatibility tests.
- Report: finding IDs closed, changed files, exact commit SHA, commands/results, CI URLs, remaining blockers, and rollback method.
