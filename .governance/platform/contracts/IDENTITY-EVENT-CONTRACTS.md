# IDENTITY EVENT CONTRACTS

**Governance Status:** FROZEN
**Version:** 1.0.0
**Classification:** Enterprise Standard

## The Identity Event Bus
To prevent synchronous coupling, the Identity Platform emits events. Downstream services (Billing, Operations, MediaDNA) MUST subscribe to these events rather than querying Identity APIs synchronously.

## Event Schema (Domain Event Catalog)
All events are published as JSON with a standard envelope:

### `UserCreated`
Emitted when a new identity is provisioned.

### `PasswordChanged`
Emitted upon credential rotation.

### `SessionStarted` / `SessionExpired`
Emitted for active session monitoring.

### `RoleGranted` / `RoleRevoked`
Emitted when ABAC/RBAC permissions change.

### `TrustElevated`
Emitted when a user successfully passes step-up authentication (MFA).

### `TenantCreated` / `TenantDeleted`
Emitted for tenant lifecycle changes. Used by AeroBill for billing hooks.
