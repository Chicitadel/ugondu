/******************************************************************************
 * Project        : EAORCS — Enterprise Assurance, Orchestration & Certification System
 * Module         : Data Protection & Commercial Governance
 * File           : Subprocessor_Transfer_Register.md
 * Version        : 1.1.0-draft
 * Author         : Ignatus Chika Ujomor | Founder & System Architect
 * Organization   : AIR ROOFERS (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-09-24
 * Last Modified  : 2026-09-25
 * Classification : PUBLIC | GDPR ARTICLE 28 COMPLIANCE REGISTER
 *
 * Governance:
 * - Corporate Governance Baseline — Pending Formal Legal Review
 * - Architecture Controlled
 * - Protocol Frozen
 *
 * Standards:
 * - GDPR (Regulation (EU) 2016/679, Art. 28, Art. 44–49)
 * - European Data Protection Board (EDPB) Recommendations 01/2020 on Supplementary Measures
 * - Standard Contractual Clauses (Commission Implementing Decision (EU) 2021/914)
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
> **LEGAL DRAFT BASELINE v1.1 — PENDING FORMAL LEGAL APPROVAL**
> This register catalogs all authorized third-party subprocessors and international data transfer safeguards governing the EAORCS ecosystem pursuant to Article 28(2) of the GDPR. Formal legal sign-off is required prior to external publication (Gate 7). Internal circulation and data protection governance only.

---

# Subprocessor & International Data Transfer Register

**Product:** EAORCS — Enterprise Assurance, Orchestration & Certification System  
**Data Controller / Provider:** AIR ROOFERS (Société par actions simplifiée à associé unique)  
**Registered Office:** 229 rue Saint-Honoré, 75001 Paris, France (RCS Paris 943 432 534)  
**TVA Intracommunautaire:** FR89943432534  
**Data Protection Contact:** `privacy@airroofers.eu`  
**Document Version:** 1.1.0-draft  
**Status:** DRAFT — PENDING FORMAL LEGAL REVIEW (Gate 7 — Human Legal Review)

---

## 1. Statutory Purpose and Regulatory Framework

Pursuant to **Article 28(2) of the General Data Protection Regulation (Regulation (EU) 2016/679 - GDPR)**, a data processor shall not engage another processor (subprocessor) without prior specific or general written authorization of the data controller.

This Register maintains the authoritative inventory of all third-party external subprocessors engaged by **AIR ROOFERS** to process Customer Personal Data under the **EAORCS Data Processing Agreement (DPA)**.

---

## 2. Air Roofers Internal Platform Infrastructure (Non-Subprocessor Architecture)

For clarity under GDPR Article 4(8), the technical endpoints composing the Air Roofers federated platform are **internal operational components operated directly by AIR ROOFERS SASU** (the Processor). They do not constitute third-party subprocessors:

| Federated Component | Operational Endpoint | Primary Architectural Function | Infrastructure Location |
|:---|:---|:---|:---|
| **Identity Authority** | `identity.airroofers.eu` | User authentication, RBAC profile management, RS256 JWT minting | European Union (EEA) |
| **Mandatag (Licensing)** | `license.airroofers.eu` | Cryptographic license verification, Merkle proof token validation | European Union (EEA) |
| **AeroBill (Commercial)** | `billing.airroofers.eu` | Commercial invoicing, tax accounting, metered subscription rating | European Union (France) |
| **Telemetry Service** | `telemetry.airroofers.eu` | Operational diagnostic metrics, capability usage telemetry | European Union (EEA) |
| **Downloads Gateway** | `downloads.airroofers.eu` | Authenticated binary distribution, SHA-256 package checksum verification | European Union (EEA) |

---

## 3. Authorized Third-Party External Subprocessors

Where Air Roofers acts as a Data Processor on behalf of the Customer under the EAORCS DPA, the following third-party subprocessor categories are authorized, subject to Article 3.4 of the DPA (30-day notice and objection rights). Placeholders designate production vendor selections currently undergoing final evaluation:

| Category | Primary Service Function | Evaluated Vendor Candidates / Entity | Processing Location | Data Handled | Transfer Safeguard Mechanism |
|:---|:---|:---|:---|:---|:---|
| **Cloud Hosting & Virtual Infrastructure** | Bare-metal compute, virtual clusters, encrypted database storage | `[SELECTION_PENDING: OVHcloud SAS / Scaleway SAS / Hetzner Online GmbH]` | **European Union** (France / Germany) | Encrypted platform data, authentication databases | **Intra-EEA** (Full EU GDPR jurisdiction; no Chapter V transfer) |
| **Payment & Invoicing Gateway** | Commercial payment processing, SEPA direct debit rails | `[SELECTION_PENDING: Stripe Payments Europe, Ltd. / Mollie B.V.]` | **European Union** (Ireland / Netherlands) | Billing name, card token, payment status | **Intra-EEA** (PCI-DSS Level 1 certified; independent controller for payment rails) |
| **Transactional Email Dispatcher** | System notices, password resets, durable-medium order confirmations | `[SELECTION_PENDING: Brevo (Sendinblue SAS) / Mailjet SAS]` | **European Union** (France / Germany) | Recipient email address, customer name, transaction notices | **Intra-EEA** (Art. 28 DPA executed) |
| **Edge Network & DDoS Mitigation** | Anycast edge routing, TLS termination, CDN caching | `[SELECTION_PENDING: Cloudflare, Inc. / Fastly, Inc. (EU Data Localization)]` | **European Union** (Edge nodes globally with EU core processing) | IP address, HTTP request headers, transient traffic | **Standard Contractual Clauses (SCCs)** (Commission Decision 2021/914) + Encryption at rest/transit |
| **Enterprise Support & Ticketing** | Technical support ticket tracking and resolution | `[SELECTION_PENDING: Zendesk / Freshdesk (EU Data Center)]` | **European Union** | Support inquiries, email, attached diagnostic logs | **Standard Contractual Clauses (SCCs)** or Intra-EEA hosting |

> *Note on Subprocessor Finalization:* Prior to commercial production release (Gate 8), each `[SELECTION_PENDING]` entry above will be replaced with the executed legal name, corporate seat, and DPA reference of the selected vendor.

---

## 4. International Data Transfer Safeguards (GDPR Chapter V)

Where personal data is transferred to, or accessed from, jurisdictions outside the European Economic Area (EEA), Air Roofers strictly adheres to Chapter V of the GDPR:

### 4.1 Primary Reliance on Adequacy Decisions (Art. 45 GDPR)
Where available, subprocessors are selected in countries recognized by the European Commission as providing an adequate level of data protection (e.g., EU-US Data Privacy Framework participants, United Kingdom, Switzerland, Canada).

### 4.2 Standard Contractual Clauses (Art. 46(2)(c) GDPR)
In the absence of an adequacy decision, Air Roofers executes the European Commission Standard Contractual Clauses (Module 2 Controller-to-Processor or Module 3 Processor-to-Processor) with the subprocessor.

### 4.3 Supplementary Technical and Organizational Measures
In accordance with European Data Protection Board (EDPB) Recommendations 01/2020:
- **Zero-Trust Encryption:** All data transferred across public networks is encrypted using TLS 1.3 with forward secrecy;
- **At-Rest Protection:** Data at rest in third-party storage is encrypted with AES-256-GCM using encryption keys managed exclusively within the European Union;
- **No Backdoors:** Air Roofers contractually prohibits subprocessors from granting foreign intelligence or surveillance authorities direct or unrestricted access to customer data.

---

## 5. Subprocessor Modification and Enterprise Notification Protocol

5.1 **Advance Notification:** Air Roofers shall notify Customers subscribing to commercial Editions (PROFESSIONAL, BUSINESS, ENTERPRISE, SOVEREIGN) at least **thirty (30) calendar days** prior to engaging any new subprocessor or replacing an existing subprocessor.

5.2 **Right to Object:** An Enterprise Customer holding a valid Data Processing Agreement may object to the appointment of a new subprocessor on reasonable data protection grounds within fifteen (15) days of receiving notification.

5.3 **Resolution of Objections:** Upon receipt of a formal objection, Air Roofers will engage in good faith with the Customer to explore mitigating measures. If no mutually acceptable resolution is achieved, the Customer may terminate the affected Services without penalty prior to the new subprocessor taking effect.

---

**AIR ROOFERS SASU**  
229 rue Saint-Honoré, 75001 Paris, France  
RCS Paris 943 432 534 | TVA: FR89943432534  
Data Protection Office | Corporate Compliance  

---
*Classification: PUBLIC | GDPR ARTICLE 28 COMPLIANCE REGISTER*  
*Copyright (c) 2025-2026 Air Roofers SASU. All Rights Reserved.*
