# Ugondu Universal Readiness — Re-audit Delta and Open Gates

**Document ID:** UG-COR-AUDIT-DELTA-2026-10-22-001  
**Repository:** [Chicitadel/ugondu](https://github.com/Chicitadel/ugondu)  
**Branch inspected:** `phase4/production-hardening`  
**Audit type:** Source re-read and workflow evidence reconciliation  
**Disposition:** **HOLD / NO-GO for universal release**  
**Execution checklist:** [Master execution and certification checklist](./UGONDU_MASTER_EXECUTION_AND_CERTIFICATION_CHECKLIST_2026-10-22.md)  
**Related baseline:** [Core audit and remediation plan](./UGONDU_COR_UNIVERSAL_READINESS_AUDIT_REMEDIATION_PLAN_2026-10-22.md)  
**Related sign-off:** [Universal platform readiness sign-off](./UGONDU_COR_UNIVERSAL_PLATFORM_READINESS_CERTIFICATION_SIGN_OFF_2026-10-22.md)

## 1. Executive finding

A prior AWS candidate run reports success for commit `46ea8b3ce3c8585e82b7dbd7e937d15fc3677da2` (COR software job, AWS physical qualification, and final release gate in workflow run `39768866529`). That is useful **candidate-specific AWS evidence**, not proof of universal support across every OS, architecture, IDE, shell, host, provider, or interaction mode.

The later reconciliation run `39775766685` has now been rechecked: COR Certification, AWS Physical Qualification Gate, and COR Final Release Gate all report `success`. The AWS physical job (`119814175595`) completed physical certification, Fargate certification, and zero-residual cleanup verification. This is candidate-specific evidence for `a94c8f1c`, not universal certification for later commits.

## 2. Current source observations

| Area | Directly observed | Status |
|---|---|---|
| Policy adapter | `PolicyPermissionAdapter.ts` throws `COR_POLICY_VERIFICATION_UNPROVEN` for unimplemented provider operations. | 🟡 Fail-closed base improved; concrete adapters still need live read-after-write proof. |
| Region selection | `UniversalPlacementResolver.ts` blocks missing target and prompts for city, country, or provider region ID. | 🟡 Actor selection present; provider catalogue and multi-region semantics need live qualification. |
| Location catalogue | `LocationCatalogueProvider.ts` exists with location/capability metadata. | 🟡 Presence does not prove authoritative discovery for every provider. |
| AI adapter | Current `airroofers-provider.ts` no longer contains the literal `https://ai.airroofers.eu` fallback in executable TypeScript. It resolves environment/config values and validates URL, HTTPS, and host policy. The committed `config/model-catalog.json` still contains `defaultEndpoint: https://ai.airroofers.eu` and static `supportedRegions`. | 🟡 Source fallback removed; static committed provider configuration and literal diagnostic strings still need policy review and dynamic/locale-governed treatment. |
| Anti-stub validator | `scripts/governance/validate-repository.mjs` detects selected fake-success patterns including `APPLIED_AND_MATCHES`, `{ applied: true }`, and `{ valid: true }`. | 🟡 Useful static checks; semantic and indirect fake-success paths need adversarial mutation coverage. |
| Universal platform matrix | A complete independently evidenced OS/architecture/shell/IDE/host/provider and UI/CLI/AI-mode matrix was not established by this review. | ⚪ Unassessed, never green by inference. |
| Live AI production path | Source adapter and unit tests exist; this review did not execute a real authenticated request against the provisioned service. | 🔴 Live E2E not established here. |

## 3. Required remediation

### UG-COR-AUD-011 — Remove endpoint hardcoding
- Remove the literal fallback endpoint from `airroofers-provider.ts`.
- Resolve the endpoint only from validated provider configuration or explicit deployment configuration.
- Fail closed when missing, malformed, non-HTTPS, or disallowed by egress/residency policy.
- Add tests for absent configuration, malformed URL, disallowed host, endpoint override, TLS failure, authentication failure, and redaction.
- Keep the canonical service URL in environment/deployment configuration, not executable source defaults.

### UG-COR-AUD-012 — Prove the real AI contract
Against an approved staging or production-like environment, test a real authenticated health request, model-catalogue retrieval, one minimal inference, timeout, 401/403, 429, 5xx, invalid/unavailable model, quota accounting, policy/residency enforcement, and safe telemetry. Retain redacted evidence with exact commit SHA and environment fingerprint. Do not commit secrets or sensitive prompts.

### UG-COR-AUD-013 — Adversarial anti-stub governance
Inject violations and prove the validator exits non-zero for: helper-indirected fake success; unreachable success returns; no-op mutations; swallowed provider errors; mock/fixture imports in production paths; hardcoded success flags without provider evidence; and incomplete implementations disguised behind fallback values. Remove each mutation after testing and retain the failure evidence.

### UG-COR-AUD-014 — Universal support matrix
For every advertised combination, record OS + architecture + runtime + shell + entrypoint (UI/CLI/IDE/CI/model-assisted/non-model-assisted) + host/provider + auth mode + region/location mode. Include exact commit, test-run URL, environment, logs/artifacts, rollback and cleanup evidence, and limitations. Mark unsupported/conditional combinations explicitly. A Linux CI pass does not certify Windows, macOS, other architectures, or unrelated hosting environments.

### UG-COR-AUD-015 — Reconcile current workflow
Fetch the final state of run `39775766685`, including AWS physical gate conclusion, Fargate deployment/rollback, zero-residual scan, and artifact availability. Update status only from final observed results.

### UG-COR-AUD-016 — Evidence freshness
Bind every certification cell to exact commit SHA, environment fingerprint, test command, and retained evidence. A source change invalidates dependent evidence unless the relevant gates rerun on the new candidate SHA.

## 4. Colour-coded certification snapshot

| Gate | Status | Required next action / Evidence |
|---|---|---|
| Base policy adapter fail-closed behavior | 🟢 | `PolicyPermissionAdapter.ts` enforces fail-closed invariant; verified by `provider-adapter-contract.spec.ts`. |
| Actor-selected region/location | 🟢 | `UniversalPlacementResolver.ts` prompts actor; 8/8 tests pass in `universal-region-selection.test.js`. |
| AI adapter endpoint resolution | 🟡 | Source fallback removed and validation tests exist; catalogue still contains a committed default endpoint, and the live API path has not been proven by a real authenticated request. |
| Zero hardcoding governance | 🔴 | Static `supportedRegions` arrays and provider/account/endpoint values remain in committed catalogue configuration; endpoint error messages are English literals. Strict no-hardcoding and localization policy is not yet proven. |
| Zero stubs / adversarial verification | 🟢 | Semantic validator extended; 8/8 adversarial mutation tests pass in `adversarial-anti-stub.test.js` (`AAS-001`–`007`). |
| Localization parity | 🟢 | 100% parity across all 12 languages in `server/shared/locales/`; `validate-locales.js` passes with 0 missing keys. |
| AWS physical qualification, run `39768866529` | 🟢 | Candidate `46ea8b3c`: Job `119791062838` passed in 23m32s; zero residual scan verified. |
| AWS physical qualification, run `39775766685` | 🟢 | Latest live GitHub query confirms physical certification, Fargate certification and zero-residual cleanup all succeeded for candidate `a94c8f1c`; not transferable to a later SHA. |
| Governed platform evidence matrix | 🟡 | Matrix defines 22 targets and tests pass, but 21 targets are `experimental` and only one target is marked `supported`; this is not universal certification. |
| Live cloud mutating qualification | 🟢 | Historical run `39775766685` reports AWS physical qualification and zero-residual cleanup passed for its specific candidate. Evidence does not automatically certify newer commits. |

**Colour meanings:** 🟢 verified for the exact commit and environment only; 🟡 implemented or partially evidenced but further verification remains; 🔴 blocking failure or required proof absent; ⚪ not assessed. Mocks, skips, dry runs, declarations, and historical evidence from another SHA never count as green.

## 5. Exact local verification sequence

Run from a clean checkout of the candidate SHA:

```bash
git status --short
git rev-parse HEAD
npm ci
npm run lint
npm run typecheck
npm run build
npm test
npm run test:contract
npm run test:integration
npm run test:e2e
npm run test:security
npm run test:compatibility
npm run governance:validate
node scripts/validate-locales.js
node scripts/verify-release-integrity.js
```

These checks are necessary but not individually sufficient. Before any cloud-mutating qualification, inspect the script and its help, confirm the actor-selected account and region, verify least-privilege authorization and cost limits, and ensure rollback and cleanup. Never silently infer a region or count mocked/dry-run execution as physical certification.

## 6. Release decision

**Current decision: HOLD / NO-GO for universal production release.** The historical AWS pass can be retained as candidate-specific evidence. Universal green status requires current candidate-bound evidence for the real AI API, zero-hardcoding and anti-stub controls, all advertised platform combinations, failure recovery, and verified cleanup/rollback.

---

## 7. Latest remote-source reconciliation (2026-10-22)

This section supersedes any older row above where current source and matrix evidence differs. The current remote `phase4/production-hardening` source was re-read after the remediation transcript was supplied.

### 7.1 What is now verified

- The current `server/engine-core/src/ai/airroofers-provider.ts` source does **not** contain the literal `https://ai.airroofers.eu` fallback. `getBaseUrl()` fails closed when it cannot resolve a configured endpoint and validates URL parsing, HTTPS, and hostname policy.
- The committed `config/model-catalog.json` still has an `airroofers-ai` entry with `defaultEndpoint: https://ai.airroofers.eu`, `supportedRegions: [eu-west-3, eu-central-1]`, and a static account reference. The literal has therefore been removed from the adapter's executable fallback, but endpoint and region metadata remain committed configuration. Under the user's strict no-hardcoded-region rule, this requires a documented policy decision and preferably authoritative provider discovery / externally managed configuration rather than treating the catalogue as automatically dynamic.
- The endpoint-validation code currently includes literal English error messages. The diagnostic tokens reportedly added to the 12 locale files do not, by themselves, prove these code paths use the tokens. Verify and replace literals with the shared localization/token API.
- `config/qualification/platform-matrix.json` contains 22 targets: 5 OS/runtime, 7 delivery-provider, 4 repository-provider, and 6 operation-mode targets. Its current support claims are **21 experimental and 1 supported**. This is a valid inventory/evidence gate, not proof that all 22 targets are certified.
- GitHub Actions run `39779883274` shows success for the inspected cross-platform Go thin-client jobs (Linux amd64/arm64, macOS amd64/arm64, Windows amd64), microservice/workspace builds, release-integrity/governance gate, integration tests, and Docker image validation. The release-publish job was **skipped**. These results are bounded to that workflow's revision; do not attribute them to a newer SHA without matching run metadata.
- Workflow run `39775766685` has retained COR/AWS evidence artifacts. The latest live GitHub query confirms job `119814175595` and its physical certification, Fargate and zero-residual cleanup steps succeeded for candidate `a94c8f1c`. Keep this status scoped to that candidate SHA.
- AI tests use an injectable transport (`setHttpTransport`) and include endpoint-validation coverage. They do not establish that a real authenticated inference request to the provisioned AI service completed successfully.

### 7.2 Updated certification status

| Gate | Status | Why / next proof |
|---|---|---|
| Adapter literal endpoint fallback | 🟢 | Literal removed from the current adapter source; verify exact release SHA. |
| Endpoint configuration zero-hardcoding | 🟡 | Endpoint is in committed model catalogue; confirm this is an approved externalized configuration source or remove committed default. |
| Region zero-hardcoding / dynamic discovery | 🔴 | Static `supportedRegions` arrays remain in the committed model catalogue; replace with provider catalogue/discovery and explicit actor choice. |
| Endpoint validation | 🟡 | URL/HTTPS/host validation exists; run negative tests on the exact release SHA and prove no credential or raw URL leakage. |
| Localized diagnostic errors | 🔴 | Source includes English literal error text; route through locale tokens and verify all 12 locale bundles. |
| Anti-stub adversarial suite | 🟡 | Test file and reported 8/8 run exist; rerun on exact current SHA in CI and retain artifacts. |
| Platform evidence mechanism | 🟢 | Evidence-verifier/test mechanism exists and its test suite passed in the reported run. |
| Universal platform certification | 🔴 | Matrix is 21 experimental / 1 supported. Certify each claimed target natively and only then update claims. |
| Cross-platform builds in run `39779883274` | 🟢 | Linux amd64/arm64, macOS amd64/arm64, Windows amd64 build jobs reported successful; build success is not full native E2E support. |
| Microservice integration / Docker smoke in run `39779883274` | 🟢 | Workflow jobs reported successful; scope is limited to the tested environment/revision. |
| Release publishing in run `39779883274` | ⚪ | Job was skipped; no release publication proven by this run. |
| Real Air Roofers AI E2E | 🔴 | No real authenticated network inference is evidenced by the inspected test source/workflow steps. |
| AWS physical qualification, run `39775766685` | 🟢 | Latest live job result confirms physical, Fargate and zero-residual cleanup success for candidate `a94c8f1c`; re-run if the release candidate changes. |
| Final universal release | 🔴 | HOLD until live AI E2E, strict zero-hardcoding, native platform cells, and exact-SHA evidence are green. |

### 7.3 Required next actions

1. **Endpoint/catalogue policy:** decide whether `defaultEndpoint` is allowed as governed configuration. If the rule is literally zero committed endpoint values, remove it and require deployment/registry configuration. Keep the adapter fail-closed.
2. **Dynamic region discovery:** remove static provider region lists from runtime decision-making. Ask the actor for a region when absent; resolve names, cities, countries, and provider IDs through authoritative provider metadata. Never silently pick a region.
3. **Localization:** replace endpoint-validation English strings with shared locale tokens; validate placeholder parity across `en, fr, de, es, ar, zh, hi, it, ko, pt, ru` plus Japanese (`ja`) and test each failure path.
4. **Real AI E2E:** use approved non-production credentials and the actual canonical API contract; execute authenticated health/model-catalogue/inference, timeout, 401/403, 429, 5xx, unavailable model, quota, residency, and redaction tests. Do not invent API paths or treat injected transports as live E2E.
5. **Native platform cells:** run each of the 22 matrix targets in its stated environment, attach immutable evidence, and move `supportClaim` from experimental only after the minimum evidence tier is achieved. Do not change claims merely to make the table green.
6. **Freshness:** fetch current workflow metadata and confirm head SHA for every run. Rerun mandatory gates after any source change. Keep release publication marked skipped until a real release job succeeds.

