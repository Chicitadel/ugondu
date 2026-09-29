# EXTRACTION REGISTRY

**Governance Status:** FROZEN
**Version:** 1.3.0
**Classification:** Enterprise Standard

## The Migration-First Policy
All implementations natively default to reuse, extraction, or refactoring. No new execution stub may be created for a capability until it is verified that no equivalent legacy implementation exists in `D:\ujomor-platform` or other legacy archives.

## Migration Patterns
There are three distinct migration patterns:
- **Native Refactor**: Preserve repo, refactor, migrate (e.g., `billing-app`).
- **Embedded Extraction**: Extract bounded context from a mono-repo (e.g., `consunexia-edge`).
- **Shared Component Promotion**: Promote shared platform libraries after dependency audit.

## Migration Classification & Mapping

Note: A repository may contain multiple capabilities. True migration status is determined at the capability level. The table below represents repository-level targets.

| Source Location | Target Repository | Action | Compatibility State | Eng. Readiness | Mig. Readiness |
|---|---|---|---|---|---|
| `billing-app` | `billing.airroofers.eu` | Native Refactor | Legacy | 0/4 | 0/6 |
| `licensing-app` | `license.airroofers.eu` | Native Refactor | Legacy | 0/4 | 0/6 |
| `telemetry` | `telemetry.airroofers.eu` | Native Refactor | Legacy | 0/4 | 0/6 |
| `consunexia-edge` | `edge.airroofers.eu` | Embedded Extraction | Legacy | 0/4 | 0/6 |
| `consunexia-ingestion` | `ingestion.airroofers.eu` | Embedded Extraction | Legacy | 0/4 | 0/6 |
| `deployment/bootstrap` | `bootstrap.airroofers.eu` | Embedded Extraction | Legacy | 0/4 | 0/6 |
| `consunexia-certify` | `certify.airroofers.eu` | Embedded Extraction | Legacy | 0/4 | 0/6 |
| `consunexia-monitor` | `TBD` | **Deferred** | TBD | 0/4 | 0/6 |
| `consunexia-realtime` | `TBD` | **Deferred** | TBD | 0/4 | 0/6 |

*(**Engineering Readiness**: Build, Tests, SAST, Security)*
*(**Migration Readiness**: History Preserved, Dependencies Validated, Manifests, Routing Verified, Rollback Verified)*

## Mandatory Migration Rule
- The **legacy repository** remains the source during migration.
- The **new Air Roofers repository** becomes the destination.
- Once the migration is validated and accepted, the legacy repository becomes read-only or is archived.

## Migration Wave Sequence

### Wave 0 — Discovery (Parallel)
- Audit ALL repositories across `D:\ujomor-platform`.
- Build complete dependency graph.
- Detect duplicate implementations.
- Detect shared libraries.

### Wave 1A — Repository Split
- Preserve Git history, build, tests. No behavior changes.
- `consunexia-edge -> edge.airroofers.eu`
- `consunexia-ingestion -> ingestion.airroofers.eu`
- `deployment/bootstrap -> bootstrap.airroofers.eu`
- `consunexia-certify -> certify.airroofers.eu`

### Wave 1B — Routing
- DNS, CI, deployment, secrets, environment. No feature changes.

### Wave 1C — Refactoring
- Contracts, SDK, events, telemetry, documentation.

### Wave 2 — Shared Component Promotion
- Extract and promote shared libraries after a dependency audit.

### Wave 3 — Platform Integration
- Platform SDK alignment
- Unified Event Bus alignment
- Identity integration
- Workflow integration
- Operations integration

### Wave 4 — Validation
- Cross-platform saga verification
- Dependency audit
- Event audit
- Performance
- Security
- Merge evidence
