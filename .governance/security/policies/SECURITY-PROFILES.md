# Platform Security Profiles

**Governance Status:** FROZEN
**Version:** 1.0.0

These are the baseline security profiles applied across the entire Air Roofers enterprise ecosystem. 

## 1. Authentication Standard
- **Identity Provider**: All authentication MUST be deferred to `identity.airroofers.eu`. No individual platform may implement its own password hashing or user tables.
- **Token Format**: Standardized JSON Web Tokens (JWT) signed via asymmetric cryptography (e.g., RS256).
- **Token Lifetimes**:
  - Access Tokens: Max 15 minutes.
  - Refresh Tokens: Max 14 days, rolling expiration, strictly bound to IP/Device signature.

## 2. Multi-Factor Authentication (MFA) Tiers
Platform Actions dictate the MFA requirement:
- **Tier 1 (Read Only)**: Password/SSO accepted. (e.g., viewing public documentation)
- **Tier 2 (Standard Mutation)**: Password/SSO + Device Cookie accepted. (e.g., updating a profile)
- **Tier 3 (High-Risk Mutation)**: Explicit Step-Up MFA required (TOTP/WebAuthn).
  - *Examples*: Generating a new License Key, Canceling a Subscription, Deleting an Organization.

## 3. Service-to-Service Trust
Internal APIs (e.g., Portal calling Products, or License calling Products) MUST authenticate.
- **Allowed Mechanisms**:
  - Internal Service JWTs issued by Identity.
  - Mutual TLS (mTLS) within the internal cluster network.
- **Prohibited**: Relying solely on internal IP whitelisting or shared static API keys for high-value services (Billing/License).

## 4. Audit Requirements
All mutate actions (POST, PUT, DELETE) MUST emit an immutable audit log containing:
- Timestamp
- Originating IP Address
- Actor (User ID or Service Account ID)
- Action Name
- Target Resource ID
- Delta (Before/After state if applicable)

This ensures readiness for Phase 5 (Audit Platform).
