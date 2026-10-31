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
