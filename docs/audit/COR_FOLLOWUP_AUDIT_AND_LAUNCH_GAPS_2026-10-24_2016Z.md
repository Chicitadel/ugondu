<!-- Project: Ugondu | Organization: Air Roofers SASU | Governance: UAIGOS 3.0.0 -->
# COR Follow-up Audit and Commercial Launch Gap Reconciliation — 2026-10-24 20:16 UTC

**Repository:** https://github.com/Chicitadel/ugondu  
**Production branch:** `phase4/production-hardening`  
**Implementation candidate:** [`318c022158b1dabf1d9c12c62ed497a837a692df`](https://github.com/Chicitadel/ugondu/commit/318c022158b1dabf1d9c12c62ed497a837a692df)  
**Evidence-sealed release head:** [`be549ffa6a2ddb1655c83f2b458dab56957aa0fb`](https://github.com/Chicitadel/ugondu/commit/be549ffa6a2ddb1655c83f2b458dab56957aa0fb)  
**Candidate CI:** [40125624489](https://github.com/Chicitadel/ugondu/actions/runs/40125624489)  
**Live AI canary:** [40125751718](https://github.com/Chicitadel/ugondu/actions/runs/40125751718)  
**Release CI:** [40126588874](https://github.com/Chicitadel/ugondu/actions/runs/40126588874)  
**Release COR:** [40126588895](https://github.com/Chicitadel/ugondu/actions/runs/40126588895)  
**Status:** **Configured COR gates pass for their stated scope; Universal COR and unrestricted commercial launch remain NOT GRANTED.**

> This report distinguishes source-verified facts, CI gate outcomes, declared support, and missing qualification evidence. A passing workflow is not equivalent to universal platform certification.

## 1. Executive determination

The repository has advanced materially since the 18:59 UTC baseline. The newer candidate is `318c0221...`; the release-evidence commit is `be549ffa...`. The release CI workflow has 18 jobs: 17 succeeded and `Build & Publish Release` was skipped. The release COR run has all three configured jobs completed successfully: COR Certification, AWS Physical Qualification Gate, and COR Final Release Gate. The live AI canary workflow completed successfully.

These outcomes are meaningful progress, but they do not prove the full user-requested objective. Current committed qualification evidence still states:
- AI qualification report: `CATALOG_OFFLINE`, 12 catalog entries, 0 qualified, 0 active, 12 disabled.
- Native runner evidence: `universalClaim: false`.
- Windows evidence covers a Node qualification suite; Linux evidence covers Go thin-client/governance scope; macOS arm64 evidence covers the Go thin-client only.
- Linux arm64 and macOS amd64 remain cross-compiled-only.
- VS Code is experimental; JetBrains, Cursor, Windsurf, and Neovim are unsupported in the target matrix.
- AWS physical qualification passes for the configured AWS scope; cPanel, DirectAdmin, SSH/VPS, and Kubernetes remain partial; GCP and Azure are unsupported.
- Release publishing was skipped, so signed distribution and install-from-release qualification are not established by this CI run.

**Certification rule:** Do not paint universal support green to satisfy a desired outcome. Green means the exact claimed capability was exercised on the exact candidate and target with retained evidence. Unqualified targets must remain yellow/red until that evidence exists.

## 2. Verified workflow and evidence ledger

| Evidence | Observed result | What it proves | What it does not prove |
|---|---|---|---|
| Candidate CI 40125624489 | Reported successful candidate pipeline; run link retained above | Configured checks for the candidate revision | Universal lifecycle coverage on every OS/IDE/host |
| AI canary 40125751718 | Workflow job completed successfully | One live discovery/inference canary against the provisioned Air Roofers AI API | Fleet-wide qualification, activation, policy approval, or every model/provider |
| Release CI 40126588874 | 18 jobs; 17 success, release publish skipped | Build, tests, governance, thin-client builds, Docker validation and integration job passed where configured | A published, signed release and successful install/upgrade/rollback from that release |
| Release COR 40126588895 | 3/3 configured jobs success | COR certification, configured AWS physical gate and final gate passed | Every target and model is certified, or every external hosting provider works |
| AI report | Candidate-bound report says `CATALOG_OFFLINE`; 12 discovered, 0 qualified, 0 active, 12 disabled | Offline catalog governance safely fails closed | Live fleet qualification or activation |
| Native runner evidence | `universalClaim: false` | Precisely scoped native execution evidence is recorded | Full product lifecycle qualification on all listed architectures |
| Target matrix | Explicit supported/experimental/unsupported declarations | Current product support claims and fail-closed behavior are inventoried | Proof that every declared supported capability has completed lifecycle E2E |

## 3. Finding F-22 — receipt API encapsulation: progress and residual risk

### Confirmed improvement
The candidate commit title is “feat(ai): encapsulate receipt factory with explicit barrel allowlist and eliminate class seam.” Current `server/engine-core/src/ai/index.ts` uses an explicit export list for `trusted-receipt` instead of `export * from './trusted-receipt'`. It does not list `createTrustedLiveInferenceReceipt`. `TrustedReceiptService` exposes validation/trust-check methods in the inspected source, not a public receipt-minting method. This closes the specific wildcard-barrel path observed in the earlier audit, subject to built-artifact verification.

### Residual security review
The source module still exports `createTrustedLiveInferenceReceipt` for internal lifecycle use, and the public barrel still exports development-key identifiers/constants including `DEV_FALLBACK_KEY` and `DEV_KEY_ID`. The fallback value is not a production secret, but exposing development signing material/constants in a production package increases misuse risk and conflicts with a strict least-public-API posture. The host allowlist constant `ai.airroofers.eu` is also literal source configuration. Determine and document whether this is an intentional security boundary exception or move endpoint policy into a governed, integrity-protected configuration without weakening SSRF protection.

Required closure:
1. Inspect the compiled package exports and emitted declaration files—not only TypeScript source.
2. Assert the public API does not export minting functions, signer keys, development fallback values, or internal-only helpers.
3. Verify the actual production composition path uses the real Air Roofers adapter and does not accept arbitrary transport/callback injection.
4. Add tests for production key rotation, restart, revoked/unknown key, dev-key rejection, replay, stale candidate SHA, malformed receipt, and signature tampering.
5. Re-run all affected COR gates and attach candidate-bound receipts after any source or configuration change.

Example regression contract (adapt to the repository's actual package output path):

```js
import assert from 'node:assert/strict';
import * as aiPublicApi from '../server/engine-core/dist/ai/index.js';

assert.equal('createTrustedLiveInferenceReceipt' in aiPublicApi, false);
assert.equal('computeProvenanceSeal' in aiPublicApi, false);
assert.equal('getProvenanceSigningKey' in aiPublicApi, false);
assert.equal('DEV_FALLBACK_KEY' in aiPublicApi, false);
```

The test must be wired into the real package build and CI. Adjust import path only to the actual emitted artifact; do not silently skip if the build output is absent.

## 4. AI integration — required end state

The live canary is a positive integration signal, not fleet activation. The current report's `CATALOG_OFFLINE` mode intentionally disables all 12 catalog entries. The endpoint's report of 30 available models is discovery inventory, not evidence that all 30 are safe, licensed, policy-compatible, or active.

### Required per-model lifecycle
1. Discover models dynamically from the configured Air Roofers API endpoint using authenticated transport and bounded pagination.
2. Reconcile provider model IDs with the governed catalog using stable IDs/capabilities; never activate unknown models merely because discovery returned them.
3. Validate tenant/region policy, data residency, modalities, tool use, streaming, context limits, quotas, budget, safety policy, retention, and provider terms.
4. Probe model metadata and execute a real, non-sensitive inference with a unique request/correlation ID.
5. Verify HTTP status, provider request ID, response digest, expected endpoint identity, candidate SHA, signature/seal, and receipt timestamp.
6. Persist append-only lifecycle history and qualification receipt; redact credentials and personal data.
7. Activate only after every required gate passes and activation is explicitly authorized. Failed, stale, unknown, or unqualified models remain disabled.
8. Continuously reconcile additions/removals and key/credential/policy changes. Revocation must prevent routing immediately.
9. Produce a machine-readable report that separately counts discovered, policy-eligible, tested, qualified, approved, active, disabled, failed, and revoked models.
10. Keep a live provider integration test using real credentials in a protected environment; unit tests may use fixtures, but fixtures must never count as live qualification evidence.

### Required tests
- Auth success, invalid credential, expired credential, rotation and revocation.
- 401/403, 404/unsupported model, 408/timeout, 429/retry-after, 5xx, malformed JSON, truncated stream, connection reset, DNS/TLS failure and provider outage.
- Rate limiting, quotas, budget exhaustion, cancellation, concurrency, tenant isolation and failover.
- Catalog drift, newly discovered unknown model, removed model, stale capability metadata, policy denial and regional mismatch.
- Receipt forgery, replay, stale SHA, wrong host, wrong model, digest mismatch, dev-key use and signing-key rotation.
- Real canary after deployment and per-model qualification receipts. Do not store API keys or raw sensitive prompts/responses in evidence artifacts.

### Configuration contract
Keep credentials in GitHub Actions secrets or the production secret manager, never in the repository. The provider endpoint, timeout, retry policy, model selection and activation policy must be explicit governed configuration. If the endpoint host is pinned as an SSRF security invariant, document it as an approved constant rather than falsely claiming it is ordinary dynamic configuration.

## 5. Platform universality matrix — status must reflect evidence

| Target | Current status | Required proof before green |
|---|---|---|
| Windows amd64 | 🟡 Native qualification subset | Full product install/start/auth/AI/deploy/upgrade/rollback/uninstall and recovery tests on supported Windows versions |
| Linux amd64 | 🟡 Native qualification subset | Full product lifecycle and service-management tests on native Linux, not just thin-client/governance |
| macOS arm64 | 🟡 Thin-client-only evidence | Full product lifecycle, signing/notarization where applicable, permissions, upgrade/rollback and recovery |
| Linux arm64 | 🔴 Cross-compiled only | Native arm64 runner; execute full product suite and recovery tests |
| macOS amd64 | 🔴 Cross-compiled only | Native Intel macOS runner; execute full product suite and recovery tests |
| VS Code | 🟡 Experimental | Supported-version extension install, activation, commands, auth, AI, sync, update and uninstall |
| JetBrains | 🔴 Unsupported | Implement integration and run IDE-version matrix; otherwise explicitly exclude from supported claims |
| Cursor | 🔴 Unsupported | Implement integration and run real compatibility suite; otherwise explicitly exclude |
| Windsurf | 🔴 Unsupported | Implement integration and run real compatibility suite; otherwise explicitly exclude |
| Neovim | 🔴 Unsupported | Implement plugin/protocol integration and run real compatibility suite; otherwise explicitly exclude |
| AWS ECS/Fargate, eu-west-3 | 🟢 Scoped physical gate | Keep signed operation receipts, cost controls, residual-resource assertions and rerun on relevant changes |
| cPanel / DirectAdmin | 🟡 Partial | Disposable real host tests for install, permissions, config/secrets, health, persistence, upgrade, rollback and cleanup |
| SSH / VPS | 🟡 Partial | Native deployment tests across supported distributions/init systems and recovery paths |
| Kubernetes | 🟡 Partial | Real cluster install, probes, secrets, persistence, rolling upgrade, rollback, network policy and teardown |
| GCP | 🔴 Unsupported | Implement adapter and qualify actual resources, identity, networking, deployment, rollback and cleanup |
| Azure | 🔴 Unsupported | Implement adapter and qualify actual resources, identity, networking, deployment, rollback and cleanup |
| Docker | 🟡 Compose-spec evidence only | Real build/run/health/upgrade/rollback/volume/network/cleanup tests on each claimed host |

**Universality means the declared support set is completely tested—not that every conceivable OS/IDE/host is automatically supported.** Define a versioned support contract, then test every entry in it. Unsupported entries may be green only for the explicit “correctly rejected as unsupported” safety test, never for support certification.

## 6. UAIGOS and Air Roofers product-integration governance

Required governance controls for the release candidate:

- **Fail closed:** unknown capability, missing credential, expired receipt, stale candidate, untrusted provider, policy denial or incomplete evidence cannot activate a model or deployment.
- **Zero hardcoding:** eliminate business/runtime facts, endpoint selection, account IDs, credentials, region choices, product lists, locale strings and platform capability claims from scattered implementation code. Use validated configuration/registries. Document narrowly justified immutable security constants (e.g., anti-SSRF allowlists) as explicit reviewed exceptions.
- **Zero mocks/stubs in production paths:** static scans alone are insufficient. Trace the reachable production dependency graph and test every production composition root. Mock/fixture providers must be isolated to test-only modules and must not be selectable in production.
- **Zero scaffolding/partial implementation:** no TODO/placeholder/no-op success paths, sample providers presented as production, fake progress, synthetic health, silently skipped mandatory tests, or unimplemented capabilities marked supported.
- **Localization:** no user-visible hardcoded strings; token registry and locale parity checks plus runtime language-switch E2E across supported locales, including RTL and fallback behavior.
- **Evidence integrity:** bind each receipt to exact source SHA, dependency lockfile, configuration digest, workflow run, target identity and test result. Evidence-only descendants must be proven to contain only permitted evidence changes.
- **Security:** least privilege, secret redaction, tenant isolation, SSRF controls, signed provenance, rotation/revocation, dependency/SBOM and vulnerability gates, audit log integrity and resource cleanup.
- **Reproducibility:** locked dependencies, pinned third-party actions, deterministic build metadata, signed artifacts, provenance and install-from-artifact testing.
- **Change control:** source, configuration, policy, workflow, dependency or target-matrix changes invalidate the affected evidence until rerun.

The above is an acceptance contract; this report does not claim every item has already been implemented or certified.

## 7. Execution plan and exit gates

### Gate A — evidence and candidate integrity
- Freeze exact candidate SHA and clean checkout.
- Verify all evidence manifests, hashes, signatures, timestamps, target identities and allowed descendant diffs.
- Reject stale, unsigned, missing or cross-candidate evidence.

### Gate B — AI live fleet qualification
- Use protected live credentials for discovery and real inference.
- Qualify every catalog model individually; reconcile endpoint inventory with governed policy.
- Activate only approved models; output signed per-model receipts and fleet summary.
- Require at least one passing negative test for each security/policy rejection path.

### Gate C — public API and production composition
- Verify compiled package API allowlist and declaration output.
- Prove only concrete production transport is reachable in production.
- Run adversarial receipt, key rotation, replay and failure-injection tests.

### Gate D — OS/IDE/host support
- Version every advertised target and required test suite.
- Execute tests on native runners or actual disposable host/cluster; cross-compilation is not native proof.
- Capture install, configure, health, real AI call, deploy, upgrade, rollback, uninstall and no-residual-resource receipts.
- Keep unsupported targets red until implementation and evidence exist.

### Gate E — release readiness
- Run all mandatory checks on the exact release candidate.
- Publish/sign release artifact; verify checksum/signature and install from the published artifact in a clean environment.
- Test upgrade and rollback from the prior supported version.
- Complete operational, security, privacy, support and recovery runbooks.
- Generate dashboard from raw evidence and fail the workflow if any mandatory row is stale, unsupported or non-green.

### Suggested command sequence
Use repository-defined scripts and inspect `package.json` before assuming names. The current COR workflow demonstrates these existing commands:

```bash
npm ci
npm run build
node scripts/validate-locales.js
node scripts/i18n_audit.js
node scripts/depth_scan.js
node scripts/import_scan.js
npm exec --workspaces -- tsc --noEmit --skipLibCheck
npm run test --workspaces
node tests/cor-remediation.test.js
node tests/qualification/evidence-pipeline-adversarial.test.js
node tests/qualification/shared-execution-and-mode-parity.test.js
node tests/qualification/cor-workflow-gates.test.js
node scripts/governance/verify-policy-pack-digests.mjs
```

Then run the existing live AI qualification command and physical-host tests as declared in the repository workflow/runbooks. Do not invent an activation command or manually set model states to active; activation must be produced by the governed lifecycle after verified live evidence.

## 8. Dashboard colour semantics and anti-regression rules

- 🟢 Green: exact requirement passed on the exact candidate/target with fresh verifiable evidence.
- 🟡 Yellow: partially implemented/tested, limited scope, or missing one or more required receipts.
- 🔴 Red: unsupported, failed, stale, or no qualifying evidence.
- ⚪ Grey: not assessed.

Mandatory anti-regression checks:
1. A skipped publishing job blocks release-published claims.
2. `CATALOG_OFFLINE` cannot count as live model qualification or activation.
3. Provider model count cannot be substituted for qualified/active count.
4. Cross-compilation cannot satisfy native-runner evidence.
5. A CI job's success cannot upgrade a target beyond the tests it actually executed.
6. Missing IDE/host integration must not be labelled supported.
7. The dashboard is generated from machine-readable evidence and fails closed on stale candidate SHAs.
8. Universal COR remains red until every mandatory model and declared target is green with fresh evidence on the approved candidate lineage.

## 9. Final verdict

**Progress is real:** candidate/release COR gates passed for configured scope; the AWS physical gate succeeded; the AI live canary succeeded; and the explicit barrel allowlist is a concrete improvement over the prior wildcard export.

**Gaps remain:** live fleet qualification/activation is zero in the committed report; full product lifecycle native coverage is incomplete; multiple IDEs and hosts remain unsupported/partial; release publishing was skipped; and residual API/key/configuration hardening needs compiled-artifact and adversarial proof.

**Decision:** retain **QUALIFIED WITH BOUNDED TARGET SUPPORT**. Do not issue universal COR or represent all platforms/OS/IDEs/hosts as green until Gate A–E evidence is complete and independently verifiable.
