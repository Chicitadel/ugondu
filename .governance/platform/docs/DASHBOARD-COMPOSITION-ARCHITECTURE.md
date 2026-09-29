# DASHBOARD COMPOSITION ARCHITECTURE

**Governance Status:** FROZEN
**Version:** 1.0.0
**Classification:** Enterprise Standard

## The Composition Layer Rule
The React Dashboard is strictly a presentation layer. It must never implement business logic, recalculate governance rules, or parse raw infrastructure metrics.

To prevent architectural drift and UI monoliths, the dashboard MUST consume data entirely through a **Dashboard Composition API**.

## Architecture

`React Dashboard -> Dashboard Composition API -> Underlying Platform APIs`

The Composition API serves as a backend-for-frontend (BFF) that aggregates responses from the true sources of authority:
- **Operations Platform**: For SLA, availability, topological health.
- **Governance Kernel**: For ASI, maturity levels, compliance status.
- **Identity Platform**: For authentication state, RBAC permissions.
- **AeroBill**: For billing status.
- **Mandatag**: For licensing status.

## Component Ownership
Every widget displayed on the dashboard MUST explicitly map to a single platform capability. If a widget requires data from multiple domains, the Composition API handles the aggregation, maintaining a decentralized backend.
