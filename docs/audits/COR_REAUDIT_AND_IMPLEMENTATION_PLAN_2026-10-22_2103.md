# Ugondu COR Re-audit, Findings Ledger, and Full Remediation Plan

**Audit timestamp:** 2026-10-22 21:03 UTC  
**Repository:** `Chicitadel/ugondu`  
**Branch:** `phase4/production-hardening`  
**Observed pre-remediation HEAD:** `f7e5ce517e5d6c1a77df0fd51dc9f5b6f76ea36b`  
**Audit disposition:** 🔴 **HOLD — NOT UNIVERSALLY CERTIFIED**  
**Authority:** This evidence-bound audit and the latest GitHub Actions state. The document is a plan/evidence record, not a universal certification claim.

> **Evidence rule:** a green result is valid only for the exact commit SHA, workflow run, operation, platform, provider, and capability tested. Cross-compilation, a registry entry, unit tests, simulated HTTP, a health check, or a successful run on an older SHA is not proof of live universal support.

## 1. Executive assessment

Ugondu has a substantial implementation and governance base: multi-workspace builds, provider/catalog abstractions, COR workflows, repository policy gates, localization checks, qualification matrices, security-oriented provider transport controls, and prior successful physical AWS qualification runs. The latest observed candidate is nevertheless not releasable.

