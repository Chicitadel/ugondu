<!-- Project: Ugondu | Authority: Ujomor Systems Engineering & Governance Authority | Organization: Air Roofers SASU -->
# Ugondu Certification Progress Dashboard

**Branch:** `phase4/production-hardening`  
**Last reviewed:** 2026-10-24  
**Status semantics:** 🟢 qualified with fresh evidence · 🟡 implemented/reported but proof incomplete or stale · 🔴 gap/unsupported · ⚪ not assessed

> This table is a governance control, not a declaration that all targets are green. Update it only from verified evidence bound to the exact candidate SHA. A manually changed green cell is not acceptable evidence.

## Executive status

| Area | Status | What is currently supported | Required next action |
|---|---|---|---|
| Core microservices/workspaces | 🟡 | Supplied COR sign-off reports successful build/test gates | Re-run on one frozen candidate SHA and attach current run URLs |
| Anti-stub/mock/scaffold | 🟡 | Validator and adversarial suite exist; sign-off reports 0 violations | Rerun and verify production artifact/import scans |
| AI gateway architecture | 🟡 | Gateway, catalog, credential broker, registry and routing policy exist | Prove full real API contract and per-model active status |
| Live AI canary | 🟡 | Historical receipt reports HTTP 200 discovery and inference | Regenerate receipt for release candidate SHA |
| Evidence freshness | 🔴 | Stored receipt SHA differs from claimed release HEAD in supplied sign-off | Rebind all required evidence to one SHA; freshness gate must pass |
| OS/architecture | 🟡 | Three native tuples reported; two cross-compiled-only | Native-qualify every in-scope tuple |
| IDEs | 🔴 | VS Code experimental; four IDE families explicitly unsupported | Implement and qualify each required IDE or narrow scope |
| Hosts/cloud | 🔴 | Selected providers tested; supplied sign-off says GCP/Azure unsupported | Per-operation live provider conformance |
| Target-matrix consistency | 🔴 | Two matrices use differing status vocabularies/claims | Canonical registry and derived dashboard |
| Localization | 🟡 | Sign-off reports full key parity | Re-run on exact SHA and add runtime/RTL smoke proof |
| AWS physical qualification | 🟡 | Sign-off reports pass | Verify latest run, account/region scope, artifacts and cleanup |
| Publication/release | 🟡 | Publication intentionally tag-gated | Do not mark published until tagged workflow and artifacts pass |

## Detailed certification ledger

