# PLATFORM DEPLOYMENT & TOPOLOGY REGISTRY

**Governance Status:** FROZEN
**Version:** 1.0.0

This registry records the canonical subdomains, document roots, and ownership for the Air Roofers platform ecosystem. Any deployment or provisioning MUST consult this registry to prevent overlap or architectural drift.

| Subdomain | Document Root | Owning Context | Business Owner | Public/Private | Replaces / Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Corporate Layer** | | | | | |
| `airroofers.eu` | `/domains/airroofers.eu/public_html` | Corporate Website | Marketing | Public | Main commercial site |
| **Experience** | | | | | |
| `hub.airroofers.eu` | `/domains/hub.airroofers.eu/public_html` | Hub | Customer Success| Private | Authenticated Workspace |
| `portal.airroofers.eu` | `/domains/portal.airroofers.eu/public_html` | CSEP | Customer Success| Public | Customer Success & Experience Platform |
| **Core Services** | | | | | |
| `identity.airroofers.eu` | `/domains/identity.airroofers.eu/public_html`| Identity | Security | Internal API | Authentication, MFA |
| `products.airroofers.eu` | `/domains/products.airroofers.eu/public_html` | Product Registry | Product | Internal API | Source of Truth for Catalog |
| `license.airroofers.eu` | `/domains/license.airroofers.eu/public_html` | Mandatag | Engineering | Internal API | Strict License Authority |
| `billing.airroofers.eu` | `/domains/billing.airroofers.eu/public_html` | AeroBill | Finance | Internal API | Strict Billing Authority |
| **Infrastructure** | | | | | |
| `operations.airroofers.eu`| `/domains/operations.airroofers.eu/public_html`| Operations | DevOps | Internal API | Platform Health, Registries, Bootstrap, Queue, Ingestion, Render |
| `telemetry.airroofers.eu` | `/domains/telemetry.airroofers.eu/public_html` | Telemetry | DevOps | Internal API | Metrics, Logs, Traces, Alerts |
| `edge.airroofers.eu` | `/domains/edge.airroofers.eu/public_html` | Edge | DevOps | Public | Enterprise API Gateway / Routing |
| **Engineering Layer** | | | | | |
| `developer.airroofers.eu`| `/domains/developer.airroofers.eu/public_html`| Developer Portal | Engineering | Public | APIs, SDKs, Docs |
| `downloads.airroofers.eu` | `/domains/downloads.airroofers.eu/public_html`| Release Manager | Product | Public | Consumes Product Registry |
| **Administration Layer** | | | | | |
| `admin.airroofers.eu` | `/domains/admin.airroofers.eu/public_html` | Administration | Internal Ops | Private | Internal back-office |
| **Static & Media** | | | | | |
| `static.airroofers.eu` | `/domains/static.airroofers.eu/public_html` | CDN/Assets | Engineering | Public | Shared static assets |

### Products
Air Roofers provides the foundational ecosystem for the following business products:
- **ConsuNexia**: Sovereign mission OS SaaS.
- **MediaDNA**: Future product capability.
- **CiviScore**: Future product capability.
- **DirStruct**: Future product capability.

**ConsuNexia Mission Services (`consunexia.com`)**
ConsuNexia operates as a sovereign mission tenant. It consumes the Air Roofers Shared Infrastructure, but its mission-specific capabilities remain strictly within the `consunexia.com` namespace to preserve architectural sovereignty.
- `api.consunexia.com`: Sovereign API platform
- `ai.consunexia.com`: Sovereign NLP/AI services
- `archive.consunexia.com`: Sovereign archive services
- `realtime.consunexia.com`: Sovereign real-time services
- `certify.consunexia.com`: Embassy verification services


## Rules of Engagement
1. **Never Overwrite**: Do not deploy over an existing domain without a verified audit of its current usage.
2. **Strict Authority**: Do not expose internal APIs (`billing`, `license`, `products`) directly to the public web unless intended. Let `CSEP` or the `commercial site` consume them.
3. **Product Configuration**: All commercial features, plans, and visibility flags are defined centrally in `products.airroofers.eu` and nowhere else.

## Strict Architecture Decision Record (ADR) Requirement
> **No new top-level subdomains may be introduced without an Architecture Decision Record (ADR).**

Before requesting or provisioning a new subdomain (e.g., `verify.airroofers.eu`, `support.airroofers.eu`), the engineering team must formally evaluate:
- Does this represent a truly distinct **Platform** with its own decoupled lifecycle?
- Or is this simply a **Module** of an existing platform?

Most future capabilities (verification, support, notifications, feature management, reporting) are likely better implemented as modules within the existing bounded contexts rather than as new subdomains. Any deviation requires a documented ADR inside `.governance/adr/`.
