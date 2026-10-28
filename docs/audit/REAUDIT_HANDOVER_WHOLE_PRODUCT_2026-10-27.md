# Ugondu Whole-Product Re-audit Handover — 2026-10-27

**Finding IDs:** `UG-COR-I18N-TEST-INTEGRITY-001`, `UG-COR-STATE-INTEGRITY-001`  
**Audit base commit:** `d283132258d9f7240eb1d71b1cc61630b3edfa85`  
**Dedicated branch:** `audit/whole-product-cor-reaudit-2026-10-27`  
**Status:** `IMPLEMENTED — EXACT-HEAD CI PENDING`  
**Commercial release status:** `PARTIAL / RELEASE BLOCKED`

## 1. Summary

A source review of the candidate's localization regression suite found two confirmed test-integrity defects in `tests/localization-dropin.test.js`:

1. Assertions allowed either exact localized output or alternative debug-prefixed output, and some used broad substring alternatives. This weakened the contract around interpolation and fallback behavior.
2. The dynamic locale fixture was written into the shared repository `locales/` directory. A run that terminated before the cleanup case could leave an unexpected `sw.json` behind and affect subsequent runs.

## 2. Physical changes committed on this branch

- Replaced permissive assertions with exact output assertions for:
  - English, French, and German `listening` tokens, including both interpolated parameters.
  - The custom drop-in locale token and its interpolated `listening` token.
  - Exact English fallback when the custom locale lacks a key.
  - Exact pass-through of an unknown token key.
- Created an isolated temporary locale directory for the dynamic drop-in test using `UGONDU_LOCALES_DIR`.
- Added exit-time cleanup of the temporary directory and restoration of the previous environment variable.
- Updated `docs/governance/ANTIGRAVITY_CHANGE_GUARDRAIL.md` with this finding and corrected its stale statement about PR #37: PR #37 was merged into the remediation branch, not `master`/`main`.

## 3. Second confirmed finding: persisted state integrity

The candidate defined `ExecutionState.ComputeHash` and generated `StateHash` during `SaveState`, but `LoadState` did not validate the stored digest before returning state to the resume path. An edited state field could therefore be accepted despite the existing digest being inconsistent.

Physical remediation on this branch:
- `client/engine/state.go`: reject missing/mismatched state digests, quarantine the file, and return `ErrStateCorrupt`.
- `client/engine/state_test.go`: add regression cases for a changed state field and a missing digest, asserting rejection and quarantine.

**Security boundary:** this SHA-256 digest is unkeyed. It detects inconsistent state data, but it is not an authenticity guarantee against an actor who can recompute and replace the digest. Do not claim otherwise.

## 4. Changed files

- `tests/localization-dropin.test.js`
- `client/engine/state.go`
- `client/engine/state_test.go`
- `docs/governance/ANTIGRAVITY_CHANGE_GUARDRAIL.md`
- `docs/audit/REAUDIT_HANDOVER_WHOLE_PRODUCT_2026-10-27.md` (this document)

## 5. Verification required on the exact PR head

The repository-hosted tools can write the source and open the PR, but this session has not run the Node or Go test suites in a checked-out working tree. Do not describe these tests as locally executed or passing until the exact-head workflow proves it.

Required:
1. `cd client && gofmt -w engine/state.go engine/state_test.go` (review the diff; commit any formatting change on this branch).
2. `cd client && go vet ./...`.
3. `cd client && go test ./...`.
4. `cd client && go test -race ./...` where supported.
5. `npm run build` (so the test exercises the exact compiled shared localization implementation).
6. `node tests/localization-dropin.test.js`.
7. `npm run verify:t03`, `npm run verify:t04`, `npm run test:governance`.
8. The complete `node scripts/run-cor-gates.js` aggregate; record any `NOT_RUN` as failure.
9. Review test cleanup under both pass and intentional assertion-failure conditions.
10. Confirm the workflow SHA equals the PR head SHA and preserve logs/artifacts.

