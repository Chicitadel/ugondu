# CAPABILITY DESCRIPTOR SCHEMA

**Governance Status:** FROZEN
**Version:** 1.0.0
**Classification:** Enterprise Standard

## The Canonical Descriptor
To avoid metadata duplication across the Platform Catalog, Capability Registry, Dependency Registry, and Operations Platform, every capability MUST define a single canonical descriptor.

```yaml
schema_version: "1.0"
capability_id: "com.airroofers.billing.invoicing"
owner: "Team Revenue"
version: "1.2.0"
lifecycle_stage: "Ready for PV"

dependencies:
  declared:
    - "com.airroofers.identity.authentication"
  consumed:
    - "com.airroofers.identity.authentication"
  direction: "downward"

events:
  published:
    - "InvoiceIssued"
  consumed:
    - "TenantProvisioned"

public_apis:
  - "/billing/v1/invoices"

sdk_modules:
  - "BillingClient"

adr_references:
  - "ADR-042-Invoicing-Engine"
```

## Referencing
All governance tools (Governance Kernel, Catalogs, Registries) MUST parse this canonical file rather than defining their own metadata representations.
