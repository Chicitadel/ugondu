# Canonical Data Models

**Governance Status:** FROZEN
**Version:** 1.0.0

To prevent semantic drift across the enterprise, the following data structures are defined as the canonical models. Whenever a platform emits an event or returns a resource payload containing these entities, it MUST adhere to this structure.

## 1. Product Model
*Owner: Products Platform (`products.airroofers.eu`)*

```json
{
  "product_id": "string (UUID)",
  "name": "string",
  "slug": "string",
  "category": "string",
  "visibility": "string (INTERNAL|STAFF|PUBLIC|...)",
  "lifecycle_stage": "string (DRAFT|GA|DEPRECATED|...)",
  "editions": ["string (CORE|PRO|ENTERPRISE)"]
}
```

## 2. Organization Model
*Owner: Identity Platform (`identity.airroofers.eu`)*

```json
{
  "organization_id": "string (UUID)",
  "name": "string",
  "status": "string (ACTIVE|SUSPENDED)"
}
```

## 3. User Model
*Owner: Identity Platform (`identity.airroofers.eu`)*

```json
{
  "user_id": "string (UUID)",
  "organization_id": "string (UUID)",
  "email": "string",
  "role": "string (ADMIN|MEMBER|GUEST)",
  "mfa_enabled": "boolean"
}
```

## 4. License Model
*Owner: License Platform (`license.airroofers.eu`)*

```json
{
  "license_id": "string (UUID)",
  "organization_id": "string (UUID)",
  "product_slug": "string",
  "edition": "string",
  "status": "string (ACTIVE|EXPIRED|REVOKED)",
  "seats_allocated": "integer",
  "expires_at": "timestamp (ISO8601)"
}
```

## 5. Subscription Model
*Owner: Billing Platform (`billing.airroofers.eu`)*

```json
{
  "subscription_id": "string (UUID)",
  "organization_id": "string (UUID)",
  "plan_id": "string",
  "status": "string (TRIALING|ACTIVE|PAST_DUE|CANCELED)",
  "current_period_end": "timestamp (ISO8601)"
}
```

## 6. Invoice Model
*Owner: Billing Platform (`billing.airroofers.eu`)*

```json
{
  "invoice_id": "string (UUID)",
  "organization_id": "string (UUID)",
  "amount_due": "integer (cents)",
  "currency": "string (ISO 4217)",
  "status": "string (DRAFT|OPEN|PAID|VOID)",
  "due_date": "timestamp (ISO8601)"
}
```

## 7. Notification Model
*Owner: Notification Platform*

```json
{
  "notification_id": "string (UUID)",
  "recipient_user_id": "string (UUID)",
  "channel": "string (EMAIL|IN_APP|WEBHOOK)",
  "severity": "string (INFO|WARNING|CRITICAL)",
  "content": {
    "title": "string",
    "body": "string"
  }
}
```
