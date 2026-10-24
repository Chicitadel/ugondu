<!-- Project: Ugondu | Authority: Ujomor Systems Engineering & Governance Authority | Organization: Air Roofers SASU -->
# Master COR Remediation, Unification and Proof-of-Certification Checklist

**Audit date:** 2026-10-24  
**Branch:** `phase4/production-hardening`  
**Candidate SHA:** `d641981dd5a9e056dfc8ba59c54ab75da44ef271`  
**Qualification verdict:** **QUALIFIED WITH BOUNDED TARGET SUPPORT**  
**Governance baseline:** UAIGOS 3.0.0  
**Purpose:** Single durable checklist for the COR findings, remediation state, evidence links, acceptance criteria and regression controls.

> **Evidence lineage reconciled:** The evidence manifest binds strictly to candidate SHA `d641981dd5a9e056dfc8ba59c54ab75da44ef271`. Live canary run 40089857840, native runner execution (158/158 pass), AI model qualification report, and all evidence digests verify with zero non-evidence drift under `verify-evidence-freshness.mjs`. Bounded target qualification is fully verified. Universal certification remains withheld as experimental and out-of-scope targets (secondary IDEs, alternate clouds) fail closed by design.

## 1. Certification legend

- 🟢 **PASS / CLOSED:** fresh evidence exists for the exact candidate SHA and the defined scope.
- 🟡 **PARTIAL / REPORTED:** implementation or a reported pass exists, but the evidence scope, SHA binding, or independent verification remains incomplete.
- 🔴 **GAP / BLOCKED:** required capability is unsupported, a gate fails, or proof is missing.
- ⚪ **NOT ASSESSED:** no adequate evidence has been reviewed.

A source file existing, a target appearing in a matrix, a cross-compiled binary, or a successful unit test is not by itself a green certification.

## 2. Findings closure ledger

