<!-- Project: Ugondu | Product: Air Roofers SASU | Governance target: UAIGOS 3.0.0 -->
# Ugondu Whole-Product COR Gap Audit & Production Release Plan

**Document ID:** AR-UG-WHOLE-PRODUCT-COR-GAP-20261025-03  
**Audit date:** 2026-10-25  
**Repository:** [Chicitadel/ugondu](https://github.com/Chicitadel/ugondu)  
**Production ref reviewed:** [phase4/production-hardening](https://github.com/Chicitadel/ugondu/tree/phase4/production-hardening)  
**Implementation candidate:** [294c869c250b3f065d55d674ac352eec10f3557d](https://github.com/Chicitadel/ugondu/commit/294c869c250b3f065d55d674ac352eec10f3557d)  
**Evidence-only descendant cited by current dashboard:** [dc39cd42f4ce511091fd0355d9ecad05d5852432](https://github.com/Chicitadel/ugondu/commit/dc39cd42f4ce511091fd0355d9ecad05d5852432)  
**Companion dashboard:** [CERTIFICATION_PROGRESS_DASHBOARD.md](./CERTIFICATION_PROGRESS_DASHBOARD.md)  
**Classification:** Audit and implementation plan. This document does not claim all product-wide gaps are fixed.

---

## 1. Executive decision

Ugondu has successful **bounded COR and AWS lifecycle evidence** for the candidate and workflow lineage identified in the current certification records:
- [COR Certification + AWS Physical Qualification + Final Release Gate, run 40183694886](https://github.com/Chicitadel/ugondu/actions/runs/40183694886): recorded as all three gates passed.
- [Monorepo CI/CD, run 40183694906](https://github.com/Chicitadel/ugondu/actions/runs/40183694906): recorded as 15/15 jobs passed, including workspace builds, Go thin-client build matrix, integration tests and Docker validation.
- The recorded AWS physical job reports a successful lifecycle and Fargate qualification in AWS `eu-west-3`, with manifest-scoped residual scanning and zero residual resources for that run.

**These results do not prove zero product-wide COR gap.** The repository's dashboard correctly limits its verdict and leaves AI fleet activation, native OS lifecycles, IDEs, hosting/cloud targets and the immutable end-user artifact lifecycle unqualified. This audit preserves that boundary.

- **Bounded Tier-1 AWS lifecycle:** 🟢 certified only for the recorded scope and lineage.
- **Whole-product commercial release:** 🟡 incomplete proof.
- **Universal support across all OS/IDE/hosts/clouds:** 🔴 not granted until every advertised target is individually qualified or explicitly excluded from support claims.

### Evidence boundary

The repository's `scripts/governance/validate-repository.mjs` uses tracked-file enumeration and policy/pattern-based checks. Its reported zero violations is useful static evidence, not semantic proof that all runtime paths contain no mocks, stubs, fake success, hardcoded behavior or unfinished implementation. Dynamic imports, generated code, indirect calls, remote responses, conditional execution and patterns the scanner does not recognize require additional review and execution tests.

Similarly, `scripts/governance/validate-test-coverage.mjs` checks mandatory scripts in root/workspace manifests and rejects selected bypass flags. It does not prove requirement coverage, mutation resistance, branch coverage or real external integration. The existence of `test:e2e` is not proof that every user journey has run end to end.

---

## 2. Colour legend and certification rule

- 🟢 Verified for exact stated scope: candidate-bound passing evidence exists.
- 🟡 Partial: implementation or tests exist but evidence/coverage is incomplete.
- 🔴 Blocker/not certified: required proof is absent, a target is untested, or a mandatory gate failed.
- ⚪ Not assessed: this audit has no adequate evidence.

**Anti-regression rule:** green applies only to the exact commit, artifact version, target, environment, provider and capability that were tested. Source, dependency, configuration, workflow, policy, localization, provider-adapter or permission changes invalidate relevant evidence until re-run. Evidence-only descendants must be mechanically verified as evidence-only. Never weaken freshness gates to preserve green.

---

## 3. Whole-product progress matrix

| Workstream | Status | Evidence / gap | Required exit condition |
|---|---|---|---|
| COR certification | 🟢 Scoped pass | Run 40183694886 records all mandatory COR gates passing | Preserve exact SHA, receipts and same-run lineage |
| AWS physical lifecycle in `eu-west-3` | 🟢 Scoped pass | Physical lifecycle, Fargate and manifest-based residual scan passed in recorded run | Re-run after relevant source/policy changes; retain resource receipts |
| F-23 VPC cleanup safety | 🟢 Scoped proof | Existing report cites ownership tags, manifest tracking, lease checks and negative qualification tests | Keep tests for shared/unowned resources, stale leases, failures and concurrency |
| F-24 S3 tag fail-closed | 🟢 Scoped proof | Existing report cites failure on denied/missing tag observations and negative tests | Keep provider error, timeout, missing-tag and wrong-owner tests |
| Evidence freshness | 🟢 Scoped pass | Candidate-bound freshness check passed in recorded run | Reject every unauthorized non-evidence drift |
| Monorepo CI/CD | 🟢 Scoped pass | 15/15 jobs recorded passing; COR report cites 743 workspace tests | Re-run on each candidate; map test results to requirements |
| Static anti-stub scanner | 🟡 Static-only proof | Report cites 4,596 tracked files / zero findings; scanner is pattern-based | Add semantic review, runtime side-effect tests, mutation testing and expiring exception register |
| Zero user-facing string hardcoding | 🟡 Not fully proven | Tokenization and 12-language parity are reported; parity alone cannot prove every screen/CLI string is tokenized | Extract visible strings from UI/CLI/API notifications; runtime missing-key and fallback tests |
| Operational config hardcoding | 🟡 Not fully proven | Policy rule exists; all runtime configuration paths not independently proven | Config/schema inventory, secret scans, environment matrix and fail-closed missing-config tests |
| AI model fleet | 🔴 Not certified fleet-wide | Single-model canary/discovery does not prove every model approved, active and safe | Per-model/provider/region signed receipts, approval/revocation tests and policy-bound activation |
| AI inference safety/reliability | 🟡 Partial | Gateway and canary evidence are reported; full model matrix not verified here | Schema, timeout, rate limit, cancellation, retry, circuit-breaker, data-region and output validation tests |
| Repository providers | 🟡 Partial | README distinguishes `tested`, `implemented`, `supported`; some webhook/deploy operations are only `implemented` | Live E2E for detect/auth/metadata/refs/fetch/webhook/deploy per advertised provider |
| Deployment and rollback | 🟡 Partial | CI/AWS COR green does not prove every application deployment strategy/provider | Deploy/verify/rollback/resume/idempotency and failure tests per strategy/provider |
| URRE durable recovery | 🟡 Partial | Architecture/tests exist; exhaustive crash/restart/state transition matrix not independently established | Crash/restart at each durable transition; replay, concurrency, corruption and idempotency tests |
| DEISE drift detection/repair | 🟡 Partial | Capability is in product scope; full provider-specific drift corpus not verified | Real isolated drift injection, detection, repair and independent post-repair verification |
| UPLM/plugin isolation | 🟢/🟡 | Plugin independence test reported 8/8; packaging independence is not adversarial runtime isolation | Install/update/disable/uninstall, signature, quota, malicious plugin and sandbox escape tests |
| Billing/edition/entitlement | 🟡 Partial | Workspace CI passed; real billing/entitlement lifecycle not established here | Expiry, revocation, tamper, quota, webhook replay, clock-skew and provider E2E |
| Thin-client CLI | 🟡 Partial | Builds reported for Linux/Windows/macOS targets; cross-compilation is not native lifecycle proof | Native install/auth/execute/update/rollback/recovery/uninstall per OS/architecture |
| Linux amd64 | 🟡 | Scoped build/CI evidence | Native full-product lifecycle on declared distro/version matrix |
| Linux arm64 | 🔴 | Cross-compile evidence only in dashboard | Native arm64 runner and full lifecycle |
| Windows amd64 | 🟡 | Scoped tests reported; full customer lifecycle not established | Clean-machine install, permissions, auth, upgrade, rollback, recovery and uninstall |
| macOS arm64 | 🟡 | Thin-client evidence only in dashboard | Native Apple Silicon lifecycle; signing/notarization as applicable |
| macOS amd64 | 🔴 | Native Intel lifecycle not established | Native lifecycle or explicit removal from support claims |
| VS Code | 🟡 | Dashboard describes experimental status | Published extension install/auth/commands/update/uninstall E2E |
| JetBrains / Cursor / Windsurf / Neovim | 🔴 | No qualification evidence reviewed | Per-IDE certification or explicit non-support |
| Docker / Compose | 🟡 | Docker image validation passed in CI | Real install, persistent state, secrets, health, upgrade, rollback, recovery and teardown |
| Kubernetes | 🟡/🔴 | Product docs advertise higher-tier capability; live cluster proof not reviewed | Versioned cluster matrix, RBAC, rolling update, rollback, disruption and uninstall |
| VMware / Proxmox / multi-node HA | 🔴 | Advertised scope lacks reviewed live evidence | Real target lifecycle proof or revised commercial claims |
| cPanel / DirectAdmin / shared hosting | 🔴 | No physical lifecycle proof reviewed; no-root constraints are material | Actual least-privilege tests, or explicit unsupported designation |
| SSH/VPS/bare hosts | 🟡 | No comprehensive host lifecycle evidence reviewed | Install, secrets, health, upgrade, rollback, recovery and cleanup |
| AWS regions/accounts beyond tested scope | 🔴 | Recorded evidence is scoped to configured environment | Per-region/account policy certification or explicit support boundary |
| GCP / Azure | 🔴 | No physical lifecycle evidence reviewed | Real adapters and live certification, or explicit exclusion |
| Air-gapped/sovereign mode | 🔴 | Tier is described; offline isolation proof not reviewed | Egress-denied tests for dependencies, models, secrets, updates, recovery and audit |
| Security/privacy/compliance claims | 🟡 | Standards named in docs; independent conformity not established by this audit | Control-to-evidence map, threat model, SBOM/license scan, penetration testing, retention/deletion review |
| UI/UX/accessibility | ⚪/🟡 | No complete screen inventory, visual regression or accessibility report reviewed here | Screen-by-screen states, visual snapshots, keyboard/screen-reader/contrast/responsive tests |
| Performance/capacity/resilience | ⚪/🟡 | No measured load, latency, memory, soak or fault-injection report reviewed here | SLOs plus repeatable p50/p95/p99, throughput, resource ceiling, soak and recovery results |
| Observability/supportability | 🟡 | Health/telemetry architecture is described; operational proof incomplete | Correlated logs/traces/metrics, actionable alerts, redaction, runbooks and incident drills |
| Immutable commercial release artifact | 🔴 | COR signing does not prove the published artifact passes clean install through uninstall | Signed/provenanced artifact, digest equality, SBOM, install/upgrade/rollback/uninstall E2E |
| **Universal COR / zero product-wide gaps** | 🔴 **NOT GRANTED** | Advertised targets and workflows remain unproven outside bounded scope | All applicable rows green on one candidate lineage; no open P0/P1; release authority approval |

---

## 4. Findings and remediation contracts

### UG-WP-001 — Certification scope overstatement
**Risk:** A green COR/AWS run may be mistaken for universal product certification.  
**Remediation:** Name exact candidate, workflow, product version, target, region, provider, capability and lifecycle on every badge/report. Keep `implemented`, `tested`, `live-certified` and `supported` distinct. Drive public claims from a machine-readable support manifest.  
**Acceptance:** Missing/stale evidence emits `uncertified`, never green; every `supported` row links to fresh signed evidence.

### UG-WP-002 — Static anti-stub scan is not semantic proof
**Risk:** Regex checks miss indirect, dynamic, generated or behaviorally fake implementations.  
**Remediation:** Retain `UG-COR-NO-STUBS-001`; inventory production entry points and side effects; add AST/semantic checks, real provider contract tests, injected provider failures, mutation tests and human review. Every exception needs owner, rationale, test scope and expiry.  
**Acceptance:** Report static findings separately from semantic/runtime proof; no unresolved production-path stubs/fake success.

### UG-WP-003 — Zero hardcoding at every user surface
**Risk:** Locale parity does not prove every UI, CLI, error and notification string is tokenized.  
**Remediation:** Extract visible strings from UI components, CLI help/errors, API-generated messages and notifications; compare with canonical tokens. Test runtime rendering, missing keys, fallback behavior, plural/date/number formatting and RTL. Keep protocol/security constants governed but not blindly translated.  
**Acceptance:** Every user-facing string is tokenized or documented as a protocol constant; no fake locale prefixes or silent missing-key fallback.

### UG-WP-004 — E2E coverage is requirement-based
**Risk:** Script presence and unit tests can leave critical user journeys untested.  
**Remediation:** Map every requirement to test ID, type, real isolated environment, expected side effect, result artifact and severity. Cover auth denial, timeout, retry, duplicate request, concurrency, provider outage, crash/restart, rollback, cancellation, revocation and cleanup. Label contract simulators clearly; never claim they are live provider certification.  
**Acceptance:** No mandatory scenario is “not run”; failure blocks CI; report is bound to candidate SHA.

### UG-WP-005 — Provider operation support status
**Risk:** A provider can be called supported when only detect/auth/fetch are tested and webhook/deploy are merely implemented.  
**Remediation:** Use: `implemented` = code exists; `tested` = named automated cases pass; `live-certified` = real isolated provider integration passes; `supported` = all mandatory operations/lifecycle cases are live-certified.  
**Acceptance:** Registry refuses `supported` without required operation receipts; provider failure never falls back to fake success.

### UG-WP-006 — OS/IDE/host/cloud universality
**Risk:** Cross-compilation or AWS-only qualification is presented as compatibility with all targets.  
**Remediation:** Publish exact supported versions, architectures, privilege model, install route and lifecycle. Add native runners and isolated target accounts. Shared-host qualification must test no-root constraints, quotas, background execution, filesystem permissions, networking and runtimes.  
**Acceptance:** Each target passes install → configure → authenticate → real deployment → verify → update → rollback → recover → uninstall → independent orphan scan. If not tested, keep unsupported/experimental and remove contradictory marketing claims.

### UG-WP-007 — AI discovery is not model qualification
**Risk:** One canary or a count of discoverable models is mistaken for fleet-wide production readiness.  
**Remediation:** Per model/provider/region/edition, issue a signed receipt for identity/version, data region, auth, schema, safety, latency, quotas, retries, cancellation, fallback policy and revocation. No implicit fallback to an unapproved model.  
**Acceptance:** Active model set is the intersection of policy approval and fresh qualification receipts; absent/stale receipts mean disabled.

### UG-WP-008 — Artifact-level commercial lifecycle
**Risk:** Source CI and COR signing do not prove the released customer artifact installs and recovers.  
**Remediation:** Build once; record digest, signature, provenance, SBOM, dependency/license report and release manifest. Test the exact artifact on clean targets, upgrade from prior version, rollback, restore and uninstall.  
**Acceptance:** Test receipt digest equals published artifact digest; no rebuilding/modifying after qualification.

### UG-WP-009 — UI/UX, accessibility and performance evidence
**Risk:** Backend/CI green can coexist with broken screens, missing states, inaccessible controls or poor performance.  
**Remediation:** Inventory every route/screen/dialog/menu and CLI interaction. Test loading, empty, success, partial, validation, permission denied, offline, timeout, retry, stale-data and destructive-confirmation states. Capture responsive visual regressions; test keyboard, accessible names, contrast and screen readers. Benchmark startup, API p50/p95/p99, throughput, memory/CPU, queue growth, recovery and soak.  
**Acceptance:** Signed screen matrix and SLO report; critical visual, accessibility, data-loss, security or reliability defects block release.

### UG-WP-010 — Security/governance claims require mapped evidence
**Risk:** Naming ISO/SOC/OWASP/NIST is not proof of formal certification or independent conformity.  
**Remediation:** Map each applicable control to implementation, owner, test, evidence, exception and review date. Include threat model, tenant isolation, SSRF/command/path injection, secret redaction, supply-chain provenance, SBOM, retention/deletion and incident response.  
**Acceptance:** Public claims are scoped and accurate; do not claim independent certification without that assessment.

---

## 5. Candidate qualification commands

Run from a clean checkout of the exact candidate. Capture SHA, environment, exit codes and logs.

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

These commands are a baseline from the root manifest, not an assertion that every command covers every requirement. Verify each script’s actual behavior and map it to the requirement matrix. `npm run test:aws` and physical qualification may create billable resources; run only in an authorized isolated account/region with least-privilege credentials and teardown protections.

Illustrative receipt schema only; integrate with the repository’s canonical signed evidence format rather than creating a competing authority:

```json
{
  "candidateSha": "<exact-commit-sha>",
  "workflowRunId": "<run-id>",
  "target": {
    "os": "<exact-os-version>",
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
  "signature": "<approved-trust-root-signature>"
}
```

Actual receipts must never contain placeholder values.

---

## 6. Feature, screen and journey completion inventory

Every feature/screen/command must record: requirement ID; owning workspace and code path; real API/provider contract; authorization/edition/tenant boundary; loading/empty/success/partial/error/offline/recovery states; localization/accessibility; telemetry and redaction; unit/contract/integration/E2E test IDs; performance budget and measured result; candidate SHA; evidence URI; reviewer and sign-off.

Mandatory user journeys include:
- First install and onboarding; login, token expiry, logout.
- Edition/entitlement checks; provider connection and revocation.
- Project/repository discovery; plan/dry-run; authorization; deploy; verify.
- Drift detection/repair; resume after interruption; rollback.
- Plugin install/update/disable/remove and sandbox rejection.
- AI model select/disable/revoke; usage/quota/billing boundaries.
- Localization and RTL; upgrade; restore/recovery; diagnostics; uninstall and independent resource cleanup.

A screen is not green merely because it renders; independently verify the intended business effect.

---

## 7. Performance, resilience and security acceptance

Define budgets and record measurements rather than asserting “fast” or “scalable” without data:
- Cold/warm startup on each supported target.
- API latency p50/p95/p99 and error rate at declared steady/peak load.
- CPU, RSS, disk, open files, queue depth and connection pool behavior.
- Provider timeout, 429, 5xx, DNS/network partition, credential revocation, worker crash/restart, duplicate execution and storage failure.
- Durable-state idempotency, monotonic transitions, concurrent workers, stale lease, partial commit and replay.
- Authorization matrix, tenant isolation, secret redaction, SSRF/command/path injection, artifact signature and dependency/SBOM/license checks.
- RTO/RPO, restore drill, rollback success and independent cleanup scan.

Tests must fail if thresholds are exceeded. Missing measurements must not be replaced with fabricated dashboard defaults.

---

## 8. Anti-regression final-gate contract

The canonical release workflow must fail closed unless:
1. Exact candidate SHA is checked out and working tree is clean.
2. Source, policy, dependency, localization, schema and workflow checks pass.
3. Static checks and required semantic/runtime tests all pass.
4. Unit, contract, integration, E2E, negative, fault-injection and target-specific suites pass.
5. Every capability marked supported has current operation receipts.
6. AI activation is limited to explicitly approved models with fresh receipts.
7. Physical tests run in isolated scopes and independently verify cleanup.
8. Evidence binds candidate SHA, artifact digest, target and workflow lineage.
9. Any non-evidence drift invalidates prior qualification.
10. Final gate confirms mandatory jobs succeeded in one candidate lineage.
11. Immutable signed release artifact passes install/upgrade/rollback/uninstall.
12. Public claims and release notes match the certified support manifest.

Decision pseudocode (adapt the existing canonical workflow; do not create conflicting parallel gates):

```text
if candidate_sha missing or checkout dirty: FAIL
if any mandatory gate missing, skipped, stale, or failed: FAIL
if advertised capability lacks current target receipt:
    FAIL_OR_REMOVE_FROM_SUPPORTED_MANIFEST
if published_artifact_digest != qualified_artifact_digest: FAIL
if freshness or signature validation fails: FAIL
otherwise: PASS only for the exact certified capability manifest
```

---

## 9. Prioritized execution plan

| Phase | Priority | Work | Exit criterion |
|---|---|---|---|
| P0 — Evidence lineage and truthful scope | P0 | Keep bounded AWS COR green; freeze candidate; align dashboard, support manifest and claims | One consistent candidate lineage; no stale receipts or contradictory claims |
| P1 — Requirement inventory | P0 | Inventory every feature, screen, command, service, adapter and edition | 100% inventory with owner, tests and evidence fields |
| P2 — Runtime integrity/no-stub proof | P0 | AST/semantic checks, real side-effect contracts, negative tests, mutation testing | No unresolved production fake success/stubs; approved expiring exceptions only |
| P3 — Real end-to-end journeys | P0 | Complete journey and failure/recovery matrix | All critical journeys pass against real isolated integrations |
| P4 — AI/provider qualification | P0/P1 | Per-model/provider operation certification and activation policy | Each advertised target has a current receipt or is explicitly unsupported |
| P5 — Native target matrix | P1 | Native OS/IDE/host/cloud lifecycle suites | Support matrix lists only qualified targets |
| P6 — UI/UX/accessibility | P1 | Route/screen inventory, visual regression, accessibility and localization runtime tests | Signed screen matrix and no critical UX/accessibility defects |
| P7 — Performance/security/recovery | P1 | Load/soak/fault injection, threat-model mapping, SBOM and restore drills | SLOs met; security blockers closed |
| P8 — Immutable release artifact | P0 | Sign/provenance, publish and test exact artifact lifecycle | Artifact digest equals qualified digest; release authority approves |
| P9 — Independent release review | P0 | Recheck evidence, claims, limitations and anti-regression controls | No open P0/P1; all mandatory gates green in one lineage |

Do not mark every platform green before evidence exists or broaden IAM permissions merely to make a test pass. AWS permission changes must be least-privilege, reviewed and aligned to the actual resource inventory contract.

---

## 10. Release checklist

- [ ] All features/screens/commands/services/providers are inventoried.
- [ ] Every capability has explicit `implemented` / `tested` / `live-certified` / `supported` status.
- [ ] No critical operation returns success without verified intended side effect.
- [ ] No unapproved production mock, stub, fixture fallback or scaffold remains.
- [ ] All user-facing strings are tokenized or documented protocol constants.
- [ ] Runtime localization, RTL and missing-key behavior pass.
- [ ] Every required E2E and negative/fault scenario ran on the candidate.
- [ ] Every advertised OS/architecture/IDE/host/cloud target is native-certified or excluded.
- [ ] Every active AI model/provider has current approval and qualification evidence.
- [ ] Security, privacy, tenant isolation and supply-chain evidence are current.
- [ ] Performance and recovery targets are measured and met.
- [ ] Signed immutable artifact digest equals the tested digest.
- [ ] Install, upgrade, rollback, restore and uninstall pass from that artifact.
- [ ] Evidence freshness and final gate pass in one lineage.
- [ ] Dashboard, website, packaging and release notes agree on supported scope.
- [ ] Independent release authority approves.

**Until applicable checklist items are closed, the accurate status is: “COR-certified for the documented Tier-1 AWS lifecycle; broader whole-product and universal commercial release qualification remains in progress.”**

---

## 11. Source and evidence references

- [Certification progress dashboard](./CERTIFICATION_PROGRESS_DASHBOARD.md)
- [COR post-merge resolution and final certification](./COR_POST_MERGE_AUDIT_RESOLUTION_AND_FINAL_CERTIFICATION_2026-10-25.md)
- [Root package scripts](../../package.json)
- [Repository integrity/anti-stub validator](../../scripts/governance/validate-repository.mjs)
- [Workspace test/gate coverage validator](../../scripts/governance/validate-test-coverage.mjs)
- [README and declared product/provider scope](../../README.md)
- [COR certification workflow](https://github.com/Chicitadel/ugondu/actions/runs/40183694886)
- [Monorepo CI/CD workflow](https://github.com/Chicitadel/ugondu/actions/runs/40183694906)

Update this audit when candidate SHA, product scope, support manifest, workflow contract or certification evidence changes. Never rewrite a historical result to make a later candidate appear certified.
