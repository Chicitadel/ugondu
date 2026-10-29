# COR Remediation Guardrail & Antigravity Handover

- Document ID: `COR-HANDOVER-GUARDRAIL-2026-10-29`
- Revision: 1.0.0
- Governance baseline: UAIGOS v3.0.0; fail-closed COR
- Repository: `Chicitadel/ugondu`
- Branch: `fix/cor-release-guardrails-2026-10-29`
- Base candidate: `5b6774ef2a1b41ae00b795a5656c876f30de89eb`
- Status: HANDOVER CONTROL DOCUMENT — NOT A COR CERTIFICATE

## 1. Immutable change rules

1. Never commit directly to `master`, `main`, or `phase4/production-hardening`. Work only on a dedicated, finding-specific branch and PR.
2. Before editing, record repository, branch, HEAD commit, working-tree status, finding ID, exact affected files, and baseline test results. Do not overwrite unknown user changes.
3. Re-audit the physical source and existing tests before changing code. A checklist or plan is not proof that implementation exists.
4. Every confirmed defect requires a physical source-code change, a targeted regression test that fails before the fix and passes after it, and relevant broader tests. If this environment cannot execute tests, mark validation BLOCKED/PENDING; never infer a pass.
5. Bind every receipt to the exact candidate commit and tree. Any code change invalidates prior exact-head CI/COR receipts; rerun the required gates on the new HEAD.
6. Never weaken assertions, skip tests, change expected results to fit broken behavior, suppress errors, or replace a failing implementation with mocks/stubs to obtain green CI.
7. Preserve existing public APIs, schemas, security boundaries, persistence semantics, localization, accessibility, and architecture. Prefer the smallest safe fix. Any proposed architectural change must document migration, compatibility, rollback, and regression coverage.
8. Avoid duplicate services, validators, configuration keys, feature registries, or parallel implementations. Search for existing authoritative abstractions first.
9. Treat all external inputs and evidence as untrusted. Validate before execution; use allowlists, canonical path containment, least privilege, timeouts, bounded retries, and fail-closed defaults.
10. Never report a test, deployment, transaction, or cloud resource as successful without an observable receipt. Do not mark planned streams as completed.
11. Billing, metering, invoices, plan pricing, and billing authority remain with AeroBill (`billing.airroofers.eu`). Licensing, entitlements, and license decisions remain with Mandatag (`license.airroofers.eu`). Product code must call the federation contracts and must not clone, shadow, bypass, or locally simulate those business rules.
12. Keep the application core provider-neutral and host-portable. Configuration comes from environment/profile/secrets; no cloud SDK types in domain models. Tier 1 DirectAdmin may serve static assets, Tier 2 VPS may host persistent services, and Tier 3 AWS is an opt-in deployment target. No costly resource should be provisioned without an explicit budget and deployment approval.
13. Never commit credentials, tokens, private keys, account identifiers, production data, or secret values. Use secret-manager references and placeholders only.
14. Do not claim UAIGOS compliance, 100% COR closure, or commercial release readiness while any mandatory gate, live staging/federation check, security review, or deployment qualification is pending.

## 2. Candidate findings and evidence known at handover

### Ugondu

- `UG-COR-QUALIFICATION-MANIFEST-COVERAGE-001`: reported implemented on candidate `5b6774ef`; qualification regression suite and remote CI/COR receipts were reported green for that candidate. Re-run exact-head gates after any subsequent change.
- `UG-COR-STREAM-K-COMMAND-ALLOWLIST-001`: reported implemented on separate candidate `ec97b9d6` / PR #45. This is a separate branch lineage; do not assume it is present in this branch unless ancestry/diff confirms it.
- Prior handover commit inspection found a validator diagnostic newline correction in the commit history. Exact-head evidence must match the final candidate; do not reuse earlier receipts after code changes.
- The repository `package.json` exposes `npm run test:governance`, `npm run governance:validate`, `npm run test:security`, `npm run test:aws-physical-opt-in`, and `npm run test:policy-pack-boundary`. Run the relevant suite and record exit codes and logs.

### Dumcholu

- The supplied forensic report describes candidate `a523ad42` / PR #11 for application persistence, plus a later PowerShell runner fix at `6c5e803`. Confirm the current PR head and ancestry before assuming both commits are included.
- Reported local receipts include 40/40 Maven tests for `opportunity-map-service`, 18/18 Flutter citizen tests, 7/7 ECS task-definition tests, locale/API/UI validators, and remote workflow runs. These are historical receipts, not proof of the current checkout or live deployment.
- Keep Dumcholu work in its own repository and dedicated branch. Do not copy Ugondu implementation files into Dumcholu or create cross-product code duplication.

## 3. Mandatory execution sequence for every re-audit

1. Read the current finding register, prior handover notes, current PR, latest branch head, and relevant source/tests.
2. Establish a clean isolated branch from the intended candidate. Record base SHA and tree SHA.
3. Reproduce each finding with a minimal failing test or deterministic reproduction. If not reproducible, document why and keep it OPEN pending evidence.
4. Implement the physical fix in the authoritative source location.
5. Add a regression test covering the original failure and negative/fail-closed cases. Add tests for boundaries, malformed input, retries/idempotency, and platform differences where relevant.
6. Run targeted tests first, then relevant module tests, governance gates, security tests, build/type checks, contract/schema drift checks, and full CI matrix as available.
7. Inspect the final diff for scope creep, accidental secrets, duplicated logic, deleted assertions, bypasses, hardcoded environment assumptions, and architecture downgrades.
8. Record exact commands, exit codes, test counts, logs/artifacts, commit SHA, tree SHA, and workflow run URLs. Rerun exact-head COR after the final code change.
9. Open/update a draft PR with the finding IDs, root cause, changed files, regression proof, remaining limitations, rollback, and deployment implications.
10. Update the finding register only with evidence-supported statuses: OPEN, REPRODUCED, IMPLEMENTED, LOCAL-TESTED, EXACT-HEAD-CI-PASSED, STAGING-VERIFIED, FEDERATION-VERIFIED, or CLOSED. No status may skip required evidence.

