# Ugondu passport lock ownership and store lifecycle re-audit — 2026-10-31

## Finding

**UG-PASSPORT-LOCK-STALE-RECLAIM-001 — unsafe stale-lock takeover.**

The qualified PR #64 implementation reclaimed a lock directory solely when its directory modification time exceeded a configured threshold. Directory age does not prove that the writer is dead: a legitimate slow writer can hold the lock beyond that threshold. A second process could remove the active lock and enter the critical section concurrently, recreating the lost-update race that PR #64 was intended to eliminate.

A second confirmed defect was found in `PortablePassportStore.clear()`: it mutated the in-memory map and deleted the persistent file without acquiring the writer lock. A concurrent writer could race with clear, and another long-lived store instance could retain stale state.

A third correctness issue was identified in read freshness: `get()` relied on filesystem `mtimeMs` to decide whether to reload. Some shared filesystems have coarse timestamp resolution, so rapid atomic replacements can have equal timestamps and leave a reader with stale revocation state.

## Physical remediation

- Lock creation now builds a fully initialized candidate directory with an owner record (PID, hostname, random ownership token, creation timestamp) and atomically publishes it by directory rename.
- Lock release verifies the ownership token before removing the owner record and lock directory.
- Removed automatic stale-lock reclamation. Age, PID reuse, clock skew and cross-host ownership do not provide a safe portable proof that a lock can be stolen. An abandoned lock fails closed; operator recovery is required after independently verifying the recorded process is no longer active.
- Lock wait configuration is validated and bounded (1–60,000 ms); invalid values fail closed rather than risking an unbounded wait.
- `clear()` now reloads and clears under the same writer lock and persists an empty store atomically.
- `get()` forces a fresh disk read so cross-instance revocation/clear visibility does not depend on timestamp precision.
- Added regressions for aged live-owner lock retention, abandoned-lock fail-closed behavior, clear visibility across instances, and invalid lock configuration.

## Qualification boundary

- Dedicated branch: `fix/cor-passport-lock-owner-safety-2026-10-31`
- Parent branch: `fix/cor-passport-multiprocess-write-lock-2026-10-31`
- Latest commit at report creation: `a97ccf911f16571c71746426e0f5933b99d50a0d`
- Source and tests are committed; **no test execution or exact-head CI receipt is yet claimed**.
- Source file remains below the 500-line policy boundary (350 lines); regression file is 124 lines.
- No AWS resources were provisioned; no master/main branch was modified.

## Operational lock recovery

The implementation intentionally does not delete an abandoned lock automatically. Before manual recovery, an operator must:
1. Stop or isolate all Ugondu engine processes sharing the data directory.
2. Inspect `owner.json` and independently establish that the recorded owner is no longer running on the lock's host.
3. Back up `passports.json`.
4. Remove only the exact `.passports.write-lock` directory after the checks above.
5. Restart one writer and verify passport reads, writes and revocation before restoring traffic.

Never automate deletion based only on lock age.

## Antigravity guardrails

1. Do not reintroduce age-only stale lock reclamation or a process-local mutex.
2. Keep the filesystem store scoped to processes sharing one filesystem; independent EC2/ECS local disks are not shared state.
3. Multi-host production still requires a portable shared durable adapter (e.g. database-backed implementation) and independent-host issue/admit/revoke/outage tests.
4. Preserve AeroBill as the sole billing/metering authority and Mandatag as the sole licensing/entitlement authority.
5. Preserve one-code/host-anywhere portability and externalize storage configuration.
6. Do not mark this finding closed until focused tests, full engine-core tests, CI on the exact final SHA, and the repository's line-count/policy gates pass.
7. Do not provision chargeable AWS infrastructure without explicit funding/budget authorization.

**Status: PHYSICAL REMEDIATION COMMITTED / REGRESSION TESTS AUTHORED / EXACT-HEAD TESTS PENDING / MULTI-HOST DURABILITY OPEN.**
