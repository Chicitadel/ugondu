# Air Roofers Dual-Product COR Master Handover & Antigravity Guardrail

**Document ID:** AR-COR-DUAL-PRODUCT-MASTER-2026-10-30  
**Authority:** UAIGOS v3.0.0; COR fail-closed evidence policy  
**Products:** Ugondu and Dumcholu  
**Canonical coordinator:** `Chicitadel/ugondu/docs/governance/AIR_ROOFERS_DUAL_PRODUCT_COR_MASTER_HANDOVER.md`  
**Status:** ACTIVE REMEDIATION — NOT A CERTIFICATE

## 1. Immutable operating rules

1. Never write directly to `master`, `main`, or protected production branches. Work only on dedicated finding branches and draft PRs.
2. Before editing, inspect the exact current branch, commit, files, tests, ADRs, and existing handover. Do not rely on stale summaries.
3. One task owner per file/concern. Declare base SHA, task ID, files, expected behavior, tests, and dependencies before editing.
4. Implement confirmed defects in physical source code before handover. A plan, TODO, generated report, source keyword, mock, or agent instruction is not remediation.
5. Every finding needs a reproducible positive test and a negative/adversarial regression test. For security and governance checks, negative tests must mutate the relevant behavior or contract, not merely remove a token from source.
6. Preserve existing architecture, API contracts, tenancy boundaries, security controls, evidence freshness, localization, and provider-neutral design. No duplicate services, shadow registries, silent fallbacks, or test weakening.
7. Missing, skipped, stale, unexecuted, mocked-as-live, or unverified evidence is NOT PASS. The overall readiness is the least-ready mandatory gate.
8. Every source, test, workflow, dependency, manifest, or policy change creates a new candidate. Re-run all affected tests and exact-head CI/COR. Never reuse receipts from an earlier SHA.
9. Do not claim 100% COR closure or certification until every required stream, deployment, integration, security ceremony, data calibration, independent review, and authorized sign-off is evidenced.
10. Never commit secrets, credentials, private keys, personal data, or live customer payloads.

## 2. Authority boundaries

- **AeroBill:** authoritative billing, pricing, metering, invoice, and payment business logic.
- **Mandatag:** authoritative licensing, entitlement, and subscription-rights decisions.
- **Ugondu/Dumcholu:** consume Air Roofers federation contracts; do not clone, override, or independently redefine these decisions.
- Cloud/provider portability is mandatory: one application codebase across DirectAdmin/shared hosting, a supported VPS, ECS on EC2, and ECS Fargate. Host-specific configuration belongs in deployment manifests/environment/secrets, not business logic.

## 3. Cost and deployment strategy

- Current launch posture: retain existing DirectAdmin/shared hosting where it safely supports the workload; do not require a VPS that is not available.
- AWS account is available for later, explicitly authorized staging. Do not create billable resources without budget inspection and approval.
- When AWS staging is justified, prefer a small ECS-on-EC2 capacity-provider deployment with one staging task, bounded instance count, minimal log retention, Secrets Manager references, and budget alarms. Fargate is a later operational upgrade.
- Keep the same container image, application code, environment contract, database migration path, and health/readiness contract across EC2 and Fargate. No product code refactor should be required for a hosting-tier change.
- Do not claim zero-downtime migration without proven database compatibility, persistent storage, load-balancer health, rollback, and live cutover evidence.

## 4. Candidate ledger

