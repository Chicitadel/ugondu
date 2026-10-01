/******************************************************************************
 * Project        : EAORCS — Enterprise Assurance, Orchestration & Certification System
 * Module         : Commercial Documentation
 * File           : EULA_draft.md
 * Version        : 0.3.0-draft
 * Author         : Ignatus Chika Ujomor | Founder & System Architect
 * Organization   : AIR ROOFERS (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-09-23
 * Last Modified  : 2026-09-25
 * Classification : COMMERCIAL_AUTHORITY | DRAFT — PENDING LEGAL REVIEW
 *
 * Governance:
 * - Corporate Governance Baseline — Pending Formal Legal Review
 * - Architecture Controlled
 * - Protocol Frozen
 *
 * Standards:
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS
 * - GDPR (Regulation (EU) 2016/679)
 * - French Intellectual Property Code (Code de la propriété intellectuelle)
 * - French Consumer Code (Code de la consommation)
 *
 * Signatures:
 * - Architecture Authority: Ignatus Chika Ujomor
 * - Corporate Authority: AIR ROOFERS SASU
 * - Governance Authority: Air Roofers Corporate Governance
 * - Legal Authority: PENDING FORMAL REVIEW (Gate 7 — Human Legal Review)
 *
 * Copyright (c) 2025-2026 AIR ROOFERS. All Rights Reserved.
 * Moral rights reserved by Ignatus Chika Ujomor under French CPI Art. L. 121-1.
 ******************************************************************************/

---

> [!CAUTION]
> **LEGAL DRAFT BASELINE v0.3 — PENDING FORMAL LEGAL REVIEW**
> This document constitutes an internal commercial and legal drafting baseline. It has **not** been approved for binding customer execution in its current form. Formal sign-off by qualified French legal counsel (*avocat à la cour*) is mandatory prior to external commercial release, consumer contracting, or enterprise distribution (Gate 7). Internal circulation and engineering governance only.

---

# End User License Agreement (EULA)

**Product:** EAORCS — Enterprise Assurance, Orchestration & Certification System (Thin Client)  
**Licensor Entity:** AIR ROOFERS (Société par actions simplifiée à associé unique)  
**Effective Date:** Upon acceptance by Licensee or upon first Activation Event  
**Document Version:** 0.3.0-draft  
**Status:** DRAFT — PENDING FORMAL LEGAL REVIEW (Gate 7 — Human Legal Review)

---

## 1. Parties and Contracting Capacity

| Role | Entity / Party Details |
|---|---|
| **Licensor** | **AIR ROOFERS**, a simplified joint-stock company (*Société par actions simplifiée à associé unique*) incorporated and governed under the laws of France, with a share capital of 500.00 €, registered with the Trade and Companies Register under number **943 432 534 R.C.S. Paris**, having its registered office at **229 rue Saint-Honoré, 75001 Paris, France**, intra-community VAT identification number **FR89943432534** (hereinafter referred to as "**Air Roofers**", the "**Licensor**", "**we**", or "**us**"). |
| **Originating Author** | **Ignatus Chika Ujomor**, founder, originator, system architect, and author of the proprietary system foundations and architectures incorporated into the Platform (retaining personal and moral rights under applicable law as set forth in §15). |
| **Licensee** | The natural or legal person accepting this Agreement, downloading, installing, accessing, or activating the EAORCS thin client software (hereinafter referred to as the "**Licensee**" or "**Customer**"). |

### 1.1 Customer Classification

To ensure strict compliance with mandatory statutory provisions under European Union and French law, Licensees are categorized as follows:

1. **Consumer (*Consommateur*):** Any natural person acting exclusively for purposes that are outside their commercial, industrial, craft, liberal, or professional activity, entitled to mandatory consumer protections under the French *Code de la consommation* and applicable EU Directives.
2. **Professional Customer (*Professionnel*):** Any natural or legal person, whether private or public, acting in the context of their commercial, industrial, craft, liberal, or professional activity.
3. **Enterprise Customer (*Entreprise*):** Any legal entity deploying EAORCS across team, department, or organisation-wide operations under an Enterprise Order Form or negotiated Enterprise Agreement.
4. **Government & Sovereign Customer (*Secteur Public & Souverain*):** Any public authority, state department, regional body, defence or security agency contracting under public procurement rules, administrative frameworks, or the Sovereign Deployment Addendum.

