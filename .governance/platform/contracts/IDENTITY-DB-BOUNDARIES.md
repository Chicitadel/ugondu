# IDENTITY DATABASE BOUNDARIES

**Governance Status:** FROZEN
**Version:** 1.0.0
**Classification:** Enterprise Standard

## Schema Isolation
The Identity Platform completely owns its datastores. No other platform (e.g., Orchestration, Mandatag) is permitted to directly query the identity database.

Data required by other services must be replicated asynchronously via the Identity Event Bus.
