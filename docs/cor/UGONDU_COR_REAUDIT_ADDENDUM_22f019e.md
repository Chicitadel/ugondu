# Ugondu COR Re-Audit Addendum — Candidate 22f019e

**Classification:** ENTERPRISE | INTERNAL  
**Product:** Ugondu — Universal Delivery Operating System  
**Legal entity:** Air Roofers SASU (France)  
**Audit date:** 2026-10-20  
**Repository:** https://github.com/Chicitadel/ugondu  
**Candidate under review:** `22f019e72bd953172d72d1cccf640023f8a87107`  
**Parent remediation plan:** [UGONDU_COR_REAUDIT_REMEDIATION_PLAN.md](./UGONDU_COR_REAUDIT_REMEDIATION_PLAN.md)  
**Sign-off record:** [UGONDU_COR_SIGN_OFF.md](./UGONDU_COR_SIGN_OFF.md)  
**Disposition:** **BLOCKED — NOT COR CERTIFIED**

> This addendum is based on source inspection at the exact candidate SHA and available GitHub Actions status metadata. It does not claim to have run the repository locally or accessed the AWS account. Current GitHub Actions runs associated with the candidate were returned as completed with `failure`; a successful all-gates-green run is not evidenced.

## 1. Executive finding

The candidate has meaningful improvements, including external trust-anchor requirements, a governed platform manifest, additional adversarial tests, and stronger workflow structure. However, the implementation still creates evidence records that overstate what was actually tested. The claimed closure checklist therefore exceeds the evidence visible in source and CI status.

Current CI evidence for this candidate:
- Ugondu CI/CD Pipeline run **39362874146** — completed, conclusion `failure`.
- Ugondu CI/CD Pipeline run **39362870040** — completed, conclusion `failure`.
- COR Certification run **39362870082** — completed, conclusion `failure`.
- Combined commit status query returned no individual statuses.

Run links:
- https://api.github.com/repos/Chicitadel/ugondu/actions/runs/39362874146
- https://api.github.com/repos/Chicitadel/ugondu/actions/runs/39362870040
- https://api.github.com/repos/Chicitadel/ugondu/actions/runs/39362870082

These are failures, not successful certification evidence. The exact failing job/step must be taken from the run logs and resolved; do not rerun blindly without preserving the failure artifacts.

## 2. Confirmed source-level findings

### F-01 — JUnit evidence is still synthesized from console output (P0)

**File:** `scripts/release/collect-qualification-evidence.mjs`  
**Observed behavior:** `runNodeScript()` runs a script, scans stdout/stderr for lines beginning with `[PASS]`, `✓`, or `PASS `, and returns the parsed lines as test cases. `renderJUnitSuite()` then writes a new JUnit XML file with all failures/errors/skips set to zero.

Removing the fallback testcase called `executed <script>` prevents one false-positive path, but it does not make the generated XML a native test report. A test runner may print only some assertions, omit failed/skipped cases from the parsed set, or use output formatting that is not a faithful test inventory. The generated report asserts `failures=0`, `errors=0`, and `skipped=0` instead of importing those counts from the authoritative runner.

**Required remediation**
1. Use native reporter support for each test runner (JUnit, TAP, JSON or framework-native format).
2. Preserve stdout, stderr, exit code, duration, runner version, and native result file separately.
3. Validate native report schema and reconcile its totals against runner summary and exit code.
4. If a test script has no native machine-readable report, add one to that test framework or classify the suite as non-certifying until it does.
5. Negative tests must prove failure, error, skipped, cancelled, empty and malformed reports are rejected.

**Acceptance:** no code in the certification path constructs a passing test case by parsing console lines; raw native reports and process exit status are both verified.

### F-02 — Platform manifest overstates qualification tier (P0)

**File:** `config/qualification/platform-matrix.json`  
**Observed behavior:** Linux/amd64, Windows/amd64, macOS/arm64, AWS, DirectAdmin, Docker Compose and repository providers are declared with `qualificationTier: "tested"`. Their commands include a generic `tests/cor-remediation.test.js`, `tests/repository-adapter.test.js`, `tests/deployment-lifecycle.test.js`, or `docker compose config`. Those commands do not, by themselves, qualify each target.

