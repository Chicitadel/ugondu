/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Governance & COR Master Compliance Checklist
 * File           : UGONDU_COR_UNIVERSAL_MASTER_CHECKLIST.md
 * Version        : 4.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU / Ujomor Engineering
 * Created Date   : 2026-10-18
 * Last Modified  : 2026-10-18
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance:
 * - Corporate Policy Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001
 * - SOC 2 Type II
 * - OWASP ASVS
 * - NIST SP 800-53 / 800-207
 *
 * Signatures:
 * - Architecture Authority : Ujomor Systems Engineering
 * - Security Authority     : Ujomor Systems Governance
 * - Governance Authority   : Air Roofers Corporate Governance
 * - Deployment Authority   : Global Release Operations Command
 *
 * Copyright (c) 2026 Air Roofers SASU / Ujomor Engineering. All Rights Reserved.
 ******************************************************************************/

# Ugondu COR Remediation & Universal Readiness — Master Checklist

**Document ID:** `UG-COR-MASTER-CHECKLIST-2026-10-18`  
**Target:** 100% Closure of `COR-001`–`COR-022`, Phases 0–7, Workstreams `W0`–`W12`, UPLM Epics `UPLM-0`–`UPLM-11`, Agent-Neutral Capability Contract, 40-Stream COR Qualification Manifest (`A01`–`F40`), and 12-Locale Authentic Translation.

---

## Section A: COR Gap Register (`COR-001` through `COR-022`)

