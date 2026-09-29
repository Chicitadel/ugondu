# IDENTITY PERMISSION MODEL

**Governance Status:** FROZEN
**Version:** 1.0.0
**Classification:** Enterprise Standard

## Core Capabilities
- **RBAC (Role-Based Access Control)**: Base permissions defined by roles (e.g., `TenantAdmin`, `Viewer`).
- **ABAC (Attribute-Based Access Control)**: Granular permissions based on resource tags, user attributes, or context (e.g., time of day).
- **Relationship-based**: Access granted through structural relationships (e.g., `Owner` of `Project A`).

## Policy Engine
A centralized policy compiler and evaluator caches decisions at the edge for performance, preventing synchronous database lookups for every request.
