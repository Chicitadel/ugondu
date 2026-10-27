# Ugondu COR Master Execution Checklist — PR #37
**Last updated:** 2026-10-27  
**Repository:** [Chicitadel/ugondu](https://github.com/Chicitadel/ugondu)  
**Remediation branch:** `fix/cor-binding-reaudit-2026-10-27`  
**Candidate commit assessed:** `99d89092739cd7ff2cb7e0c43e394d12019005e0`  
**Related pull request:** [PR #37](https://github.com/Chicitadel/ugondu/pull/37)  
**Decision:** **PARTIAL / RELEASE BLOCKED — not full COR certification**

## 1. Confirmed remediation
Finding `UG-COR-BINDING-001` addressed in `client/engine/executor.go`: `VerifyCryptographicBindings` no longer treats nil state or envelope as successful verification and rejects missing supplied values for populated persisted bindings. Existing localized mismatch tokens are retained. Regression coverage is present in `client/engine/executor_test.go`.

The candidate also contains transaction-directory path validation in `client/engine/state.go`; this checklist does not count that as a new remediation without a diff proving its introduction on this branch.

## 2. Candidate-bound evidence observed
| Evidence | Result | Scope / limitation |
|---|---|---|
| [COR Certification run 40545111554](https://github.com/Chicitadel/ugondu/actions/runs/40545111554) | Success | Exact SHA `99d89092739cd7ff2cb7e0c43e394d12019005e0`; workspace, governance, regression and evidence-integrity steps passed. AWS Physical Qualification Gate and signing-trust-root step were skipped. |
| [Ugondu CI run 40545111529](https://github.com/Chicitadel/ugondu/actions/runs/40545111529) | Success | Attribution, T03, repository governance/anti-stub, build, T04 and workspace tests passed. |
| [DirectAdmin Staging Safety run 40545111655](https://github.com/Chicitadel/ugondu/actions/runs/40545111655) | Success | Path containment and evidence scope only; not a live deployment receipt. |
| Go vet / Go tests / five-target cross-build | Reported pass in Antigravity log; raw output not independently verified here | Earlier attempts in the same log exited or were cancelled. Attach complete logs or exact-head workflow evidence before marking GREEN. |

COR artifact reported by GitHub: `ugondu-cor-evidence-1e3a5488a719bc8c335a071e7d8a58f1db62e11a`; SHA-256 `f639183c5de286f499363e8cac1225d0db9df693a0851cf7b816ad53c9bcad56`.

## 3. Release gates still open
- [ ] Exact-head `cd client && go vet ./...` succeeds with captured logs.
- [ ] Exact-head `cd client && go test ./...` succeeds with captured logs.
- [ ] Race test and supported cross-build matrix are evidenced; native lifecycle claims remain separate from cross-compilation.
- [ ] The final candidate has a clean checkout and current evidence after the last source change.
- [ ] Authorized candidate-bound physical staging receipts exist for DirectAdmin and each additional release target actually claimed (including AWS `eu-west-3` and GCP only if in the declared release scope).
- [ ] Required signing-trust-root and final authorization steps are not skipped.
- [ ] Independent review and all mandatory UAIGOS/COR checks pass on the same release candidate.
- [ ] PR #37 is reviewed and merged only through the approved protected-branch process.

## 4. Governance invariants for all Antigravity actors
1. Never write directly to `master` or the protected production branch. Use a dedicated branch and reviewed PR.
2. Re-audit current code and plans before every fix; do not rely solely on previous summaries.
3. Physically implement every confirmed defect and add a regression test before handoff.
4. Record exact command, exit status, commit SHA, logs and CI run links. Never mark a cancelled, skipped or unavailable check as passing.
5. No architecture downgrades, duplicated implementations, removed tests, stub/mock substitution in production paths, silent schema drift or hardcoded product names.
6. Keep Air Roofers' Aerobill/Mandatag as the authoritative billing/entitlement layer; do not duplicate those business rules in Ugondu.
7. Preserve one-code/host-anywhere portability: DirectAdmin/shared hosting at low initial cost, then VPS/AWS without core refactoring. Host-specific integrations belong behind adapters and configuration.
8. A documentation-only commit does not make older source evidence a live deployment receipt. Recheck candidate SHA and evidence freshness after every change.
9. A green PR-mode COR job with skipped physical gates is not full public commercial release certification.

## 5. Final boundary
No 100% COR closure is asserted. Current status is **PARTIAL / RELEASE BLOCKED** until all mandatory code, test, governance, signature and physical qualification evidence is current and independently accepted.
