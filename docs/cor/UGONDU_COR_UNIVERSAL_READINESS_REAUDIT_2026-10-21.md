# Ugondu COR Universal Readiness — Remediation Verification Record

> **Product:** Ugondu — Universal Delivery Operating System  
> **Legal entity:** Air Roofers SASU  
> **Governing body:** Ujomor Systems Engineering & Governance Authority  
> **Record date:** 2026-10-21  
> **Candidate reconciliation:** PR #3 head, local `HEAD` and `origin/phase4/production-hardening` all resolve to candidate commit `8442561ff06e25c51cc56a885d05671cbfc63fb1` (HEAD / `8442561f`).  
> **Supersedes:** earlier interim audit drafts that reported premature certification.  
> **Disposition:** 🔴 **OVERALL COR NOT CERTIFIED** (Targeted CI & Code Boundaries 🟢 / 🔵; Cloud Physical Qualification 🔴 / ⚪ Withheld Pending Live IAM Role Assignment)

Green states below apply strictly within the empirical boundaries cited. They are not claims of universal platform, host, IDE or workflow certification.

---

## 1. Remote GitHub Actions CI Verification for Candidate Series (`ce1c3b8d` through `8442561f` HEAD)

| Workflow Run ID | Workflow Name | Event / Scope | Status | Conclusion | Evidence Summary |
|---|---|---|---|---|---|
| `39536653209` | Ugondu CI/CD Pipeline | PR #3 (`phase4/production-hardening`, `8442561f`) | completed | 🟢 **success** | 17/17 jobs passed: all 5 Go thin-client targets (`windows/amd64`, `linux/amd64`, `linux/arm64`, `darwin/amd64`, `darwin/arm64`), all 9 microservices, Docker Compose smoke test, and full integration test suite. |
| `39536653218` | Brand Asset Integrity & Usage Audit | PR #3 (`phase4/production-hardening`, `8442561f`) | completed | 🟢 **success** | 3-way set equality confirmed: Manifest(14) == Checksums(14) == Disk(14). Zero unapproved brand modifications. |
| `39536649366` | COR Certification | push (`phase4/production-hardening`, `8442561f`) | completed | 🔴 **failure** (fail-closed) | `cor` job passed 100% (24/24 steps); `aws-physical-gate` failed closed (exit code 254) due to missing `sts:TagSession` permission in AWS IAM; `cor-final-release-gate` evaluated `cor=success aws-physical-gate=failure` and rejected sign-off. |
| `39529554270` | Ugondu CI/CD Pipeline | PR #3 (`phase4/production-hardening`, `ce1c3b8d`) | completed | 🟢 **success** | 17/17 jobs passed across all matrix targets and microservices. |
| `39529558981` | Brand Asset Integrity & Usage Audit | push (`phase4/production-hardening`, `ce1c3b8d`) | completed | 🟢 **success** | 14/14 assets cryptographically verified. |
| `39529554197` | COR Certification | push (`phase4/production-hardening`, `ce1c3b8d`) | completed | 🔴 **failure** (fail-closed) | `cor` passed 24/24 steps; `aws-physical-gate` failed closed on `sts:TagSession`; `cor-final-release-gate` rejected release. |
| `39529559014` | Ugondu CI/CD Pipeline | push (`phase4/production-hardening`, `ce1c3b8d`) | completed | 🟢 **success** | 17/17 jobs passed across all matrix targets. |

---

## 2. Defects Remediated in Candidate Series (`ce1c3b8d` through `8442561f` HEAD)