## 6. Broader COR findings and limitations

The attached Antigravity log reports 65/65 local COR suites and a green aggregate governance pipeline at candidate `d2831322`. Those are reported results from the attachment, not independently reproduced in this session. The same report explicitly withholds commercial release until physical staging receipts exist for the declared target scope.

Previously inspected workflow evidence for the prior candidate also showed that the AWS physical qualification and signing-trust-root steps were skipped. Do not infer a signed or fully qualified commercial release from local test-suite success alone.

The full whole-product audit is **not complete**. This branch addresses two confirmed defects (localization test integrity and persisted state digest validation); it does not assert that all pending features, host/provider adapters, COR gaps, or UAIGOS obligations are closed.

## 7. Non-negotiable Antigravity guardrails

- Never write directly to `master`, `main`, or `phase4/production-hardening`; use the dedicated branch and reviewed PR.
- Re-audit current source and prior findings before making any change. A passing aggregate suite does not prove every advertised feature is implemented.
- Do not weaken assertions, remove failing suites, suppress `NOT_RUN`, or relabel skipped physical qualification as PASS.
- Keep one-code/host-anywhere portability: DirectAdmin shared-host launch first, VPS/AWS later behind adapters/configuration; avoid provider-specific logic in core.
- Keep commercial billing and entitlement decisions exclusively in the Air Roofers federated Aerobill/Mandatag boundary. Do not duplicate billing/entitlement business logic in Ugondu.
- Keep product naming registry-driven; do not add hardcoded product names or parallel registries.
- Re-run candidate-bound evidence after every source, test, dependency, workflow, or policy change. Preserve raw command output, exit codes, commit SHA, and artifacts.
- Keep overall COR status `PARTIAL / RELEASE BLOCKED` until every mandatory code, governance, and authorized physical qualification gate is independently evidenced.

## 8. Acceptance

Close `UG-COR-I18N-TEST-INTEGRITY-001` only when the exact PR head passes the focused localization test and all mandatory governance/CI checks. Close `UG-COR-STATE-INTEGRITY-001` only when the exact-head Go regression tests, vet, race tests where supported, and full client suite pass. Do not close the whole-product COR ledger based on these two findings.

## 2026-10-28 follow-up — state file permission enforcement and safe replacement

**Finding:** `UG-COR-STATE-IO-SECURITY-001`.

### Root cause
`SaveState` ignored failures from chmod operations on the transaction directory and temporary file. On replacement failure, it removed the existing state before retrying, which could destroy the last known-good state for reasons unrelated to an existing destination file.

### Physical changes on the dedicated branch
- `client/engine/state.go` now fails closed when directory or temporary-file permissions cannot be secured.
- `client/engine/state.go` uses `replaceStateFile` and no longer deletes the previous state as a generic fallback.
- `client/engine/state_replace_unix.go` uses same-directory `os.Rename` on non-Windows platforms.
- `client/engine/state_replace_windows.go` uses Windows replacement-capable `MoveFileExW` via `kernel32.dll`, with replace-existing and write-through flags.
- `client/engine/state_test.go` asserts POSIX private directory/file permission bits.

### Verification status
**`YELLOW / EXACT-HEAD CI PENDING`.** The repository connector can commit source and test changes, but no checked-out working tree was available here to execute Go commands. The new Windows-specific helper has not been runtime-verified in this session. Do not report tests as passing until the exact branch head has green Go vet, Go tests, Windows build/test, and applicable race tests.

### Required acceptance commands
```bash
cd client
gofmt -w engine/state.go engine/state_test.go engine/state_replace_unix.go engine/state_replace_windows.go
go vet ./...
go test ./...
go test -race ./...
GOOS=windows GOARCH=amd64 go test ./...
```

The unkeyed SHA-256 state digest detects inconsistent persisted fields but is not proof of authenticity against an attacker able to rewrite the state and digest. This fix does not close the whole-product COR gap. Preserve `PARTIAL / RELEASE BLOCKED` until all mandatory code, workflow, provider/host/IDE and authorized physical qualification evidence is current and candidate-bound.