By installing, copying, accessing, or using the EAORCS thin client, the Licensee represents and warrants their legal capacity to enter into this Agreement, confirms their applicable classification, and agrees to be bound by the terms herein.

---

## 2. Definitions

- **"EAORCS Thin Client"** means the client-side binary, CLI runtime, or local agent application of EAORCS supplied by the Licensor, excluding all protected backend server-side components.
- **"Server-Side Engine"** means all backend infrastructure, certification engines, assurance pipelines, orchestration topologies, and proprietary algorithms operated by Air Roofers behind the protected federation.
- **"Platform"** means the collective EAORCS software, comprising the thin client, federation interfaces, and documentation.
- **"Edition"** means the licensed tier of EAORCS granted to the Licensee (COMMUNITY, DEVELOPER, PROFESSIONAL, BUSINESS, ENTERPRISE, SOVEREIGN) as governed by Mandatag.
- **"Entitlement"** means a cryptographically verifiable license token issued exclusively by Mandatag (`license.airroofers.eu`).
- **"Mandatag"** means the centralized entitlement, licensing, and cryptographic verification authority service operated by Air Roofers at `license.airroofers.eu`.
- **"AeroBill"** means the commercial billing, invoicing, and metering authority service operated by Air Roofers at `billing.airroofers.eu`.
- **"Activation Event"** means the verifiable milestone at which digital performance begins, defined as the earliest occurrence of: (i) cryptographic license token issuance by Mandatag; (ii) authorized download of an entitlement-gated package from `downloads.airroofers.eu`; (iii) successful client-side handshake verifying entitlement; or (iv) execution of the first authenticated capability.
- **"Customer Data"** means all proprietary data, code repositories, schema definitions, internal policies, and compliance inputs supplied or processed by the Licensee using the thin client.
- **"Customer Materials"** means proprietary technical artifacts, pre-existing documentation, or customized rule sets introduced by the Licensee.
- **"Open-Source Components"** means third-party software libraries or dependencies embedded in or distributed with the thin client that are subject to separate open-source software license terms.
- **"Statutory Withdrawal Right"** means the mandatory statutory right of withdrawal provided to consumers under Articles L. 221-18 et seq. of the French *Code de la consommation*.
- **"Statutory Conformity Remedy"** means the mandatory legal guarantees of conformity for digital content and digital services provided under Articles L. 224-25-1 et seq. of the French *Code de la consommation*.

---

## 3. Grant of License

Subject to the terms and conditions of this Agreement, payment of applicable fees (for paid Editions), and the continuous existence of a valid Entitlement issued by Mandatag, Air Roofers grants the Licensee a **non-exclusive, non-transferable, non-sublicensable, revocable** license to download, install, and execute the EAORCS thin client solely for the Licensee's internal business or personal use, strictly within the boundaries of the authorized Edition (§4).

This license applies strictly to the **EAORCS thin client**. No license, right, or title is granted, implied, or extended in or to:
1. Any server-side binary, backend infrastructure, or server-side orchestration engine;
2. Any proprietary source code, algorithms, or internal protocols of Air Roofers;
3. Any root cryptographic certificates, private signing keys, or authoritative ledger state.

---

## 4. License Scope and Editions

All commercial fees are denominated in Euros (**EUR, €**). Prices are governed by the authoritative Rate Card issued by the commercial authority. The licensed scope for each Edition is established below:

| Edition | Authorized Scope of Use | Entitlement Requirement | Distribution / Governance |
|---|---|---|---|
| **COMMUNITY** | Non-commercial evaluation, personal exploration, open-source auditing, academic research. Strict prohibition on commercial production deployment. | Self-contained community token or free registration via Mandatag. | Best-effort availability; no SLA. Non-metered. |
| **DEVELOPER** | Named single developer use for integration testing, local pipeline configuration, and non-production development environments. | Active Entitlement issued by Mandatag. | Support via ticket/email. Metering enabled. |
| **PROFESSIONAL** | Commercial deployment by a single functional team or department (up to 5 named users) within a single legal entity. | Active Entitlement issued by Mandatag. | Commercial SLA applies. Full compliance reporting. |
| **BUSINESS** | Multi-team, multi-department operational deployment within a single legal entity. | Active Entitlement issued by Mandatag. | Enhanced SLA. Automated assurance pipelines. |
| **ENTERPRISE** | Organisation-wide commercial deployment, federated identity integration, custom pipeline policies, cluster assurance. | Active Enterprise Entitlement via Mandatag. | 24/7 mission-critical SLA. Multi-cluster management. |
| **SOVEREIGN** | Regulated, classified, defense, critical national infrastructure, or air-gapped environments. Dedicated deployment engineering. | Active Sovereign Entitlement via Mandatag. | Governed by Sovereign Addendum. Dedicated engineering. |

