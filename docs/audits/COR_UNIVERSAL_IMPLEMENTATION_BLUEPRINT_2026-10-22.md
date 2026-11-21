# Ugondu COR Universal Readiness — Implementation Blueprint and Remediation Runbook

**Audit checkpoint:** 2026-10-22 18:23 UTC  
**Repository:** `Chicitadel/ugondu`  
**Branch:** `phase4/production-hardening`  
**Observed HEAD at audit start:** `220457f6d661ed5849c140555109f9a76f8afe0f`  
**Disposition:** 🔴 **HOLD — NOT UNIVERSALLY CERTIFIED**  
**Purpose:** Evidence-led remediation plan for COR gaps, live Air Roofers AI activation, universal platform qualification, no-hardcoding/no-stub governance, real E2E, regression prevention, and release sign-off.

> This document is a plan and evidence ledger, not a claim that the listed remediation has already been implemented. A status is green only when fresh evidence is bound to the exact candidate SHA. Never mark a target green merely because it is listed in a registry, compiles, cross-compiles, or passes a mock-backed test.

## 1. Executive findings

### 1.1 Verified at this checkpoint

- The branch endpoint reported HEAD `220457f6d661ed5849c140555109f9a76f8afe0f`.
- CI/CD push run [39827082415](https://github.com/Chicitadel/ugondu/actions/runs/39827082415) completed successfully on that SHA.
- CI/CD pull-request run [39827097594](https://github.com/Chicitadel/ugondu/actions/runs/39827097594) completed successfully on that SHA.
- Brand asset audit [39827097538](https://github.com/Chicitadel/ugondu/actions/runs/39827097538) completed successfully on that SHA.
- COR run [39827082703](https://github.com/Chicitadel/ugondu/actions/runs/39827082703) was **in progress** at the time of the query; do not call it passed until a completed result is fetched.
- The branch API reported `protected=false` and `protection.enabled=false`: branch protection is a confirmed governance gap.
- Earlier physical AWS qualification passed on candidate `096668776b65d4fd28135dd08efc38aac3116cf3` in [run 39821632890](https://github.com/Chicitadel/ugondu/actions/runs/39821632890). This is historical, SHA-bound evidence and does not automatically certify HEAD `220457f6...`.
- Prior observation of `https://ai.airroofers.eu/health` returning HTTP 200 and unauthenticated model-catalog access returning HTTP 401 shows reachability and an authentication boundary only. It is **not** proof of authenticated inference or model switching.

### 1.2 Open release blockers

1. Authenticated, live inference through the actual `ai.airroofers.eu` API, with a redacted receipt bound to the candidate SHA.
2. Live model discovery, controlled switching, and fallback across at least two genuinely available approved routes; do not count test doubles as providers.
3. Native runtime qualification for every claimed OS/architecture combination, including native runners for any cells currently supported only by cross-compilation.
4. Real provider/host/IDE operation coverage for each advertised capability. Registry entries and compile success are not evidence of runtime support.
5. Enable branch protection/rulesets and required checks/reviews.
6. Complete the current-head COR run, then re-run required gates after the final code change. Obtain independent second-party COR sign-off.
7. Preserve an evidence ledger that distinguishes PASS, PARTIAL, BLOCKED, UNSUPPORTED, NOT RUN, and FAIL.

## 2. Certification status table

| Domain | Status | Evidence at checkpoint | Required to turn green |
|---|---|---|---|
| CI/CD on HEAD `220457f6` | 🟢 PASS | [Push run 39827082415](https://github.com/Chicitadel/ugondu/actions/runs/39827082415); [PR run 39827097594](https://github.com/Chicitadel/ugondu/actions/runs/39827097594) | Re-run all required jobs on final candidate SHA |
| Brand asset integrity | 🟢 PASS | [Run 39827097538](https://github.com/Chicitadel/ugondu/actions/runs/39827097538) | Keep as required check and re-run on final SHA |
| COR certification on HEAD | 🟠 RUNNING at last observation | [Run 39827082703](https://github.com/Chicitadel/ugondu/actions/runs/39827082703) | Fetch final jobs/results; resolve every failed, skipped, or missing required gate |
| AWS physical lifecycle | 🟠 HISTORICAL SHA ONLY | [Run 39821632890](https://github.com/Chicitadel/ugondu/actions/runs/39821632890) on `09666877...` | Fresh physical evidence on final candidate or approved, independently verified immutable artifact equivalence |
| Zero hardcoding / anti-stub | 🟢 CHECKPOINT SUITE PASS; continuous gate required | Earlier governance ledger reports 5/5 governance sub-gates and anti-stub suites passing; revalidate final SHA | Whole-repository scans, mutation tests, production/test boundary checks, no expired exceptions |
| Air Roofers AI authenticated inference | 🔴 OPEN | Health and unauthenticated 401 are insufficient | Real authenticated canary against the documented API contract |
| Real multi-model switching/fallback | 🔴 OPEN | Catalog/adapter tests do not prove live route execution | Two or more real enabled routes; actual switch, fallback, provenance and negative tests |
| OS/architecture universality | 🟠 PARTIAL | Existing matrix; Windows native evidence reported, some targets cross-compiled only | Native runtime test on each declared target or explicit unsupported status |
| IDE/host/provider universality | 🟠 PARTIAL | Registry and adapter tests are not full runtime certification | Real capability tests for every advertised operation/integration |
| Branch protection / required reviews | 🔴 GAP CONFIRMED | Branch API reports protection disabled | Ruleset/protection configured and re-read to verify required checks/reviews |
| Independent COR sign-off | 🔴 OPEN | No independent sign-off receipt in current evidence snapshot | Second-party review of exact-SHA manifest and all P0/P1 findings |
| **Overall** | **🔴 HOLD** | Several gates are green, but critical operational and governance gates remain open | All mandatory gates green on one exact candidate SHA |

## 3. Governance rules: no false-green certification

The following rules are mandatory and fail closed:

1. **No universal status by aspiration.** The requested outcome is universal support, but status can be green only after target-bound proof. If a target cannot be tested, it remains PARTIAL/BLOCKED or UNSUPPORTED.
2. **No source-code hardcoded environment decisions.** No fixed AWS region, cloud account, host, endpoint, provider/model identifier, user-specific path, locale, architecture, or credential. Runtime defaults may only be neutral and explicitly documented; region/account/host choices are actor-supplied or interactively resolved. Missing or ambiguous destructive-deployment context must stop before mutation.
3. **No fake implementation.** Production code must not contain no-op success handlers, empty command bodies, TODO-as-functionality, hardcoded “successful” provider responses, fixture transports, fake resource identifiers, canned AI responses, or silently substituted adapters.
4. **Mocks are test-only and visibly named.** A unit test may use a fake adapter to isolate a unit; such a test must never be reported as provider E2E. Production dependency injection must resolve only the real adapter or fail closed.
5. **No scaffolding masquerading as a feature.** Every advertised command/UI/API capability must map to a reachable handler, authorization policy, operation implementation, durable state transition, result/error model, and behavioral tests.
6. **No skipped-gate success.** Required job skipped, missing runner, absent secret, absent artifact, zero assertions, swallowed exception, empty report, or stale evidence cannot become PASS.
7. **SHA-bound evidence.** Every certificate, test report, artifact digest, native result, live receipt, and cleanup report identifies the exact commit SHA. Any code change invalidates affected evidence unless a documented equivalence policy is independently approved.
8. **Unsupported means safe no-op.** An unsupported capability must return a structured `UNSUPPORTED_CAPABILITY` result before side effects; test that no resource was created or mutated.
9. **Evidence must be reproducible.** Capture command, tool/runtime versions, host/architecture, exit code, timestamps, workflow URL, artifact digest, and sanitized output.
10. **Line limit.** Keep each source, test, configuration, and governance document within the repository's 500-line ceiling where that policy applies; split by responsibility rather than compressing unreadable logic.

## 4. Phase plan and exit criteria

### Phase 0 — Freeze and identify the candidate (P0)

**Actions**
- Fetch origin, record branch, HEAD, clean/dirty state, and merge base.
- Record the exact code SHA and all relevant workflow IDs.
- Do not start duplicate physical cloud tests while a run is active.
- Save the pre-change dashboard and evidence manifest for regression comparison.

**Commands**
```bash
git fetch origin --prune
git status --short
git branch --show-current
git rev-parse HEAD
git rev-parse origin/phase4/production-hardening
git diff --stat
```

**Exit:** working tree state and exact candidate are recorded; no ambiguity between documentation SHA and code candidate.

### Phase 1 — Complete current COR and CI evidence (P0)

- Re-fetch [COR run 39827082703](https://github.com/Chicitadel/ugondu/actions/runs/39827082703) and inspect every job, not just the top-level conclusion.
- Confirm CI/CD and brand audit success for the same candidate SHA.
- Inspect logs for skipped, conditionally bypassed, or “continue-on-error” required steps.
- Archive immutable evidence artifacts and record their digests.
- If any change is made after this run, rerun affected gates on the new SHA.

**Exit:** current candidate has a complete, successful required-job set and verifiable artifact/evidence receipts.

### Phase 2 — Repository-wide zero-hardcoding and anti-stub enforcement (P0)

Audit all production source, scripts, templates, workflows, installers, UI handlers, CLI commands, configuration schemas, locale files, provider adapters, and release packaging.

**Required scan categories**
- Fixed deployment regions, account IDs, ARNs, public IPs, machine-specific absolute paths and hostnames.
- Provider/model names or endpoint URLs outside the governed catalog/config boundary.
- Credentials, token-like literals, embedded private keys, and test secrets.
- Placeholder handlers, empty functions, unconditional success returns, TODO/FIXME feature gaps, canned AI results, fixture imports in production, no-op rollback/cleanup.
- Fake resource IDs, hardcoded “green” certification booleans, empty test bodies, vacuous assertions, tests that only assert file/symbol existence.
- Production bundle inclusion of test fixtures and mock transports.
- Hardcoded UI strings, locale fallback masking missing translations, duplicate or mismatched locale keys.
- Capability declarations without a real handler and test reference.

**Required remediation**
- Use typed configuration schemas with validation and provenance.
- Resolve region by actor input or guided selection; accept human-friendly location/name and canonical identifier only after deterministic resolution. Never silently choose a deployment region.
- Use provider/model catalogs and policy records as the only source of supported model metadata.
- Replace blanket boolean capability flags with evidence-linked status objects.
- Add mutation tests that inject a hardcoded region, endpoint, fake success, mock import, vacuous test, and skipped required gate; each mutation must make the gate fail.
- Any allowlist entry must include reason, owner, expiry/review date, and narrow path/symbol scope. Expired or unowned exceptions fail CI.

**Illustrative enforcement shape — adapt to the repository's existing validator API**
```js
const forbidden = [
  { id: "fixed-region", pattern: /\b(?:eu-west-3|us-east-1)\b/ },
  { id: "fake-success", pattern: /return\s+\{\s*(?:ok|success)\s*:\s*true\s*\}/ },
  { id: "placeholder", pattern: /\b(?:TODO_IMPLEMENT|STUB_IMPLEMENTATION|MOCK_SUCCESS)\b/ },
];

for (const file of productionFiles) {
  const text = await readFile(file, "utf8");
  for (const rule of forbidden) {
    if (rule.pattern.test(text) && !approvedNarrowException(file, rule.id)) {
      failures.push({ file, rule: rule.id });
    }
  }
}
if (failures.length) {
  reportFailures(failures);
  process.exitCode = 1;
}
```

This snippet illustrates policy intent only; do not paste it as a replacement without integrating with the actual repository's file enumeration, parser, exceptions, and test framework. Avoid simplistic global regexes as the sole proof: use syntax-aware checks for source and explicit config schemas for known values.

**Exit:** full repository scan and mutation suite pass on the candidate SHA; no unowned/expired exception; production build excludes test-only adapters.

### Phase 3 — Activate the real Air Roofers AI API (P0)

**Design requirement**
- Ugondu uses a single provider-neutral inference gateway and catalog/registry. The Air Roofers API is the central integration already provisioned; it must be actually activated, not merely represented by an adapter.
- All UI, CLI, IDE, automation, and headless/CI paths call the same gateway/policy layer; no individual entrypoint bypasses authentication, authorization, redaction, quotas, or model policy.
- Catalog addition should not require source-code edits when a model conforms to the documented central API contract. Unknown models remain disabled until schema, policy, and provider readiness are verified.
- Secrets come from the approved secret broker/environment injection and must never be committed, printed, persisted in local config, or embedded in artifacts.

**Required sequence**
1. Read the actual API contract and supported auth scheme from the Air Roofers service specification; do not infer payload fields from endpoint names.
2. Validate base URL, TLS, auth scheme, timeouts, request limits, model allowlist, response schema, error mapping, and trace/correlation IDs.
3. Add/verify ephemeral secret injection using `UGONDU_AIRROOFERS_AI_KEY` in a protected CI environment. Do not create a long-lived token in source or commit settings.
4. Execute one non-sensitive canary using a request file validated against the documented API schema.
5. Verify HTTP status, response schema, provider/model identity, request correlation, actual inference completion, usage/quota metadata where exposed, and redaction. Store only a sanitized receipt.
6. Execute a second approved route and prove explicit model switching. Trigger controlled failure on the primary route and prove policy-governed fallback to the second route. The receipt must identify the route actually used.
7. Test missing/expired credential, invalid signature/token, disabled model, invalid request, timeout, rate limit, upstream 5xx, malformed response, no eligible model, and egress denial. All must fail closed without leaking secrets or returning fabricated output.
8. Prove model/provider selection is configuration/policy-driven and is visible in logs/receipts without exposing sensitive prompt or secret material.
9. Run the same behavior through UI, CLI, API and any advertised IDE/automation entrypoints, with parity tests.

**Live-canary shell template**
```bash
set -euo pipefail
: "${UGONDU_AIRROOFERS_AI_BASE_URL:?Set the approved API base URL in the protected environment}"
: "${UGONDU_AIRROOFERS_AI_KEY:?Inject a short-lived credential through the secret broker}"
: "${UGONDU_AI_CANARY_REQUEST:?Path to a schema-validated non-sensitive canary request}"

# The request file MUST conform to the actual service contract.
# Do not enable shell tracing; do not print the Authorization header or response body.
status="$(
  curl --silent --show-error     --connect-timeout 10 --max-time 60     --output ai-canary-response.json     --write-out '%{http_code}'     --request POST "${UGONDU_AIRROOFERS_AI_BASE_URL%/}/v1/ai/execute"     --header "Authorization: Bearer ${UGONDU_AIRROOFERS_AI_KEY}"     --header 'Content-Type: application/json'     --data-binary "@${UGONDU_AI_CANARY_REQUEST}"
)"
printf 'AI canary HTTP status: %s\n' "$status"
test "$status" -ge 200 && test "$status" -lt 300
# Next: validate response schema, provider/model identity, correlation ID,
# and real inference semantics with the repository's contract-aware verifier.
# Do not print raw response bodies or store them without redaction.
```

This template assumes Bearer authentication only as an example. Confirm the actual auth scheme before use; if the API contract specifies another scheme, implement that scheme instead. The endpoint path above must also be verified against the live API contract before the workflow is enabled. Never add a guessed request body to the repository.

**Evidence receipt minimum**
```json
{
  "schemaVersion": "1.0",
  "candidateSha": "<full-git-sha>",
  "workflowRun": "<run-url>",
  "environment": "protected-live-canary",
  "endpointContractVersion": "<verified-contract-version>",
  "authMode": "<scheme-name-no-secret>",
  "requestDigest": "sha256:<digest-of-sanitized-request>",
  "responseDigest": "sha256:<digest-of-redacted-response>",
  "httpStatus": 200,
  "inferenceCompleted": true,
  "providerId": "<registry-id>",
  "modelId": "<registry-id>",
  "correlationId": "<non-secret-correlation-id>",
  "secretMaterialRecorded": false,
  "result": "PASS"
}
```

The JSON is a schema example, not evidence of a completed request. The verifier must reject placeholder values, missing digests, stale SHA, non-2xx results, or absent proof of inference.

**Exit:** authenticated real inference, real model switch, real fallback, and negative-path tests pass on the exact candidate SHA. If the credential or service contract is unavailable, mark BLOCKED—not PASS.

### Phase 4 — Provider, host and lifecycle proof (P0)

For each declared provider and each advertised operation, record a capability tuple:

`provider × operation × resource kind × auth mode × host environment × cleanup strategy`

Test only in explicitly selected, bounded, disposable environments.

For every supported operation, verify:
- Preflight and permission checks before mutation.
- Create/provision and wait for readiness using bounded polling.
- Readback from the real provider API.
- Update and drift detection.
- Drift repair and post-repair readback.
- Durable state persistence, process termination, restart/resume.
- Idempotency and duplicate request protection.
- Dependency-aware rollback and cleanup.
- Independent residual-resource scan.
- Revoked credentials, denied permissions, throttling, timeout, partial failure and provider outage.

A passing adapter unit test is not provider qualification. A provider is green only for the exact operations actually exercised. If an operation cannot be tested, return `UNSUPPORTED_CAPABILITY` before side effects and keep that matrix cell non-green.

For AWS, require a fresh exact-SHA run including account/region chosen by the actor, budget/cost boundary, real resources, waiters, drift injection, repair, rollback and zero-residual verification. Do not run duplicate physical jobs while an existing job is active.

### Phase 5 — Native OS/architecture, IDE, host and mode matrix (P0)

**Principle:** universal support means every advertised target has evidence or an explicit unsupported state. It does not mean forcing all table cells green.

Build matrix rows from the target registry, then verify registry claims against real runner receipts. Suggested dimensions:
- OS and version; architecture; runtime/toolchain version.
- Install format/package manager; upgrade and uninstall.
- Shell/terminal and interactive/noninteractive mode.
- IDE integration and actual extension/command protocol.
- Hosting target (e.g. Linux host, container, cPanel, DirectAdmin) and its actual permission/API/SSH surface.
- Provider/resource operation and credential mode.
- AI-assisted and non-AI-assisted paths.
- UI, CLI, API, automation and headless CI entrypoints.

**Native qualification requirements**
1. Build on the target runner.
2. Execute the produced target binary on that target OS/architecture.
3. Verify install, launch, authentication, config, permissions, TLS/proxy, filesystem semantics, encoding, cancellation, resume, rollback, upgrade and uninstall.
4. Test real end-to-end operation against the environment class being claimed.
5. Save runner metadata, artifact digest, exit code and logs.
6. Confirm all target cells have evidence references; no matrix self-certification.

Cross-compilation proves build compatibility only. It does not prove native runtime behavior. If macOS/Windows/Linux runners or hardware are unavailable, status remains PARTIAL/BLOCKED and the support claim must be narrowed or certification delayed.

**Mode parity**
- A feature must not require an AI assistant unless it is explicitly an AI feature.
- Non-AI mode must retain all supported deterministic capabilities.
- AI mode may enhance planning, but cannot bypass policy, provider contracts, confirmation, rollback or evidence generation.
- UI, CLI, API, IDE and headless paths must call the same durable operation service and produce equivalent authorization/error/state outcomes.

### Phase 6 — Real E2E, resilience and regression (P0)

Required scenario set:
- Clean checkout and locked dependency installation.
- Successful operation with real provider/API.
- Validation failure before mutation.
- Authentication and authorization failure.
- Network interruption and provider timeout.
- Process crash, restart and resume.
- Duplicate/replayed request and concurrent mutation.
- Partial deployment, reverse-topological rollback and cleanup.
- Drift injection, repair and verification.
- Invalid/expired credential and revoked permission.
- AI provider timeout, model disabled, fallback and no-eligible-model.
- Locale switch, missing translation, RTL rendering where applicable.
- Upgrade from prior release and rollback to prior known-good release.
- Unsupported target preflight with proof of zero side effects.

For each scenario assert observable behavior, not merely that a function exists. Required tests may not be skipped or marked successful on a vacuous assertion. Critical policy/lifecycle logic requires mutation testing; critical mutants must be killed.

**Exit:** all required suites pass with 0 required skips, all failures visible, real-vs-simulated environment clearly labeled, and all artifacts bound to the candidate SHA.

### Phase 7 — Branch governance, evidence and sign-off (P0)

1. Configure GitHub ruleset or branch protection for `phase4/production-hardening`.
2. Require pull request review, required status checks (CI/CD, COR, brand audit and any new AI/native/provider gates), stale approval dismissal where appropriate, and prevent bypass except a documented emergency policy.
3. Re-read the branch/ruleset API after configuration; a UI action alone is not proof.
4. Require CODEOWNERS/independent review for governance, security, provider adapters, workflow changes and certification code.
5. Generate a signed manifest with candidate SHA, evidence digests, workflow URLs, environment classes, target IDs, assessor and result.
6. Produce SBOM and verify artifact signatures/provenance; no secret or personal data in evidence.
7. Obtain independent second-party COR approval.
8. Re-run final required gates after any code/configuration change that affects the evidence.

**Exit:** every P0/P1 finding closed, evidence complete and immutable, branch protection verified, independent sign-off recorded, and final dashboard agrees with the machine-readable manifest.

## 5. Required repository commands

Run only commands confirmed to exist in the current `package.json` and scripts directory. The following is a proposed sequence; reconcile command availability first and update the runbook rather than silently omitting a missing gate.

```bash
set -euo pipefail
git status --short
git rev-parse HEAD
npm ci
npm run build
npm run lint
npm run typecheck
npm test
npm run governance:validate
node scripts/validate-locales.js
node scripts/i18n_audit.js
node scripts/governance/validate-repository.mjs
node --test tests/ai-inference-gateway.test.js
node --test tests/qualification/adversarial-anti-stub.test.js
npm --prefix server/engine-core run build
npm --prefix server/engine-core test
cd client
go vet ./...
go test -count=1 ./...
cd ..
git status --short
git rev-parse HEAD
```

Before executing optional commands such as `test:contract`, `test:integration`, `test:e2e`, `test:security`, or `test:compatibility`, confirm they are declared in package scripts or documented tooling. Missing prerequisites are BLOCKED with an owner; they are not silently skipped or passed.

## 6. CI design and release gate

Required workflow dependencies should be equivalent to:

```yaml
jobs:
  source-governance:
    # Syntax-aware hardcoding scan, anti-stub checks, locale parity,
    # capability registry consistency and mutation tests.
  build-and-unit:
    needs: [source-governance]
  integration:
    needs: [build-and-unit]
    # Explicitly label test environment; no mock-backed test may claim live E2E.
  ai-live-e2e:
    needs: [source-governance, build-and-unit]
    # Protected environment; ephemeral secret; authenticated canary + model switch.
  native-target-matrix:
    needs: [build-and-unit]
    # Target-native execution for every declared supported cell.
  provider-physical-e2e:
    needs: [source-governance, build-and-unit]
    # Protected/manual approval, actor-selected region/account, cost bounds,
    # real provider lifecycle, rollback and zero-residual verification.
  evidence-verify:
    needs: [integration, ai-live-e2e, native-target-matrix, provider-physical-e2e]
    # Validate exact SHA, schema, digest, signatures, required target coverage.
  certification:
    needs: [source-governance, build-and-unit, integration, ai-live-e2e,
            native-target-matrix, provider-physical-e2e, evidence-verify]
    # Fail closed if any mandatory dependency is missing, skipped, stale or failed.
```

This is a logical dependency sketch, not a ready-to-paste replacement workflow. Preserve existing action pinning, least-privilege permissions, runner setup, secret environment controls, cancellation behavior, and provider cleanup safeguards. Never make a destructive physical job run without explicit environment approval and cost/resource bounds.

## 7. Evidence manifest and freshness rules

Each evidence record should include:
- Full candidate SHA and clean-checkout identity.
- Workflow/run/job URL and attempt number.
- Test category: unit, contract, local integration, provider sandbox, live production canary, native target.
- Target tuple: OS/version, architecture, host/provider, resource kind, entrypoint/mode.
- Toolchain versions and exact command.
- Start/end timestamps, exit code and required-test skip count.
- Artifact and redacted receipt SHA-256 digests.
- Assessor identity/role and review state.
- Explicit status: PASS, PARTIAL, BLOCKED, UNSUPPORTED, NOT RUN, FAIL.
- Evidence expiry/retest trigger for mutable external dependencies.

Evidence must never include credentials, authorization headers, private prompts, personal data, raw production responses, or cloud resource secrets. Store only redacted output and stable digests where possible.

## 8. Certification acceptance criteria

COR may be signed off only when:
- All required jobs are complete and green on the same candidate SHA.
- Zero-hardcoding and anti-stub governance pass, including mutation tests.
- No production stubs, mocks, scaffolding, fake data or no-op success paths remain.
- Air Roofers AI authenticated live inference, model switching, fallback and negative paths are proven.
- Every claimed OS/architecture, IDE, host, provider, resource operation and entrypoint has target-bound behavioral evidence.
- Unsupported capabilities fail closed with zero side effects.
- Real E2E covers lifecycle, crash/resume, drift repair, rollback, cleanup and security failure paths.
- Locale parity is backed by runtime rendering and negative tests, not key counts alone.
- Branch protection, required checks and independent review are verified.
- Evidence manifest, artifact digests, SBOM/signatures/provenance and final dashboard reconcile.
- No P0/P1 finding remains open; no skipped or stale gate is presented as green.

## 9. Next actions in priority order

| Priority | Action | Owner role | Completion proof |
|---|---|---|---|
| P0 | Resolve COR run 39827082703 and inspect all jobs | Release engineer | Completed run + job-level evidence on exact SHA |
| P0 | Run authenticated Air Roofers AI canary | AI integration owner | Redacted live receipt + response schema/provenance validation |
| P0 | Prove two real model routes, switch and fallback | AI integration owner | Route-specific receipts and negative-path tests |
| P0 | Native execution for every claimed OS/architecture cell | Platform qualification owner | Native runner evidence; otherwise explicit PARTIAL/UNSUPPORTED |
| P0 | Requalify provider/host/IDE operation matrix | Provider integration owners | Per-operation live evidence or fail-closed unsupported proof |
| P0 | Enable branch protection/rulesets | Repository administrator | API readback proving required checks/reviews |
| P0 | Fresh physical lifecycle/cleanup on final candidate | Cloud qualification owner | Exact-SHA physical report and independent zero-residual receipt |
| P0 | Independent COR review | Independent assessor | Signed approval against manifest |
| P1 | Add dashboard generation from evidence manifest | Governance tooling owner | Deterministic generated dashboard; stale/missing evidence fails |
| P1 | Add mutation coverage for all forbidden patterns | Governance tooling owner | Mutation suite proves each gate is effective |

## 10. Final disposition

**🔴 HOLD — NOT UNIVERSALLY CERTIFIED.** Current CI/CD and brand audit passes are real progress, but they do not close live authenticated AI, native target execution, current-head COR, branch protection, full provider/IDE/host qualification, or independent sign-off. Do not mark universality green until every mandatory target is proven or the advertised support scope is explicitly narrowed.