## 2026-10-28 follow-up — SaveState commit atomicity

**Finding ID:** `UG-COR-STATE-COMMIT-ATOMICITY-001`.

### Confirmed defect
`SaveState` advanced sequence/hash/timestamp metadata directly on the caller-owned `ExecutionState` before the filesystem replacement succeeded. A failed replacement could leave memory claiming a state version that was never committed to disk.

### Physical remediation
- `client/engine/state.go`: construct `nextState` as a copy; calculate its sequence, previous hash, timestamp and digest without mutating the caller's persistence metadata; marshal and replace the persisted file; only then assign `*state = nextState`.
- Added a package-private `stateFileReplacer` seam for deterministic persistence-failure testing.
- `client/engine/state_test.go`: added `TestSaveStateReplacementFailurePreservesCommittedState`, injecting replacement failure and asserting the previous disk bytes and persistence metadata remain unchanged.

### Acceptance status
**YELLOW / EXACT-HEAD TESTS PENDING.** This connector session committed source and regression code but did not execute the Go test suite. Run `gofmt`, `go vet ./...`, `go test ./...`, `go test -race ./...` where supported, and the native Windows build/test matrix against the current head. The test seam is package-private and must not be used as a runtime configuration mechanism.

Whole-product COR remains `PARTIAL / RELEASE BLOCKED`; this targeted persistence fix is not overall certification.


## 2026-10-28 follow-up — concurrent state-save temporary-file collision

**Finding ID:** `UG-COR-STATE-TEMP-COLLISION-001`.

### Confirmed defect
`SaveState` used a shared fixed `state.json.tmp` path. Concurrent saves to one transaction could truncate or rename each other's payload before replacement.

### Physical remediation
- `client/engine/state.go` now creates a unique temporary file in the same transaction directory with `os.CreateTemp`, preserving same-filesystem replacement and preventing temporary-path reuse.
- Explicit `0600` hardening remains required before replacement; the temporary file is removed on return if it was not renamed.
- `client/engine/state_test.go` adds `TestConcurrentSaveStateUsesDistinctTemporaryFiles`. It synchronizes two concurrent save attempts at the injected replacement boundary, asserts distinct temp paths, and checks that failed writes preserve the previously committed file.

### Scope and acceptance
This closes the fixed-temp-path collision only. It does not implement per-transaction locking, compare-and-swap sequencing, or serialized concurrent state transitions. Where concurrent writers must preserve ordering, a separate transaction-lock/sequence policy is still required. Exact-head Go tests, race tests, vet and platform CI remain pending; do not mark GREEN without evidence.


## 2026-10-28 follow-up — persisted transaction identity binding

**Finding ID:** `UG-COR-STATE-IDENTITY-BINDING-001`.

### Confirmed defect
`LoadState(txID)` read `transactions/<txID>/state.json` and rejected an empty embedded transaction ID, but accepted a non-empty ID that differed from the requested transaction. A validly hashed foreign state could be returned to the caller under the wrong transaction identity.

### Physical remediation
- `client/engine/state.go`: require the embedded `TransactionId` to equal `strings.TrimSpace(txID)`; otherwise quarantine the file and return `ErrStateCorrupt` before hash validation.
- `client/engine/state_test.go`: add `TestLoadStateRejectsTransactionIDMismatch`. The test places a correctly hashed foreign transaction state under the requested transaction directory and verifies rejection and quarantine.

### Acceptance status
**YELLOW / EXACT-HEAD TESTS PENDING.** This source and regression test have been written to the dedicated branch. No Go test, vet, race, or platform build was executed in this session. Require exact-head results before closing this finding.

The check prevents transaction-directory identity confusion; it does not provide cryptographic authenticity or serialize concurrent writers. Whole-product COR remains `PARTIAL / RELEASE BLOCKED`.


## 2026-10-28 follow-up — dot-segment transaction path

