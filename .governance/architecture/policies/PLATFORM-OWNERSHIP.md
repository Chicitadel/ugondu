# Platform Ownership

**Governance Status:** FROZEN
**Version:** 1.0.0

This table defines the strict boundaries and responsibilities for each platform module. It prevents architectural drift and cross-platform duplication.

| Platform   | Owns                                 | Must Not Own            |
| ---------- | ------------------------------------ | ----------------------- |
| Identity   | identities, sessions, authentication | licensing, billing      |
| Products   | product catalog, lifecycle           | customer accounts       |
| License    | entitlements, activations            | billing, authentication |
| Billing    | subscriptions, invoices, payments    | licenses                |
| Operations | backups, DR, storage                 | customer workflows      |
| Portal     | customer experience                  | business logic          |
| Hub        | workspace                            | entitlement engine      |
