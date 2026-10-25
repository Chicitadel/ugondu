<!--
******************************************************************************
 * Project        : EAORCS — Enterprise Assurance, Orchestration & Certification System
 * Module         : Data Protection & Commercial Governance
 * File           : EAORCS_Data_Processing_Agreement.md
 * Version        : 1.0.0-draft
 * Author         : Ignatus Chika Ujomor | Founder & System Architect
 * Organization   : AIR ROOFERS (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-09-25
 * Last Modified  : 2026-09-25
 * Classification : COMMERCIAL_AUTHORITY | DRAFT — PENDING FORMAL LEGAL REVIEW
 *
 * Governance:
 * - Corporate Governance Baseline — Pending Formal Legal Review
 * - Architecture Controlled
 * - Protocol Frozen
 *
 * Standards:
 * - GDPR (Regulation (EU) 2016/679, Article 28)
 * - French Data Protection Act (Loi n° 78-17 du 6 janvier 1978 modifiée)
 * - ISO/IEC 27001 / SOC 2 Type II Security Controls
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

# Data Processing Agreement (DPA)
## Accord de Traitement des Données à Caractère Personnel

**Product:** EAORCS — Enterprise Assurance, Orchestration & Certification System  
**Processor:** AIR ROOFERS (Société par actions simplifiée à associé unique)  
**Registered Office:** 229 rue Saint-Honoré, 75001 Paris, France (RCS Paris 943 432 534)  
**TVA Intracommunautaire:** FR89943432534  
**Privacy Contact:** `privacy@airroofers.eu`  
**Document Version:** 1.0.0-draft  
**Status:** DRAFT — PENDING FORMAL LEGAL REVIEW (Gate 7 — Human Legal Review)

---

> [!IMPORTANT]
> This Data Processing Agreement ("**DPA**") governs the processing of personal data by **AIR ROOFERS** on behalf of the **Customer** in connection with the provision of the EAORCS platform, hosted verification services, and federated components. This DPA supplements and forms an integral part of the Master Agreement (EULA, Terms of Service, or Enterprise Order Form) entered into between the parties.

---

## Article 1 — Definitions and Interpretation

1.1 **Definitions:** The terms used in this DPA shall have the meanings given to them in Regulation (EU) 2016/679 ("**GDPR**"), including "**Controller**", "**Processor**", "**Data Subject**", "**Personal Data**", "**Personal Data Breach**", and "**Processing**".

1.2 **Roles of the Parties:**
- The **Customer** acts as **Data Controller** (or Processor on behalf of a third-party Controller) with respect to Customer Personal Data processed through the EAORCS Platform.
- **AIR ROOFERS** acts as **Data Processor** with respect to Customer Personal Data processed to provide the licensed services, in accordance with Article 28 of the GDPR.

---

## Article 2 — Scope and Subject Matter of Processing

2.1 **Subject Matter:** The subject matter of the processing is the performance of technical assurance, software verification, compliance scoring, and entitlement services pursuant to the Master Agreement.

2.2 **Duration:** The processing shall continue for the duration of the Master Agreement, plus any post-termination retention period required by applicable statutory law or agreed in writing.

2.3 **Nature and Purpose:** Automated ingestion of verification manifests, execution of cryptographic assurance rules, entitlement validation, and diagnostic telemetry processing as described in **Annex 1**.

2.4 **Categories of Data and Data Subjects:** The categories of personal data and data subjects are specified in **Annex 1**.

---

## Article 3 — Obligations of the Processor (Article 28(3) GDPR)

AIR ROOFERS undertakes to:

3.1 **Documented Instructions:** Process Customer Personal Data strictly on documented instructions from the Customer, including with regard to transfers of personal data to a third country, unless required to do so by European Union or Member State law to which Air Roofers is subject.

3.2 **Confidentiality:** Ensure that persons authorized to process Customer Personal Data have committed themselves to confidentiality or are under an appropriate statutory obligation of confidentiality.

3.3 **Security Measures (Article 32):** Implement appropriate technical and organizational measures to ensure a level of security appropriate to the risk, including the measures detailed in **Annex 2** (TLS 1.3 in transit, AES-256-GCM at rest, zero-trust RBAC, pseudonymization).

3.4 **Subprocessor Governance:**
- Not engage another processor ("Subprocessor") without prior specific or general written authorization of the Customer.
- The Customer grants general written authorization for the subprocessors listed in the **Subprocessor & Transfer Register** (`Subprocessor_Transfer_Register.md`).
- Air Roofers shall notify the Customer of any intended changes concerning the addition or replacement of other processors at least **thirty (30) calendar days** in advance, thereby giving the Customer the opportunity to object to such changes on reasonable data protection grounds.
- Where Air Roofers engages a subprocessor, it shall impose upon that subprocessor the same data protection obligations as set out in this DPA by way of a binding written contract.

3.5 **Assistance with Data Subject Rights:** Taking into account the nature of the processing, assist the Customer by appropriate technical and organizational measures, insofar as this is possible, for the fulfilment of the Customer's obligation to respond to requests for exercising data subjects' rights under Chapter III of the GDPR.

3.6 **Personal Data Breach Notification:**
- Notify the Customer without undue delay and in any event within **forty-eight (48) hours** of becoming aware of a confirmed Personal Data Breach affecting Customer Personal Data.
- Provide reasonable information regarding the nature of the breach, affected data categories, estimated number of affected data subjects, and remedial measures taken or proposed.

3.7 **DPIA and Prior Consultation Assistance:** Assist the Customer in ensuring compliance with the obligations pursuant to Articles 35 (Data Protection Impact Assessment) and 36 (Prior Consultation) of the GDPR, taking into account the nature of processing and information available to Air Roofers.

3.8 **Deletion or Return of Data:** At the choice of the Customer, delete or return all Customer Personal Data to the Customer after the end of the provision of services relating to processing, and delete existing copies unless European Union or French law requires storage of the personal data.

3.9 **Audits and Inspections:** Make available to the Customer all information necessary to demonstrate compliance with the obligations laid down in Article 28 of the GDPR and allow for and contribute to audits, including inspections, conducted by the Customer or an independent auditor mandated by the Customer, subject to reasonable advance notice, standard confidentiality covenants, and non-disruption of platform operations.

---

## Article 4 — International Data Transfers

4.1 **Primary Hosting:** Air Roofers hosts core platform databases, authentication servers, and assurance engines within data centers located in the European Economic Area (EEA).

4.2 **Transfer Mechanisms:** Where processing requires the transfer of Customer Personal Data outside the EEA to a country not recognized as providing an adequate level of protection:
- The parties agree that the European Commission Standard Contractual Clauses (SCCs — Commission Implementing Decision (EU) 2021/914, Module 2 Controller-to-Processor) shall apply;
- Air Roofers shall enforce supplementary technical and organizational safeguards in accordance with EDPB Recommendations 01/2020.

---

## Article 5 — Customer Obligations

The Customer warrants that:
1. It has established a valid lawful basis under Article 6 of the GDPR for all personal data submitted to the EAORCS Platform;
2. It has complied with all transparency and notice requirements under Articles 13 and 14 of the GDPR;
3. Its instructions to Air Roofers comply with applicable data protection legislation.

---

## Article 6 — Precedence and Severability

In the event of any conflict between this DPA and the Master Agreement (EULA, Terms of Service, or Enterprise Addendum), this DPA shall govern strictly with respect to the subject matter of personal data protection and processing.

---

## Annex 1 — Description of Processing

| Parameter | Specification |
|:---|:---|
| **Categories of Data Subjects** | Customer personnel, developers, DevOps engineers, compliance officers, administrators using the EAORCS platform. |
| **Categories of Personal Data** | User names, corporate email addresses, IP addresses, authentication tokens, session metadata, diagnostic log identifiers. *(No sensitive data within the meaning of Art. 9 GDPR is processed).* |
| **Nature of Processing** | Hosting, storage, automated verification execution, entitlement checking, logging, error diagnosis. |
| **Purposes of Processing** | Providing the EAORCS assurance service, user authentication, customer support, and system security. |
| **Retention Duration** | For the duration of the subscription plus 30 days for customer retrieval, except where statutory retention applies. |

---

## Annex 2 — Technical and Organizational Measures (TOMs)

1. **Access Control:** Multi-factor authentication (MFA) required for all administrative access; least-privilege RBAC; automated credential rotation.
2. **Encryption:** TLS 1.3 for all data in transit; AES-256-GCM for all data at rest.
3. **Data Minimization & Pseudonymization:** Telemetry pipelines process pseudonymous identifiers; customer source code remains strictly local in thin-client deployments.
4. **Resilience & Availability:** Automated daily encrypted backups; redundant multi-zone hosting; tested disaster recovery procedures.
5. **Vulnerability Management:** Continuous automated dependency scanning, code reviews, and coordinated vulnerability disclosure program.

---

**AIR ROOFERS**  
229 rue Saint-Honoré, 75001 Paris, France  
RCS Paris 943 432 534 | TVA: FR89943432534  
Data Protection Office  

---
*Classification: COMMERCIAL_AUTHORITY | DRAFT — PENDING FORMAL LEGAL REVIEW*  
*Corporate Governance Baseline — Internal Circulation Only — Copyright (c) 2025-2026 AIR ROOFERS*