**Finding ID:** `UG-COR-STATE-PATH-SEGMENT-001`.

### Confirmed defect
`GetTransactionDir` rejected empty IDs, `..`, and path separators but accepted the exact ID `.`. `filepath.Join(transactionsRoot, ".")` resolves to the transactions root, causing a non-transaction-specific `state.json` location.

### Physical remediation
- `client/engine/state.go`: reject `.` alongside empty IDs before path construction.
- `client/engine/state_test.go`: add `TestGetTransactionDirRejectsDotTransactionID`, covering `GetTransactionDir`, `GetStateFilePath`, and `SaveState`.

### Acceptance
**YELLOW / EXACT-HEAD TESTS PENDING.** Source and regression test are committed to the dedicated branch. Go formatting, tests, vet, race checks, and platform builds remain unexecuted in this session. Whole-product COR remains `PARTIAL / RELEASE BLOCKED`.


## 2026-10-28 follow-up — canonical transaction ID on save

**Finding ID:** `UG-COR-STATE-CANONICAL-ID-001`.

### Confirmed defect
`GetTransactionDir` trims surrounding whitespace for path construction, but `SaveState` previously persisted the original ID. A whitespace-padded ID could therefore produce a file in the canonical directory whose embedded ID was rejected by `LoadState`.

### Physical remediation
- `client/engine/state.go`: reject empty or non-canonical transaction IDs in `SaveState` before computing or writing a candidate state.
- `client/engine/state_test.go`: add `TestSaveStateRejectsWhitespacePaddedTransactionID`, asserting rejection and no transaction-directory creation.

### Acceptance
**YELLOW / EXACT-HEAD TESTS PENDING.** No Go test/vet/race/platform execution has been performed in this session. Whole-product COR remains `PARTIAL / RELEASE BLOCKED`.

## 2026-10-28 follow-up — nil execution-envelope constructor

**Finding ID:** `UG-COR-STATE-ENVELOPE-NIL-001`

### Evidence-backed defect
`InitStateFromEnvelope(*ExecutionEnvelope)` read fields from `env` without a nil check. A nil argument panicked at runtime. Because the constructor's existing API has no error return, it now returns nil when no envelope is supplied; callers must fail closed and must not start execution with a nil result.

### Physical changes
- `client/engine/state.go`: added a nil guard before any envelope dereference.
- `client/engine/state_test.go`: added `TestInitStateFromEnvelopeRejectsNil`.
- `docs/governance/ANTIGRAVITY_CHANGE_GUARDRAIL.md`: synchronized the central guardrail with the finding and acceptance condition.

### Verification and acceptance
The code and regression test were committed to the dedicated remediation branch. No Go toolchain was available/executed in this session; therefore formatting, test, vet, race, and cross-platform build status are **NOT RUN / NO PASS CLAIMED**. Validate on the exact candidate SHA before closing this finding. Whole-product COR remains **PARTIAL / RELEASE BLOCKED**.

## 2026-10-28 follow-up — invalid envelope transaction identity

**Finding ID:** `UG-COR-STATE-ENVELOPE-IDENTITY-001`

The nil-envelope guard alone was insufficient: a non-nil `ExecutionEnvelope` could still carry an empty or whitespace-padded `TransactionId`. Such a value could create a state object that fails the persistence layer's canonical transaction identity requirement.

**Physical changes committed**
- `client/engine/state.go`: `InitStateFromEnvelope` returns nil for an empty or non-canonical transaction ID before constructing the state.
- `client/engine/state_test.go`: `TestInitStateFromEnvelopeRejectsInvalidTransactionID` covers empty, whitespace-only, and padded values.
- Central Antigravity guardrail updated with the finding and acceptance criteria.

**Verification status:** Commits exist on the dedicated remediation branch. Go formatting, unit tests, vet, race tests, and platform builds are **NOT RUN** in this session. Exact-head CI evidence remains required. The constructor still returns a pointer rather than an error to preserve its existing signature; callers must fail closed on nil. Whole-product COR remains **PARTIAL / RELEASE BLOCKED**.

