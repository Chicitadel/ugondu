# IDENTITY SDK INTERFACES

**Governance Status:** FROZEN
**Version:** 1.0.0
**Classification:** Enterprise Standard

## The SDK Rule
No product in the Air Roofers ecosystem (MediaDNA, CiviScore, Hub) may invoke Identity APIs directly using HTTP clients.

All interactions MUST pass through the official **Identity SDK**, which handles:
- Token caching
- Refresh logic
- Cryptographic binding
- Retry strategies

`Product -> Identity SDK -> Identity Platform API`