- [x] **COR-001 (P0):** Remove literal test signing secrets (`ci-test-key-not-for-production`, `ci-key`) from `.github/workflows/ci.yml` and remove on-disk private key `server/engine-core/keys/ed25519_private.pem`; generate ephemeral keys dynamically in tests/CI.
- [x] **COR-002 (P0):** Align key environment variable contracts (`UGONDU_RECIPE_PRIVATE_KEY` / `UGONDU_PRIVATE_KEY`), require explicit KMS/HSM/Secrets Manager key reference in production, fail closed on missing production keys, require explicit `UGONDU_DEV_EPHEMERAL_KEYS=true` for non-prod ephemeral keys, and verify versioned key rotation in `TrustRegistry`.
- [x] **COR-003 (P0):** Remove hardcoded `ALLOWED_ORIGINS` from `server/engine-core/src/bootstrap/cors-config.ts`, `billing-gateway`, and `plugin-manager`; resolve CORS origins from validated central configuration registry; fix missing `__t` import in `cors-config.ts`; add CORS policy across all HTTP services.
- [x] **COR-004 (P0):** Replace fixed `sleep` delays in `.github/workflows/ci.yml` with bounded `/health/ready` polling; eliminate ambiguous `[200, 402].includes(r.status)` assertions in `tests/engine-core.test.js` and `tests/billing-gateway.test.js`; test valid passport + valid license (`200` with verified signed recipe) separately from license denial (`402`) and missing passport (`401`/`403`).
- [x] **COR-005 (P0):** Standardize `/health`, `/health/live`, `/health/ready`, and `/v1/metadata` across all HTTP services (`engine-core`, `billing-gateway`, `plugin-manager`, `event-bus`, `repository-adapter`); update `docker-compose.yml` healthchecks from `/` to `/health/ready`.
- [x] **COR-006 (P0):** Implement centralized AI Inference Gateway (`InferenceProvider` contract, `ModelCatalog`, `ProviderAdapterRegistry`, `RoutingPolicyEngine`, `CredentialBroker`, `QuotaCostGuard`, circuit breaker, audit redaction, product-level identity protection, and conformance tests).
- [x] **COR-007 (P1):** Replace substring `includes()` detection in `server/repository-adapter/src/index.ts` with strict URL parsing, exact hostname suffix/boundary rules, user-info/port rejection, and `NetworkDestinationPolicy` SSRF protection.
- [x] **COR-008 (P1):** Implement full `RepositoryAdapter` capability contracts (`canHandle`, `normalize`, `validateCredentials`, `getMetadata`, `listRefs`, `fetchSource`, `healthCheck`) and per-provider capability matrix (`github`, `gitlab`, `bitbucket`, `azure-devops`, `aws-codecommit`, `gitea`, `generic-git`).
- [x] **COR-009 (P1):** Replace `'aws-codecommit': 'AWS_SECRET_ACCESS_KEY'` with AWS SDK default credential chain / IAM role assumption / OIDC / SigV4 credential helper contract and explicit region configuration.
- [x] **COR-010 (P1):** Configure mandatory `lint`, `typecheck`, and `test` scripts across `Makefile`, root `package.json`, and all 9 workspace `package.json` files without silent error swallowing (`|| echo 'No eslint'`).
- [x] **COR-011 (P1):** Update `.github/workflows/ci.yml` to generate/verify parity across all workspaces (`engine-core`, `billing-gateway`, `plugin-manager`, `event-bus`, `repository-adapter`, `shared`, `uppie`, `capabilities`, `tests`) and run `tests/repository-adapter.test.js` and `tests/event-bus.test.js` in CI integration.
- [x] **COR-012 (P1):** Fix Go client compilation error in `client/engine/executor.go`, run `go vet ./...` and `go test ./...`, and configure cross-platform OS/architecture matrix (`linux/amd64`, `linux/arm64`, `windows/amd64`, `darwin/arm64`, `darwin/amd64`).
- [x] **COR-013 (P1):** Remove static `cor_level: 'A'` from all service health responses (`engine-core`, `billing-gateway`, `plugin-manager`, `event-bus`, `repository-adapter`).
- [x] **COR-014 (P1):** Synchronize `README.md` provider, capability, CLI, and edition support tables with the verified capability registry (`implemented`, `tested`, `supported`, `experimental`, `unavailable`).
- [x] **COR-015 (P1):** Create `.governance/policies/no-production-stubs.yml` (`UG-COR-NO-STUBS-001`) and executable validators in `scripts/governance/` blocking mocks/stubs/hardcoding/fake-success in production paths.
- [x] **COR-016 (P1):** Wire `POST /v1/deploy/resolve` and `/preview` in `server/engine-core/src/routes/deploy.ts` to durable `TransactionStore`, `IdempotencyStore`, `LeaseManager`, and crash/reconciliation state transitions.
- [x] **COR-017 (P1):** Remove `&& false` tenant authorization bypass in `server/plugin-manager/src/index.ts:226`, enforce `requireServiceIdentity('plugin-manager')` on `POST /v1/plugins/:pluginName/activate`, relocate `plugins/tampered-test-plugin` to test fixtures, and verify sandbox isolation & execution receipts.
- [x] **COR-018 (P2):** Implement W3C `traceparent` / `x-correlation-id` propagation across Go client and all Node services, structured telemetry logs, and value-level secret/PEM/token redaction in `server/shared/logger.ts`.
- [x] **COR-019 (P2):** Remove `--if-present` and `--passWithNoTests` from root and workspace test scripts; add unit/contract test suites to every workspace.
- [x] **COR-020 (P2):** Enforce `minCoreVersion`/`maxCoreVersion` semver checks in `server/shared/packs.ts`, mount `localeNegotiationMiddleware`, and sign/verify `.upl.json` packs across all 12 supported locales.
- [x] **COR-021 (P2):** Standardize `TargetAdapter` contract (`discover`, `preflight`, `plan`, `apply`, `verify`, `rollback`, `health`) across Linux, Windows, macOS, Docker/OCI, AWS ECS/Fargate, Kubernetes, and cPanel/DirectAdmin, and wire into deployment resolution.
- [x] **COR-022 (P2):** Upgrade Go thin client (`client/cmd/cli.go`) for CLI-first IDE interoperability (`--format <table|json|yaml>`, `--non-interactive`, `--dry-run`, deterministic exit codes `0, 2..10`, and full command set: `doctor`, `config validate`, `providers`, `models`, `plan`, `deploy`, `status`, `cancel`, `rollback`, `capability`, `policy`, `access`, `operation`, `evidence`).

