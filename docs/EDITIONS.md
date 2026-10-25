<!--
/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Commercial Edition Reference (Superseded)
 * File           : EDITIONS.md
 * Version        : 2.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Last Modified  : 2026-10-02
 * Classification : PUBLIC
 *
 * Governance:
 * - Architecture Controlled
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/
-->

# Ugondu Edition Reference

> **Air Roofers Ltd | Ujomor Systems Engineering Authority | Classification: PUBLIC**

> [!IMPORTANT]
> This document is superseded by the canonical **Capability Entitlement Graph (CEG) Blueprint**:
> [`ugondu_capability_entitlement_blueprint_v1_2026-10-02.md`](../../00_engineering_guide/blueprints/ugondu/ugondu_capability_entitlement_blueprint_v1_2026-10-02.md)
>
> The CEG blueprint is the authoritative source of truth for all edition definitions, capability entitlements, upgrade/downgrade lifecycle, commercial authority boundaries, and the full capability matrix.
>
> This file is retained for historical reference only.

---

## Edition Hierarchy (Summary)

Ugondu uses the Air Roofers platform-wide canonical edition hierarchy (AR-STD-PKG-005):

```
COMMUNITY (1) → PROFESSIONAL (2) → BUSINESS (3) → ENTERPRISE (4) → SOVEREIGN (5)
```

- **OEM** and **MSP** are commercial distribution overlays on ENTERPRISE or SOVEREIGN, not ranked editions.
- Licensing and entitlement is owned exclusively by **Mandatag** (`license.airroofers.eu`).
- Billing and payment is owned exclusively by **AeroBill** (`billing.airroofers.eu`).
- Ugondu itself does not implement billing, payment, or entitlement authority.

## Commercial Authority

| Authority | Service | Owns |
| :--- | :--- | :--- |
| **Mandatag** | `license.airroofers.eu` | Entitlement issuance, token signing, feature gating |
| **AeroBill** | `billing.airroofers.eu` | Billing, invoicing, payment, taxation |
| **Ugondu Control Plane** | `ugondu.airroofers.eu` | Capability resolution, manifest delivery, execution authorization |

## Feature Enforcement

Feature enforcement is **server-side and cryptographically signed**. The thin client presents capabilities based on the server-issued `CapabilityManifest` — it does not decide what it is entitled to.

```
Mandatag → CapabilityManifest (signed) → Event Bus → Client
                                              │
                                      Capability refresh
                                              │
                                      Feature enabled/disabled
```

Upgrading does **not** require reinstalling Ugondu or downloading proprietary code.

---

*For the full capability matrix, usage limits, upgrade/downgrade lifecycle, and commercial invariants:*
*→ [`ugondu_capability_entitlement_blueprint_v1_2026-10-02.md`](../../00_engineering_guide/blueprints/ugondu/ugondu_capability_entitlement_blueprint_v1_2026-10-02.md)*

---

*Copyright © 2026 Air Roofers Ltd. All Rights Reserved.*