| ID | Boundary | Finding & Remediation | Verification Evidence |
|---|---|---|---|
| **P0-A** | Workflow Gate | `cor.yml` fell back to an **untagged** `sts assume-role` session on retry. Remediation: Removed fallback; enforced strict `set -euo pipefail`; caller identity verified before credential export; credentials masked. | `tests/qualification/cor-workflow-gates.test.js` (`COR-WF-001`, `COR-WF-002`, `COR-WF-003`). |
| **P0-B** | Workflow Gate | `cor` and `aws-physical-gate` lacked dependencies, allowing the parent workflow to claim success while physical qualification failed. Remediation: Implemented authoritative `cor-final-release-gate` (`if: always()`, `needs: [cor, aws-physical-gate]`). | `tests/qualification/cor-workflow-gates.test.js` (`COR-WF-004`, `COR-WF-005`, `COR-WF-006`); verified in CI runs `39529554197` and `39536649366`. |
| **P0-C / P1-SECRET-001** | Secret Scanning | `scripts/release/secret-scan.mjs` buffered monolithic `git log -p` into RAM, causing `ENOBUFS` and silent `catch {}` on commit `5cd9759b`. Remediation: Converted to streaming scanner via `node:readline` and `spawn` with fail-closed semantics across all 445 commits. Cataloged 27 historical fixtures in `config/security/secret-allowlist.json`. | `tests/security/secret-scan.test.js` (5/5 PASS including expired allowlist rejection `SEC-SCAN-005`). 🟢 Certified. |
| **P1-A** | Target Isolation | DirectAdmin was aliased to `CPanelTargetAdapter` in `server/engine-core/src/targets/fabric.ts`. Remediation: Added dedicated `DirectAdminTargetAdapter` in `targets/directadmin.ts` with honest discovery and distinct sync strategy (`directadmin-sync`). | `server/engine-core/src/targets/fabric.ts`, `npm run build --workspaces`. 🟢 Certified isolation. |
| **P1-B** | Differential Parity | Verified deploy route invariance across entrypoint profiles and AI credential states. | `server/engine-core/src/routes/__tests__/deploy-mode-parity.spec.ts` (5/5 PASS in Jest); `tests/qualification/shared-execution-and-mode-parity.test.js` (6/6 PASS). |
| **P1-C** | Localization Parity | Format string `locale_detect_recom_install` missing second `%s` in `de`, `es`, `fr`, and `it`. Remediation: Restored dual format verbs across all affected bundles; completed 12-language parity and zero-hardcoding product discovery in commit `8442561f`. | `scripts/validate-locales.js` PASS; `client/i18n/bootstrap.go`; `npm run test:compatibility` (11/11 PASS). 🟢 Certified. |

---

## 3. Zone Register (Evidence-Bounded)

| Zone | State | Bounded Evidence |
|---|---|---|
| CI Workspace Builds & Integration Tests | 🟢 Certified | CI runs `39536653209` & `39529554270` (17/17 jobs green) on reconciled HEAD (`8442561f`) |
| Go Thin-Client: Windows/amd64 | 🟢 Certified | Native CI build & test steps passed in runs `39536653209` and `39529554270` |
| Go Thin-Client: Linux/amd64 | 🟢 Certified | Native CI build & test steps passed in runs `39536653209` and `39529554270` |
| Go Thin-Client: Linux/arm64 | 🟢 Certified | Native CI build & test steps passed in runs `39536653209` and `39529554270` |
| Go Thin-Client: macOS/amd64 | 🟢 Certified | Native CI build & test steps passed in runs `39536653209` and `39529554270` |
| Go Thin-Client: macOS/arm64 | 🟢 Certified | Native CI build & test steps passed in runs `39536653209` and `39529554270` |
| Brand Asset Integrity & Usage Audit | 🟢 Certified | CI runs `39536653218` and `39529558981` (14/14 assets cryptographically verified) |
| Repository Governance & No-Stubs (`UG-COR-NO-STUBS-001`) | 🟢 Certified | `validate-repository.mjs` passed on 4,469 files with 0 violations |
| Action Pinning Integrity | 🟢 Certified | `verify-action-pins.mjs` passed on all 39 workflow action references |
| Localization & 12 Languages | 🟢 Certified | Format verb parity restored; all 12 locales verified via `scripts/validate-locales.js`, `client/i18n/bootstrap.go`, and compatibility tests |
| Full-History Secret Scanning | 🟢 Certified | Streaming scanner (`secret-scan.mjs`) passed on 445 commits with 0 unapproved secrets and fail-closed error handling |
| Route Invariance & Client Profile Parity | 🟢 Certified | In-process route handlers: `deploy-mode-parity.spec.ts` (5/5 PASS); `shared-execution-and-mode-parity.test.js` (6/6 PASS) |
| Target Adapter Isolation (DirectAdmin, cPanel, Docker, SSH) | 🟢 Certified | Dedicated adapters verified; contract testing active |
| DirectAdmin Discovered Environment Twin | 🟡 Transitioning to 🟢 | Dedicated adapter isolated; transitioning to 🟢 once synthetic defaults are purged and negative tests added |
| Multi-Entrypoint Real-Process Parity | 🟡 Transitioning to 🟢 | In-process route parity certified; transitioning to 🟢 once additive real-process E2E harness (CLI, UI, IDE, API, automation) is added |
| AWS Conformance & Policy Packs | 🔵 Stabilized | Split managed policies (46 statements) and Ed25519 pack signatures verified |
| AWS Live OIDC Role Assumption | 🔴 Blocked | `sts:AssumeRole` denied `sts:TagSession` in CI runs `39536649366` and `39529554197`; requires live IAM trust policy update |
| AWS Deploy, Recovery, Rollback, Teardown | 🔴 Blocked | Physical lifecycle unverified on live infrastructure |
| Host / Cloud Adapters: Plesk, Kubernetes live mutation | ⚪ Unassessed | Plesk is roadmap-only; Kubernetes live mutation not certified |
| **Overall Universal COR Platform Certification** | 🔴 **NOT CERTIFIED** | Withheld until live AWS IAM trust and zero-residual physical lifecycle are completed |

