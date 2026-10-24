<!-- SUPERSEDED NOTICE (2026-10-24 16:43 UTC): This addendum records an earlier 13:10 UTC snapshot. For the latest verified CI/COR run outcomes, candidate lineage, corrected capability-probe status, current AI fleet result and remediation plan, read [COR_REAUDIT_ADDENDUM_2026-10-24_1643Z.md](./COR_REAUDIT_ADDENDUM_2026-10-24_1643Z.md) and [CERTIFICATION_PROGRESS_DASHBOARD.md](./CERTIFICATION_PROGRESS_DASHBOARD.md). In particular, the old statement that the default-success probe remains in the runner is superseded: the specific fallback was absent from the later inspected candidate. Universal certification remains withheld. -->

<!-- Project: Ugondu | Authority: Ujomor Systems Engineering & Governance Authority | Organization: Air Roofers SASU -->
# COR Re-audit Addendum — 13:10 UTC Evidence Reconciliation

**Review date:** 2026-10-24  
**Candidate claimed by current evidence set:** `55447c495c1c086286774170f706fcbe9b6f6646`  
**Evidence-sealed release HEAD claimed:** `f0939187d08ee8544c0bad75eaf6a491f12aee81`  
**Repository:** [Chicitadel/ugondu](https://github.com/Chicitadel/ugondu)  
**Verdict:** **QUALIFIED WITH BOUNDED TARGET SUPPORT — UNIVERSAL CERTIFICATION NOT GRANTED. Current COR freshness gate is failing; do not issue a new final certificate.**

This addendum supersedes any earlier dashboard row that marks the current AI trust boundary or evidence freshness fully green. It incorporates the new evidence submitted at 13:10 UTC and directly reviewed GitHub source, JSON receipts, and workflow job steps. It does not claim to have executed the repository locally.

## 1. Executive reconciliation

The new commit improves several areas: the AI report is now listed in the evidence manifest; the offline sentinel/catalog fallback was removed from the live qualification path; credentials and endpoint validation were added; provider matrix entries for cPanel, DirectAdmin, SSH/VPS and Kubernetes are downgraded to partial with `receipts_pending`; the provisioning receipt's `raw_key` values are redacted; and the Windows native suite records 166/166 passing tests.

However, the submitted claim that all findings are resolved is **not supported**. Four blocking facts remain:

1. The committed AI qualification report says `LIVE_SOVEREIGN`, but it records only one discovered diagnostic model, **zero qualified, zero active**, an empty `receipts` array, and a failure `CAPABILITY_PROBE_REQUIRED`. This is a truthful fail-closed result, not a successful activation of the model fleet.
2. The model lifecycle determines “real transport” by inspecting caller-returned fields such as `result.source === 'airroofers-live-transport'`. The qualification runner and lifecycle still accept caller-supplied execution functions. A source string in a returned object is not an unforgeable transport attestation; an injected function can imitate it unless the production activation boundary verifies an internally created transport receipt.
3. The qualification runner still contains a default-success capability probe `options.probeFn || (async () => ({ ok: true }))` for non-production paths. Production checks reject a missing probe function, but the fake-success implementation remains in the source and must be removed from all qualification paths to meet the stated zero-stubbing policy.
4. The COR Certification job in [workflow run 40095423154](https://github.com/Chicitadel/ugondu/actions/runs/40095423154) failed at `Verify evidence freshness (candidate-bound, evidence-only descendant)`. The log says 13 non-evidence paths changed since candidate `d641981dd5a9e056dfc8ba59c54ab75da44ef271`, including target/platform matrices and evidence tooling. The job then failed to upload COR evidence because `.cor_evidence/` was not created. The AWS Physical Qualification Gate in that run was still in progress at the latest status check; do not report the entire COR workflow as green.

The separate [CI/CD run 40096092008](https://github.com/Chicitadel/ugondu/actions/runs/40096092008) did complete its listed workspace, Go thin-client, Docker and integration jobs successfully. Its tag-gated release publish job was skipped. This success does not override the failed COR freshness gate or establish universal target support.

## 2. Corrected colour-coded status

Legend: 🟢 verified only for the exact scope shown · 🟡 partial or incomplete scope · 🔴 blocked / failing / unsupported · ⚪ not run.

| Area | Status | Evidence-based assessment | Required closure |
|---|---|---|---|
| CI/CD workflow 40096092008 | 🟢 scoped CI pass | Workspace builds, Go builds, Docker validation and integration tests passed; publish job skipped | Preserve exact run and candidate lineage; publish only through approved tag |
| COR workflow 40095423154 | 🔴 not green | COR Certification failed evidence freshness; evidence upload failed; AWS physical gate still in progress at latest check | Fix candidate lineage, regenerate evidence from the correct candidate, rerun full workflow and verify final job conclusions |
| AI API live canary 40095440577 | 🟢 single request only | HTTP 200 discovery and execution against `https://ai.airroofers.eu`; receipt reports model `sentinel-guard-v1` | Treat as connectivity/inference smoke test only; not fleet qualification |
| AI model fleet | 🔴 | `LIVE_SOVEREIGN`, 1 discovered diagnostic, 0 qualified, 0 active, 1 disabled, no qualification receipts | Execute real per-model live qualification with genuine capability probes and real inference; keep failures disabled |
| AI trusted receipt boundary | 🟡 / 🔴 for certification | A returned `source` string is used as evidence of transport provenance; caller-supplied executor remains accepted | Trusted adapter creates receipt internally; no caller-controlled source flag can activate a model |
| Default-success capability probe | 🔴 | `probeFn || async () => ({ ok: true })` remains in qualification source; production blocks missing probe but non-production qualification can use fake success | Delete fallback entirely; missing real probe must always produce typed blocked/unqualified result |
| Evidence manifest inclusion | 🟢 scoped improvement | AI qualification report now appears in `evidenceFiles` with digest | Keep digest, candidate SHA, workflow ID and report receipt set synchronized |
| Evidence freshness / COR lineage | 🔴 | Current COR job compares against stale candidate `d641981...` and reports 13 changed non-evidence paths; no `.cor_evidence/` artifact was produced | Make the candidate source of truth explicit and consistent across workflow inputs, manifest, freshness verifier and evidence generator |
| Windows/AMD64 | 🟢 | Native qualification receipt reports 166/166 pass on Windows | Rerun when affected source changes; bind to new candidate |
| Linux/AMD64 | 🟡 | Native Go thin-client/governance scope; not equivalent to full native Node qualification suite | Run full product suite natively |
| macOS/ARM64 | 🟡 | Go thin-client only; full Node suite not evidenced | Run full product suite natively |
| Linux/ARM64 | 🔴 | Cross-compiled only | Native ARM64 execution |
| macOS/AMD64 (Intel) | 🔴 | Cross-compiled only | Native Intel execution or formally remove from supported scope |
| VS Code | 🔴 | Experimental; fail-closed behavior is not a successful IDE certification | Full supported-version install/auth/workspace/action/update/uninstall E2E |
| JetBrains / Cursor / Windsurf / Neovim | 🔴 | Declared unsupported | Implement and test each, or explicitly exclude from universal scope |
| AWS physical qualification | 🟡 pending in run 40095423154 | Previous AWS run passed, but current run's physical gate remained in progress at last check | Await completed result and inspect cleanup receipt for the exact candidate |
| cPanel / DirectAdmin / SSH-VPS / Kubernetes | 🟡 | Correctly marked partial with receipts pending | Per-operation real infrastructure receipts, rollback and cleanup proof |
| GCP / Azure | 🔴 | Unsupported | Implement and qualify real adapters or exclude from supported target set |
| Secret hygiene | 🟢 scoped | Sample `raw_key` fields now redacted in the checked-in receipt | Continue secret scanning; confirm whether any historical credential needed rotation |
| Release publication | ⚪ | CI publish step skipped as tag-gated | Formal release tag and complete final gates |
| Universal COR | 🔴 withheld | Multiple mandatory target gaps and current COR freshness failure | Independent finalization only after every mandatory gate is fresh and green |

## 3. Critical code-level findings

### F-08 — Transport provenance can be forged by an injected executor

The current lifecycle checks whether the returned object contains a source string matching `airroofers-live-transport`. The receipt may then be populated from the same returned object. This is a useful consistency marker but is not cryptographic or capability-based proof that the HTTP request passed through the trusted provider adapter.

**Required implementation:** move the only production activation path behind a private trusted transport service. The service itself must validate endpoint allowlisting, credentials, HTTP status, response schema, model identity, correlation ID, timestamp and response digest. The activation method should accept only a receipt created by that service through a private constructor/internal capability—not a plain caller-authored object.

Illustrative shape (not a drop-in replacement until adapted to the repository's actual types):

```ts
const trustedReceiptBrand: unique symbol = Symbol("TrustedLiveInferenceReceipt");

export type TrustedLiveInferenceReceipt = Readonly<{
  readonly [trustedReceiptBrand]: true;
  readonly modelId: string;
  readonly candidateSha: string;
  readonly correlationId: string;
  readonly httpStatus: 200;
  readonly endpointHost: "ai.airroofers.eu";
  readonly responseDigestSha256: string;
  readonly observedAt: string;
}>;

// Keep the factory private to the trusted Air Roofers transport module.
// Do not export a function that accepts arbitrary receipt JSON.
function createTrustedReceipt(
  verified: VerifiedAirRoofersResponse
): TrustedLiveInferenceReceipt {
  return Object.freeze({
    [trustedReceiptBrand]: true,
    modelId: verified.modelId,
    candidateSha: verified.candidateSha,
    correlationId: verified.correlationId,
    httpStatus: 200,
    endpointHost: "ai.airroofers.eu",
    responseDigestSha256: verified.responseDigestSha256,
    observedAt: verified.observedAt,
  });
}
```

A TypeScript brand alone is not a security boundary after serialization or across JavaScript modules. The actual design must enforce module encapsulation and runtime validation, and must not accept serialized/caller-created objects as proof. Prefer an internal service that performs the request and activation in one controlled transaction, persisting only the verified redacted receipt.

Acceptance tests must prove that the following all fail to activate a model: a fake callback returning a non-empty string; an object spoofing `source`; a fabricated digest; a test-only receipt; a stale candidate SHA; an endpoint outside the allowlist; a response for a different model; a capability probe returning `{ok:true}` without network activity; and a receipt copied from another workflow run.

### F-09 — Remove the remaining default-success probe

Current code contains this fallback:

```js
await lifecycle.probeCapability(
  options.probeFn || (async () => ({ ok: true }))
);
```

The production-only check for `options.probeFn` is not sufficient for the declared zero-stub objective. The fallback remains executable outside production and can make a non-live path look like a capability pass.

Replace it with a mandatory trusted capability adapter:

```js
if (typeof options.probeFn !== "function" ||
    options.probeFn.trustLevel !== "provider-live") {
  throw new QualificationGatewayError(
    "CAPABILITY_PROBE_REQUIRED",
    "A genuine provider capability probe is required; no synthetic fallback is allowed",
    503
  );
}
const capability = await options.probeFn(model);
if (!capability || capability.ok !== true ||
    capability.source !== "airroofers-live-transport") {
  throw new QualificationGatewayError(
    "CAPABILITY_PROBE_FAILED",
    "Live provider capability verification failed",
    503
  );
}
```

The `trustLevel` marker above is illustrative only and must not itself be caller-forgeable. Use the same private trusted-adapter boundary as the inference receipt. Do not keep a mock fallback for development qualification; test doubles belong only in isolated unit tests and must emit `testOnly: true` receipts rejected by production verification.

### F-10 — Evidence candidate is inconsistent across the workflow

The checked-in evidence manifest names candidate `55447c495c1c086286774170f706fcbe9b6f6646`, but the failing COR freshness step reports stale paths since `d641981dd5a9e056dfc8ba59c54ab75da44ef271`. The run checks out SHA `55447c...` exactly, yet the freshness verifier uses a different candidate baseline. This suggests workflow inputs, manifest data, environment variables or verifier defaults are not using a single source of truth.

**Required remediation:**
1. Make candidate SHA an explicit required workflow input derived from the exact checked-out SHA.
2. Pass it unchanged to evidence generation and verification; reject any manifest candidate mismatch.
3. Remove stale default/pinned candidate values and ensure they cannot override the workflow SHA.
4. Regenerate all evidence from the actual candidate after source/config changes; do not relabel old receipts.
5. Ensure evidence-only descendants modify only explicitly allowlisted evidence paths.
6. Always create a diagnostic artifact on failure; a failed verification must still upload a report containing the exact mismatched SHA and changed paths, without falsely creating a successful COR artifact.
7. Rerun COR Certification and inspect all jobs before updating the dashboard.

Example shell guard:

```bash
set -euo pipefail
ACTUAL_SHA="$(git rev-parse HEAD)"
: "${COR_CANDIDATE_SHA:?COR_CANDIDATE_SHA must be supplied by the workflow}"
test "$ACTUAL_SHA" = "$COR_CANDIDATE_SHA"
node scripts/governance/verify-evidence-freshness.mjs
```

The verifier itself must consume the same explicit SHA and reject any conflict among `ACTUAL_SHA`, `COR_CANDIDATE_SHA`, manifest `candidateSha`, canary `gitSha`, native evidence `gitHeadSha`, and qualification report `gitSha`. Do not use a default SHA when the variable is absent.

### F-11 — AI report and canary describe different scopes

The live canary reports 30 available models and one execution result, while the qualification report records only a diagnostic model `prod-probe-check`, with no qualification receipts and zero active models. This is not necessarily a contradiction—the canary is a smoke test and the qualification report is a separate run—but the evidence bundle must explain the different scopes and run IDs.

Required: bind canary workflow run ID, model ID, response digest, candidate SHA, timestamp and endpoint to the report; distinguish discovery smoke test from per-model qualification; record each model's state and explicit reason; and derive `activeCount` from verified active receipts, never from a manually written summary.

## 4. Native platform and host/IDE qualification

The five Go thin-client binaries built successfully for Windows/AMD64, Linux/AMD64, Linux/ARM64, macOS/ARM64 and macOS/AMD64. That proves cross-build output for those targets, not native execution on all five targets. Current evidence records a full native Node qualification suite only on Windows/AMD64 (166/166). Linux/AMD64 and macOS/ARM64 evidence is narrower.

Universal support requires native per-target evidence for install, first launch, authentication, provider/host connection, real execution, health/readiness, upgrade, interrupted-upgrade recovery, rollback, cleanup, permission denial, network failures and audit receipt generation. For IDEs, add actual install/auth/workspace/action/remote-workspace/update/uninstall tests. For each host/provider, test each operation against disposable infrastructure and attach redacted operation receipts.

Do not mark a target green merely because it builds, has an adapter class, appears in a matrix, or returns a fail-closed unsupported error. Fail-closed is correct safety behavior; it is not proof of support.

## 5. Immediate execution sequence

1. **P0:** remove default-success capability fallback and close the caller-forgeable transport provenance path.
2. **P0:** fix the stale candidate mismatch between workflow SHA and evidence freshness verifier.
3. **P1:** run genuine live capability probe and real inference per intended model using authorized secrets from the credential broker; emit one receipt per qualified model. If only zero models qualify, keep the product status at zero active.
4. **P1:** rerun COR Certification on a clean exact-SHA checkout and verify the AWS physical gate, cleanup, COR finalization and evidence upload all complete successfully.
5. **P2:** reconcile the run IDs in the manifest; it currently cites CI run 40095423217 while the newer reported successful CI run is 40096092008. Include the workflow invocation that generated each receipt.
6. **P2:** run full native product qualification on Linux/AMD64 and macOS/ARM64, plus native Linux/ARM64 and Intel macOS if those remain in the supported scope.
7. **P2:** complete IDE and provider operation qualification or keep those targets explicitly unsupported/partial.
8. **P3:** rerun secret scanning and verify historical key status, then generate the final signed evidence bundle from the final candidate.
9. **P3:** independently review all receipts and regenerate the dashboard from evidence; do not hand-edit rows to green.

## 6. Commands and final gate

Use the checked-in package scripts and workflow inputs. At minimum, on a clean checkout of the intended candidate:

```bash
set -euo pipefail
git status --short
git rev-parse HEAD
npm ci
node scripts/governance/validate-repository.mjs
node --test tests/qualification/model-lifecycle-qualification.test.js
node --test tests/qualification/evidence-freshness.test.js
node --test tests/qualification/evidence-manifest.test.js
node --test tests/qualification/native-runner-evidence.test.js
node --test tests/qualification/target-matrix-fail-closed.test.js
node scripts/governance/verify-evidence-freshness.mjs
```

These commands are necessary but not sufficient. Run the real live AI workflow, full CI/CD, native target jobs and physical COR workflow. Capture the exact final run IDs and ensure all required jobs are completed successfully on the same candidate/evidence-only lineage. If any required job is failed, in progress, skipped, missing, or tied to another SHA, the release remains blocked.

## 7. Final disposition

The latest evidence demonstrates useful implementation progress: the manifest now includes the AI report; secrets are redacted in the checked-in provisioning receipt; target matrix statuses are more truthful; Windows qualification and the separate CI/CD workflow passed; and live API connectivity was demonstrated.

It does **not** demonstrate full AI model activation, an unforgeable trusted transport boundary, universal OS/IDE/host support, or a passing current COR freshness gate. Maintain **QUALIFIED WITH BOUNDED TARGET SUPPORT — UNIVERSAL CERTIFICATION NOT GRANTED**. Until the failed freshness gate and P0 AI trust-boundary findings are closed, the current candidate must not be described as finally COR-certified.
