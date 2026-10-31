# Air Roofers dual-product COR master handover — 2026-10-31

**Purpose:** Single shared Antigravity execution contract for Ugondu and Dumcholu remediation. This note supplements, and does not supersede, each repository's constitution, ADRs, security policy, release gate definitions, or existing COR master checklist.

## 1. Non-negotiable architecture

- Preserve **one code — host anywhere**. Runtime configuration, secrets, durable state, health checks, graceful shutdown and deployment topology must be externalized.
- DirectAdmin remains the current low-cost launch host only for workloads supported by the hosting plan. Persistent Spring Boot/Node services must not be represented as safely hosted on static/shared PHP hosting where the required runtime is unavailable.
- VPS is an intermediate option when funded and available. No VPS is currently available.
- AWS is a future staging/production target after traction, meaningful official engagement or funding. **Do not provision chargeable AWS resources without explicit authorization.**
- For a minimal AWS pilot, prefer a small EC2-backed ECS capacity baseline (the repository's validated t3.medium assumption) over always-on Fargate where cost economics justify it. Keep task definitions and application images compatible with ECS/Fargate so the later move is deployment configuration/capacity migration, not business-logic refactoring. Validate actual AWS pricing, availability, RDS/storage/network costs and operating requirements before purchase.
- Preferred AWS region: `eu-west-3` (Paris).
- AeroBill is the sole authority for billing, pricing, metering and usage accounting. Mandatag is the sole authority for license and entitlement decisions. Neither product may fork or shadow these business rules.

## 2. Evidence ledger — verified boundaries and limitations

### Ugondu

**PR #63 — shared passport implementation candidate**
- Branch: `fix/cor-shared-passport-revocation-2026-10-31`
- Candidate code commit reported: `4969ee1e`; handover commit: `7bdd54d0`.
- Workflow receipt: COR Certification run [#41148356045](https://github.com/Chicitadel/ugondu/actions/runs/41148356045) completed successfully. The job shows build, locale/I18N, architecture/import scans, typecheck, workspace tests, COR regression suite, stream registry, fresh COR qualification and independent finalization succeeded.
- Explicitly skipped: AWS Physical Qualification, evidence-freshness, signing trust-root verification and final COR authority signature.
- Scope qualification: passport state is persisted through a portable filesystem store and admission reads that store. A JSON file on local disk is not automatically shared between hosts.

**PR #64 — follow-up multi-writer correctness remediation**
- Branch: `fix/cor-passport-multiprocess-write-lock-2026-10-31`
- Head commit: `e53a1f2be81292ff7a69e67398adf29033efbc2b`
- Adds cross-process writer serialization, reload-after-lock semantics, fail-closed bounded lock acquisition, and Jest regressions for independent instances, revocation visibility, unknown revocation targets and lock contention.
- Regression tests are authored but **not yet executed**. Exact-head CI/COR must pass before closure.
- **Important topology boundary:** A shared filesystem lock only coordinates processes that truly share the same filesystem. Separate EC2/ECS local disks do not satisfy this. Multi-host production still requires a qualified shared durable volume or database adapter and independent-host tests.

### Dumcholu

**PR #29 — optimistic locking candidate**
- Branch: `fix/cor-career-optimistic-locking-2026-10-31`
- Candidate commit: `ffafd37b98ec34b6bdf6721516f4e6676cb3df1a`.
- Reported exact-head receipts: Portable Runtime Qualification [#41144190967](https://github.com/Chicitadel/dumcholu/actions/runs/41144190967), Deployment Manifest [#41144190301](https://github.com/Chicitadel/dumcholu/actions/runs/41144190301), and Product Name Governance [#41144190405](https://github.com/Chicitadel/dumcholu/actions/runs/41144190405). Retrieved job details show all listed steps succeeded.
- JPA `@Version` is separate from the domain `case_version`; Flyway V3 adds `orm_version`. Preserve that distinction.

**PR #23 — task-definition secret binding integrity**
- Branch: `security/cor-task-secret-binding-integrity-2026-10-30`
- Head: `ebadc36b6b015d3daf0f323f4d04de9ee3d13aa1`.
- Adds exact ARN-to-environment-variable binding validation, duplicate/missing/unknown binding rejection and plaintext DB credential rejection.
- Deployment Manifest Qualification [#41063882569](https://github.com/Chicitadel/dumcholu/actions/runs/41063882569) and Product Name Governance [#41063882437](https://github.com/Chicitadel/dumcholu/actions/runs/41063882437) completed successfully. These are specific to that exact candidate, not every later branch head.

## 3. Required agent workflow

1. Read this file, the product-local guardrail, the latest COR checklist, relevant ADRs and the open PR's complete discussion before editing.
2. Re-fetch the current branch head. Never assume a previously cited SHA is still current.
3. Reproduce each finding in source and tests. Distinguish a code defect from a CI runner/admission failure, skipped gate, missing evidence, or external operational dependency.
4. Implement confirmed code defects directly on a dedicated finding-specific branch. Add positive, negative, concurrency, tenant-isolation and outage regressions as appropriate.
5. Execute focused tests, full relevant package tests, static analysis, build, security scans and deployment-contract tests locally where possible; then require remote workflows on the exact final SHA.
6. Update this ledger only with verifiable receipts, including SHA, run ID, job/step outcome and explicit skipped steps. A docs-only descendant does not inherit source qualification unless policy explicitly proves source identity and evidence freshness.
7. Do not weaken tests, suppress errors, introduce fake success, widen exceptions, add duplicate domain adapters, or replace a superior architecture with a simpler but weaker one.
8. Preserve audit history. Do not rewrite master/main or protected release branches. Do not merge draft PRs or certify a release from partial evidence.

## 4. Commercial release gates still requiring independent closure

- Ugondu shared passport storage must be qualified on the actual intended topology; filesystem coordination on one shared volume is not proof of independent-host durability.
- Live Mandatag entitlement and AeroBill billing/metering transactions must be verified in authorized staging with tenant and failure-path coverage.
- Dumcholu live backend/API integration, tenant/identity isolation, durable application/case data, and any remaining UI/API capability gaps must be checked against current source and real staging—not inferred from historic reports.
- Physical AWS staging/deployment and rollback evidence remain unperformed until explicitly funded and authorized.
- Nigeria policy calibration, external source provenance/rights, privacy and jurisdiction review, FIDO2/WebAuthn ceremony, SBOM/signed artifact provenance, independent security review, trust-root verification, evidence freshness and final human authority signature remain separate gates wherever applicable.
- No overall 100% COR or public-commercial-release certification is asserted by this handover.

## 5. Current posture

- Ugondu PR #63: prior candidate COR automation succeeded with explicit external/physical gates skipped.
- Ugondu PR #64: new multi-writer remediation committed; tests authored; exact-head qualification pending.
- Dumcholu PR #29: reported runtime, deployment manifest and naming gates succeeded on its candidate SHA.
- Dumcholu PR #23: secret-binding deployment manifest and naming gates succeeded on its candidate SHA.
- AWS resources: none provisioned by this work.
- Protected master/main branches: not modified.

**Combined posture: PROGRESSING / PARTIAL / NOT YET CERTIFIED FOR PUBLIC COMMERCIAL RELEASE.**
