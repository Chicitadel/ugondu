# Ugondu Universal Readiness — Re-audit Delta and Open Gates

**Document ID:** UG-COR-AUDIT-DELTA-2026-10-22-001  
**Repository:** [Chicitadel/ugondu](https://github.com/Chicitadel/ugondu)  
**Branch inspected:** `phase4/production-hardening`  
**Audit type:** Source re-read and workflow evidence reconciliation  
**Disposition:** **HOLD / NO-GO for universal release**  
**Related baseline:** [Core audit and remediation plan](./UGONDU_COR_UNIVERSAL_READINESS_AUDIT_REMEDIATION_PLAN_2026-10-22.md)  
**Related sign-off:** [Universal platform readiness sign-off](./UGONDU_COR_UNIVERSAL_PLATFORM_READINESS_CERTIFICATION_SIGN_OFF_2026-10-22.md)

## 1. Executive finding

A prior AWS candidate run reports success for commit `46ea8b3ce3c8585e82b7dbd7e937d15fc3677da2` (COR software job, AWS physical qualification, and final release gate in workflow run `39768866529`). That is useful **candidate-specific AWS evidence**, not proof of universal support across every OS, architecture, IDE, shell, host, provider, or interaction mode.

The later reconciliation run `39775766685` had a successful COR software job (`119814175901`). When inspected, its AWS physical job (`119814175595`) was still in progress at physical certification; Fargate and residual-cleanup steps had not yet completed. Do not record that run as fully passed until its final conclusion and artifacts are fetched.

## 2. Current source observations

| Area | Directly observed | Status |
|---|---|---|
| Policy adapter | `PolicyPermissionAdapter.ts` throws `COR_POLICY_VERIFICATION_UNPROVEN` for unimplemented provider operations. | 🟡 Fail-closed base improved; concrete adapters still need live read-after-write proof. |
| Region selection | `UniversalPlacementResolver.ts` blocks missing target and prompts for city, country, or provider region ID. | 🟡 Actor selection present; provider catalogue and multi-region semantics need live qualification. |
| Location catalogue | `LocationCatalogueProvider.ts` exists with location/capability metadata. | 🟡 Presence does not prove authoritative discovery for every provider. |
| AI adapter | `server/engine-core/src/ai/airroofers-provider.ts` uses `process.env[envVar] || provider?.defaultEndpoint || 'https://ai.airroofers.eu'`. | 🔴 Hardcoded endpoint fallback conflicts with strict zero-hardcoding policy. |
| Anti-stub validator | `scripts/governance/validate-repository.mjs` detects selected fake-success patterns including `APPLIED_AND_MATCHES`, `{ applied: true }`, and `{ valid: true }`. | 🟡 Useful static checks; semantic and indirect fake-success paths need adversarial mutation coverage. |
| Universal platform matrix | A complete independently evidenced OS/architecture/shell/IDE/host/provider and UI/CLI/AI-mode matrix was not established by this review. | ⚪ Unassessed, never green by inference. |
| Live AI production path | Source adapter and unit tests exist; this review did not execute a real authenticated request against the provisioned service. | 🔴 Live E2E not established here. |

## 3. Required remediation

### UG-COR-AUD-011 — Remove endpoint hardcoding
- Remove the literal fallback endpoint from `airroofers-provider.ts`.
- Resolve the endpoint only from validated provider configuration or explicit deployment configuration.
- Fail closed when missing, malformed, non-HTTPS, or disallowed by egress/residency policy.
- Add tests for absent configuration, malformed URL, disallowed host, endpoint override, TLS failure, authentication failure, and redaction.
- Keep the canonical service URL in environment/deployment configuration, not executable source defaults.

### UG-COR-AUD-012 — Prove the real AI contract
Against an approved staging or production-like environment, test a real authenticated health request, model-catalogue retrieval, one minimal inference, timeout, 401/403, 429, 5xx, invalid/unavailable model, quota accounting, policy/residency enforcement, and safe telemetry. Retain redacted evidence with exact commit SHA and environment fingerprint. Do not commit secrets or sensitive prompts.

### UG-COR-AUD-013 — Adversarial anti-stub governance
Inject violations and prove the validator exits non-zero for: helper-indirected fake success; unreachable success returns; no-op mutations; swallowed provider errors; mock/fixture imports in production paths; hardcoded success flags without provider evidence; and incomplete implementations disguised behind fallback values. Remove each mutation after testing and retain the failure evidence.

### UG-COR-AUD-014 — Universal support matrix
For every advertised combination, record OS + architecture + runtime + shell + entrypoint (UI/CLI/IDE/CI/model-assisted/non-model-assisted) + host/provider + auth mode + region/location mode. Include exact commit, test-run URL, environment, logs/artifacts, rollback and cleanup evidence, and limitations. Mark unsupported/conditional combinations explicitly. A Linux CI pass does not certify Windows, macOS, other architectures, or unrelated hosting environments.

### UG-COR-AUD-015 — Reconcile current workflow
Fetch the final state of run `39775766685`, including AWS physical gate conclusion, Fargate deployment/rollback, zero-residual scan, and artifact availability. Update status only from final observed results.

### UG-COR-AUD-016 — Evidence freshness
Bind every certification cell to exact commit SHA, environment fingerprint, test command, and retained evidence. A source change invalidates dependent evidence unless the relevant gates rerun on the new candidate SHA.

## 4. Colour-coded certification snapshot

| Gate | Status | Required next action |
|---|---|---|
| Base policy adapter fail-closed behavior | 🟡 | Concrete provider contracts and real read-after-write tests |
| Actor-selected region/location | 🟡 | Dynamic provider discovery and multi-region qualification |
| AI adapter exists | 🟡 | Remove endpoint fallback; run real canonical API contract |
| Zero hardcoding | 🔴 | Remove endpoint fallback; scan endpoints, regions, model versions, IDs, timeouts, and defaults |
| Zero stubs/fake success | 🟡 | Adversarial mutation tests and production-path review |
| Localization | 🟡 | Rerun locale validation on exact release SHA and test fallback paths |
| AWS qualification, commit `46ea8b3c` | 🟢 | Historical candidate-specific pass only; not transferable to another SHA |
| AWS qualification, run `39775766685` | 🟡 | Obtain final job result and evidence artifacts |
| Real AI E2E | 🔴 | No live request established by this source review |
| All OS/IDE/shell/host/provider coverage | ⚪ | Build and execute complete evidence matrix |
| Universal release certification | 🔴 | HOLD until all mandatory gates and matrix cells are evidenced |

**Colour meanings:** 🟢 verified for the exact commit and environment only; 🟡 implemented or partially evidenced but further verification remains; 🔴 blocking failure or required proof absent; ⚪ not assessed. Mocks, skips, dry runs, declarations, and historical evidence from another SHA never count as green.

## 5. Exact local verification sequence

Run from a clean checkout of the candidate SHA:

```bash
git status --short
git rev-parse HEAD
npm ci
npm run lint
npm run typecheck
npm run build
npm test
npm run test:contract
npm run test:integration
npm run test:e2e
npm run test:security
npm run test:compatibility
npm run governance:validate
node scripts/validate-locales.js
node scripts/verify-release-integrity.js
```

These checks are necessary but not individually sufficient. Before any cloud-mutating qualification, inspect the script and its help, confirm the actor-selected account and region, verify least-privilege authorization and cost limits, and ensure rollback and cleanup. Never silently infer a region or count mocked/dry-run execution as physical certification.

## 6. Release decision

**Current decision: HOLD / NO-GO for universal production release.** The historical AWS pass can be retained as candidate-specific evidence. Universal green status requires current candidate-bound evidence for the real AI API, zero-hardcoding and anti-stub controls, all advertised platform combinations, failure recovery, and verified cleanup/rollback.