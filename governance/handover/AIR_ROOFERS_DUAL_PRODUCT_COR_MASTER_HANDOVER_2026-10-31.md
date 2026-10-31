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


### Dumcholu PR #33 — exact-head qualification result

At head `14157b5c1b3b471c1be71c127de1c1c6db130576`:
- Opportunity Map COR Regression [#41189241449](https://github.com/Chicitadel/dumcholu/actions/runs/41189241449): **SUCCESS** — citizen UI guard and Java 21 backend regression passed.
- Product Name Governance [#41189241452](https://github.com/Chicitadel/dumcholu/actions/runs/41189241452): **SUCCESS**.
This qualifies the narrow territory-default correction only. It does not close real geolocation, live authenticated feed, source evidence, legal/privacy or staging gates.


## 7. Re-audit continuation — 2026-10-31 10:01Z

### Exact-head CI reconciliation against the uploaded Master Execution Audit Plan

The uploaded plan reports all four candidate groups as exact-head green. This was independently rechecked against GitHub commit workflow runs:
- Ugondu PR #65 head `1afb0e8f8a79518ae7a3613edeac6a803fe6522d`: COR #41189327925 **SUCCESS**, CI/CD #41189327821 **SUCCESS**, manifest #41189327786 **SUCCESS**.
- Dumcholu PR #31 head `17c4ab888323603a2b0201a179e236139ba4343d`: Opportunity Map regression #41188924304 **SUCCESS**, naming #41188924356 **SUCCESS**.
- Dumcholu PR #32 head `67dd8fecdf3863919c1e634ed10341c63eed1a2e`: portable runtime #41189121800 **SUCCESS**, manifest #41189121805 **SUCCESS**, naming #41189121808 **SUCCESS**.
- Dumcholu PR #33 head `14157b5c1b3b471c1be71c127de1c1c6db130576`: Opportunity Map regression #41189241449 **SUCCESS**, naming #41189241452 **SUCCESS**.
- Important: Ugondu COR #41189327925 reports the AWS Physical Qualification Gate **SKIPPED**, and the final trust-root/signature steps were skipped. A successful workflow summary is not a cryptographically signed public-release certificate and is not a physical AWS deployment.

### Dumcholu PR #34 — second career timeline provenance bypass

**Finding: DUM-COR-CAREER-READINESS-TAG-UNVERIFIED-001.** PR #32 correctly disabled numeric duration from bare `JourneyStage` records, but `TimelineEstimator.estimateDays` still trusted caller-writable `OpportunityReadiness.recommendations` strings prefixed `SOURCED_DURATION_DAYS:` and dimension names prefixed `SOURCED_STAGE_DAYS:`. Those fields are ordinary persisted strings and were not cryptographically or structurally bound to an authorized provider/source record.

**Physical remediation:**
- Removed both free-form metadata parsing paths.
- Preserve zero only if the current readiness snapshot already meets the target; otherwise return `DURATION_NOT_YET_ESTIMABLE`.
- Added regressions for forged recommendation and dimension tags, target-met behavior, and invalid targets.
- Added `docs/governance/CAREER_TIMELINE_READINESS_TAG_PROVENANCE_2026-10-31.md`.

PR: https://github.com/Chicitadel/dumcholu/pull/34
Branch: `fix/career-timeline-reject-unverified-readiness-tags-2026-10-31`, stacked on PR #32.
Source commit `036f2788faa4e0286d544b1da8268a3abeddc174`; regression commit `58c033eccde94197709105d39dca4dfb0a380505`; handover `d9a5a6fca0b199f10c9bd83b2dbccc294afdb6d4`.
Exact-head Java 21 qualification not yet triggered/observed at this update. PR #34 is draft and unmerged.

### Overall release and hosting state

- The four candidate groups above are narrow-scope qualified on their exact recorded SHAs; PR #34 is a new pending candidate.
- No AWS physical qualification occurred: the Ugondu AWS gate was skipped. No AWS resources were provisioned in this remediation.
- Multi-host passport durability, live Opportunity Map service contract/SSE replay, verified career-source evidence, live AeroBill/Mandatag transactions, trust-root ceremony and physical staging/production E2E remain external/architectural release gates.
- Preserve state: `PARTIAL / RELEASE BLOCKED / NOT CERTIFIED`.


### PR #34 exact-head qualification update — 2026-10-31 10:02Z

At head `d9a5a6fca0b199f10c9bd83b2dbccc294afdb6d4`:
- Product Name Governance #41190938619: **SUCCESS**.
- Deployment Manifest Qualification #41190938633: **SUCCESS**.
- Dumcholu Portable Runtime Qualification #41190938648: **IN PROGRESS**, executing Java 21 runtime/dependency reactor tests.
- PR #34 remains draft, unmerged, stacked on PR #32. Keep the readiness-tag finding pending until the runtime workflow succeeds.


---

## Consolidated re-audit update — 2026-10-31 11:40Z

### PR #34 exact-head receipt reconciliation

The previous 10:02Z note showing Java runtime qualification as in progress is superseded. Rechecked the exact candidate SHA `d9a5a6fca0b199f10c9bd83b2dbccc294afdb6d4`:
- Dumcholu Portable Runtime Qualification #41190938648: **SUCCESS**.
- Deployment Manifest Qualification #41190938633: **SUCCESS**.
- Product Name Governance #41190938619: **SUCCESS**.

PR #34 remains draft/unmerged. The caller-writable readiness-duration bypass is narrowly qualified; typed provider provenance and live source integration remain OPEN.

### Dumcholu PR #35 — authoritative territorial registry route integration

**Finding: DUM-COR-ZONE-HIERARCHY-FALLBACK-001.** Forensic review of the existing safety branch showed the previous fix was incomplete: the client still called legacy `/v1/territories/hierarchy`, while CountryController exposes `/api/v1/areas` and `/api/v1/areas/{id}/children`. Synchronous resolver helpers also retained `getPreloadedHierarchy()` fallback paths.

**Physical remediation now committed on a dedicated branch:**
- PR: https://github.com/Chicitadel/dumcholu/pull/35
- Branch: `fix/territory-registry-live-contract-2026-10-31`
- Base: `remediation/dumcholu-citizen-live-ui-2026-10-28` (not master/main).
- Implementation commit: `2951ef51b9298578e667a834f0d725ff1b0e7e97`.
- Remaining synchronous fallback removal: `f277a96bdcd9dc58b790f48565697694680e869a`.
- Regression test commit: `0888b565c74266aee2204e54293ab8d130074c00`.
- Agent guardrail: `docs/governance/TERRITORY_REGISTRY_LIVE_CONTRACT_REMEDIATION_2026-10-31.md`, commit `c3e74fcfb2ce4ef1db9d4b1542aeb6249fd02b8a`.

The client now queries the actual country-domain route, builds a dynamic tree from live continent/country roots and child endpoints, rejects malformed/cyclic/over-depth/unsupported data, and returns an explicit empty hierarchy on registry failure. Resolver sync helpers no longer call the bundled hierarchy repository. New Flutter tests cover the route paths, multi-tier live tree, HTTP failure and no preloaded sync fallback.

**Qualification status:** PR #35 is draft and unmerged. Remote CI and live staging/gateway/authentication checks have not yet been observed. Do not mark it qualified until exact-head workflows pass.

### Current cross-product release ledger

- Ugondu PR #65: narrow passport writer-safety/runtime-validation candidate has green COR/CI/manifest receipts at source/test candidate SHA `1afb0e8f8a79518ae7a3613edeac6a803fe6522d`; the AWS Physical Qualification Gate and final trust-root/signature steps were skipped. Multi-host passport durability remains OPEN.
- Dumcholu PRs #29–#34: narrow findings and recorded workflow receipts as listed above; PR #34 exact-head Java 21 runtime now confirmed SUCCESS.
- Dumcholu PR #35: territorial route mismatch and remaining resolver fallback paths physically corrected; exact-head CI pending.
- Opportunity Map live authenticated API, SSE replay/fan-out, real permission-based geolocation, source provenance/rights, application submission API/receipt, career provider evidence, live AeroBill/Mandatag transactions, trust-root ceremony and independent final COR remain open.

### Non-negotiable Antigravity agent execution contract

1. Read this handover and the relevant PR-specific handover before editing.
2. Verify the exact branch, base, current head SHA and clean worktree. Never write to master/main or merge without explicit authorization.
3. Reproduce the finding against current code; distinguish an actual defect from an external dependency or unverified assumption.
4. Implement the confirmed code correction and regression test in the same dedicated branch before handing off.
5. Do not duplicate authoritative registries, identity, billing/pricing/metering (AeroBill), licensing/entitlement (Mandatag), or governance policy.
6. Preserve superior existing architecture. No downgrade to mocks, stubs, hardcoded values, local-only authority, weaker crypto, weaker tenancy, weaker concurrency, or reduced tests.
7. Keep one-code/host-anywhere portability. Runtime configuration and deployment manifests may vary; application business logic must not be AWS-bound.
8. Do not provision chargeable AWS resources without explicit budget and deployment authorization. AWS remains deferred until traction/official engagement/funding; no AWS physical deployment is evidenced by the skipped gate.
9. A workflow PASS applies only to its exact SHA and scope. Skipped jobs are not passes. Never infer live production or final COR certification from CI green.
10. Update this central ledger and the product-specific handover with commit SHAs, exact-head workflow receipts, residual risks and release impact after every remediation.

**Current ecosystem verdict: `PARTIAL / RELEASE BLOCKED / NOT CERTIFIED`.**


### PR #35 implementation expansion — single-snapshot geography contract (11:44Z)

PR #35 has been expanded beyond client route correction to include a scalable backend contract:
- `GET /api/v1/areas/hierarchy` returns a flat active administrative-area snapshot with `parentId` relationships.
- CountryService filters inactive areas and excludes postal/geospatial cells from the citizen administrative selector, with deterministic ordering.
- Flutter constructs the tree locally from one snapshot, validates parent integrity/cycles/reachability, and does not perform N+1 child requests.
- OpenAPI contract is recorded in `docs/api/openapi_specs.yaml`.
- Java service/controller regressions and Flutter route/tree/failure/cycle regressions are included.

Additional commits:
- Country active snapshot service: `8253737c0bb65c42efe688234b034996ea3a3d94`.
- Country snapshot controller: `fd6473aaf6880124ee4a734b212be9afe9551758`.
- Flutter snapshot tree builder: `d530f28d61d5fe79b65cde4c7f7195d030eab3c7`.
- Unreachable/cycle validation: `ec0d6598480bbd6614a0069c0509519685239af8`.
- Java tests: `75b2051aaa5c5aedaac7cf6a926b9b8da775ab34`, `35c29d63fba49475f4c9417f3eafb327fe38f56b`.
- Administrative-tier filter/test: `b744a2f2e920a7317e4b7bf02bf84c0f17b1ad2f`, `b72ac9e411875a1c4df0935ec71c2962d107f65c`.
- OpenAPI: `1f291632b4fb65abf5012f8047fd88dc13b5daea`.
- Latest PR #35 handover: `c949a156bb5555d76c5765ca8f8baee847c4c067`.

PR #35 final recorded head at this update: `c949a156bb5555d76c5765ca8f8baee847c4c067`. Its comprehensive Flutter/Maven/OpenAPI qualification must be checked at this exact SHA; earlier CI runs on prior heads do not qualify this expanded change set.


---

## Ugondu PR #66 — runtime passport identifier validation (2026-10-31 11:45Z)

**Finding: UG-PASSPORT-RUNTIME-IDENTIFIER-VALIDATION-002.** PR #65 hardened record validation and cross-process filesystem locking, but runtime method inputs remained unsafe: get(), isRevoked() and revoke() could receive malformed JavaScript values and throw native TypeErrors. A lock owner-metadata write failure after a successful mkdir could also leave an ownerless directory.

**Physical remediation on dedicated branch** fix/cor-passport-runtime-id-validation-2026-10-31, stacked on PR #65:
- Added runtime normalizePassportId(unknown) and consistent PassportStoreError(PASSPORT_STORE_INVALID_DATA) behavior.
- Validate revocation reason before lock acquisition/mutation.
- Clean up a lock directory only when this process itself created it and owner metadata publication failed; normal stale/ownerless lock fail-closed rules and token-verified release remain intact.
- Added regressions for malformed IDs, invalid reasons, unchanged state and simulated metadata-write failure.
- Product handover: governance/handover/PASSPORT_RUNTIME_ID_VALIDATION_2026-10-31.md.

Commits:
- Source: be3fcbf72f1527e6a9c89da975ffc0d2143af663.
- Runtime identifier tests: 3f4581dc45c2d3f783612e3336f7e3f04c0061f6.
- Lock metadata failure regression: 8b7782ea008016709c2fcdfdb20ca95e0e1621ca.
- Product handover: e84c9a163cd039284a6f8f2240e6789b305e60ef.

Remote exact-head qualification is pending. This does not close the multi-host shared durable adapter gap. Keep the global verdict PARTIAL / RELEASE BLOCKED / NOT CERTIFIED.


### Dumcholu PR #35 — live registry bootstrap wiring (2026-10-31 11:48Z)

A further call-site audit found the live resolver would still not execute in the citizen app: the singleton had no ApiClient, the screen never invoked loadHierarchy(), and it resolved synchronously before data load. The canonical registry also omitted country-domain from citizen dependencies/service endpoints, and resolver defaults still targeted France/Paris.

Physical corrections on PR #35:
- Resolver singleton uses ApiClient.forService('country-domain').
- Registered country-domain in canonical Dart registry and YAML asset for development/staging/production; added citizen service dependency and microservice catalog entry.
- Changed launch defaults to NG / zone-country-ng.
- Citizen Opportunity Map now awaits the live registry snapshot before zone resolution and map loading; retry awaits bootstrap.
- Added widget test injecting an authoritative mock snapshot plus registry/singleton tests.

Latest commits:
- Resolver singleton/Nigeria defaults: 3d0d358fc08822595a3f2b9ba06e42071e1dc05f.
- Screen async bootstrap: 4de8a8563f2199f0f3fde454ed7fb9c1564bdbae.
- Citizen registry YAML: 18d61e31e83a7420c924bfcfea0224340571c096.
- Static registry service wiring: bee36aacb75a12faa7644806516eed703cce28c4.
- Resolver/registry tests: 18c2d72b495e2d2f3de3b9d20a246aa824553da5, 103602a3c1456c90db58668888d662b8714ff324, eb622cdc94ec33b55dc8c2decdaed22b1b281b59.
- Citizen screen widget test: 577db68a5b85ecf48eb0419a1c633a67c50e3a58.
- Product handover update: 48e26035a8fa717195cdba5f74cede584f6d4338.

PR #35 latest candidate head: 48e26035a8fa717195cdba5f74cede584f6d4338. Re-run/check comprehensive CI on this exact SHA. Live gateway routing, authentication and populated production registry remain unverified; no COR certification claim.
