<!-- Project: Ugondu | Authority: Ujomor Systems Engineering & Governance Authority | Organization: Air Roofers SASU -->
# Ugondu COR Remediation Execution Runbook

**Branch:** `phase4/production-hardening`  
**Version:** 1.0.0  
**Date:** 2026-10-24  
**Purpose:** Convert the audit findings into controlled, evidence-backed implementation work. This runbook is a plan; it does not assert that these remediation tasks have already been executed.

## Gate 0 — Freeze and inventory

**Deliverables**
- One immutable candidate SHA and clean checkout.
- Current list of workflow run IDs, conclusions, job IDs and artifact digests.
- Canonical file index for audit reports, evidence receipts and certification table.
- Confirmed list of checked-in live AI canary workflow/script paths.

**Commands**
```bash
git status --short
git rev-parse HEAD
git log -1 --format='%H%n%ci%n%s'
git branch --show-current
```

**Acceptance**
- Working tree is clean.
- Every cited CI result points to the same candidate SHA or is explicitly marked historical.
- No stale evidence is represented as current.

## Gate 1 — Repair evidence freshness

1. Run the existing evidence manifest generator using its actual supported invocation.
2. Run `node scripts/governance/verify-evidence-freshness.mjs`.
3. Re-run COR, CI and live AI canary on the exact candidate SHA.
4. Regenerate the canary receipt; include exact SHA, endpoint, timestamp, model/provider, response digest, correlation ID and status.
5. Verify signed manifest and all required artifact hashes.
6. Commit only after the gate proves the intended commit identity; then rerun SHA-sensitive gates if the commit changes.

**Acceptance:** all evidence artifacts identify the candidate SHA; freshness test passes; no mixed-SHA release bundle.

## Gate 2 — Canonical target registry

1. Define one versioned schema for OS/architecture, IDE, host/cloud, operation, edition, runtime, auth mode, qualification tier and support scope.
2. Treat target declarations as desired scope only. Derive actual status from evidence.
3. Add migration/consistency tests between `target-matrix.json`, `platform-matrix.json` and runtime adapter registry.
4. Reject duplicate targets, unknown status values, unsupported tier jumps, stale review dates and missing owners.
5. Generate the dashboard from validated registry + evidence.
6. Keep unsupported targets explicitly red; do not flip claims to green to satisfy a badge.

**Acceptance:** one canonical source; no contradictory support status; unknown target fails closed.

## Gate 3 — Zero operational hardcoding

1. Scan all provider/model/region/IDE/host lists, base URLs, timeout/retry/quota settings, feature flags, environment-specific IDs and user-facing strings.
2. Classify every match as immutable security invariant, schema guard, test-only fixture or mutable operational data.
3. Move mutable operational data to signed/validated catalogs and localization tokens.
4. Add AST-based checks for hardcoded endpoint URLs, provider/model switch statements, embedded credentials, direct env access outside configuration boundaries, and duplicated support inventories.
5. Keep allowlist exceptions narrow, reviewed, expiring and tested.
6. Verify that configuration cannot weaken authentication, data classification, region policy, SSRF policy or fail-closed defaults.

**Acceptance:** zero unapproved operational literals and no provider/model inventory duplication; exception register reviewed by architecture/security authority.

## Gate 4 — Zero production stubs/mocks/scaffolds

1. Run `node scripts/governance/validate-repository.mjs` and adversarial anti-stub tests.
2. Scan production source, build outputs, package manifests, generated bundles, Docker images and deployment artifacts.
3. Add AST/import graph checks for test fixtures and mock libraries reachable from production entrypoints.
4. Add tests for fake-success responses, empty handlers, TODO-only methods, silent fallbacks, skipped gates and hardcoded compliance status.
5. Ensure mocks are isolated to unit/component tests and cannot be packaged or imported by production.
6. Ensure E2E and live qualification lanes use real services.

**Acceptance:** production artifacts contain no stubs/mocks/scaffolds; all adversarial cases pass; E2E evidence confirms the real path.