### 4.1 Distribution Overlays (OEM and MSP)
OEM (*Original Equipment Manufacturer*) and MSP (*Managed Service Provider*) relationships are commercial distribution models governed by dedicated bilateral agreements. They do not constitute standalone functional software editions, but contractual overlays granting specified sublicensing, white-labeling, or multi-tenant service provisioning rights.

---

## 5. Restrictions and Conditions of Use

The Licensee shall not, and shall not permit or assist any third party to:

1. **Reverse Engineer Server Infrastructure:** Decompile, disassemble, reverse engineer, decrypt, extract, or reconstruct any server-side engine, proprietary protocol, or internal cryptographic algorithm operated by the Licensor.
2. **Circumvent Entitlements:** Bypass, tamper with, defeat, modify, or simulate any licensing validation, token verification, or cryptographic handshake enforced by Mandatag or the thin client.
3. **Key and Token Exfiltration:** Disclose, publish, distribute, sub-license, assign, or expose any private cryptographic keys, authentication tokens, client credentials, or API tokens issued to the Licensee.
4. **Exceed Licensed Scope:** Deploy the thin client across users, nodes, clusters, or commercial contexts exceeding the authorized Edition (e.g., using COMMUNITY Edition for revenue-generating production assurance).
5. **Unauthorized Commercial Exploitation:** Sublicense, rent, lease, timeshare, or commercially host the thin client as a standalone bureau service without a separate OEM/MSP agreement.
6. **Trademark and Notice Removal:** Alter, obscure, or remove any copyright notice, trademark, legal watermark, or proprietary identification embedded in or generated by the software.
7. **Unlawful Use:** Utilize the software for any purpose that violates French law, European Union law, export control regulations, or applicable international sanctions.

---

## 6. Intellectual Property Rights Architecture

The intellectual property architecture governing EAORCS is structured under a strict four-layer model:

```
┌────────────────────────────────────────────────────────────────────────┐
│ LAYER A: PLATFORM IP (Air Roofers SASU)                                │
│ Source code, binaries, architecture, algorithms, schemas, APIs,        │
│ assurance methodologies, documentation, generic platform enhancements. │
├────────────────────────────────────────────────────────────────────────┤
│ LAYER B: CUSTOMER DATA (Customer Retains 100% Ownership)               │
│ Customer repositories, source code, config files, internal data.       │
├────────────────────────────────────────────────────────────────────────┤
│ LAYER C: CUSTOMER EVIDENCE & ARTIFACTS (Customer Ownership / License)  │
│ Audit reports, institutional compliance evidence, generated records.   │
├────────────────────────────────────────────────────────────────────────┤
│ LAYER D: GENERIC IMPROVEMENTS (Air Roofers SASU)                       │
│ Platform bug fixes, generic connectors, universal security patterns.  │
└────────────────────────────────────────────────────────────────────────┘
```

### 6.1 Layer A: Platform Intellectual Property
All right, title, interest, and intellectual property rights in and to the EAORCS Platform — including the thin client, server-side engine, certification logic, schemas, APIs, trademarks ("AIR ROOFERS", "EAORCS"), domain names, and technical documentation — are the exclusive property of **Air Roofers SASU** (subject to originating authorship rights recognized under §15) or its licensors. The Licensee acquires only a revocable, limited license to use the thin client, and acquires no ownership whatsoever in the underlying software.

### 6.2 Layer B: Customer Data Ownership
Air Roofers makes **no claim of ownership** over Customer Data. The Customer retains full, unencumbered ownership and intellectual property rights in all data, proprietary source code, application architectures, and business logic processed through the thin client. The Customer grants Air Roofers a limited, non-exclusive license to process Customer Data solely to the extent strictly necessary to execute the contracted Services, provide support, and enforce license validity.

### 6.3 Layer C: Output Ownership Matrix (Customer Evidence & Compliance Artifacts)
To eliminate any ambiguity regarding outputs produced by EAORCS operations, ownership of artifacts is strictly allocated in accordance with the following Output Ownership Matrix:

| Output / Artifact Category | Ownership Allocation | Governing Principle / Rights Grant |
|:---|:---|:---|
| **Customer Data & Private Repositories** | **100% Customer** | Customer retains full and exclusive title. |
| **Customer Proprietary Materials & Inputs** | **100% Customer** | Customer retains full and exclusive title. |
| **Customer-Specific Verification Evidence** | **100% Customer** | Customer owns all verified records, audit trails, and evidence bundles. |
| **Generated Compliance Reports & Executive Proofs**| **100% Customer** | Customer owns the specific compiled report; underlying templates and schemas licensed non-exclusively. |
| **Signed Verification Certificates & Attestation Proofs**| **Customer (Operational Title)** | Customer holds operational ownership; underlying verification algorithms, key authorities, and cryptographic methods remain Air Roofers IP. |
| **EAORCS Standardized Schemas, Templates & Rules** | **Air Roofers SASU** | Air Roofers retains proprietary ownership; customer receives perpetual license to use embedded in reports. |
| **Platform Telemetry & Performance Metadata** | **Air Roofers SASU** | Aggregated operational metadata; strictly subject to Privacy Policy and DPA (no customer source code). |
| **Open-Source Dependencies** | **Respective Licensors** | Governed strictly by applicable third-party open-source licenses. |

### 6.4 Layer D: Generic Platform Improvements
Any generic bug fixes, performance optimizations, universal schema refinements, or reusable connectors derived during the provision of the Services vest in Air Roofers, provided that such improvements do not incorporate, reveal, or compromise Customer Confidential Information or Customer Data.

### 6.5 Third-Party and Open-Source Components
Certain components distributed with the EAORCS thin client are Open-Source Components governed by their respective licenses (e.g., MIT, Apache 2.0, BSD). Nothing in this Agreement restricts or overrides rights granted to the Licensee under applicable open-source license agreements. A complete list of open-source dependencies and license texts is maintained in the software distribution directory.

### 6.6 Statutory Software User Rights (French Intellectual Property Code)
Nothing in this Agreement shall be interpreted to waive or restrict the mandatory exceptions provided under Article L. 122-6-1 of the French *Code de la propriété intellectuelle*, specifically:
- The right to reproduce the software for backup purposes when necessary to maintain use;
- The right to observe, study, or test the functioning of the software to determine underlying ideas and principles;
- The right to achieve interoperability with independently created software under the strict conditions established by Article L. 122-6-1 IV of said Code.

---

## 7. Data Protection and Telemetry

7.1 **Privacy Framework:** The processing of personal data in connection with EAORCS is governed by the **EAORCS Privacy Policy** (`Privacy_Policy_draft.md`), incorporated herein by reference. Air Roofers complies with the European General Data Protection Regulation (Regulation (EU) 2016/679 - GDPR) and the French *Loi Informatique et Libertés*.

7.2 **Activation Telemetry:** The thin client transmits strictly limited operational telemetry to `telemetry.airroofers.eu` (edition, tenant ID, correlation ID, capability event counts, error metrics). **No customer source code, personal identity content, or customer data payloads are captured by the telemetry subsystem.**

---

## 8. Term, Suspension, and Termination

8.1 **Term:** This Agreement enters into force upon the Licensee's initial acceptance or first Activation Event, and remains active for the duration of the valid Entitlement, or indefinitely for COMMUNITY Edition unless terminated.

8.2 **Termination for Cause:** Air Roofers may terminate this Agreement and revoke the Licensee's Entitlement immediately without judicial formality in the event of:
- A material breach of this Agreement (including §§3, 5, 6, 14);
- Non-payment of commercial fees through AeroBill following formal notice remaining unremedied after fifteen (15) days;
- Insolvency, bankruptcy, or liquidation of the Licensee, to the extent permitted by applicable bankruptcy laws.

8.3 **Effect of Termination:** Upon termination, the Licensee must immediately cease all use of the EAORCS thin client and uninstall/destroy all copies in their possession. Termination does not extinguish accrued financial liabilities or affect statutory provisions intended to survive (including §§6, 9, 10, 11, 14, 15).

---

## 9. Warranties and Statutory Conformity Guarantees

### 9.1 Professional and Enterprise Customers (B2B)
To the maximum extent permitted by applicable law, the EAORCS thin client is provided to Professional, Enterprise, and Sovereign customers **"AS IS"** and **"AS AVAILABLE"**, without warranty of any kind, whether express, implied, statutory, or otherwise. Air Roofers disclaims all implied warranties of merchantability, fitness for a particular purpose, non-infringement, uninterrupted operation, and error-free execution.

