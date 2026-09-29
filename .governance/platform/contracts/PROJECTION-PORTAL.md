# Projection Contract: Portal Platform

This contract defines the explicit read models (projections) maintained by the Portal Platform (`portal.airroofers.eu`). As a Customer Experience Composition Platform (CXCP), Portal does not own the business state; it consumes events to build performant read models.

## Explicit Rule: No Multi-Platform Commands
Portal is strictly prohibited from executing business commands that span multiple platforms in a single transaction. Portal delegates all mutation requests to the owning authoritative platforms via their respective APIs.

## Projections

| Source Platform | Source Event | Projection Target | Replay Policy | Rebuild Policy | Consistency Guarantees |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Products** | `ProductRegistered`, `ProductUpdated` | `ProductCatalogProjection` | Deterministic from `EventId: 0` | Full rebuild allowed without downtime | Eventual (Staleness Monitored) |
| **License** | `LicenseIssued`, `LicenseRevoked` | `CustomerLicenseProjection` | Deterministic from `EventId: 0` | Full rebuild allowed without downtime | Eventual (Staleness Monitored) |
| **Billing** | `InvoiceIssued`, `SubscriptionCreated` | `CustomerBillingProjection` | Deterministic from `EventId: 0` | Full rebuild allowed without downtime | Eventual (Staleness Monitored) |

## Projection Certification Guarantees
- **Determinism**: The projection state is mathematically deterministic based on the event history.
- **Idempotency**: Duplicate events are ignored by tracking the highest `EventId` processed per aggregate.
- **Out-of-Order Safety**: Projections buffer or discard out-of-order events based on vector clocks or sequence numbers.