The collector's `tests/compatibility-results.json` sets `platformsVerified: [currentPlatformId]`, which is appropriately narrow, but still writes `status: 'PASS'` for the whole compatibility artifact. It creates `matrixRows` by copying manifest rows and setting `verifiedOnCurrentHost` from OS/architecture equality; it does not execute each row's command or require a passing evidence record per row.

**Required remediation**
1. Set unqualified rows to `planned` or `unqualified`; do not label them `tested` based on intended commands.
2. Create a runner that executes every required manifest row on its declared native runner and captures row-specific results.
3. Require one unique, fresh evidence record for each required row, bound to commit/tree, OS, architecture, runtime, provider, mode, and workflow run.
4. Reject a matrix PASS when any required row is missing, skipped, stale, or not actually executed.
5. Separate compile/build checks from runtime/provider qualification.
6. Add real disposable provider sandbox tests for AWS, shared hosting, Docker/Compose and every repository adapter actually claimed as supported.

**Acceptance:** a universal qualification claim is allowed only when all declared required rows have actual passing evidence. Otherwise the product release must list the exact qualified subset and mark remaining targets unqualified.

### F-03 — Repository provider results are copied from the manifest (P0)

**File:** `scripts/release/collect-qualification-evidence.mjs`  
**Observed behavior:** `repositoryProvidersVerified` is created by mapping all matrix entries where `targetType === 'repository-provider'`. This is manifest enumeration, not execution evidence. A generic repository-adapter test does not establish that GitHub, GitLab, Bitbucket and AWS CodeCommit each authenticated, performed required operations, enforced authorization, and verified postconditions.

**Required remediation**
- Replace `repositoryProvidersVerified` with provider IDs derived only from independently validated per-provider result artifacts.
- For each provider, test real authentication in a sandbox, read/write permissions, denied permissions, rate-limit/timeout handling, pagination, retry/idempotency, token redaction and cleanup where relevant.
- If credentials or sandbox access are unavailable, record `NOT_RUN`/blocked and fail any release that claims that provider qualified.

**Acceptance:** no provider can be reported verified because it appears in the matrix.

### F-04 — Provenance object is constructed locally, not authenticated (P0)

**File:** `scripts/release/collect-qualification-evidence.mjs`  
**Observed behavior:** the collector writes an in-toto/SLSA-shaped JSON object itself, using environment values for workflow ID and builder label, and hashes selected `server/*/dist/index.js` outputs. The JSON shape and subject digests are useful metadata, but they do not authenticate the builder or prove those artifacts were produced by a trusted workflow from the stated source.

**Required remediation**
- Generate provenance in the trusted CI builder using a recognized attestation/signing mechanism.
- Verify issuer, repository identity, protected ref, workflow identity, commit/tree, invocation ID, builder identity, subject digests, and transparency/attestation verification as applicable.
- Include every shipped artifact/image, not only a manually enumerated list of service entry points.
- Treat locally generated unsigned metadata as a build manifest, not as authenticated SLSA provenance.

**Acceptance:** release verification consumes and validates a signed attestation from an independently trusted builder; it does not treat a JSON object written by the collector as proof of provenance.

### F-05 — Secret scanning is a narrow custom regex, not a full secret scan (P1)

**File:** `scripts/release/collect-qualification-evidence.mjs`  
**Observed behavior:** the collector scans tracked files for a private-key header regex and writes a SARIF document using a custom driver name. This can detect one class of key material, but cannot establish zero secrets across tokens, cloud credentials, passwords, connection strings, certificates, encoded secrets or historical Git objects.

**Required remediation**
- Integrate a maintained secret scanner over working tree and relevant Git history, with version and raw report preserved.
- Add repository/provider-specific patterns and allowlist entries with reason, owner and expiry; no broad suppressions.
- Keep the private-key regex as an additional narrow guard, not as the sole secret-scan certification.
- If history contains previously exposed credentials, rotate/revoke them and record the independent remediation evidence.