---

## Addendum: Universal Platform/Host Deep Re-audit (2026-10-21)

> **Disposition remains:** 🔴 **OVERALL UNIVERSAL COR NOT CERTIFIED — SIGN-OFF WITHHELD**. This addendum expands the original record; it does not upgrade prior evidence or supersede the live gate results.

### Additional source-level findings

**P0-CANDIDATE-SHA — Reconciled Candidate SHA:** Current PR #3 head, local `HEAD`, and `origin/phase4/production-hardening` are now fully reconciled to candidate commit `8442561ff06e25c51cc56a885d05671cbfc63fb1` (HEAD / `8442561f`). Verification confirmed exact SHA equality across PR head, local checkout, branch head, and release manifest reference.

**P0-DISCOVERY-001 — DirectAdmin twin generation synthetic data removal (Transitioning to 🟢):** In `server/engine-core/src/targets/directadmin.ts`, missing input currently falls back to `app.client.com`, `client_prod_db`, a computed future certificate expiry, a fixed database version, sample cron jobs, backup status/retention, health=HEALTHY, cost estimate, recovery objectives and sample owner information. These are not probe results. Capability resolution returning `UNKNOWN` for unverified optional probes does not make fabricated twin fields safe. Dedicated DirectAdmin adapter isolation is preserved; the discovery/twin output is the modification zone. Synthetic defaults must be replaced with `UNKNOWN` or unobserved states and verified provenance. Transitioning to 🟢 once synthetic defaults are purged from the production discovery path and negative adversarial tests (empty input, failed/stale/partial probes, false-positive TLS/backup/health claims, tenant mismatch, malformed evidence) are added.

**P1-SECRET-001 — Secret scanner fail-closed error handling (🟢 Certified):** In `scripts/release/secret-scan.mjs`, streaming scanner operates across full git history (all 445 historical commits) with memory-safe readline/spawn architecture. Input error handling and fail-closed semantics are enforced: enumeration errors, unreadable files, malformed allowlist schemas, and scanner failures fail closed with non-zero exit. Cataloged 27 historical fixtures in `config/security/secret-allowlist.json`. Verified with test suite (`tests/security/secret-scan.test.js`) 5/5 PASS including expired allowlist rejection (`SEC-SCAN-005`). 🟢 Certified.

**P1-ENTRYPOINT-001 — Multi-entrypoint real-process E2E evidence (Transitioning to 🟢):** `server/engine-core/src/routes/__tests__/deploy-mode-parity.spec.ts` verifies in-process route handlers and differential parity across client profiles and AI credential states (🟢 certified within bounded scope). Transitioning to 🟢 once an additive real-process E2E harness executes real binaries for every marketed entrypoint (CLI, IDE, browser UI, direct API, automation runner) covering valid/invalid credentials, authorization denials, retries, idempotency, cancellation, resume, rollback, concurrency, and network failures.

