# Air Roofers dual-product COR master handover — 2026-10-31 (re-audit continuation)

**Purpose:** Central agent/actor guardrail for the current Ugondu and Dumcholu candidate work. This document is evidence-led and does not supersede product constitutions, ADRs, threat models, data contracts or release authority.

## 1. Constitutional boundaries

- UAIGOS v3.0.0 is the governing execution and evidence standard.
- Preserve one code — host anywhere. Configuration, secrets, persistent state, health checks, shutdown and deployment topology remain externalized.
- AeroBill is the sole authority for billing, pricing, metering and usage accounting.
- Mandatag is the sole authority for licensing and entitlements.
- Do not duplicate either authority in Ugondu or Dumcholu.
- No master/main writes, no speculative architecture downgrade, no mock/synthetic success in production.
- Do not provision billable AWS resources without explicit funding/budget authorization.

## 2. Candidate ledger

### Ugondu PR #64 — multi-process passport store

- Branch: `fix/cor-passport-multiprocess-write-lock-2026-10-31`
- Candidate source commit: `65d38324`; later evidence/documentation descendant: `fff80029`.
- Reported exact-head evidence: COR #41153048107/#41153053982, CI/CD #41153048212/#41153053969 and manifest #41153048222/#41153053973 succeeded. The COR job record still showed external trust-root/final authority/AWS gates skipped in the earlier verification; use the uploaded 31 Oct audit report's corrected accounting. Multi-host durability remains open.

### Ugondu PR #65 — lock lifecycle safety follow-up

- Branch: `fix/cor-passport-lock-owner-safety-2026-10-31`
- Latest head at this handover: `c915960f6af070131694a6ff4175ccfe86b99323`
- PR: https://github.com/Chicitadel/ugondu/pull/65
- Finding: age-only stale lock deletion can steal a live writer lock; `clear()` bypassed the lock; mtime-based read freshness is unreliable on coarse timestamp filesystems.
- Physical changes: exclusive mkdir lock, owner metadata/token, ownership-checked release, no automatic age-only stale reclamation, bounded lock wait, serialized clear, forced fresh reads.
- Initial CI failed in passport-store tests (3 failed, 260 passed). The failure was diagnosed: rename publication could replace an existing empty lock; error tests expected symbolic codes in messages. Physical follow-up fixes are committed. **Exact-head rerun is pending; do not mark qualified.**
- Abandoned/ownerless locks intentionally fail closed. Operator must stop/isolate all writers, independently prove no owner is active, back up the store, remove only the exact lock directory, then verify writes/revocation before traffic returns.
- Multi-host durability remains OPEN. A local shared filesystem lock does not coordinate separate EC2/ECS local disks.

### Dumcholu PR #29 — career optimistic locking

- Branch: `fix/cor-career-optimistic-locking-2026-10-31`
- Current PR head: `ffafd37cce49d83e4216b2842cb18f9d5147d142`; prior source qualification receipt cited in the report is `ffafd37b98ec34b6bdf6721516f4e6676cb3df1a`.
- PR: https://github.com/Chicitadel/dumcholu/pull/29
- JPA `@Version` plus separate Flyway `orm_version` columns; domain `case_version` preserved.
- Candidate runtime, manifest and naming receipts #41144190967, #41144190301, #41144190405 succeeded on the reported candidate. Re-run if code changes or exact source head differs.

### Dumcholu PR #30 — citizen Opportunity Map no-synthetic feed

