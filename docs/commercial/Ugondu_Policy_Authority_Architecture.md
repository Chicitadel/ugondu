<!--
******************************************************************************
 * Project        : EAORCS — Enterprise Assurance, Orchestration & Certification System
 * Module         : Policy Authority & Architecture
 * File           : EAORCS_Policy_Authority_Architecture.md
 * Version        : 1.0.0
 * Author         : Ignatus Chika Ujomor | Founder & System Architect
 * Organization   : AIR ROOFERS (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-09-25
 * Last Modified  : 2026-09-25
 * Classification : ENTERPRISE | ARCHITECTURAL SPECIFICATION & GOVERNANCE STANDARD
 *
 * Governance:
 * - Corporate Governance Baseline — Pending Formal Legal Review
 * - Architecture Controlled
 * - Protocol Frozen
 *
 * Standards:
 * - French Civil Code (Art. 1366 — Electronic Proof)
 * - French Consumer Code (Art. L. 221-13 — Durable Medium)
 * - ISO/IEC 27001 (Integrity & Provenance)
 * - RFC 8785 (JSON Canonicalization Scheme)
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

# Air Roofers Federated Policy Authority Architecture

**Product:** EAORCS — Platform Legal, Compliance & Evidentiary Architecture  
**Canonical Host:** `https://policies.airroofers.eu`  
**Operating Entity:** AIR ROOFERS (Société par actions simplifiée à associé unique)  
**Registered Office:** 229 rue Saint-Honoré, 75001 Paris, France (RCS Paris 943 432 534)  
**Document Version:** 1.0.0  
**Status:** DRAFT — PENDING FORMAL LEGAL REVIEW (Gate 7 — Human Legal Review)

---

## 1. Executive Purpose & Architectural Principles

The Air Roofers Federated Policy Authority establishes a centralized, immutable, version-controlled architecture for authoring, publishing, retrieving, and verifying all legal, operational, security, and contractual policies governing the Air Roofers platform and EAORCS.

### 1.1 Core Constitutional Axioms
1. **Centralized Authority, Not Monolithic Runtime:** The Policy Authority (`policies.airroofers.eu`) is the single source of legal and policy truth. However, the EAORCS thin client does **not** hardcode changeable terms into client binaries.
2. **Centralized Does Not Mean Mutable:** "Centralized" refers to publication and verification authority, not arbitrary mutability. Every policy publication is cryptographically sealed, content-hashed (SHA-256), and immutably versioned. Once published as an active contractual version, a policy document is immutable.
3. **Decoupling of Legal Authorities:**
   - **Policy Authority (`policies.airroofers.eu`):** Publication, versioning, canonical hashing, and manifest distribution.
   - **Commercial & Billing Authority (`billing.airroofers.eu` / AeroBill):** Transaction recording, pricing, tax invoicing, and Legal Checkout Record (LCR) minting.
   - **Entitlement Authority (`license.airroofers.eu` / Mandatag):** Cryptographic token issuance, feature gating, and node verification.
4. **Transaction-Time Evidence Capture & Durable Medium:** A live URL alone does not satisfy statutory distance-selling rules. For every commercial transaction, AeroBill captures the exact SHA-256 hash and version of the terms in force into the Legal Checkout Record, and transmits the complete terms package to the Customer on a **durable medium** (*support durable*, French Consumer Code Art. L. 221-13).

---

## 2. Policy Classification Taxonomy

Policies across the estate are categorized into three distinct operational classes:

```
┌────────────────────────────────────────────────────────────────────────┐
│ CLASS A: Operational & Security Standards                              │
│ Live operational policies; dynamically updated with changelog notice.  │
│ Examples: Responsible Disclosure, Telemetry Rules, Cookie Settings.    │
├────────────────────────────────────────────────────────────────────────┤
│ CLASS B: Contractual & Legal Terms                                     │
│ Binding contractual instruments; immutable versions; notice required.  │
│ Examples: EULA, Terms of Service, DPA, Sovereign Addendum.             │
├────────────────────────────────────────────────────────────────────────┤
│ CLASS C: Transaction-Sealed Evidentiary Records                        │
│ Immutable evidentiary snapshots bound to individual transactions.      │
│ Examples: Legal Checkout Records, Order Form terms hashes.             │
└────────────────────────────────────────────────────────────────────────┘
```

| Class | Description | Mutability | Evidentiary Requirement |
|:---|:---|:---|:---|
| **Class A** | Technical specifications, disclosure policies, SLA schedules, operational notices | Versioned updates with published change record | Published at stable semantic URLs |
| **Class B** | Core commercial contracts (EULA, Terms of Service, DPA, Refund Policy) | Strictly immutable per version tag; 30-day notice for modifications | Tied to subscription cycles; durable-medium capture |
| **Class C** | Legal Checkout Records (LCRs), transaction receipts, consent hashes | Strictly immutable; sealed upon minting | Cryptographically archived under French Civil Code Art. 1366 |

---

## 3. Storage, Invalidation & Immutability Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       POLICIES.AIRROOFERS.EU                            │
│  ┌──────────────────────┐  ┌─────────────────┐  ┌────────────────────┐  │
│  │ Policy Manifest      │  │ Immutable Vault │  │ Content Hash Index │  │
│  │ (/manifest.json)     │  │ (/v/{version}/) │  │ (/sha256/{hash})   │  │
│  └──────────┬───────────┘  └────────┬────────┘  └─────────┬──────────┘  │
└─────────────┼───────────────────────┼─────────────────────┼─────────────┘
              │                       │                     │
       Fetch Manifest          Fetch Term Content       Verify Integrity
              ▼                       ▼                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            EAORCS CONSUMERS                             │
│  ┌────────────────────────┐              ┌───────────────────────────┐  │
│  │ Thin Client / CLI      │              │ AeroBill Checkout         │  │
│  │ Local Policy Bootstrap │              │ LCR Minting & Sealing     │  │
│  └────────────────────────┘              └───────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

3.1 **Canonical URI Scheme:**
- Root Manifest: `https://policies.airroofers.eu/manifest.json`
- Semantic Current View: `https://policies.airroofers.eu/current/{policy-id}.md`
- Immutable Versioned URI: `https://policies.airroofers.eu/v/{version}/{policy-id}.md`
- Hash-Addressable URI: `https://policies.airroofers.eu/sha256/{sha256-digest}.md`

3.2 **Content-Addressable Verification:**
Every published artifact is accompanied by a canonical SHA-256 checksum calculated over UTF-8 encoded text normalized under RFC 8785 rules. Consumers verify integrity by computing `SHA256(content) == manifest.sha256`.

---

## 4. Federated Authority Integration

### 4.1 AeroBill Checkout Integration
During every checkout interaction:
1. AeroBill queries `policies.airroofers.eu/manifest.json` to obtain current Class B policy IDs, active version numbers, and SHA-256 hashes;
2. AeroBill records these hashes inside the `contractualGovernance` payload of the Legal Checkout Record;
3. AeroBill compiles the exact text of the agreed terms into a PDF/A confirmation bundle delivered to the customer via email (durable medium).

### 4.2 Mandatag Entitlement Token Binding
Mandatag entitlement tokens embed a `policy_hash` claim representing the governance baseline under which the entitlement was granted.

### 4.3 EAORCS Thin Client Bootstrap
The thin client uses the bootstrap protocol (`EAORCS_Thin_Client_Policy_Bootstrap.md`) to verify client capability rules against the Policy Authority without embedding monolithic policy text inside the binary.

---

**AIR ROOFERS**  
229 rue Saint-Honoré, 75001 Paris, France  
RCS Paris 943 432 534 | TVA: FR89943432534  
Policy Governance Authority | `https://policies.airroofers.eu`  

---
*Classification: ENTERPRISE | ARCHITECTURAL SPECIFICATION*  
*Copyright (c) 2025-2026 AIR ROOFERS. All Rights Reserved.*