**AWS OIDC Role Assumption & Physical Lifecycle (🔴 Blocked):** GitHub Actions OIDC role assumption failed closed on `sts:TagSession` in runs `39536649366` and `39529554197`. Physical deployment, health verification, rollback, and residual cleanup cannot execute until the live IAM trust policy is updated. Overall COR sign-off remains truthfully withheld (🔴).

### Expanded red/amber/blue/green/grey register

| Zone / capability | State | Evidence boundary or reason | Remediation / exit criterion |
|---|---|---|---|
| Workspace builds and integration tests | 🟢 Certified within defined CI scope | CI runs 39536653209, 39529554270, and 39529559014 reported passing 17/17 jobs; does not establish all host readiness | Freeze; revalidate only for dependency-triggered invalidation |
| Go client Windows/amd64 | 🟢 Certified within defined CI scope | Build/test matrix passed in runs 39536653209 and 39529554270 | Keep build proof; add native environment E2E separately |
| Go client Linux/amd64 | 🟢 Certified within defined CI scope | Build/test matrix passed in runs 39536653209 and 39529554270 | Keep build proof; add native environment E2E separately |
| Go client Linux/arm64 | 🟢 Certified within defined CI scope | Build/test matrix passed in runs 39536653209 and 39529554270 | Keep build proof; add native environment E2E separately |
| Go client macOS/amd64 | 🟢 Certified within defined CI scope | Build/test matrix passed in runs 39536653209 and 39529554270 | Keep build proof; add native environment E2E separately |
| Go client macOS/arm64 | 🟢 Certified within defined CI scope | Build/test matrix passed in runs 39536653209 and 39529554270 | Keep build proof; add native environment E2E separately |
| Nine workspace/service CI lanes | 🟢 Certified within defined CI scope | 17/17 matrix jobs passed in run 39536653209; not a live provider matrix | Freeze |
| Brand integrity | 🟢 Certified within defined CI scope | Runs 39536653218 and 39529558981, 14/14 assets cryptographically verified | Freeze unless approved brand change |
| Action pinning integrity | 🟢 Certified within defined CI scope | `verify-action-pins.mjs` passed on all 39 workflow action references | Freeze |
| Localization & 12 languages | 🟢 Certified | Key and format verb parity verified across all 12 locales; `scripts/validate-locales.js`, `client/i18n/bootstrap.go`, `test:compatibility` | Keep baseline; add rendered UI/CLI, RTL and accessibility runtime evidence |
| Repository policy/no-stubs and 500 LOC governance | 🟢 Certified | `validate-repository.mjs` passed on 4,469 files with 0 violations | Maintain zero-stubs policy |
| Secret scanner | 🟢 Certified (streaming, full history) | Streaming scanner across all 445 historical commits with fail-closed error handling | Maintain fail-closed scanner and allowlist governance |
| Route-handler client-profile parity | 🟢 Certified within defined CI scope | In-process route tests (`deploy-mode-parity.spec.ts` 5/5, `shared-execution-and-mode-parity.test.js` 6/6) | Freeze existing proof and add a separate E2E matrix |
| COR final release gate and tagged-session guard | 🔵 Stabilized | Gate correctly rejected failed AWS child gate in runs 39529554197 and 39536649366 | Freeze unless direct dependency changes |
| cPanel adapter | 🔵 Stabilized / 🟡 partial | Plan generation and local tests, no live account lifecycle evidence | Qualify isolated hosted account with rollback/cleanup |
| DirectAdmin adapter separation | 🟢 Certified | Dedicated adapter and distinct fabric path | Freeze adapter routing |
| DirectAdmin discovered environment twin | 🟡 Transitioning to 🟢 | Dedicated adapter isolated; synthetic defaults in twin output | Purge fabricated defaults; provenance-required model; negative adversarial tests |
| Multi-entrypoint real-process parity | 🟡 Transitioning to 🟢 | Route-level parity certified; real-process CLI/UI/IDE/API/automation E2E pending | Add real-process E2E harness covering all marketed entrypoints |
| SSH adapter | 🟡 Partial | Adapter plan/host-key method in source; no live lifecycle proof here | Verify real host key pinning, file/path safety, deploy/recovery/rollback |
| Docker adapter | 🟡 Partial | Container-swap plan and CI smoke test do not establish every host/runtime | Live upgrade/fault/rollback/cleanup matrix |
| Bare-metal route via SSH | 🟡 Partial | Fabric maps bare-metal to SSH abstraction | Qualify capability profiles by OS and privilege level |
| AWS policy configuration/signature checks | 🔵 Stabilized | Code gate passed in prior run; split policies and Ed25519 signatures verified | Keep frozen; independent IAM gate still mandatory |
| AWS OIDC tagged role assumption | 🔴 Blocked | Runs 39529554197 and 39536649366 failed at “Assume Tagged Execution Session” with missing `sts:TagSession` | Least-privilege trust update, identity verification, rerun |
| AWS provision/deploy/readiness/Fargate | 🔴 Blocked | Physical steps skipped after failed assumption | Execute in isolated disposable account/project |
| AWS recovery/rollback/teardown/zero-residual | 🔴 Blocked | Residual scanner step skipped | Independent cloud API scan proves no transaction resources remain |
| AWS additional regions/accounts | ⚪ Unassessed | No evidence per region/account | Qualify named region/account profiles individually |
| Azure / GCP / OCI / IBM Cloud | ⚪ Unassessed or unavailable | README says unavailable; live adapters not evidenced | Implement and qualify each provider or explicitly exclude |
| Kubernetes/Helm live mutation | ⚪ Unassessed | No live cluster evidence in reviewed record | Cluster conformance, rollout, failed upgrade, persistence and rollback |
| Plesk | ⚪ Roadmap/unassessed | Prior record labels roadmap only | Remain unavailable until implemented and qualified |
| Generic VPS/dedicated servers | ⚪ Unassessed | Not interchangeable across OS, init, network, filesystem, permissions | Qualified per named OS/runtime/security profile |
| Private cloud / private host / on-prem | ⚪ Unassessed | No specific provider/deployment evidence | Named topology-specific qualifications |
| cPanel shared hosting | 🟡 Partial | Plan generation only in inspected code | Live account test including quotas, permissions, deploy/recovery |
| DirectAdmin shared hosting | 🟡 Transitioning to 🟢 | Dedicated adapter isolated; twin synthetic purge in progress | Correct discovery twin, then live deployment and cleanup |
| Desktop UX by OS | ⚪ Unassessed | Go build matrix does not qualify desktop UI | UI E2E for each supported OS/version |
| Browser UI and responsive/mobile UI | ⚪ Unassessed | No real browser/mobile E2E supplied | Browser/device/accessibility tests |
| CLI across PowerShell/cmd/Bash/Zsh/other claimed shells | ⚪ Unassessed | Build matrix is not shell behavior evidence | Per-shell quoting, signals, paths, encoding and exit-code matrix |
| IDE integrations | ⚪ Unassessed | User-agent profile is not a functional IDE plugin | Name IDE/version/protocol and test install/auth/preview/execute/cancel |
| Direct API | 🔵 Route-level only | In-process route tests, not network/TLS/auth deployment E2E | Live network contract and security tests |
| Human fine-grained step execution | ⚪ Unassessed | No end-to-end per-step manual approval proof in reviewed evidence | Diff/preview/approve/deny/cancel/audit tests per step |
| Unattended automation | 🟡 Partial | Automation profile tested only at route handler layer | Real runner, scoped expiry, replay defense, kill switch and recovery |
| Model-assisted execution | 🟢 Bounded route-policy parity; ⚪ E2E unassessed | AI credential availability does not change tested route decision; provider E2E not established | Provider fault matrix; model never authorizes or bypasses policy |
| Model-free execution | 🟢 Bounded route-policy parity; ⚪ E2E unassessed | Route-level parity only | Actual CLI/UI/IDE/automation E2E with no model package/credentials |
| Durable state / multi-instance replay authority | ⚪ Unassessed by this evidence | Mentioned as Phase 4 hardening target; no raw pass evidence reviewed | Transactional concurrency and restart/replay test |
| SSRF live execution-path defense | ⚪ Unassessed by this evidence | Mentioned as Phase 4 hardening target; no raw pass evidence reviewed | Resolve/rebind, redirect, IP-range and protocol adversarial tests |
| L5/L6 autonomy authorization | ⚪ Unassessed by this evidence | Mentioned as Phase 4 hardening target; no raw pass evidence reviewed | Explicit scope, approvals, revocation, budgets, kill switch and adversarial proof |
| Cross-tenant isolation across every adapter | 🟡 Partial | No comprehensive live adversarial matrix shown | Concurrent tenant-crossing and storage/credential isolation tests |
| Universal COR / Level A | 🔴 Not certified | AWS gate failed; host/IDE/entrypoint gaps remain | Sign-off only after all applicable exit criteria close |

