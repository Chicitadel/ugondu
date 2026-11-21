# Re-audit Handover — Cryptographic Execution Binding Fail-Closed Fix

**Finding:** `UG-COR-BINDING-001`  
**Repository:** [Chicitadel/ugondu](https://github.com/Chicitadel/ugondu)  
**Remediation branch:** `fix/cor-binding-reaudit-2026-10-27`  
**Candidate source commit:** `99d89092739cd7ff2cb7e0c43e394d12019005e0`  
**Related PR:** [#37](https://github.com/Chicitadel/ugondu/pull/37)  
**Release status:** Partial qualification only; full public release remains blocked.

## Root cause
`VerifyCryptographicBindings` previously returned success for nil state/envelope inputs and skipped some binding comparisons when a supplied envelope value was empty. This created a fail-open path in persisted execution resume validation.

## Physical changes
- `client/engine/executor.go`: nil state/envelope now fails closed with the localized `invalid_envelope_format` token. Populated persisted execution, transaction, plan, tenant, project, environment and policy bindings are compared against envelope values; an empty supplied value no longer bypasses comparison. Existing localized mismatch tokens are retained.
- `client/engine/executor_test.go`: regression tests cover nil inputs and missing/mismatched binding values.
- `docs/governance/ANTIGRAVITY_CHANGE_GUARDRAIL.md`: updated with finding status, candidate evidence and release blockers.
- `docs/audit/AR-UG-COR-MASTER-EXECUTION-CHECKLIST-PR37.md`: shared qualification ledger and acceptance checklist.

## Evidence
- [COR Certification run 40545111554](https://github.com/Chicitadel/ugondu/actions/runs/40545111554) succeeded on candidate `99d89092739cd7ff2cb7e0c43e394d12019005e0` for workspace/regression/evidence-integrity steps. The AWS Physical Qualification Gate and signing-trust-root step were skipped.
- [Ugondu CI run 40545111529](https://github.com/Chicitadel/ugondu/actions/runs/40545111529) succeeded for attribution, T03, governance/anti-stub, build, T04 and workspace tests.
- [DirectAdmin Staging Safety run 40545111655](https://github.com/Chicitadel/ugondu/actions/runs/40545111655) succeeded for path containment/evidence-scope safety; this is not proof of a live staging deployment.
- Antigravity's supplied execution log reports Go `vet`, `go test ./...` and five-target cross-compilation as successful, but the same log includes earlier failed/cancelled attempts and does not include complete raw logs. Treat these as reported results, not independently verified evidence.

## PR / branch safety
PR #37 is reported by GitHub as merged into `fix/go-thin-client-vet-and-module-imports-2026-10-27`, with merge commit `99d89092739cd7ff2cb7e0c43e394d12019005e0`. Its base is a remediation branch, not `master`. Do not infer production integration from this merge.

## Required follow-up
1. Run and retain exact-head `cd client && go vet ./...`, `go test ./...`, and `go test -race ./...` where supported.
2. Retain the five-target cross-build logs, while treating them as distinct from native lifecycle qualification.
3. Complete the required signed authorization and candidate-bound physical staging receipts for DirectAdmin and each claimed cloud target.
4. Rerun affected checks after any source change; evidence is valid only for the exact candidate it names.
5. Keep release status blocked until every mandatory UAIGOS/COR gate is GREEN and independently accepted.

## Architecture and commercial invariants
- Never write directly to `master` or the protected production branch; integrate only through reviewed PRs.
- Aerobill/Mandatag remain the Air Roofers federated system's authoritative billing and entitlement layer.
- Preserve one-code/host-anywhere portability: cost-minimal DirectAdmin/shared hosting first, then VPS/AWS without core refactoring. Keep provider-specific functionality behind adapters/configuration.
- No duplicate abstractions, stubbed production functionality, weakened fail-closed checks, hardcoded product identity, or architecture downgrade.
- Do not claim 100% COR closure from PR-mode CI where physical gates were skipped.
