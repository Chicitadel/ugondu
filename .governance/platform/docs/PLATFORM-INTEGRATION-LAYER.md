# PLATFORM INTEGRATION LAYER

**Governance Status:** FROZEN
**Version:** 1.0.0
**Classification:** Enterprise Standard

## Mission
The Platform Integration Layer is the "Brain" of the ecosystem. It owns the cross-platform workflows and composition APIs that feed the Products layer (Dashboard, Portal, Developer APIs).

## Responsibilities
- API composition (Backend-for-Frontend)
- Capability routing (via dynamic discovery)
- Request aggregation
- Protocol translation
- Response shaping

## Capability Discovery Rule
The Integration Layer MUST NOT hardcode downstream service endpoints. It must dynamically query the **Platform Catalog / Capability Registry** (e.g., "Who provides Trust Verification?") before routing requests. This ensures underlying platforms remain replaceable.

## Absolute Prohibitions
The Integration Layer MUST NOT:
- Implement business rules.
- Execute workflow orchestration.
- Make licensing decisions.
- Enforce identity policies.

**Rule:** If a capability can execute independently, it belongs in its owning platform—not in the Integration Layer.
