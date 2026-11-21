<!--
******************************************************************************
 * Project        : EAORCS — Enterprise Assurance, Orchestration & Certification System
 * Module         : Policy Authority & Architecture
 * File           : EAORCS_Policy_Change_Control.md
 * Version        : 1.0.0
 * Author         : Ignatus Chika Ujomor | Founder & System Architect
 * Organization   : AIR ROOFERS (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-09-25
 * Last Modified  : 2026-09-25
 * Classification : ENTERPRISE | OPERATIONAL GOVERNANCE & CHANGE CONTROL STANDARD
 *
 * Governance:
 * - Corporate Governance Baseline — Pending Formal Legal Review
 * - Architecture Controlled
 * - Protocol Frozen
 *
 * Standards:
 * - ISO 27001 (Change Management & Document Control)
 * - French Consumer Code (Art. L. 211-1, L. 221-5 — Unilateral Modification Rules)
 * - French Civil Code (Art. 1103, 1171 — Contract Law & Unfair Terms)
 *
 * Signatures:
 * - Architecture Authority: Ignatus Chika Ujomor
 * - Corporate Authority: AIR ROOFERS SASU
 * - Governance Authority: Air Roofers Corporate Governance
 * - Legal Authority: PENDING FORMAL REVIEW (Gate 7 — Human Legal Review)
 *
 * Copyright (c) 2025-2026 AIR ROOFERS. All Rights Reserved.
 * Moral rights reserved by Ignatus Chika Ujomor under French CPI Art. L. 121-1.
******************************************************************************
-->

# Policy Change Control & Lifecycle Governance Procedure

**Product:** EAORCS — Platform Policy Authority  
**Policy Authority:** `https://policies.airroofers.eu`  
**Publisher:** AIR ROOFERS (Société par actions simplifiée à associé unique)  
**Registered Office:** 229 rue Saint-Honoré, 75001 Paris, France (RCS Paris 943 432 534)  
**Document Version:** 1.0.0  
**Status:** DRAFT — PENDING FORMAL LEGAL REVIEW (Gate 7 — Human Legal Review)

---

## 1. Executive Purpose and Scope

This Procedure establishes the mandatory governance, review, approval, notification, and archival workflow required to propose, amend, schedule, publish, and supersede policy documents across the Air Roofers federated estate (`policies.airroofers.eu`).

---

## 2. Policy Lifecycle State Machine

Every policy document is governed by the following state machine:

```
┌─────────┐       ┌──────────────┐       ┌────────────────────┐       ┌───────────┐
│  DRAFT  │ ────► │ LEGAL_REVIEW │ ────► │ CORPORATE_APPROVAL │ ────► │ SCHEDULED │
└─────────┘       └──────────────┘       └────────────────────┘       └─────┬─────┘
                                                                            │ Notice Window
                                                                            │ (e.g. 30 days)
                                                                            ▼
┌──────────────────┐       ┌────────────┐                         ┌───────────┐
│ ARCHIVED/RETAINED│ ◄──── │ SUPERSEDED │ ◄───────────────────────┤  ACTIVE   │
└──────────────────┘       └────────────┘    New Version Active   └───────────┘
```

| Lifecycle State | Description | Gate / Authority |
|:---|:---|:---|
| **`DRAFT`** | Initial revision or amendment created by engineering or commercial operations. | Working Draft |
| **`LEGAL_REVIEW`** | Formal compliance and enforceability review by qualified French legal counsel (*avocat*). | Legal Directorate / Gate 7 |
| **`CORPORATE_APPROVAL`** | Formal signature and approval by the Président / Corporate Authority of AIR ROOFERS. | Corporate Authority |
| **`SCHEDULED`** | Staged in Policy Authority with an announced future effective date; customer notice window open. | Policy Authority |
| **`ACTIVE`** | Live, governing contractual or operational version referenced in current manifests and checkouts. | Production Active |
| **`SUPERSEDED`** | Replaced by a newer active version; no longer offered for new transactions; retained for active subscriptions. | Historical Ledger |
| **`ARCHIVED/RETAINED`** | Preserved immutably in secure cold storage for statutory prescription periods (e.g., 5 or 10 years). | Evidentiary Vault |

---

## 3. Modification Rules by Customer Classification

### 3.1 Professional & Enterprise Customers (B2B)
1. **Notice Period:** Minimum **thirty (30) calendar days' advance notice** delivered via registered corporate email and platform notification banner.
2. **Acceptance:** Continued execution of workloads or subscription renewal following the effective date constitutes contractual acceptance.
3. **Objection:** An Enterprise customer may object in writing during the notice period. If the parties cannot resolve the disagreement, the Customer may terminate the affected service prior to the effective date without penalty.

### 3.2 Consumer Customers (B2C)
Under French consumer protection law and unfair terms jurisprudence (Articles L. 211-1 et seq. Code de la consommation):
1. **Durable Medium Notice:** Notice of any proposed change must be provided individually to each consumer on a **durable medium** (*support durable*, e.g., personal email with attached PDF) at least **thirty (30) calendar days** before entry into force.
2. **Right of Free Termination:** The notice must explicitly inform the consumer of their statutory right to **refuse the proposed modification and terminate the subscription without penalty or fees** prior to the effective date.
3. **No Tacit Consent for Substantial Terms:** Continued use or silence shall **never** be construed as tacit acceptance of substantial modifications affecting price, core features, or statutory remedies.

---

## 4. Change Classification & Materiality Assessment

| Change Category | Criteria | Required Approvals | Notice Window |
|:---|:---|:---|:---|
| **Non-Material (Administrative)** | Correcting typographical errors, updating contact emails, updating corporate office address without legal entity change. | Corporate Governance Officer | Immediate publication with changelog entry |
| **Operational (Class A)** | Clarifying disclosure guidelines, updating SLA reporting endpoints, modifying supported OSS catalogue. | Security / Operations Authority + Corporate Authority | 14 calendar days |
| **Material Contractual (Class B)** | Modifying warranty terms, liability caps, termination clauses, dispute jurisdiction, or subprocessor lists. | Legal Counsel Review (Gate 7) + Président Approval | 30 calendar days |
| **Price / Core Feature Change** | Subscription rate card updates, tier entitlement reductions. | Commercial Authority + Legal + Executive | 30 calendar days (B2B) / Full consumer refusal rights |

---

## 5. Evidentiary Archival Protocol

1. Once a policy transitions to `SUPERSEDED`, its exact text, SHA-256 digest, and active date range are locked in the `EAORCS_Policy_Version_Registry.md`.
2. Historical versions remain accessible at `https://policies.airroofers.eu/archive/{policy-id}/v{version}.md`.
3. Pursuant to Article 1366 of the French *Code civil*, archived policy versions are maintained with cryptographic timestamps to prove what terms governed any given historical transaction.

---

**AIR ROOFERS**  
229 rue Saint-Honoré, 75001 Paris, France  
RCS Paris 943 432 534 | TVA: FR89943432534  
Policy Governance Directorate  

---
*Classification: ENTERPRISE | OPERATIONAL GOVERNANCE STANDARD*  
*Copyright (c) 2025-2026 AIR ROOFERS. All Rights Reserved.*
