# Platform Event Contracts

**Governance Status:** FROZEN
**Version:** 1.0.0

To enable a decoupled Event-Driven Architecture (EDA) via the Platform Kernel's Event Bus, all platforms must adhere to the following standard event contracts. 

## Standard Envelope

All events MUST be wrapped in a standard cloud-event style envelope:
```json
{
  "event_id": "UUID",
  "event_type": "string (e.g., ProductRegistered)",
  "timestamp": "ISO8601",
  "source_platform": "string",
  "correlation_id": "UUID",
  "payload": { ... }
}
```

## 1. Product Events
**`ProductRegistered`**
- **Trigger**: When a new product is added to the Product Registry.
- **Payload**: Canonical `Product` Model.

**`ProductLifecycleChanged`**
- **Trigger**: When a product moves between stages (e.g., Internal to Public Preview).
- **Payload**: `product_id`, `previous_stage`, `new_stage`.

## 2. Organization / User Events
**`OrganizationCreated`**
- **Trigger**: A new tenant/organization is onboarded via Identity.
- **Payload**: Canonical `Organization` Model.

**`UserAuthenticated`**
- **Trigger**: Successful login/SSO.
- **Payload**: `user_id`, `organization_id`, `auth_method`, `ip_address`.

## 3. License Events
**`LicenseActivated`**
- **Trigger**: A cryptographic entitlement is claimed/bound to a machine or user.
- **Payload**: Canonical `License` Model + `activation_context` (device ID, etc.).

**`LicenseRevoked`**
- **Trigger**: An entitlement is forcibly revoked by operations or billing failure.
- **Payload**: `license_id`, `reason`.

## 4. Billing Events
**`SubscriptionRenewed`**
- **Trigger**: Successful recurring charge.
- **Payload**: Canonical `Subscription` Model.

**`InvoicePaid`**
- **Trigger**: Payment cleared against an open invoice.
- **Payload**: Canonical `Invoice` Model.

## 5. Download Events
**`DownloadPublished`**
- **Trigger**: A new installer is made available for download mapping.
- **Payload**: `product_slug`, `version`, `sha256_checksum`, `release_channel`.
