# Ugondu COR Re-audit: Air Roofers AI Activation and Universal Qualification

**Audit date:** 2026-10-23  
**Governance:** UAIGOS 3.0.0 / SEOS evidence-driven lifecycle  
**Repositories:** `Chicitadel/ugondu`, `Chicitadel/platform-core`  
**Decision:** **HOLD — live AI inference and universal qualification are not proven**  
**Scope:** Product AI credential onboarding, AI provider activation, canonical product registry, zero-hardcoding controls, mock/stub/scaffolding controls, E2E qualification, and universal OS/IDE/host certification.

## 1. Executive determination

This audit separates repository evidence, automated contract-test evidence, live service evidence, and certification claims. A successful CI run is meaningful but is not equivalent to authenticated production inference or universal qualification.

### Current repository evidence inspected

- Ugondu branch `phase4/production-hardening` points to `1c0e223fe85f4862a4946eddacb9b81cd6d4053f` at the time of inspection. Its CI/CD pull-request workflow run `39905535554` completed successfully. The run includes release-integrity/governance gates, no-stubs policy, capability/product registry checks, workspace tests, and external evidence/signature checks.
- `platform-core/main` points to `cbda3812cbeea1bbe23c0b6800d184ed888149d9`, a commit that promotes the Ugondu product catalogue entry to RELEASED / GENERAL_AVAILABILITY and declares ten capabilities.
- `tests/qualification/airroofers-ai-credential-canary.test.js` currently contains a fabricated credential constant, a `mockTransport` returning a fabricated HTTP 200 response, a fixed model alias, a fixed model ID expectation, and a fixed `eu-west-3` region. These are valid unit/contract-test techniques when explicitly labelled, but they do not establish live authenticated inference.
- `config/qualification/target-matrix.json` explicitly lists Linux ARM64 and macOS Intel as cross-compiled only; VS Code experimental; JetBrains, Cursor, Windsurf, and Neovim unsupported; GCP and Azure unsupported. The matrix itself therefore contradicts a claim of universal green.
- The user supplied screenshots of `admin.airroofers.eu` showing “Failed to load credentials: Unknown error” and “Failed to issue credential.” These observed browser errors must be reconciled with authenticated API evidence on the same deployed version before portal certification.
- The supplied execution narrative reports successful local tests and remote readbacks, but remote shell/SFTP/CLI attempts in that same narrative repeatedly exited with code 1. The transcript alone is not sufficient to independently verify all remote deployment claims.

## 2. Colour-coded certification dashboard

| Domain | Status | Evidence / exit criterion |
|---|---|---|
| Ugondu CI/CD at inspected SHA | GREEN for that workflow run | Preserve workflow URL, SHA, job and artifact IDs |
| Registry declaration / catalogue promotion | AMBER | Validate canonical SSOT and every deployed read consumer against same version |
| Credential UI | AMBER / FAIL OBSERVED | Browser currently showed load and issue errors; reproduce and verify authenticated HTTP contract |
| AI adapter request construction | GREEN as contract-test evidence only | Keep separate from live inference status |
| Genuine production credential availability | AMBER | Verify secret exists by name and access policy only; never reveal value |
| Authenticated live model discovery | RED / NOT PROVEN | Real service-issued credential, live endpoint, exact-SHA receipt |
| Authenticated live inference | RED / NOT PROVEN | Real request reaches service and returns service-generated inference response |
| Model/provider switching and fallback | RED / NOT PROVEN | At least two real enabled routes, if fallback is advertised; test selection, failure, failover and audit trail |
| Zero hardcoding | AMBER | Static scan plus runtime configuration tests; no silent region/model/provider defaults |
| Zero release-path mocks/stubs | AMBER | CI policy plus build graph and release-artifact inspection |
| OS/architecture universality | RED | Native execution evidence for each advertised target |
| IDE universality | RED | Implement and qualify each advertised IDE or explicitly mark unsupported |
| Host/provider universality | RED | Per-provider, per-operation qualification evidence |
| UAIGOS release sign-off | RED / HOLD | All mandatory gates pass on exact release SHA and evidence is externally pinned |

**Status rule:** no overall GREEN while any mandatory certification row is RED or required live evidence is missing. Cross-compilation does not equal native qualification. A catalogue flag does not prove runtime activation.

## 3. Findings ledger

### COR-AI-001 — Canary is simulated, not live

**Severity:** Critical for AI activation certification  
**Evidence:** `tests/qualification/airroofers-ai-credential-canary.test.js` defines `AIRROOFERS_CANARY_SECRET`, injects `mockTransport`, and returns a hardcoded successful body.  
**Impact:** A passing test can occur with no network call and no valid credential. It cannot support “live inference verified.”

