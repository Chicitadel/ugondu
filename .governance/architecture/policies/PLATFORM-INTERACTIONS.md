> **[SUPERSEDED — HISTORICAL REFERENCE ONLY]**
> This document described a prior architecture that included local Billing and License domains
> within EAORCS. As of Wave 51-54 domain-zero purification (COR-361 to COR-400), EAORCS operates
> under strict domain-zero policy: all commercial, licensing, billing, and AI/inference runtime has
> been removed from EAORCS. All such capabilities are opaque federation delegations to external
> canonical authorities. This document is retained for historical traceability only and does **NOT**
> represent current EAORCS architecture or policy.
>
> **Authority:** Systems Engineering & Security Governance Authority — Ujomor Systems
> **Superseded Date:** 2026-08-11
> **Superseded By:** Domain-Zero Governance Policy (COR-361 to COR-400)

# Platform Interaction Matrix

**Governance Status:** SUPERSEDED
**Version:** 1.0.0

This document defines the allowed directional dependencies between platform subdomains to ensure bounded contexts are preserved and circular dependencies are avoided.

## Interaction Flow
Example sequential orchestration by the Portal:
`Portal -> Identity -> Products -> License -> Billing -> Downloads`

## Dependency Matrix

**Allowed Interactions**
- Portal -> License
- Portal -> Billing
- Portal -> Products
- Hub -> Products
- Hub -> License
- Downloads -> Products
- Downloads -> License
- Billing -> Identity (for authentication validation)
- License -> Identity (for user-to-license mapping)
- Billing -> Products (to read pricing plans)
- License -> Products (to read edition constraints)

**Forbidden Interactions**
- Billing -> Portal
- License -> Portal
- Identity -> Billing
- Identity -> License
- Identity -> Portal
- Products -> Any (Products is the base platform service; it does not consume other services)

*All interactions MUST occur over versioned Platform APIs, not direct database links.*
