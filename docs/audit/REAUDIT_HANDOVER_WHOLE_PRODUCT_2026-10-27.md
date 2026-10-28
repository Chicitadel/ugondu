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
