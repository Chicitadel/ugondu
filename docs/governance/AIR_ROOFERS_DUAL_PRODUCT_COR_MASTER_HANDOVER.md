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


### Additional Ugondu finding — nested locale parity false-pass

- **Finding:** `UG-COR-LOCALE-NESTED-KEY-PARITY-001`. D25-D28/E29-E33 previously compared only root-level keys, while `scripts/validate-locales.js` validates recursively flattened leaf paths.
- **Physical fix:** Added shared `scripts/cor/locale-key-parity.js`; all nine locale objective verifiers now compare recursive nested leaf paths, including array indexes, and reject prototype-pollution keys. Empty-object handling matches the canonical locale validator.
- **Regression tests:** All nine streams have adversarial nested leaf-key drift tests plus positive nested object/array parity tests. Existing baseline-missing tests remain.
- **Status:** Code and tests committed on the dedicated branch; exact-head CI/COR must rerun. All previous 40/40 receipts are historical and cannot close this new candidate.
- **Candidate change commits:** helper `79bf138b7baa2e25cc82a9cf5b39e9b27ea9e616`; regression suite `2c50fb32c5e7df668d569fb0076375e339364d0b`; semantic alignment `df3f9a0e1dbf9b0db0e134302dbd951a21bba733`; audit note `61163446f7fc610bbe827ae388b46c5be0eda721`.
- **Release posture:** `PARTIAL / RELEASE BLOCKED / NOT CERTIFIED`.


## 2026-10-30 follow-up — Ugondu nested locale and objective verifier remediation

### Newly closed findings on the dedicated Ugondu branch

- **`UG-COR-LOCALE-NESTED-KEY-PARITY-001`:** Added recursive flattened leaf-path comparison for D25-D28/E29-E33 via `scripts/cor/locale-key-parity.js`; handles nested objects and arrays, rejects prototype-pollution keys, and aligns empty-object behavior with the canonical locale validator. Added nested drift positive/negative tests.
- **`UG-COR-ENGINE-SIGNER-INDEPENDENCE-001` (A04):** Engine module is now importable without triggering CLI execution; runtime probe verifies no signer dependency and no signing keys required.
- **`UG-COR-FINALIZER-SIGNER-INDEPENDENCE-001` (A05):** Finalizer CLI is isolated from module import; runtime receipt verification accepts valid digests and rejects invalid receipts without loading signer or signing keys.
- **`UG-COR-SIGNATURE-CRYPTO-VERIFICATION-001` (A06):** Actual isolated Git candidate signing with ephemeral RSA key pair; signature is verified, mismatched trusted public key rejected.
- **`UG-COR-RECOVERY-OBJECTIVE-BEHAVIORAL-VERIFICATION-001` (F35-F38):** Replaced source-token verifiers with runtime checks for approval enforcement, governed route authorization before mutation, immutable snapshot digest binding, blast-radius limits and safe dry-runs.

### Exact-head verification receipt

- Ugondu PR #57 branch head: `b6f64f2bc207198851d7dea09747806279890802`.
- Evaluated merge candidate: `59e630d7aa1e94d3153db7462a89dcfdce49666f`.
- CI/CD run #40987744466: **SUCCESS** (all workspace builds, lint/type checks, Go target builds, five-service readiness and integration suites).
- COR Certification run #40987744216: **SUCCESS**; fresh qualification **40/40 PASS**, zero failed/skipped/not-run streams; independent finalization `READY_FOR_COR_SIGNATURE`.
- Evidence artifact #12947368564; SHA-256 `e3aa780a793f7c07bdde524c2094615585691b1e32e3e10c49f8c88a79cc1f18`.
- The evidence ledger candidate is the merge commit above, not the PR head itself. The artifact's workflow metadata is bound to PR head `b6f64f2...`.
- **Not complete:** signing trust-root step and final COR authority signature were skipped. AWS physical qualification was skipped. No AWS resources were provisioned. Therefore this remains `READY_FOR_COR_SIGNATURE`, not a signed COR certificate or public commercial release approval.
- **Dumcholu:** PR #15 candidate `ac0585bf43b6ea4fa1ba6f5f8fa20f633428f683` retains its previously verified three successful workflows; no Dumcholu source changes were made in this follow-up.
- Both PRs remain open and unmerged. No direct writes to `master` or `main`.

### Release decision

**Ugondu:** qualification pass; signature and physical deployment gates outstanding.  
**Dumcholu:** source remediation and its three qualification workflows pass; physical deployment and live federation gates outstanding.  
**Dual-product commercial release:** **PARTIAL / RELEASE BLOCKED / NOT CERTIFIED**.