## 4. Deployment and hosting guardrails

- Current launch constraint: no VPS available; shared hosting is available. Use DirectAdmin for compatible static/web artifacts only; do not pretend it can run persistent backend workers unless the host explicitly supports them.
- AWS account availability is not proof of permission, credentials, budget, or deployed resources. This handover does not create or modify AWS resources.
- For a minimal-cost AWS staging plan, first inspect the existing account, region, quotas, billing alarms, and deployed resources. Prefer a single low-cost, isolated staging footprint, scale-to-zero/stop schedules where supported, log retention limits, and explicit budget alerts. Validate actual service runtime requirements before selecting EC2, ECS/Fargate, RDS, NAT, or load balancers; these services have materially different cost profiles.
- Do not provision production, public endpoints, paid managed databases, NAT gateways, or always-on compute without explicit approved cost estimates and deployment authorization.
- Externalize database, storage, queues, telemetry, and identity configuration. Keep Docker Compose/VPS and AWS manifests aligned to the same application image and environment contract. No host-specific conditional business logic.
- Deployment is not complete until health/readiness checks, rollback, backup/restore, TLS, least-privilege IAM, secrets, telemetry, and smoke tests have real receipts.

## 5. Release blockers that remain until evidenced

- Exact-head COR and complete CI for the final candidate.
- Actual runtime deployment qualification for the chosen host tier.
- Live non-production authentication/identity, AeroBill billing/metering, and Mandatag entitlement/license transactions.
- Secret/configuration validation and security review for staging.
- Operational checks: readiness, logs/metrics, backup/restore, rollback, cost limits, and incident ownership.
- Product-owner/architect sign-off on a traceable evidence bundle.

**Release status: PARTIAL / RELEASE BLOCKED / NOT CERTIFIED.** This document is a guardrail and handover, not a claim that defects have been exhaustively eliminated or that AWS deployment has occurred.


## 6. Finding UG-COR-FEDERATION-EGRESS-001 — IMPLEMENTED, VALIDATION PENDING

- Finding: the `billing-gateway` service in the root `docker-compose.yml` referenced external identity and AeroBill authorities but was attached only to `ugondu-internal`, which is declared `internal: true`. This prevents ordinary outbound connectivity from that service and breaks the intended federation path in the Compose deployment.
- Physical change on branch `fix/cor-federation-egress-network-2026-10-29`: attached `billing-gateway` to both `ugondu-internal` (private service-to-service traffic) and `ugondu-external` (outbound federation). No host port was added; this does not expose the billing gateway directly to the host.
- Regression test: `tests/qualification/federation-egress-network.test.mjs`, included in `npm run test:governance`. The test checks both network attachments, that the internal network remains isolated, and that the gateway is not host-published.
- Validation status: source/test committed; exact-head CI and runtime connectivity test are pending. Do not mark the finding CLOSED until the test runs on the final commit and non-production identity/AeroBill calls produce real receipts.
- Architecture guardrail: Ugondu must remain a client of Air Roofers federation. It must not implement or store its own authoritative billing, pricing, or entitlement decisions.


## 7. Cross-repository remediation receipts — 2026-10-29

### Ugondu — `UG-COR-FEDERATION-EGRESS-001`
- Dedicated branch: `fix/cor-federation-egress-network-2026-10-29`; PR #48: https://github.com/Chicitadel/ugondu/pull/48.
- Physical fix: `docker-compose.yml` attaches `billing-gateway` to both the private internal network and the outbound network required to reach the external Air Roofers identity and AeroBill authorities; no host port is published.
- Regression test: `tests/qualification/federation-egress-network.test.mjs`, included in `npm run test:governance`. Exact candidate `dff668da2509a6d8d3bef0306e9522fd70108358` run #40912493475 showed the governance suite at 24/24 passing, including the two new federation network tests. Full CI integration tests were still running at the time of this note update.
- COR run #40912493424 completed successfully as a workflow, but the AWS Physical Qualification Gate was **skipped**. This is not AWS deployment proof and does not certify release readiness.

### Dumcholu — `DUM-COR-DEPLOY-ENV-ISOLATION-001`
- Dedicated branch: `fix/cor-aws-environment-isolation-2026-10-29`; PR #13: https://github.com/Chicitadel/dumcholu/pull/13.
- Physical fix: task-definition renderer and template now validate environment/tier selection, default to staging, reject recognizable cross-environment secret references, and support the declared EC2/Fargate portability tiers. EC2/Fargate CloudFormation templates use cost-bounded staging defaults, short log retention, and Secrets Manager-only database injection with scoped secret permissions.
- Exact candidate `04c4c7b85316e9a177f118f8c351f07db12a2daf`: Deployment Manifest Qualification run #40913066856 passed; renderer and deployment regression suite reported 11/11 passing, 0 failures. Dumcholu Product Name Governance was running when this note was authored.
- CloudFormation service-side validation, account inventory/budget approval, AWS provisioning, live health/readiness, rollback, and live AeroBill/Mandatag transactions remain unverified.

## 8. Mandatory state discipline

These receipts prove only the stated automated checks. Do not mark either finding fully CLOSED, staging-verified, or federation-verified until the latest candidate head has complete required CI and the corresponding runtime evidence. Do not infer an AWS deployment from manifest validation or a successful COR workflow whose physical AWS gate was skipped. Maintain `PARTIAL / RELEASE BLOCKED / NOT CERTIFIED` until all mandatory gates are satisfied.