**Acceptance:** scanner execution and report are genuine; scanner unavailable or incomplete blocks certification.

### F-06 — AWS evidence is not yet proven end-to-end (P0)

**Files:** `.github/workflows/cor.yml`, `scripts/aws-conformance/run-aws-conformance.mjs`, `scripts/aws-conformance/aws-env.mjs`  
**Observed behavior:** workflow source defines an AWS physical gate on non-PR events and an AWS conformance probe. However, the candidate's associated COR Actions run failed, so source configuration is not proof that the live AWS gate completed successfully. The currently named conformance step is a read-only probe; it must not alone be used to claim deployment, rollback, resource cleanup, residual scan or full AWS stability.

**Required remediation**
- Inspect the failed AWS/COR job logs and record the exact failing step.
- Verify OIDC audience and trust conditions, expected account/role/region, session tags, and effective permissions.
- Run positive and negative API tests; a denial counts only when the intended API was invoked and the response is an authorization denial, not malformed input or an unrelated failure.
- Separately run approved deployment/rollback and resource mutation tests in a dedicated sandbox; capture before/after inventory, cleanup results, residual scan and CloudTrail evidence.
- Do not call read-only probe results “physical deployment qualification”.

**Acceptance:** successful live AWS evidence is bound to this exact commit and trusted run, with no unproven cleanup or deployment claims.

### F-07 — Build-client runtime smoke swallows failure (P1)

**File:** `.github/workflows/ci.yml`, job `build-client`  
**Observed behavior:** the smoke command uses `--help ... || ... version ... || true`. If both invocation forms fail, `true` causes the step to succeed. The condition also runs runtime smoke only for selected matrix combinations, not all built target binaries.

**Required remediation**
- Remove the terminal `|| true` from any required smoke gate.
- Provide a target-aware smoke command and assert an expected exit code/output for each native runnable target.
- Cross-compiled binaries that cannot execute on the runner must be labelled compile-only and tested on native runners or approved emulation; compile-only is not runtime qualification.
- Use PowerShell on Windows or a validated portable script instead of assuming Bash semantics on every runner.

**Acceptance:** runtime smoke failure causes the target job to fail; each advertised binary has an explicit qualification tier and evidence.

### F-08 — Workflow actions are mutable tags (P1)

**Files:** `.github/workflows/ci.yml`, `.github/workflows/cor.yml`  
**Observed behavior:** actions are referenced with mutable version tags such as `actions/checkout@v4`, `actions/setup-node@v4`, `actions/upload-artifact@v4`, and `aws-actions/configure-aws-credentials@v4`. These references can change within the major tag.

**Required remediation**
- Pin third-party actions to reviewed full commit SHAs and use dependency-update automation to propose reviewed updates.
- Set minimal job permissions and separate untrusted PR jobs from any job with AWS or signing privileges.
- Verify no untrusted workflow path can access secrets or request the privileged OIDC role.

**Acceptance:** every third-party action in release/certification workflows is SHA-pinned and the pin is reviewed.

### F-09 — Locale count is not locale correctness (P1)

**File:** `scripts/release/collect-qualification-evidence.mjs`  
**Observed behavior:** `localesVerified` is populated by listing `.json` files under `locales/`. Presence of a file does not prove complete keys, correct placeholders, no untranslated fallback, RTL layout, CLI translations, email/background locale persistence or accessibility names.

**Required remediation**
- Consume machine-readable results from locale schema/parity, placeholder, untranslated-string, RTL, UI/CLI and background-job tests.
- Derive verified locale IDs from successful test evidence, not filesystem enumeration.
- Test locale precedence and persistence across UI, CLI, scheduled jobs, email, logs intended for users and API errors.
- Include all advertised locales and failure paths.

**Acceptance:** each claimed locale has current passing evidence for the applicable UI/CLI/background surfaces.

### F-10 — 40-stream finalization is not independent proof by itself (P1)