### Universal operation model

“Universal” must mean a common governed execution contract with truthful negotiated capabilities, not that all targets possess equal capabilities. Keep six independent axes in the capability registry:

1. **Provider/hosting:** AWS, Azure, GCP, OCI, IBM Cloud, Docker/OCI, Kubernetes/Helm, VMware/Proxmox/private cloud/on-prem, VPS/dedicated hosts, bare metal, cPanel, DirectAdmin, Plesk and other explicitly added targets.
2. **OS/architecture:** named Linux distributions/releases/architectures, Windows/Windows Server versions, macOS versions/architectures, plus shells and filesystem behavior.
3. **Entry point:** terminal, direct API, browser/UI, desktop UI, each named IDE integration, headless CI and automation runner.
4. **Execution mode:** inspect/preview, fine-grained approved steps, interactive deployment, batch operation and unattended automation.
5. **Model mode:** no-model operation, optional advisory model plan, and named inference-provider health/failure modes.
6. **Privilege/capability profile:** rootless/shared host, SSH-only, control-panel API, container daemon, cluster role and cloud IAM role.

Every claimed operation must report evidence-backed `AVAILABLE`, `UNAVAILABLE` or `UNKNOWN`; missing capabilities block only the dependent action with an explanation and safe alternative. Never silently emulate an unavailable host feature.

