# Ugondu Master Execution and Certification Checklist — 2026-10-22

**Document Identifier:** `UG-COR-MASTER-CHECKLIST-2026-10-22-001`  
**Repository:** [Chicitadel/ugondu](https://github.com/Chicitadel/ugondu)  
**Target Branch:** `phase4/production-hardening`  
**Author:** Enterprise Architecture Council (`architecture@airroofers.eu`)  
**Organization:** Air Roofers SASU / Ujomor Systems Engineering & Governance Authority  
**Classification:** Enterprise Production Release Governance  
**Governing Standards:** ISO 27001, SOC 2 Type II, OWASP ASVS 5.0, NIST SP 800-53, UAIGOS 3.0.0  
**Current Disposition:** **HOLD / NO-GO for universal production release**  
**Companion Documents:**
- [Core COR audit and remediation plan](./UGONDU_COR_UNIVERSAL_READINESS_AUDIT_REMEDIATION_PLAN_2026-10-22.md)
- [Latest source re-audit delta](./UGONDU_UNIVERSAL_READINESS_REAUDIT_DELTA_2026-10-22.md)
- [COR re-audit evidence delta](./UGONDU_COR_REAUDIT_EVIDENCE_DELTA_2026-10-22T1327Z.md)
- [Certification sign-off and historical evidence reconciliation](./UGONDU_COR_UNIVERSAL_PLATFORM_READINESS_CERTIFICATION_SIGN_OFF_2026-10-22.md)

This checklist is the formal corporate execution ledger. A gate is not certified because code exists or an engineering delegate reports success: close it only with source inspection, tests on the exact candidate SHA, retained evidence, and independent gate authority sign-off.

## 1. Current evidence-based snapshot

| Gate | Status | Current evidence / limitation |
|---|---|---|
| AWS physical qualification | 🟢 Candidate-specific | Terminal `success` in run `39785799760` (and `39785830839`) on candidate `e3e09024`: completed physical qualification, Fargate certification, and zero-residual cleanup; prior run `39775766685` verified candidate `a94c8f1c`. Evidence is candidate-bound and not transferable to unverified commits. |
| Cross-platform thin-client builds | 🟢 Tested combinations only | Run `39779883274` reports Linux amd64/arm64, macOS amd64/arm64 and Windows amd64 build jobs passed. Build success alone is not native end-to-end certification. |
| Microservice integration tests | 🟢 Tested revision only | Run `39779883274` reports integration tests and Docker image validation passed. |
| Release publishing | ⚪ Not proven by latest run | Release-publish job was skipped in inspected runs; pending formal candidate tag. |
| Fail-closed endpoint resolution (UG-COR-AUD-011) | 🟢 Verified in `8b071c23` & successors | `AirRoofersAiProviderAdapter.getBaseUrl()` enforces fail-closed resolution; throws `AIRROOFERS_AI_ENDPOINT_REQUIRED` if unset, validates HTTPS, rejects malformed URLs, and restricts to `.airroofers.eu` domain policy; verified in `AI-008`. |
| Zero literal fallback (UG-COR-AUD-011) | 🟢 Verified in `8b071c23` & successors | Literal `https://ai.airroofers.eu` fallback removed from executable TypeScript in `airroofers-provider.ts`; unconfigured endpoints fail closed. |
| Global model catalog zero-hardcoding (UG-COR-AUD-011) | 🟡 In progress & being verified | Provider endpoint and account literals in `config/model-catalog.json` are undergoing extraction to governed configuration; fail-closed resolution actively enforced. |
| URL credential & secret stripping (UG-COR-AUD-011) | 🟢 Verified in `8b071c23` & successors | Workload credentials and URL secrets redacted from error diagnostics, URLs, and correlation contexts; verified in `AI-006` and `AI-008`. |
| Localized AI diagnostics & zero fallback (UG-COR-AUD-011) | 🟢 100% parity / zero fallback verified | `ai.error.*` diagnostic tokens integrated across all 12 locales; `scripts/validate-locales.js` passes with 100% key parity and 0 missing keys; zero-fallback localization remediations applied across adapter paths. |
| Dynamic model discovery & lifecycle (UG-COR-AUD-012) | 🟡 Local lifecycle verified; live sync open | Catalogue supports lifecycle statuses, fallback routing, and validation in `AI-001`–`AI-005`; live network model discovery pending provisioned staging window. |
| Real Air Roofers AI E2E (UG-COR-AUD-012) | 🔴 Open | Offline contract, payload construction, and error mapping verified with transport in `AI-007`/`AI-008`; real authenticated network request to provisioned service pending. |
| Anti-stub adversarial governance (UG-COR-AUD-013) | 🟢 Verified in `8b071c23` & successors | `tests/qualification/adversarial-anti-stub.test.js` passes 8/8 (`AAS-001`–`007`); repository validator confirms 4,512 tracked files with 0 violations. |
| Platform evidence inventory (UG-COR-AUD-014) | 🟡 Inventory verified / live runs open | 22 targets classified in `platform-matrix.json`; evidence runner test passes 15/15; 21 targets remain experimental until native runs execute. |
| Universal release certification | 🔴 HOLD | Universal release blocked until live AI E2E and native target cells achieve required evidence tier on candidate SHA. |

## 2. Execution rules

1. **Fail closed:** missing endpoint, region, credential, provider capability, permission, evidence or rollback verification means stop; never synthesize success.
2. **Actor chooses region:** accept provider region ID or guided name/city/country resolution. If absent or ambiguous, ask; never silently select a default.
3. **No hidden mocks:** injected transports are allowed for unit tests only. They cannot be counted as live integration/E2E evidence.
4. **No false universal claims:** a platform is green only for the exact native target and supported operation modes that passed the evidence policy.
5. **Exact-SHA binding:** each evidence record includes commit SHA, environment fingerprint, test command, timestamp, logs/artifact hashes, outcome, cleanup/rollback evidence, and reviewer.
6. **No unsupported release signatures:** historical signatures remain historical; they do not approve a changed candidate.
7. **UAIGOS evidence lifecycle:** Discover → Classify → Plan → Execute → Verify → Certify → Freeze → Handoff. No stage may be skipped; failed verification returns to Plan/Execute.
8. **No sensitive output:** redact secrets, tokens, customer data, raw prompts, and unneeded request payloads from logs/artifacts.

## 3. Prioritized remediation backlog

### P0 — strict configuration and localization (UG-COR-AUD-011)

- [x] **UG-COR-AUD-011A:** Adapter prohibits fallback to hardcoded default, requiring deployment/environment configuration (`UGONDU_AIRROOFERS_AI_BASE_URL`). Implemented and verified in `8b071c23`.
- [x] **UG-COR-AUD-011B:** Dynamic region placement governed by actor choice in `UniversalPlacementResolver.ts` with 8/8 tests passing in `universal-region-selection.test.js`.
- [x] **UG-COR-AUD-011C:** Replace literal endpoint/auth/rate-limit/upstream English messages with localization tokens across all 12 locales; verified with 100% key parity and 0 missing keys.
- [x] **UG-COR-AUD-011D:** Ephemeral credentials, workload secrets, and raw URLs stripped and redacted from error details and correlation contexts.
- [x] **UG-COR-AUD-011E:** Comprehensive test suite in `tests/ai-inference-gateway.test.js` (`AI-008`) verifying missing/malformed/insecure/disallowed endpoints and secret redaction.
- [ ] **UG-COR-AUD-011F:** Global model catalog zero-hardcoding and zero-fallback localization remediations being applied and verified across all providers.

### P0 — real Air Roofers AI integration (UG-COR-AUD-012)

- [ ] **UG-COR-AUD-012A:** Confirm canonical service contract with the actual provisioned API owner; do not invent or assume routes or request schemas.
- [ ] **UG-COR-AUD-012B:** Run authenticated health check against the configured service using an approved non-production credential.
- [ ] **UG-COR-AUD-012C:** Prove model catalogue discovery/refresh against live API; validate schema, availability, capability, and deprecation fields.
- [ ] **UG-COR-AUD-012D:** Execute a minimal real authenticated inference request and validate response shape, usage, correlation IDs, timeout, and error mapping.
- [ ] **UG-COR-AUD-012E:** Exercise 401/403, 429, 5xx, timeout, invalid/retired model, and policy denial using real staging service.
- [x] **UG-COR-AUD-012F:** Model kill switches, data residency policy, credential rotation, redaction, and concurrency accounting verified in `AI-003`–`AI-006`.
- [x] **UG-COR-AUD-012G:** Safe model lifecycle statuses and fallback routing verified in `AI-001`–`AI-004`.

### P0 — anti-stub / anti-scaffolding / no fake success (UG-COR-AUD-013)

- [x] **UG-COR-AUD-013A:** Adversarial mutation tests implemented in `tests/qualification/adversarial-anti-stub.test.js` (`AAS-001`–`AAS-007`) passing 8/8.
- [x] **UG-COR-AUD-013B:** Semantic validator in `scripts/governance/validate-repository.mjs` exits non-zero for fake success, swallowed errors, and mock imports.
- [x] **UG-COR-AUD-013C:** All 4,512 tracked files audited with 0 violations.
- [x] **UG-COR-AUD-013D:** Verified no test transports or mock fixtures are imported into production paths.
- [ ] **UG-COR-AUD-013E:** Enforce real provider read-after-write verification on concrete cloud adapters.

### P1 — universal target certification (UG-COR-AUD-014)

- [x] **UG-COR-AUD-014A:** 22 targets classified across OS, architecture, runtime, provider, and mode in `config/qualification/platform-matrix.json`.
- [ ] **UG-COR-AUD-014B:** Native runs on Linux amd64/arm64, Windows amd64, macOS amd64/arm64. Cross-compilation does not satisfy runtime qualification.
- [ ] **UG-COR-AUD-014C:** Execute live provider qualification for AWS, GCP, Azure, Kubernetes, Docker Compose, cPanel, DirectAdmin, and SSH/SFTP.
- [ ] **UG-COR-AUD-014D:** Test UI, terminal, IDE, CI and model-assisted/non-model-assisted entry points for equivalent policy and recovery.
- [x] **UG-COR-AUD-014E:** Evidence verifier mechanism in `scripts/release/platform-evidence.mjs` strictly enforces experimental -> supported gates (15/15 tests pass).
- [x] **UG-COR-AUD-014F:** Non-universal claims preserved: 21 experimental / 1 supported accurately reported.

### P1 — evidence, release and rollback (UG-COR-AUD-015 / UG-COR-AUD-016)

- [x] **UG-COR-AUD-015A:** AWS physical qualification reconciled: run `39775766685` passed on `a94c8f1c`; run `39785799760` (and `39785830839`) reached terminal `success` on `e3e09024`.
- [x] **UG-COR-AUD-016A:** Exact SHA binding enforced in evidence runner.
- [ ] **UG-COR-AUD-016B:** Verify signed policy-pack and release-evidence digests on final candidate tag.
- [ ] **UG-COR-AUD-016C:** Confirm release workflow actually publishes expected artifacts on tagged release.
- [x] **UG-COR-AUD-016D:** Zero-residual cleanup verified in runs `39775766685` and `39785799760`.
- [ ] **UG-COR-AUD-016E:** Obtain independent governance sign-off on release candidate.

## 4. Required endpoint resolution pattern

The adapter resolves configuration and fails closed (implemented in `AirRoofersAiProviderAdapter` in candidate `8b071c23`):

```ts
function resolveAiEndpoint(
  provider: ProviderConfig,
  env: NodeJS.ProcessEnv,
  policy: EndpointPolicy
): URL {
  const raw = env[provider.endpointEnvVar] ?? provider.configuredEndpoint;
  if (!raw) {
    throw new AiGatewayError('AIRROOFERS_AI_ENDPOINT_REQUIRED', 'ai.error.endpoint_required', 500);
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new AiGatewayError('AIRROOFERS_AI_ENDPOINT_MALFORMED', 'ai.error.endpoint_malformed', 400);
  }

  if (url.protocol !== 'https:') {
    throw new AiGatewayError('AIRROOFERS_AI_ENDPOINT_INSECURE', 'ai.error.endpoint_insecure', 400);
  }

  if (!policy.isAllowedEndpoint(url, provider.providerId)) {
    throw new AiGatewayError('AIRROOFERS_AI_ENDPOINT_DISALLOWED', 'ai.error.endpoint_disallowed', 403);
  }

  return url;
}
```

Implementation notes:
- `AirRoofersAiProviderAdapter.getBaseUrl()` enforces `AIRROOFERS_AI_ENDPOINT_REQUIRED`, HTTPS validation, malformed URL handling, and sovereign host filtering (`.airroofers.eu`).
- User-facing diagnostic messages are mapped via `server/shared/locales/` across 12 languages.
- Ephemeral credentials and URL secrets are redacted from error objects and logs.

## 5. Required dynamic region-selection pattern

```ts
async function resolvePlacementTarget(input: PlacementInput, actor: Actor): Promise<ResolvedTarget> {
  if (!input.region && !input.regionName && !input.city && !input.country) {
    throw new PlacementInputRequiredError({
      token: 'placement.region_required',
      examples: ['eu-west-3', 'Paris', 'France'],
    });
  }

  const candidates = await providerLocationRegistry.resolve({
    providerId: input.providerId,
    regionId: input.region,
    regionName: input.regionName,
    city: input.city,
    country: input.country,
  });

  const permitted = await policy.filterAllowedTargets(candidates, actor, input);
  if (permitted.length === 0) throw new NoPermittedPlacementError();
  if (permitted.length > 1) throw new PlacementClarificationRequiredError(permitted);
  return verifyProviderTarget(permitted[0], input.providerId);
}
```

The registry queries authoritative provider metadata, preserves provenance/freshness, respects actor authorization, and never silently chooses a region (verified in `universal-region-selection.test.js`).

## 6. Exact local verification sequence

Run from a clean checkout of the candidate commit:

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
node tests/qualification/adversarial-anti-stub.test.js
node tests/qualification/platform-evidence.test.js
node tests/qualification/universal-region-selection.test.js
node scripts/validate-locales.js
node scripts/verify-release-integrity.js
```

Before running `npm run test:aws` or any other cloud-mutating gate:
- inspect `scripts/run-cor-gates.js` and underlying AWS scripts;
- require explicit actor-selected account and region;
- validate least privilege, budget, tagging, rollback and cleanup;
- obtain authorization for physical resource creation;
- preserve redacted logs and exact-SHA evidence.

## 7. Certification evidence record schema

```json
{
  "schemaVersion": "1.0.0",
  "targetId": "matrix-target-id",
  "gateId": "UG-COR-AUD-012",
  "commitSha": "exact-40-character-commit-sha",
  "environmentFingerprint": "sha256:...",
  "startedAt": "ISO-8601 timestamp",
  "finishedAt": "ISO-8601 timestamp",
  "result": "passed|failed|blocked|not-assessed",
  "executionMode": "live|unit|contract|simulation",
  "mocked": false,
  "skipped": false,
  "artifacts": [],
  "rollbackVerified": false,
  "residualResources": "unknown|zero|nonzero",
  "reviewer": "governed-actor-id"
}
```

Never mark a target green if `mocked`, `skipped`, or `executionMode=simulation` is true.

## 8. Exit criteria for universal GO

Universal GO is permitted only when all of the following are true for the same release SHA:

- [ ] All required source, build, type, unit, contract, integration, E2E, security, compatibility and governance gates pass.
- [ ] No unapproved hardcoded endpoints, regions, secrets, fake success, TODO stubs or production test doubles remain.
- [ ] Real Air Roofers AI authentication, model discovery/registry sync and inference have succeeded against the approved service, with failure modes and policy enforcement tested.
- [ ] Every advertised platform matrix cell is natively qualified and evidence-verifier accepted; otherwise claims are explicitly reduced.
- [ ] AWS physical qualification, rollback and zero-residual cleanup pass on the candidate SHA.
- [ ] Evidence bundles are cryptographically bound to the exact commit and environment; no stale evidence or skipped release jobs are counted.
- [ ] UAIGOS lifecycle completed through Certify, Freeze and Handoff with independent review.

Until every mandatory condition is met, the official status remains **HOLD / NO-GO for universal production release**.