| Product | Repository / PR | Branch | Candidate baseline | Current posture |
|---|---|---|---|---|
| Ugondu | [Chicitadel/ugondu PR #57](https://github.com/Chicitadel/ugondu/pull/57) | `fix/cor-runner-mandatory-evidence-gate-2026-10-29` | `c22389617fc16abd71e5a8a54f34365ccf58612c`; locale remediation commits follow, latest known candidate commit `030f9d4dd35698ec246cf4d2f8b59e018d53923b` | 20 stream verifiers committed; nine locale false-pass corrections and tests committed; exact-head checks for the new candidate pending |
| Dumcholu | [Chicitadel/dumcholu PR #15](https://github.com/Chicitadel/dumcholu/pull/15) | `fix/cor-policy-service-endpoint-config-2026-10-29` | `3f662fb8c8b7491705e5f0b8fded8c4fc32c6f7a`; manifest-validator remediation commits follow, latest validator correction `38382e6b652c2045b0230bcdf6a7d8508cb29b42`; latest handover commit `fe3b09490242b76ea701071409827e9b2022b81f` | Mandatag/endpoint/manifest changes committed; strengthened manifest validation and negative tests committed; exact-head checks pending |

The commit hashes above are branch-specific receipts, not proof of current branch HEAD. Always query GitHub before starting a new actor or changing a file.

## 5. Confirmed remediation and re-audit findings

### Ugondu

- Replaced the reported 20 placeholder executors across A07, B09-B16, C22, D25-D28, E29-E33, and F39.
- Existing reported checks: 40/40 COR streams, 15/15 verifier tests, exact-head CI/COR successful on the earlier candidate `c2238961...`.
- New independent finding `UG-COR-LOCALE-BASELINE-OPTIONAL-001`: D25-D28 and E29-E33 allowed the English parity baseline to be absent while returning PASS. All nine now require `en.json`; missing baseline throws a stream-specific error.
- Added `tests/cor-locale-objective-verifiers.test.js`, with missing-baseline rejection and exact-key-parity positive cases for all nine verifiers, plus a key-drift negative case. Wired into `test:governance`.
- Residual concern: several non-locale verifiers still rely on source substring/regex inspection. Their objective semantics and negative behavior require independent adversarial verification; the old 40/40 receipt is not enough to certify all objectives.

### Dumcholu

- `DUM-COR-MANDATAG-LOCAL-STUB-001`: Mandatag adapter changed to fail closed for unverified entitlements, with HMAC-SHA256 token validation, HTTPS authority checks, and a bounded cache based on genuine prior verification.
- `DUM-COR-ENV-VAR-DRIFT-001`: ECS task and EC2/Fargate CloudFormation bindings aligned; a new validator checks environment endpoint values and secret references in their correct sections.
- `DUM-COR-RESIDUAL-LOCALHOST-DEFAULTS-001`: implicit localhost API defaults removed from client repositories.
- Existing reported tests: Maven licensing and Gemini modules; Flutter shared/citizen/partner; task-definition render tests; previous exact-head workflows green on `3f662fb...`.
- New independent validator tests reject database secret entries placed in Environment and endpoint-value drift. The exact-head workflow must run these tests before the strengthened manifest check is considered closed.
- New security finding `DUM-COR-MANDATAG-JSON-SUBSTRING-GRANT-001`: regex substring matching could accept malformed/nested/ambiguous entitlement JSON. The adapter now parses strict JSON, requires a top-level boolean entitlement field, rejects duplicate/conflicting/non-boolean values, and has negative regression tests.
- No live AeroBill/Mandatag production transaction is claimed by unit tests or mocked HTTP responses.

## 6. Required remaining COR evidence

- Exact-head CI and COR after the latest changes in both repositories.
- Full objective-by-objective independent verifier review, including adversarial negative tests.
- AWS staging only after explicit approval and cost/budget inspection; service-side CloudFormation validation, health/readiness, logs, backup/restore, rollback, and migration receipts.
- Live non-production AeroBill billing/metering and Mandatag licensing/entitlement transactions using approved test tenants and observable correlation IDs.
- Nigeria policy calibration datasets, provenance, validation and authorized policy sign-off where applicable.
- Real WebAuthn/FIDO2 challenge/response ceremony, origin/RP validation, replay protection, server-side signature verification, and negative tests where required.
- Independent review, product-owner acceptance, corporate authorization and signed final COR certificate.

## 7. Antigravity handover contract

Before an actor starts:
- Read this document and the repository-local guardrail/handover.
- Query the live PR head and branch status.
- Identify open findings and file ownership; do not repeat completed work.
- Reproduce the finding and write tests before changing source.
- Commit source, tests, and updated handover on the same dedicated branch.
- Report exact commit SHA, changed files, test commands/results, CI run IDs, residual risks, and whether any AWS resources were created.

**Never tell the next actor to implement a fix that is still only described in a handover. Either implement it and attach reproducible evidence, or label it OPEN / BLOCKED.**

## 8. Release decision

**Ugondu:** PARTIAL / RELEASE BLOCKED / NOT CERTIFIED  
**Dumcholu:** PARTIAL / RELEASE BLOCKED / NOT CERTIFIED  
**Air Roofers dual-product commercial release:** NOT CERTIFIED

This handover is a coordination and change-control artifact. It is not a certificate, legal opinion, AWS deployment receipt, independent security attestation, or evidence of 100% COR closure.


## Latest verification queue snapshot — 2026-10-30

- Ugondu latest known branch head: `a54fafccd419bf3e7328c84abeb1d440178185ae`. COR Certification run #40984774896 and Ugondu CI/CD run #40984774779 were pending when queried; no job results were available yet.
- Dumcholu strict-parser test candidate: `6fed87132ad620084b423d700a95f7b49818b62f`. COR Policy Simulator Contract run #40984748413 was queued; deployment manifest qualification run #40984748323 had passed on the preceding candidate before the final security-test change. Do not treat that older run as exact-head proof.
- Dumcholu latest known documentation head: `ab88652344205145cba42500be3c39374239d155`; documentation-only descendants do not replace the need to verify the latest code candidate's queued workflows.
- Final status remains `PARTIAL / RELEASE BLOCKED / NOT CERTIFIED` for both products. No AWS resources were provisioned.


### Additional Ugondu finding — recovery transaction revision conflict

- **Finding:** `UG-COR-RECOVERY-DOUBLE-FAILURE-UPDATE-001`.
- **Root cause:** The recovery orchestrator updated a failed transaction twice using the same stale expected revision, masking the original atomic execution failure with `TRANSACTION_REVISION_CONFLICT`.
- **Physical fix:** Catch handling now reloads the persisted transaction and updates FAILED only if it is not already terminal/FAILED.
- **Tests:** Added a compiled-runtime regression test for rollback, original error preservation, and persisted FAILED revision; wired it into governance and the COR runner. F39 rejects the stale revision-conflict symptom.
- **Verification:** New exact-head checks pending; do not use earlier 40/40 receipts to close this finding.


## Verification update — 2026-10-30 01:20 UTC

- **Ugondu PR #57:** latest known candidate `030f9d4dd35698ec246cf4d2f8b59e018d53923b`; COR Certification run #40985028471 and CI/CD run #40985028411 were pending with no job results available. They include the F39 and recovery transaction regression changes.
- **Dumcholu PR #15:** candidate run #40984788551 failed because the new Dart manifest validator did not compile; focused Flutter tests 12/12, Flutter analysis, OpenAPI drift and Maven backend tests passed, but validator negative tests were skipped. The validator was rewritten at `38382e6b652c2045b0230bcdf6a7d8508cb29b42`. Exact-head reruns on handover head `fe3b09490242b76ea701071409827e9b2022b81f`: COR Policy Simulator Contract #40985106618, Deployment Manifest Qualification #40985106578 and Product Name Governance #40985106678 were queued at last check.
- Do not report the Dumcholu manifest validator as passing until #40985106618 completes its validator and negative-case steps successfully.
- Both PRs remain open draft PRs; neither is merged. Both product release postures remain `PARTIAL / RELEASE BLOCKED / NOT CERTIFIED`.


## CI queue correction

The earlier Ugondu COR Certification run #40985028471 and CI/CD run #40985028411 were subsequently cancelled before job results became available. They are not passing receipts. The latest Ugondu source/test candidate therefore still requires fresh exact-head CI and COR runs. Do not infer a pass from the earlier 40/40 result on `c2238961...`.