**Files:** `scripts/cor-engine.js`, `scripts/cor-finalize.js`, `scripts/cor/streams/**`  
**Observed behavior:** the finalizer checks a fixed 40-stream registry, receipt digests, clean tree and consistency of gate summary/ledger. These are valuable integrity checks. However, digesting a self-generated receipt proves its integrity after creation, not that the underlying assertion independently observed a real property. Stream count and self-consistency cannot replace external test artifacts or physical runtime evidence.

**Required remediation**
- Each stream receipt must reference authoritative raw artifacts, command/tool identity, exit code, target, commit/tree and independent evidence digests.
- Test that fabricated receipts, fabricated gate summaries, a self-consistent forged ledger, missing raw artifacts and false target claims are rejected.
- Use independent trust anchors for signatures and reviewer approval for certification.
- Do not describe the finalizer as independent verification of AWS/platform behavior unless it actually verifies the underlying evidence.

**Acceptance:** all streams link to externally verifiable underlying evidence; receipt integrity and evidence truth are treated as separate properties.

## 3. Illustrative corrected code snapshots

These are implementation patterns, not claims that the repository currently contains them. Adapt to the project's existing test framework and schemas.

### 3.1 Native JUnit only — do not synthesize from stdout

```js
import fs from "node:fs";
import { spawnSync } from "node:child_process";

export function runSuite({ command, args, cwd, reportPath }) {
  const startedAt = new Date().toISOString();
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: process.env,
    timeout: 10 * 60 * 1000
  });

  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  const exitCode = result.status ?? 1;

  if (!fs.existsSync(reportPath)) {
    throw new Error("NATIVE_TEST_REPORT_MISSING");
  }

  const xml = fs.readFileSync(reportPath, "utf8");
  const summary = parseAndValidateNativeJUnit(xml); // strict XML parser
  if (exitCode !== 0 || summary.failures > 0 ||
      summary.errors > 0 || summary.skipped > 0 ||
      summary.tests === 0) {
    throw new Error("TEST_SUITE_NOT_QUALIFIED");
  }

  return {
    startedAt,
    completedAt: new Date().toISOString(),
    exitCode,
    stdout,
    stderr,
    nativeReportPath: reportPath,
    summary
  };
}
```

The parser must reject malformed XML, unexpected report paths, duplicate suites, impossible counts, missing tests and mismatched totals. The runner must write its native report to a clean per-run directory.

### 3.2 Matrix evidence — PASS only from an executed row

```js
function assertQualifiedMatrix(requiredRows, evidenceByRow) {
  const missing = [];
  for (const row of requiredRows) {
    const ev = evidenceByRow.get(row.id);
    if (!ev ||
        ev.status !== "PASS" ||
        ev.target?.os !== row.os ||
        ev.target?.architecture !== row.architecture ||
        ev.target?.provider !== row.provider ||
        ev.source?.commit !== process.env.GITHUB_SHA ||
        !ev.rawLogSha256 ||
        ev.exitCode !== 0) {
      missing.push(row.id);
    }
  }
  if (missing.length) {
    throw new Error(`QUALIFICATION_MATRIX_INCOMPLETE:${missing.join(",")}`);
  }
  return { status: "PASS", qualifiedRows: requiredRows.map(r => r.id) };
}
```

The evidence map must be built by validating actual uploaded result files, not by copying row IDs from the support manifest.

### 3.3 Runtime smoke must fail if the binary fails

```bash
set -euo pipefail
./ugondu-client --help > smoke.stdout 2> smoke.stderr
grep -q "Usage:" smoke.stdout
```

Use an OS-native equivalent where Bash is not available. Do not append `|| true` to a required release test.

## 4. Required remediation plan

### P0 — before any COR sign-off
1. Replace console-derived JUnit generation with native runner reports.
2. Stop reporting the entire matrix as PASS based on a single-host collection run.
3. Derive provider and locale verification only from actual provider/locale result artifacts.
4. Replace locally constructed provenance with signed trusted-builder attestation verification.
5. Run and preserve full CI/COR failed logs for candidate `22f019e...`; resolve every failure and rerun on a clean candidate.
6. Execute live AWS qualification with OIDC and correct positive/negative controls; separate read-only conformance from mutation/rollback/cleanup tests.
7. Require external evidence verification against the independently injected trust root on the same candidate.

