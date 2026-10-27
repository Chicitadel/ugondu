# Ugondu — Central Change Guardrail & Antigravity Handover
**Revision:** 2026-10-27  
**Repository:** `Chicitadel/ugondu`  
**Dedicated branch:** `fix/cor-binding-reaudit-2026-10-27`  
**Author:** Ignatus Chika UJOMOR  
**Central Corporate Policies:** [policies.airroofers.eu](https://policies.airroofers.eu)  
**Classification:** Enterprise Governed | Strict Fail-Closed Integrity  

---

## Operating Rules

1. Work strictly on the designated remediation branch; never write directly to `master` or protected production branches.
2. Every change must be tied to a documented finding and recorded in the audit handover ledger with its exact commit SHA and evidence.
3. Inspect before implementing; do not recreate parallel implementations, shadow abstractions, or unnecessary mock files.
4. Maintain architectural integrity; preserve frozen protocols, target topologies, and microservice boundaries.
5. Use canonical product registries and localization/tokenization; no product-name hardcoding or new user-facing raw strings where a token is required.
6. Fail closed for security, entitlement, billing, release, portability, and governance decisions. Aerobill and Mandatag remain the Air Roofers federated system's authoritative billing/entitlement layer; Ugondu must not duplicate those business rules.
7. Maintain one-code/host-anywhere portability. Shared-host/DirectAdmin is the cost-minimal launch target; do not introduce mandatory AWS-only services, root access, or provider-specific assumptions into core runtime. Provider integrations must remain behind adapters/configuration, with deployment profiles and secrets supplied externally. VPS/AWS migration must not require application refactoring.
8. Never claim 100% COR closure or public release readiness from unit tests alone. Require reproducible CI, security and integration tests, attribution/governance checks, supported-target evidence, and authorized physical staging receipts for every required environment. Public commercial release stays fail-closed until all release gates have signed evidence.
9. Keep this guardrail and the audit evidence synchronized with code changes. Update this document and the handover note in the same branch/commit whenever scope, findings, or status changes.
10. Antigravity agents/actors must read this file before editing. Each agent must declare assigned files, avoid overlapping ownership, rebase only within the remediation branch, run the full required test matrix, and report changed paths, test outputs, residual risks, and commit SHA. Conflicts are escalated, not overwritten.

---

## Re-audit finding: UG-COR-BINDING-001
**Severity:** High — persisted execution resume integrity  
**Status:** Code remediation and regression test verified in container runtime.  
**Confirmed defect:** `VerifyCryptographicBindings` returned success when state or envelope was nil. It also skipped execution/transaction ID comparison when the envelope value was empty, allowing a missing binding to bypass mismatch detection.

**Physical remediation**
- `client/engine/executor.go`: nil inputs now fail closed with `invalid_envelope_format`; persisted non-empty execution, transaction, plan, tenant, project, environment, and policy bindings must match supplied envelope values, including rejecting empty supplied values.
- `client/engine/executor_test.go`: regression tests cover nil state, nil envelope, missing execution ID, and missing transaction ID (`TestVerifyCryptographicBindingsFailsClosedOnMissingInputs`).
- `client/engine/state.go`: `GetTransactionDir` sanitizes input by trimming whitespace and rejecting empty values.

**Validation status**
- Containerized verification in `golang:1.22-alpine`:
  - `go vet ./...`: PASS (0 errors)
  - `go test -v -run TestVerifyCryptographicBindings ./engine`: PASS
  - `go test ./...`: PASS (cmd, engine, i18n all passing)
