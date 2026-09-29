# Air Roofers Platform Integration Guide (v1.0)

This guide documents the **frozen reference architecture** for integrating business platforms into the `operations.airroofers.eu` infrastructure. 

Identity serves as the certified Level 3 Reference Implementation. **All other platforms (Products, License, Billing, Portal, Hub) MUST follow this sequence verbatim.**

---

## 1. Core Dependency
Every platform MUST require `airroofers/platform-core` via composer and exclusively use its canonical DTOs (`OrganizationDTO`, `UserDTO`, etc.), the `CloudEventEnvelope`, and `PlatformError` definitions. Local definitions of these entities are forbidden.

## 2. Service Registration
On startup or deploy, the platform MUST instantiate `PlatformRegistration` and post it to the `ServiceRegistry`.
* It must report its API versions, Event versions, Contract version, Capabilities, and Maturity Level.

## 3. Health Reporting
Platforms MUST implement structured health reporting pushed to the `HealthRegistry`. Simple `/health` ping-pong endpoints are no longer sufficient. Reporting must include liveness, database status, certificate expiry, and dependency health.

## 4. The Outbox Mandate
Platforms MUST NEVER publish events directly to an external bus, API, or message queue during a business transaction.
Instead, they must wrap the business state mutation and an `OutboxRecord` insertion in a single, atomic database transaction.

## 5. Pre-Outbox Validation
Before an event can be queued in the outbox, the platform MUST validate its payload against the `SchemaRegistry`. Invalid schemas must abort the entire database transaction.

## 6. Observability
Platforms MUST intercept inbound requests to extract or generate an `X-Correlation-ID`. This ID must be injected into all structured logs and outbound CloudEvents, and registered with the `CorrelationTracker`.
