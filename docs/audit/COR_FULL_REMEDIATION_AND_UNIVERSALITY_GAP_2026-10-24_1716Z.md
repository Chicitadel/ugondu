<!-- Project: Ugondu | Authority: Ujomor Systems Engineering & Governance Authority | Organization: Air Roofers SASU -->
# COR Full Remediation, AI Activation and Universality Gap — 2026-10-24 17:16 UTC

**Governance:** UAIGOS 3.0.0  
**Production branch:** [phase4/production-hardening](https://github.com/Chicitadel/ugondu/tree/phase4/production-hardening)  
**Implementation candidate recorded by current evidence:** [1bc373f1d31e436c7314c777e4edb107b1c4a9f6](https://github.com/Chicitadel/ugondu/commit/1bc373f1d31e436c7314c777e4edb107b1c4a9f6)  
**Evidence-sealed release descendant reported by latest COR run:** [cfb124d5d986e9869fa83d406123879447d2885e](https://github.com/Chicitadel/ugondu/commit/cfb124d5d986e9869fa83d406123879447d2885e)  
**CI/CD:** [Run 40112953491](https://github.com/Chicitadel/ugondu/actions/runs/40112953491)  
**COR:** [Run 40112953367](https://github.com/Chicitadel/ugondu/actions/runs/40112953367)  
**Live AI canary:** [Run 40111965829](https://github.com/Chicitadel/ugondu/actions/runs/40111965829)  
**Verdict:** **QUALIFIED WITH BOUNDED TARGET SUPPORT. UNIVERSAL COR NOT GRANTED.**

## 1. Executive decision

The evidence shows substantial progress. CI/CD run 40112953491 completed successfully across its configured 17 jobs; COR run 40112953367 completed successfully for its configured certification workflow; its AWS Physical Qualification Gate and final release gate reported success. A live AI canary against https://ai.airroofers.eu recorded discovery HTTP 200 and inference HTTP 200, returned model sentinel-guard-v1, and reported 30 endpoint-available models.

This does not establish that the full AI fleet is qualified or active. The production-branch docs/security/evidence/ai_model_qualification_report.json is explicitly offline: qualificationMode is CATALOG_OFFLINE, totalDiscovered=12, qualifiedCount=0, activeCount=0, disabledCount=12, and the diagnostic reports CREDENTIALS_ABSENT or offline mode. The report SHA is 1bc373f1d31e436c7314c777e4edb107b1c4a9f6. A successful single canary is not fleet qualification; an endpoint's available-model count is not the number of qualified or active models.

The inspected production source still declares optional probeFn and executeFn callback seams in FullLifecycleOptions, and model-lifecycle.ts re-exports createTrustedLiveInferenceReceipt. These are remaining trust-boundary audit targets. The production adapter blocks custom transport setter use when NODE_ENV=production, but production composition and receipt issuance must be proven inaccessible to arbitrary callers, not merely guarded by caller-controlled flags.

Native-runner evidence is bounded. Windows/amd64 has a native Node qualification record (186/186); Linux/amd64 and macOS/arm64 records cover thin-client/governance scopes; Linux/arm64 and macOS/amd64 are cross-compiled only in the recorded matrix. The evidence also lists VS Code as experimental and JetBrains, Cursor, Windsurf and Neovim as unsupported/fail-closed. AWS qualification does not prove cPanel, DirectAdmin, generic SSH/VPS, Kubernetes, GCP or Azure support.

## 2. Colour-coded certification table

Legend: 🟢 verified for the exact scope stated · 🟡 partial/evidence incomplete · 🔴 required outcome not proven/blocker · ⚪ not assessed.

| Area | Status | Evidence observed | Exit condition |
|---|---|---|---|
| CI/CD | 🟢 Scoped pass | Run 40112953491: configured workspaces, five Go thin-client jobs, Docker validation, integration and governance/release-integrity jobs passed; release publishing was skipped. | Preserve run/artifact/candidate lineage; publish only under approved release conditions. |
| COR workflow | 🟢 Configured gate pass | Run 40112953367: COR job and final gate succeeded; candidate, freshness, signing, final-integrity and upload steps succeeded in job summaries. | Fresh run after source/config/dependency/policy/workflow/evidence changes. |
| AWS physical qualification | 🟢 Scoped pass | AWS Physical Qualification Gate reports success for configured scope. | Retain signed raw receipts, region, cost guardrails and teardown evidence; do not generalize to other hosts. |
| Live AI canary | 🟢 Canary only | Run 40111965829; endpoint discovery/inference HTTP 200, sentinel-guard-v1, correlation ID and output digest; endpoint reported 30 available models. | Re-run with fresh credentials on exact candidate and verify receipt independently. |
| AI fleet qualification/activation | 🔴 Not proven | Current branch report says offline, 12 discovered, 0 qualified, 0 active, 12 disabled. | Real discovery/probe/inference and trusted candidate-bound receipt per model; keep others disabled. |
| Report and candidate lineage | 🟡 Reconcile | Canary receipt and manifest name candidate 1bc373f1; report names the same SHA but is offline; COR reports evidence-sealed descendant cfb124d5. | Verify exact uploaded bytes, manifest digests, candidate and evidence-only descendant. |
| Production trust boundary | 🟡 Hardening remains | Lifecycle declares callback seams and exports receipt factory; adapter has injectable transport and a production guard on its setter. | Private receipt minting, concrete production composition, adversarial injection/forgery/replay tests. |
| Secrets/key handling | 🟢 Configured checks; 🟡 rotation proof | Governance gates passed; production key is expected to fail closed when absent/weak. | Verify redaction, key rotation/restart, dev-key rejection, revocation and recovery. |
| Zero hardcoding/I18N | 🟢 Configured locale gates; 🟡 semantic proof | Locale/I18N workflow gates passed. | AST-aware scans, registry enforcement, runtime locale switching and full journey coverage. |
| Zero mocks/stubs/scaffolding | 🟡 Partial | No-stub policy gate passed; source seams still require independent dependency-graph and adversarial checks. | Reachable production graph excludes fake/no-op paths; real-provider and fail-closed tests. |
| Windows/amd64 | 🟢 Bounded native test scope | Native runner records Windows host and 186/186 qualification tests. | Also test installer, permissions, runtime, update, rollback, uninstall and supported OS versions. |
| Linux/amd64 | 🟡 Thin-client/gate scope | CI thin-client job passed; this is not full end-user product lifecycle proof. | Native install/runtime/update/rollback/uninstall and host integration. |
| macOS/arm64 | 🟡 Thin-client scope | CI thin-client passed; native-runner record limits scope to Go thin-client. | Full product suite on native arm64, signing/notarization and upgrade/rollback. |
| Linux/arm64 and macOS/amd64 | 🔴 Native qualification absent | Native-runner evidence classifies these as cross-compiled, not natively qualified. | Complete suite on native runners; cross-compilation alone cannot be green. |
| IDE integrations | 🔴 Universal support not proven | VS Code experimental; JetBrains, Cursor, Windsurf and Neovim unsupported/fail-closed in recorded matrix. | Implement and E2E-test every advertised IDE/version, or remove it from supported claims. |
| Hosting/provider matrix | 🟡 AWS evidence only | AWS gate passed; equivalent evidence for other providers was not found in reviewed artifacts. | Real disposable deployment per advertised provider/mode, with upgrade, rollback and teardown. |
| E2E/recovery | 🟡 Configured integration scope | Docker and multi-workspace integration tests passed. | Real AI call, interruption, rotation, retries, circuit breaker, upgrade/rollback/uninstall and zero residuals. |
| Universal COR | 🔴 NOT GRANTED | Fleet activation and multiple mandatory target classes remain unproven. | Every claimed model/OS/IDE/host green with fresh signed evidence on one candidate lineage. |

## 3. Findings and remediation ledger

### F-01 — AI gateway wiring
**Status: 🟢 endpoint canary; 🔴 fleet.** Keep the endpoint in governed configuration and credentials in a secret manager/CI secret store. Require HTTPS, reject redirects, bound timeouts, validate response schema, redact logs, and preserve correlation IDs.

**Acceptance:** each intended active model has a real discovery/capability probe/inference result and a verified receipt binding model ID, endpoint host, provider request ID, candidate SHA, timestamp, output digest, policy version and signer key ID. Catalog presence alone never activates a model.

### F-02 / F-09 — No implicit-success probe
The inspected runner no longer uses the earlier default-success probe fallback. Keep regression coverage. Missing adapter, probe, credentials, network, valid response or receipt must fail closed and leave the model disabled.

    if (!adapter || !adapter.isProductionTransport()) {
      throw new ModelLifecycleError(
        'REAL_PROVIDER_ADAPTER_REQUIRED',
        'Production qualification requires the concrete Air Roofers provider adapter',
        503,
      );
    }

This is a remediation pattern, not a claim that this exact snippet is already committed. Align it to the actual API and test the production composition root.

### F-03 / F-15 / F-21 — Target matrix and bounded support
The target matrix must identify target ID, OS, architecture, version range, install type, runtime scope, evidence requirements, owner, status and expiry. Unknown/untested targets fail closed. Do not mark cross-compiled binaries as native runtime support.

### F-04 / F-05 / F-10 / F-17 / F-18 — Evidence lineage and freshness
Use one implementation candidate SHA and an explicitly allowed evidence-only descendant. Hash every evidence file; reject stale timestamps, mismatched SHA, missing signatures, unlisted files, changed non-evidence source and inconsistent model counts.

    set -euo pipefail
    git status --porcelain
    git rev-parse HEAD
    node scripts/governance/verify-evidence-freshness.mjs
    node scripts/governance/validate-repository.mjs
    node --test tests/qualification/evidence-freshness.test.js
    node --test tests/qualification/evidence-manifest.test.js

Run from a clean checkout. Preserve fresh logs and exit codes as CI artifacts; never reuse old success logs.

### F-06 — Secret hygiene
No API key, signing key, bearer token or provider credential may appear in source, evidence, console output, error details or CI artifacts. Scan tracked files and generated artifacts. Rotate any exposed credential; deleting text from the latest commit is not enough.

### F-07 / F-16 — Zero hardcoding and localization
No user-facing literals, locale lists, model/host/IDE/OS registries, endpoints or policy values should be embedded in business logic where governed registries are required. Immutable protocol/security constants are allowed only when documented, versioned and tested.

Required controls:
- AST-aware scan of TS/TSX/JS/JSX, templates, CLI output, shell output and UI resources.
- New translation key without registry/catalog entry fails CI.
- Dynamic keys are statically registered or validated.
- Every supported locale has required-key parity and no empty values.
- Runtime locale-switch tests exercise primary journeys.
- Unused tokens are reported and removed or explicitly allowlisted.

    npm run test:locales
    node scripts/validate-locales.js
    node scripts/governance/validate-repository.mjs

Confirm these commands exist in the candidate before relying on them; do not add fake scripts just to satisfy this example.

### F-08 / F-14 / F-19 — Zero production mocks/stubs/no-ops and test seams
Caller-set markers such as isMock are not a security boundary. Production composition must construct the concrete adapter itself. Test adapters belong in test-only modules excluded from production builds and exports. Receipt issuance should be private to the trusted adapter module, not exported from the general lifecycle barrel.

Mandatory rules:
1. No default-success probe, synthetic inference, fake persistence, placeholder-success handler, no-op implementation or fixture catalog in reachable production code.
2. No caller-provided production executeFn, probeFn or transport.
3. Production adapter validates HTTPS, approved host/egress, redirect behavior, response schema, request ID and model identity.
4. Receipt minted only after actual provider response validation.
5. Production receipt verification requires provisioned signing key; dev/test receipts rejected.
6. Rotation/restart tests enforce explicit receipt policy; replay and cross-model/candidate receipts rejected.
7. Negative tests cover forged/mutated receipt, missing request ID, wrong host, non-200, empty output, wrong model, stale SHA, mismatched digest, replay, missing key and dev key.

    node scripts/governance/validate-repository.mjs
    node --test tests/qualification/adversarial-anti-stub.test.js
    node --test tests/qualification/model-lifecycle-qualification.test.js

### F-11 / F-12 — Canary, qualification and activation are distinct
- **Canary:** a controlled endpoint request succeeds.
- **Qualified:** one specific model passes schema, policy, capability and real inference checks and has a verified receipt.
- **Active:** that qualified model is authorized for routing under current policy and candidate binding.

Do not promote 30 endpoint-reported available models or 12 offline catalog entries directly to active. Reconcile the authoritative live catalog, qualify each model individually, and keep unqualified models disabled with a reason.

### F-13 / F-20 — Provenance keys
Production fails closed if the signer key is missing, weak, expired or unavailable. Never use a development fallback in production. Record key ID, algorithm, candidate SHA and canonical payload digest. Document rotation, revocation, recovery and audit retention.

## 4. Exact AI qualification runbook

Use the repository's actual credential-broker contract and approved secret store. Never print or commit secrets. The inspected runner validates service keys against the format air_prod_ followed by 48 lowercase hexadecimal characters and allows approved HTTPS hosts including ai.airroofers.eu. Confirm the current key contract with the AI service owner before provisioning or rotating keys.

    set -euo pipefail
    test -n "$UGONDU_AIRROOFERS_AI_KEY" || { echo "Missing protected AI credential" >&2; exit 1; }
    export UGONDU_AIRROOFERS_AI_BASE_URL="https://ai.airroofers.eu"
    export COR_CANDIDATE_SHA="$(git rev-parse HEAD)"
    export NODE_ENV=production

    # Execute only in protected CI/qualification environment with real credentials.
    node scripts/qualification/qualify-ai-models.mjs

    # Freshness, governance and lifecycle regression checks.
    node scripts/governance/verify-evidence-freshness.mjs
    node scripts/governance/validate-repository.mjs
    node --test tests/qualification/model-lifecycle-qualification.test.js
    node --test tests/qualification/evidence-freshness.test.js

Before execution, verify the current runner's CLI and environment contract. If it requires a documented flag or credential-broker reference instead, use that real contract and update this runbook. The runner must exit non-zero when live credentials are absent. Offline inventory is allowed only as inventory and must never qualify or activate models.

**Release-blocking report invariants**
- Qualification mode is LIVE for any active model.
- Report gitSha exactly equals the implementation candidate SHA.
- 0 <= activeCount <= qualifiedCount <= totalDiscovered.
- activeCount equals the count of individually verified active receipts.
- Every active receipt binds endpoint host, model ID, provider request ID, output digest, timestamp, candidate SHA and trusted signer.
- Every discovered but unqualified model remains disabled.
- Missing credentials, signatures, receipts or policy cannot be warning-only conditions.

## 5. Platform, IDE and host qualification waves

| Wave | Scope | Mandatory real tests | Exit evidence |
|---|---|---|---|
| P0 | Candidate/evidence reconciliation | Clean checkout; verify manifest/report digests; candidate SHA and evidence-only descendant; exact uploaded artifact bytes. | Signed lineage report; mismatch blocks release. |
| P1 | Live AI fleet | Live discovery, per-model policy/probe/inference, schema/digest, auth expiry and rotation. | Trusted receipt per qualified model; others disabled. |
| P2 | Trust boundary | Reject production callback/transport injection; receipt factory inaccessible to callers; reject forged/replayed/dev receipts. | Adversarial suite and production dependency graph. |
| P3 | Native OS | Windows x64, Linux x64/arm64, macOS x64/arm64; supported versions; install/run/auth/AI call/upgrade/rollback/uninstall. | Native receipt for each claimed OS/arch/version tuple. |
| P4 | IDEs | Each IDE in the product registry: install, auth, task/command, logs, cancellation, update, uninstall. | Separate versioned receipt per advertised IDE/version. |
| P5 | Hosting | AWS plus cPanel, DirectAdmin, SSH/VPS, Kubernetes, GCP, Azure only if advertised/required. | Real disposable deployment, health, persistence, secret injection, rollback, teardown and cost record. |
| P6 | I18N/zero hardcoding | AST scans, locale parity, runtime locale switch, CLI/UI journeys and registry enforcement. | No unexplained user-facing literal or missing token. |
| P7 | Resilience/security | Timeouts, 429/5xx, DNS/TLS/auth failure, retries, circuit breaker, restart, replay, tampering and rollback. | Fail-closed behavior, bounded retries, no secret leakage, deterministic recovery. |
| P8 | Final COR | Rerun all gates on same candidate; seal evidence-only descendant; independently verify manifest/digests/signature. | Universal COR only if every mandatory target and model has fresh evidence. |

## 6. Evidence schema

Every target receipt must include schema version, target ID/type, exact OS/architecture/version, IDE or host/mode where applicable, candidate SHA, workflow/run/job IDs, timestamps, commands and exit codes, test counts, external request IDs where relevant, artifact digests, signer key ID/signature, teardown status, limitations and expiry/requalification trigger. Missing fields must fail schema validation; unknown values must not be guessed or replaced by success defaults.

## 7. UAIGOS 3.0.0 gates

Map these controls to canonical repository UAIGOS policy IDs/schemas; do not invent policy identifiers:
1. Authority, approved candidate, owner, target claims and risk class.
2. Deterministic lifecycle: discover → validate schema → policy → probe → real inference → qualify → activate; failure means disabled.
3. Signed manifest, candidate binding, freshness, evidence-only descendant and digest verification.
4. Governed registries/token catalogs; documented immutable security constants.
5. Static scan + production dependency graph + adversarial tests for zero stubs/mocks.
6. Secret manager, least privilege, TLS, redaction, retention/deletion.
7. Unsupported targets cannot be green or part of universal claim.
8. Relevant source/config/policy/dependency changes invalidate prior certification.
9. Release status derived from raw evidence and signatures, not manual dashboard edits.
10. Mandatory regression gates run on each PR/candidate; documentation cannot override red gates.

## 8. Universal COR release-blocking checklist

- [ ] Live model report generated on exact candidate with real credentials; no offline mode used for activation.
- [ ] Every intended active model has a trusted candidate-bound receipt; all others disabled.
- [ ] Counts reconcile with live discovery and receipt inventory.
- [ ] Receipt boundary resists injection, forgery, replay, stale SHA and development-key use.
- [ ] Manifest digests match exact uploaded artifacts; candidate/descendant lineage verifies.
- [ ] Native runtime/install/update/rollback/uninstall evidence exists for every claimed OS/architecture/version.
- [ ] Every advertised IDE/version has real E2E proof or is removed from supported claims.
- [ ] Every advertised host/provider/mode has real deployment and teardown evidence.
- [ ] Zero-hardcoding, zero-mock/stub/scaffold, secret hygiene and I18N gates are semantic and runtime-enforced.
- [ ] Failure injection, recovery, rollback and zero-residual tests pass.
- [ ] Fresh CI, COR and independent evidence verification pass on one candidate lineage.
- [ ] Dashboard is generated from evidence; failed/untested scopes cannot be manually promoted.

## 9. Evidence references

- [Production branch](https://github.com/Chicitadel/ugondu/tree/phase4/production-hardening)
- [AI qualification report](https://github.com/Chicitadel/ugondu/blob/phase4/production-hardening/docs/security/evidence/ai_model_qualification_report.json)
- [Live AI canary receipt](https://github.com/Chicitadel/ugondu/blob/phase4/production-hardening/docs/security/evidence/live_ai_canary_receipt.json)
- [Evidence manifest](https://github.com/Chicitadel/ugondu/blob/phase4/production-hardening/docs/governance/evidence/evidence-manifest.json)
- [Native runner evidence](https://github.com/Chicitadel/ugondu/blob/phase4/production-hardening/docs/governance/evidence/native-runner-evidence.json)
- [Model lifecycle](https://github.com/Chicitadel/ugondu/blob/phase4/production-hardening/server/engine-core/src/ai/model-lifecycle.ts)
- [Air Roofers provider adapter](https://github.com/Chicitadel/ugondu/blob/phase4/production-hardening/server/engine-core/src/ai/airroofers-provider.ts)
- [Qualification runner](https://github.com/Chicitadel/ugondu/blob/phase4/production-hardening/scripts/qualification/qualify-ai-models.mjs)
- [CI/CD run 40112953491](https://github.com/Chicitadel/ugondu/actions/runs/40112953491)
- [COR run 40112953367](https://github.com/Chicitadel/ugondu/actions/runs/40112953367)
- [Live AI canary run 40111965829](https://github.com/Chicitadel/ugondu/actions/runs/40111965829)

This is an evidence-based audit and implementation plan. It does not itself modify product source, activate models, provision credentials, execute untested targets, or grant universal certification.