**Remediation**
1. Keep this suite as a clearly named contract/unit suite, not a live canary.
2. Add a separate live-only script that uses `process.env.UGONDU_AIRROOFERS_AI_KEY` and an explicitly configured service base URL.
3. Never place a real key in source, fixtures, logs, test reports, or command-line arguments.
4. Live workflow must be restricted to trusted push/manual dispatch on protected branches; never expose production secrets to fork or untrusted pull-request code.
5. Validate actual model discovery, inference, scope rejection, revocation, timeout, rate limiting, malformed responses, and telemetry correlation.
6. Emit a redacted receipt bound to the exact source SHA, endpoint host, timestamp, status codes, model identifier returned by the service, request/correlation IDs, and output digest—not the prompt or secret unless approved.

### COR-AI-002 — Fixed region/model/test request values violate runtime configurability if reused outside tests

**Severity:** High  
**Evidence:** The canary test uses fixed `region: 'eu-west-3'`, fixed model alias and fixed request identifiers. These values are acceptable only as explicit test fixtures; the production path must not inherit them as defaults.  
**Remediation:** Resolve region, provider, model, tenant, deadline, and data-classification policy from validated runtime input and policy. If region is required and absent or ambiguous, prompt the actor with examples and stop; never silently choose Paris or any other region. Do not log sensitive prompts or raw responses.

### COR-AI-003 — UI provisioning failures remain unresolved by independent live evidence

**Severity:** High  
**Evidence:** Supplied screenshots show both credential-list and issuance errors.  
**Remediation:** In browser DevTools, capture sanitized request URL, method, status, content type, response envelope, correlation ID, and console error. Verify session authentication, CSRF header/body contract, routing, response formatter, catalog path, vault path, file ownership/permissions, and deployed release SHA. Do not expose cookies, CSRF values, bearer tokens, raw keys, or unsanitized HAR files.

**Acceptance:** authenticated list succeeds; issuance succeeds once; raw key is revealed only once; refresh shows only masked key; revoke invalidates immediately; UI errors preserve a safe correlation ID; no secrets appear in logs.

### COR-REG-001 — Catalogue release flags are not capability proof

**Severity:** High  
**Evidence:** `platform-core` commit `cbda381` sets public release and GA fields and declares ten capabilities.  
**Remediation:** Treat registry metadata as declaration, not proof. Each capability must map to an implementation contract, feature gate, test suite, operational health check, and evidence record. The public projection must exclude internal products and secrets. All subdomains consume one authoritative product identity and version; no independent shadow registers.

### COR-QUAL-001 — Universal support claim contradicts target matrix

**Severity:** Critical for universal sign-off  
**Evidence:** `config/qualification/target-matrix.json` marks some targets cross-compiled-only and several IDE/provider targets unsupported.  
**Remediation:** Create a qualification matrix with one row per OS/architecture, IDE, host/provider, and operation. Each supported row must include native runner identity, exact SHA, test run URL, artifact digest, environment fingerprint, and signed result. Unsupported cells remain explicitly unsupported and must fail closed.

### COR-GOV-001 — Certification assertions must be tied to independently verifiable evidence

**Severity:** High  
**Remediation:** Bind every release receipt to the exact Git SHA, test-run IDs, signed artifacts, and externally pinned trust roots. Do not allow repository-local keys to silently become trust anchors. Keep previous failed runs as historical records and do not transfer a green result from an older SHA to a newer candidate.

## 4. Implementation plan

### Phase 0 — Freeze and baseline
- Freeze current candidate SHA and record branch refs for Ugondu and platform-core.
- Preserve current CI run and the observed portal failure as baseline evidence.
- Do not overwrite the test suite that demonstrates the current mock behavior; reclassify it as a contract test.
- Capture current target matrix, release manifest, provider catalog, model catalog, and credential-scope definitions.
- Establish one evidence directory whose receipts are immutable, redacted, and SHA-bound.

**Exit:** reproducible baseline, no untracked claims of production activation.

### Phase 1 — Fix portal provisioning end to end
- Reproduce list and issue errors against the live deployment using authenticated browser requests.
- Normalize API success and error envelopes in one shared client adapter; do not duplicate divergent envelope logic in each UI action.
- Enforce CSRF on mutations, correct HTTP methods, stable typed error codes, and correlation IDs.
- Validate canonical registry loading and credential vault path. Corrupt or unreadable vault must fail closed with an operational error, not silently look like an empty store.
- Store only a strong hash of the raw key; return the raw key once at issuance; never return it on list.
- Use restrictive permissions, atomic replacement, locking against concurrent writes, and validated expiry/scope/rate-limit inputs.
- Add tests for missing/invalid CSRF, 401/403, 404, malformed JSON, corrupt vault, write failure, concurrent issuance, duplicate/revoked credential, expired credential, scope escalation, and response-contract mismatch.