---

## Section B: Universal Policy Lifecycle Manager (UPLM) & Agent-Neutral Capability Contract

- [x] **UPLM-CAP-01:** Register canonical UPLM capabilities (`policy.inspect`, `policy.plan`, `policy.bootstrap.plan`, `policy.bootstrap.apply`, `policy.install`, `policy.repair`, `policy.migrate`, `policy.retire.plan`, `policy.retire.apply`, `policy.verify`, `policy.evidence.export`) and independent Growth Marketing capability contracts.
- [x] **UPLM-CAP-02:** Implement 12-Step Universal Bootstrap & Access-Recovery Engine with all 13 states (`NOT_INSPECTED`, `INSPECTING`, `READY`, `READY_WITH_WARNINGS`, `MISSING_AUTHORITY`, `CONSENT_REQUIRED`, `BLOCKED_BY_POLICY`, `UNSUPPORTED`, `APPLYING`, `VERIFYING`, `COMPLETE`, `FAILED_RECOVERABLE`, `MANUAL_INTERVENTION_REQUIRED`).
- [x] **UPLM-CAP-03:** Implement 4-dimensional authorization evaluation (Platform AuthZ, Provider AuthZ, Approval Policy, Provider Constraints) and all 17 canonical error codes (`CREDENTIALS_INVALID` through `VERIFICATION_FAILED`).
- [x] **UPLM-CAP-04:** Package the 5 split AWS COR V9 customer-managed policies (`UgonduCOR-V9-Discovery`, `UgonduCOR-V9-EC2-Creation`, `UgonduCOR-V9-EC2-Cleanup`, `UgonduCOR-V9-RDS-S3`, `UgonduCOR-V9-ECR-ECS` — 46 statements preserved 1:1) into `policy-packs/aws/cor/` with `pack.yaml` and JSON schema validation.
- [x] **UPLM-CAP-05:** Implement `PolicyLifecycleProviderAdapter` for AWS IAM (read-only inspector, `ResolvedEnvironment` renderer, Access Analyzer/quota checks, immutable hash-bound planner, 6-class ownership ledger, durable reconciler, repair/migration/uninstall engines, and graphical control panel view contracts).

---

## Section C: Localization, Tokenization, Zero Hardcoding & Product Registry

- [x] **LOC-01:** Fix `server/shared/i18n.ts` to eliminate `[locale]` prefix injection and resolve translations cleanly from `server/shared/locales/*.json` and `locales/*.json`.
- [x] **LOC-02:** Remediate all corrupted/truncated 30-char snake_case English strings in `server/shared/locales/en.json` and `client/i18n/locale.go`, and add missing keys (`error.cert.missing_volume_id`, `cert.fargate.cleanup`, `cors_policy_violation`).
- [x] **LOC-03:** Fix `server/engine-core/src/discovery/security/sandbox.ts` so OS shell command allowlists are not corrupted by locale translation, and remove `const __t = (str: string) => str` bypass in `action-registry-factory.ts`.
- [x] **LOC-04:** Translate 100% of keys in `locales/*.json`, `server/shared/locales/*.json`, and `packs/*.upl.json` across all 12 supported languages (`en`, `ar`, `de`, `es`, `fr`, `hi`, `it`, `ja`, `ko`, `pt`, `ru`, `zh`) with zero `[LANG]` fake prefixes.
- [x] **LOC-05:** Remove obsolete `client/locales/` directory (`E34`) after ensuring Go client bootstrap dictionary and signed `.upl.json` packs cover all required CLI tokens.
- [x] **REG-01:** Unify `.governance/standards/product-registry.json`, `.governance/product.definition.yaml`, and runtime `ProductRegistry` / `ConfigurationRegistry` so all services auto-discover product metadata, ports (`4001`–`4005`), URLs, and capabilities without hardcoding.