## Gate 5 — Fully activate ai.airroofers.eu

1. Confirm actual deployed OpenAPI/schema and authentication contract; commit a sanitized contract artifact.
2. Inspect the real canary workflow and use its documented invocation. Do not assume a script path from a report.
3. Implement authenticated model discovery through the canonical AI API.
4. Reconcile discovered model IDs and capability metadata with the Ugondu catalog; reject duplicate/malformed data.
5. Enforce credential broker, product/tenant authorization, region/data classification, quotas, timeout/retry and circuit breaker.
6. Exercise real inference for each model marked qualified. Keep newly discovered models unqualified until they pass policy checks and smoke tests.
7. Run negative cases: invalid credentials, unknown model, timeout, 429, 5xx, schema mismatch, region denial, quota exhaustion and cancellation.
8. Verify redaction and audit correlation; no raw key, authorization header, prompt or secret in CI logs.
9. Test adding a new approved provider via registry/config and reusable conformance tests without modifying gateway core.

**Acceptance:** active models have evidence; catalog discovery and inference are live; policy failures are typed and fail closed; receipt matches candidate SHA.

## Gate 6 — Native OS/architecture qualification

For each in-scope tuple, use a native runner (not just cross-compilation) and execute:
- clean install and dependency resolution;
- build, lint, typecheck, unit and integration tests;
- CLI launch, health/readiness and authenticated operations;
- interrupted execution/resume, rollback and cleanup;
- update/upgrade and uninstall;
- filesystem, permissions, path casing, line endings and process/signal behavior;
- artifact digest/signature verification.

**Acceptance:** signed evidence from native runner identity; all required operations pass; cross-compiled-only remains non-green.

## Gate 7 — IDE integrations

For each declared IDE, implement its actual supported integration type, then test installation, authentication, workspace trust, command invocation, cancellation, diagnostics, remote workspace, reconnect, update and uninstall. Do not infer Cursor/Windsurf support from VS Code support. For unsupported IDEs, retain explicit fail-closed behavior and documentation.

**Acceptance:** per-IDE qualification evidence or explicit out-of-scope designation; no unsupported target shows green.

## Gate 8 — Host/cloud provider qualification

For each provider-operation pair, run in an isolated disposable environment with least-privilege credentials. Test preflight, provision/deploy, verify, repair, rollback, cleanup, credential expiry/rotation and interrupted-run recovery. Capture actual postconditions and cleanup evidence. Test GCP/Azure only if they are intended product scope and a real adapter plus authorized test project exists.

**Acceptance:** every green operation has live proof; untested operations remain amber/red.

## Gate 9 — Final COR release bundle

Required bundle:
- candidate SHA and signed evidence manifest;
- CI/COR workflow URLs and run IDs;
- native platform evidence per tuple;
- provider operation evidence;
- AI discovery/inference receipt;
- anti-stub/hardcoding governance reports;
- localization and security reports;
- open finding register and risk acceptance records;
- generated certification dashboard;
- signed final decision.

**Acceptance:** no unresolved critical/high finding affecting release scope; all required gates pass on the same SHA; the product claim is no broader than the evidence.

## Exact standard test sequence

```bash
set -euo pipefail
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

If a command requires a build artifact, external credential, cloud account, or live endpoint, record the prerequisite and result. Never replace an unavailable live prerequisite with a mock and then label the certification PASS. Verify command-line flags against the script's actual CLI before using them in CI.

## Regression policy

- Every commit on a release branch triggers all mandatory source-level checks.
- Changes to AI code/catalog/contract trigger live AI contract and canary tests.
- Changes to target matrices trigger schema, consistency and fail-closed tests.
- Changes to host adapters trigger provider-specific E2E, rollback and cleanup.
- Changes to governance/evidence scripts trigger adversarial tests and evidence freshness.
- Any changed source invalidates evidence derived from the previous SHA.
- Dashboard state can only move to green when new evidence is linked and verified.