**Exit:** authenticated live UI list/issue/revoke/rotation succeeds with masked readback and no secret leakage.

### Phase 2 — Separate contract tests from real live canary

Suggested live-canary skeleton (keep in a trusted-only workflow; it must never run for forked PRs):

```js
'use strict';

const assert = require('node:assert/strict');

const baseUrl = process.env.UGONDU_AIRROOFERS_AI_BASE_URL;
const apiKey = process.env.UGONDU_AIRROOFERS_AI_KEY;

if (!baseUrl || !apiKey) {
  throw new Error('Live canary requires explicitly configured endpoint and service-issued credential');
}
const endpoint = new URL(baseUrl);
if (endpoint.protocol !== 'https:') {
  throw new Error('Live canary endpoint must use HTTPS');
}
if (!['ai.airroofers.eu', 'ai-staging.airroofers.eu'].includes(endpoint.hostname)) {
  throw new Error('Live canary endpoint host is not allow-listed');
}

async function request(path, init = {}) {
  const response = await fetch(new URL(path, endpoint), {
    ...init,
    redirect: 'error',
    signal: AbortSignal.timeout(10_000),
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
      ...init.headers,
    },
  });
  const contentType = response.headers.get('content-type') || '';
  assert.match(contentType, /application\/json/i, 'AI API must return JSON');
  const body = await response.json();
  return { status: response.status, body };
}

// Use only the documented, live API contract. Do not invent request fields.
// Confirm this endpoint and response schema with the service owner before enabling.
(async () => {
  const models = await request('/v1/ai/models');
  assert.equal(models.status, 200, 'authenticated model discovery must succeed');
  assert.ok(Array.isArray(models.body.models), 'service must return a model list');
  assert.ok(models.body.models.length > 0, 'no enabled model is available');

  // Select a model returned by the service and permitted by policy.
  // The request schema must be taken from the authoritative API specification.
  // Never substitute a fabricated success body or mock transport here.
  console.log(JSON.stringify({
    result: 'MODEL_DISCOVERY_PASS',
    host: endpoint.hostname,
    modelCount: models.body.models.length,
    modelIds: models.body.models.map(m => m.id).filter(Boolean),
    timestamp: new Date().toISOString(),
  }));
})().catch((error) => {
  // Do not print headers, key, prompt, raw body, or unredacted upstream errors.
  console.error(JSON.stringify({
    result: 'LIVE_CANARY_FAIL',
    errorClass: error?.name || 'Error',
    timestamp: new Date().toISOString(),
  }));
  process.exitCode = 1;
});
```

**Important:** the discovery example above is not a substitute for the service's authoritative API contract. Before adding the inference call, verify the exact route, request/response schema, model identifier semantics, required scopes, and permitted data classifications from the actual service source/OpenAPI. Then issue a minimal non-sensitive test inference and assert a service-generated response. Do not infer the schema from a mock.

The workflow must:
- run only on a protected trusted branch or approved manual dispatch;
- require the production secret and fail if absent;
- not execute on forked pull requests;
- use short timeouts and redirect rejection;
- redact outputs;
- upload a receipt without raw secrets or prompts;
- record exact SHA, workflow run, endpoint hostname, returned model ID, status, latency, correlation ID and receipt digest.

### Phase 3 — AI provider/model registry and switching
- Use a canonical provider registry and model catalog; no provider-specific model lists embedded in application code.
- Separate provider adapter interfaces from orchestration, credential resolution, policy enforcement, telemetry, and retry/fallback.
- Make provider/model enablement configuration-driven and environment/tenant/product policy-controlled.
- A disabled or unconfigured route must fail closed with a typed error.
- Only claim fallback when at least two real routes are enabled and both have passed live qualification.
- Test provider timeout, 401/403, 429, 5xx, malformed response, no eligible model, region-policy rejection, and circuit-breaker recovery.
- Avoid unsafe fallback across regions or data-classification boundaries. Every route decision must record policy and redacted outcome.

### Phase 4 — Zero-hardcoding / zero-stub controls
- Distinguish permissible constants (protocol names, security limits, schema versions) from forbidden operational defaults (region, endpoint, provider, model, tenant, credentials, product catalog).
- Static scans must be supplemented by runtime tests proving environment/policy overrides work.
- Keep mock transports in unit-test-only paths. Add CI rules to prevent test fixtures or simulated providers from entering production dependency graphs.
- Fail the release gate if TODO/FIXME placeholders, empty production handlers, canned success responses, fake provider adapters, or unsupported-operation fallbacks return success.
- Each optional feature must be implemented and tested, or explicitly unsupported and fail closed.
- Check generated files, examples, fixtures, documentation commands, and workflow scripts; do not scan only source files.
- Do not prohibit deterministic test fixtures universally; prohibit them from being presented as live evidence or bundled as production behavior.

