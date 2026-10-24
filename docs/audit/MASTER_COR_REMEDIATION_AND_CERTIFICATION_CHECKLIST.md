<!-- Project: Ugondu | Authority: Ujomor Systems Engineering & Governance Authority | Organization: Air Roofers SASU -->
# Master COR Remediation, Unification and Proof-of-Certification Checklist

**Audit date:** 2026-10-24  
**Branch:** `phase4/production-hardening`  
**Qualification verdict:** **QUALIFIED WITH BOUNDED TARGET SUPPORT**  
**Governance baseline:** UAIGOS 3.0.0  
**Purpose:** Single durable checklist for the COR findings, remediation state, evidence links, acceptance criteria and regression controls.

> **Evidence lineage recheck required:** The supplied execution report says freshness passed on `04cd51471188f7a38fcb25ab6fdb22cee66cfccf`, but the checked-in manifest currently says `releaseHeadSha=f4ce46dceb26d9f798515f4673d7377e365fb3d8` and this checklist still had an earlier `df180521...` result. These may be successive evidence-only descendants, but they are not a single reconciled record in the current snapshot. A further audit documentation commit has since been added. Re-run `node scripts/governance/verify-evidence-freshness.mjs` and `npm run verify:release-integrity` from a clean checkout of the latest branch HEAD before closing freshness. Do not hand-edit the manifest SHA or mark the row green without fresh command output. Qualification remains **QUALIFIED WITH BOUNDED TARGET SUPPORT**.

## 1. Certification legend

- 🟢 **PASS / CLOSED:** fresh evidence exists for the exact candidate SHA and the defined scope.
- 🟡 **PARTIAL / REPORTED:** implementation or a reported pass exists, but the evidence scope, SHA binding, or independent verification remains incomplete.
- 🔴 **GAP / BLOCKED:** required capability is unsupported, a gate fails, or proof is missing.
- ⚪ **NOT ASSESSED:** no adequate evidence has been reviewed.

A source file existing, a target appearing in a matrix, a cross-compiled binary, or a successful unit test is not by itself a green certification.

## 2. Findings closure ledger