## 2026-10-28 follow-up — Go CI formatting and race coverage

**Finding ID:** `UG-COR-CI-GO-QUALITY-GATES-001`

The existing Go CI path did not fail on formatting drift and did not execute the Go race detector. `.github/workflows/ci.yml` now includes:
- A fail-closed `gofmt -s -l .` check in the client module.
- `go test -race ./...` on the Linux amd64 matrix leg.

The workflow edit is committed on the dedicated branch. This session has not executed the workflow or received a completed exact-head run, so this is an implemented CI control, not proof that the current source passes. Check the first resulting workflow run and retain logs before closing the finding. Whole-product COR remains **PARTIAL / RELEASE BLOCKED**.


## 2026-10-28 re-audit — PR trigger coverage and deployment boundary

**Finding ID:** `UG-COR-CI-PR-BASE-FILTER-001`

### Confirmed defect and physical change
PR #39 targets `fix/go-thin-client-vet-and-module-imports-2026-10-27`, but both CI and COR workflow PR filters omitted `fix/**`. Added `fix/**` to `.github/workflows/ci.yml` and `.github/workflows/cor.yml` on the dedicated audit branch.

- CI workflow commit: `9a2563bb61dec8eaf303ee832db6b1eae3d11cff`
- COR workflow commit: `84065ccba005b7318a29d3046960fd0e45694904`

### Evidence and limitation
GitHub evaluates a PR-triggered workflow from the base branch's workflow definition. PR #39's current base does not yet contain these changes, so this branch-only fix does not itself prove that PR #39 now receives PR-triggered checks. Push-triggered runs for `audit/**` must be inspected directly in GitHub Actions; the workflow-run connector available in this session only returns PR-triggered runs. No test pass is inferred from the YAML edit.

### AWS and product separation
This repository contains Ugondu's Go thin client and TypeScript workspaces. Dumcholu's Spring Boot backend deployment belongs to `Chicitadel/dumcholu`, not this repository. Keep Ugondu's deployment/provider interfaces portable across DirectAdmin/shared hosting, VPS, and AWS; use AWS as an optional deployment profile rather than embedding AWS assumptions in core logic. Aerobill/Mandatag remains the external billing/entitlement authority. This finding implements workflow trigger coverage only; it does not implement or qualify an AWS deployment.

**Status:** YELLOW / exact-head workflow evidence pending. Overall COR remains **PARTIAL / RELEASE BLOCKED**.

## 2026-10-28 re-audit — multi-process transactional locking and stale state prevention (COR Track 7)

**Finding ID:** `UG-COR-STATE-LOCKING-001`

### Confirmed defect
`SaveState` used unique temporary files to prevent temporary filename collisions during concurrent writes, but did not provide multi-process transactional serialization or prevent stale writers from overwriting newer committed state. If concurrent processes or callers attempted state mutations on the same transaction, a caller holding an older sequence/hash could calculate its mutation and atomically overwrite a newer state committed by another process, resulting in lost state transitions and broken hash sequences.

### Physical remediation
- `client/engine/state.go`:
  - Defined `stateFileLock` interface and package-private `stateLockAcquirer` hook (defaulting to `acquireStateFileLock`) enabling platform-agnostic locking and deterministic testing.
  - In `SaveState`, enforced multi-process mutual exclusion by acquiring an exclusive lock on `<txDir>/.lock` before performing state calculation and atomic replacement.
  - Added detection of stale or divergent writers inside the critical lock section: if a committed state exists on disk, `SaveState` validates that the caller's sequence and base hash match the committed state, returning `ErrStateStale` (`cannot save stale execution state`) if disk sequence exceeds caller sequence or if base hashes mismatch.
- `client/engine/state_lock_unix.go`:
  - Implemented portable Unix advisory locking using `syscall.Flock` (`syscall.LOCK_EX` on acquire, `syscall.LOCK_UN` and file close on `Unlock`).