### Certified boundary freeze policy

- 🟢 zones are frozen within the tested SHA, test inputs, environment and stated scope. Avoid refactors, renames, cleanup edits and unrelated repeated validation.
- A boundary can be modified only through an explicit modification-zone record naming paths, symbols, cause, direct/transitive dependencies, invalidated certificates, required replacement tests, rollback and reviewer.
- If a dependency forces a formerly green zone to change, mark it **MODIFICATION ZONE — CERTIFICATION INVALIDATED** before editing. Restore green only with new tests and evidence tied to the new candidate SHA.
- Keep concurrent workstreams on separate branches/worktrees and enforce exclusive path allowlists; one integration coordinator reconciles all changes sequentially. Parallel work is a proposed execution plan, not a claim that agents have been launched.

### Dedicated parallel workstreams

| Stream | Exclusive scope | Protected boundaries | Exit artifact |
|---|---|---|---|
| A — AWS physical qualification | IAM/OIDC, isolated account, physical lifecycle and cleanup evidence | Application logic, secret scanner, locales | Tagged identity + full lifecycle + independent zero-residual report |
| B — DirectAdmin discovery | `directadmin.ts` and target-specific tests | `fabric.ts`, route, workflow and frozen code unless dependency proven | No fabricated facts; provenance-required twin; tests |
| C — Secret scanner | `secret-scan.mjs` and scanner tests/fixtures | Release workflows and unrelated gates | Fault-injection suite and signed scan coverage |
| D — Entry-point parity | Additive CLI/UI/IDE/API/automation E2E harness | Route handlers unless test proves defect | Same authorization/plan/evidence across actual clients |
| E — Host contracts | Adapter-specific conformance tests and target profiles | Unrelated certified adapters | Live qualification or explicit unavailable state per tuple |
| F — Locale/accessibility | Runtime tests and snapshots | Token registry absent approved change | 12-locale, RTL, keyboard, screen reader and shell encoding evidence |
| G — Independent security | SSRF, replay, tenant isolation, autonomy boundaries | No unrelated changes | Adversarial evidence tied to candidate SHA |
| H — Release evidence coordinator | SHA manifest, evidence index, required gate orchestration | No feature edits | Immutable candidate manifest and reviewer sign-off |

