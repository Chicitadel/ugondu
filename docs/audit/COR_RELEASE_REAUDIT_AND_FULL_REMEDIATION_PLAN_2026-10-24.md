<!-- Project: Ugondu | Authority: Ujomor Systems Engineering & Governance Authority | Organization: Air Roofers SASU -->
# COR / UAIGOS Release Re-audit and Full Remediation Plan

**Audit date:** 2026-10-24  
**Audited repository:** `Chicitadel/ugondu`  
**Declared production branch:** `phase4/production-hardening`  
**Reviewed candidate:** [`d641981dd5a9e056dfc8ba59c54ab75da44ef271`](https://github.com/Chicitadel/ugondu/commit/d641981dd5a9e056dfc8ba59c54ab75da44ef271)  
**Reviewed evidence-only release descendant:** [`e5c7307a490e63e75c17013ab2c55516ee7ad8c8`](https://github.com/Chicitadel/ugondu/commit/e5c7307a490e63e75c17013ab2c55516ee7ad8c8)  
**Verdict:** **QUALIFIED WITH BOUNDED TARGET SUPPORT — UNIVERSAL CERTIFICATION NOT GRANTED**  
**Governance baseline:** UAIGOS 3.0.0 / COR  
**Evidence posture:** Source and JSON evidence inspected through GitHub repository reads; workflow job outcomes inspected. This is not a claim that the audit author executed the repository locally or independently replayed the cloud provider runs.

## 1. Executive determination

The new candidate includes meaningful improvements: the qualification runner rejects missing executors, computes a digest from returned output, creates explicitly unqualified offline receipts, and the evidence freshness verifier rejects an offline AI report that claims active models. The reported GitHub runs show the AWS Physical Qualification Gate and COR final gate succeeded, and the Ugondu CI/CD run completed workspace, Docker and integration jobs successfully.

These results do **not** establish the user's requested universal status. The checked-in AI qualification report records `CATALOG_OFFLINE`, 12 discovered catalog entries, **0 qualified, 0 active, 12 disabled**. The live canary proves one successful discovery/execution request using `sentinel-guard-v1`; it does not prove that every model discovered by the API is activated, qualified, policy-compliant, and routable. The native-runner receipt itself limits coverage to Windows/AMD64 full Node qualification, Linux/AMD64 Go thin-client/governance gates, and macOS/ARM64 Go thin-client only. Linux/ARM64 and Intel macOS remain cross-compiled only. IDE support remains experimental/unsupported for several products. The host evidence says operation-level disposable-infrastructure receipts are not attached even though the target matrix marks those operations tested.

A successful gate means only that the gate's defined scope passed. It must not be translated into a broader support claim. The current truthful release status remains bounded.

## 2. Current certification overview

Legend: 🟢 fresh evidence proves the stated scope · 🟡 partial / evidence scope incomplete · 🔴 gap / unsupported / blocked · ⚪ not assessed.

| Capability | Status | Evidence reviewed | Exact closure condition |
|---|---|---|---|
| COR workflow 40090634678 | 🟢 scoped gate pass | AWS Physical Qualification Gate, COR Certification, COR Final Release Gate succeeded | Keep this evidence bound to the reviewed candidate/release lineage |
| Ugondu CI/CD 40090634686 | 🟢 scoped CI pass | Workspaces, Go builds, Docker image validation, integration tests succeeded | Release publishing is a separate tag-gated action; this run's publish job was skipped |
| Live API canary 40089857840 | 🟢 one-request canary | HTTP 200 discovery and execution; `sentinel-guard-v1`; 30 reported models | Do not equate one model canary with per-model qualification |
| AI model fleet activation | 🔴 not complete | Checked-in report: `CATALOG_OFFLINE`, 12 discovered, 0 qualified, 0 active, 12 disabled | Fresh live qualification receipt for every model intended to be active |
| AI no-synthetic-execution safeguards | 🟡 improved, further hardening required | Missing executor rejected; output digest required; offline receipts cannot activate | Bind activation to a verified provider transport receipt, not merely an injected callback |
| Evidence freshness | 🟡 improved, manifest coverage incomplete | Candidate/HEAD relationship and evidence-only path list reviewed; verifier checks AI report SHA and active-count semantics | Include AI report in manifest digests; derive target gaps from receipts rather than trusting `unproven: []` |
| Windows/AMD64 | 🟢 scoped native pass | 158/158 qualification tests recorded on native Windows host | Preserve receipt and rerun when relevant source changes |
| Linux/AMD64 | 🟡 partial | Native Go thin-client and governance gates recorded; not the full Node qualification suite in the native evidence file | Execute full required product qualification suite on native Linux/AMD64 |
| macOS/ARM64 | 🟡 partial | Native Go thin-client only; Node qualification suite not run | Execute the required full suite natively |
| Linux/ARM64 | 🔴 | Cross-compiled only; never executed on native hardware | Native runner: install, run, upgrade, recovery, rollback, cleanup and tests |
| macOS/AMD64 (Intel) | 🔴 | Cross-compiled only; never executed on native hardware | Native Intel macOS qualification or formally remove it from the supported scope |
| VS Code | 🔴 | Experimental; unsupported capabilities fail closed | Real install/auth/command/remote workspace E2E and a declared supported version range |
| JetBrains / Cursor / Windsurf / Neovim | 🔴 | Declared unsupported; no qualifying integration evidence | Implement and test each integration or explicitly exclude from product claims |
| AWS physical gate | 🟢 gate pass, scope bounded | Workflow 40090634678 reports success | Preserve operation receipts, cleanup proof, cost controls and candidate binding |
| cPanel / DirectAdmin / SSH-VPS / Docker / Kubernetes | 🟡 | Matrix declares tested, but native evidence says per-operation disposable-infrastructure receipts are not attached | For each provider and each operation, attach real receipts and teardown proof |
| GCP / Azure | 🔴 unsupported | Fail-closed matrix state | Implement and qualify real adapters if required; otherwise keep explicitly out of scope |
| Release publication | ⚪ not run | CI publish job was skipped (tag-gated) | Publish only after formal release approval and a passing final SHA gate |
| Universal COR certification | 🔴 withheld | Multiple OS/IDE/host/provider gaps remain | Every mandatory target/operation green with fresh, independent evidence |

## 3. Evidence and source reconciliation

### 3.1 Commits and workflow outcomes

- Candidate: [`d641981d...`](https://github.com/Chicitadel/ugondu/commit/d641981dd5a9e056dfc8ba59c54ab75da44ef271).
- Release evidence descendant: [`e5c7307a...`](https://github.com/Chicitadel/ugondu/commit/e5c7307a490e63e75c17013ab2c55516ee7ad8c8).
- The GitHub compare endpoint reports two commits and six changed paths between these SHAs, all in audit/evidence JSON/Markdown files. The reviewed manifest's allowlist is narrower than the earlier broad `docs/governance/` prefix, which is a positive change.
- [COR workflow 40090634678](https://github.com/Chicitadel/ugondu/actions/runs/40090634678): AWS physical gate, COR certification and final release gate all succeeded.
- [CI/CD workflow 40090634686](https://github.com/Chicitadel/ugondu/actions/runs/40090634686): workspace jobs, Docker image validation and integration tests succeeded. The `Build & Publish Release` job was skipped, so this is not proof of a published release.
- [Live AI canary 40089857840](https://github.com/Chicitadel/ugondu/actions/runs/40089857840): one discovery and one execution request succeeded against `https://ai.airroofers.eu`.

### 3.2 AI model qualification report is correctly fail-closed but proves no fleet activation

Reviewed file: [AI model qualification report](../security/evidence/ai_model_qualification_report.json).

The report is bound to candidate `d641981dd5a9e056dfc8ba59c54ab75da44ef271` and states:
- `qualificationMode: CATALOG_OFFLINE`
- `totalDiscovered: 12`
- `qualifiedCount: 0`
- `activeCount: 0`
- `disabledCount: 12`
- each receipt has `status: UNQUALIFIED` and `liveExecution: false`

This is an honest offline result. It is **not** a successful activation result and must not be described as one. A separate live canary is not a substitute for per-model qualification. If the goal is to activate the available API model fleet, the next step is to run the real live qualification workflow with authorized credentials and produce one verified receipt per approved model. Models that fail remain disabled.

### 3.3 Qualification implementation still has trust-boundary weaknesses

Reviewed source:
- [Qualification runner](../../scripts/qualification/qualify-ai-models.mjs)
- [TypeScript model lifecycle](../../server/engine-core/src/ai/model-lifecycle.ts)
- [Evidence freshness verifier](../../scripts/governance/verify-evidence-freshness.mjs)

Positive changes in the JavaScript runner:
- `verifyInference` rejects a missing execution function.
- empty output is rejected and a digest is computed from returned output.
- offline catalog mode creates `UNQUALIFIED` receipts with `liveExecution: false`.
- production offline qualification throws `LIVE_QUALIFICATION_REQUIRED`.
- the checked-in freshness verifier rejects an offline report if it claims active models.

Remaining issues to close before claiming robust live qualification:
1. The lifecycle's public API accepts a caller-provided `executeFn`; a function returning a fabricated string can satisfy “non-empty output” unless the production activation boundary proves the call passed through the trusted Air Roofers HTTP transport. A digest proves bytes existed, not that a real provider generated them.
2. `runModelQualification` accepts `options.discoveredModels`, `options.executeProbe`, and `options.probeFn`. Those are useful for isolated tests, but must not be accepted by production certification entry points unless injected dependencies are constructed by an explicitly trusted production adapter and recorded in the receipt.
3. The live mode can be selected through `options.mode === 'LIVE_SOVEREIGN'` independently of the normal credential/base-URL pair. Validate credentials and endpoint before any request, and return typed errors rather than relying on a downstream property access to fail.
4. A default development sentinel model remains in the no-catalog/non-production branch. Even though offline handling disables it, remove the sentinel fallback from qualification paths to satisfy zero scaffolding. Missing catalog should produce an empty discovery result or a typed configuration error, never invent a model.
5. `probeFn` defaults to a synthetic `{ ok: true }` capability result in the live runner. A production qualification must call a real provider capability/contract probe or explicitly declare the capability as “not probed” and prevent activation.
6. The TypeScript lifecycle accepts an injected executor and only checks the output shape/digest. Make production activation require an unforgeable/validated transport receipt from the trusted adapter, not a Boolean supplied by the caller.

### 3.4 Evidence manifest and target truthfulness

Reviewed files:
- [Evidence manifest](../governance/evidence/evidence-manifest.json)
- [Native runner evidence](../governance/evidence/native-runner-evidence.json)
- [Target matrix](../../config/qualification/target-matrix.json)
- [Certification dashboard](./CERTIFICATION_PROGRESS_DASHBOARD.md)

The manifest lists four digest-bound evidence files but does not list `docs/security/evidence/ai_model_qualification_report.json` among `evidenceFiles`. The freshness verifier separately checks the report's `gitSha` and active-receipt count, but does not digest-bind the report through the manifest. Add it to the manifest and require the report's blob digest to match. Also validate that the model report is generated by the same workflow invocation as the live receipts.

The manifest's `unproven: []` means only that the list is empty. It does not prove that all required targets have evidence. Compute unresolved items from the canonical target matrix and operation-level receipts; fail if a required matrix target/operation lacks qualifying evidence.

The target matrix marks AWS, DirectAdmin, cPanel, SSH-VPS, Docker and Kubernetes operations as `tested`, while the native-runner evidence explicitly states per-operation disposable-infrastructure receipts are not attached for those providers. This is an evidence inconsistency. Either attach verifiable operation receipts or downgrade those matrix statuses to `partial` / `unsupported` until proven.

### 3.5 Potential credential material in a committed provisioning receipt

Reviewed file: [admin portal provisioning receipt](../security/evidence/admin_portal_provisioning_receipt.json). The JSON contains a sample issuance response with a field named `raw_key` and a token-shaped value, despite also describing an orphan credential as purged. This audit cannot establish from the file alone whether that value was ever a valid live secret. Treat it as potentially sensitive until the credential owner confirms otherwise:
- check the live credential registry/vault and issuance journal;
- revoke/rotate the credential if it was real or may still authorize requests;
- replace committed raw token-shaped examples with `REDACTED`;
- add a secret scanner that checks JSON fixtures, reports, Markdown, and release bundles;
- retain an audit record of the rotation without copying the secret into GitHub issues or logs.

Do not reproduce the token in remediation comments or evidence.

## 4. Exact remediation plan

### P0 — Trusted live AI qualification and activation

**Goal:** The only path to `ACTIVE` is an authenticated, successful, real request to the provisioned Air Roofers API, tied to the model ID, candidate SHA, correlation ID, response digest and policy context.

1. Separate the production transport from lifecycle orchestration. Keep injected functions for unit tests, but expose a production entry point that creates the trusted transport internally.
2. Validate `UGONDU_AIRROOFERS_AI_KEY`, `UGONDU_AIRROOFERS_AI_BASE_URL`, HTTPS, allowed hostname, model ID, tenant/product scope and API contract before discovery or inference.
3. Disallow caller-supplied discovery arrays and execution callbacks in the production certification command. In test mode, mark receipts `TEST_ONLY` and reject them in the production evidence verifier.
4. Require HTTP status 200, a valid documented response schema, non-empty provider output, provider/model identity, correlation ID, latency, timestamp, and a digest computed from the actual response bytes. Do not treat arbitrary executor output as proof of live inference.
5. Qualify every approved model individually. A failed, unresponsive, unauthorized, region-ineligible, expired or malformed model remains `DISABLED`. Do not fail open or silently route to an unqualified model.
6. Support future models through live catalog discovery and a versioned provider adapter contract. Model IDs/capabilities come from the API catalog, not a checked-in model list. New models enter `DISCOVERED`, then progress through validation, policy, capability probe, inference verification, qualification and activation.
7. Add scheduled and release-triggered qualification. Store only redacted receipts and digests; never store bearer tokens or prompts containing private data.
8. Test quota/rate limit, timeout, DNS/TLS failure, 401/403, 404 model, 429, 5xx, malformed JSON, empty output, cancellation, duplicate requests, stale credentials, unsupported region, tenant mismatch and failover.

**Required fail-closed pattern (illustrative; adapt to the actual adapter interfaces and types):**

```ts
type LiveInferenceReceipt = {
  source: "airroofers-live-transport";
  httpStatus: 200;
  endpointHost: string;
  modelId: string;
  candidateSha: string;
  correlationId: string;
  responseDigestSha256: string;
  observedAt: string;
};

function assertLiveReceipt(
  receipt: LiveInferenceReceipt | undefined,
  expected: { modelId: string; candidateSha: string }
): asserts receipt is LiveInferenceReceipt {
  if (!receipt ||
      receipt.source !== "airroofers-live-transport" ||
      receipt.httpStatus !== 200 ||
      receipt.modelId !== expected.modelId ||
      receipt.candidateSha !== expected.candidateSha ||
      !/^[a-f0-9]{64}$/.test(receipt.responseDigestSha256) ||
      !receipt.correlationId ||
      !receipt.endpointHost ||
      !receipt.observedAt) {
    throw new Error("LIVE_INFERENCE_RECEIPT_REQUIRED");
  }
}
```

This type shape alone is not a security boundary: TypeScript types can be forged. The actual implementation must create and validate the receipt inside the trusted adapter boundary, verify the endpoint allowlist and response schema, and ensure the activation method cannot be called with caller-authored receipt data. Prefer an internal branded type/private constructor or a service method that performs transport and activation atomically.

### P1 — Remove all scaffolding and fake-success paths

1. Delete the synthetic sentinel model fallback from `scripts/qualification/qualify-ai-models.mjs`. Missing catalog/configuration must fail closed with `MODEL_CATALOG_UNAVAILABLE` or return zero discovered models; it must never fabricate a model.
2. Remove default-success capability probes from production paths. Use an actual provider contract request.
3. Keep mocks/fakes only in isolated unit tests and mark them as test-only. Ensure production builds do not import test fixtures, fake adapters, canned output strings, sample credential stores or mock servers.
4. Add AST/import-graph checks in addition to regex scanning. Scan production source, compiled bundles, packaged archives, Docker layers and release artifacts.
5. Treat skipped required tests, unavailable credentials, unsupported targets and missing infrastructure as `BLOCKED` / `NOT RUN`, never green.
6. Add adversarial tests that try to activate a model using a fake callback, caller-authored receipt, empty output, alias-derived digest, offline catalog, stale candidate, test-mode receipt, and fabricated capability probe. Every attempt must fail closed.

### P2 — Manifest and evidence integrity

The current verifier checks hashes for entries that are present, but it cannot prove completeness if a required artifact is omitted from the manifest. Extend the canonical evidence schema to require:
- AI model qualification report;
- live canary receipt;
- native runner evidence;
- target matrix and platform matrix;
- operation-level provider receipts;
- workflow run ID, job name, conclusion, commit SHA, artifact digest and timestamp;
- declared scope, exclusions, and unresolved gaps.

Illustrative completeness check:

```js
const REQUIRED_EVIDENCE = [
  "docs/security/evidence/ai_model_qualification_report.json",
  "docs/security/evidence/live_ai_canary_receipt.json",
  "docs/governance/evidence/native-runner-evidence.json",
  "config/qualification/target-matrix.json",
];

for (const path of REQUIRED_EVIDENCE) {
  if (!manifest.evidenceFiles.some((entry) => entry.path === path)) {
    throw new Error(`REQUIRED_EVIDENCE_MISSING_FROM_MANIFEST: ${path}`);
  }
}
```

The real implementation must additionally verify each digest, candidate SHA, signature/attestation where configured, workflow conclusion, timestamp freshness, scope and operation coverage. Do not accept an empty `unproven` array as a substitute for deriving gaps.

### P3 — Zero operational hardcoding and future-model extensibility

Apply UAIGOS zero-hardcoding to **mutable operational data**, not to immutable security invariants. The following must be registry/configuration/API driven: model inventory, provider/model capabilities, endpoint selection, region availability, quotas, retry budgets, tenant/product permissions, host/IDE support, feature flags, deployment profiles, and user-visible text. Secrets must come from the credential broker/secret manager, not source files or logs.

Keep only reviewed immutable invariants in code: schema validation rules, protocol constraints, cryptographic algorithms, and fail-closed security checks. Every invariant must have an owner, rationale, version, test and change-control rule. Do not externalize security policy in a way that lets runtime configuration disable it.

Acceptance tests:
- add a future model to the live catalog and qualify it without source changes;
- add a provider adapter using the versioned conformance contract without editing gateway routing core;
- change endpoint/region through approved configuration and verify no rebuild is required;
- unknown model/provider/capability returns a typed unsupported result;
- secrets never appear in logs, receipts, artifacts, test snapshots or exceptions;
- localization parity tests cover every supported locale and RTL layout.

### P4 — Native OS/architecture certification

For each OS/architecture declared supported, run the actual product suite natively—not merely cross-compile a Go binary. The qualification workflow must collect OS release, architecture, runtime version, hardware/runner identity, candidate SHA, suite digest, test counts, exit code and artifact digests.

Required per-target scenarios: fresh install, first run, auth/secret resolution, deployment plan, real execution, health/readiness, upgrade, interrupted upgrade recovery, rollback, cleanup, permission denial, network failure and audit receipt generation.

Minimum target closure:
- Windows/AMD64: retain current 158/158 evidence and rerun on relevant changes.
- Linux/AMD64: add full Node/product qualification suite; Go thin-client tests alone are partial.
- macOS/ARM64: add full Node/product qualification suite; Go thin-client tests alone are partial.
- Linux/ARM64: native ARM64 runner required.
- macOS/AMD64 (Intel): native Intel runner required or formally exclude from supported scope.

A cross-compiled artifact proves build compatibility only. It cannot turn a target green.

### P5 — IDE integrations

Do not infer IDE support from CLI support or a VS Code extension skeleton. For each IDE, publish an explicit compatibility matrix and run automated install/auth/command/workspace/diagnostic/update/uninstall E2E:
- VS Code: move from experimental to qualified only after supported-version matrix and real E2E pass.
- JetBrains: plugin installation, auth, action invocation, workspace lifecycle and error surfaces.
- Cursor and Windsurf: product-specific install/auth/command/remote workspace tests; do not inherit VS Code green automatically.
- Neovim: documented CLI/LSP interface, authentication, diagnostics, completion/action behavior, cancellation and cleanup.

Until then, the status must remain red/unsupported and the application must return a clear typed `UNSUPPORTED_CAPABILITY` result rather than pretending the operation succeeded.

### P6 — Hosting/provider operation qualification

For each provider (AWS, cPanel, DirectAdmin, SSH/VPS, Docker Compose, Kubernetes, and any future GCP/Azure adapters), qualify every operation separately:
`discover → preflight → provision → verify → repair → rollback → cleanup`.

Each operation receipt must identify a disposable test environment, candidate SHA, adapter version, request/correlation ID, before/after state digest, exit status, cleanup result, and redacted provider response. Verify idempotency, partial failure recovery, rollback correctness, least privilege, timeout handling, rate limits, data residency and no resource leakage. Do not claim an operation is tested merely because the matrix lists it or an adapter exists.

For AWS, retain the successful physical gate but attach the detailed operation receipts and confirm cleanup/cost guardrails. For cPanel/DirectAdmin, test against disposable accounts or an explicitly isolated test tenant. If live provider credentials or disposable infrastructure are unavailable, record the operation as blocked and keep it yellow/red.

### P7 — Release and anti-regression controls

- Required checks must be branch protection rules, not advisory steps.
- The release job must fail if a required test is skipped or if target support claims exceed receipt coverage.
- Build/publish only from the approved final SHA after evidence verification.
- The release artifact must include an SBOM, provenance/attestation where configured, checksums, version metadata and signed release manifest.
- Every dashboard green row must link to a verified receipt and exact run.
- Changes to AI adapters/catalog, target matrix, host adapters, IDE integrations, security policies, localization or evidence tooling must trigger their dependency-specific test suites.
- Re-run final evidence verification after all source/config changes. Any non-evidence change after the candidate invalidates the evidence lineage and requires a new candidate.

## 5. Required workflow and local runbook

First inspect the repository's actual `package.json` scripts; do not blindly invoke assumed script names. The following is a gate sequence, not a claim that every script name currently exists:

```bash
set -euo pipefail

git status --short
git rev-parse HEAD
node --version
npm --version
npm ci

# Run the repository's declared scripts for build, lint, typecheck and unit tests.
npm run
npm run build
npm run lint
npm run typecheck
npm test

# Run only if these exact scripts exist in package.json; otherwise invoke the
# checked-in test files directly and record the actual command + exit code.
node --test tests/qualification/model-lifecycle-qualification.test.js
node --test tests/qualification/evidence-freshness.test.js
node --test tests/qualification/native-runner-evidence.test.js
node --test tests/qualification/target-matrix-fail-closed.test.js
node scripts/governance/validate-repository.mjs
node scripts/governance/verify-evidence-freshness.mjs
```

Then run the checked-in live AI canary and model qualification workflow using the secret store. Do not paste credentials into the shell history or report. Preserve the run ID and redacted receipt. Run the physical provider qualification workflow on disposable infrastructure. Run native target workflows on actual native runners. After every gate completes, compare the workflow SHA with the intended candidate and collect artifacts. A green result on a different SHA does not certify the candidate.

## 6. UAIGOS governance controls and non-negotiable invariants

1. **Truthful status:** only fresh, scoped evidence can mark a row green.
2. **No fake success:** no synthetic inference, default-success probes, placeholder handlers or success-shaped error fallbacks in production-reachable code.
3. **No hidden test mode:** test doubles are isolated and cannot produce production-accepted qualification receipts.
4. **No operational hardcoding:** mutable provider/model/target data is configuration/API driven; secrets are never embedded.
5. **Fail closed:** unknown model, target, IDE, host operation, region, credential or policy state denies execution.
6. **Evidence completeness:** derive unresolved gaps from the canonical requirements matrix and actual receipts.
7. **Immutable lineage:** candidate SHA, run IDs, evidence digests and release artifacts must reconcile.
8. **Privacy and least privilege:** use non-sensitive probe prompts, tenant-scoped credentials, secret redaction, and explicit region/data-classification checks.
9. **Rollback and cleanup:** every physical provider qualification must prove no leaked resources or credentials.
10. **Governance traceability:** every exception has an owner, justification, expiry, risk acceptance and review date; no silent waiver.

## 7. Completion gates and exit criteria

| Gate | Owner role | Exit evidence | Status now |
|---|---|---|---|
| G0: AI trust boundary | AI platform maintainer + security reviewer | Trusted transport receipts, fake-callback adversarial tests, no sentinel fallback | 🔴 |
| G1: Per-model live qualification | AI platform maintainer | Fresh receipt per approved model; explicit disabled reasons for failures | 🔴 (current report has 0 active) |
| G2: Manifest completeness | Governance maintainer | Required evidence paths/digests, derived gap list, stale-SHA rejection | 🟡 |
| G3: Native OS matrix | Platform maintainers | Full native suite per required OS/architecture | 🔴 |
| G4: IDE integrations | Developer-experience maintainers | Real IDE E2E for each promised integration | 🔴 |
| G5: Host/provider operations | Deployment adapter maintainers | Operation-level receipts and cleanup proofs | 🟡 / 🔴 by provider |
| G6: Secret hygiene | Security owner | Secret scan clean; any possibly real key revoked/rotated; fixture redacted | 🟡 pending confirmation |
| G7: Release publication | Release manager | Approved tag, all required gates pass, provenance/checksums and publish receipt | ⚪ skipped in reviewed CI run |
| G8: Universal COR certification | Independent governance reviewer | All mandatory targets/operations green, no unresolved mandatory gaps, final SHA evidence bundle | 🔴 withheld |

## 8. Primary references

### Repository evidence
- [Candidate commit](https://github.com/Chicitadel/ugondu/commit/d641981dd5a9e056dfc8ba59c54ab75da44ef271)
- [Evidence descendant](https://github.com/Chicitadel/ugondu/commit/e5c7307a490e63e75c17013ab2c55516ee7ad8c8)
- [COR workflow 40090634678](https://github.com/Chicitadel/ugondu/actions/runs/40090634678)
- [CI/CD workflow 40090634686](https://github.com/Chicitadel/ugondu/actions/runs/40090634686)
- [Live AI canary 40089857840](https://github.com/Chicitadel/ugondu/actions/runs/40089857840)
- [AI qualification runner](../../scripts/qualification/qualify-ai-models.mjs)
- [TypeScript model lifecycle](../../server/engine-core/src/ai/model-lifecycle.ts)
- [Evidence freshness verifier](../../scripts/governance/verify-evidence-freshness.mjs)
- [Evidence manifest](../governance/evidence/evidence-manifest.json)
- [Native runner evidence](../governance/evidence/native-runner-evidence.json)
- [Target matrix](../../config/qualification/target-matrix.json)
- [AI model qualification report](../security/evidence/ai_model_qualification_report.json)
- [Live AI canary receipt](../security/evidence/live_ai_canary_receipt.json)
- [Provisioning receipt requiring secret hygiene review](../security/evidence/admin_portal_provisioning_receipt.json)

### Standards and guidance to map into the internal UAIGOS control register
- NIST Secure Software Development Framework (SSDF): https://csrc.nist.gov/Projects/ssdf
- NIST SP 800-218, Secure Software Development Framework: https://csrc.nist.gov/pubs/sp/800/218/final
- OWASP Application Security Verification Standard: https://owasp.org/www-project-application-security-verification-standard/
- SLSA supply-chain levels and provenance: https://slsa.dev/
- GitHub Actions workflow security guidance: https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions
- GitHub artifact attestations: https://docs.github.com/en/actions/security-guides/using-artifact-attestations

## 9. Final statement

This audit records meaningful progress and successful scoped gates. It does not certify unsupported targets, infer model-fleet activation from a single live canary, or treat a skipped release-publish job as publication. Universal COR remains **RED / NOT GRANTED** until G0–G8 close with fresh, candidate-bound, independently reviewable evidence. No remediation is considered complete merely because its plan is documented.