- `client/engine/state_lock_windows.go`:
  - Implemented Windows kernel locking using `kernel32.dll`'s `LockFileEx` (`LOCKFILE_EXCLUSIVE_LOCK = 0x2`) and `UnlockFileEx`.
- `client/engine/state_test.go`:
  - Preserved temporary path uniqueness testing in `TestConcurrentSaveStateUsesDistinctTemporaryFiles` by stubbing `stateLockAcquirer`.
  - Added `TestConcurrentSaveStateSerializesWritersAndPreventsStaleState`: verifies exclusive `.lock` creation, serializes concurrent writers, asserts fail-closed rejection with `ErrStateStale` when a stale writer attempts to overwrite newer state, confirms disk integrity remains intact, and verifies full state recovery via reload-and-reapply.
  - Added `TestStateFileLockAcquireAndRelease`: validates platform lock acquisition and clean release.

### Acceptance status
**YELLOW / EXACT-HEAD TESTS PENDING.** Source implementation and regression tests are committed to the dedicated remediation branch. All Node.js governance and security suites pass cleanly (`verify:attribution`, `localization-dropin`, `test:locales`, `verify:t03`, `verify:t04`, `test:governance`, `test:security`, `test:contract`). Go toolchain is not locally available in this environment; exact-head Go test, vet, race, and platform build verification remain required on CI before closing this finding. Whole-product COR remains **PARTIAL / RELEASE BLOCKED**.


## 2026-10-28 re-audit — fail-closed protection for existing committed state

**Finding:** `UG-COR-STATE-OVERWRITE-CORRUPT-001`

### Root cause
The previous `SaveState` logic only entered validation when `os.ReadFile(state.json)` succeeded and the payload was non-empty. Read errors, empty content, malformed JSON, foreign transaction IDs, and invalid/missing hashes could bypass validation and permit replacement of the existing state file.

### Physical remediation
- Updated `client/engine/state.go`: only a genuinely missing file is treated as first save. Existing state must parse, match the requested transaction identity, contain a valid recomputed digest, and match the caller's base sequence/hash. Other read errors fail closed.
- Added `TestSaveStateFailsClosedOnInvalidCommittedState` in `client/engine/state_test.go`, covering malformed JSON, empty state, missing digest, digest mismatch and foreign transaction identity. The test asserts rejection and preservation of the existing bytes.
- Commits: `edf5bd7d0362d2daf7cc60aafc33eb0fa53fab87`, `0f98d9db43affcacfdccf7f6dae3e0be298308ba`.

### Acceptance status
**YELLOW / TESTS NOT EXECUTED HERE.** The source and regression test are committed on the dedicated branch, but this session has not run Go formatting, vet, tests, race detection or cross-platform builds. Verify the exact candidate SHA in CI before closing this finding. Keep PR #39 draft and unmerged. Whole-product COR remains **PARTIAL / RELEASE BLOCKED**.

## 2026-10-28 re-audit — Go formatting and test modularization (UG-COR-GO-FORMATTING-001 & UG-COR-NO-STUBS-001)

**Findings:** `UG-COR-GO-FORMATTING-001`, `UG-COR-NO-STUBS-001`

### Root cause & CI gate failures
CI run #719 failed on two steps:
1. `Verify Go formatting` failed because `gofmt -s -l .` detected formatting/line-ending differences in 9 client source files (`engine/actions.go`, `engine/executor.go`, `engine/lock_test.go`, `engine/state_test.go`, `engine/trust_registry.go`, `i18n/bootstrap.go`, `i18n/i18n_test.go`, `i18n/locale.go`, `i18n/pack_test.go`).
2. `Validate repository policy (UG-COR-NO-STUBS-001)` failed because `client/engine/state_test.go` grew to 728 LOC (exceeding the 500 LOC maximum governed file size limit).

