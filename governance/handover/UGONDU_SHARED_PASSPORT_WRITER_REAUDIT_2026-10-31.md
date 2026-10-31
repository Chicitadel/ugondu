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

- Source and regression test committed on this dedicated branch.
- Tests have **not** been executed in this environment; exact-head GitHub Actions must pass before closure.
- No AWS resources were provisioned.
- No master/main branch was modified.
- This change does not establish final COR certification, external trust-root signoff, or live multi-host qualification.

## Antigravity guardrails

1. Do not replace this lock with a process-local mutex.
2. Do not claim multi-host durability for per-container/per-VM local disks.
3. Keep Mandatag as sole entitlement authority and AeroBill as sole billing/metering authority.
4. Keep storage location configurable; preserve one-code/host-anywhere behavior.
5. Add a database/shared-volume adapter only behind the existing store boundary and prove independent-host issue/admit/revoke/reject plus outage fail-closed behavior.
6. Do not weaken tests or mark the finding closed until exact-head qualification and deployment-topology evidence are attached.
7. Do not modify master/main or deploy billable AWS infrastructure without explicit authorization.

**Status: PHYSICAL CHANGE COMMITTED / TESTS AUTHORED / CI PENDING / MULTI-HOST PROOF OPEN.**