| ID | Capability / target | Status | Evidence required to turn green | Owner role | Regression trigger |
|---|---|---|---|---|---|
| UG-COR-001 | Workspace build and typecheck | 🟡 | CI run URL + exact SHA + logs | Release Engineering | Any source/dependency change |
| UG-COR-002 | Unit and integration tests | 🟡 | JUnit/test summary + SHA | Runtime Engineering | Test/code/dependency changes |
| UG-COR-003 | E2E against real systems | 🟡 | Live endpoint, authenticated run, postconditions, no mocks | Integration Engineering | API, auth, network or deployment changes |
| UG-COR-004 | Production anti-stub | 🟡 | Governance report + production artifact scan | Governance Engineering | Any production-path change |
| UG-COR-005 | Zero operational hardcoding | 🟡 | AST/config audit report + approved exception register | Architecture Authority | New provider/model/region/host/IDE |
| UG-COR-006 | AI discovery | 🟡 | Live discovery response digest + catalog schema validation | AI Platform Engineering | AI API/catalog changes |
| UG-COR-007 | AI inference | 🟡 | Real inference receipt per active model or approved qualification scope | AI Platform Engineering | Adapter/model/API changes |
| UG-COR-008 | AI fail-closed/error handling | 🟡 | Invalid credential/model, 429, timeout, 5xx, policy-denial tests | AI/Security Engineering | Retry/routing/credential changes |
| UG-COR-009 | AI scale/future providers | 🟡 | Adapter conformance suite and provider-onboarding test | AI Architecture | Provider interface/catalog changes |
| UG-COR-010 | Windows/AMD64 | 🟡 | Fresh native run and signed artifacts | Release Engineering | CLI/runtime/toolchain changes |
| UG-COR-011 | Linux/AMD64 | 🟡 | Fresh native run and signed artifacts | Release Engineering | CLI/runtime/toolchain changes |
| UG-COR-012 | macOS/ARM64 | 🟡 | Fresh native Apple Silicon run and signed artifacts | Release Engineering | CLI/runtime/toolchain changes |
| UG-COR-013 | Linux/ARM64 | 🔴 | Native ARM64 build/test/deploy/recovery/rollback | Release Engineering | Any platform-specific change |
| UG-COR-014 | macOS/AMD64 | 🔴 | Native Intel macOS qualification or explicit out-of-scope decision | Release Engineering | Any platform-specific change |
| UG-COR-015 | VS Code | 🔴 | Real install/auth/commands/remote workspace/E2E | IDE Integration | Extension/protocol changes |
| UG-COR-016 | JetBrains | 🔴 | Real integration + compatibility test matrix | IDE Integration | Plugin/protocol changes |
| UG-COR-017 | Cursor | 🔴 | Real integration tests; don't infer from VS Code compatibility | IDE Integration | Editor/API changes |
| UG-COR-018 | Windsurf | 🔴 | Real integration tests | IDE Integration | Editor/API changes |
| UG-COR-019 | Neovim | 🔴 | Real CLI/LSP integration tests | IDE Integration | LSP/CLI changes |
| UG-COR-020 | AWS provider | 🟡 | Per-operation physical qualification, least-privilege and cleanup proof | Cloud Qualification | IaC/IAM/provider changes |
| UG-COR-021 | cPanel / DirectAdmin / SSH / Docker | 🟡 | Live test per operation and rollback/cleanup | Host Integrations | Adapter/auth changes |
| UG-COR-022 | GCP / Azure | 🔴 | Real provider implementation and independent qualification | Cloud Qualification | Provider added or scope changed |
| UG-COR-023 | Target matrix consistency | 🔴 | Schema parity test and one canonical source | Architecture Governance | Matrix or schema change |
| UG-COR-024 | Evidence SHA freshness | 🔴 | All gate receipts and manifest bind to exact candidate SHA | Release Engineering | Every candidate commit |
| UG-COR-025 | Localization | 🟡 | Current locale parity, runtime discovery and RTL evidence | Localization Governance | Any locale/token change |
| UG-COR-026 | Final COR certificate | 🔴 | All mandatory in-scope rows green; no unresolved critical/high gaps | Certification Authority | Any change after certification |

## Rules that prevent regression

1. **No stale green:** a status becomes 🟡 when its evidence is older than the source/configuration it certifies or is bound to a different SHA.
2. **No inferred support:** compiled, cross-compiled, listed in README, or adapter-registered does not equal qualified.
3. **No hidden unsupported state:** unsupported combinations remain visible and fail closed.
4. **No evidence by declaration:** matrix claims are inputs to be checked, not proof.
5. **No skipped required gate:** blocked/missing prerequisites are BLOCKED, never PASS.
6. **No manual certification edits without evidence:** dashboard updates must link to a run, receipt, artifact digest and commit SHA.
7. **Re-run dependency map:** changes to AI adapter/catalog/credentials trigger AI contract and live canary; changes to target matrices trigger matrix schema/fail-closed tests; changes to release scripts trigger freshness and COR gates; changes to provider adapters trigger provider-specific E2E and rollback.
8. **One SHA per release:** build, test, canary, physical qualification, evidence manifest and signed certificate must identify the same candidate commit.

## Suggested release command sequence

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
node scripts/governance/generate-evidence-manifest.mjs
node scripts/governance/verify-evidence-freshness.mjs
```

Confirm the evidence generator's CLI contract before running it with options; the exact entry points above are named by the repository's existing evidence-freshness test and supplied COR sign-off. Live AI and AWS gates must run through their checked-in workflows and real secrets/accounts, not be replaced by local mock results.

## Evidence sources

- [Main audit and remediation plan](./COR_UAIGOS_REAUDIT_AND_REMEDIATION_PLAN.md)
- [Target matrix](../config/qualification/target-matrix.json)
- [Platform matrix](../config/qualification/platform-matrix.json)
- [Platform evidence implementation](../scripts/release/platform-evidence.mjs)
- [Target matrix negative tests](../tests/qualification/target-matrix-fail-closed.test.js)
- [Stored AI canary receipt](../docs/security/evidence/live_ai_canary_receipt.json)
- [COR workflow](../.github/workflows/cor.yml)
- [CI workflow](../.github/workflows/ci.yml)
