# Ugondu COR Re-audit Addendum — Evidence Reconciliation and Universal Qualification

**Audit checkpoint:** 2026-10-22 17:45 UTC  
**Repository:** https://github.com/Chicitadel/ugondu  
**Branch:** `phase4/production-hardening`  
**Observed HEAD:** `e4e670afd642e030ebda6a61eac23ef70d3a7112`  
**Code candidate evaluated:** `096668776b65d4fd28135dd08efc38aac3116cf3`  
**Disposition:** 🔴 **HOLD — NOT UNIVERSALLY CERTIFIED**  
**Governance:** UAIGOS-aligned, evidence-first, fail-closed; no certification by configuration assertion.

> This addendum records a point-in-time audit. Run statuses can change. A passing child job, cross-compile, unit test, mocked transport, or declarative matrix value is not proof of universal operational readiness.

## 1. Executive finding

Progress is substantial: the supplied audit trail reports removal of vacuous `expect(true).toBe(true)` assertions, replacement of seven placeholder test files with behavioral assertions, passing software COR checks on candidate `09666877`, successful five-target Go client builds, localization parity, anti-stub governance, and successful CI/CD on documentation HEAD `e4e670af`.

However, the newest code candidate and current documentation HEAD must not be conflated. On the observed documentation HEAD, CI/CD run [39824623462](https://github.com/Chicitadel/ugondu/actions/runs/39824623462) completed successfully, while CI run [39824632526](https://github.com/Chicitadel/ugondu/actions/runs/39824632526), Brand Asset Audit [39824632351](https://github.com/Chicitadel/ugondu/actions/runs/39824632351), and COR [39824623474](https://github.com/Chicitadel/ugondu/actions/runs/39824623474) were queued, in progress, or pending at the observation point. Older physical AWS evidence is candidate-bound and cannot be silently transferred to a newer SHA.

Three material gaps remain:
1. Authenticated live AI execution through `ai.airroofers.eu` has not been evidenced on the candidate. Public health success and unauthenticated HTTP 401 do not prove inference.
2. Native OS/architecture and IDE/host/provider qualification is incomplete. Cross-compilation and matrix declarations are not native execution evidence.
3. Release governance remains open in the supplied ledger: branch protection/required reviews and independent second-party sign-off must be verified.

## 2. Evidence and status matrix

| Gate | Status | Evidence / gap | Closure criterion |
|---|---|---|---|
| Exact candidate provenance | 🟠 In progress per latest HEAD | Candidate `09666877` has reported successful CI/software COR. Documentation HEAD is `e4e670af`; evidence from a different SHA is not inherited automatically. | Every artifact and qualification receipt names the exact commit SHA and workflow run; final candidate gets fresh complete gates. |
| CI/CD / governance | 🟢 Latest completed CI pass; newer runs pending | [Run 39824623462](https://github.com/Chicitadel/ugondu/actions/runs/39824623462) success. Run [39824632526](https://github.com/Chicitadel/ugondu/actions/runs/39824632526) was queued; do not treat its result as known. | All required workflows conclude success on the same final candidate; no required job skipped without an approved, policy-governed reason. |
| Anti-vacuous tests | 🟢 Prior source/test evidence; continuous gate required | The ledger reports static bans for `expect(true).toBe(true)` and `assert.ok(true)`, plus adversarial checks. | Repository-wide scanner and mutation tests pass on final SHA; test the scanner itself with known bad fixtures and prove nonzero exit. |
| Placeholder test replacement | 🟢 Prior engine-core evidence | Ledger reports 37 suites / 186 tests passing, zero skipped. Test fixtures may be used in unit tests. | Verify production entrypoints cannot resolve test fixtures; real environment tests remain separate and required. |
| Air Roofers AI transport & policy | 🟠 Code path present; live proof open | `airroofers-provider.ts` uses catalog-governed provider configuration, configurable endpoint env var, `redirect: 'error'`, timeouts and bearer credential handling. These are implementation facts, not proof of live inference. | Authenticated, candidate-bound request through the actual external API; validate schema, model identity, response, latency and redacted correlation metadata. |
| AI staging suite | 🟠 Simulated contract evidence only | `airroofers-e2e-staging.spec.ts` contains an in-process simulated transport/staging base URL and captured requests. This is useful contract testing but is not external live E2E. | Preserve contract suite and add a separate opt-in live canary test with actual ephemeral credentials and a real network transport. |
| Real multi-model switching | 🔴 Open | AF-STG-011/012 are reported passing, but mocked/simulated catalog/transport does not establish real upstream switching. | Two or more enabled, signed/catalog-authorized real model routes each return verifiable model identity; prove deterministic fallback and policy-denial cases against real service behavior. |
| Target OS/architecture | 🟠 Partial | CI builds `linux/amd64`, `linux/arm64`, `darwin/amd64`, `darwin/arm64`, `windows/amd64`. Matrix marks Linux/ARM64 and macOS/AMD64 cross-compiled-only. Build success is not runtime execution. | Native smoke, installation, upgrade, execution, failure recovery, cleanup and evidence capture on each advertised OS/architecture cell. |
| IDE integrations | 🟠 Partial / 🔴 unsupported cells | Matrix labels VS Code experimental and JetBrains, Cursor, Windsurf and Neovim unsupported. | Implement and qualify each advertised adapter; otherwise keep it explicitly unsupported and do not claim universal IDE support. |
| Host/provider integrations | 🟠 Claims need reconciliation | Matrix marks AWS, DirectAdmin, cPanel, SSH VPS, Docker and Kubernetes tested across discover/preflight/provision/verify/repair/rollback/cleanup, while GCP/Azure are unsupported. A matrix value alone is not evidence of each operation. | Every provider-operation pair must have a provider-native integration run and signed evidence. Downgrade unsupported or unevidenced cells until proven. |
| AWS physical lifecycle | 🟠 Candidate-bound evidence | Earlier runs reportedly completed physical AWS lifecycle and zero-residual checks; run 39821632890 was previously observed with the physical gate still running. Do not carry forward the earlier result to a new SHA. | Fresh physical run on final candidate, including Fargate, read-back assertions, teardown and zero-residual scan, with artifact digest and run ID. |
| Localization | 🟢 Prior evidence; final SHA gate required | Ledger reports 12 locales, 1,873 keys, placeholder parity and signed packs. | Re-run locale validation on final SHA; verify runtime locale discovery and no fallback literals in production surfaces. |
| Branch protection / second-party sign-off | 🔴 Open in supplied ledger | Ledger reports branch protection was not enabled and independent sign-off was outstanding. Current settings must be rechecked by an administrator. | Required status checks, reviews, stale approval dismissal, no force-push/bypass (except governed break-glass) and an independent signed COR decision. |

## 3. Required AI activation architecture

Ugondu must use the existing Air Roofers AI API as a provider-neutral, catalog-governed inference route—not embed model names or provider-specific logic in product code.

Required data flow:

```text
Ugondu capability
  -> Inference Gateway
  -> policy + tenant + budget + deadline checks
  -> signed Model Catalog / Provider Registry
  -> Air Roofers Provider Adapter
  -> credential broker (ephemeral secret; never log it)
  -> https://ai.airroofers.eu/v1/ai/execute
  -> response schema + model identity validation
  -> redacted audit receipt + caller result
```

Required controls:
- Resolve the base URL from governed provider catalog configuration and/or `UGONDU_AIRROOFERS_AI_BASE_URL`; never hardcode a region, model ID, tenant, secret, endpoint override or provider list in product logic.
- Inject `UGONDU_AIRROOFERS_AI_KEY` only from the CI secret store into the live-canary job. The inspected `.github/workflows/cor.yml` snippet shows AWS credential configuration but no demonstrated binding for this AI key; verify and add a dedicated live-canary step without exposing the secret to untrusted pull-request code.
- Keep live canary opt-in and restricted to trusted branch/workflow contexts. Do not print the secret, Authorization header, full prompt, personal data or provider response body in logs.
- Treat empty/unsigned catalog, disabled model, invalid credential, denied egress, timeout, malformed response, budget/deadline breach and provider outage as explicit fail-closed outcomes. Never silently switch to a fake, local stub or unapproved provider.
- Discover models through the configured `modelsPath`; map catalog aliases to provider model IDs through registry metadata. No model-specific branching in the gateway.
- Record commit SHA, workflow/run ID, provider ID, catalog digest, model alias, correlation ID, HTTP status, latency, policy decision and response-schema verdict. Store no secrets or raw sensitive prompts.
- A fallback may only use a separately enabled, policy-approved model with matching data residency and capability constraints; record the fallback decision. If no eligible model exists, return a typed failure.

### Live canary contract

The provider implementation constructs `POST /v1/ai/execute` with a bearer credential, `x-correlation-id`, and a body containing `model_id` and `payload`. The exact payload schema must be taken from the deployed API contract/controller and validated before enabling the job. Do not invent fields based only on a test fixture.

A live-canary script must:
1. require a trusted workflow context, base URL, ephemeral key and explicitly approved model alias;
2. issue a low-risk, non-sensitive prompt using the production transport;
3. require HTTP success and a schema-valid non-empty response with model identity matching the requested/approved route;
4. test invalid credentials separately and expect rejection without retrying with another credential;
5. write a redacted JSON receipt; and
6. fail the workflow if any assertion fails.

Example **shell preflight** (safe to run before the actual API-contract-specific POST; it deliberately does not claim inference success):

```bash
set -euo pipefail
: "${UGONDU_AIRROOFERS_AI_BASE_URL:?Set the governed AI base URL}"
: "${UGONDU_AIRROOFERS_AI_KEY:?Inject an ephemeral AI key from the CI secret store}"
: "${UGONDU_AIRROOFERS_MODEL_ALIAS:?Choose an enabled catalog model alias}"
case "$UGONDU_AIRROOFERS_AI_BASE_URL" in
  https://ai.airroofers.eu) ;;
  *) echo "::error::Unexpected AI base URL; require explicit governance approval"; exit 1 ;;
esac
case "$UGONDU_AIRROOFERS_MODEL_ALIAS" in
  *[!A-Za-z0-9._:-]*|'') echo "::error::Invalid model alias"; exit 1 ;;
esac
printf 'AI live-canary preflight passed; secret value was not printed.\n'
```

This preflight is only an input guard. It is **not** the live inference test. The actual POST must use the API's authoritative request/response schema, enforce TLS verification, apply a bounded timeout, avoid redirect following, redact output, and assert the returned model and response. Do not declare Gate C green until that real test has run successfully.

## 4. Universal target qualification: truth before green

A product can support a broad ecosystem through adapters, but it cannot claim every OS/IDE/host is certified without an explicit support contract and execution evidence. Separate these dimensions:
- **Implemented**: code exists.
- **Built**: compiler/build completed.
- **Contract-tested**: deterministic contract suite passed.
- **Native-tested**: actual target host executed tests.
- **Provider-qualified**: real provider credentials/environment exercised lifecycle operations.
- **Certified**: all mandatory tests and evidence accepted for a precise version/capability set.

For each target cell, store:
```json
{
  "target": "linux/arm64",
  "implementationStatus": "implemented",
  "buildStatus": "passed",
  "nativeExecutionStatus": "not-run",
  "qualificationStatus": "cross-compiled-only",
  "evidence": [],
  "lastQualifiedCommit": null
}
```

Do not use `nativeExecutionVerified: true` without a linked native-run receipt. Use a schema that requires evidence references for any `tested` or `certified` state, and validate that the referenced run's SHA, runner OS/architecture and test outcome match the target. Any missing evidence must downgrade the cell and fail the universal-certification gate.

Minimum native matrix:
- Windows x64; Linux x64; Linux ARM64; macOS ARM64; macOS x64 (if advertised/supported).
- Terminal CLI, non-model-assisted workflows, model-assisted workflows, interactive UI flows and headless/CI flows where applicable.
- Supported IDE adapters individually; unsupported integrations must return typed `UNSUPPORTED_CAPABILITY` with a useful remediation guide.
- Provider/host matrix by operation: discover, preflight, provision, verify, repair, rollback and cleanup. Test negative permissions, timeouts, partial failure, idempotent retry and resource leakage.
- A target may be marked green only for the exact qualified capability set, never as a blanket claim that every possible configuration is supported.

## 5. UAIGOS governance gates and zero-tolerance checks

| Control | Required invariant | Fail condition |
|---|---|---|
| Provenance | Exact SHA + clean checkout + immutable evidence digest | Artifact not bound to candidate |
| Zero hardcoding | Environment/region/provider/model/locale/product settings resolved through governed configuration or registry | Product/provider/region/model literal in production logic without explicit policy exemption |
| Zero mocks in production | Test doubles isolated to test-only dependency graph | Runtime can resolve mock/stub/fake adapter |
| Zero scaffolding/stubs | No TODO-only route, empty handler, placeholder implementation, fake success or fabricated evidence | Incomplete path can return success |
| Non-vacuous tests | Assertions verify behavior, state, output and failure modes | `expect(true)`, unconditional pass, skipped test hiding capability |
| Fail-closed | Unknown/unsupported/invalid input yields typed failure and no mutation | Silent fallback or best-effort mutation |
| Real E2E | Actual transport, actual target/provider, isolated test resources, captured evidence | Mock server presented as live external E2E |
| Cleanup | All resources tagged by run/transaction, then deleted and independently scanned | Residual resource, untagged mutation, cleanup result not verified |
| I18N | Runtime-discovered locale packs; key and placeholder parity | Hardcoded UI strings or unapproved fallback |
| Security | Secret masking, least privilege, TLS, SSRF controls, egress allowlist, redirect denial | Secret exposure, unapproved egress, redirect bypass |
| Release | Required CI checks, reviews, immutable artifact, independent COR sign-off | Branch can bypass required gates or evidence from a different SHA |

Recommended fail-closed validator contract:
```js
function requireEvidenceForStatus(cell) {
  const verified = new Set(["native-tested", "provider-qualified", "certified"]);
  if (verified.has(cell.qualificationStatus) && (!Array.isArray(cell.evidence) || cell.evidence.length === 0)) {
    throw new Error(`QUALIFICATION_EVIDENCE_MISSING:${cell.target ?? cell.provider ?? "unknown"}`);
  }
}
```
Adapt the validator to the repository's canonical schema and tests; do not introduce a second competing qualification schema.

## 6. Execution plan — ordered and exit-gated

### P0 — Freeze the candidate and reconcile evidence
1. Select one code SHA; record branch, tree hash, CI run IDs and all artifacts.
2. Re-run governance validator, full workspace tests, anti-stub/adversarial suite, localization validation, CI/CD and COR on that SHA.
3. Never reuse a successful result from a different SHA without an explicit, verified content-equivalence rule.
4. Confirm every test actually executes; inspect skipped counts and prove the anti-stub scanner fails on seeded bad fixtures.

Exit: all software gates green on the same exact SHA.

### P1 — Complete real Air Roofers AI activation
1. Verify the deployed API's authoritative execute request/response schema and credential scope.
2. Add a trusted-branch-only live canary job with ephemeral secret injection; do not expose it to untrusted PRs.
3. Run health, authenticated model discovery, authenticated inference, invalid-key rejection, malformed response, timeout and upstream outage tests.
4. Prove two enabled models can be selected by catalog alias with response identity validated; prove disabled/unsigned models are rejected and no fake fallback occurs.
5. Publish redacted receipts and digests.

Exit: authenticated live inference and real multi-model switching pass on the final SHA.

### P2 — Native OS/architecture and interaction-mode qualification
1. Add native runner jobs for every advertised OS/architecture.
2. Exercise install, version, execution, upgrade, rollback, resume after interruption, non-zero failures, localization and evidence output.
3. Test terminal-only operation with no AI credentials and model-assisted operation with approved credentials.
4. Reconcile `target-matrix.json` to actual evidence; downgrade untested cells.

Exit: every claimed supported target has target-bound native evidence; unsupported targets are explicitly documented and fail closed.

### P3 — Provider/host/IDE qualification
1. For each provider-operation pair, run isolated disposable integration tests with least-privilege credentials.
2. Test permissions denied, resource already exists, rate limit, timeout, interrupted provisioning, rollback and cleanup.
3. Qualify IDE adapters separately from CLI. Validate no IDE-specific behavior leaks into the universal engine.
4. Do not list GCP/Azure or any IDE as certified until real integration exists and passes.

Exit: support matrix agrees with evidence; no blanket provider/IDE green without qualification.

### P4 — Physical cloud and lifecycle proof
1. Run AWS provisioning and Fargate qualification on the final SHA and explicitly configured region.
2. Region must be supplied as a governed input or prompted for; accept region ID or human-friendly location only through a canonical resolver. No baked-in `eu-west-3` default.
3. Capture plan, preflight, resource IDs/tags, read-back assertions, rollback/cleanup logs and zero-residual scan.
4. Independently verify the cloud account/region and ensure no resources remain.

Exit: physical gate successful and cleanup independently confirmed.

### P5 — Release integrity and independent certification
1. Enable branch protection/rulesets, required reviews, required workflow checks and restricted bypass.
2. Validate external trust-root/policy-pack digests and evidence signatures.
3. Obtain independent second-party review of the evidence bundle.
4. Tag only the fully qualified SHA; publish a signed certification manifest listing exact supported cells and exclusions.

Exit: all required gates green on one SHA and independent sign-off accepted.

## 7. Operator commands and evidence capture

Run from the repository root; adjust package scripts only if the checked-in `package.json` defines a different canonical name:
```bash
set -euo pipefail
git status --short
git rev-parse HEAD
npm run governance:validate
npm --prefix server/engine-core test -- --runInBand
npm test -- --runInBand
```

Do not blindly run both test commands if the root scripts recursively duplicate the workspace suite; inspect the script definitions first and retain one canonical full-suite command. Record each command, exit code, duration, commit SHA and artifact digest. The exact COR workflow is `.github/workflows/cor.yml`; it runs the software COR and a separate AWS physical qualification gate. A successful software job alone is not full COR.

## 8. Required redacted evidence receipt

```json
{
  "schemaVersion": "1.0.0",
  "gate": "airroofers-live-inference",
  "commitSha": "<exact-40-character-sha>",
  "workflowRunId": "<github-run-id>",
  "providerId": "airroofers-ai",
  "catalogDigest": "sha256:<digest>",
  "modelAlias": "<approved-catalog-alias>",
  "correlationId": "<non-secret-id>",
  "httpStatus": 200,
  "latencyMs": 0,
  "responseSchemaValid": true,
  "returnedModelMatchesRequest": true,
  "secretLogged": false,
  "rawPromptLogged": false,
  "result": "PASS",
  "evidenceDigest": "sha256:<digest>"
}
```

All placeholders must be replaced by observed values; do not commit fabricated receipts. Any failed assertion must produce `FAIL`, not a success-shaped JSON object.

## 9. Current certification decision

🔴 **HOLD — NOT UNIVERSALLY CERTIFIED.**

The latest completed CI/CD run is green, and the earlier candidate shows meaningful software/governance progress. But live authenticated AI inference, real multi-model switching, all native target cells, all claimed provider/host/IDE integrations, fresh final-SHA physical lifecycle evidence, and release-governance sign-off are not all demonstrated together. The correct next step is to execute the P0–P5 exit gates, not to force every cell green by editing status fields.

## 10. References

- [Ugondu repository](https://github.com/Chicitadel/ugondu)
- [Latest observed HEAD: e4e670af](https://github.com/Chicitadel/ugondu/commit/e4e670afd642e030ebda6a61eac23ef70d3a7112)
- [Evaluated code candidate: 09666877](https://github.com/Chicitadel/ugondu/commit/096668776b65d4fd28135dd08efc38aac3116cf3)
- [Latest completed CI/CD run 39824623462](https://github.com/Chicitadel/ugondu/actions/runs/39824623462)
- [Current COR run 39824623474](https://github.com/Chicitadel/ugondu/actions/runs/39824623474)
- [COR workflow](https://github.com/Chicitadel/ugondu/blob/phase4/production-hardening/.github/workflows/cor.yml)
- [Air Roofers provider adapter](https://github.com/Chicitadel/ugondu/blob/phase4/production-hardening/server/engine-core/src/ai/airroofers-provider.ts)
- [AI staging contract suite](https://github.com/Chicitadel/ugondu/blob/phase4/production-hardening/server/engine-core/src/ai/__tests__/airroofers-e2e-staging.spec.ts)
- [Qualification target matrix](https://github.com/Chicitadel/ugondu/blob/phase4/production-hardening/config/qualification/target-matrix.json)
- [Governance validator](https://github.com/Chicitadel/ugondu/blob/phase4/production-hardening/scripts/governance/validate-repository.mjs)
- [COR progress dashboard](https://github.com/Chicitadel/ugondu/blob/phase4/production-hardening/docs/audits/COR_CERTIFICATION_PROGRESS_2026-10-22.md)
- [Master remediation plan](https://github.com/Chicitadel/ugondu/blob/phase4/production-hardening/docs/audits/COR_UNIVERSAL_READINESS_AND_REMEDIATION_2026-10-22.md)
- [Master execution checklist](https://github.com/Chicitadel/ugondu/blob/phase4/production-hardening/docs/audits/MASTER_EXECUTION_AND_CERTIFICATION_CHECKLIST_2026-10-22.md)
