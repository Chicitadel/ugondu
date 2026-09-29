# Platform API Contracts

**Governance Status:** FROZEN
**Version:** 1.0.0

## 1. Core Principle
Internal implementations of platform services may evolve rapidly, but their cross-platform communication interfaces MUST remain stable. This policy defines the frozen contracts for core platform APIs.

## 2. API Versioning & Evolution
All internal APIs MUST use **Semantic Versioning** in their endpoints (e.g., `/api/v1/...`). 

We freeze **platform contracts, not payloads**. Implementations may evolve additively within a major version.

**Allowed Additive Changes (e.g., v1.0 -> v1.1):**
- ✓ New optional fields allowed
- ✓ New endpoints allowed
- ✓ New query parameters allowed

**Breaking Changes (Require new major version, e.g., v2.0):**
- ✗ Removing fields prohibited
- ✗ Changing semantics prohibited
- ✗ Renaming fields prohibited
- ✗ Changing identifiers prohibited

## 3. Contract Index

### 3.1 Identity API (`identity.airroofers.eu`)
- **Version**: `v1.0`
- **Responsibilities**: Session verification, user lookup, MFA status, basic role authorization.
- **Example Endpoint**: `GET /api/v1/verify`
- **Output Contract**: Must return a stable user context object (`user_id`, `organisation_id`, `role`, `status`).

### 3.2 Product Registry API (`products.airroofers.eu`)
- **Version**: `v1.0`
- **Responsibilities**: Product catalog, visibility states, edition definitions, and mappings.
- **Example Endpoint**: `GET /api/v1/products`
- **Output Contract**: Must return `id`, `name`, `slug`, `visibility`, `category`, and any associated `integrations`.

### 3.3 License API (`license.airroofers.eu` / Mandatag)
- **Version**: `v1.0`
- **Responsibilities**: License generation, validation, policy enforcement, offline activation payloads.
- **Example Endpoint**: `POST /api/v1/entitlements/verify`
- **Output Contract**: Must return a strict boolean status or a signed cryptographic token.

### 3.4 Billing API (`billing.airroofers.eu` / AeroBill)
- **Version**: `v1.0`
- **Responsibilities**: Subscription states, invoice generation, payment processing integration.
- **Example Endpoint**: `GET /api/v1/subscriptions/{org_id}`
- **Output Contract**: Must return a standard ledger-compatible subscription object.

### 3.5 Operations API (`operations.airroofers.eu`)
- **Version**: `v1.0`
- **Responsibilities**: Health checks, telemetry data, uptime metrics, incident alerts.
- **Example Endpoint**: `GET /api/v1/health`
- **Output Contract**: Standardized component status map (`Identity Service: Operational`).

### 3.6 Download API (`downloads.airroofers.eu`)
- **Version**: `v1.0`
- **Responsibilities**: Providing secure, signed access to product installers, governed by Identity/License constraints.
- **Example Endpoint**: `GET /api/v1/releases/{product_slug}`
- **Output Contract**: URLs mapped to internal CDNs alongside SHA-256 checksums.

### 3.7 Notification API
- **Version**: `v1.0`
- **Responsibilities**: Centralized dispatching of emails, webhooks, and UI alerts.
- **Example Endpoint**: `POST /api/v1/notify`
- **Output Contract**: Async acknowledgment standard payload.