### 9.2 Consumer Customers (B2C — French Statutory Conformity Guarantees)
For Consumers residing within the European Union and France, Air Roofers provides the mandatory statutory guarantees of conformity for digital content and digital services set forth in Articles L. 224-25-1 to L. 224-25-31 of the French *Code de la consommation*, and the guarantee against hidden defects (*garantie des vices cachés*) under Articles 1641 to 1649 of the French *Code civil*.

Under the statutory conformity guarantee:
- The Consumer is entitled to bring the digital content or service into conformity, or, failing that, to an appropriate price reduction or contract termination under the conditions set forth in the French *Code de la consommation*;
- The Consumer is entitled to receive necessary updates (including security patches) required to keep the digital content or service in conformity during the statutory period.

Nothing in this Agreement diminishes, limits, or excludes any mandatory consumer warranty right that cannot lawfully be contracted out of under applicable law.

---

## 10. Limitation of Liability

### 10.1 Unrestricted Liabilities
Nothing in this Agreement limits or excludes liability that cannot be excluded under applicable law, including:
- Death or personal injury caused by negligence;
- Fraud, fraudulent misrepresentation, or willful misconduct (*faute intentionnelle ou dolosive*);
- Gross negligence (*faute lourde*) under French jurisprudence;
- Breach of intellectual property obligations under §6;
- Mandatory consumer statutory rights under §9.2.

### 10.2 Professional and Enterprise Contracts (B2B Liability Allocation)
For all B2B transactions:
1. **Consequential Damages:** Air Roofers shall not be liable for any indirect, special, incidental, punitive, or consequential damages, loss of business, loss of profits, loss of anticipated savings, reputational damage, or loss or corruption of data.
2. **Aggregate Financial Cap:** The maximum aggregate liability of Air Roofers arising out of or related to this Agreement, whether in contract, tort (including negligence), or otherwise, shall be strictly limited to the total fees actually paid by the Licensee to Air Roofers in the **twelve (12) months** preceding the incident giving rise to liability, or one hundred Euros (100.00 €) where the software was provided free of charge.

### 10.3 Consumer Contracts (B2C Liability Allocation)
For Consumer transactions, Air Roofers is liable in accordance with mandatory French and EU statutory standards for direct, foreseeable harm resulting from a proven contractual failure, without prejudice to statutory conformity remedies.

---

## 11. Governing Law and Jurisdiction

11.1 **Governing Law:** This Agreement and any dispute, controversy, or claim arising out of or related hereto shall be governed exclusively by and construed in accordance with the **laws of France**, without giving effect to conflict of law principles. The United Nations Convention on Contracts for the International Sale of Goods (CISG) is expressly excluded.

11.2 **Professional Jurisdiction (B2B):** For all disputes involving Professional, Enterprise, or Sovereign Customers, the parties submit to the exclusive jurisdiction of the **competent courts of Paris, France** (*Tribunaux compétents de Paris*).

11.3 **Consumer Jurisdiction (B2C Carve-Out):** For Consumers, dispute jurisdiction is governed by Article R. 631-3 of the French *Code de la consommation* and applicable European Union jurisdictional rules (Regulation (EU) No 1215/2012 - Brussels I bis). Consumers may bring legal action before the courts of their place of domicile or the courts of the Licensor's registered office. Consumers also have the right to access free consumer mediation as detailed in §13 and the Terms of Service.

---

## 12. Subject-Matter Scoped Precedence Hierarchy

In the event of any conflict, contradiction, or ambiguity between the documents constituting the EAORCS contractual and governance framework, the following descending order of precedence shall strictly govern, with each instrument authoritative over its designated subject-matter scope:

```
1. MANDATORY STATUTORY LAW (French Consumer Code, GDPR, French CPI)
   ↓
2. EXECUTED MASTER SERVICES AGREEMENT / ENTERPRISE ORDER FORM
   ↓
3. SPECIALIZED ADDENDUM (Enterprise / Sovereign / Government Addendum)
   ↓
4. DATA PROCESSING AGREEMENT (Data Protection & Privacy Subject Matter Only)
   ↓
5. THIS END USER LICENSE AGREEMENT (Software Licensing, Scope & IP Subject Matter Only)
   ↓
6. TERMS OF SERVICE (Cloud, Platform & Hosted Service Subject Matter Only)
   ↓
7. PAYMENT, CANCELLATION, REFUND & WITHDRAWAL POLICY (Commercial & Billing Subject Matter)
   ↓
8. SUPPORT SLA SCHEDULE (Service Availability & Operational Support Subject Matter Only)
   ↓
9. OPERATIONAL POLICIES & TECHNICAL SPECIFICATIONS (Security, Cookies, LCR)
   ↓
10. PRODUCT DOCUMENTATION AND TECHNICAL MANUALS
```

