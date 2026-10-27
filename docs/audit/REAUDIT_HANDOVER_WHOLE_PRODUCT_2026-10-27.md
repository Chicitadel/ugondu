# Ugondu Whole-Product Re-audit Handover — 2026-10-27

**Finding ID:** `UG-COR-I18N-TEST-INTEGRITY-001`  
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

## 3. Changed files

- `tests/localization-dropin.test.js`
- `docs/governance/ANTIGRAVITY_CHANGE_GUARDRAIL.md`
- `docs/audit/REAUDIT_HANDOVER_WHOLE_PRODUCT_2026-10-27.md` (this document)

## 4. Verification required on the exact PR head

The repository-hosted tools can write the source and open the PR, but this session has not run the Node test suite in a checked-out working tree. Do not describe these tests as locally executed or passing until the exact-head workflow proves it.

Required:
1. `npm run build` (so the test exercises the exact compiled shared localization implementation).
2. `node tests/localization-dropin.test.js`.
3. `npm run verify:t03`, `npm run verify:t04`, `npm run test:governance`.
4. The complete `node scripts/run-cor-gates.js` aggregate; record any `NOT_RUN` as failure.
5. Review test cleanup under both pass and intentional assertion-failure conditions.
6. Confirm the workflow SHA equals the PR head SHA and preserve logs/artifacts.

## 5. Broader COR findings and limitations

The attached Antigravity log reports 65/65 local COR suites and a green aggregate governance pipeline at candidate `d2831322`. Those are reported results from the attachment, not independently reproduced in this session. The same report explicitly withholds commercial release until physical staging receipts exist for the declared target scope.

Previously inspected workflow evidence for the prior candidate also showed that the AWS physical qualification and signing-trust-root steps were skipped. Do not infer a signed or fully qualified commercial release from local test-suite success alone.

The full whole-product audit is **not complete**. This branch addresses one confirmed test-integrity defect; it does not assert that all pending features, host/provider adapters, COR gaps, or UAIGOS obligations are closed.

## 6. Non-negotiable Antigravity guardrails

- Never write directly to `master`, `main`, or `phase4/production-hardening`; use the dedicated branch and reviewed PR.
- Re-audit current source and prior findings before making any change. A passing aggregate suite does not prove every advertised feature is implemented.
- Do not weaken assertions, remove failing suites, suppress `NOT_RUN`, or relabel skipped physical qualification as PASS.
- Keep one-code/host-anywhere portability: DirectAdmin shared-host launch first, VPS/AWS later behind adapters/configuration; avoid provider-specific logic in core.
- Keep commercial billing and entitlement decisions exclusively in the Air Roofers federated Aerobill/Mandatag boundary. Do not duplicate billing/entitlement business logic in Ugondu.
- Keep product naming registry-driven; do not add hardcoded product names or parallel registries.
- Re-run candidate-bound evidence after every source, test, dependency, workflow, or policy change. Preserve raw command output, exit codes, commit SHA, and artifacts.
- Keep overall COR status `PARTIAL / RELEASE BLOCKED` until every mandatory code, governance, and authorized physical qualification gate is independently evidenced.

## 7. Acceptance

Close `UG-COR-I18N-TEST-INTEGRITY-001` only when the exact PR head passes the focused localization test and all mandatory governance/CI checks. Do not close the whole-product COR ledger based on this single finding.
