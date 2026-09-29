# Universal Product Engineering Platform (PEP) Taxonomy

**Governance Status:** FROZEN
**Version:** 2.0.0

This document establishes the Air Roofers Universal Product Engineering Platform (PEP). 

## 1. Separation of Concerns

### Immutable Platform Kernel
These assets change rarely and only through formal Architectural Decision Records (ADRs):
*   Capability Catalog (v1.0.0)
*   Capability Registry (v1.0.0)
*   Product Manifest Schema (v1.0.0)
*   Adapter Contracts (v1.0.0)
*   Schema Registry (v1.0.0)
*   Policy Registry (v1.0.0)
*   Version Registry (v1.0.0)
*   Governance Policies (v1.0.0)
*   Execution Planning Standard (v2.0.0)
*   Capability Lifecycle (v1.0.0)
*   Capability Maturity Model (v1.0.0)
*   Evidence Schema (v1.0.0)

### Extensible Capability Layer
These assets evolve continuously without triggering formal governance reviews:
*   SDKs, CMS adapters, Runtime adapters, Deployment adapters, AI providers, Product implementations, Tooling, Marketplace packages, Connectors, Extensions.

---

## 2. Program 0: The Platform Kernel
The Platform Kernel sits above all other capability programs. It is NOT defined primarily as a network service. It is a **canonical domain model** with multiple access surfaces (Internal API, SDK, CLI, Local Library, Admin UI).

**Kernel Domains:**
1.  **Registry Core:** Capability, Version, Manifest, Contract, Provider, Schema Registries.
2.  **Resolution Engine:** Dependency graphs, capability/provider selection, manifest composition.
3.  **Policy Engine:** Governance, compatibility, certification, lifecycle, deprecation rules.
4.  **Version Engine:** Semantic versioning, migrations, upgrade paths.
5.  **Manifest Engine:** YAML/JSON parsing, inheritance, defaults, environment overlays.
6.  **Registry Storage:** Filesystem, MySQL, PostgreSQL.
7.  **Access Surfaces:** Kernel APIs (REST endpoints), CLI, SDKs.

---

## 3. Dependency-Aware Parallel Execution (Rolling PIs)
Execution does not occur sequentially. The platform evolves through **Rolling Program Increments (PIs)** using a dependency-aware parallel model:

```text
                     Program 0
                 (Kernel Contracts)
                       │
        ───────────────┼────────────────
        │              │               │
        ▼              ▼               ▼
   Program A      Program B      Program E
 (Foundation)   (Developer)   (Deployment)
        │              │               │
        ├──────────┬───┴───────┬───────┤
        ▼          ▼           ▼       ▼
   Program C   Program D   Program G   ...
      CMS          AI      Ecosystem

        └──────────────┬──────────────┘
                       ▼
                 Program F
             Product Solutions
```

Every program advances in every Program Increment. Synchronization is managed strictly through **Merge Trains** (e.g., PI-01 Merge Train 1).

---

## 4. Comprehensive Product Manifests
Every future product must declare itself through a technology-neutral manifest rather than hardcoded assumptions. Products declare both capability requirements and governance compatibility.

```yaml
extends:
  airroofers/base-web-product

product:
  id: "mediadna"
  type: "cms_extension"
  maturity: "active"

governance:
  capability_catalog: "1.x"
  manifest_schema: "1.x"

capabilities:
  media:
    enabled: true
  cms:
    provider: wordpress
```

---

## 5. Capability Dependency Declarations & Profiles
Capabilities declare dependencies on other capabilities. Reusable profiles (e.g., `CMS Product` → `Identity, Licensing, Billing, Storage, Telemetry, Localization`) allow products to inherit standard capability sets without declaring them individually.

```yaml
capability:
  id: cms
requires:
  - identity
  - licensing
  - telemetry
optional:
  - ai
  - analytics
```

---

## 6. Adapter Architecture & Provider Certification
For every capability, there is a strict separation: `Capability` → `Contract` → `Reference Implementation` → `Provider Adapters`.

**Provider Lifecycle & Certification:**
Providers transition through: `Experimental` → `Certified` → `Preferred` → `Maintenance` → `Deprecated` → `Retired`.

| Provider | Capability | Status |
| :--- | :--- | :--- |
| WordPress | CMS | Preferred |
| Drupal | CMS | Certified |
| Strapi | CMS | Experimental |

**Deterministic Resolution Engine Rules:**
When resolving providers, the Kernel uses strict precedence:
1. Product override.
2. Deployment profile.
3. Preferred certified provider.
4. Certified provider.
5. Experimental provider (only if explicitly allowed).

---

## 7. Capability Lifecycle & Scorecards
Every capability transitions through lifecycle policies: `Introduction` → `Active` → `Maintenance` → `Deprecated` → `Retired`.

Every capability publishes its objective, measurable readiness via the Scorecard:
| Dimension | Target |
| :--- | :--- |
| Unit coverage | ≥90% |
| Integration tests | 100% pass |
| Replay | 100% deterministic |
| Security | No critical findings |
| Performance | Meets budget |
| Documentation | Complete |
| Accessibility | Applicable criteria satisfied |