No lower-ranking document or operational guideline may be interpreted to waive, contradict, or invalidate any provision of a higher-ranking document or any mandatory statutory right. Each document is authoritative within its designated subject matter (e.g., the DPA governs personal data processing, this EULA governs software licensing and IP, the Terms of Service govern cloud/platform services, and the Payment Policy governs billing and refunds).

---

## 13. Payment, Cancellation, and Refund Governance

All commercial payment processing, recurring subscriptions, tax treatment, cancellation procedures, statutory withdrawal requests, and refund inquiries are governed comprehensively by the **EAORCS Payment, Cancellation, Refund & Withdrawal Policy** (`Payment_Cancellation_Refund_Withdrawal_Policy.md`), incorporated herein by reference.

---

## 14. Technical Assurance Output Disclaimer

14.1 **Technical Evidence Only:** The EAORCS Platform generates technical compliance observations, automated security scoring, runtime attestation records, and cryptographic evidence. **EAORCS outputs are technical assurance artifacts only.**

14.2 **No Professional Advice:** Unless explicitly agreed pursuant to a separate, bespoke professional services contract, EAORCS:
- Does **not** provide legal advice, regulatory opinions, or formal legal certification;
- Does **not** constitute or represent an accredited certification body, auditing firm, or governmental regulatory authority;
- Does **not** guarantee regulatory compliance, commercial clearance, or exemption from statutory sanctions.

14.3 **Licensee Responsibility:** The Licensee retains sole and independent responsibility for interpreting EAORCS outputs, making operational deployment decisions, validating regulatory conformity, and seeking qualified professional counsel.

---

## 15. Originating Author Attribution and Founder Rights

15.1 **Recognition of Originating Author:** The EAORCS Platform incorporates foundational architectures, cryptographic verification models, and software engineering frameworks originally conceptualized, designed, and authored by **Ignatus Chika Ujomor** (the "Originating Author").

15.2 **Moral Rights Preservation:** Under Articles L. 121-1 et seq. of the French *Code de la propriété intellectuelle*, the author's moral rights — including the right of attribution, the right to respect for their name and status, and the right to respect for the integrity of the work — are perpetual, inalienable, and imprescriptible (*perpétuel, inaliénable et imprescriptible*). Nothing in this Agreement, nor any license granted hereunder, shall be construed as waiving, transferring, extinguishing, or impairing the moral rights of the Originating Author.

15.3 **Distinction of Rights:** The commercial and economic exploitation rights exercised by Air Roofers SASU as the corporate holding and licensing entity remain distinct from the personal moral rights of the Originating Author. Internal corporate governance, IP transfers, founder protections, and reversion arrangements are governed exclusively by internal company instruments and applicable French law, and create no third-party beneficiary rights for the Licensee.

---

## 16. General Provisions

- **Entire Agreement:** This Agreement, together with the incorporated Terms of Service, Privacy Policy, and Payment Policy, constitutes the complete agreement between the parties regarding the EAORCS thin client.
- **Severability:** If any provision of this Agreement is deemed invalid or unenforceable under applicable law, such provision shall be modified to the minimum extent necessary to achieve legal validity, and the remaining provisions shall remain in full force.
- **Non-Waiver:** Failure by Air Roofers to enforce any provision shall not constitute a waiver of its right to enforce such provision at a later date.
- **Language:** This Agreement is drafted in the English language. In the event of any divergence between the English text and any translation prepared for convenience, the English text shall prevail, without prejudice to mandatory French language consumer requirements under Law No. 94-665 of 4 August 1994 (*Loi Toubon*).

---

**AIR ROOFERS SASU**  
229 rue Saint-Honoré, 75001 Paris, France  
RCS Paris 943 432 534 | TVA: FR89943432534  
Commercial Authority: `commercial@airroofers.eu`  
Corporate Legal: `legal@airroofers.eu`  

---
*Classification: COMMERCIAL_AUTHORITY | DRAFT — PENDING FORMAL LEGAL REVIEW*  
*Internal Circulation Only — External Publication Requires Legal Authority Signature*