The most important newly verified regression is that push CI run [39853417908](https://github.com/Chicitadel/ugondu/actions/runs/39853417908), on `f7e5ce517e5d6c1a77df0fd51dc9f5b6f76ea36b`, failed in the **Run COR Remediation tests** step. Specifically, test `REAUDIT-F11` expects the policy-pack verifier to require trust roots pinned by the operator/CI environment. The source still allowed a repository-local public-key fallback. The test summary was 21 passed, 1 failed. This is a security-governance failure and must not be waived or weakened.

A source remediation was committed as `9423300b6a33dfe6ccbe4d47f6063c0ea84d7700` to remove the repository-local fallback and require externally supplied trust material. This remediation is **not certified until a new run on the final HEAD passes**. The audit document itself also changes the candidate SHA when committed; always re-read branch HEAD and Actions after documentation changes.

## 2. Current colour-coded certification overview

| Gate | Status at audit checkpoint | Evidence | Required closure |
|---|---|---|---|
| Branch identity | 🟢 Verified at checkpoint | Branch API returned `f7e5ce5…` | Re-read exact final HEAD after all commits |
| Brand asset audit | 🟢 Pass on checkpoint SHA | [Run 39853427771](https://github.com/Chicitadel/ugondu/actions/runs/39853427771) succeeded on `f7e5ce5…` | Must also pass on final SHA |
| CI build/workspace jobs | 🔴 Fail on checkpoint SHA | [Run 39853417908](https://github.com/Chicitadel/ugondu/actions/runs/39853417908); 17 jobs shown, integration test job failed | Re-run after trust-root remediation; inspect all jobs and logs |
| COR software gate | 🟠 Pending at last read | [Run 39853417911](https://github.com/Chicitadel/ugondu/actions/runs/39853417911) | Fetch final conclusion and artifacts |
| AWS physical qualification | 🟠 In progress on prior candidate | [Run 39850666621](https://github.com/Chicitadel/ugondu/actions/runs/39850666621): software job passed; physical job still running at last read | Record terminal result; repeat or prove accepted immutable evidence for final candidate |
| Policy-pack trust-root integrity | 🔴 Regression observed; source fix committed | Failure was explicit in CI logs; remediation commit `9423300…` | Require external trust anchor; prove missing/wrong key fails closed; fresh CI must pass |
| Air Roofers AI adapter source | 🟠 Implemented adapter, live path unproven | `server/engine-core/src/ai/airroofers-provider.ts`; default transport uses HTTPS fetch, rejects redirects, catalog-based endpoint config, credential broker, model discovery and invocation methods | Execute real authenticated canary through actual service; capture redacted receipt |
| AI credential-to-canary wiring | 🔴 Open | `.github/workflows/cor.yml` does not currently establish a verified live canary step; repository tree search found no verified dedicated live-canary script | Verify actual service credential contract, implement real canary and wire secret only to trusted workflow |
| Live model discovery/switch/fallback | 🔴 Open | Adapter/catalog code and simulated staging tests exist; staging spec uses an injected simulator and fabricated responses | Real authenticated discovery, inference, switching, fallback, provenance and negative-path tests |
| Zero hardcoding | 🟠 Partial / requires whole-repo proof | Catalog-driven endpoint selection exists, but catalogs/tests contain literal metadata and route fixtures; static scans alone are insufficient | Separate prohibited production literals from governed metadata; scan runtime code/config/workflows and test runtime behavior |
| Zero mocks/stubs/scaffolding | 🟠 Partial / requires runtime proof | Anti-stub and adversarial suites exist; AI staging suite explicitly uses `createStagingSimulator` | Simulators may test contracts but must never count as live certification; prove every production feature reaches a real adapter or fails explicitly |
| Native OS/architecture matrix | 🟠 Partial | `config/qualification/target-matrix.json` marks `windows/amd64`, `linux/amd64`, `darwin/arm64` native-tested and `linux/arm64`, `darwin/amd64` cross-compiled-only | Native execution and runtime E2E per target, or status UNSUPPORTED |
| IDE matrix | 🔴 Not universal | Target matrix lists VS Code experimental; JetBrains, Cursor, Windsurf, Neovim unsupported | Implement and qualify each integration, or keep it explicitly unsupported |
| Host/provider operation matrix | 🟠 Partial | Matrix lists AWS, DirectAdmin, cPanel, SSH VPS, Docker and Kubernetes tested; GCP/Azure unsupported | Evidence per provider *and per operation* (discover, preflight, provision, verify, repair, rollback, cleanup); no inferred support |
| UI/CLI/API parity | 🟠 Partial | Contract/inventory tests reported; no complete live parity evidence established here | Execute the same authorized scenario through each advertised surface and compare results/errors |
| Branch protection | 🟠 Previously reported enabled; not independently re-read | Prior operator readback claimed required checks/CODEOWNERS; API permissions previously returned 403 for protection endpoint | Administrator must verify protection/ruleset settings and save evidence |
| Final COR sign-off | 🔴 HOLD | Mandatory gates remain open or stale | All mandatory gates green on one immutable SHA, evidence digest verified, independent reviewer signs |

### Interpretation

- 🟢 PASS means evidence is fresh and bound to the exact candidate.
- 🟠 PARTIAL means implementation exists but scope, native execution, external verification, or freshness is incomplete.
- 🔴 OPEN/FAIL/HOLD means a mandatory release requirement is not proven or is failing.
- ⚪ NOT RUN means no reliable evidence has been obtained.
- Do not label “all platforms supported” green. Universal support is a measured matrix, not a marketing assertion.

## 3. Findings and remediation ledger

### F-011 — Repository-local policy-pack trust fallback contradicts external trust policy

**Severity:** Critical governance/security gate  
**Evidence:** `tests/cor-remediation.test.js` checks that the verifier includes the phrase `Trust roots must be pinned by the operator/CI environment` and that repository-local private key fallback is forbidden. The verifier's prior `resolvePackPublicKey()` function read `config/trust/uplm_pack_authority.pub.pem` when the environment variable was absent. CI failed on this mismatch.

**Remediation committed:** `scripts/governance/verify-policy-pack-digests.mjs` now returns no key when `UGONDU_PACK_PUBLIC_KEY` is absent and contains an explicit operator/CI trust-root comment. No local fallback is permitted.

The resolver's required fail-closed behavior is:

```js
export function resolvePackPublicKey() {
  if (process.env.UGONDU_PACK_PUBLIC_KEY) {
    const raw = process.env.UGONDU_PACK_PUBLIC_KEY.trim();
    if (raw.includes('BEGIN')) {
      return crypto.createPublicKey(raw);
    }
    return crypto.createPublicKey({
      key: Buffer.from(raw, 'base64'),
      format: 'der',
      type: 'spki'
    });
  }
  // Trust roots must be pinned by the operator/CI environment.
  // Never silently trust a repository-local key as the verification authority.
  return null;
}
```

This deliberately removes the prior `config/trust/uplm_pack_authority.pub.pem` fallback. It does not disable verification: it requires the operator/CI to inject the independently trusted public key. If the variable is absent, verification must fail closed.

**Required proof:**

```bash
# Run from a clean checkout of the exact candidate SHA.
node tests/cor-remediation.test.js
UGONDU_PACK_PUBLIC_KEY="$UGONDU_PACK_PUBLIC_KEY" node scripts/governance/verify-policy-pack-digests.mjs
```

The second command is illustrative only: do not type a secret or key into a shell command line. Supply the approved public trust anchor through the protected environment/CI variable. In a negative test, run with the variable absent and confirm verification fails closed; run with a wrong key and confirm signature verification fails. The verifier must not trust a public key merely because it is present in the same repository as the signed artifact.

### F-012 — Stale certification dashboard and candidate identity drift

**Evidence:** the prior dashboard named `e26989fb…` as Active HEAD even though the live branch endpoint later resolved to `f7e5ce5…`. The master checklist also retained an older candidate SHA. This can cause a historical PASS to be mistaken for a current result.

**Remediation:** this document is the current detailed checkpoint record. Reconcile the dashboard/checklist against live Actions on every candidate. Preserve older evidence as historical and immutable; never rewrite a historical result as though it were run on a new SHA.

**Acceptance:** dashboard candidate SHA equals branch HEAD; every displayed run's `head_sha` matches the row; pending/cancelled/failed runs remain visibly non-green; artifact digests and timestamps are recorded.

### F-013 — AI adapter exists, but live production activation is not proven

**Observed source:** `server/engine-core/src/ai/airroofers-provider.ts` implements a production HTTP transport using `fetch`, timeout cancellation, `redirect: 'error'`, endpoint lookup through provider catalog/environment, credential broker use, `discoverModels()`, and `invoke()`. Empty model capability catalogs fail with `MODEL_CATALOG_EMPTY`. This is meaningful adapter implementation, but not proof the real service accepts the credential or that the actual workflow executes it.

**Gaps:**
1. No verified dedicated live-canary script was found in the current repository tree.
2. `.github/workflows/cor.yml` has no established mapping of `secrets.UGONDU_AIRROOFERS_AI_KEY` to a real inference step.
3. The staging E2E spec defines `createStagingSimulator` and returns fabricated health/model/inference payloads. This is useful for controlled contract tests only; it is not live-provider evidence.
4. `healthCheck()` success is reachability/configuration evidence only. It must not be interpreted as authenticated inference.
5. `config/model-catalog.json` includes provider/model entries and conformance fields such as `contractTestsPassed: true` and timestamps. Those declarations are not substitutes for CI evidence and should be generated or refreshed from signed, current qualification evidence rather than treated as self-authenticating claims.

**Remediation sequence:**
- Obtain the authoritative API contract from the service operator: authentication, scopes, model listing route, inference route, payload schema, response schema, correlation headers, rate limits, and error semantics. The current adapter defaults to `/health`, `/v1/ai/models`, and `/v1/ai/execute`; confirm these match the deployed API rather than assuming they do.
- Obtain a real service-issued credential through the actual service administrator/key-management process. The repository secret name does not mint a credential.
- Store the key as GitHub Actions secret `UGONDU_AIRROOFERS_AI_KEY`; never commit it or expose it to untrusted PR/fork jobs.
- Confirm catalog `endpointEnvVar` and credential references agree with the runtime's environment contract. Use `UGONDU_AIRROOFERS_AI_BASE_URL` only if that is the configured endpoint variable for this provider.
- Implement a reviewed live canary script that sends a small non-sensitive request to the actual endpoint with the default production transport. No fake transport, canned body, simulator, or synthetic success may be used in the canary.
- Add a trusted push/manual-only workflow step with the real verified script path. Do not add a placeholder script or pass credentials into untrusted pull requests.
- Save a redacted evidence receipt containing exact SHA, workflow/run/job ID, UTC timestamp, model ID/provider, HTTP outcome, latency, correlation ID, response-schema validation, and digest. Do not save request/response secrets or sensitive prompt content.
- Prove invalid/missing key, disabled provider, empty model catalog, timeout, non-2xx response, redirect, denied egress/private host, and malformed response all fail closed.
- Test model discovery, invocation, controlled model selection, at least two genuinely available routes if the product claims multi-model switching, and fallback only to an explicitly authorized route. If only one real route is available, report multi-route switching as NOT QUALIFIED.

**Credential handling runbook:** [AIRROOFERS_AI_CREDENTIAL_PROVISIONING.md](../security/AIRROOFERS_AI_CREDENTIAL_PROVISIONING.md). Do not invent token-generation commands or undocumented service endpoints.

### F-014 — Universal support claims exceed native and IDE qualification evidence

**Evidence:** `config/qualification/target-matrix.json` currently records two OS/architecture cells as cross-compiled-only. It also records several IDE integrations as unsupported and several cloud providers as unsupported. The current matrix is appropriately more truthful than a blanket green claim, but it does not satisfy a requirement for all platforms to be green.

**Remediation:**
- Keep cross-compiled-only targets amber; cross-compilation validates compiler output, not runtime behavior.
- Add native runners for each claimed OS/architecture cell. Each must run install/launch, version/help, a real no-op or read-only command, authenticated API call where relevant, cancellation/timeout, filesystem/permission handling, exit-code and diagnostic checks, upgrade/uninstall, and a small end-to-end deployment in a safe target.
- For IDEs, test the actual extension/plugin or protocol integration from a clean installation. Verify auth, command invocation, cancellation, logs, errors, capability parity, and supported editor versions.
- For every host/provider, certify each advertised lifecycle operation separately. A successful AWS operation does not qualify DirectAdmin or Kubernetes; a tested discovery operation does not qualify rollback.
- If a cell cannot be tested or implemented, mark it `unsupported` / `UNSUPPORTED_CAPABILITY`, not green. A truthful unsupported result is preferable to fabricated universality.

**Acceptance:** each matrix row includes target/version, native runner identity, exact SHA, workflow/job ID, operation, test evidence URI/digest, timestamp, result, and reviewer. Matrix status is derived from evidence, not manually asserted.

### F-015 — Zero-hardcoding policy needs runtime-level boundaries

A literal is not automatically a defect: schema constants, protocol names, stable error codes, and test fixtures can be legitimate. The rule must explicitly prohibit operational facts being embedded in production logic: endpoint hosts, account identifiers, regions, credentials, tenant-specific values, paths to deployment targets, provider availability, and defaults that silently choose an environment.

**Remediation:**
- Load runtime endpoints, region/zone, tenant/project/account, credentials, and deployment targets from validated configuration, actor selection, provider discovery, or secretless identity.
- If region is required and absent/ambiguous, prompt for it with examples; do not silently choose Paris or `eu-west-3`. Normalize a city/country/region ID only through a maintained provider region catalog or provider API.
- Maintain an exception register with path, literal, reason, owner, risk, expiry/review date, and tests. No wildcard blanket exceptions.
- Add mutation tests: inject a forbidden endpoint/region/account literal and prove governance fails; remove required configuration and prove runtime fails closed.
- Search production code, workflow YAML, docs that are executable, deployment templates, examples copied by installers, and generated bundles. Review every hit; a regex count alone cannot establish zero hardcoding.

Example operator-controlled region selection (pseudocode; integrate with the real region resolver rather than shipping this as a standalone fake):

```ts
const selection = await regionResolver.resolve(actorInput.region);
if (selection.kind === 'missing' || selection.kind === 'ambiguous') {
  throw new ConfigurationRequiredError({
    code: 'REGION_SELECTION_REQUIRED',
    examples: regionResolver.examples()
  });
}
const region = selection.providerRegionId;
```

Acceptance: no silent region default; selection is persisted in the deployment plan and evidence; every region choice is auditable.

### F-016 — Mock/stub/scaffolding elimination must cover production reachability

**Remediation:**
- Keep unit-level test doubles isolated under test-only modules and enforce import-boundary rules so production entrypoints cannot load them.
- No TODO-only implementation, empty method, success-returning placeholder, synthetic health response, in-memory-only production persistence, or “implemented” registry entry without real wiring.
- Replace vacuous assertions with behavioral assertions that fail if the implementation is removed or returns fabricated success.
- Run mutation tests against the validator itself: introduce a fake success, empty handler, constant response, or disconnected adapter and prove the gate fails.
- Every unsupported capability returns a typed, localized, documented error with a non-zero exit/error outcome. No quiet skip.

Acceptance: zero critical surviving mutants; all public capabilities map to production code paths; no production test-double injection path; negative tests demonstrate fail-closed behavior.

## 4. Ordered implementation and certification plan

### Phase 0 — Freeze candidate and provenance
1. Read live branch HEAD and tree SHA.
2. Read Actions runs for the branch and map every run to its exact `head_sha`.
3. Confirm the worktree/checkout is clean and no generated/untracked source was omitted.
4. Freeze a candidate SHA only after code and docs are complete; any later commit invalidates the “current candidate” designation.
5. Preserve run URLs, artifacts, signatures, digests, and UTC timestamps.

Commands:

```bash
git fetch origin
git checkout phase4/production-hardening
git pull --ff-only
git rev-parse HEAD
git status --short
npm ci
```

### Phase 1 — Governance and regression
Run the canonical gates from a clean checkout:

```bash
npm run build
npm run governance:validate
node tests/cor-remediation.test.js
node tests/qualification/evidence-pipeline-adversarial.test.js
node tests/qualification/shared-execution-and-mode-parity.test.js
node tests/qualification/cor-workflow-gates.test.js
npm run verify:release-integrity
```

If a command name differs in the checked-out package scripts, use the actual declared script and update this runbook; do not invent a script merely to match this document. Save full logs. Any failure blocks certification.

### Phase 2 — AI live qualification
1. Confirm service API contract and credential issuer.
2. Store the issued secret in GitHub Actions settings.
3. Wire the secret only to a trusted live-canary job.
4. Run authenticated model discovery and real inference through the production adapter.
5. Prove model ID and response provenance, not merely HTTP 200.
6. Exercise unauthorized, expired/missing credential, disabled route, timeout, rate limit, malformed payload, and denied egress.
7. Test switch/fallback only for actual enabled routes; record per-route status.
8. Produce a redacted, signed/digested receipt.

The workflow must not expose `UGONDU_AIRROOFERS_AI_KEY` to pull-request code from forks. The secret value must never appear in logs, command-line arguments, artifacts, source, issue comments, or audit docs.

### Phase 3 — Platform, IDE, host/provider, and surface matrix
For every declared support cell, run a native test and real operation. Suggested matrix columns:

```text
candidate_sha,target,runner_id,os_version,arch,tool_version,provider,
operation,auth_mode,capability,status,workflow_run,job_id,evidence_digest,
tested_at_utc,reviewer,limitations
```

Required lifecycle operations: discover, preflight, provision, verify, repair, rollback, cleanup. Required surfaces: CLI, API, UI, and every IDE integration advertised as supported. Do not infer parity from shared internal functions; test observable behavior at each entrypoint.

### Phase 4 — Security, resilience, and operational proof
- Test SSRF/private-address rejection, redirect rejection, TLS failure, timeouts, retries, cancellation, rate limiting, credential redaction, tenant isolation, least privilege, and no-secret logs.
- Test URRE transaction persistence, crash/resume, idempotency, rollback ordering, partial failure, and cleanup against a real isolated provider target.
- Verify cloud resource readback and zero-residual cleanup with actual provider APIs/waiters. A simulated cloud response does not count.
- Confirm SBOM, dependency audit, release provenance, signatures, externally pinned trust roots, and evidence bundle integrity.
- Verify branch rules and CODEOWNERS with an authorized repository administrator. If API access returns 403, record that as “not independently verified”, not PASS.

### Phase 5 — Freeze, certify, and prevent regression
1. Wait for push CI, COR software gate, physical gate, brand audit, and all required status checks to reach terminal success on the same final SHA.
2. Confirm no mandatory job is skipped, cancelled, stale, or missing.
3. Verify artifact digests/signatures against independently pinned trust roots.
4. Require independent reviewer approval and attach the signed certification record.
5. Tag/release only the certified SHA.
6. Any code, workflow, policy, catalog, target-matrix, or certification-logic change reopens affected gates and requires new exact-SHA evidence.

## 5. Live status commands for operator verification

```bash
gh auth status
gh repo view Chicitadel/ugondu
gh run list --repo Chicitadel/ugondu --branch phase4/production-hardening --limit 20
gh run view <RUN_ID> --repo Chicitadel/ugondu
gh run view <RUN_ID> --repo Chicitadel/ugondu --log-failed
```

Replace `<RUN_ID>` with an observed run ID. Never claim a run is green from its title or from a prior candidate.

## 6. Release acceptance criteria (all mandatory)

- [ ] One frozen candidate SHA; all status evidence maps to it.
- [ ] Current CI, COR, brand audit, release integrity, and physical qualification complete with success.
- [ ] Policy-pack/evidence trust roots externally pinned; absent/wrong key negative tests fail closed.
- [ ] Repository governance validates; all exceptions scoped and reviewed.
- [ ] Zero production mocks/stubs/scaffolding and no vacuous success assertions; adversarial mutation gates pass.
- [ ] Zero prohibited operational hardcoding; required configuration prompts or fails closed.
- [ ] Real authenticated Air Roofers AI discovery and inference pass; credential redaction verified.
- [ ] Model switching/fallback is green only for routes tested against real available providers.
- [ ] Each OS/architecture cell is native-tested or explicitly unsupported.
- [ ] Each IDE, provider, host, operation, and UI/CLI/API surface is tested or explicitly unsupported.
- [ ] Real deployment lifecycle, rollback, and zero-residual cleanup evidence exists for every claimed provider/operation.
- [ ] SBOM, dependency audit, signed evidence, provenance, branch protection, and independent sign-off verified.
- [ ] Certification dashboard refreshed from live evidence; no stale SHA claims.

**Final disposition remains 🔴 HOLD — NOT UNIVERSALLY CERTIFIED until every mandatory criterion above has current, exact-SHA evidence.**

## 7. References

- [Ugondu COR Certification Progress Dashboard](COR_CERTIFICATION_PROGRESS_2026-10-22.md)
- [Master Execution & Certification Checklist](MASTER_EXECUTION_AND_CERTIFICATION_CHECKLIST_2026-10-22.md)
- [Universal Implementation Blueprint](COR_UNIVERSAL_IMPLEMENTATION_BLUEPRINT_2026-10-22.md)
- [Evidence Reconciliation & Release Gate](COR_EVIDENCE_RECONCILIATION_AND_RELEASE_GATE_2026-10-22.md)
- [Air Roofers AI Credential Provisioning](../security/AIRROOFERS_AI_CREDENTIAL_PROVISIONING.md)
- [GitHub Actions secrets security](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions)
- [GitHub CLI secret set](https://cli.github.com/manual/gh_secret_set)
- [GitHub Actions workflow runs API](https://docs.github.com/en/rest/actions/workflow-runs)
