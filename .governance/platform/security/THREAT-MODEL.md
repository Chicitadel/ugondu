# IDENTITY PLATFORM THREAT MODEL

**Governance Status:** FROZEN
**Version:** 1.0.0
**Classification:** Enterprise Standard

## Executive Summary
Because the Identity Platform serves as the absolute trust boundary for the entire Air Roofers ecosystem, its security architecture and trust assumptions must be documented before implementation begins.

## Trust Boundaries
- **External Users**: Untrusted. Must authenticate via MFA and satisfy device trust.
- **Tenant Admins**: Semi-trusted. Bounded strictly by RBAC/ABAC isolation policies. Cannot escalate across tenants.
- **Internal Services**: Trusted, but subject to Zero-Trust constraints. Must present valid Workload Identity or signed tokens for every request.
- **Operators**: Trusted, but actions are heavily audited. Mutations require explicit runbook execution and leave cryptographic evidence.

## Assumed Attack Vectors & Mitigations
1. **Token Theft / Replay**: Mitigated by short-lived session tokens, cryptographic binding (DPoP), and aggressive revocation lists.
2. **Credential Stuffing**: Mitigated by Passkeys (FIDO2), mandatory MFA, and behavioral heuristics.
3. **Cross-Tenant Data Leakage**: Mitigated by strict Tenant Isolation strategies at the database schema and policy levels.
4. **Privilege Escalation**: Mitigated by granular, centralized ABAC policies enforced before any downstream execution.
5. **Audit Tampering**: Mitigated by immutable, cryptographically signed audit logs shipped immediately to the Evidence Registry.

*This Threat Model is a foundational artifact for the Identity RC Assessment, ensuring operational security scenarios (credential rotation, federation failover) are validated.*