### Physical remediation
- Formatted all client Go files using `gofmt -s -w .` via containerized toolchain; `gofmt -s -l .` output is now completely clean (0 unformatted files).
- Modularized test suite: split `client/engine/state_test.go` into:
  - `client/engine/state_test.go` (407 LOC): core state hashing, loading, corruption detection, replacement failure tests.
  - `client/engine/state_concurrency_test.go` (359 LOC): invalid committed state fail-closed, distinct temp files, concurrent writers serialization, stale state prevention, lock acquire/release.
- Removed unused imports (`path/filepath`, `sync`) in `state_test.go`.
- Executed `validate-repository.mjs`: `[PASS] Repository governance validation (UG-COR-NO-STUBS-001): 4691 tracked files verified with 0 violations.`
- Executed containerized Go test suite: `go test -v ./...` in `golang:1.22-alpine` passed 100% (`ok ugondu/client/cmd 0.040s`, `ok ugondu/client/engine 0.363s`, `ok ugondu/client/i18n 0.144s`).
- Executed containerized Go vet: `go vet ./...` exited with code 0 (no issues).
- Executed complete Node.js governance suite: all passed with code 0.

### Status
**GREEN (EXACT-HEAD CI VERIFIED).** Both GitHub Actions workflows on candidate `2dd4622c` passed 100%:
- PR CI/CD Pipeline ([run #40750080227](https://github.com/Chicitadel/ugondu/actions/runs/40750080227)): all 5 OS/architecture Go thin-client matrix builds/tests (darwin/amd64, darwin/arm64, linux/amd64, linux/arm64, windows/amd64) passed; Release Integrity & Governance Gates passed; all 9 microservice workspaces passed; Integration Tests passed in 1m29s.
- PR COR Certification ([run #40750080175](https://github.com/Chicitadel/ugondu/actions/runs/40750080175)): COR Certification passed in 2m34s; COR Final Release Gate passed in 4s.

Whole-product COR release status remains strictly **PARTIAL / RELEASE BLOCKED / NOT CERTIFIED** until physical AWS and production staging deployment receipts are established. PR #39 remains DRAFT and unmerged to protect master, main, and phase4/production-hardening.



## 2026-10-28 re-audit addendum — Windows state-lock OVERLAPPED identity

**Finding ID:** `UG-COR-WINDOWS-LOCK-OVERLAPPED-001`

**Confirmed defect:** `acquireStateFileLock` passed one stack-local `syscall.Overlapped` to `LockFileEx`, discarded it, and `Unlock` passed a newly allocated `Overlapped` to `UnlockFileEx`. The Windows API contract requires the lock/unlock operations to refer to the same OVERLAPPED region identity. The unlock API result was also ignored, so a release failure could be reported as success.

**Physical remediation on the dedicated branch:**
- `client/engine/state_lock_windows.go` now retains the OVERLAPPED structure in `windowsStateFileLock` and reuses that same field for unlock.
- Wrapped the LockFileEx/UnlockFileEx calls behind package-private function seams so API-contract behavior can be regression-tested without depending on host filesystem scheduling.
- `Unlock` now propagates API and file-close errors via `errors.Join`.
- Added Windows-only regression tests in `client/engine/state_lock_windows_test.go`:
  - `TestWindowsStateFileLockReusesOverlappedForUnlock`
  - `TestWindowsStateFileLockPropagatesUnlockFailure`

**Commits:** `9ddea7cb607c31d434243277c30654ef644c17d0` (implementation); `2e1e06f3ff34ba2665b3f4f7c06a72be03f7e676` (regression tests).

**Verification:** Pending. This tool session has not executed the Windows Go test suite. Require the Windows amd64 CI leg to compile and execute the new tests, plus the Linux formatting/vet/test/race gates, on the current branch head. Do not mark this finding GREEN until the exact-head results are available.

**Release status remains `PARTIAL / RELEASE BLOCKED / NOT CERTIFIED`.** This targeted state-lock fix does not constitute AWS qualification or whole-product COR closure.
