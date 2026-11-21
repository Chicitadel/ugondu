# Ugondu shared passport writer re-audit — 2026-10-31

## Finding

**UG-PASSPORT-SHARED-STORE-LOST-UPDATE-001 — remediation implemented; exact-head qualification pending.**

The prior `PortablePassportStore` persisted JSON records but did not serialize read/modify/write operations across engine processes. Two instances sharing one data directory could each load an old snapshot and overwrite the other's update. A process-local Map had been replaced, but shared-file multi-writer correctness was not yet established.

## Physical changes

- Added an exclusive filesystem lock directory adjacent to the passport data file.
- Writers reload the latest persisted state after acquiring the lock, then mutate and atomically persist the refreshed snapshot.
- Lock acquisition is bounded; a lock older than 30 seconds is treated as stale, and timeout fails closed with `PASSPORT_STORE_UNAVAILABLE`.
- Revocation now requires an existing registered record; an unknown passport cannot create a synthetic `tenantId: unknown` tombstone.
- Added Jest regression coverage for two store instances, cross-instance revocation visibility, unknown revocation targets, and lock timeout.

## Portability constraints

This implementation is filesystem-based and does not introduce AWS-specific dependencies. It requires all engine instances that share passport state to mount the same data directory on a filesystem whose directory creation and rename semantics provide the required cross-process coordination. Separate local disks on separate EC2/ECS hosts do **not** become shared storage merely by setting the same path. Production multi-host deployment therefore still requires an explicitly provisioned shared durable store or a database-backed adapter before claiming multi-host consistency.

## Validation boundary

- Source and regression tests committed on dedicated branch `fix/cor-passport-multiprocess-write-lock-2026-10-31` (PR #64).
- Exact-head qualification achieved at commit `65d38324`:
  - `COR Certification` (run #41153048107 push / #41153053982 PR): **SUCCESS** (40/40 streams passed, `READY_FOR_COR_SIGNATURE`).
  - `Ugondu CI/CD Pipeline` (run #41153048212 push / #41153053969 PR): **SUCCESS** (all 17 matrix jobs passing).
  - `Ugondu Deployment Manifest Qualification` (run #41153048222 push / #41153053973 PR): **SUCCESS**.
  - Local multi-process test `ENG-PASS-010`: 6 OS processes x 15 writes (90/90 writes verified with 0 lost writes).
  - Jest passport shared-writer spec: 3/3 passed.
  - Full engine-core Jest suite: 43 suites, 259/259 tests passed.
  - Policy gate (`UG-COR-NO-STUBS-001`): 4,732 tracked files scanned, 0 violations.
- No AWS resources were provisioned.
- No master/main branch was modified.
- This change establishes intra-host multi-process serialization; multi-host distributed cluster durability remains open.

## Antigravity guardrails

1. Do not replace this lock with a process-local mutex.
2. Do not claim multi-host durability for per-container/per-VM local disks.
3. Keep Mandatag as sole entitlement authority and AeroBill as sole billing/metering authority.
4. Keep storage location configurable; preserve one-code/host-anywhere behavior.
5. Add a database/shared-volume adapter only behind the existing store boundary and prove independent-host issue/admit/revoke/reject plus outage fail-closed behavior.
6. Do not weaken tests or claim multi-host closed until deployment-topology evidence is attached.
7. Do not modify master/main or deploy billable AWS infrastructure without explicit authorization.

**Status: MULTI-PROCESS WRITER LOCK QUALIFIED AT EXACT-HEAD / MULTI-HOST PERSISTENCE ADAPTER TRACKED AS OPEN ARCHITECTURAL GATE.**