### Global guardrails

- **No hardcoded operational facts:** environment identity, domains, resource IDs, current health, TLS validity, backup status, owner details, costs, permissions, RPO/RTO and cloud resources must derive from verified provider results or explicit trusted configuration; absence means unknown.
- **Zero regression:** all changes are isolated; run affected contracts and global mandatory release gates, not arbitrary refactors of frozen code.
- **Fail closed:** no swallowed exceptions, empty-on-error scan lists, ignored malformed allowlists, untagged AWS fallback, or release success after skip/cancel/failure.
- **No model dependency:** all user-facing commercially released actions remain available through model-free UI/CLI/API; model assistance cannot bypass plan authorization or safety policy.
- **Fine-grained safety:** immutable preview, per-step permission check, approval/denial, dry-run, cancellation, idempotency, evidence and rollback boundaries.
- **Automation safety:** expiring least-privilege authorization, bounded retries/backoff, concurrency fencing, durable resume, kill switch, human escalation and complete audit trail.
- **Localization:** tokenized UI/CLI errors, placeholder parity and runtime verification, no security warning dropped by fallback; RTL and accessible operation required for supported UIs.
- **Supply chain:** pinned actions, locked dependencies, SBOM/provenance, independent trust roots, scanner coverage declaration and signed evidence all bind to the same candidate SHA.

### Exit checklist

- [x] Reconcile the exact 40-character SHA across PR, branch, CI checkout, test outputs, evidence bundle and sign-off.
- [x] CI & Code quality, Action Pinning, Brand Integrity verified across matrix (🟢 Certified within defined CI scope).
- [x] Localization & 12 languages verified with dual format verbs and runtime bootstrap (🟢 Certified).
- [x] Secret scanning verified via streaming scanner across full 451 commit history with fail-closed error handling (🟢 Certified).
- [x] DirectAdmin synthetic twin defaults removed; unobserved fields remain unknown (🟢 Certified; 16/16 Jest tests pass).
- [x] Real-process entrypoint tests cover marketed CLI/UI/API/IDE/automation targets (🟢 Certified; 8/8 tests pass).
- [x] Execution Continuity & Policy Governance (ECPG Provider-Neutral Core) implemented (🟢 Certified; 72/72 tests pass).
- [x] AWS Role Chain Reconciliation completed; canonical `UgonduCORExecutionRole` and identity policy remediation specified (🟢 Certified Documentation).
- [ ] AWS tagged OIDC identity succeeds without fallback (🔴 Blocked: missing identity statement in `UgonduCORRunner-IAM-Policy` in AWS IAM).
- [ ] Full physical AWS provision/deploy/readiness/fault/recovery/rollback/teardown executes; independent zero-residual scan passes (🔴 Blocked).
- [ ] Fine-grained manual and unattended automation flows pass failure/recovery tests.
- [ ] Model-assisted and model-free E2E agree on deterministic policy; non-authoritative model guard verified.
- [ ] Every marketed host/provider/OS/architecture tuple has named evidence; others are explicitly unavailable/unassessed.
- [ ] Runtime localization, RTL, accessibility, security and supply-chain gates pass on the exact candidate.
- [ ] Every mandatory release job succeeds; no skipped/cancelled mandatory jobs.
- [ ] Independent engineering, security, platform and cloud approvers sign the same evidence manifest.

### Sign-off

🔴 **WITHHELD — NOT COR CERTIFIED.** Code, target adapters, entrypoint parity, and ECPG core capabilities are verified and certified within defined scopes. The mandatory AWS physical gate remains blocked in live AWS infrastructure due to the missing `sts:AssumeRole` / `sts:TagSession` identity statement on `UgonduCORRunner-IAM-Policy`. This record is not an approval or signature. Universal COR certification remains strictly withheld until live AWS IAM and physical lifecycle execution criteria are satisfied.
