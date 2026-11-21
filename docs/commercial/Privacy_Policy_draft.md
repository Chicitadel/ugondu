/******************************************************************************
 * Project        : EAORCS — Enterprise Assurance, Orchestration & Certification System
 * Module         : Commercial Documentation
 * File           : Privacy_Policy_draft.md
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
 * - GDPR (Regulation (EU) 2016/679, Art. 4(7), 4(8), 6, 12, 13, 28, 32, 37)
 * - French Data Protection Law (Loi n° 78-17 du 6 janvier 1978 modifiée - Loi Informatique et Libertés)
 * - CNIL Guidelines on Cookies and Telemetry
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
> This document constitutes an internal commercial and data protection drafting baseline. It has **not** been approved for binding customer publication in its current form. Formal sign-off by qualified French legal counsel is required prior to external publication (Gate 7). Internal circulation and compliance governance only.

---

# Privacy Policy

**Product:** EAORCS — Enterprise Assurance, Orchestration & Certification System  
**Data Controller:** AIR ROOFERS (Société par actions simplifiée à associé unique)  
**Effective Date:** Upon commercial release following legal approval  
**Document Version:** 0.3.0-draft  
**Status:** DRAFT — PENDING FORMAL LEGAL REVIEW (Gate 7 — Human Legal Review)

---

## 1. Identity of the Data Controller & Privacy Representative

The legal entity responsible for the collection and processing of personal data in connection with the EAORCS Platform and associated federated services is:

**AIR ROOFERS**  
Société par actions simplifiée (Société à associé unique)  
Capital social: 500,00 €  
RCS Paris: **943 432 534** | Greffe du Tribunal des Activités Économiques de Paris  
Siège social: **229 rue Saint-Honoré, 75001 Paris, France**  
Numéro de TVA intracommunautaire: **FR89943432534**  
Contact Protection des Données: `privacy@airroofers.eu`  

### 1.1 Data Protection Representative Status & Article 37 Assessment
Air Roofers has designated an internal **Privacy Contact / Data Protection Representative** reachable at `privacy@airroofers.eu`. 
- Pursuant to Article 37(1) of the GDPR, formal designation and registration of a Data Protection Officer (DPO) with the CNIL is evaluated under the following statutory criteria:
  1. *Public Authority:* Air Roofers is a private commercial company (not applicable);
  2. *Core Activities — Systematic Monitoring:* Core activities do not consist of processing operations requiring regular and systematic monitoring of data subjects on a large scale;
  3. *Core Activities — Special Categories:* Core activities do not consist of large-scale processing of special categories of data (Art. 9 GDPR) or criminal conviction data (Art. 10 GDPR).
- Pending formal conclusion of the Article 37 assessment by legal counsel (Gate 7), all data protection inquiries, access requests, and supervisory correspondence are managed by the Data Protection Representative at `privacy@airroofers.eu`.

Air Roofers acts in strict compliance with the **General Data Protection Regulation (Regulation (EU) 2016/679 - GDPR)** and the French **Loi Informatique et Libertés** (Loi n° 78-17 du 6 janvier 1978 modifiée).

---

## 2. Scope and Context

This Privacy Policy applies to personal data collected or processed when natural persons or enterprise users:
1. Register, create, or maintain user accounts on the Air Roofers platform;
2. Download, install, activate, or execute the EAORCS thin client software;
3. Interact with the federated services: Identity (`identity.airroofers.eu`), Mandatag (`license.airroofers.eu`), AeroBill (`billing.airroofers.eu`), Telemetry (`telemetry.airroofers.eu`), and Downloads (`downloads.airroofers.eu`);
4. Contact customer support, request technical assistance, or report security findings.

This Policy does **not** govern personal data that Customers process independently within their own localized, air-gapped repositories or private datasets, for which the Customer acts as the independent data controller.

---

## 3. Categories of Personal Data Processed

### 3.1 Account and Identity Data
When an identity is provisioned via `identity.airroofers.eu`:
- **Identity Claims:** Full name, business email address, organization identifier (`org_id`), role/permissions profile, cryptographic public key hashes.
- **Authentication Credentials:** Salted and hashed passwords (Argon2id), multi-factor authentication (WebAuthn/FIDO2) public keys, active session tokens, and IP addresses at authentication time.

### 3.2 Commercial, Invoicing, and Transactional Data
When transactions are executed through `billing.airroofers.eu`:
- Billing entity name, registered address, country, intra-community VAT number (if applicable);
- Transaction identifiers, order timestamps, subscribed Edition, payment method tokens (processed securely via PCI-DSS certified payment processors; Air Roofers never stores raw primary account numbers or CVVs);
- Invoicing records, credit notes, and payment status history.

### 3.3 Activation and Operational Telemetry
When the EAORCS thin client activates and communicates with the federation:
- **Telemetry Payload:** Active Edition, tenant ID, session correlation ID (`X-Correlation-ID`), timestamp, client version, operating system identifier, and capability invocation counters.
- **Content Boundary:** Telemetry is strictly metadata. **No customer source code, confidential proprietary schemas, business logic payloads, or personal user files are captured by the telemetry subsystem.**

### 3.4 Support and Security Communications
- Inquiries submitted via `support@airroofers.eu` or `security@airroofers.eu`: Sender email, message content, diagnostic logs provided voluntarily by the reporter, and ticket correspondence.

---

## 4. Purposes and Legal Bases for Processing

Processing of personal data is conducted strictly on lawful grounds pursuant to **Article 6 of the GDPR**:

| Processing Activity | Specific Purpose | GDPR Legal Basis |
|---|---|---|
| **Service Execution** | Provision of software licenses, entitlement validation, authentication, and artifact downloads. | **Art. 6(1)(b)** — Performance of a contract to which the data subject is party. |
| **Commercial Billing** | Invoicing, payment collection, VAT reporting, and tax accounting. | **Art. 6(1)(b)** (Contract) and **Art. 6(1)(c)** (Compliance with French tax/accounting laws). |
| **Entitlement Integrity** | Cryptographic verification of license validity via Mandatag and prevention of software piracy. | **Art. 6(1)(f)** — Legitimate interests in protecting proprietary intellectual property. |
| **Platform Telemetry** | Aggregate capacity planning, operational error monitoring, and performance benchmarking. | **Art. 6(1)(f)** — Legitimate interests in ensuring platform reliability and resilience. |
| **Security Auditing** | Maintaining tamper-evident audit trails, detecting fraudulent transactions, and incident triage. | **Art. 6(1)(f)** — Legitimate interests in cybersecurity and infrastructure defence. |
| **Statutory Compliance** | Managing consumer withdrawal notices, conformity claims, and legal disputes. | **Art. 6(1)(c)** — Legal obligation under French Consumer Code. |

---

## 5. Data Retention Schedule

Personal data is retained only for the duration necessary to fulfill the purposes for which it was collected, or to satisfy statutory obligations, mapped as follows:

| Data Category | Retention Period | Statutory / Operational Source | Method of Disposal |
|---|---|---|---|
| **Invoicing & Accounting Records** | **10 years** from fiscal year-end | French *Code de commerce* (Art. L. 123-22) and General Tax Code (*Livre des procédures fiscales* Art. L. 102 B). | Secure cryptographic erasure / archival in restricted storage. |
| **Identity & Account Profiles** | Duration of active contract plus **3 years** from last user activity | CNIL recommendation for commercial prospect and customer account lifecycle management. | Anonymization of logs; deletion of account profile. |
| **Authentication & Audit Logs** | **12 months** from generation | CNIL standard for server connection logs, decree n° 2011-219, and ISO 27001 audit standards. | Automated rolling purge. |
| **Operational Telemetry** | **12 months** | Platform performance trend analysis. | Aggregation into non-identifiable statistical metrics. |
| **Customer Support Tickets** | **3 years** following ticket closure | Contractual management and dispute resolution (French Civil Code Art. 2224). | Secure permanent deletion. |
| **Security Reports** | **5 years** from vulnerability resolution | Defence against claims and vulnerability tracking. | Archival with restricted security team access. |

---

## 6. Processing Role Determination Matrix (GDPR Articles 4(7) & 4(8))

AIR ROOFERS is the sole incorporated legal person operating the EAORCS platform and its federated technical subsystems (`billing.airroofers.eu`, `license.airroofers.eu`, `identity.airroofers.eu`, `telemetry.airroofers.eu`, `downloads.airroofers.eu`). In accordance with GDPR criteria, the qualification of processing operations is determined strictly by who determines the purposes and means:

| Processing Domain | Subsystem / Endpoint | Purposes & Means Determined By | GDPR Role of AIR ROOFERS SASU | Governed By |
|:---|:---|:---|:---|:---|
| **Customer Account & Identity Management** | `identity.airroofers.eu` | Air Roofers (establishing credentials, maintaining platform security) | **Data Controller** (Art. 4(7)) | This Privacy Policy |
| **Commercial Billing, Tax & Accounting** | `billing.airroofers.eu` (AeroBill) | Air Roofers (complying with tax law, executing payment contracts) | **Data Controller** (Art. 4(7)) | This Privacy Policy / Legal Checkout Record |
| **License Entitlement & IP Protection** | `license.airroofers.eu` (Mandatag) | Air Roofers (validating license tokens, preventing piracy) | **Data Controller** (Art. 4(7)) | This Privacy Policy / EULA |
| **Platform Telemetry & Infrastructure Health**| `telemetry.airroofers.eu` | Air Roofers (aggregating reliability metrics, performance optimization) | **Data Controller** (Art. 4(7)) | This Privacy Policy |
| **Artifact Delivery & Digest Integrity** | `downloads.airroofers.eu` | Air Roofers (serving authorized binaries, cryptographic checksums) | **Data Controller** (Art. 4(7)) | This Privacy Policy |
| **Customer Workloads & Hosted Verification** | Cloud/Managed Verification APIs | **Customer** (submitting code, manifests, and organizational artifacts) | **Data Processor** (Art. 4(8)) | **EAORCS Customer DPA** (`EAORCS_Data_Processing_Agreement.md`) |

### 6.1 Third-Party Subprocessors
Where Air Roofers acts as a Data Processor on behalf of the Customer, it engages third-party infrastructure subprocessors strictly pursuant to **Article 28(2) and 28(4) of the GDPR** and under the terms of the **EAORCS Data Processing Agreement** and the **Subprocessor & Transfer Register** (`Subprocessor_Transfer_Register.md`).

---

## 7. International Data Transfers

7.1 **European Union Primary Hosting:** Air Roofers' primary core servers, databases, and cryptographic authorities are hosted in data centres located within the **European Economic Area (EEA)**.

7.2 **Transfers Outside the EEA:** Where technical necessity requires the engagement of a subprocessor located outside the EEA (or where technical support is rendered internationally), Air Roofers ensures appropriate transfer mechanisms in accordance with **Chapter V of the GDPR**, specifically:
- European Commission Adequacy Decisions (Art. 45 GDPR);
- Standard Contractual Clauses (SCCs - Art. 46(2)(c) GDPR), supplemented where required by Transfer Impact Assessments (TIAs) and supplementary encryption safeguards;
- Legally binding enterprise data transfer commitments.

A complete inventory of transfer locations and safeguards is documented in the `Subprocessor_Transfer_Register.md`.

---

## 8. Technical and Organizational Security Measures

In accordance with **Article 32 of the GDPR**, Air Roofers implements state-of-the-art security measures to protect personal data:
- **Encryption:** TLS 1.3 in transit with strict cipher suites; AES-256-GCM encryption at rest for databases and backups;
- **Zero-Trust Access:** Strict role-based access control (RBAC), mandatory MFA for all platform administrators, and absence of hardcoded production credentials;
- **Pseudonymization:** Telemetry and analytical logs utilize pseudonymous UUIDs rather than plaintext user identifiers;
- **Auditability:** Tamper-evident logging of administrative actions across all federated services;
- **Resilience:** Redundant geographic backups and automated disaster recovery failover mechanisms.

---

## 9. Data Subject Rights

Under Articles 15 to 22 of the GDPR, natural persons benefit from the following rights:

1. **Right of Access (Art. 15):** The right to receive confirmation as to whether your personal data is processed, and a copy of such data.
2. **Right to Rectification (Art. 16):** The right to have inaccurate or incomplete data updated.
3. **Right to Erasure / "Right to be Forgotten" (Art. 17):** The right to obtain erasure of your data, subject to statutory retention obligations (e.g., French tax accounting requirements).
4. **Right to Restriction of Processing (Art. 18):** The right to restrict processing during dispute verification.
5. **Right to Data Portability (Art. 20):** The right to receive your personal data in a structured, commonly used, machine-readable format.
6. **Right to Object (Art. 21):** The right to object to processing grounded in legitimate interests (Art. 6(1)(f)).
7. **Post-Mortem Directives:** Under Article 85 of the French *Loi Informatique et Libertés*, individuals have the right to define instructions regarding the preservation, erasure, and communication of their personal data after death.

### 9.1 Exercise of Rights and Response Timeframe
To exercise any statutory right, contact: **`privacy@airroofers.eu`**

Pursuant to **Article 12(3) of the GDPR**, Air Roofers shall provide information on action taken on a request **without undue delay and in any event within one (1) month of receipt of the request**. That period may be extended by two (2) further months where necessary, taking into account the complexity and number of the requests. Air Roofers shall inform the data subject of any such extension within one month of receipt of the request, together with the reasons for the delay.

### 9.2 Right to Lodge a Supervisory Complaint
Data subjects residing in France or the European Union have the right to lodge a formal complaint with the relevant supervisory authority:

**Commission Nationale de l'Informatique et des Libertés (CNIL)**  
3 Place de Fontenoy, TSA 80715, 75334 Paris Cedex 07, France  
Telephone: +33 (0)1 53 73 22 22 | Official website: `https://www.cnil.fr`

---

## 10. Cookies and Tracking Technologies

The use of cookies, local storage, and session tokens across the Air Roofers web ecosystem is strictly regulated in accordance with CNIL guidelines and European ePrivacy standards. Full details regarding cookie categories, duration, consent management, and opt-out mechanisms are set forth in the dedicated **Cookie Policy** (`Cookie_Policy.md`).

---

## 11. Amendments to This Policy

Air Roofers reserves the right to update this Privacy Policy to reflect evolving legal, technical, or operational realities. Notice of substantial amendments will be communicated to registered account holders at least thirty (30) days prior to the effective date.

---

**AIR ROOFERS SASU**  
229 rue Saint-Honoré, 75001 Paris, France  
RCS Paris 943 432 534 | TVA: FR89943432534  
Data Protection Office | Corporate Legal Affairs  

---
*Classification: COMMERCIAL_AUTHORITY | DRAFT — PENDING FORMAL DPO & LEGAL REVIEW*  
*Internal Circulation Only — External Publication Requires Legal Authority Signature*
