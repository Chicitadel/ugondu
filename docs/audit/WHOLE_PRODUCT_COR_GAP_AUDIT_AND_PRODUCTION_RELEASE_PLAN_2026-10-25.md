<!-- Project: Ugondu | Product owner: Air Roofers SASU | Governance target: UAIGOS 3.0.0 -->
# Ugondu Whole-Product COR Gap Audit & Production Release Implementation Plan

**Document ID:** AR-UG-WHOLE-PRODUCT-COR-GAP-20261025-03  
**Audit date:** 2026-10-25  
**Repository:** [Chicitadel/ugondu](https://github.com/Chicitadel/ugondu)  
**Reviewed production ref:** [phase4/production-hardening](https://github.com/Chicitadel/ugondu/tree/phase4/production-hardening)  
**Reviewed implementation candidate:** [294c869c250b3f065d55d674ac352eec10f3557d](https://github.com/Chicitadel/ugondu/commit/294c869c250b3f065d55d674ac352eec10f3557d)  
**Evidence-only descendant cited by the dashboard:** [dc39cd42f4ce511091fd0355d9ecad05d5852432](https://github.com/Chicitadel/ugondu/commit/dc39cd42f4ce511091fd0355d9ecad05d5852432)  
**Companion dashboard:** [CERTIFICATION_PROGRESS_DASHBOARD.md](./CERTIFICATION_PROGRESS_DASHBOARD.md)  
**Status:** AUDIT AND PLAN — not a claim that every finding below has been physically remediated.

---

## 1. Executive decision

Ugondu has credible, successful **bounded COR and AWS lifecycle evidence** for the candidate and exact workflow lineage identified above. The recorded evidence includes:
- [COR Certification + AWS Physical Qualification + Final Release Gate](https://github.com/Chicitadel/ugondu/actions/runs/40183694886): all three recorded gates succeeded.
- [Monorepo CI/CD](https://github.com/Chicitadel/ugondu/actions/runs/40183694906): recorded as 15/15 jobs successful, including workspace builds, Go thin-client builds, integration tests and Docker validation.
- The physical qualification record states that AWS lifecycle and Fargate qualification ran in `eu-west-3`, with manifest-scoped residual checking and zero residual resources for that test run.

**This is not proof of zero product-wide COR gap.** The repository dashboard itself withholds universal COR and calls out remaining qualification gaps for AI fleet activation, native OS lifecycles, IDEs, hosting/cloud targets and immutable commercial artifact installation. Green must mean the exact target, version, feature, environment and lifecycle was actually tested on the same approved candidate lineage. Do not promote a target because it is advertised, compiles, cross-compiles, has a script, or passed a different run.

### Decision

- **Bounded Tier-1 AWS lifecycle:** 🟢 certified for the scope and lineage recorded in the evidence.
- **Whole-product commercial release:** 🟡 not yet proven end-to-end; do not represent as universally certified.
- **Universal support across all OS/IDE/hosts/clouds:** 🔴 not granted until each advertised target is individually qualified, or explicitly removed from the supported product claim.

This document is an evidence-led gap plan. It does not state that source remediation was performed by this audit.

---

## 2. Evidence reviewed and limitations

### 2.1 Positive evidence (scope-specific)

| Evidence | Recorded result | What it proves | What it does not prove |
|---|---|---|---|
| COR workflow run [40183694886](https://github.com/Chicitadel/ugondu/actions/runs/40183694886) | 🟢 3 gates passed | Exact candidate checkout, build, locale/I18N checks, architecture/import scans, typecheck, workspace tests, policy/evidence verification, fresh COR qualification, finalization/signing and the AWS physical gate for that run | Every production feature or every external target |
| AWS physical job [121139894935](https://github.com/Chicitadel/ugondu/actions/runs/40183694886/job/121139894935) | 🟢 passed | The recorded AWS lifecycle, Fargate lifecycle and manifest-scoped residual scan completed successfully in the configured AWS region | GCP/Azure, other regions, other account policies, or arbitrary customer environments |
| CI/CD run [40183694906](https://github.com/Chicitadel/ugondu/actions/runs/40183694906) | 🟢 15/15 jobs | The job matrix and tests actually executed in that workflow passed | Native execution on every architecture/OS; unrepresented IDEs, providers or hosters |
| COR resolution report and dashboard | 🟢 documents present in the reviewed source lineage | They provide a traceable status record and acceptance conditions | The assertions inside a document independently prove the underlying behavior |
| Root `package.json` | scripts exist for build/lint/typecheck/test/contract/integration/E2E/security/compatibility/locales/AWS/governance | The intended command entry points are declared | That every command is exhaustive, that all cases are real end-to-end, or that every script has been run on this exact SHA |

### 2.2 Important validation boundary

The repository's `scripts/governance/validate-repository.mjs` is a useful static guard. It reads tracked files and applies a collection of policy, regular-expression and source-integrity checks. A zero-violation result is **not equivalent to a semantic proof** that every runtime path contains no mocks, no placeholder implementation, no hardcoded behavior, or no fake success. Dynamic construction, indirect imports, generated code, remote responses, conditional paths and behavior that a pattern does not recognize require separate review and execution tests.

Likewise, `scripts/governance/validate-test-coverage.mjs` verifies the presence of required scripts in root and workspace manifests and rejects selected bypass flags. It does not itself establish branch coverage, mutation resistance, scenario completeness, or that every external integration was exercised. A declared `test:e2e` command is an entry point, not by itself proof of comprehensive E2E coverage.

Treat those controls as **necessary gates**, not as substitutes for deeper evidence.

---

## 3. Colour legend and certification rules

- 🟢 **Verified:** passing, candidate-bound evidence exists for the exact stated scope.
- 🟡 **Partial:** some implementation or tests exist, but lifecycle, coverage, independent evidence or acceptance criteria remain incomplete.
- 🔴 **Blocker / not certified:** required proof is absent, a target is untested, or a mandatory check failed.
- ⚪ **Not assessed:** no adequate review evidence available in this audit.

**Anti-regression invariant:** a previous green result stays green only for its exact commit, version, environment and capability. A change to source, dependencies, build settings, workflow, policy, permissions, provider adapter, localization contract or release artifact invalidates the relevant evidence until rerun. Evidence-only descendants must be mechanically proven to contain only allowed evidence changes; never bypass freshness checks to preserve green.

---

## 4. Whole-product certification progress matrix

| Workstream / capability | Status | Current evidence / gap | Required exit evidence |
|---|---|---|---|
| COR lifecycle certification | 🟢 Scoped pass | Run 40183694886 passed for its candidate lineage | Preserve immutable candidate SHA, receipts and workflow lineage |
| AWS physical lifecycle in `eu-west-3` | 🟢 Scoped pass | Physical lifecycle, Fargate and manifest-based residual scan passed in the recorded run | Re-run after relevant code/policy changes and retain per-resource receipts |
| VPC cleanup safety (F-23) | 🟢 Scoped proof | Prior report cites ownership tags, manifest tracking, lease checks and negative qualification tests | Keep all destructive-path tests and prove isolation against shared/unowned resources |
| S3 tag fail-closed contract (F-24) | 🟢 Scoped proof | Prior report cites explicit failure on denied/missing tag observations and negative tests | Keep provider error, timeout, missing-tag and wrong-owner negative cases |
| Candidate evidence freshness | 🟢 Scoped pass | Candidate-bound freshness check passed in recorded run | Reject every unauthorized source/config/policy/dependency drift |
| Monorepo build/typecheck/test | 🟢 Scoped pass | 15/15 CI jobs recorded successful; 743 workspace tests reported in COR record | Rerun for every release candidate; map test names to requirements and critical branches |
| Repository anti-stub scan | 🟡 Static control only | Validator reported 0 findings across 4,596 tracked files in the cited report; scan is pattern-based | Add semantic/manual review, runtime-path tests, mutation testing and reviewed exception register |
| Zero hardcoded user-facing strings | 🟡 Not fully proven | Tokenization and 12-language parity are reported; locale parity cannot alone prove all visible strings are tokenized | Static AST/UI extraction, runtime locale fallback tests, all screens and CLI outputs, no raw-string escape paths |
| Zero hardcoded operational configuration | 🟡 Not fully proven | Static policy rule exists; all runtime/configuration paths have not been independently demonstrated here | Environment/schema inventory, secret/config scanning, multi-environment tests, reject missing required configuration |
| AI model catalog and fleet activation | 🔴 Not certified fleet-wide | Single-model canary/discovery is not evidence that every intended model is approved, callable, compliant and active | Per-model/provider/region receipts; timeout/rate-limit/invalid-output/security tests; explicit disabled-by-default and revocation tests |
| AI inference correctness and safety | 🟡 Partial evidence | Gateway and a canary are reported; no full model-by-model test matrix verified in this audit | Contract tests per engine; deterministic safety boundaries; output schema validation; retries/timeouts/circuit-breaker tests; data-region policy proof |
| Repository provider adapters | 🟡 Partial | README distinguishes operations as `tested`, `implemented` and `supported`; some webhook/deployment operations are listed as implemented, not live-certified | For every advertised provider: detect, auth, metadata, refs, fetch, webhook and deployment live E2E with scoped test tenants |
| Deployment strategies and rollback | 🟡 Partial | Core CI and AWS COR lifecycle are green; universal application-level deployment lifecycles are not thereby proven | Test deploy/verify/rollback/resume/idempotency under failure for every advertised strategy/provider |
| URRE durable resume/recovery | 🟡 Partial | Architecture and tests exist, but exhaustive crash/restart/state persistence matrix not independently established here | Kill/restart at every durable transition; replay/idempotency checks; corrupted/old state and concurrent-worker tests |
| DEISE drift detection and repair | 🟡 Partial | Capability is part of product scope; full provider-by-provider drift corpus not verified in this audit | Known-drift fixtures for detection plus real isolated environment repair and post-repair independent verification |
| UPLM/plugin lifecycle and isolation | 🟢/🟡 | Plugin independency test reported 8/8; standalone package/build is not the same as adversarial runtime isolation certification | Install/verify/activate/upgrade/disable/uninstall E2E; malicious plugin, quota, signature, sandbox and escape tests |
| Billing/edition/entitlement | 🟡 Partial | Workspace build/tests passed; real commercial entitlement and billing provider end-to-end proof not established here | Signed entitlement expiry/revocation/tamper/clock-skew/quota/billing-webhook tests against a test provider |
| Thin-client CLI | 🟡 Partial | Go builds reported for Linux/Windows/macOS targets; compile/cross-compile is not native lifecycle proof | Native install, command, auth, update, upgrade, rollback, config, permissions and uninstall E2E per supported OS/arch |
| Linux amd64 | 🟡 | Scoped build/CI evidence | Native full-product lifecycle on a clean supported distro/version matrix |
| Linux arm64 | 🔴 | Cross-compile evidence only in the reviewed dashboard | Native arm64 runner, full test and install/upgrade/rollback/uninstall lifecycle |
| Windows amd64 | 🟡 | Scoped tests reported; full product lifecycle not established | Native clean-machine lifecycle, service/process cleanup, permissions, update and rollback |
| macOS arm64 | 🟡 | Thin-client evidence only in dashboard | Native Apple Silicon lifecycle; signing/notarization where required |
| macOS amd64 | 🔴 | Native Intel lifecycle not established | Native Intel execution and lifecycle, or remove from supported matrix |
| IDE: VS Code | 🟡 | Described as experimental in dashboard | Install/auth/commands/logs/update/uninstall E2E on a published extension version |
| JetBrains IDEs | 🔴 | No qualification evidence reviewed | Per-IDE plugin compatibility and lifecycle certification, or explicit non-support |
| Cursor / Windsurf / Neovim / other IDEs | 🔴 | No qualification evidence reviewed | Individual test matrix or explicit exclusion from support claims |
| Docker / Compose | 🟡 | Docker image validation passed in CI | Real customer-like install, persistent data, secrets, health, upgrade, rollback, recovery and teardown |
| Kubernetes | 🟡/🔴 | Product README advertises Kubernetes in higher tiers; live lifecycle proof not reviewed | Versioned cluster matrix, RBAC, namespace isolation, rolling update, rollback, node disruption and uninstall |
| VMware / Proxmox / multi-node HA | 🔴 | Advertised capability not backed by reviewed live evidence | Real target lifecycle tests and failure/recovery receipts, or revise commercial claims |
| cPanel / DirectAdmin / shared hosting | 🔴 | No supported physical lifecycle evidence reviewed; resource/privilege limitations are material | Prove compatible deployment under least privilege and documented resource limits; otherwise mark unsupported |
| SSH/VPS/bare Linux hosts | 🟡 | Not comprehensively certified by AWS qualification | Fresh host lifecycle, least privilege, secret handling, rollback and orphan cleanup |
| AWS regions/accounts beyond tested scope | 🔴 | One region/account configuration is recorded | Region-by-region/account-policy certification or explicit supported-region boundary |
| GCP / Azure | 🔴 | No physical lifecycle proof reviewed | Implement real adapters and qualify each provider or explicitly exclude |
| Air-gapped / sovereign mode | 🔴 | Product tier is described; independent live isolation proof not reviewed | Disconnect egress, prove offline dependency/model/secret/update behavior, recovery and auditability |
| Security/privacy/compliance claims | 🟡 | Named standards appear in repository documents; this audit does not establish independent conformity assessment | Threat model, data-flow/retention review, SBOM, dependency/license scan, penetration testing and evidence mapped to each control |
| UI/UX polish and accessibility | ⚪/🟡 | No complete screen inventory, visual-regression corpus or accessibility evidence was reviewed in this pass | Screen-by-screen acceptance matrix, empty/error/loading/offline states, keyboard/screen-reader/contrast/responsive tests |
| Performance / capacity / resilience | ⚪/🟡 | No measured load, latency, memory, soak or failure-injection report reviewed in this pass | Defined SLOs and repeatable benchmarks; p50/p95/p99, throughput, resource ceilings, soak and degradation tests |
| Observability / supportability | 🟡 | Health endpoints and telemetry architecture are described; operational proof incomplete | Correlated logs/traces/metrics, actionable alerts, redaction, runbooks and incident/recovery drills |
| Immutable signed commercial release | 🔴 | COR signing is not proof that a published end-user artifact has passed clean install through uninstall | Build once; sign/provenance/SBOM; verify artifact digest; install and exercise the exact immutable artifact on each supported target |
| **Universal COR / zero product-wide gaps** | 🔴 **NOT GRANTED** | Multiple advertised targets and product workflows remain unproven by reviewed evidence | All required rows green for every advertised support claim, one candidate-bound release lineage, signed artifact lifecycle, no open P0/P1 and approved release authority |

---

## 5. Findings and remediation contracts

### UG-WP-001 — Certification scope can be overstated

**Risk:** A green COR/AWS run may be mistaken for universal certification of all product features and targets.  
**Required change:** Every badge and release statement must name the certified candidate, workflow, version, region, OS/architecture, provider and feature scope. The UI and documentation must not convert `implemented`, `tested`, `cross-compiled` or `discovered` into `supported`.  
**Acceptance:** A machine-readable support manifest is the source of truth; every `supported` entry points to current signed evidence. Unknown/stale/missing evidence yields `uncertified`, never green.

### UG-WP-002 — Static anti-stub validation is necessary but not sufficient

**Risk:** Regex/static scans can miss indirect, dynamic, generated or behaviorally fake implementations.  
**Required change:**
1. Keep `UG-COR-NO-STUBS-001` fail-closed.
2. Add an inventory of production runtime entry points and external side effects.
3. Require contract tests proving each operation changes or reads the real intended system state.
4. Add mutation testing or deliberately injected provider failures to demonstrate tests fail when real behavior is removed.
5. Maintain a reviewed exception register with owner, rationale, expiry and test scope; no unbounded exceptions.
6. Run manual semantic review of all production paths flagged by heuristics and all paths bypassing provider interfaces.
**Acceptance:** Static scanner, AST/semantic checks, negative tests, mutation evidence and human review are all attached to the same candidate. The report must say “0 static findings” unless the stronger evidence exists.

### UG-WP-003 — Zero hardcoding must be proven at runtime surfaces

**Risk:** 12 locale files having parity does not prove every UI/CLI/API error is tokenized, nor that a fallback never masks missing keys.  
**Required change:** Extract visible strings from UI components, CLI help/errors, server-generated user-facing messages and notification templates; compare the extracted set against the canonical token registry. Add locale fallback/missing-key tests, RTL tests, plural/date/number formatting tests, and runtime smoke tests for every screen and command. Operational endpoints, provider IDs, protocol constants and security-critical values must be governed constants/configuration rather than blindly translated.  
**Acceptance:** Every user-facing string has a token or documented machine-readable protocol reason; no fabricated locale prefixes or silent fallback; parity and runtime rendering both pass.

### UG-WP-004 — E2E coverage must be scenario-based, not script-based

**Risk:** Presence of `test:e2e` and green unit tests may leave critical user journeys untested.  
**Required change:** Maintain a traceable matrix mapping each product requirement to a test ID, test type, fixture/environment, result artifact and severity. Cover happy path, validation, auth denial, timeout, retry, duplicate request, concurrency, partial provider outage, crash/restart, rollback, cancellation, revocation and cleanup. E2E must use real isolated providers/services or explicitly labeled contract simulators; simulators cannot be represented as live provider certification.  
**Acceptance:** No required scenario is “not run”; failed tests fail the pipeline; test reports and environment versions are archived against the candidate SHA.

### UG-WP-005 — Provider adapters need operation-level support certification

**Risk:** A provider may be labeled supported when only detect/auth/fetch have been tested while webhook/deployment are merely implemented.  
**Required change:** Use the repository's operation vocabulary consistently:
- `implemented`: code exists;
- `tested`: automated tests passed for named scenarios;
- `live-certified`: real provider integration passed in an isolated account/tenant;
- `supported`: all mandatory operations and lifecycle cases are live-certified for the advertised version.
**Acceptance:** The published provider registry cannot emit `supported` without the required operation receipts. Provider failure must not fall back to a fake success.

### UG-WP-006 — OS, IDE, host and cloud universality is unproven

**Risk:** Cross-compilation or an AWS test can be misrepresented as compatibility with all operating systems, IDEs, hosting services and cloud providers.  
**Required change:** Publish a versioned support matrix with exact versions, architecture, privilege model, installation route, supported lifecycle and known exclusions. Add native runners and isolated test tenants for each target. Shared-host targets must be tested against actual no-root constraints, quotas, process lifetime, cron/background execution, filesystem permissions, network restrictions and available runtimes.  
**Acceptance:** Each target is green only after install → configure → authenticate → execute real deployment → verify → update → rollback → restart/recover → uninstall → independently verify no orphaned resources. If this cannot be run, keep the target unsupported/experimental and remove any contradictory commercial claim.

### UG-WP-007 — AI discovery is not AI qualification

**Risk:** Model count or one successful canary can be mistaken for fleet-wide production readiness.  
**Required change:** For every model/provider/region/edition combination, record a signed receipt covering identity/version, data-processing region, auth, request/response schema, safety policies, latency/timeouts, quotas/rate limits, retry/circuit breaker, cancellation, failure behavior, fallback governance, output validation and disable/revocation. No implicit fallback to an unapproved model.  
**Acceptance:** The active model registry is the intersection of explicitly approved policy and fresh qualifying receipts; stale/absent receipts keep a model disabled.

### UG-WP-008 — Product lifecycle and commercial packaging need artifact-level proof

**Risk:** Passing source CI and signing a COR report does not prove customers can install, upgrade, roll back and uninstall the released product.  
**Required change:** Build one immutable artifact per version; record digest, signature, provenance, SBOM, dependency/license report and release manifest. Install the artifact on a clean machine/host, exercise the published CLI/UI and integrations, upgrade from the previous supported version, roll back, restore state and uninstall.  
**Acceptance:** Artifact digest in test receipts equals the published digest. No rebuilding or modifying the artifact after qualification.

### UG-WP-009 — UI/UX, accessibility and performance have no adequate whole-product evidence in this audit

**Risk:** Backend/CI success can coexist with broken or unfinished screens, inconsistent states, inaccessible controls or unacceptable performance.  
**Required change:** Inventory every route/screen/dialog/menu and CLI interaction. Test loading, empty, success, partial, validation, permission denied, offline, timeout, retry, stale data and destructive confirmation states. Capture visual regression snapshots at supported viewport sizes; test keyboard focus, accessible names, contrast and screen readers. Benchmark cold/warm startup, API p50/p95/p99, sustained throughput, memory/CPU, queue growth, recovery and long-duration stability under declared workloads.  
**Acceptance:** Product owner signs off the full UI/UX matrix and performance SLO report; unresolved critical visual, accessibility, data-loss, security or reliability defects block release.

### UG-WP-010 — Security and governance claims require control-to-evidence mapping

**Risk:** Naming ISO/SOC/OWASP/NIST standards in source documentation is not the same as passing an independent assessment.  
**Required change:** Map each applicable control to implementation, owner, test, evidence artifact, exception and review date. Include threat model, privilege boundaries, SSRF/command injection/path traversal, secret handling, supply-chain provenance, dependency/license scanning, data retention/deletion, audit log redaction and incident response.  
**Acceptance:** Avoid claiming formal certification or compliance not independently assessed; publish only accurate, scoped claims.

---

## 6. Exact commands for candidate qualification

Run from a clean checkout of the exact candidate. Do not run against a dirty working tree and then attribute results to a different SHA.

```bash
set -euo pipefail

git status --short
git rev-parse HEAD
node --version
npm --version

npm ci
npm run build --workspaces
npm run lint --workspaces
npm run typecheck --workspaces
npm test
npm run test:contract
npm run test:integration
npm run test:e2e
npm run test:security
npm run test:compatibility
npm run test:locales
npm run governance:validate
npm run verify:release-integrity
```

**Important:** The commands above are a baseline from the current root manifest. They must not be treated as complete until each command is verified to cover the requirement matrix. `npm run test:aws` and physical cloud qualification may create billable resources; run only in an authorized isolated account/region with least-privilege credentials and teardown safeguards. Capture each command's exit code, logs, environment and commit SHA.

Example candidate evidence envelope (schema illustration; integrate with the repository's canonical signed evidence format rather than inventing a competing manifest):

```json
{
  "candidateSha": "<exact-40-character-commit-sha>",
  "workflowRunId": "<run-id>",
  "target": {
    "os": "<exact-os-and-version>",
    "architecture": "<native-architecture>",
    "provider": "<provider-or-host>",
    "region": "<region-or-not-applicable>",
    "productVersion": "<immutable-version>"
  },
  "suite": "<test-suite-id>",
  "result": "PASS",
  "artifactDigest": "sha256:<digest>",
  "evidenceUri": "<immutable-evidence-location>",
  "issuedAt": "<UTC-timestamp>",
  "expiresAt": "<UTC-timestamp>",
  "signature": "<signature-from-approved-trust-root>"
}
```

Do not accept placeholder values in an actual receipt. The sample is documentation only.

---

## 7. Required UI/UX and feature completion inventory

For each feature and screen, record:
1. Requirement ID and user/business outcome.
2. Route/component/CLI command and owning workspace.
3. Real backend/API/provider contract; no hardcoded business data or success-shaped fallback.
4. Authorization/edition/tenant constraints and denial path.
5. Loading, empty, success, partial, error, offline and recovery states.
6. Localization tokens and accessibility requirements.
7. Telemetry, audit event and redaction rules.
8. Unit/contract/integration/E2E test IDs.
9. Performance budget and measured result.
10. Evidence URI, candidate SHA, reviewer and sign-off.

Required product journey coverage includes at minimum: first install/onboarding; login/token expiry/logout; product/edition entitlement; provider connection and revocation; project/repository discovery; dry-run/plan; approval/authorization; deploy; verify; drift detection/repair; resume after interruption; rollback; plugin install/update/disable/remove; AI model selection/disable; usage/quota/billing boundaries; localization; upgrade; recovery/restore; support diagnostics; uninstall and resource cleanup.

No screen or capability is green solely because it renders or an endpoint returns HTTP 200. Verify the intended business effect independently.

---

## 8. Performance, reliability and security acceptance

Before production approval, define and measure budgets rather than asserting “fast” or “scalable” without data:
- API and CLI startup: cold/warm measurements on each supported target.
- API latency: p50/p95/p99 and error rate under declared steady and peak load.
- Resource ceilings: CPU, RSS, disk, open files, queue depth and connection pool behavior.
- Resilience: provider timeout, 429/rate limit, 5xx, DNS/network partition, credential revocation, worker crash, restart, duplicate execution and storage failure.
- State correctness: idempotency, monotonic transitions, concurrent workers, stale lease, partial commit and replay.
- Security: authorization matrix, tenant isolation, secret redaction, SSRF/command/path injection, signed artifact verification, dependency/SBOM/license checks.
- Recovery: RTO/RPO targets, restore drill, rollback success and independent cleanup scan.

Store raw reports and summary metrics. A test must fail if the observed result violates its threshold; a dashboard must not use fabricated defaults for missing measurements.

---

## 9. Anti-regression gate design

The release workflow must fail closed unless all of the following are true:

1. Exact candidate SHA is checked out and the working tree is clean.
2. Required source, policy, dependency, localization, schema and workflow validations pass.
3. Static hardcoding/stub/security scans pass **and** required semantic/runtime tests are present and pass.
4. Unit, contract, integration, E2E, negative, fault-injection and target-specific suites pass.
5. External provider operations have receipts for every capability marked supported.
6. AI model activation is limited to explicitly approved models with fresh receipts.
7. Physical cloud/host tests pass in an isolated scope and independently confirm cleanup.
8. Evidence is bound to the candidate SHA, artifact digest, target and run lineage.
9. Any post-candidate non-evidence change invalidates prior qualification; never weaken freshness logic to force green.
10. The final gate verifies all mandatory jobs succeeded in the same candidate lineage.
11. A signed immutable release artifact passes clean install, upgrade, rollback and uninstall.
12. Release notes and website support claims match the certified support manifest.

Illustrative pseudocode for the final decision (adapt to the existing workflow; do not add a parallel gate that conflicts with the canonical one):

```text
if candidate_sha is missing or checkout_is_dirty:
    FAIL
if any required gate is missing, skipped, stale, or failed:
    FAIL
if any advertised capability has no current target-specific receipt:
    FAIL_OR_REMOVE_CAPABILITY_FROM_SUPPORTED_MANIFEST
if artifact_digest != qualified_artifact_digest:
    FAIL
if evidence freshness or signature validation fails:
    FAIL
otherwise:
    PASS only for the exact manifest of certified capabilities
```

---

## 10. Execution plan and closure order

| Phase | Priority | Work | Exit criterion |
|---|---|---|---|
| P0 — Release truth and evidence lineage | P0 | Keep bounded AWS COR green; freeze candidate and evidence-only descendants; align dashboard, support manifest and public claims | One internally consistent candidate lineage; no stale receipts or contradictory claims |
| P1 — Requirement and feature inventory | P0 | Map every advertised feature, screen, command, service, adapter and edition to requirements/tests/evidence | 100% inventory coverage; every row has owner and explicit status |
| P2 — Runtime integrity and no-stub proof | P0 | Extend static scans with AST/semantic checks, real side-effect contract tests, negative tests and mutation testing | No unresolved production-path stubs/fake success; every exception approved and expiring |
| P3 — End-to-end product journeys | P0 | Complete the full real-user journey matrix and failure/recovery cases | All critical journeys pass against real isolated integrations |
| P4 — AI and provider qualification | P0/P1 | Per-model and per-provider operation certification; enforce explicit activation/revocation | Every advertised provider/model has a current receipt or is explicitly unsupported |
| P5 — Native OS/IDE/host/cloud qualification | P1 | Run native lifecycle suites for each intended target; test least-privilege/shared-host limitations | Support matrix reflects only qualified targets |
| P6 — UI/UX/accessibility | P1 | Full route/screen audit, visual regressions, accessibility and localization runtime coverage | Signed screen matrix; no critical UI/accessibility defects |
| P7 — Performance/security/recovery | P1 | Load/soak/fault-injection, threat-model control mapping, SBOM and restore drills | Measured SLOs met and security blockers closed |
| P8 — Immutable commercial artifact | P0 | Sign/provenance, publish candidate artifact and test install/upgrade/rollback/uninstall | Artifact digest exactly matches the tested artifact; release authority approves |
| P9 — Final independent review | P0 | Independent reviewer rechecks evidence, support claims, known limitations and anti-regression controls | No open P0/P1; bounded scope declared; all mandatory gates green on one lineage |

Recommended order is evidence lineage and scope truth first, then inventory, real E2E and target qualification, then artifact-level release. Do not start by marking every platform green or broadening IAM permissions. Any AWS permission change must be least-privilege, reviewed, and justified by the actual resource inventory contract.

---

## 11. Release decision checklist

- [ ] All requirements/features/screens/commands/services/providers are inventoried.
- [ ] Every advertised capability has an explicit `implemented` / `tested` / `live-certified` / `supported` status.
- [ ] No critical operation returns success without the intended verified side effect.
- [ ] No unapproved production mock, stub, fixture fallback or scaffold remains.
- [ ] Every user-facing string is tokenized or documented as a protocol constant.
- [ ] Runtime localization, RTL and missing-key behavior pass.
- [ ] Every required E2E and negative/fault scenario ran on the candidate.
- [ ] Every advertised OS/architecture/IDE/host/cloud target passed native lifecycle qualification or is explicitly excluded.
- [ ] Every activated AI model/provider has current approved qualification evidence.
- [ ] Security, privacy, tenant isolation and supply-chain evidence are current.
- [ ] Performance and recovery targets are measured and met.
- [ ] Signed immutable artifact digest matches the qualified artifact.
- [ ] Install, upgrade, rollback, restore and uninstall pass from that artifact.
- [ ] Candidate freshness and same-lineage final gate pass.
- [ ] Dashboard, public website, packaging and release notes agree on support scope.
- [ ] Independent release authority signs the decision.

**Until all applicable checklist items are closed, the honest status remains: “COR-certified for the documented Tier-1 AWS lifecycle; broader whole-product and universal commercial release qualification in progress.”**

---

## 12. Reference files and evidence

- [Certification progress dashboard](./CERTIFICATION_PROGRESS_DASHBOARD.md)
- [COR post-merge resolution and final certification](./COR_POST_MERGE_AUDIT_RESOLUTION_AND_FINAL_CERTIFICATION_2026-10-25.md)
- [Root package scripts](../../package.json)
- [Repository integrity / anti-stub validator](../../scripts/governance/validate-repository.mjs)
- [Workspace test/gate coverage validator](../../scripts/governance/validate-test-coverage.mjs)
- [README and declared product/provider scope](../../README.md)
- [COR certification workflow run](https://github.com/Chicitadel/ugondu/actions/runs/40183694886)
- [Monorepo CI/CD workflow run](https://github.com/Chicitadel/ugondu/actions/runs/40183694906)

**Governance rule:** This audit must be updated when candidate SHA, supported capability manifest, workflow contract, product scope, or certification evidence changes. Never edit a historical result to make a later candidate appear certified.