| ID | Boundary | Remediation recorded | Evidence | State |
|---|---|---|---|---|
| F-02 / F-04 | Release SHA and live AI receipt | Live canary run on candidate `d641981d`; receipt reports HTTP 200 discovery and inference on `ai.airroofers.eu` | [Live AI canary run 40089857840](https://github.com/Chicitadel/ugondu/actions/runs/40089857840), [receipt](../security/evidence/live_ai_canary_receipt.json) | 🟢 Candidate-bound; HTTP 200 discovery and inference verified |
| F-03 | Qualification matrix harmonization | Canonical registry reference and normalized schema/review dates recorded; negative tests pass 10/10 and platform evidence tests 15/15 | [Target matrix](../config/qualification/target-matrix.json), [platform matrix](../config/qualification/platform-matrix.json), [fail-closed tests](../tests/qualification/target-matrix-fail-closed.test.js) | 🟢 Verified on candidate SHA |
| F-06 | Operational hardcoding/security schema | Security tool schemas documented as immutable guards; extensible routing options verified; dynamic key/endpoint broker | [Routing policy](../server/engine-core/src/ai/routing-policy.ts), [AI gateway tests](../tests/ai-inference-gateway.test.js) | 🟢 9/9 AI gateway tests pass; zero hardcoded credentials |
| F-08 | Production stubs/mocks/scaffolding | Governance policy and anti-stub validator verify 4,560 tracked files with zero violations; 14/14 adversarial tests pass; zero synthetic inference fallbacks | [Repository validator](../scripts/governance/validate-repository.mjs), [AAS tests](../tests/qualification/adversarial-anti-stub.test.js) | 🟢 Clean repository verified; 14/14 adversarial anti-stub tests pass |
| FRESH | Evidence freshness | Manifest binds strictly to candidate `d641981d`; verifier confirms evidence-only descendant lineage with zero drift; narrowed allowlist | [Freshness verifier](../scripts/governance/evidence-freshness.mjs), [manifest](../docs/governance/evidence/evidence-manifest.json) | 🟢 Freshness verified; candidate binding verified |
| EVID | Native runner evidence and manifest | Windows/AMD64 records 158/158 pass; Linux/AMD64 verified via CI run 40089852101; macOS/ARM64 Go thin-client verified | [Native runner evidence](../docs/governance/evidence/native-runner-evidence.json), [evidence manifest](../docs/governance/evidence/evidence-manifest.json), [CI run 40089852101](https://github.com/Chicitadel/ugondu/actions/runs/40089852101) | 🟢 Candidate evidence verified; unproven: 0 |
| I18N | Localization | 12 locale dictionaries at 242 keys each; Arabic RTL and 6 Platform-Core dictionaries checked | [Locale validator](../scripts/validate-locales.js), [localization tests](../tests/qualification/localization-negative.test.js) | 🟢 100% parity across 12 locales; 6/6 negative tests pass |
| CORE | Workspace build, lint, typecheck and unit tests | CI run 40089852101 records engine-core and all workspace build/test/lint jobs successful | [CI run 40089852101](https://github.com/Chicitadel/ugondu/actions/runs/40089852101) | 🟢 9 workspaces compile, lint, and test cleanly |
| INT | Integration and Docker tests | CI run records Docker image validation and multi-workspace integration tests successful | [CI run 40089852101](https://github.com/Chicitadel/ugondu/actions/runs/40089852101) | 🟢 Integration and Docker Compose validation pass |
| PUB | Release publication | Release publishing is tag-gated | [CI run 40089852101](https://github.com/Chicitadel/ugondu/actions/runs/40089852101) | ⚪ Tag-gated publication pending |

## 3. Platform and universality ledger

| Capability | Recorded state | Why it is not universal green | Exit criterion |
|---|---|---|---|
| Windows/AMD64 | 🟢 Native runner evidence recorded | Verified with 158/158 tests on native runner | Complete native qualification suite passes |
| Linux/AMD64 | 🟢 Native CI runner recorded | Verified on Ubuntu 24.04 via CI run 40089852101 | Native runner CI verification passes |
| macOS/ARM64 | 🟡 Native Go thin-client only | Native evidence explicitly states the Node qualification suite was not executed on this target | Native runner + full product qualification suite |
| Linux/ARM64 | 🔴 Cross-build recorded | Cross-build is not native runtime qualification | Native ARM64 runner for all required operations |
| macOS/AMD64 | 🔴 Cross-build recorded | Cross-build is not native runtime qualification | Native Intel macOS qualification, or formally out-of-scope |
| VS Code | 🔴 Experimental in reviewed target declarations | Experimental status is not certification | Real install/auth/command/remote-workspace E2E; versioned support range |
| JetBrains | 🔴 Unsupported | No qualifying implementation evidence | Real IDE integration and compatibility suite, or explicit exclusion from product claim |
| Cursor | 🔴 Unsupported | Must not infer support from VS Code | Cursor-specific install, auth and workflow E2E |
| Windsurf | 🔴 Unsupported | Must not infer support from VS Code | Windsurf-specific integration E2E |
| Neovim | 🔴 Unsupported | No qualifying integration evidence | CLI/LSP integration, diagnostics and lifecycle E2E |
| AWS | 🟢 Physical qualification verified | Physical conformance probes, OIDC credentials, and policy reconciliation verified | Fresh operation-level physical qualification and artifacts |
| cPanel / DirectAdmin / SSH / Docker | 🟡 Target-dependent | Provider listing is not proof for every operation | Real provider-operation conformance and rollback/cleanup |
| GCP / Azure | 🔴 Unsupported in reviewed scope | Fail-closed behavior is correct, but not universal support | Implement real adapters and qualify, or explicitly exclude from universal scope |

## 4. AI platform activation checklist — ai.airroofers.eu

- [x] A live canary receipt is present and records endpoint `https://ai.airroofers.eu`.
- [x] The receipt reports HTTP 200 for discovery and inference, model `sentinel-guard-v1`, and 30 available models.
- [x] Verify receipt SHA equals the candidate permitted by the final manifest (`d641981dd5a9e056dfc8ba59c54ab75da44ef271`).
- [x] Freeze and validate the actual deployed API contract and authentication scheme; commit sanitized OpenAPI/schema artifacts only.
- [x] Reconcile live discovery with the Ugondu model catalog; validate IDs, capabilities, version, region and expiry.
- [x] Distinguish `discovered`, `eligible`, `smoke-tested`, `qualified`, `active`, `degraded`, `disabled` and `retired` (`engine-core/src/ai/model-lifecycle.ts`).
- [x] For every model marked active, run real inference or document an explicit qualification policy and exclusion; discovery alone is not activation.
- [x] Test invalid/missing credentials, unknown model, malformed payload, timeout, rate limit, upstream 5xx, cancellation and schema mismatch.
- [x] Test tenant/product authorization, quotas, region/data-classification restrictions, secret redaction and audit correlation.
- [x] Test adding an approved future provider through the registry and conformance interface without modifying gateway core.
- [x] Ensure no unapproved provider/model inventory, URL, credential, region or feature flag is hardcoded in operational code.
- [x] Generate a fresh redacted receipt and bind it to the final candidate SHA.

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

**Current conclusion:** All mandatory in-scope Tier 1 targets and COR remediation requirements are verified and closed under candidate `d641981dd5a9e056dfc8ba59c54ab75da44ef271`. The evidence lineage is unified and passes freshness verification with zero non-evidence drift. Maintain **QUALIFIED WITH BOUNDED TARGET SUPPORT — UNIVERSAL CERTIFICATION NOT GRANTED** in accordance with truthful governance standards.
