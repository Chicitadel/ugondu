# Ugondu Master Execution and Certification Checklist — 2026-10-22

**Document ID:** UG-COR-MASTER-CHECKLIST-2026-10-22-001  
**Repository:** [Chicitadel/ugondu](https://github.com/Chicitadel/ugondu)  
**Target branch:** `phase4/production-hardening`  
**Current disposition:** **HOLD / NO-GO for universal production release**  
**Companion documents:**
- [Core COR audit and remediation plan](./UGONDU_COR_UNIVERSAL_READINESS_AUDIT_REMEDIATION_PLAN_2026-10-22.md)
- [Latest source re-audit delta](./UGONDU_UNIVERSAL_READINESS_REAUDIT_DELTA_2026-10-22.md)
- [Certification sign-off and historical evidence reconciliation](./UGONDU_COR_UNIVERSAL_PLATFORM_READINESS_CERTIFICATION_SIGN_OFF_2026-10-22.md)

This checklist is the execution ledger. A task is not complete because code exists or a subagent reports success: close it only with source review, tests on the exact candidate SHA, retained evidence, and independent gate review.

## 1. Current evidence-based snapshot

| Gate | Status | Current evidence / limitation |
|---|---|---|
| AWS physical qualification | 🟢 Candidate-specific | Latest live GitHub query confirms run `39775766685` completed physical qualification, Fargate certification, and zero-residual cleanup for candidate `a94c8f1c`; not transferable to later SHAs. |
| Cross-platform thin-client builds | 🟢 Tested combinations only | Run `39779883274` reports Linux amd64/arm64, macOS amd64/arm64 and Windows amd64 build jobs passed. Build success alone is not native end-to-end certification. |
| Microservice integration tests | 🟢 Tested revision only | Run `39779883274` reports integration tests and Docker image validation passed. |
| Release publishing | ⚪ Not proven by latest inspected run | Release-publish job was skipped. |
| AI endpoint fallback in TypeScript | 🟢 Source-level remediation observed | Current adapter has no literal `https://ai.airroofers.eu` fallback in executable TypeScript. |
| AI endpoint/configuration zero-hardcoding | 🟡/🔴 Open | Committed model catalogue still embeds the Air Roofers endpoint, static region list and account reference; strict policy needs dynamic/external configuration. |
| Localized AI diagnostics | 🔴 Open | Adapter contains literal English messages for endpoint/auth/rate-limit/upstream failures. |
| Real Air Roofers AI E2E | 🔴 Open | Inspected tests inject an HTTP transport. No retained proof of a real authenticated inference request was established. |
| Dynamic model discovery / retirement | 🟡 Open | Model catalogue supports lifecycle statuses, but the inspected Air Roofers adapter did not show a live model-discovery request. |
| Platform evidence inventory | 🟡 Partial | 22 targets: 21 experimental, 1 supported. It is not universal green. |
| Anti-stub adversarial governance | 🟡 Pending exact-SHA confirmation | Adversarial suite exists and the supplied execution record reports 8/8 pass; rerun on the release candidate and retain CI evidence. |
| UAIGOS / zero hardcoding / no scaffolding | 🟡/🔴 Open | Static validators and policy exist; dynamic region/configuration, localization, semantic anti-stub and native matrix evidence still need final proof. |
| Universal release certification | 🔴 HOLD | Do not issue GO until every mandatory gate is evidenced for the exact release candidate. |

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

### P0 — strict configuration and localization

- [ ] **UG-COR-AUD-011A:** Decide and document whether a checked-in `defaultEndpoint` is permitted by zero-hardcoding policy. If the rule is strict, remove it from `config/model-catalog.json` and require deployment/secret-registry configuration.
- [ ] **UG-COR-AUD-011B:** Remove static provider region lists from runtime placement decisions; use provider discovery/authoritative metadata and actor selection. Keep any static allow/deny policy separately governed, versioned and justified.
- [ ] **UG-COR-AUD-011C:** Replace literal endpoint/auth/rate-limit/upstream English messages with localization tokens. Use typed error codes for machine behavior and localized presentation at the boundary.
- [ ] **UG-COR-AUD-011D:** Ensure error details do not echo full raw URLs, credentials, tenant data, prompts, or internal provider metadata.
- [ ] **UG-COR-AUD-011E:** Add tests for missing/malformed/insecure/disallowed endpoint, empty credentials, bad host, redirects to disallowed hosts, and secret redaction.

### P0 — real Air Roofers AI integration

- [ ] **UG-COR-AUD-012A:** Confirm the canonical service contract with the actual provisioned API owner; do not invent or assume routes, request schemas, model identifiers or response formats.
- [ ] **UG-COR-AUD-012B:** Run authenticated health check against the configured service using an approved non-production credential.
- [ ] **UG-COR-AUD-012C:** Prove model catalogue discovery/refresh. If the API exposes a model catalogue, validate schema, provenance, availability, capability and deprecation fields. If it does not, implement a governed registry sync; do not scrape undocumented routes.
- [ ] **UG-COR-AUD-012D:** Execute a minimal real inference and validate response shape, usage, correlation IDs, timeout, and error mapping.
- [ ] **UG-COR-AUD-012E:** Exercise 401/403, 429, 5xx, timeout, invalid/retired model, policy denial, quota exhaustion, and service outage using the real staging service where safe. Use fault injection only as separate non-live test evidence.
- [ ] **UG-COR-AUD-012F:** Verify provider/model kill switches, region/data-residency policy, credential rotation, redaction, telemetry and billing/quota accounting.
- [ ] **UG-COR-AUD-012G:** Implement safe model lifecycle: discover → validate → policy/security review → canary → staged enablement → monitor → deprecate → drain → retire. No unreviewed model version may auto-activate. If no compliant replacement exists, fail closed.

### P0 — anti-stub / anti-scaffolding / no fake success

- [ ] **UG-COR-AUD-013A:** Run adversarial mutation tests against production source for helper-indirected fake success, swallowed provider errors, no-op mutation methods, fixtures imported by production, unverified `{ applied: true }`-style returns, and skipped E2E gates.
- [ ] **UG-COR-AUD-013B:** Require the governance validator to exit non-zero for every injected violation and preserve the test logs.
- [ ] **UG-COR-AUD-013C:** Audit all TODO/FIXME/placeholder/template/mock/stub/fixture branches in production paths. Each match must be either removed or documented as a non-executable, policy-approved exception with owner and expiry.
- [ ] **UG-COR-AUD-013D:** Verify no test-only transports, fake credentials, deterministic fixture outputs, dry-run paths or local-only adapters are accidentally selected in production.
- [ ] **UG-COR-AUD-013E:** Enforce real provider read-after-write verification for cloud/IAM/policy mutations. If the provider cannot verify the outcome, return unverified/failure rather than success.

### P1 — universal target certification

- [ ] **UG-COR-AUD-014A:** Keep all 22 target definitions, but classify each by OS + architecture + runtime + shell + UI/CLI/IDE/CI + model-assisted/non-model-assisted + host/provider + auth mode + region-selection mode.
- [ ] **UG-COR-AUD-014B:** Native-run Linux amd64, Linux arm64, Windows amd64, macOS amd64 and macOS arm64 tests. A cross-compile/build does not satisfy runtime qualification.
- [ ] **UG-COR-AUD-014C:** Execute live provider qualification for AWS, GCP, Azure, Kubernetes, Docker Compose, cPanel, DirectAdmin, SSH/SFTP and every other advertised provider/host in the matrix.
- [ ] **UG-COR-AUD-014D:** Test UI, terminal, IDE, CI and model-assisted/non-model-assisted entry points for equivalent policy, localization, state persistence, resume/recovery and safe failure behavior.
- [ ] **UG-COR-AUD-014E:** Promote `supportClaim` from `experimental` only when the target's minimum evidence tier is satisfied and the evidence verifier accepts it.
- [ ] **UG-COR-AUD-014F:** If any mandatory cell is unsupported or untested, keep universal certification red; accurately label partial support rather than hiding gaps.

### P1 — evidence, release and rollback

- [ ] **UG-COR-AUD-015A:** Reconcile the final AWS run metadata, physical gate, Fargate lifecycle, rollback, zero-residual scan and artifacts.
- [ ] **UG-COR-AUD-016A:** Bind each gate to exact SHA and environment fingerprint; reject stale or mismatched evidence.
- [ ] **UG-COR-AUD-016B:** Verify signed policy-pack and release-evidence digests, provenance and artifact retention.
- [ ] **UG-COR-AUD-016C:** Confirm release workflow actually publishes expected artifacts. A skipped publish job is not a release pass.
- [ ] **UG-COR-AUD-016D:** Perform rollback/cleanup verification and confirm no cloud resources remain after physical tests.
- [ ] **UG-COR-AUD-016E:** Obtain independent governance review; only then change the current disposition.

## 4. Required endpoint resolution pattern

The adapter should resolve configuration and fail closed. The following is a design snapshot, not a claim that the current code already matches it:

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
- `ProviderConfig`, `EndpointPolicy`, and `AiGatewayError` must use the repository's real types/interfaces; do not copy this snapshot as-is without adapting it.
- Keep user-facing messages in locale packs. The error code/token is the stable contract; the English sentence must not be hardcoded in provider code.
- The endpoint policy must be governed configuration, not a permissive `endsWith` check that accidentally accepts unapproved hosts.
- Validate redirect behavior so an approved URL cannot redirect credentials to a disallowed host.

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

The registry must query authoritative provider metadata, preserve provenance/freshness, respect actor authorization and data-residency policy, and never silently choose a region. This is a design snapshot; adapt to the repository's actual interfaces.

## 6. Exact local verification sequence

Run from a clean checkout of the intended candidate commit:

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
- inspect `scripts/run-cor-gates.js` and the underlying AWS scripts;
- require explicit actor-selected account and region;
- validate least privilege, budget, tagging, rollback and cleanup;
- obtain authorization for physical resource creation;
- preserve redacted logs and exact-SHA evidence.
Never run a destructive cloud test merely to produce a green badge.

## 7. Certification evidence record schema

Every target/gate should emit a record equivalent to:

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

This is a design contract snapshot; align field names with the actual evidence schema before implementation. Never mark a target green if `mocked`, `skipped`, or `executionMode=simulation` is true.

## 8. Exit criteria for universal GO

Universal GO is permitted only when all of the following are true for the same release SHA:

- [ ] All required source, build, type, unit, contract, integration, E2E, security, compatibility and governance gates pass.
- [ ] No unapproved hardcoded endpoints, regions, provider/model IDs, secrets, locale strings, fabricated capabilities, fake success, TODO stubs or production test doubles remain.
- [ ] Real Air Roofers AI authentication, model discovery/registry sync and inference have succeeded against the approved service, with failure modes and policy enforcement tested.
- [ ] Every advertised platform matrix cell is natively qualified and evidence-verifier accepted; otherwise claims are explicitly reduced.
- [ ] AWS physical qualification, rollback and zero-residual cleanup pass on the candidate where required.
- [ ] Evidence bundles are cryptographically bound to the exact commit and environment; no stale evidence or skipped release jobs are counted.
- [ ] UAIGOS lifecycle completed through Certify, Freeze and Handoff with independent review.

Until every mandatory condition is met, the official status remains **HOLD / NO-GO for universal production release**.