---

## Section D: Zero Mocks, Zero Stubs, Non-Destructive Cleanup & Corporate Governance

- [x] **CLEAN-01:** Non-destructively archive all root and subdirectory `scratch_*`, `check_*`, `deploy_*`, `fix_*`, `upload_*`, `test_*` one-off scripts and zip dumps outside active workspace paths.
- [x] **CLEAN-02:** Remove stale compiled `.js` / `.d.ts` files checked in alongside `.ts` source files so TypeScript sources are the single source of truth.
- [x] **CLEAN-03:** Implement real cryptographic signature verification in `saml-adapter.ts` and `oidc-adapter.ts`, real DAG rollback compensations in `action-registry-factory.ts`, real status checks in `cpanel.ts` and `linux.ts`, and real patch diagnosis/planning in `autonomous-code-patching.ts`.
- [x] **GOV-01:** Ensure zero trace of non-human authorship across all modified/created files and headers; enforce `Ujomor Systems Engineering & Governance Authority` corporate headers and `AIR_ROOFERS_GUIDE_5_1` (<= 500 LOC per governed JS/MJS/CJS file).
- [x] **DOC-01:** Create all 14 required Developer & Operator Guides in `docs/guides/` (`01-contributor-guide.md` through `14-operator-runbook.md`).
- [x] **CERT-01:** Execute all unit, contract, integration, E2E, security, compatibility, locale, and COR 40-stream (`A01`–`F40`) qualification suites, and generate the signed `evidence/` release bundle (`manifest.json` + `evidence-manifest.sig`).

---

## Section E: Universal Environment Portability, DirectAdmin Twin & Zero-Code-Change Migration

- [x] **PORT-01 (DirectAdmin Honest Discovery):** DirectAdmin Environment Twin reports verified capabilities (`PHP 8.3`, `Database: AVAILABLE`, `DNS: AVAILABLE`, `TLS: AVAILABLE`, `FTP: AVAILABLE`, `Filesystem: ACCOUNT_SCOPED`, `Kubernetes: UNSUPPORTED`) and explicitly marks unprobed capabilities (`rootAccess`, `docker`, `ssh`, `nodejs`, `cron`, `redis`, `resourceLimits`) as `UNKNOWN` rather than guessing.
- [x] **PORT-02 (Environment Portability Invariant & `ugondu move`):** `Application -> Universal Project Model -> Environment Requirements -> Target Capability Discovery -> Compatibility Matrix -> Deployment Profile -> Execution -> Verification -> Migration Passport` guarantees `codeChangesRequired === 0` and `applicationCompatibilityPct === 100` when migrating workloads from `DirectAdmin Shared Hosting` to `VPS / Cloud` via externalized deployment profiles (`DATABASE_URL`, `REDIS_URL`, `STORAGE_PROVIDER`, `STORAGE_BUCKET`, `APP_BASE_URL`, `RESOURCE_LIMIT`, `RUNTIME_PROFILE`).
- [x] **PORT-03 (Immutable Artifact Supply Chain):** `SOURCE -> BUILD -> TEST -> PACKAGE -> SIGN -> RELEASE ARTIFACT -> DEPLOY` deploys the exact same signed artifact (`SHA-256`, `SBOM`, `buildProvenance`, `testEvidence`, `signature`) across DirectAdmin, VPS, Docker, and Cloud targets.
- [x] **PORT-04 (Server-Authoritative Dynamic Entitlement Upgrade):** `CAPABILITY_NOT_ENTITLED` (e.g., `DELIVERY.PREVIEW` on Community) dynamically activates upon `SUBSCRIPTION_ACTIVATED` event (`Billing -> License Authority -> Entitlement Event -> Ugondu Control Plane -> Capability Resolver -> Client refresh`) with zero binary reinstall or proprietary IP leakage to the thin client.

