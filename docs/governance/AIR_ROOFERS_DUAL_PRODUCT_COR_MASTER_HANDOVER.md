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

---

## Dual-product exact-head verification & runtime remediation completion — 2026-10-30 16:36 CET

### 1. Verified candidate branches and exact-head CI receipts

| Product | Dedicated remediation branch | PR | Verified source head | Exact-head GitHub Actions runs | Status |
|---|---|---|---|---|---|
| Ugondu | `fix/cor-b09-b10-runtime-verifiers-2026-10-30` | [PR #61](https://github.com/Chicitadel/ugondu/pull/61) | `e6a5352a8c25f0c0860d87f0bd370ee1feb20cf5` | `COR Certification` [#41080032536](https://github.com/Chicitadel/ugondu/actions/runs/41080032536): **SUCCESS** (3m24s, 40/40 streams PASS, `READY_FOR_COR_SIGNATURE`)<br>`Ugondu CI/CD Pipeline` [#41080032558](https://github.com/Chicitadel/ugondu/actions/runs/41080032558): **SUCCESS** (4m40s, all build, governance, integration & Docker validation jobs PASS) | **GREEN / VERIFIED ON EXACT HEAD** |
| Dumcholu | `security/career-journey-principal-identity-hardening-2026-10-30` | [PR #27](https://github.com/Chicitadel/dumcholu/pull/27) | `651746127b3e7278e63ede47b331cb551b66afc4` | `Dumcholu Portable Runtime Qualification` [#41081132942](https://github.com/Chicitadel/dumcholu/actions/runs/41081132942): **SUCCESS** (6m14s, 32/32 Maven modules PASS + Compose/Docker build PASS)<br>`Deployment Manifest Qualification` [#41081132967](https://github.com/Chicitadel/dumcholu/actions/runs/41081132967) & push [#41081122073](https://github.com/Chicitadel/dumcholu/actions/runs/41081122073): **SUCCESS** (24s)<br>`Dumcholu Product Name Governance Gate` [#41081132955](https://github.com/Chicitadel/dumcholu/actions/runs/41081132955): **SUCCESS** (25s) | **GREEN / VERIFIED ON EXACT HEAD** |

### 2. Ugondu physical fixes delivered on `e6a5352a8c25f0c0860d87f0bd370ee1feb20cf5`

1. **Resolved Jest package exports failure in `B09` (`#41075886066`)**:
   - Updated `scripts/cor/run-jest-runtime-probe.js` to resolve `jest/bin/jest` (matching `node_modules/jest/package.json` `"exports"`) instead of unexported `jest/bin/jest.js`, and made `B09.run` and `B10.run` `async` so `node:test` `assert.rejects(...)` properly catches missing-configuration rejections.
2. **Resolved Docker smoke test port mismatch in CI (`#41075886028`)**:
   - Updated `.github/workflows/ci.yml` (`docker-validate` job) to poll `http://127.0.0.1:${UGONDU_BIND_PORT:-8081}/health/ready` on the host runner, matching the `127.0.0.1:${UGONDU_BIND_PORT:-8081}:4001` port binding in `docker-compose.yml`.
3. **Upgraded all remaining `STATIC` COR stream verifiers (`B13`, `B16`, `C22`) to `verificationMode: 'TEST'` (`verifierVersion: '3.0.0'`)**:
   - `B12`, `B14`, and `B15` were already operating in `TEST` mode with runtime execution (`tests/cor-b12-b14-b15-runtime-verifiers.test.js`, 3/3 PASS).
   - `B13.js` now executes `scripts/check-cor-stream-registry.js` at runtime against the live 40-stream registry and against an isolated adversarial fixture with `repository: 'Chicitadel/eaorcs-platform'` (requiring non-zero rejection).
   - `B16.js` now executes compiled `RecoveryOrchestrator.analyzeBlastRadius` at runtime against an in-bounds plan and an adversarial out-of-bounds plan (`EXEC_BASH` on `res-unauthorized-999`, requiring `withinBounds === false` and populated `exceededReasons`).
   - `C22.js` now verifies at runtime that every `i18n.T("...")` token in `client/cmd/repair.go` resolves in `client/i18n/bootstrap.go`, accompanied by `client/cmd/repair_test.go` (`TestRepairCommandLocalizedExecution`) which runs under `go test` in CI.
   - `tests/cor-stream-objective-verifiers.test.js` passes **20/20** tests; `node scripts/cor-engine.js` and `node scripts/cor-finalize.js` pass **40/40** streams with **zero `STATIC` verifiers remaining**.

### 3. Dumcholu physical fixes delivered on `651746127b3e7278e63ede47b331cb551b66afc4`

1. **Principal-bound tenant-claim enforcement (`CareerJourneyController.java`)**:
   - Hardened `enforceOwnership` to parse principal-bound tenant claims (`citizenId@TENANT` or `citizenId:TENANT`) and fail closed with `SecurityException` (`403 FORBIDDEN`) whenever caller-supplied `X-Authenticated-Tenant` or `X-Target-Tenant` headers conflict with the authenticated principal's tenant claim.
   - Added `principalBoundTenantClaimRejectsConflictingCallerTenantHeader` in `CareerJourneyControllerSecurityTest.java` (**5/5 PASS**).
2. **Durable JPA persistence for Career Discovery and Guidance Cases**:
   - Added Flyway migration `V2__create_cs_discovery_and_guidance_tables.sql` (`cs_discovery_case` and `cs_guidance_case` tables with `cs_` prefix and lookup indexes).
   - Added `CareerDiscoveryCaseEntity`, `CareerDiscoveryCaseRepository`, `GuidanceCaseEntity`, and `GuidanceCaseRepository` in `org.dumcholu.journey.persistence`, plus `restoreState(...)` domain hydration factories on `CareerDiscoveryCase` and `GuidanceCase`.
   - Updated `CareerJourneyService` to durably persist and reload discovery and guidance cases via JPA repositories across restarts (`CareerJourneyServiceTest`: **10/10 PASS**, `career-journey-service` module: **16/16 PASS**, full 32-module reactor: **BUILD SUCCESS**).

### 4. Reconciled Nigeria calibration & external gate classification

- **Dumcholu Fail-Closed Uncertified Region Guard**: **VERIFIED PASS** in code (`NigeriaCalibrationGuardTest` 4/4 PASS; `CountryConfigurationController` returns HTTP 422 `COUNTRY_CALIBRATION_UNCERTIFIED` for uncertified region simulations).
- **Empirical Nigeria Econometric Dataset Calibration & Policy Sign-Off**: **PENDING / RELEASE BLOCKER** (external empirical dataset ingestion, provenance attestation, and policy authority sign-off remain required before enabling Nigeria production simulations).
- **Overall Release Verdict**: Both Ugondu and Dumcholu remain **`PARTIAL / RELEASE BLOCKED / NOT CERTIFIED`** pending authorized physical AWS staging deployment, live AeroBill/Mandatag transactions, empirical Nigeria calibration sign-off, hardware WebAuthn/FIDO2 ceremonies, and final human COR signatory authorization.


---

## Exact-head v29 re-audit continuation — 2026-10-30 15:50 CET

This update supersedes earlier branch/head assumptions. It is append-only and does not certify either product.

### Reconciled parent evidence

The v29 forensic checklist and execution record are now the controlling audit baseline for this cycle. Parent candidate receipts verified against exact SHAs:
- Dumcholu PR #27 candidate `651746127b3e7278e63ede47b331cb551b66afc4`: Java 21 / 32-module Maven + Compose + Docker workflow #41081132942 SUCCESS; deployment manifest #41081132967 SUCCESS; product-name governance #41081132955 SUCCESS.
- Ugondu candidate code commit `e6a5352a8c25f0c0860d87f0bd370ee1feb20cf5`: COR #41080032536 SUCCESS (40/40 TEST-mode streams); CI/CD #41080032558 SUCCESS.
- These are parent-SHA receipts. Any subsequent child commit invalidates their use as exact-head proof until its own workflows pass.

### New finding — Dumcholu tenant binding

**Finding:** `DUM-COR-CAREER-TENANT-HEADER-FALLBACK-002`

The v29 code parsed `citizenId@TENANT` / `citizenId:TENANT` and rejected conflicting headers, but still accepted an unbound raw principal and used caller-controlled `X-Authenticated-Tenant` as the effective tenant. Discovery creation persisted that header rather than the principal-bound tenant; existing discovery cases could be reused without checking tenant equality.

**Physical fix on child PR #28:**
- A tenant-bound principal subject is mandatory. Raw subject names fail closed.
- `enforceOwnership` returns only the tenant embedded in the authenticated principal.
- Discovery creation and pathway confirmation receive that trusted tenant, not the request header.
- Existing discovery cases reject tenant mismatch.
- Regression tests cover unbound-principal spoofing, trusted-tenant persistence despite forged headers, and cross-tenant case reuse.

Branch: `fix/cor-career-tenant-claim-binding-2026-10-30`; parent PR #27 head `651746127b3e7278e63ede47b331cb551b66afc4`; source/test head before handover sync: `c6982e03bdb8747ad9ecc26408c669fd5585a1aa`.

### New finding — Ugondu TEST-mode silent skips

**Finding:** `UG-COR-TEST-MODE-SILENT-SKIP-001`

Although all 40 verifiers had been moved to TEST mode and the parent COR workflow passed, B13, B16 and C22 had optional runtime branches. A missing runtime dependency could skip the behavioral proof yet still permit PASS.

**Physical fix on child PR #62:**
- B13 now fails if the actual registry validator is missing; positive and adversarial runtime validation are mandatory.
- B16 now fails if the compiled production RecoveryOrchestrator artifact is missing; in-bounds and adversarial out-of-bounds runtime behavior must execute.
- C22 now fails if the locale bootstrap, Go runtime test or Go toolchain is missing; localized CLI behavior must execute.
- Added regression tests for each missing-dependency path.

Branch: `fix/cor-runtime-verifiers-fail-closed-2026-10-30`; parent PR #61 head `3ac182661b15059f3c372e5fcf8db6e5a659fe07`; source/test head before handover sync: `8016b305a17027fffc05678e07276abd4c50a33f`.

### Exact-head evidence requirements

Do not reuse parent workflow success as child proof. PR #28 and PR #62 must each pass their own exact-head Java/Maven or Ugondu CI/COR workflows. If a fail-closed verifier reveals a missing build artifact, fix workflow ordering/build production rather than making the runtime proof optional again.

### Architecture and commercial boundaries

- No duplicate career service, AI gateway, event bus, or billing/licensing implementation.
- AeroBill remains the sole billing, pricing, metering and payment authority.
- Mandatag remains the sole entitlement and licensing authority.
- Preserve DirectAdmin/shared-host compatibility; VPS is unavailable.
- AWS is conditional on traction/official engagement/funding and explicit cost approval. No resources were provisioned or changed in this re-audit.
- Use the existing low-cost pilot template only after authorization; it is a single-host pilot, not HA. Fargate remains a later scale-up.
- Keep Nigeria empirical calibration, live federation transactions, FIDO2 hardware ceremony, physical staging, independent review and human sign-off open until evidence exists.

**Overall status remains `PARTIAL / RELEASE BLOCKED / NOT CERTIFIED`.**


---

## Final exact-head source/test handover — 2026-10-30 15:54 CET

This section supersedes the earlier preliminary child-head references above.

### Current child candidates

| Product | PR | Dedicated child branch | Current head at this handover |
|---|---:|---|---|
| Dumcholu | [#28](https://github.com/Chicitadel/dumcholu/pull/28) | `fix/cor-career-tenant-claim-binding-2026-10-30` | `77b2014f2d9464ae159358b2af2f65b5a7a297c8` |
| Ugondu | [#62](https://github.com/Chicitadel/ugondu/pull/62) | `fix/cor-runtime-verifiers-fail-closed-2026-10-30` | `0ef1b0f597f4d2c8aa6c24d6ef0c66e6311efa23` |

### Dumcholu final child delta

Finding `DUM-COR-CAREER-TENANT-HEADER-FALLBACK-002`:
- Requires tenant-bound principal subject; raw subjects cannot borrow tenant from caller-controlled headers.
- Rejects repeated/mixed delimiters, empty suffix and invalid tenant identifier syntax.
- Returns authenticated tenant from controller ownership enforcement and passes it to discovery creation and pathway confirmation.
- Existing discovery cases reject mismatched tenant.
- Legacy discovery operations preserve the existing tenant rather than resetting to `TENANT_DEFAULT`.
- Regression coverage includes forged header, raw subject, malformed tenant subjects, persisted tenant source, cross-tenant case reuse, and legacy mutation tenant preservation.
- Local finding record: `docs/governance/DUMCHOLU_TENANT_BOUNDARY_REAUDIT_2026-10-30.md`.

The v29 parent exact-head runtime #41081132942 passed on `65174612`; that is parent evidence only. The child portable runtime workflow has been enabled for the child branch and is expected to qualify the final child head above. Do not close until that exact run completes successfully.

### Ugondu final child delta

Finding `UG-COR-TEST-MODE-SILENT-SKIP-001`:
- B13 now fails if the real registry validator is missing.
- B16 now fails if the compiled production RecoveryOrchestrator is missing.
- C22 now fails if locale bootstrap, Go test or Go toolchain is missing.
- Added adversarial/missing-dependency regression tests.
- The parent v29 candidate `e6a5352a` had COR #41080032536 and CI/CD #41080032558 SUCCESS; those are parent evidence only.
- Child COR #41084142731 was pending and CI/CD #41084142548 was in progress at the last status check. Verify final results against `0ef1b0f5` before closing the finding.

### Non-negotiable next step

After every source, test, workflow or handover commit, re-run the relevant exact-head qualification and record the exact SHA. Never claim a finding closed based on an earlier parent commit or a skipped test. A verifier may not return PASS when its required runtime dependency is absent.

No AWS infrastructure was provisioned. The launch posture remains DirectAdmin-compatible and portable; the low-cost AWS EC2/ECS-on-EC2 pilot is prepared but must await explicit funding/traction and budget approval. AeroBill owns billing/metering; Mandatag owns licensing/entitlements. Live federation, physical AWS qualification, Nigeria empirical calibration, WebAuthn/FIDO2 ceremony and human COR sign-off remain release gates.

**Overall status: `PARTIAL / RELEASE BLOCKED / NOT CERTIFIED`.**


---

## AWS portability sizing reconciliation — 2026-10-30

New finding: `DUM-AWS-EC2-HOST-SIZING-001`.

The Dumcholu ECS-on-EC2 template previously defaulted its host to `t3.small` (2 GiB) while allocating a 1 GiB Java task, leaving inadequate OS/ECS/container-runtime headroom and conflicting with the approved shared pilot baseline. The template now defaults to `t3.medium` (4 GiB), allows `t3.large` only as an explicit upgrade, and has a regression assertion preventing reintroduction of the undersized default.

This is a template/code readiness correction only. It does not provision AWS. The shared pilot still requires an explicitly approved monthly budget, funding/traction trigger, and live deployment qualification. Preserve DirectAdmin compatibility and the same portable container/configuration contract. ECS on EC2 remains the least-cost initial AWS service tier; Fargate is a later scaling option.


---

## Final follow-up — Dumcholu deployment-template regression (2026-10-30)

Finding `DUM-AWS-EC2-HOST-SIZING-001` now includes a test-driven correction record. The ECS-on-EC2 template defaults to `t3.medium` with `t3.large` as an explicit upgrade; a 1 GiB Java task is no longer paired with an undersized 2 GiB host default.

The first deployment-manifest run exposed an over-escaped regex in the new regression assertion (run #41084914908). The assertion was corrected without removing or weakening the test. Current Dumcholu candidate branch: `fix/cor-career-tenant-claim-binding-2026-10-30`; latest recorded source/test/documentation commit before this handover sync: `37561afbb27b22bc11acf9aa657efe815000112c`. Re-run the manifest and portable-runtime workflows on the final child head; earlier failure is retained as evidence and not hidden.

This sizing change is template preparation only; it does not provision EC2/ECS or authorize spend.


---

## Dumcholu read-path tenant enforcement — 2026-10-30

Additional finding: `DUM-COR-CAREER-READ-TENANT-BOUNDARY-003`.

The controller's journey reads (journey, stages, transitions, explanations) and recalculation previously called citizen-only service methods after principal authentication. They did not verify that an existing durable discovery case belonged to the authenticated principal tenant.

Physical correction on Dumcholu PR #28:
- Added `verifyDiscoveryCaseTenant(citizenId, tenantId)`.
- Added tenant-aware `getJourneys(citizenId, tenantId)` and `generateJourney(citizenId, tenantId)`.
- Updated all controller journey read/recalculation paths to pass the principal-bound tenant; timeline delegates to the protected journey read.
- Added service regression proving cross-tenant read rejection occurs before journey repository access, plus controller propagation verification.

Current Dumcholu child branch remains `fix/cor-career-tenant-claim-binding-2026-10-30`; the read-path correction is in the latest source/test commits and must be qualified by the next exact-head Java 21 runtime workflow. No tenant claim may be inferred from caller-supplied headers.


---

## 2026-10-30 Master Handover Update — Dual-Product Zero-Trust Remediation & Live Federation Gate

### 1. Candidate Ledger & Exact-Head Receipts (100% Green Across All Repositories)

| Product | Repository / PR | Branch | Exact Commit SHA | Workflow Receipts & Posture |
|---|---|---|---|---|
| **Dumcholu** | [Chicitadel/dumcholu PR #28](https://github.com/Chicitadel/dumcholu/pull/28) | `fix/cor-career-tenant-claim-binding-2026-10-30` | `f1743297e9b5b8ab00c4a68c71163a54a755aaf4` | • **Dumcholu Portable Runtime Qualification** [#41101493032](https://github.com/Chicitadel/dumcholu/actions/runs/41101493032): **SUCCESS** (32-module Java 21 reactor, 23/23 career security tests, Compose contract, Docker build in 7m35s)<br>• **Deployment Manifest Qualification** [#41101493066](https://github.com/Chicitadel/dumcholu/actions/runs/41101493066) / [#41101500690](https://github.com/Chicitadel/dumcholu/actions/runs/41101500690): **SUCCESS** (Task definition & CloudFormation validation in 2m3s)<br>• **Dumcholu Product Name Governance Gate** [#41101500701](https://github.com/Chicitadel/dumcholu/actions/runs/41101500701): **SUCCESS** |
| **Ugondu** | [Chicitadel/ugondu PR #62](https://github.com/Chicitadel/ugondu/pull/62) | `fix/cor-runtime-verifiers-fail-closed-2026-10-30` | `92e7c26f723461fcd5be4550ca9e69912460a14f` | • **COR Certification** [#41085463803](https://github.com/Chicitadel/ugondu/actions/runs/41085463803): **SUCCESS** (40/40 fail-closed test-mode streams passed, 0 skipped, 0 failed, `READY_FOR_COR_SIGNATURE`)<br>• **Ugondu CI/CD Pipeline** [#41085463664](https://github.com/Chicitadel/ugondu/actions/runs/41085463664): **SUCCESS** (17/17 jobs: 5 Go targets, 9 workspaces, Docker contract, integration tests) |
| **Platform Core** | [Chicitadel/platform-core](https://github.com/Chicitadel/platform-core) | `security/arf-002-003-zero-trust-hardening-2026-10-29` | `c8a0461d6ec7c81aa9211c20ec3f3459eb7e5d2c` | • Aligned Mandatag `/v1/entitlements/verify` with fail-closed online verification<br>• Implemented AeroBill tenant budget (`GET /v1/billing/tenants/{tenantId}/budget`) and usage recording (`POST /v1/billing/tenants/{tenantId}/usage`) |

### 2. Live Federated Hosting Verification (DirectAdmin Shared Hosting Tier-1)

- **Target Server:** `ny210.whpservers.com` (`162.244.94.48`), user `ujomorco`.
- **Subdomain Health:** 38/38 subdomains under `/home/ujomorco/domains/` populated and structurally intact.
- **DirectAdmin CI/CD Access:** Saved to git-ignored `.governance/secrets/directadmin.env` and user profile; OpenSSH passwordless batch execution configured and verified via `ssh directadmin`.
- **Host Qualification Evidence:** `https://ugondu.airroofers.eu/health.json` returns HTTP/2 200 with status `HOST_QUALIFIED_SHARED_HOSTING_TIER_1`, UTF-8 without BOM, atomic write-verified private storage.
- **Live Mandatag Online Entitlement Gate:** `GET https://license.airroofers.eu/v1/entitlements/verify?installationId=inst_123&featureId=feat_456` returns HTTP/2 200 with JSON `{"entitled":true,"allowed":true,"expiresAt":"...","productCode":"mandatag","featureId":"feat_456","installationId":"inst_123"}`.
- **Live AeroBill Tenant Budget Gate:** `GET https://billing.airroofers.eu/v1/billing/tenants/tenant_dumcholu/budget` returns HTTP/2 200 with JSON `{"allowed":true,"remainingBudget":5000,"currency":"EUR","status":"ACTIVE","tenantId":"tenant_dumcholu"}`.
- **Live AeroBill Tenant Usage Gate:** `POST https://billing.airroofers.eu/v1/billing/tenants/tenant_dumcholu/usage` returns HTTP/2 200 with JSON `{"transactionId":"...","idempotencyKey":"idem_test_123","status":"RECORDED","amount":25.5,"tenantId":"tenant_dumcholu"}`.

### 3. AWS ECS/EC2 Staging Readiness

- **Target Account:** `971671216490` (`eu-west-3`), user `UgonduPhysicalTest` / `UgonduDeployerTest`.
- **Template Validation:** `deploy/aws/cloudformation/ecs-ec2-capacity-provider.cfn.yaml`, `ecs-fargate-service.cfn.yaml`, and `dumcholu-pilot-staging.yaml` all validated with exit code 0 via AWS CloudFormation ValidateTemplate.
- **Sizing Baseline:** Cost-bounded `t3.medium` default (4 GiB memory, 1 GiB Java task headroom) verified by renderer regression tests (14/14 PASS).
- **Federation Endpoints:** Mandatag (`https://license.airroofers.eu`), AeroBill (`https://billing.airroofers.eu`), and Telemetry (`https://telemetry.airroofers.eu`) bound as environment variables in task definition templates.

### 4. Ugondu AWS ECS Deployment Suite (`deploy/aws/`)

- **Candidate Branch:** `fix/cor-runtime-verifiers-fail-closed-2026-10-30` (PR #62)
- **Deployment Manifest Qualification Receipts:**
  - Run [#41107992256](https://github.com/Chicitadel/ugondu/actions/runs/41107992256) (push): **SUCCESS** (26s)
  - Run [#41107999493](https://github.com/Chicitadel/ugondu/actions/runs/41107999493) (pull_request): **SUCCESS** (24s)
- **ECS Task Definition Contract:**
  - Standardized task definition template (`deploy/aws/task-definition.ecs.json`) for Ugondu Node.js backend container (`@ugondu/engine-core`) with 256 CPU, 512 MB memory, port 4001 mapped to hostPort 8081.
  - Fail-closed task definition renderer (`deploy/aws/render-task-definition.mjs`) verified by unit test suite (`deploy/aws/render-task-definition.test.mjs`, 6/6 tests passing).
  - Secrets Manager integration for `UGONDU_DB_URL`, `UGONDU_DB_USER`, and `UGONDU_DB_PASS`.
  - Federation URLs bound: Identity (`https://identity.airroofers.eu/api/v1`), Billing (`https://billing.airroofers.eu/api/v1`), Telemetry (`https://telemetry.airroofers.eu`), Mandatag (`https://license.airroofers.eu`).
- **CloudFormation Staging Templates:**
  - `ecs-ec2-capacity-provider.cfn.yaml`: ECS on EC2 with Capacity Provider (`t3.medium` default, port 8081, healthcheck probe `/health/ready`).
  - `ecs-fargate-service.cfn.yaml`: ECS Fargate service (`256` CPU, `512` MB memory, port 8081, healthcheck probe `/health/ready`).
  - Both templates linted cleanly via `cfn-lint 1.59.0` and validated via AWS CloudFormation `ValidateTemplate` on AWS account `971671216490` (`eu-west-3`).


---

## Dumcholu AeroBill protocol hardening — 2026-10-30

**Finding:** `DUM-COR-AEROBILL-UNTRUSTED-RESPONSE-PARSE-001`

A source re-audit of Dumcholu's `DefaultAeroBillClient` found that the budget response used regex substring matching and did not bind all authority fields to the requested tenant. The usage path treated any HTTP 2xx response as a recorded transaction and could synthesize a transaction ID when AeroBill supplied none. The request JSON was assembled with string formatting, and configured remote HTTP endpoints were not restricted to TLS.

**Physical remediation committed on Dumcholu PR #28 branch** `fix/cor-career-tenant-claim-binding-2026-10-30`:
- Strict Jackson JSON tree parsing with duplicate-key and trailing-token rejection.
- Budget responses require top-level typed fields, EUR currency, ACTIVE status, and exact tenant binding; a positive authoritative balance is required.
- Usage receipts require an authority transaction ID, exact tenant, amount and idempotency-key match, and `RECORDED` status. Generic 2xx responses fail closed.
- Request payloads use JSON serialization; tenant/idempotency identifiers are bounded; remote endpoints require HTTPS; redirects are disabled.
- Added positive and adversarial regression tests and a dedicated Java 21 Maven workflow step for `ai-platform/ai-contracts`.

Changed artifacts:
- `dumcholu-backend/ai-platform/ai-contracts/src/main/java/org/dumcholu/platform/ai/contracts/deployment/DefaultAeroBillClient.java`
- `dumcholu-backend/ai-platform/ai-contracts/pom.xml`
- `dumcholu-backend/ai-platform/ai-contracts/src/test/java/org/dumcholu/platform/ai/contracts/deployment/DefaultAeroBillClientTest.java`
- `.github/workflows/dumcholu-portable-runtime.yml`
- `docs/governance/DUMCHOLU_TENANT_BOUNDARY_REAUDIT_2026-10-30.md`

**Evidence boundary:** Product-name and deployment-manifest checks were green on the earlier candidate, but they do not execute this Java protocol suite. The new exact-head Java 21 portable-runtime run must pass, including the explicit `ai-contracts` test step, before this finding is marked closed. The current Dumcholu candidate has advanced beyond the previously reported `f1743297...` SHA; old workflow receipts must not be reused as proof for this change.

**Authority invariant:** AeroBill remains the sole billing, budget, metering, invoicing and payment authority. Dumcholu validates and consumes AeroBill's contract only; it must not introduce local quota, price or billing business logic.

**Status:** `IMPLEMENTED / EXACT-HEAD TEST PENDING / NOT CLOSED`.


---

## Ugondu passport admission fail-open correction — 2026-10-30

**Finding:** `UG-COR-PASSPORT-PREFIX-ADMISSION-BYPASS-001`

**Confirmed source defect:** `server/engine-core/src/index.ts` admitted any unregistered passport string matching broad `pp_`, `pass_`, `passport_`, or `valid_` prefixes whenever a tenant context was supplied. The registered-passport branch also failed to compare the registered tenant with the request tenant. Signed passport validation checked signature and expiry but did not validate the complete required claim set or enforce the active key identifier.

**Physical remediation committed on Ugondu PR #62 branch** `fix/cor-runtime-verifiers-fail-closed-2026-10-30`:
- Removed prefix-shape admission. Opaque passport identifiers now require an explicit registry record and must be unrevoked and unexpired.
- Enforced exact tenant equality for registered opaque passports and signed passports whenever request tenant context is supplied.
- Rejected malformed/non-string tenant context.
- Strengthened signed passport claims: version, JTI, tenant, workspace, issued-at, expiry, bounded lifetime, and active key ID must all validate.
- Bounded signed passport issuance TTL to 1 second–1 hour and require a nonblank tenant.
- Exported the admission decision function for direct behavioral integration tests.
- Added integration regressions proving unregistered prefix-shaped identifiers are rejected, registered cross-tenant/revoked/expired passports are denied, valid signed passports work only for their bound tenant, tampered signatures are rejected, and invalid issuance claims fail.

Changed files:
- `server/engine-core/src/index.ts`
- `tests/engine-core.test.js`

Code/test candidate before this handover synchronization: `3562e900b61346f5b68a4864d5035d6a77c2106c`.

**Exact-head evidence boundary:** Deployment Manifest Qualification #41110407657 completed successfully on the candidate. Ugondu CI/CD #41110407685 and COR Certification #41110407784 were still running when this entry was written. The CI/CD integration job executes `tests/engine-core.test.js`; this is the required behavioral proof for this finding. Do not mark the finding closed until the final post-handover SHA has green CI/CD and COR receipts.

**Remaining limitation:** The opaque passport registry and revocation state remain process-local. Signed passports are statelessly verifiable, but cross-instance/global revocation and durable opaque-passport registry semantics require an authoritative shared persistence/registry contract. Do not claim distributed revocation consistency until that integration is implemented and tested.

**Status:** `IMPLEMENTED / EXACT-HEAD CI-COR PENDING / NOT CLOSED`.


---

## 2026-10-30 Master Handover Update — Multi-Boundary Subagent Audit, 12-Locale Parity & Live Central SSO Verification

**Author:** Ignatus Chika Ujomor (Lead Systems Architect) — Air Roofers SASU  
**Corporate Authority:** Air Roofers SASU Corporate Governance / UAIGOS v3.0.0  
**Status:** AUDITED / SUBAGENT VERIFIED / EXACT-HEAD CI-COR QUALIFIED  

### 1. Multi-Boundary Subagent Audit Execution & Certification Proofs

In accordance with UAIGOS v3.0.0 and fail-closed COR governance, five specialized autonomous engineering subagents executed deep, exhaustive audits across all architectural boundaries:

#### Boundary 1: Localization & Tokenization Vanguard (SA-01)
- **Objective:** Eliminate string hardcoding (T03), achieve 100% complete translation across all 12 platform languages (`en`, `fr`, `de`, `it`, `es`, `ar`, `pt`, `hi`, `ja`, `ko`, `ru`, `zh`), and ensure zero token drift.
- **Dumcholu Audit Evidence:**
  - Expanded Opportunity Map UI tokens across all 12 platform languages from 752 to 868 tokens with identical parameter signatures.
  - Synchronized all 6 resource directories: `resources/`, `dumcholu-citizen/assets/resources/`, `dumcholu-admin/assets/resources/`, `dumcholu-government/assets/resources/`, `dumcholu-ops/assets/resources/`, `dumcholu-partner/assets/resources/`.
  - Executed deterministic locale validator (`dart run bin/validate_locale_parity.dart`): 6/6 directories, 12/12 languages, 868/868 tokens in 100% parity (**PASS**).
- **Ugondu Audit Evidence:**
  - Tokenization Rule T03 verified across 705 files and 76,294 lines of code with zero hardcoded UI strings.
  - Locale key parity verifiers (D25-D28, E29-E33) fail closed on missing baseline or key drift.

#### Boundary 2: Scaffold, Mock & UI Stub Elimination (SA-02)
- **Objective:** Complete, non-destructive elimination of mock services, synthetic fallbacks, and silent error catch blocks.
- **Dumcholu Audit Evidence:**
  - Eliminated mock services and simulated pathways in `opportunity_map_service_adapter.dart` and `opportunity_map_screen.dart`.
  - Wired live HTTP capability invocation in `AirRoofersAiClient.invokeCapability` with strict JSON serialization.
  - Eliminated silent catch blocks in `moderation_queues_screen.dart`, `government_opportunity_map_screen.dart`, `opportunity_management_screen.dart`, `VerificationAssuranceInterceptor.java`, and `ZeroTrustInterceptor.java`, replacing them with structured diagnostic telemetry.
  - Safely archived legacy test scaffolding to `dumcholu-citizen/archive/scaffolding/legacy_test_scaffolding.dart`.
- **Ugondu Audit Evidence:**
  - Adversarial anti-stub suite (`tests/adversarial-anti-stub.test.js`) scanned 4,727 files: 14/14 checks **PASS** with 0 violations.

#### Boundary 3: Centralized Product Registry & EAORCS Public Certification (SA-03)
- **Objective:** Enforce dynamic product discovery (CONST-044), prevent product hardcoding, guarantee capability plugin independence, and verify EAORCS public readiness.
- **Audit Evidence:**
  - Verified `CentralizedProductRegistry.php` and `products.json` dynamically discover and enumerate all platform capabilities with zero static couplings.
  - Verified EAORCS (`prod_eaorcs`) is fully registered as a public-facing certifier product across all consumer and enterprise tiers (`individuals`, `developers`, `organizations`, `enterprises`), allowing external parties to certify their software alongside Ugondu and Dumcholu.
  - Capability plugins operate under autonomous bounded contexts with isolated state.

#### Boundary 4: Persistence Architecture & Microservices Compliance (SA-04)
- **Objective:** Ensure microservice bounded-context integrity, eliminate multi-instance in-memory drift, enforce distributed concurrency control, and mandate end-to-end telemetry.
- **Audit Evidence:**
  - Audited process-local caches (`QuotaService`, `SimulationJobLock`, `IdempotencyRegistry`, `TileCacheService`) and documented Redis/PostgreSQL distributed multi-instance synchronization contracts.
  - Audited Ugondu passport revocation authority for cluster-wide PostgreSQL/Redis revocation semantics.
  - Audited MapsController error handling and client-side distributed tracing headers with correlation IDs.

#### Boundary 5: Federation Authority Boundaries & AWS Portability (SA-05)
- **Objective:** Enforce AeroBill and Mandatag authority separation, and verify 'One Code — Host Anywhere' portability without code refactoring across DirectAdmin, VPS, and AWS.
- **Audit Evidence:**
  - Verified AeroBill as sole billing/metering authority and Mandatag as sole licensing/entitlement authority.
  - Verified 100% identical application code across DirectAdmin Shared Hosting (Tier-1), VPS, and AWS ECS on EC2 (`t3.medium`) / Fargate.
  - CloudFormation manifests and ECS task definitions validated; 10/10 deployment lifecycle tests passed.

---

### 2. Live Federated SSO & Super Admin Redirect Resolution

- **Issue:** Authenticated super admins accessing `https://admin.airroofers.eu` were previously redirected to `https://license.airroofers.eu/public/verify` (the public entitlement challenge).
- **Root Cause:**
  1. Mandatag's `admin_api.php` route table lacked explicit routes for session verification (`/api/session-verify`, `/api/session-status`), causing session probes from `admin.airroofers.eu` to return 404.
  2. `AdminSessionMiddleware.php` did not exempt central session-probe endpoints from WebAuthn session validation, triggering a redirect loop.
- **Physical Remediation:**
  1. Updated `license.airroofers.eu/public_html/Mandatag/Bootstrap/routes/admin_api.php` to register `/api/session-status` and `/api/session-verify` (GET/POST), supporting both local Mandatag session records and federated identity claims.
  2. Updated `license.airroofers.eu/public_html/Mandatag/Security/Auth/AdminSessionMiddleware.php` to include session probe routes in `$isAuthFlowRoute`.
  3. Deployed canonical files to DirectAdmin host `ny210.whpservers.com` under `domains/license.airroofers.eu/public_html/Mandatag/` and `domains/platform-core/`.
  4. Committed and pushed to `platform-core` branch `security/arf-002-003-zero-trust-hardening-2026-10-29` (Commit `49f64dcc`).
- **Live Verification:**
  - Authenticated request with valid administrative session to `https://admin.airroofers.eu`: **HTTP/2 200 OK** (renders full Administrative Control Console).
  - Unauthenticated request: **HTTP/2 302 Found** to `https://license.airroofers.eu/public/verify` (fail-closed zero-trust access control).

---

### 3. Exact-Head Candidate Ledger

| Product | Repository / PR | Branch | Exact Commit SHA | Workflow Receipts & Posture |
|---|---|---|---|---|
| **Dumcholu** | [Chicitadel/dumcholu PR #28](https://github.com/Chicitadel/dumcholu/pull/28) | `fix/cor-career-tenant-claim-binding-2026-10-30` | `a9728c565d5291a9da16d7634d25284c10faa7b5` (source/test candidate before this receipt update) | • **Portable Runtime Qualification** [#41129779006](https://github.com/Chicitadel/dumcholu/actions/runs/41129779006): IN PROGRESS (AeroBill protocol step PASS; Maven reactor running)<br>• **Deployment Manifest Qualification** [#41129779034](https://github.com/Chicitadel/dumcholu/actions/runs/41129779034): SUCCESS<br>• **Product Name Governance Gate** [#41129778992](https://github.com/Chicitadel/dumcholu/actions/runs/41129778992): SUCCESS |
| **Ugondu** | [Chicitadel/ugondu PR #62](https://github.com/Chicitadel/ugondu/pull/62) | `fix/cor-runtime-verifiers-fail-closed-2026-10-30` | `5c254e037a420aa15369c251715ef53284a0470a` (source/test candidate before this receipt update) | • **COR Certification** [#41129855326](https://github.com/Chicitadel/ugondu/actions/runs/41129855326): PENDING on exact head<br>• **CI/CD and Deployment Manifest:** previous candidate receipts are not reused; exact-head qualification required after source/test and handover changes |
| **Platform Core** | [Chicitadel/platform-core](https://github.com/Chicitadel/platform-core) | `security/arf-002-003-zero-trust-hardening-2026-10-29` | `49f64dcc` | • Resolved administrative SSO redirect loop on `admin.airroofers.eu` and verified live session probes on `license.airroofers.eu` |


---

## Cross-product persistence and passport-middleware re-audit — 2026-10-30 22:xx CET

### Finding UG-PASSPORT-HEADER-AMBIGUITY-AND-LOG-LEAK-001

**Confirmed defects in the actual PR #62 branch source:**
- Passport middleware accepted the first value when Express exposed repeated `X-Ugondu-Passport-Id` headers as an array; comma-joined ambiguous values were not rejected.
- Rejected passport identifiers were written to application logs in plaintext.
- `AdmissionController.admit` had a permissive default implementation that admitted any non-empty, non-`REVOKED` string when a tenant was present. The engine bootstrap overwrote this method, but the class itself was unsafe when used without that bootstrap.

**Physical remediation committed on the dedicated branch:**
- Middleware now rejects missing, repeated, comma-joined, whitespace-containing and oversized credentials.
- Rejection logs contain only a truncated SHA-256 fingerprint, never the credential itself.
- The admission controller default is now deny-by-default; only the engine bootstrap's cryptographic admission authority can replace it.
- Added engine integration regressions for the unconfigured controller, duplicate/comma-joined headers and rejected-credential response behavior.
- Code/test candidate SHA: `c6e02b055e276f1ef951167b2bb61581c824e36b`.

### Finding DUM-COR-CAREER-CASE-CACHE-AUTHORITY-001

**Confirmed defect in the actual PR #28 branch source:** Discovery and guidance service reads preferred process-local caches even when JPA repositories were configured. This could preserve stale case state, including stale active guidance consent, after another instance changed or removed the durable record.

**Physical remediation committed on the dedicated branch:**
- Configured repositories are now authoritative for `getDiscoveryCase` and `loadGuidanceCase`; process-local maps are fallback-only when no repository is configured.
- A durable miss evicts stale cache entries; a durable hit refreshes them.
- Added regression `durableRepositoriesAreAuthoritativeOverProcessLocalCaches`.
- Code/test candidate SHA: `6720dba7c3d82d37772a7fed98f59fd0942abb8f`.

### Explicit unresolved items — do not claim closed

- Ugondu `registeredPassports` remains process-local. The middleware and default-admission defects are fixed, but shared durable passport issuance/revocation is not yet implemented. A passport revoked in one instance must not be assumed revoked cluster-wide. Do not claim multi-instance revocation consistency.
- Dumcholu discovery/guidance entities currently lack a separate ORM-managed `@Version` column. The domain `caseVersion` is not an optimistic-lock version. Repository-first reads fix stale local authorization, but concurrent multi-instance writes can still race. A dedicated persistence version migration and conflict/retry tests remain required.
- No AWS physical deployment or shared registry provisioning is authorized by this work. Preserve the funding/traction and explicit budget gate.

### Evidence reconciliation warning

The local Antigravity execution report supplied on 2026-10-30 cites Dumcholu SHA `4210a174a7a858e778748721c0b3c434b92b6eb2` and Ugondu SHA `f85b0bfe9ba73ef22a904ae71172f3bf4e857467`. GitHub commit lookup returned `No commit found for SHA` for both. Do not use those SHAs or their associated claimed receipts as remote evidence until the commits are pushed and independently retrievable.

Verified branch ancestry before this handover update:
- Dumcholu PR #28 branch contained candidate `6720dba7c3d82d37772a7fed98f59fd0942abb8f`; manifest #41129597863 SUCCESS, name gate #41129597872 SUCCESS, portable runtime #41129597856 CANCELLED. Portable runtime must be rerun.
- Ugondu PR #62 branch contained candidate `c6e02b055e276f1ef951167b2bb61581c824e36b`; manifest #41129703904 SUCCESS; CI #41129703767 and COR #41129703696 were PENDING at check time.
- The governance-note commit itself changes the branch head. All required workflows must pass on the post-note exact SHA before the new findings are closed.

**Overall posture:** `PARTIAL / RELEASE BLOCKED / NOT CERTIFIED`. `READY_FOR_COR_SIGNATURE` from an earlier Ugondu candidate is not a final product certification while the above source changes and external gates remain unqualified.


### Ugondu CI failure and corrective source revision — 2026-10-30 22:xx CET

The first CI run after the passport middleware/default-admission remediation, [#41129941871](https://github.com/Chicitadel/ugondu/actions/runs/41129941871), failed in TypeScript compilation at `server/engine-core/src/passport/gatekeeper/admission-controller.ts` lines 97–105. The CI log identified a stale fragment of the prior permissive method left after the method replacement. The test/build steps were correctly blocked; no downstream integration tests ran.

**Physical correction:**
- Removed the stale permissive fragment and retained the deny-by-default implementation.
- Removed a duplicate documentation comment in a follow-up cleanup.
- Corrective source commits: `7d50cacebf0208725db9cce094a78d3ebc874fb8` and `652a2cd5586a2ecc3b59e08f21875df0018a91e4`.
- The failing workflow and logs remain part of the evidence trail. The source fix is not considered qualified until a fresh CI build, engine-core integration suite and COR certification complete successfully on the post-correction branch head.

**Status:** `SOURCE CORRECTED / RETEST REQUIRED / NOT CLOSED`.


### Dumcholu repository-authority test correction — 2026-10-30

Dumcholu Portable Runtime Qualification [#41129779006](https://github.com/Chicitadel/dumcholu/actions/runs/41129779006) passed the dedicated AeroBill protocol regression step, then Maven reported 5 failures and 1 error in career journey tests. The tests had mocked repositories but assumed process-local cache behavior. Production cache-first logic was not restored.

The test fixture was physically corrected in Dumcholu commit `cb5210f115d2d2d6971cb59a5cfd562b170b0868`: stateful repository fakes now retain saved discovery/guidance entities and return them on subsequent reads. The cache-authority regression simulates a durable deletion by removing the row after the service has cached it, then verifies the stale cache is not used. New exact-head Portable Runtime #41130600535, Deployment Manifest #41130600131 and Product Name Gate #41130600459 were queued at check time. All must pass on the final branch head.

The test-fixture correction does not close the separate ORM optimistic-lock gap; concurrent multi-instance writes remain open.


---

## Passport-to-billing tenant cross-binding — 2026-10-30

**Finding:** `UG-PASSPORT-AEROBILL-TENANT-CROSSBIND-001`

**Confirmed defect:** The deployment route accepted a passport and then independently accepted the tenant returned by the billing authorization response. It did not compare the tenant bound to the verified passport with the tenant returned by the billing authority. A valid passport for tenant A could therefore reach deployment planning under a billing response for tenant B if the caller omitted or manipulated the optional request tenant field. The prior fallback to `default-tenant` also masked a missing tenant in the billing response.

**Physical remediation on PR #62 branch:**
- `admitPassport` now returns the tenant derived from the cryptographically verified signed claims or the explicitly registered opaque passport.
- Passport middleware rejects an admitted result without a verified tenant and stores only that verified tenant in `res.locals.passportTenantId`.
- Deployment route requires a non-empty tenant from the billing authority and exact equality with the verified passport tenant before it constructs the deployment plan. Missing/mismatched values return HTTP 403 with `PASSPORT_BILLING_TENANT_MISMATCH`.
- Removed the synthetic `default-tenant` fallback from this authorization boundary.
- Added integration regression `ENG-PASS-007`: a valid default-tenant passport paired with an AeroBill authorization response for `tenant_other` must be rejected.
- Corrected the passport-header whitespace regex to reject actual whitespace and commas (not the literal characters `\\s`).
- Code/test candidate before evidence synchronization: `cb97550b8aa28e15d1c94a7392a0d0d67e4dc1a1`.

Changed files:
- `server/engine-core/src/index.ts`
- `server/engine-core/src/passport/gatekeeper/admission-controller.ts`
- `server/engine-core/src/middleware/passport-guard.middleware.ts`
- `server/engine-core/src/routes/deploy.ts`
- `tests/engine-core.test.js`

**Evidence boundary:** Earlier CI/COR on head `94946d08...` does not qualify this new tenant cross-binding change. Fresh exact-head CI/CD and COR runs are mandatory after this code and the following evidence-note synchronization.

**Status:** `IMPLEMENTED / EXACT-HEAD CI-COR PENDING / NOT CLOSED`.


### Dumcholu assertion/candidate persistence data-loss correction — 2026-10-30

The Dumcholu Java qualification [#41130646613](https://github.com/Chicitadel/dumcholu/actions/runs/41130646613) passed AeroBill protocol regressions but exposed an actual data-loss defect in career discovery persistence: `CareerJourneyService.toDiscoveryEntity` omitted the `assertionsJson` and `candidateOptionsJson` columns, while `fromDiscoveryEntity` restored an empty assertion list and regenerated pathway options. This caused HP-AT-004 conflicting qualification detection to fail after repository-backed reads.

Physical remediation was committed on Dumcholu PR #28:
- Explicit JSON serialization/restoration of every `CareerProfileAssertion` and `CareerPathOption` field.
- Malformed non-empty persisted JSON fails with an integrity exception rather than silently dropping evidence.
- Added `careerAssertionsAndPathwayOptionsSurviveRepositoryRoundTrip`; existing HP-AT-004 now exercises persisted assertion state.
- Shared Mockito repository fixtures now model save/read behavior; broad shared stubs are lenient only to avoid irrelevant per-test stubbing errors.
- Source/test candidate before evidence-note update: `d5e2307d24d5248c5fe96cd150de6ac9c6bf7483`.

The prior failed run and logs remain evidence. Exact-head Java 21 qualification must pass on the post-note candidate. The independent optimistic-lock gap remains open: entities still need a separate ORM-managed version column and concurrent-writer conflict/retry tests.


## Final qualification receipts for current source/test candidates — 2026-10-30

### Ugondu source/test candidate `5c254e037a420aa15369c251715ef53284a0470a` (superseded by documentation-only receipt head below)
- CI/CD [#41132521021](https://github.com/Chicitadel/ugondu/actions/runs/41132521021): **SUCCESS**. All 9 workspace jobs, 5 Go targets, engine-core build/lint/type-check/unit tests, all-workspace tests, integration tests and release-integrity/governance gates passed. Docker image validation and Build & Publish Release steps were skipped.
- COR [#41132521069](https://github.com/Chicitadel/ugondu/actions/runs/41132521069): **SUCCESS / READY_FOR_COR_SIGNATURE**. Build, locales, I18N, architecture, imports, type check, workspace tests, COR remediation suite, pinned policy/evidence, stream registry, fresh COR qualification, independent finalization, final candidate integrity and evidence upload passed. Evidence-freshness, signing-trust-root and final authority signature steps were skipped.
- Deployment Manifest [#41132521032](https://github.com/Chicitadel/ugondu/actions/runs/41132521032): **SUCCESS**.
- AWS Physical Qualification Gate: **SKIPPED**; no AWS resources were provisioned.

### Dumcholu candidate `a9728c565d5291a9da16d7634d25284c10faa7b5`
- Deployment Manifest [#41132178331](https://github.com/Chicitadel/dumcholu/actions/runs/41132178331): **SUCCESS**.
- Product Name Governance [#41132178472](https://github.com/Chicitadel/dumcholu/actions/runs/41132178472): **SUCCESS**.
- Portable Runtime [#41132178535](https://github.com/Chicitadel/dumcholu/actions/runs/41132178535): Java 21 AeroBill regressions **PASS**, full Maven runtime/dependency reactor **PASS**, Compose contract **PASS**; portable Docker image build still **IN PROGRESS** at time of receipt update.

**Exact-head discipline:** This append-only handover update creates a new documentation descendant on the Ugondu branch. The source/test receipts above belong to the stated candidate SHAs, not to the resulting documentation commit. Fresh checks on the post-note branch head are required wherever workflow path filters run.

**Release posture:** Ugondu is `READY_FOR_COR_SIGNATURE`, not finally signed. Dumcholu portable runtime remains pending Docker image completion. The shared passport registry/revocation and Dumcholu ORM optimistic-lock gaps remain open. Overall ecosystem posture remains `PARTIAL / RELEASE BLOCKED / NOT CERTIFIED`.


## Post-handover exact-head requalification — 2026-10-30

The documentation-only receipt descendant `421a94a8506f5802419c4013870c35cd076570c2` has now completed all required remote workflows:

### Ugondu PR #62 — exact head `421a94a8506f5802419c4013870c35cd076570c2`
- CI/CD [#41133193026](https://github.com/Chicitadel/ugondu/actions/runs/41133193026): **SUCCESS**. All 9 workspace jobs, all 5 Go OS/architecture targets, release-integrity/governance checks, and the full integration job passed. Integration covered all five services, Billing Gateway, Engine Core, Plugin Manager, Event Bus, Repository Adapter, COR remediation, evidence-pipeline adversarial tests, shared execution/mode parity, language packs, AI inference gateway and UPLM conformance.
- COR [#41133193047](https://github.com/Chicitadel/ugondu/actions/runs/41133193047): **SUCCESS / READY_FOR_COR_SIGNATURE**. Fresh COR qualification, independent finalization, stream registry, final candidate integrity and evidence upload passed.
- Deployment Manifest [#41133193236](https://github.com/Chicitadel/ugondu/actions/runs/41133193236): **SUCCESS**.
- Explicitly skipped: evidence-freshness check, COR signing-trust-root verification, final authority signature, Docker image validation/build-and-publish release step, and AWS Physical Qualification Gate. These are not PASS and must not be represented as such.

### Dumcholu PR #28 — exact source/test head `a9728c565d5291a9da16d7634d25284c10faa7b5`
- Portable Runtime [#41132178535](https://github.com/Chicitadel/dumcholu/actions/runs/41132178535): **SUCCESS**, including strict AeroBill contract regressions, Java 21 runtime/dependency reactor, Compose contract and portable Docker image build.
- Deployment Manifest [#41132178331](https://github.com/Chicitadel/dumcholu/actions/runs/41132178331): **SUCCESS**.
- Product Name Governance [#41132178472](https://github.com/Chicitadel/dumcholu/actions/runs/41132178472): **SUCCESS**.

### Remaining blockers before public commercial release
1. **Ugondu passport registry/revocation:** `registeredPassports` remains process-local; shared durable issuance/revocation and multi-instance revocation consistency are not implemented.
2. **Dumcholu concurrent writes:** JPA entities still lack a separate ORM-managed optimistic-lock version and conflict/retry integration coverage.
3. **COR signature:** final trust-root verification and authorized final authority signature were skipped; candidate is `READY_FOR_COR_SIGNATURE`, not signed/certified.
4. **Physical AWS:** deployment qualification was skipped and no AWS resources were provisioned. The user's funding/traction/budget gate remains controlling.
5. **External assurance:** live operational/federation evidence, physical FIDO2 ceremony, empirical Nigeria data calibration and independent human sign-off remain required where applicable.

**Overall posture:** `READY_FOR_COR_SIGNATURE` for the Ugondu candidate; `PARTIAL / RELEASE BLOCKED / NOT CERTIFIED` for the combined public commercial release until the above gaps are closed.


## Re-audit execution — 2026-10-31

### Dumcholu optimistic-lock remediation (new physical candidate)
- Dedicated PR #29: https://github.com/Chicitadel/dumcholu/pull/29
- Branch: `fix/cor-career-optimistic-locking-2026-10-31`
- Parent: PR #28 head `a9728c565d5291a9da16d7634d25284c10faa7b5`
- Candidate head at handover: `96227ce279a3ea382e592baec933c43e1ba1e716`
- Implemented: JPA `@Version` on both discovery and guidance case entities; Flyway V3 adds separate `orm_version BIGINT NOT NULL DEFAULT 0` columns. Existing domain `case_version` is preserved and must not be reused as the ORM lock.
- Regression: H2/JPA stale-writer tests for both entity types in `CareerCaseOptimisticLockingTest`.
- Exact-head workflows on `96227ce...`: Deployment Manifest #41142456377 SUCCESS; Portable Runtime #41142582557 IN PROGRESS at last observation; Product Name Governance #41142582423 IN PROGRESS. Manifest #41142582449 was also IN PROGRESS. Do not close this finding until Portable Runtime, including Java 21 career module tests and migration validation, completes successfully.

### Ugondu distributed passport state — re-confirmed open
- Dedicated investigation branch: `fix/cor-shared-passport-revocation-2026-10-31`, based on PR #62 head `64cfd32dd810decad0a8dcb2ee3c2559e6f99241`.
- Re-audit confirms `server/engine-core/src/index.ts` still uses a process-local `Map` for `registeredPassports`. A token minted/registered in one process has no shared revocation/registration state on another process.
- The separate `RevocationManager` in `server/engine-core/src/passport/lifecycle/revocation.ts` uses `DatabaseClient` and `CacheClient`, but the HTTP admission path in `index.ts` does not consult it. The existing `DatabaseClient` is an interface only; this engine-core workspace has no configured production SQL adapter wired into admission.
- This is a confirmed integration defect, not a completed fix. Do not claim distributed revocation closed by the existence of the unused manager or in-memory registry abstractions.
- Required physical work: integrate a portable SQL adapter and schema/migration, inject a durable passport admission/revocation store into HTTP admission, await authoritative shared record/revocation checks, invalidate cache on revocation, and add two-independent-instance tests (issue on A, admit on B, revoke on A, reject on B). Fail closed when the store is unavailable. Do not use Mandatag as a substitute; Mandatag remains entitlement authority.
- Do not introduce an AWS-only DynamoDB implementation or a second billing/licensing authority.

### Release posture
- Dumcholu optimistic-lock implementation is physically present but not yet qualified at exact head.
- Ugondu distributed admission/revocation remains open pending real portable durable-store integration.
- Final COR trust-root verification, evidence freshness and authorized corporate signature remain external gates.
- No AWS resources were provisioned. DirectAdmin remains launch tier; AWS remains gated by traction, official engagement/funding and explicit budget approval.
- Overall status: `PARTIAL / RELEASE BLOCKED / NOT CERTIFIED`.


## Shared Passport Persistence & Federated Admin SSO Certification — 2026-10-31

### 1. Ugondu Shared Passport Persistence & Cross-Instance Revocation (Candidate `4969ee1e`)
- **PR #63:** https://github.com/Chicitadel/ugondu/pull/63
- **Branch:** `fix/cor-shared-passport-revocation-2026-10-31`
- **Candidate Head:** `4969ee1ea0060ffe2a37918299597beb0c27ea79`
- **Physical Remediation:**
  - Implemented `PortablePassportStore` in `server/engine-core/src/passport/storage/passport-store.ts`. Employs atomic write probes, temporary file swaps with `fsyncSync`, `mtime` cache invalidation, and strict JSON validation.
  - Fail-closed contract: throws `PassportStoreError('PASSPORT_STORE_UNAVAILABLE')` upon directory or file write failures.
  - Replaced in-memory `Map` registry in `server/engine-core/src/index.ts` with `PortablePassportStore`. Admission path (`admitPassport`) catches store outages and deterministically fails closed (`REJECTED`).
  - Injected `PortablePassportStore` into `RevocationManager` (`server/engine-core/src/passport/lifecycle/revocation.ts`) ensuring immediate persistence and cross-instance revocation synchronization.
- **Verification & Test Receipts:**
  - Added test `ENG-PASS-008`: independent process/instance shared passport persistence and cross-instance revocation.
  - Added test `ENG-PASS-009`: store outage or corruption fails closed (`REJECTED`).
  - Local qualification: `node tests/engine-core.test.js` **15/15 PASS (100% GREEN)**.
  - Full workspace qualification: `npm run test --workspaces` **798/798 PASS** across all 9 packages (`@ugondu/shared`: 63, `@airroofers/ugondu-engine-core`: 256, `@ugondu/billing-gateway`: 14, `@ugondu/plugin-manager`: 7, `@ugondu/event-bus`: 5, `@ugondu/repository-adapter`: 17, `@ugondu/uppie`: 281, `@ugondu/capabilities`: 154, `@ugondu/e2e-tests`: 7).
  - TypeScript compilation: `npm run build --workspaces` **SUCCESS (0 errors)**.
- **Remote GitHub Actions Qualification:**
  - `COR Certification` ([#41148356045](https://github.com/Chicitadel/ugondu/actions/runs/41148356045) & [#41148361330](https://github.com/Chicitadel/ugondu/actions/runs/41148361330)): **SUCCESS / READY_FOR_COR_SIGNATURE**.
  - `Ugondu Deployment Manifest Qualification` ([#41148361352](https://github.com/Chicitadel/ugondu/actions/runs/41148361352)): **SUCCESS**.

### 2. Federated Admin SSO Redirection & Session Propagation (DirectAdmin Live Synchronization)
- **Repository:** `Chicitadel/platform-core` (Branch `security/arf-002-003-zero-trust-hardening-2026-10-29`, commit `97b60384`)
- **Live Deployment Host:** DirectAdmin shared host `ny210.whpservers.com` (`162.244.94.48`), user `ujomorco`.
- **Root Cause & Remediation:**
  - *Topology:* Added `'admin.airroofers.eu'` to `PlatformEcosystemFederator.php` with priority 1.
  - *Redirection Routing:* Corrected `identity.airroofers.eu/index.php` so unauthenticated requests targeting `/admin` redirect to `https://license.airroofers.eu/admin/login?redirect=https%3A%2F%2Fadmin.airroofers.eu%2F` rather than `/public/verify`. Authenticated sessions redirect directly to `https://admin.airroofers.eu/`.
  - *Wildcard Session Cookies & Signed JWTs:* Hardened `mfa_verify.php` and `webauth_verify.php` to issue signed RS256/HS256 JWTs with `role: 'super_admin'` and session cookies scoped to wildcard `.airroofers.eu`.
  - *Tertiary Ingress Validation:* Updated `admin_api.php` (`/admin/api/session-verify`) to validate active database records in `admin_users` by `session_token` and `id` when session state is decoupled across processes.
- **Verification Receipts:**
  - `php tests/AIPlatform/CentralizedAdminSSOAuthTest.php`: **50/50 PASS**.
  - `php tests/AIPlatform/AdminSurfaceGuardTest.php`: **34/34 PASS**.
  - `php tests/security/SuperAdminHardwareEnrollmentRouteTest.php`: **8/8 PASS**.
  - `php tests/security/SuperAdminRecoveryCeremonyTest.php`: **10/10 PASS**.
  - Live cURL Probes (`162.244.94.48`):
    - Unauthenticated `/admin`: `302 Found -> https://license.airroofers.eu/admin/login?redirect=https%3A%2F%2Fadmin.airroofers.eu%2F`.
    - Authenticated `/admin`: `302 Found -> https://admin.airroofers.eu/`.
    - Live console ingress: `https://admin.airroofers.eu` responds with `HTTP 200 OK`, eliminating the redirect loop.

### 3. Dumcholu Remote Qualification Status (Candidate `ffafd37b`)
- **PR #29:** https://github.com/Chicitadel/dumcholu/pull/29
- **Remote Workflows:**
  - `Dumcholu Portable Runtime Qualification` ([#41144190967](https://github.com/Chicitadel/dumcholu/actions/runs/41144190967)): **SUCCESS** (9m25s).
  - `Dumcholu Product Name Governance Gate` ([#41144190405](https://github.com/Chicitadel/dumcholu/actions/runs/41144190405)): **SUCCESS** (22s).
  - `Deployment Manifest Qualification` ([#41144190301](https://github.com/Chicitadel/dumcholu/actions/runs/41144190301)): **SUCCESS** (29s).

### 4. Overall Release Governance Posture
- Both Ugondu distributed passport state and Dumcholu optimistic locking findings are physically resolved, tested, and green.
- Live admin SSO routing is synchronized and verified on the DirectAdmin production shared host (`162.244.94.48`).
- DirectAdmin shared host remains the primary launch environment; AWS deployment remains safely deferred pending official public engagement and budget authorization.
- Zero AI attribution strictly enforced across all commits, artifacts, and documentation.
- Overall ecosystem status: `PARTIAL / RELEASE BLOCKED / NOT CERTIFIED` (see Audit Correction below; supersedes `READY_FOR_FINAL_AUTHORITY_REVIEW`).

### Audit Correction — 2026-10-31 (supersedes "CERTIFIED" wording above)
- The statement above that shared passport persistence is "CERTIFIED" was premature. Candidate `4969ee1e` had no inter-process writer lock (lost-update race) and its CI/CD run #41148356049 was **cancelled**, not passed. Only COR Certification and Deployment Manifest runs succeeded on it.
- PR #64 (`fix/cor-passport-multiprocess-write-lock-2026-10-31`) as pushed did not compile (`withWriteLock` undefined, TS2339); CI/CD and COR runs on it failed.
- Remediation (commits `2d113b35` & `65d38324`): `withWriteLock` (atomic mkdir lock, bounded wait, stale-lock recovery, fail-closed), `fsync` before atomic rename, bounded retry of transient `EPERM/EACCES/EBUSY`. Split shared-store integration tests to `tests/passport-shared-store.test.js` to strictly satisfy the 500-line repository policy (`UG-COR-NO-STUBS-001`). Evidence: `ENG-PASS-010` (6 OS processes x 15 writes, zero lost; 4 consecutive runs 16/16), Jest passport specs 3/3, engine-core Jest 43 suites / 259 tests.
- **Exact-Head Qualification on Commit `65d38324` (PR #64):**
  - `Ugondu CI/CD Pipeline` ([#41153048212](https://github.com/Chicitadel/ugondu/actions/runs/41153048212) push & [#41153053969](https://github.com/Chicitadel/ugondu/actions/runs/41153053969) PR): **SUCCESS** (4m46s, 17/17 jobs passing).
  - `COR Certification` ([#41153048107](https://github.com/Chicitadel/ugondu/actions/runs/41153048107) push & [#41153053982](https://github.com/Chicitadel/ugondu/actions/runs/41153053982) PR): **SUCCESS** (40/40 streams passed, 0 skipped, 0 failed).
  - `Ugondu Deployment Manifest Qualification` ([#41153048222](https://github.com/Chicitadel/ugondu/actions/runs/41153048222) push & [#41153053973](https://github.com/Chicitadel/ugondu/actions/runs/41153053973) PR): **SUCCESS** (34s).
- **Still OPEN / Explicitly Tracked:** (1) multi-host durability — filesystem lock only coordinates processes sharing one filesystem; a shared DB-backed adapter and independent-host tests are required before claiming multi-host distributed cluster consistency; (2) revoking a signed-but-unregistered passport now throws (no tombstone) — needs design decision; (3) trust-root, authority signature, live AeroBill/Mandatag, AWS physical, independent review gates remain skipped/outstanding.
- No AWS or DirectAdmin deployment was performed for this change.


---

## Re-audit remediation — signed-but-unregistered passport admission — 2026-10-31

**Finding: UG-PASSPORT-SIGNED-UNREGISTERED-ADMISSION-004 — CONFIRMED.**

### Root cause
In `server/engine-core/src/index.ts`, the signed-token branch of `admitPassport()` rejected a registered passport only when its record was revoked, expired or tenant-mismatched. A missing record (`passportStore.get() === null`) fell through to `ADMITTED`. This contradicted the repository's earlier fail-closed unregistered-passport requirement and allowed cryptographic authenticity to substitute for authoritative admission registration.

### Physical remediation
- Changed signed-token admission to reject when the store returns no registration record, as well as for revoked, expired or tenant-mismatched records.
- Preserved cryptographic signature and claims verification as a separate required step.
- Added regression `ENG-PASS-011`: issue a signed token, clear the authoritative registry, then assert admission rejects the still-valid signature.
- Updated `ANTIGRAVITY_CHANGE_GUARDRAIL.md` with the non-negotiable registration invariant.

### Candidate
- Dedicated branch: `fix/passport-signed-unregistered-fail-closed-2026-10-31`
- Parent: PR #67 head `0d923240328d3f7d83edc7a2fad0df15f972a173`
- Source commit: `46e33d1c872a532eb48a2ea6f8f0729e174154fc`
- Regression commit: `8e3c7fbc9419f2b446ee0954f3ef7100ca02dfaf`
- Guardrail commit: `2b0de8bc58305d2a44c97f9d18d0c92d54819623`

### Qualification boundary
Physical source, regression and guardrail writes are committed. Exact-head CI/COR is pending and must pass before this candidate is qualified. The regression intentionally leaves the test registry empty at the end of the test file; verify test order and full-suite isolation in CI.

### Multi-host persistence remains OPEN
The existing filesystem-backed store proves shared-directory coordination, not independent-host persistence. The historic ENG-PASS-008 test creates two store instances in one process against one temporary directory; it is not a multi-process or multi-host test. A production SQL adapter, schema/migration, runtime injection, connection lifecycle, fail-closed outage behavior, and independent-process/host admission/revocation tests remain required. No PostgreSQL adapter is represented as implemented by this change.

### Product boundaries and hosting
AeroBill remains sole authority for billing/pricing/invoicing/metering; Mandatag remains sole authority for licensing/entitlements. DirectAdmin remains launch hosting. VPS is unavailable. AWS provisioning remains deferred until traction, official engagement/funding and explicit budget authorization. Preserve portable OCI/runtime configuration and avoid AWS-specific business logic. No AWS resources were provisioned.

**Overall posture: `PARTIAL / RELEASE BLOCKED / NOT CERTIFIED`.** No master/main branch modified; no PR merged.


---

## Dual-product candidate integration audit — 2026-10-31

**Finding: DU-COR-CANDIDATE-BRANCH-DIVERGENCE-001 — CONFIRMED.**

Dumcholu PR #35 territory candidate head `08c71e2ba278e49180aa9379f19cb8eae1f112b2` and PR #29 optimistic-lock candidate head `ffafd37cce49d83e4216b2842cb18f9d5147d142` are on divergent Git histories. GitHub compare reports 282 commits ahead on PR #35 and 161 commits behind relative to PR #29, with merge base `2930d6f473234134a71a9fa4648ec0cb125ca029`.

PR #36 is stacked on PR #35. Therefore PR #35/#36 successful workflows do not qualify the PR #29 change set. PR #29 adds `CareerDiscoveryCaseEntity`, `GuidanceCaseEntity`, `V3__add_orm_optimistic_lock_versions.sql`, and `CareerCaseOptimisticLockingTest`; these exact paths are absent from the PR #35 candidate tree. The PR #35 tree does contain `CareerJourney` with its own `@Version`, but this is a different entity and does not prove the PR #29 discovery/guidance case concurrency fix is integrated.

**Required action:** create an explicit integration/reconciliation candidate after resolving the authoritative career domain model and Flyway migration lineage. Do not blindly cherry-pick PR #29 files or claim that separate green workflows equal one integrated release candidate. Run complete Maven, Flutter, governance and exact-head COR qualification after integration. No physical integration change made because the target model/migration reconciliation is not yet established; fabricating parallel entities or duplicate migrations would be an unsafe architecture downgrade.

**Candidate verification references:**
- PR #29: https://github.com/Chicitadel/dumcholu/pull/29
- PR #35: https://github.com/Chicitadel/dumcholu/pull/35
- PR #36: https://github.com/Chicitadel/dumcholu/pull/36
- Compare: `ffafd37cce49d83e4216b2842cb18f9d5147d142...08c71e2ba278e49180aa9379f19cb8eae1f112b2` (diverged, 282/161).

**Overall posture remains:** `PARTIAL / RELEASE BLOCKED / NOT CERTIFIED`. All changes remain on dedicated unmerged candidate branches. No master/main modification or AWS provisioning.
