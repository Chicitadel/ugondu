# Ugondu COR Re-audit — Evidence Delta and Universal Certification Status

**Audit record:** `UG-COR-REAUDIT-2026-10-22T1327Z`  
**Repository:** [Chicitadel/ugondu](https://github.com/Chicitadel/ugondu)  
**Audit branch:** `phase4/production-hardening`  
**Reviewed change:** [`e3e09024247af05f199e60bbb06f7e3d36995293`](https://github.com/Chicitadel/ugondu/commit/e3e09024247af05f199e60bbb06f7e3d36995293)  
**Decision:** **HOLD / NO-GO for universal production certification**  
**Scope:** Evidence reconciliation, AI provider activation, zero-hardcoding, localization, model lifecycle, anti-stub governance, and platform certification. This is a source-and-CI evidence review, not a claim that the auditor has made a live inference call to the provisioned AI service.

## 1. Executive decision

The reviewed commit makes meaningful progress: the Air Roofers AI catalogue entry now has an empty `defaultEndpoint`, the adapter includes a model-discovery method, and COR certification in workflow run [39785830839](https://github.com/Chicitadel/ugondu/actions/runs/39785830839) completed successfully for its candidate. The cross-platform/workspace run [39785809932](https://github.com/Chicitadel/ugondu/actions/runs/39785809932) also reports successful builds and integration tests for the jobs listed below.

These results do **not** support a universal green sign-off:

1. The latest inspected Air Roofers AI code still has English fallback strings after localization-token lookups (for example, `__t('ai.error.endpoint_required') || '…'`). A missing translation can therefore silently fall back to hardcoded English.
2. The provider adapter resolves `process.env[envVar] || provider?.defaultEndpoint`. The Air Roofers AI catalogue value is empty, so this particular provider fails closed when not configured. However, the catalogue still contains literal endpoints, region IDs, account references, and region lists for other providers. Repository-wide zero-hardcoding is therefore not proven.
3. `discoverModels()` constructs `GET /v1/ai/models` and inference constructs `/v1/ai/execute`. Source code proves that a request path is implemented; it does not prove that these are the provisioned service's canonical contract or that a real authenticated call succeeds. The service owner must confirm the contract and a live staging test must retain sanitized evidence.
4. The target matrix contains 22 profiles: 1 marked `supported`, 21 marked `experimental`, and 0 marked `unsupported`. A passing evidence-validator test proves the validator's behavior, not native execution of every target.
5. Workflow run 39785830839 showed COR Certification successful while AWS Physical Qualification Gate was still `in_progress` at the time of this inspection. Do not record the physical gate as passed until the run reaches a terminal successful conclusion and its artifacts/cleanup evidence are reviewed.
6. Workflow run 39785809932 showed Docker image validation and Build & Publish Release as `skipped`. Those jobs are not passes and do not prove that a release was published.

## 2. Colour-coded progress ledger

Legend: 🟢 verified for the stated scope; 🟡 partial or mechanism-only; 🔴 open/blocking; ⚪ skipped/not evidenced.

| Gate | Status | Evidence / reason | Required close-out |
|---|---|---|---|
| COR Certification workflow | 🟢 Candidate-specific | Run 39785830839: COR Certification job completed successfully, including exact-candidate and evidence-integrity steps. | Preserve artifacts and confirm candidate SHA matches intended release SHA. |
| Workspace builds and tests | 🟢 Run-specific | Run 39785809932 reports successful workspace builds, type checks, tests, integration tests, and release-integrity/governance gate. | Re-run on final candidate after any remediation. |
| Linux/macOS/Windows thin-client builds | 🟢 Build-only | Linux amd64/arm64, macOS amd64/arm64, Windows amd64 build jobs passed in run 39785809932. | Native runtime tests remain required; builds are not universal runtime certification. |
| AWS physical qualification | 🟡 In progress at inspection | Run 39785830839 AWS job was still running physical certification; Fargate and zero-residual steps were pending. | Recheck terminal result; inspect logs/artifacts and verify cleanup. |
| Docker image validation | ⚪ Skipped | Run 39785809932 job conclusion was `skipped`. | Run the job for the candidate and retain output. |
| Release publication | ⚪ Skipped | Build & Publish Release job conclusion was `skipped`. | Run the actual tagged-release publish workflow and verify artifacts/checksums. |
| Air Roofers AI endpoint fail-closed | 🟢 Partial, provider-specific | Air Roofers catalogue `defaultEndpoint` is empty; adapter requires endpoint configuration if neither environment nor catalog supplies a value. | Add tests for blank, whitespace, malformed, insecure, disallowed host, redirect and secret-redaction cases against the exact SHA. |
| Global zero-hardcoding | 🔴 Open | Other catalogue providers still embed endpoints, account references, region lists and region IDs. | Replace runtime facts with governed external config/provider discovery; scan all tracked executable/configuration sources and classify approved policy constants. |
| Fully localized diagnostics | 🔴 Open | Several token lookups retain English `|| 'fallback'` expressions in provider code. | Require complete locale token coverage and fail closed on missing tokens; remove user-facing hardcoded fallback sentences. |
| Live AI health + inference | 🔴 Open | No verified real authenticated request/response to the provisioned API was established by this audit. | Run a staging smoke test with approved secret handling and retain sanitized request metadata, response schema, latency, correlation ID and outcome. |
| Live model discovery/lifecycle | 🟡 Implementation present; live proof open | Adapter contains `discoverModels()` and a model-list request path, but live contract, refresh, deprecation, and policy checks are unproven. | Confirm API contract with service owner; validate schema/provenance; test refresh, retirement, policy review, canary, drain and rollback. |
| Anti-stub governance | 🟡 Test claims need exact-SHA artifact binding | Repository reports adversarial anti-stub tests; this audit did not independently reproduce every test from a clean local checkout. | Ensure CI runs mutation tests on candidate SHA and fails on each injected violation; retain test report and SHA. |
| Universal platform matrix | 🔴 Open | 22 targets: 1 supported, 21 experimental. | Native evidence for each mandatory matrix cell, exact-SHA binding, host/provider integration, and actor-mode parity. |
| Universal production sign-off | 🔴 HOLD | Multiple mandatory gates remain open or skipped. | No GO until all blocking gates close and independent governance authority signs. |

## 3. Source findings and exact remediation

### 3.1 Air Roofers AI endpoint resolution

Current source pattern observed in `server/engine-core/src/ai/airroofers-provider.ts`:

```ts
const rawUrl = process.env[envVar] || provider?.defaultEndpoint;
if (!rawUrl) {
  throw new AiGatewayError(
    'AIRROOFERS_AI_ENDPOINT_REQUIRED' as any,
    __t('ai.error.endpoint_required') ||
      'Air Roofers AI endpoint configuration is required; fallback to hardcoded default is prohibited by zero-hardcoding governance',
    500,
    { providerId: this.providerId, envVar },
  );
}
```

The empty catalogue default is a useful fail-closed improvement for the Air Roofers AI entry. However, the `|| '…'` expression remains a literal diagnostic fallback. A missing locale key should be a validation failure in CI, not a runtime excuse to emit hardcoded English.

Required behavior:

- Resolve the base URL only from actor/deployment-supplied configuration or a governed secret/configuration provider.
- Never infer a region or silently substitute an endpoint.
- Validate scheme, hostname, port, redirects, credentials, and egress policy before sending secrets.
- Keep stable machine-readable error codes separate from translated presentation messages.
- Fail startup or fail the relevant operation if the required locale key is absent.
- Do not log tokens, raw credentials, prompts, personal data, or full sensitive URLs.

Recommended design snapshot (adapt to repository interfaces; do not paste as an unreviewed replacement):

```ts
type AiEndpointConfig = {
  baseUrl: string;
  source: 'actor-input' | 'deployment-config' | 'governed-registry';
  revision: string;
};

async function resolveAiEndpoint(
  providerId: string,
  actor: { id: string; permittedProviderIds: readonly string[] },
  config: GovernedEndpointResolver,
): Promise<AiEndpointConfig> {
  if (!actor.permittedProviderIds.includes(providerId)) {
    throw new PolicyDeniedError('AI_PROVIDER_NOT_PERMITTED');
  }

  const resolved = await config.resolveRequiredEndpoint({ providerId, actorId: actor.id });
  if (!resolved) throw new ConfigurationRequiredError('AI_ENDPOINT_REQUIRED');

  const url = new URL(resolved.baseUrl);
  if (url.protocol !== 'https:') throw new ConfigurationError('AI_ENDPOINT_HTTPS_REQUIRED');
  if (url.username || url.password) throw new ConfigurationError('AI_ENDPOINT_CREDENTIALS_FORBIDDEN');
  if (!await config.isApprovedEgressHost(providerId, url.hostname)) {
    throw new PolicyDeniedError('AI_ENDPOINT_HOST_NOT_APPROVED');
  }

  return {
    baseUrl: url.toString().replace(/\/$/, ''),
    source: resolved.source,
    revision: resolved.revision,
  };
}
```

The authoritative resolver and policy interfaces must be implemented using existing project contracts. Do not accept a permissive hostname suffix check as the sole security boundary.

### 3.2 Strict zero-hardcoding is a repository-wide requirement

The Air Roofers entry in `config/model-catalog.json` now has an empty `defaultEndpoint`. The same catalogue still contains literal endpoint URLs for other providers, account-reference strings, and fixed region lists. The catalogue also contains an `allowedRegions` list. An empty endpoint for one provider does not prove a global zero-hardcoding guarantee.

Required remediation:

1. Separate executable logic from runtime deployment facts and policy constants.
2. Move provider endpoints, account/tenant identifiers, region inventory, quotas, and deployment-specific values to a governed external configuration/registry.
3. Retain only explicitly approved, non-secret protocol constants in source, with an allowlisted justification and owner.
4. Region selection must accept a region ID or understandable name/country/city label, resolve it through authoritative provider metadata, show a clarification prompt when ambiguous or missing, and never silently choose a default.
5. Ensure CI tests the **semantics** of this behavior, not merely regexes that look for specific strings.

Example actor interaction contract:

```text
Region not specified.
Choose a deployment region by entering a provider region ID or a city/country name.
Examples: eu-west-3, Paris, France.
No region will be selected until the actor confirms a valid permitted option.
```

### 3.3 Localization

The current adapter includes token lookups with English fallback literals for endpoint, authentication, rate-limit, upstream, timeout, network, and malformed-output errors. Locale key parity is valuable but does not remove the fallback code.

Remediation requirements:

- Make locale validation fail when any required diagnostic token is absent from any supported locale.
- Replace provider-facing literal fallback messages with typed error codes and boundary-level localization.
- Keep logs machine-readable and user-facing messages localized.
- Add tests that intentionally remove one key and prove the build or governance gate fails.
- Test locale selection, fallback locale policy, interpolation safety, RTL behavior, and all 12 declared locales.

### 3.4 Model discovery and safe lifecycle

The adapter contains `discoverModels()` and constructs `GET /v1/ai/models`; inference code constructs `/v1/ai/execute`. These routes must be confirmed against the provisioned API contract before treating the integration as live.

Required sequence:

1. Obtain the API owner's canonical OpenAPI/schema or written contract, including auth mechanism, health route, model-list route, inference route, rate limits, error shapes, and versioning.
2. Configure the endpoint and credential through approved deployment secrets; never commit the credential.
3. Run an authenticated staging health request.
4. Run one minimal real inference using an approved non-sensitive prompt and a known permitted model.
5. Validate response shape, usage/quota metadata, request correlation, latency, timeout behavior, and redaction.
6. Exercise 401/403, 429, 5xx, timeout, malformed response, unavailable/retired model, quota exhaustion, and policy denial.
7. Prove model discovery and refresh against the live service. If the service has no model-list contract, use an explicitly approved registry synchronization process rather than inventing an undocumented endpoint.
8. Require policy/security/residency review before canary enablement. Then stage rollout, observe, drain, deprecate, and retire. Never auto-enable an unreviewed replacement. Fail closed when no policy-compatible model exists.

A mock transport is appropriate for isolated unit/contract tests, but it is not evidence of a real provider E2E pass. Label both evidence types separately.

### 3.5 Anti-stub, fake-success, and scaffolding governance

The anti-stub suite and static repository validator are useful controls, but they must be tied to the exact release candidate and adversarial mutation evidence. A passing search or count alone cannot establish semantic completeness.

Required negative tests must inject and reject:

- production imports of test mocks, fixtures, fake providers, and deterministic test adapters;
- no-op mutation methods and swallowed provider errors;
- fake-success results such as `{ applied: true }` without an actual provider operation;
- constant-success verification, fabricated identity/account/tenant values, empty-but-successful evidence, and matching-diff shortcuts;
- skipped required E2E gates, dry-run paths marked as live success, and test-only transport selected in production;
- placeholder/TODO/scaffold implementations reachable from production entry points.

Every provider mutation must be followed by authoritative read-after-write verification. If the provider cannot confirm the state, return an explicit unverified/failure result, never a fabricated success. Maintain a reviewed exception registry for any intentional scaffolding that is not executable in production, with owner, reason, and expiry.

### 3.6 Universal platform certification

Current `config/qualification/platform-matrix.json` contains 22 profiles: 1 `supported`, 21 `experimental`. This is truthful partial support, not universal green.

Each mandatory target must be qualified across the dimensions applicable to it:

- OS and architecture;
- supported runtime/toolchain and shell;
- installation, upgrade, uninstall and rollback;
- UI, terminal, IDE, CI/CD and API entry points;
- model-assisted and non-model-assisted operation;
- cloud/provider, container, shared hosting, SSH/SFTP, and repository host where advertised;
- identity/auth mode, permissions, region input and data-residency enforcement;
- offline/timeout/retry behavior, resumability, state integrity and recovery;
- localization, accessibility and secure secret handling.

Build/compile success is not runtime qualification. Cross-compilation is not a native execution test. A provider listed in a matrix is not certified just because a generic unit test passes.

For every cell, retain: candidate SHA, runner/host identity, OS/runtime versions, exact command, start/end timestamp, result, log/artifact references and hashes, environment fingerprint, test class (native/live/mock), cleanup result, reviewer, and expiry/revalidation policy. Promote a cell only when the evidence verifier validates all required fields. Universal status remains red until all required cells are green.

## 4. Exact verification commands

Run these from a clean checkout of the intended candidate SHA. First inspect `package.json` and workspace scripts so command names are confirmed against the current branch.

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
```

For the specifically referenced tests, run them using the actual package manager/workspace conventions declared by the repository:

```bash
node --test tests/ai-inference-gateway.test.js
node --test tests/qualification/adversarial-anti-stub.test.js
node --test tests/qualification/platform-evidence.test.js
node --test tests/qualification/universal-region-selection.test.js
node scripts/validate-locales.js
node scripts/governance/validate-repository.mjs
```

Do not run destructive cloud qualification without confirming script help, authorized isolated account, actor-selected region, budget/cost ceiling, tagging, rollback and cleanup. Do not claim these commands were executed by this audit; they are the prescribed execution sequence.

### Live AI staging evidence checklist

- [ ] API owner confirms canonical API contract and supported model discovery method.
- [ ] Staging base URL provided by deployment configuration, not hardcoded.
- [ ] Credential retrieved from secret manager; never printed or committed.
- [ ] Authenticated health request succeeds.
- [ ] One real inference succeeds and response schema validates.
- [ ] Model discovery/refresh succeeds against the actual API or approved registry sync.
- [ ] Auth/rate-limit/5xx/timeout/retired-model/policy-denial scenarios verified.
- [ ] Kill switch, quota, data residency, correlation, telemetry and redaction verified.
- [ ] Sanitized evidence bundle tied to the exact candidate SHA is retained.
- [ ] Independent reviewer signs the evidence.

## 5. Evidence and release controls

A release gate must reject evidence when the candidate SHA differs, a required job is skipped, a test is mocked when live evidence is required, evidence is stale, a log/artifact is missing, or cleanup cannot be proven.

The workflow results observed during this review:

- Run [39785809932](https://github.com/Chicitadel/ugondu/actions/runs/39785809932): thin-client builds, workspace build/test jobs, integration tests and release integrity/governance passed; Docker image validation and Build & Publish Release were skipped.
- Run [39785830839](https://github.com/Chicitadel/ugondu/actions/runs/39785830839): COR Certification passed; AWS Physical Qualification Gate was still in progress at inspection. Its final outcome must be rechecked.
- Commit [e3e09024247af05f199e60bbb06f7e3d36995293](https://github.com/Chicitadel/ugondu/commit/e3e09024247af05f199e60bbb06f7e3d36995293) includes a meaningful configuration/localization/discovery change, but source presence and a COR job pass do not establish real AI E2E or universal target certification.

## 6. Final certification rule

**Current disposition: HOLD / NO-GO for universal production release.**

Do not mark universality green until all of the following are evidenced on the same release candidate:

- global zero-hardcoding audit and actor-driven region resolution pass;
- all required locale keys are present and no user-facing hardcoded fallback messages remain;
- real authenticated Air Roofers AI health, model discovery, inference and failure-path E2E pass;
- anti-stub/fake-success mutation tests fail closed and their CI evidence is retained;
- all mandatory OS/platform/IDE/host/provider/mode matrix cells have native/live evidence as applicable;
- AWS physical qualification reaches terminal success and cleanup is verified;
- Docker validation and release publication execute rather than skip;
- artifact signatures, hashes, provenance, rollback and retention are verified;
- independent governance authority reviews and signs the final evidence bundle.

This document is an evidence delta, not a declaration that all COR findings are closed. Keep the progress table current and record every change against a specific commit SHA to prevent regressions.
