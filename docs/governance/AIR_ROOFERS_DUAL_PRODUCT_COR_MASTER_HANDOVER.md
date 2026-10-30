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
| Ugondu | [Chicitadel/ugondu PR #57](https://github.com/Chicitadel/ugondu/pull/57) | `fix/cor-runner-mandatory-evidence-gate-2026-10-29` | `c22389617fc16abd71e5a8a54f34365ccf58612c`; locale remediation commits follow, latest known handover commit `c0077ff294633676400202fc0982bb586be9f425` | 20 stream verifiers committed; nine locale false-pass corrections and tests committed; exact-head checks for the new candidate pending |
| Dumcholu | [Chicitadel/dumcholu PR #15](https://github.com/Chicitadel/dumcholu/pull/15) | `fix/cor-policy-service-endpoint-config-2026-10-29` | `3f662fb8c8b7491705e5f0b8fded8c4fc32c6f7a`; manifest-validator remediation commits follow, latest known security-test commit `6fed87132ad620084b423d700a95f7b49818b62f`; latest handover commit `8b13af23182fc7b15f0b463bdcb08c8eae33dd44` | Mandatag/endpoint/manifest changes committed; strengthened manifest validation and negative tests committed; exact-head checks pending |

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
