# Product Platform Service Governance

**Governance Status:** FROZEN
**Version:** 1.0.0
**Target Area:** `products.airroofers.eu`

## 1. Core Principle
The **Product Registry** is a true Platform Service and the ultimate Source of Truth for the entire Air Roofers product ecosystem. It is no longer a marketing concern, but a core architectural pillar.

## 2. Ownership Boundaries
The `products.airroofers.eu` platform strictly owns:
- **Product Registration**: Centralized registration of all platform offerings (e.g., MediaDNA, CiviScore, DirStruct).
- **Product Lifecycle**: Management of product phases (alpha, beta, GA, deprecated).
- **Product Editions**: Definitions of tiers (e.g., Core, Pro, Enterprise).
- **Visibility**: Access rules for public, internal, and beta visibility.
- **Categories**: Taxonomies and groupings.
- **Release Channels**: Mappings to release domains (e.g., `downloads.airroofers.eu`).
- **Integration Mappings**: 
  - Licensing Mappings (consuming Identity/Mandatag)
  - Billing Mappings (consuming AeroBill)
  - Documentation Mappings
- **Feature Flags**: Centralized capability toggles.
- **Product Metadata**: Descriptions, icons, and display tags.

## 3. Strict Consumption Rule
**No other system may duplicate product definitions.** 
All platforms MUST consume the Product Registry API for their respective workflows:
- **License (`license.airroofers.eu`)** automatically provisions policies based on Product Registry definitions.
- **Billing (`billing.airroofers.eu`)** automatically provisions plans based on Product Registry pricing structures.
- **Corporate Site (`airroofers.eu`)** dynamically displays products fetched from the Registry.
- **Hub (`hub.airroofers.eu`)** and **CSEP (`portal.airroofers.eu`)** display capabilities to entitled users based on Registry mappings.
- **Developer (`developer.airroofers.eu`)** publishes SDKs and documentation linked from the Registry.

## 4. Product Lifecycle
Products traverse a strict lifecycle, managed by the Product Registry:
1. `Draft`
2. `Registered`
3. `Internal`
4. `Private Beta`
5. `Public Preview`
6. `General Availability`
7. `Maintenance`
8. `Deprecated`
9. `Retired`
10. `Archived`

## 5. Product Visibility Rules
Visibility states control where products appear across the ecosystem:
- `INTERNAL`: Only visible to authorized internal services.
- `STAFF`: Visible to Air Roofers staff accounts.
- `PARTNER`: Visible to registered implementation partners.
- `PRIVATE_BETA`: Visible only to explicitly invited tenant IDs.
- `PUBLIC_PREVIEW`: Visible publicly but marked as preview/unstable.
- `PUBLIC`: Standard public availability.
- `LEGACY`: Available only to existing active subscribers.
- `DEPRECATED`: Still functional, but new subscriptions are disabled.
- `ARCHIVED`: Fully hidden and inactive.