### P1 — before universal support claims
1. Remove `|| true` from required binary smoke gates and qualify every advertised runnable binary.
2. Pin all third-party workflow actions to full reviewed SHAs.
3. Run real provider sandbox tests for every declared host/repository provider.
4. Integrate a maintained secret scanner and preserve its raw output.
5. Make locale qualification behavioral and surface-specific.
6. Make all 40 COR receipts refer to independently verifiable evidence.
7. Qualify UI, CLI, IDE, model-assisted, non-model, fine-grained and automation modes against the same policy boundary.

### P2 — ongoing release hygiene
1. Add expiry and requalification triggers for OS/runtime/provider/IDE versions.
2. Add dependency and action-pin update PRs with full regression gates.
3. Maintain a public/internal support matrix distinguishing `implemented`, `tested`, `qualified`, `unavailable`, and `unqualified`.
4. Review the scope after any architecture, policy, signing, execution, provider or locale change.

## 5. Universal readiness acceptance matrix

| Area | Required proof | Current disposition |
|---|---|---|
| Evidence integrity | Native reports, signed provenance, exact commit/tree and independent trust anchor | **BLOCKED** |
| AWS | Successful live run, OIDC identity, positive/negative permissions, deployment and cleanup evidence | **BLOCKED** |
| Linux / Windows / macOS | Native runtime evidence per supported OS/architecture | **INCOMPLETE** |
| Hosts and repository providers | Authenticated sandbox operation and postcondition proof per provider | **INCOMPLETE** |
| UI / CLI / IDE | Shared authorization/execution layer and workflow parity | **NOT ESTABLISHED BY THIS CANDIDATE EVIDENCE** |
| Model-assisted / non-model | Model failure isolation; non-model core remains fully functional | **NOT ESTABLISHED BY THIS CANDIDATE EVIDENCE** |
| Fine-grained / automation | Approval, bounded policy, pause/resume/cancel, idempotency, recovery and rollback | **NOT ESTABLISHED BY THIS CANDIDATE EVIDENCE** |
| Localization / accessibility | Behavioral locale evidence including RTL, CLI, email/jobs and accessibility | **INCOMPLETE** |
| CI / COR | Exact-candidate all-gates-green run with no missing/skipped gates | **FAILED RUNS OBSERVED** |
| Independent sign-off | Reviewer validates raw evidence, trust roots and exceptions | **NOT ISSUED** |

## 6. Release and regression guardrails

- Never weaken a test or remove a failing assertion to obtain a green build.
- Preserve failing logs and evidence before changing code.
- Every remediation change must add or update a regression test that fails on the old behavior.
- Require clean checkout, locked dependency install, deterministic build, exact SHA/tree binding, and no post-test source mutation.
- Do not make source substring checks the only evidence for runtime security.
- Do not label a provider, OS, IDE, or locale qualified because it is listed in a manifest.
- Do not let model output execute shell or provider operations without typed action validation, policy authorization and risk-appropriate approval.
- Non-model workflows must remain usable when inference is disabled, unavailable, over quota or disallowed by region.
- Missing credentials, absent scanners, missing runners, malformed outputs, timeouts and skipped tests must fail closed.
- No secret, private key, account credential or personally identifying operational secret may be copied into evidence artifacts.
- Use **Air Roofers SASU** for the French entity. Do not introduce “Air Roofers Ltd”.

## 7. Final audit conclusion

The candidate contains useful remediation but does not meet the proof threshold for COR sign-off. The current workflow results include failures, and the source still allows synthesized test reports and overbroad qualification metadata. Platform and provider qualification remain incomplete; live AWS stability is not demonstrated by the available evidence.

**Final disposition: BLOCKED — NOT COR CERTIFIED.**

Reconsider sign-off only after P0 findings are closed, P1 support claims are backed by per-target execution evidence, the exact candidate's required CI/COR/AWS gates pass, and an independent reviewer validates the native artifacts and trust chain.
