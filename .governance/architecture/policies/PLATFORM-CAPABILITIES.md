# Platform Capabilities Registry

**Governance Status:** FROZEN
**Version:** 1.0.0

This registry explicitly maps capabilities to their owning platform. It prevents duplicate implementations across teams. If a capability exists here, it MUST be consumed via API from its designated platform, not rebuilt locally.

| Capability      | Owning Platform            |
| --------------- | -------------------------- |
| Authentication  | Identity                   |
| MFA & 2FA       | Identity                   |
| Role Management | Identity                   |
| Invoices        | Billing                    |
| Subscriptions   | Billing                    |
| Payments        | Billing                    |
| Entitlements    | License (Mandatag)         |
| Product Keys    | License (Mandatag)         |
| Activations     | License (Mandatag)         |
| Downloads       | Downloads Platform         |
| Release Assets  | Downloads Platform         |
| Backups         | Operations                 |
| Telemetry       | Operations                 |
| Health Metrics  | Operations                 |
| Products        | Products Platform          |
| Features        | Products Platform          |
| Notifications   | Notification API (Hub)     |