---

## Ugondu re-audit continuation — 2026-10-30

**Dedicated branch:** `fix/cor-runtime-verifier-depth-2026-10-30`  
**Parent candidate:** `01498bfa6064be8bcb6db008f740ec2f41420fa1`  
**Scope:** runtime proof depth for A07 and B11; no `main` or production branch writes.

### Confirmed findings and physical changes

| Finding | Previous weakness | Physical change | Regression evidence |
|---|---|---|---|
| `UG-COR-A07-REGISTRY-RUNTIME-PROOF-001` | A07 inspected validator source substrings and could emit PASS without executing the registry validator | Replaced with real child-process execution of `scripts/check-cor-stream-registry.js`; runs positive against all 40 executor contracts and negative against a copied fixture with tampered repository identity | `tests/cor-a07-runtime-verifier.test.js`; included in `test:governance` |
| `UG-COR-B11-LOCALE-UPDATER-RUNTIME-PROOF-001` | B11 inspected source tokens rather than proving updater behavior | Runs actual `scripts/update-locales.js` in isolated temporary locale trees; proves translations are preserved and missing/extra keys are rejected | `tests/cor-b11-locale-updater-runtime.test.js`; included in `test:governance` |

### Candidate verification

- Source changes and regression tests are committed to this branch.
- Exact-head remote CI/COR must run against the final branch head; no previous candidate receipt applies.
- Do not infer test success from code presence. Record actual command output, workflow conclusion, COR artifact ID and digest before closing either finding.
- Other static verifiers (B09, B10, B12-B16, C22) remain open for objective-specific review; do not mark them behaviorally closed by association.

### Hosting and federation guardrails

- No AWS resources are provisioned by this branch. Migration is deferred until traction, meaningful official engagement or funding.
- Maintain one-code/host-anywhere portability across DirectAdmin, future VPS, ECS on EC2 and ECS Fargate. Keep host-specific configuration in deployment manifests, environment variables, secrets and infrastructure templates.
- AeroBill remains authoritative for billing, pricing, metering, invoices and payments. Mandatag remains authoritative for licensing and entitlement. Ugondu must consume those contracts without duplicating their business logic.
- Any AWS staging launch requires a separate explicit authorization, cost/budget review, physical security review and rollback/backup qualification.

**Release posture:** `PARTIAL / RELEASE BLOCKED / NOT CERTIFIED` until all required objective verifiers, deployment, federation, policy, security ceremonies, independent review and signatory gates are evidenced.


---

## Dual-product exact-head re-audit continuation — 2026-10-30 15:49 CET

This section supersedes any older branch/commit assumptions below when the exact GitHub refs differ. It is an additive status update, not a certification.

### Current candidate branches