| ID | Boundary | Remediation recorded | Evidence | State |
|---|---|---|---|---|
| F-02 / F-04 | Release SHA and live AI receipt | Live canary run recorded on candidate `6b13a56f`; receipt reports HTTP 200 discovery and inference | [Live AI canary run 40069319465](https://github.com/Chicitadel/ugondu/actions/runs/40069319465), [receipt](../docs/security/evidence/live_ai_canary_receipt.json) | 🟡 Receipt is candidate-bound; current manifest/release HEAD discrepancy must be reconciled |
| F-03 | Qualification matrix harmonization | Canonical registry reference and normalized schema/review dates recorded; negative tests reportedly pass 10/10 and platform evidence tests 15/15 | [Target matrix](../config/qualification/target-matrix.json), [platform matrix](../config/qualification/platform-matrix.json), [fail-closed tests](../tests/qualification/target-matrix-fail-closed.test.js) | 🟡 Verify on actual current HEAD |
| F-06 | Operational hardcoding/security schema | Security tool schemas documented as immutable guards; extensible routing options reported added | [Routing policy](../server/engine-core/src/ai/routing-policy.ts), [AI gateway tests](../tests/ai-inference-gateway.test.js) | 🟡 Reported tests need exact-HEAD evidence |
| F-08 | Production stubs/mocks/scaffolding | Governance policy and anti-stub validator reportedly verify 4,551 tracked files with zero violations; 14/14 adversarial tests pass | [Repository validator](../scripts/governance/validate-repository.mjs) | 🟡 Reported result; rerun on release HEAD and inspect production build graph |
| FRESH | Evidence freshness | User report says verifier passed on `04cd5147`; current manifest says `f4ce46dc`; checklist prose previously cited `df180521`; latest audit-only commits followed | [Freshness verifier](../scripts/governance/evidence-freshness.mjs), [live re-audit](./COR_LIVE_REAUDIT_2026-10-24.md) | 🔴 Re-run on latest clean HEAD and reconcile every identity before closure |
| EVID | Native runner evidence and manifest | Windows/AMD64 records 139/139; Linux/AMD64 job is bounded; macOS/ARM64 evidence explicitly says Go thin-client only; provider receipts are absent | [Native runner evidence](../docs/governance/evidence/native-runner-evidence.json), [evidence manifest](../docs/governance/evidence/evidence-manifest.json), [CI run 40069310340](https://github.com/Chicitadel/ugondu/actions/runs/40069310340) | 🟡 Candidate evidence exists; current manifest lineage must be reconciled and full target scope qualified |
| I18N | Localization | 12 locale dictionaries reported at 242 keys each; Arabic RTL and 6 Platform-Core dictionaries reportedly checked | [Locale validator](../scripts/validate-locales.js), [localization tests](../tests/qualification/localization-negative.test.js) | 🟡 Re-run on release HEAD |
| CORE | Workspace build, lint, typecheck and unit tests | CI run records engine-core and multiple workspace build/test jobs successful | [CI run 40069310340](https://github.com/Chicitadel/ugondu/actions/runs/40069310340) | 🟡 Verify latest required workflow conclusions and SHA |
| INT | Integration and Docker tests | CI run records Docker image validation and multi-workspace integration tests successful | [CI run 40069310340](https://github.com/Chicitadel/ugondu/actions/runs/40069310340) | 🟡 Verify exact candidate SHA and artifacts |
| PUB | Release publication | Release publishing was skipped because it is tag-gated | [CI run 40069310340](https://github.com/Chicitadel/ugondu/actions/runs/40069310340) | ⚪ Not published; do not describe as a released build |

## 3. Platform and universality ledger

| Capability | Recorded state | Why it is not universal green | Exit criterion |
|---|---|---|---|
| Windows/AMD64 | 🟡 Native runner evidence recorded | Must verify exact HEAD binding and full required test scope | Native execution receipt, full test result and manifest all match candidate |
| Linux/AMD64 | 🟡 Native CI runner recorded | Build/test alone does not certify every deployment operation | Native runner + install/run/upgrade/recovery/rollback/cleanup evidence |
| macOS/ARM64 | 🟡 Native Go thin-client only | Native evidence explicitly states the Node qualification suite was not executed on this target | Native runner + full product qualification suite |
| Linux/ARM64 | 🔴 Cross-build recorded | Cross-build is not native runtime qualification | Native ARM64 runner for all required operations |
| macOS/AMD64 | 🔴 Cross-build recorded | Cross-build is not native runtime qualification | Native Intel macOS qualification, or formally out-of-scope |
| VS Code | 🔴 Experimental in reviewed target declarations | Experimental status is not certification | Real install/auth/command/remote-workspace E2E; versioned support range |
| JetBrains | 🔴 Unsupported | No qualifying implementation evidence | Real IDE integration and compatibility suite, or explicit exclusion from product claim |
| Cursor | 🔴 Unsupported | Must not infer support from VS Code | Cursor-specific install, auth and workflow E2E |
| Windsurf | 🔴 Unsupported | Must not infer support from VS Code | Windsurf-specific integration E2E |
| Neovim | 🔴 Unsupported | No qualifying integration evidence | CLI/LSP integration, diagnostics and lifecycle E2E |
| AWS | 🟡 Reported physical qualification | Need current run, account/region scope and cleanup proof | Fresh operation-level physical qualification and artifacts |
| cPanel / DirectAdmin / SSH / Docker | 🟡 Target-dependent | Provider listing is not proof for every operation | Real provider-operation conformance and rollback/cleanup |
| GCP / Azure | 🔴 Unsupported in reviewed scope | Fail-closed behavior is correct, but not universal support | Implement real adapters and qualify, or explicitly exclude from universal scope |

## 4. AI platform activation checklist — ai.airroofers.eu

- [x] A live canary receipt is present and records endpoint `https://ai.airroofers.eu`.
- [x] The receipt reports HTTP 200 for discovery and inference, model `sentinel-guard-v1`, and 30 available models.
- [ ] Verify receipt SHA equals the candidate permitted by the final manifest.
- [ ] Freeze and validate the actual deployed API contract and authentication scheme; commit sanitized OpenAPI/schema artifacts only.
- [ ] Reconcile live discovery with the Ugondu model catalog; validate IDs, capabilities, version, region and expiry.
- [ ] Distinguish `discovered`, `eligible`, `smoke-tested`, `qualified`, `disabled` and `blocked`.
- [ ] For every model marked active, run real inference or document an explicit qualification policy and exclusion; discovery alone is not activation.
- [ ] Test invalid/missing credentials, unknown model, malformed payload, timeout, rate limit, upstream 5xx, cancellation and schema mismatch.
- [ ] Test tenant/product authorization, quotas, region/data-classification restrictions, secret redaction and audit correlation.
- [ ] Test adding an approved future provider through the registry and conformance interface without modifying gateway core.
- [ ] Ensure no unapproved provider/model inventory, URL, credential, region or feature flag is hardcoded in operational code.
- [ ] Generate a fresh redacted receipt and bind it to the final candidate SHA.

## 5. UAIGOS zero-hardcoding and zero-stub policy

### Zero operational hardcoding
Prohibit unapproved hardcoded provider/model inventories, mutable endpoint URLs, region availability, credentials, tenant/product allowlists, host/IDE support declarations, operational quotas/retry settings, feature flags, environment-specific IDs and user-visible strings outside localization tokens.

Immutable protocol/security invariants and validated schemas may remain in code only when documented, reviewed and tested. Do not weaken fail-closed controls to achieve configurability.

### Zero production stubs and synthetic success
Production source, shipped bundles and release artifacts must contain no fake adapters, placeholder handlers, empty implementations, fake-success results or fixture-backed live responses. Unit-test doubles may exist only in isolated test paths. Live E2E and qualification must use real endpoints and authorized scoped credentials. Missing secrets/infrastructure means BLOCKED/NOT RUN, never PASS.

### Anti-regression requirements
- AST and import-graph scans for production-reachable mocks, stubs, placeholders and test fixtures.
- Build artifact scans in addition to source regex scans.
- Adversarial tests for swallowed exceptions, empty handlers, synthetic status objects and skipped required gates.
- Evidence manifest digest/signature verification and exact SHA freshness checks.
- Unknown target/provider/model/capability fails closed with a typed error.
- No manual dashboard green state without a linked, verified receipt.

## 6. Release certification commands

Run in a clean checkout of the intended candidate. Confirm script CLI options before adding flags; do not assume undocumented options.

```bash
set -euo pipefail
git status --short
git rev-parse HEAD
npm ci
npm run build
npm run lint
npm run typecheck
npm run test
npm run test:contract
npm run test:integration
npm run test:e2e
npm run test:security
npm run test:compatibility
npm run governance:validate
node scripts/validate-locales.js
node scripts/governance/validate-repository.mjs
node scripts/governance/validate-capability-registry.mjs
node scripts/governance/validate-test-coverage.mjs
node scripts/governance/verify-policy-pack-digests.mjs
node scripts/governance/verify-evidence-freshness.mjs
```

The live AI canary, native runner evidence generation and physical cloud qualification must run through their checked-in workflows/verified scripts. Do not replace these with mocked local calls.

## 7. Final certificate acceptance

Final COR/UAIGOS closure is authorized only when:
1. The actual release HEAD, candidate SHA, evidence manifest and canary receipt form one valid, verified lineage.
2. Every required workflow has a successful conclusion on the candidate or an explicitly authorized evidence-only descendant allowed by the freshness protocol.
3. All mandatory in-scope targets and operations have fresh qualification evidence.
4. Zero-hardcoding and anti-stub governance checks pass against source and release artifacts.
5. No unresolved critical/high finding affects the release claim.
6. Unsupported IDEs/clouds remain explicitly excluded or are implemented and qualified.
7. The dashboard is generated from the canonical registry and evidence, and is not manually greened.
8. The final signed release bundle records run IDs, artifact digests, candidate SHA, scope, exclusions, expiry/review date and approver.

**Current conclusion:** the captured run evidence indicates meaningful progress, including a successful live AI canary and successful CI job groups. The current evidence bundle nevertheless contains multiple recorded SHA identities. Maintain **QUALIFIED WITH BOUNDED TARGET SUPPORT** until the exact current branch HEAD passes freshness verification and the universal target gaps are actually qualified.