Example CI assertions:

```bash
set -euo pipefail

node --test tests/qualification/airroofers-ai-credential-canary.test.js
# Keep this command labelled as contract/unit tests only.
# Live inference must run in a separate trusted workflow.

git diff --check
npm run lint
npm run typecheck
npm test
npm run build
```

Use only scripts that actually exist in the repository; if a script is absent, add it deliberately rather than assuming the command is available.

### Phase 5 — Native OS / IDE / host qualification
For every matrix cell:
1. Provision a native runner or real target environment.
2. Record OS version, architecture, runtime versions, dependencies, and exact SHA.
3. Run install, configure, discover, preflight, provision, verify, repair, rollback, and cleanup where applicable.
4. Test interrupted execution, retry/resume, idempotency, permission denial, network loss, and cleanup safety.
5. Store logs with secret redaction and artifact digests.
6. Mark the cell GREEN only after independent evidence is attached.

Targets currently marked cross-compiled-only or unsupported must remain AMBER/RED. For GCP/Azure, either implement and qualify the provider or leave it unsupported; do not relabel as supported because a generic adapter compiles.

### Phase 6 — UAIGOS release gate
- Discover → Classify → Plan → Execute → Verify → Certify → Freeze → Handoff.
- Maintain a requirements-to-code-to-test-to-evidence traceability matrix.
- Pin trust roots externally; fail closed if absent or invalid.
- Bind the evidence manifest to the exact release SHA and artifacts.
- Run a clean-room reproduction from a fresh checkout.
- Independent reviewer checks the receipts, target matrix, known exceptions, secret hygiene, rollback and revocation.
- Publish certification status from machine-verifiable evidence rather than manually authored claims.

## 5. Mandatory acceptance criteria

### AI
- [ ] Secret is a genuine service-issued credential stored only in approved secret storage.
- [ ] Authenticated live `GET /v1/ai/models` succeeds and returns service-generated models.
- [ ] Authenticated live inference succeeds against a model ID returned by discovery.
- [ ] Missing, invalid, revoked, expired, and insufficient-scope credentials fail closed.
- [ ] Provider/model switch is demonstrated with real enabled routes; fallback is not claimed otherwise.
- [ ] Logs and receipts contain no raw key, authorization header, prompt, or sensitive response.

### Admin portal
- [ ] Credential list loads in the live browser.
- [ ] Issuance, one-time reveal, masked listing, revocation and rotation all work.
- [ ] CSRF and RBAC failures are correct and observable.
- [ ] Corrupt/unavailable vault produces a typed operational failure, never a false empty success.
- [ ] Registry count and selector come from the same authoritative registry version.

### Governance / universality
- [ ] Every supported OS/architecture has native execution evidence.
- [ ] Every supported IDE and provider has a real operation-level test matrix.
- [ ] Unsupported targets are clearly labelled and fail closed.
- [ ] No operational region/model/provider/product hardcoding.
- [ ] No production mocks, canned responses, incomplete handlers or scaffolding.
- [ ] CI is green on the exact release SHA.
- [ ] Signed, externally verifiable evidence manifest is present.
- [ ] Independent reviewer approves the UAIGOS lifecycle and release gate.

## 6. References

### Repository evidence
- Ugondu inspected commit: https://github.com/Chicitadel/ugondu/commit/1c0e223fe85f4862a4946eddacb9b81cd6d4053f
- CI run: https://github.com/Chicitadel/ugondu/actions/runs/39905535554
- AI credential runbook: https://github.com/Chicitadel/ugondu/blob/phase4/production-hardening/docs/security/AIRROOFERS_AI_CREDENTIAL_PROVISIONING.md
- Canary contract test: https://github.com/Chicitadel/ugondu/blob/phase4/production-hardening/tests/qualification/airroofers-ai-credential-canary.test.js
- Target matrix: https://github.com/Chicitadel/ugondu/blob/phase4/production-hardening/config/qualification/target-matrix.json
- platform-core registry commit: https://github.com/Chicitadel/platform-core/commit/cbda3812cbeea1bbe23c0b6800d184ed888149d9

### Security and engineering references
- OWASP ASVS: https://owasp.org/www-project-application-security-verification-standard/
- OWASP Secrets Management Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html
- GitHub Actions security hardening: https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions
- GitHub encrypted secrets: https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions
- NIST SSDF SP 800-218: https://csrc.nist.gov/pubs/sp/800/218/final

## 7. Final sign-off

**Current decision: HOLD.** Repository CI is green for the inspected workflow run, but the available canary is simulated and the committed target matrix explicitly lists unsupported and cross-compiled-only cells. Do not claim “live AI fully activated,” “100% operational,” or “universality green” until the mandatory acceptance criteria pass with redacted, exact-SHA, independently verifiable evidence.
