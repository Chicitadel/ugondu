# Projection Contract: Hub Platform

This contract defines the explicit read models (projections) maintained by the Hub Platform (`hub.airroofers.eu`). As an Operational Experience Composition Platform (OXCP), Hub composes events into operational projections.

## Explicit Rule: No Orchestration
Hub is an operational workspace. It delegates all operational commands (e.g., `SuspendLicense`) to the owning authoritative platforms via their APIs. Hub is prohibited from executing business logic that spans multiple platforms in a single transaction.

## Projections

| Source Platforms | Source Events | Projection Target | Replay Policy | Rebuild Policy | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **All Platforms** | `UserCreated`, `ProductRegistered`, `LicenseIssued`, `InvoiceIssued` | `Customer360Projection` | Deterministic from `EventId: 0` | Full rebuild allowed without downtime | Staff view of a customer's entire state |
| **All Platforms** | All domain events | `UnifiedAuditTimeline` | Deterministic from `EventId: 0` | Full rebuild allowed without downtime | Chronological ledger for support and audit |
| **License, Billing** | `LicenseIssued`, `InvoiceIssued` | `OperationalKPIsProjection` | Deterministic from `EventId: 0` | Full rebuild allowed without downtime | Dashboard metrics (e.g. daily revenue, licenses issued) |

## Projection Certification Guarantees
- **Determinism**: The projection state is mathematically deterministic based on the event history.
- **Idempotency**: Duplicate events are ignored by tracking the highest `EventId` processed per aggregate.
- **Out-of-Order Safety**: Projections buffer or discard out-of-order events based on sequence numbers.