| Product | Dedicated remediation branch | Starting candidate | Current source head | Status |
|---|---|---|---|---|
| Ugondu | `fix/cor-b09-b10-runtime-verifiers-2026-10-30` | `ea8f240070c96c3cd53ff7bee75884200ec15dbf` (PR #59 head) | `96a36bab15e41937b502a13be561d67a437a5b3d` | Source/test changes committed; exact-head CI and COR pending |
| Dumcholu | `security/career-journey-principal-identity-hardening-2026-10-30` | `eb0f0e671f009231d2e50eb0fdd7aafd5447341d` (PR #19 head) | `56e50ec059b7e5acfd750763ecbeb25cd8a5bfc4` | Source/test changes committed; exact-head Maven and CI pending |

### Ugondu — confirmed COR verifier behavior gap

**Finding:** `UG-COR-B09-B10-STATIC-VERIFIER-FALSE-PROOF-001`

The B09 and B10 executors declared `verificationMode: STATIC` and used source substring/regular-expression inspection. This could prove the presence/absence of source text without proving that the real Jest setup enforced UPM protection or the deterministic translation fixture.

**Physical implementation on the dedicated branch:**
- Changed B09 and B10 to `verificationMode: TEST`.
- Added `scripts/cor/run-jest-runtime-probe.js`, an isolated Jest runtime probe harness with temporary test/setup files and guaranteed cleanup.
- B09 now executes the actual engine-core Jest setup and actual `UpmExecutionGate` with `UGONDU_UPM_SECRET` empty; it requires rejection. A separate adversarial setup mocks the gate and must fail the probe.
- B10 now executes the real global `__t` and `@ugondu/shared.__t` fixture behavior. An adversarial setup returning `[fr]` must fail the probe.
- Updated `tests/cor-stream-objective-verifiers.test.js` to assert TEST mode, runtime receipts, adversarial rejection, and missing-config fail-closed behavior.

**Changed files:** `scripts/cor/run-jest-runtime-probe.js`, `scripts/cor/streams/B09.js`, `scripts/cor/streams/B10.js`, `tests/cor-stream-objective-verifiers.test.js`.

**Acceptance state:** YELLOW / IMPLEMENTED — exact-head CI has not yet run. Do not close B09/B10 until the focused verifier suite, `npm run test:governance`, build/typecheck, CI and COR all pass on this exact branch head. Any failed runtime probe is a real blocker, not a reason to weaken the assertion.

### Dumcholu — confirmed career-journey identity trust gap

**Finding:** `DUM-COR-CAREER-PRINCIPAL-HEADER-SPOOF-001`

The CareerJourneyController fell back to caller-supplied `X-Authenticated-Principal` when Spring supplied no `Principal`, and passed caller-supplied `X-Authenticated-Role` to the ownership check. Its legacy programmatic overloads also fabricated a citizen identity while passing a null Principal. The current service security configuration permits API requests and the controller must not treat arbitrary request headers as proof of authentication.

**Physical implementation on the dedicated branch:**
- Removed the header-only identity fallback: missing Spring Principal now fails closed through `verifyPrincipalOwnership`.
- The controller no longer trusts `X-Authenticated-Role`; the career citizen endpoints enforce the citizen ownership path.
- Legacy direct overloads no longer authenticate themselves; they now fail closed because no authenticated Principal is present.
- Added `CareerJourneyControllerSecurityTest` for anonymous header spoofing, caller-supplied ADMIN role escalation, authenticated-subject precedence, and the legacy overload.

**Changed files:** `dumcholu-backend/career-journey-service/src/main/java/org/dumcholu/journey/controller/CareerJourneyController.java`, `dumcholu-backend/career-journey-service/src/test/java/org/dumcholu/journey/CareerJourneyControllerSecurityTest.java`.

**Residuals — NOT CLOSED:** Tenant identity still arrives through `X-Authenticated-Tenant` / `X-Target-Tenant`; this branch does not prove those claims are cryptographically or network-bound to the authenticated Principal. The gateway-to-service authentication/tenant-claim contract must be independently verified and tested before declaring the entire identity boundary secure. The discovery and guidance case maps in `CareerJourneyService` are process-local `ConcurrentHashMap` stores; durable persistence, restart survival, and multi-instance consistency remain open. Do not describe these as complete.

### Hosting, federation and release rules

- Continue DirectAdmin/shared-host compatibility now. Do not assume a VPS exists.
- Do not provision or modify AWS resources in this remediation cycle. The AWS account is an option, not deployment authorization.
- When explicitly authorized by traction, official engagement or funding, prefer a minimal ECS-on-EC2 pilot with bounded capacity, private networking, budget alarms and the existing portable image/configuration contract. Keep Fargate as a later capacity/operations upgrade. No AWS-specific business logic.
- AeroBill alone owns billing, pricing, metering, invoices and payments. Mandatag alone owns licensing and entitlements. Product services consume those federated contracts.
- No production promotion, signed COR certificate, or public commercial readiness is implied by code commits or PR validation.

### Required next actions for Antigravity actors

1. Fetch both repositories and verify the exact branch heads above before editing.
2. Run the Ugondu focused B09/B10 verifier and full governance/build/CI/COR suites; capture output and workflow receipts against the new SHA.
3. Run the Dumcholu career-journey Maven module tests, controller security tests, full Maven reactor and exact-head portable-runtime/COR workflows.
4. Resolve the remaining tenant-claim trust contract and replace process-local discovery/guidance state with the approved durable persistence pattern; do not create a duplicate journey service.
5. Review every remaining STATIC Ugondu verifier (including B12-B16 and C22) against its objective; convert source-only checks to behavior/runtime tests where the objective requires behavior.
6. Reconcile the conflicting Nigeria-calibration and AWS gate statements in older records. Until independently verified, classify each as PENDING/UNQUALIFIED.
7. Preserve all open external gates: authorized physical staging, live non-production AeroBill/Mandatag transactions, backup/restore/rollback, Nigeria calibration where in scope, WebAuthn/FIDO2 ceremony, independent review and final authority signature.

**Overall posture remains `PARTIAL / RELEASE BLOCKED / NOT CERTIFIED`.**
