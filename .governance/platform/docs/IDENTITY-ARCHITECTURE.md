# IDENTITY PLATFORM ARCHITECTURE

**Governance Status:** FROZEN
**Version:** 1.0.0
**Classification:** Enterprise Standard

## Mission Statement
> **The Identity Platform is the trust boundary of the Air Roofers ecosystem. It authenticates identities, authorizes access, establishes trust between services and tenants, and produces verifiable audit evidence.**

No other platform in the ecosystem may embed custom identity logic. All domains must consume the Identity Platform.

## The Eight Identity Domains
1. **Identity**: Users, Organizations, Service Accounts, Devices.
2. **Authentication**: Password, Passkeys, MFA, OAuth/OIDC, Federation.
3. **Authorization**: RBAC, ABAC, Policies, Permissions.
4. **Tenant Management**: Tenants, Membership, Isolation, Delegation.
5. **Service Identity**: Service Accounts, API Keys, Client Credentials, Workload Identity.
6. **Session Management**: Tokens, Refresh, Revocation, Device Sessions.
7. **Audit**: Authentication Events, Authorization Events, Administrative Events, Evidence.
8. **Trust**: Certificates, Keys, Signing, Verification.

## Dependency Graph
The dependency graph remains strictly acyclic:
`Products -> Operations Platform -> Identity Platform -> Orchestration Platform -> Infrastructure`
