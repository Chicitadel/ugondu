# Passport runtime identifier and lock-publication remediation — 2026-10-31

## Confirmed finding

**UG-PASSPORT-RUNTIME-IDENTIFIER-VALIDATION-002**

The existing shared-writer correction validated passport records passed to `set()`, but read/revoke method parameters remained only compile-time typed. At runtime, JavaScript callers could pass null, numbers or blank strings:
- `get()` and therefore `isRevoked()` called `.trim()` directly and leaked a native TypeError instead of a governed fail-closed store error.
- `revoke()` also called `.trim()` before validating the passport identifier.
- If a process successfully created the lock directory but failed while publishing `owner.json`, the previous loop treated some filesystem errors as lock contention and could leave an ownerless lock behind until timeout/operator recovery.

## Physical remediation

Branch: `fix/cor-passport-runtime-id-validation-2026-10-31`, stacked on PR #65 branch `fix/cor-passport-lock-owner-safety-2026-10-31`.

1. Added shared `normalizePassportId(value: unknown)` validation for runtime read/revoke identifiers; blank and non-string values raise `PassportStoreError(PASSPORT_STORE_INVALID_DATA)`.
2. `get()`, `isRevoked()` and `revoke()` now reject malformed identifiers consistently before lookup/mutation.
3. `revoke()` validates the reason before lock acquisition and mutation.
4. If this process wins atomic `mkdir` but cannot publish owner metadata, it cleans up only the directory it just created and fails closed; it does not leave an ownerless lock that blocks future writers.
5. Added regressions for null/number/blank IDs, invalid revocation inputs, unchanged record state, and simulated owner metadata write failure cleanup.

## Commits

- Source: `be3fcbf72f1527e6a9c89da975ffc0d2143af663`.
- Runtime ID regressions: `3f4581dc45c2d3f783612e3336f7e3f04c0061f6`.
- Owner metadata failure cleanup regression: `8b7782ea008016709c2fcdfdb20ca95e0e1621ca`.

## Guardrails

- Preserve fail-closed behavior; never auto-steal stale or ownerless locks.
- Cleanup is permitted only when the current process successfully created the lock directory and failed before completing owner metadata publication.
- Keep owner-token verification on normal release.
- Never allow malformed IDs/reasons to leak native runtime exceptions or mutate durable state.
- Keep filesystem locking scoped to a shared filesystem. Do not claim multi-host durability; a portable shared durable adapter remains required before multi-host deployment.
- Do not introduce AWS-specific application logic. Preserve one-code/host-anywhere.
- AeroBill owns billing/pricing/metering; Mandatag owns entitlement/licensing.
- Do not merge or write to master/main.

## Qualification

Remote Ugondu test, COR and manifest workflows must pass on the exact PR head before this candidate is marked qualified. This is a narrow correctness fix, not multi-host passport durability or final COR certification.

**Status: CODE AND REGRESSIONS COMMITTED / REMOTE QUALIFICATION PENDING / MULTI-HOST DURABILITY OPEN / NOT COR CERTIFIED.**