- Branch: `fix/opportunity-map-no-synthetic-citizen-feed-2026-10-31`
- Head: `464526eb5805fcc48985fbb03fb4a7201830613c`
- PR: https://github.com/Chicitadel/dumcholu/pull/30
- Removed hardcoded citizen vacancy catalogue, artificial fetch delay, periodic fake SSE and hardcoded Paris GPS/locate action. Screen now presents an explicit empty state until the authenticated authoritative feed is integrated.
- Node no-synthetic regression and Java 21 backend Opportunity Map workflow succeeded on this exact head: [Opportunity Map run #41186423255](https://github.com/Chicitadel/dumcholu/actions/runs/41186423255); Product Name Governance #41186423245 succeeded.
- This is an integrity fix, **not** live Opportunity Map completion.

### Dumcholu PR #23 — task definition secret binding

- Branch: `security/cor-task-secret-binding-integrity-2026-10-30`
- Head: `ebadc36b6b015d3daf0f323f4d04de9ee3d13aa1`
- Enforces exact Secrets Manager ARN-to-environment variable mapping and rejects plaintext DB credentials. Deployment manifest #41063882569 and naming #41063882437 succeeded on that exact candidate.

## 3. Open Opportunity Map requirements

Do not close these based on the PR #30 static regression:
1. Authenticated citizen viewport and ranked-match API contract; bind identity from the verified principal/session, never caller-controlled citizen IDs.
2. Complete/versioned read model for match evidence, missing skills, deadline, commute and costs. Never invent missing fields.
3. Authenticated SSE with event IDs, Last-Event-ID replay, reconnect/backoff, heartbeat, event validation, revocation and multi-instance fan-out/durable replay.
4. Real geolocation permission and device location.
5. Government source-backed aggregates with server-side k-anonymity and suppression.
6. Partner source-backed curricula/capacity/alignment and real audited export jobs.
7. Admin source registry, source rights/licences, ingestion and verification queues, provider health/credential lifecycle, RBAC.
8. Provenance, freshness, expiry, withdrawal/takedown and evidence chain.
9. Map renderer/provider integration, approved commercial terms, attribution, restricted client key, quotas and outage behavior.
10. Privacy/legal review, staging E2E, restore/failover/rollback and independent COR signoff.

## 4. AWS and launch cost governance

- DirectAdmin remains the current low-cost host only for supported workloads.
- VPS is an intermediate tier when available and funded.
- AWS staging/production is gated by traction, official engagement/funding and explicit budget authorization.
- Preferred region: `eu-west-3` (Paris).
- For a minimal pilot, evaluate ECS on small EC2 capacity before always-on Fargate; retain portable OCI images/task definitions so Fargate can be adopted later without domain/business-logic changes.
- Price and qualify database, storage, EFS, backups, network egress, observability and recovery—not just compute. No infrastructure was provisioned in this remediation.
- Shared passport storage must use a truly shared durable adapter for multi-host deployment; same path on separate local disks is not shared state.

## 5. Agent execution contract

1. Re-fetch latest PR head and changed-file diff before editing.
2. Read product-local handovers and relevant ADRs.
3. Reproduce finding, identify exact boundary, implement physical source fix on dedicated branch.
4. Add adversarial, negative, concurrency, tenant-isolation, outage and migration regressions as appropriate.
5. Run focused tests and full affected package tests. Require exact-head remote workflows.
6. Record failed runs and corrective commits; never erase failed evidence or carry forward stale green receipts.
7. Preserve API/domain ownership; one canonical adapter per bounded context.
8. Never introduce local billing/entitlement logic, fabricated data, fake timers, silent exception swallowing, credentials in source or unreviewed fallback behavior.
9. If an external source, legal approval, key, device, funding or physical environment is unavailable, leave the gate OPEN/BLOCKED and state the dependency.
10. No PR merge, deployment or COR certification without required human approval.

## 6. Combined posture

- Ugondu PR #64 intra-host multi-process candidate: reported qualified; PR #65 safety follow-up has an initial failed run fixed in code, with exact-head rerun pending.
- Dumcholu PR #29 optimistic locking: candidate qualification reported successful.
- Dumcholu PR #30 citizen UI synthetic feed removed; backend and UI guard workflows passed; live API/SSE and remaining Opportunity Map work remain open.
- AWS physical deployment: deferred, no resources provisioned.
- Combined public commercial release: **PARTIAL / RELEASE BLOCKED / NOT CERTIFIED** until multi-host durable passport state, live federation, Opportunity Map live-source/legal/privacy/E2E gates, trust-root and final authority signoff are complete.


## 6. Re-audit continuation — 2026-10-31 09:30Z

### Ugondu PR #65 — runtime input validation follow-up

**New finding: UG-PASSPORT-RECORD-RUNTIME-VALIDATION-001.** The persisted-record loader rejected malformed optional fields, but `set()` only checked trimmed passport and tenant IDs. A JavaScript caller, deserialized value or unsafe cast could therefore write `NaN`/infinite timestamps, non-boolean revocation flags, non-string workspace/reason fields or blank tenant identifiers. JSON serialization can turn non-finite numbers into `null`, poisoning the store so subsequent strict loads fail closed.

**Physical remediation on this branch:**
- Added one shared `parsePassportRecord` runtime validator and reused it for persisted reads and `set()`.
- Validates non-empty passport/tenant IDs, key-to-ID identity, optional field types and finite numeric timestamps before state mutation.
- `revoke()` now rejects blank/non-string reasons and trims accepted reasons.
- Corrected the lock lifecycle comment to describe fail-closed abandoned-lock handling rather than stale-lock recovery.
- Added regressions for NaN, Infinity, wrong optional field types, blank tenant IDs, valid writes after rejected input, and blank revocation reasons.

**Latest physical commits:** source `903cddcee02c8279d11145ac67dc484a90efbff5`; regression `8348ffb5a35b529a7fe0e86c0ce4bd69c64516c4`. Exact-head CI has not yet been observed for these commits. Do not mark this follow-up qualified until the current branch head has successful unit, workspace, COR and manifest receipts.

### Ugondu CI evidence boundary

The supplied run records show COR #41187539093 and manifest #41187539163 succeeded, and CI/CD #41187539099 plus push #41187534585 succeeded. In COR #41187539093, the AWS Physical Qualification Gate was **SKIPPED**. These receipts must be SHA-matched to the final source/test commit before being used as current-head evidence. They do not prove a physical AWS deployment.

### Dumcholu PR #31 — false application-success removal

- PR: https://github.com/Chicitadel/dumcholu/pull/31
- Branch: `fix/opportunity-map-no-false-application-success-2026-10-31`
- Stacked on PR #30 branch `fix/opportunity-map-no-synthetic-citizen-feed-2026-10-31`.
- Confirmed finding: detail-sheet `onApply` displayed `consent_success` despite no authenticated application request or backend receipt.
- Physical source commit: `fce418ffd87f07a719f1008fbe244e30ff36f11c`; regression test commit: `37687baeca34cc6c7f1cb93bc72365c03735541e`; handover commit: `72a029e806bfd0cadb65603442ef8e41f2a76113`; CI trigger qualification update: `17c4ab888323603a2b0201a179e236139ba4343d`.
- Removed the success snackbar/token; callback remains fail-closed until the authenticated application API returns a server-confirmed receipt. Regression guard rejects reintroduction.
- CI status pending. The application API, idempotency, consent capture, authorization, persistence, audit event and receipt contract remain OPEN.

### Cross-product invariants

- No AWS resource provisioning has occurred. Any future staging/production deployment requires traction/official engagement or funding plus explicit budget approval.
- Keep preferred region `eu-west-3`; preserve portable OCI/runtime artifacts and separate EC2/Fargate profiles. Do not add AWS-only domain logic.
- AeroBill remains sole billing/pricing/metering authority; Mandatag remains sole licensing/entitlement authority.
- Keep the overall state `PARTIAL / RELEASE BLOCKED / NOT CERTIFIED`. Internal workflow success cannot waive live federation, trust-root, multi-host durability, privacy/legal, staging E2E or final authority gates.


### Dumcholu PR #32 — career timeline evidence integrity

- PR: https://github.com/Chicitadel/dumcholu/pull/32
- Branch: `fix/career-timeline-no-unverified-range-2026-10-31`, stacked on PR #29.
- Finding: `JourneyStage` carries a bare numeric duration without provider/source reference, verification state or evidence timestamp, while the estimator labeled it sourced and extrapolated best/extended ranges with uncalibrated 0.80/1.35 multipliers.
- Physical fix: `TimelineEstimator.estimateFromSourcedStages` now returns `DURATION_NOT_YET_ESTIMABLE` until verifiable source provenance exists; unsupported range arithmetic removed.
- Regression: `TimelineEstimatorEvidenceTest` asserts bare positive durations and empty stage lists cannot produce an estimate.
- Source commit `dedc16ed4a4c4eadf30512a5ad07678982894726`; test commit `dbb8921c14e893cbc2d34638f349350fe4c0f130`; handover `67dd8fecdf3863919c1e634ed10341c63eed1a2e`.
- Exact-head runtime, manifest and naming workflows are running; no pass is claimed until all finish.

### Dumcholu PR #31 — false application success

- Narrow exact-head Opportunity Map COR Regression #41188924304 completed successfully; its citizen integrity and Java 21 backend jobs both passed. Product Name Governance #41188924356 also succeeded.
- This qualifies only the false-success guard and related backend regression on the recorded head. The application API and receipt contract remain open.


### Dumcholu PR #33 — Opportunity Map default territory

- PR: https://github.com/Chicitadel/dumcholu/pull/33
- Branch: `fix/opportunity-map-remove-paris-default-2026-10-31`, stacked on PR #30.
- Finding: despite fake GPS removal, the citizen map still hardcoded Paris/Île-de-France as the selected initial territory.
- Physical fix: initial selection now uses the canonical Africa > Nigeria zone nodes as the product's primary launch market; code explicitly states this is not inferred device location. Manual territory selection remains.
- Added regression coverage against reintroducing the Paris city default and updated branch filters so this stacked PR runs the Opportunity Map COR workflow.
- Source `c0b03f6e9ece7882497da11ec5a1281553830acb`; test `b8e98a28ebb5d0e33a6a0958de6706f14550a711`; handover `f5fa13ed172d9413e25f23f86d56757edeea125d`; CI workflow `14157b5c1b3b471c1be71c127de1c1c6db130576`.
- Opportunity Map COR Regression #41189241449 is in progress; Product Name Governance #41189241452 is queued. No pass claimed yet.
- Real geolocation remains OPEN; product default is not a user-location signal.

### Current branch and evidence rules

Every candidate is stacked on its identified parent PR branch; review merge order before integrating. A green parent workflow does not qualify a child change. Every physical source/test change requires fresh exact-head evidence. No PR is merged by this automation, and no AWS resources are provisioned.
