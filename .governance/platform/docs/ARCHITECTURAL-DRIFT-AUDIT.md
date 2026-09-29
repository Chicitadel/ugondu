# ARCHITECTURAL DRIFT AUDIT

**Governance Status:** FROZEN
**Version:** 1.0.0
**Classification:** Enterprise Standard

## Formal Review Criterion
Every major PR or feature must pass the following 6-point checklist to prevent architectural drift:

1. Does this duplicate an existing capability?
2. Does it introduce a new dependency that violates the platform topology?
3. Does it belong to the owning platform?
4. Does it expose a stable capability contract?
5. Does it preserve the read-oriented philosophy where applicable?
6. Does it require an ADR because it changes a frozen baseline?

## Event Governance
For every new event published to the Unified Event Bus, answer:
1. Is it a fact rather than a command?
2. Is there a clear owning publisher?
3. Is its version defined?
4. Is its schema backward compatible?
5. Does it duplicate an existing event?
6. Is a correlation ID present?
7. Is a causation ID present (when applicable)?

## Automated Dependency Drift Detection
The CI/CD pipeline MUST execute an automated drift audit to compare:
- Declared dependencies
- Actual imports/packages
- Runtime service calls
- Event subscriptions

If these diverge, the build MUST fail to prevent architectural erosion.
