# REPOSITORY OWNERSHIP REGISTRY

**Version:** 1.0.0
**Classification:** Enterprise Standard

## Purpose
This registry is the absolute, machine-readable authoritative source for repository ownership, lifecycle state, canonical location, and retirement progression across the Air Roofers ecosystem.

## Canonicality Rules
Every repository MUST hold exactly one canonical state at any given time to prevent split-brain maintenance:
- **Legacy Canonical**: The original implementation (`consunexia` or legacy apps) is the source of truth.
- **Transition Canonical**: Both environments coexist under active migration (Shadow Validation phase).
- **Air Roofers Canonical**: The modernized platform is the sole source of truth.

## Ownership & Lifecycle Matrix

| Target Repository | Owner | Source Origin | Migration Type | Canonical State | Retire Legacy After |
|---|---|---|---|---|---|
| `certify.airroofers.eu` | Platform Licensing | `consunexia/consunexia-certify` | Extraction | Legacy Canonical | Wave 4 (Validation) |
| `ingestion.airroofers.eu` | Telemetry Platform | `consunexia/consunexia-ingestion` | Extraction | Legacy Canonical | Wave 4 (Validation) |
| `bootstrap.airroofers.eu` | Operations | `consunexia/deployment/bootstrap` | Extraction | Legacy Canonical | Wave 4 (Validation) |
| `edge.airroofers.eu` | Platform Network | `consunexia/consunexia-edge` | Extraction | Legacy Canonical | Wave 4 (Validation) |
| `billing.airroofers.eu` | Billing Platform | `billing-app` | Native Refactor | Legacy Canonical | Wave 4 (Validation) |
| `license.airroofers.eu` | Licensing Platform | `licensing-app` | Native Refactor | Legacy Canonical | Wave 4 (Validation) |
| `telemetry.airroofers.eu` | Telemetry Platform | `telemetry` | Native Refactor | Legacy Canonical | Wave 4 (Validation) |
