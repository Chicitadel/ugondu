# Ugondu — Central Change Guardrail & Antigravity Handover
**Revision:** 2026-10-27  
**Repository:** `Chicitadel/ugondu`  
**Dedicated branch:** `fix/cor-binding-reaudit-2026-10-27`  
**Base:** `fix/go-thin-client-vet-and-module-imports-2026-10-27`  
**Authority:** This document is the canonical guardrail for this remediation branch. Do not treat it as proof of full COR certification.

## Non-negotiable change controls
1. Never commit, push, reset, rebase, or write directly to `main` or `master`; work only on the named remediation branch and open a PR for review.
2. Re-audit the current branch head before each remediation. Verify the actual source, tests, CI evidence, and existing implementation plans; do not infer a fix from an old report alone.
3. Every confirmed finding must be physically implemented before handoff. Include a regression test that fails before the fix and passes after it, plus the exact test command and observed result. If a test could not be run, state that clearly and keep the gate blocked.
4. Preserve the existing architecture and APIs unless an explicit approved plan authorizes change. No duplicate abstractions, parallel implementations, silent schema drift, weakening security checks, deleting tests, skipping tests, or replacing a superior implementation with a simpler downgrade.
5. Use centralized product/configuration registries and localization/tokenization; no product-name hardcoding or new user-facing raw strings where a token is required.
6. Fail closed for security, entitlement, billing, release, portability, and governance decisions. Aerobill and Mandatag remain the Air Roofers federated system's authoritative billing/entitlement layer; Ugondu must not duplicate those business rules.
7. Maintain one-code/host-anywhere portability. Shared-host/DirectAdmin is the cost-minimal launch target; do not introduce mandatory AWS-only services, root access, or provider-specific assumptions into core runtime. Provider integrations must remain behind adapters/configuration, with deployment profiles and secrets supplied externally. VPS/AWS migration must not require application refactoring.
8. Never claim 100% COR closure or public release readiness from unit tests alone. Require reproducible CI, security and integration tests, attribution/governance checks, supported-target evidence, and authorized physical staging receipts for every required environment. Public commercial release stays fail-closed until all release gates have signed evidence.
9. Keep this guardrail and the audit evidence synchronized with code changes. Update this document and the handover note in the same branch/commit whenever scope, findings, or status changes.
10. Antigravity agents/actors must read this file before editing. Each agent must declare assigned files, avoid overlapping ownership, rebase only within the remediation branch, run the full required test matrix, and report changed paths, test outputs, residual risks, and commit SHA. Conflicts are escalated, not overwritten.

## Re-audit finding: UG-COR-BINDING-001
**Severity:** High — persisted execution resume integrity  
**Status:** Code remediation and regression test committed to branch; execution evidence pending CI/local runtime validation.  
**Confirmed defect:** `VerifyCryptographicBindings` returned success when state or envelope was nil. It also skipped execution/transaction ID comparison when the envelope value was empty, allowing a missing binding to bypass mismatch detection.

**Physical remediation**
- `client/engine/executor.go`: nil inputs now fail closed; persisted non-empty execution, transaction, plan, tenant, project, environment, and policy bindings must match supplied envelope values, including rejecting empty supplied values.
- `client/engine/executor_test.go`: regression tests cover nil state, nil envelope, missing execution ID, and missing transaction ID.

**Validation status**
- Source-level patch applied through GitHub API to the dedicated branch.
- Tests have not been executed in this environment; do not report them as passing. CI must run `cd client && go test ./...` and `cd client && go vet ./...` on this branch.
- Existing reported container results in prior handover are historical and do not establish that these new tests passed.

## Handover protocol
For each subsequent audit finding, append a uniquely named finding section containing: source evidence, impact, affected paths, exact physical fix, regression test name, commands/results, CI links, remaining risk, and COR gate mapping. Do not mark a finding closed until implementation and regression evidence are verified.