# WAVE 0: MIGRATION DISCOVERY

**Status:** Completed
**Date:** 2026-07-17

## Repository & Capability Inventory
The following legacy modules are mapped to their target capabilities:

| Legacy Source | Target Repo | Bounded Capabilities | Shared Dependencies |
|---|---|---|---|
| `consunexia/consunexia-certify` | `certify.airroofers.eu` | `identity.verification`, `identity.certify` | `shared-security`, `shared-types` |
| `consunexia/consunexia-ingestion` | `ingestion.airroofers.eu` | `telemetry.ingest`, `telemetry.buffer` | `shared-types` |
| `consunexia/consunexia-edge` | `edge.airroofers.eu` | `platform.edge_routing`, `platform.api_gateway` | `shared-security` |
| `consunexia/deployment/bootstrap` | `bootstrap.airroofers.eu` | `operations.bootstrap`, `operations.provision` | None |
| `licensing-app` | `license.airroofers.eu` | `licensing.entitlement`, `licensing.activation` | `shared-contracts` |
| `billing-app` | `billing.airroofers.eu` | `billing.subscription`, `billing.invoice` | `shared-contracts` |
| `telemetry` | `telemetry.airroofers.eu` | `telemetry.metrics`, `telemetry.tracing` | `shared-types` |

## Dependency Validation Graph
Wave 0 identified and validated the known dependency graph for the current extraction targets:
- `certify.airroofers.eu` -> explicitly depends on `shared-security`. No known couplings to `billing` or `licensing`. **(Validated)**
- `ingestion.airroofers.eu` -> explicitly depends on `shared-types`. No known couplings to `edge`. **(Validated)**
- `edge.airroofers.eu` -> explicitly depends on `shared-security`. No known couplings to `telemetry`. **(Validated)**
- `bootstrap.airroofers.eu` -> Independent. **(Validated)**

## Shared Component Inventory (For Wave 2)
The following shared libraries must be frozen and promoted during Wave 2:
- `shared-security`: Handles legacy AuthN and cryptography.
- `shared-types`: Canonical DTOs and interfaces.
- `shared-contracts`: Legacy inter-service communication definitions.
- `shared-localization`: Translation strings.
- `shared-trust-relay`: Internal proxy trust mechanisms.

## Next Steps
All 7 extraction/refactor targets have passed Dependency Validation. `migration_manifest.yaml` files have been seeded into their respective roots. Proceed to **Wave 1A (Workspace Clone / Repository Split)**.
