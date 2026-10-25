# Ugondu — Antigravity Shared Change Guardrail & Handover

**Document ID:** AR-UG-ENG-ANTIGRAVITY-GUARDRAIL-2026-10-26  
**Repository:** https://github.com/Chicitadel/ugondu  
**Protected production branch:** `phase4/production-hardening`  
**Mandatory rule:** Never directly commit, push, reset, force-push or merge to `master` or the protected production branch. Use reviewed pull requests.

## Non-negotiable controls

1. **Branch isolation:** Each task has a dedicated branch from an explicitly recorded base SHA. No actor edits another actor's branch without an agreed handoff.
2. **Inspect before editing:** Review current source, callers, tests, contracts, ADRs and prior audit notes. Prefer fixing the owning abstraction over adding duplicate helpers or parallel services.
3. **Fail closed:** Missing, malformed, out-of-scope, stale or unverifiable data is a failure/unqualified state, never success.
4. **No architecture downgrades:** Do not weaken validation, signatures, containment, least privilege, tenancy boundaries, idempotency, evidence freshness, or error semantics to make CI green.
5. **Regression first:** Every confirmed defect requires a regression test that demonstrates the failure mode, including adversarial inputs when applicable.
6. **Evidence binds to exact candidate:** Record branch, commit SHA, exact command, exit code, logs/workflow URLs and residual risks. Source/config/workflow/policy changes invalidate affected evidence.
7. **No false certification:** Unit tests, static scans, PR CI and bounded provider runs are not universal commercial release certification. Never claim universal COR closure while any mandatory target or release gate remains unqualified.
8. **No secrets:** Never commit credentials, private keys, tokens, customer data, or unredacted environment dumps.
9. **One owner per concern:** Record task ID and files owned. Coordinate conflicts; do not overwrite concurrent work.
10. **Handover required:** Update this guardrail and the finding-specific audit note in the same PR.

## Required change protocol

For every finding: (1) identify the source evidence and root cause; (2) implement the smallest coherent fix; (3) add regression/adversarial tests; (4) run focused and mandatory CI tests; (5) inspect final diff and dependency/secret impact; (6) record exact candidate-bound evidence; (7) obtain independent review; (8) keep PR draft until all required checks pass.

## Status definitions

- **GREEN / CLOSED:** Fix and regression tests pass on exact candidate; evidence is reproducible and reviewed.
- **YELLOW / PARTIAL:** Some code or evidence exists, but acceptance criteria remain unproven.
- **RED / BLOCKED:** Confirmed defect, failed gate, missing mandatory evidence or unsupported target.
- **N/A:** Explicitly approved and documented scope exclusion; never used to hide a gap.

Overall release readiness is the least-ready mandatory dimension. Do not aggregate partial green checks into a 100% release claim.

## Current task ledger

- **UG-COR-SEC-012 — Policy-pack template path containment:** implementation branch `fix/cor-policy-pack-path-containment-production-base-2026-10-26`; source `scripts/governance/verify-policy-pack-digests.mjs`; regression suite `tests/policy-pack-path-containment.test.mjs`. Status: implementation committed; CI execution and independent review pending.
- **Release boundary:** This task does not qualify AI model fleet, all OS/IDE/hosting/cloud targets, live AWS lifecycle, or immutable customer artifact install/upgrade/rollback/uninstall. Universal commercial release remains NOT CERTIFIED until all mandatory gates have candidate-bound evidence.
