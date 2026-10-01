/******************************************************************************
 * Project        : EAORCS — Enterprise Assurance, Orchestration & Certification System
 * Module         : Commercial Documentation
 * File           : Security_Responsible_Disclosure_Policy.md
 * Version        : 1.2.0-draft
 * Author         : Ignatus Chika Ujomor | Founder & System Architect
 * Organization   : AIR ROOFERS (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-09-23
 * Last Modified  : 2026-09-25
 * Classification : ENTERPRISE | PUBLIC — PENDING FORMAL LEGAL REVIEW
 *
 * Governance:
 * - Corporate Governance Baseline — Pending Formal Legal Review
 * - Architecture Controlled
 * - Protocol Frozen
 *
 * Standards:
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS v4
 * - NIST SP 800-30 / SP 800-207 (Zero Trust)
 * - CVSS v3.1
 * - French Criminal Code (Code pénal, Art. 323-1 à 323-8)
 * - French Code of Criminal Procedure (Code de procédure pénale, Art. 40-1)
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
> **LEGAL DRAFT BASELINE v1.2 — PENDING FORMAL LEGAL APPROVAL**
> This policy defines the binding legal and technical safe harbor extended to good-faith security researchers. Formal legal sign-off is mandatory prior to public hosting at `security.airroofers.eu/disclosure` (Gate 7). Internal circulation and engineering governance only.

---

# Security & Responsible Vulnerability Disclosure Policy

**Product:** EAORCS — Enterprise Assurance, Orchestration & Certification System  
**Governing Entity:** AIR ROOFERS (Société par actions simplifiée à associé unique)  
**Registered Office:** 229 rue Saint-Honoré, 75001 Paris, France (RCS Paris 943 432 534)  
**Security Operations:** `security@airroofers.eu` | PGP Key: `security.airroofers.eu/pgp`  
**Document Version:** 1.2.0-draft  
**Status:** DRAFT — PENDING FORMAL LEGAL REVIEW (Gate 7 — Human Legal Review)

---

## 1. Commitment to Enterprise Security

AIR ROOFERS ("Air Roofers", "we", "us") places paramount importance on the security, cryptographic integrity, and resilience of the EAORCS Platform and its underlying federated services. We value the contributions of the ethical security research community and are committed to establishing a clear, legally sound, and collaborative framework for the coordinated identification and remediation of security vulnerabilities.

This Policy establishes the exact technical scope, procedural rules, safe-harbor boundaries, and prohibited research activities applicable to security investigations.

---

## 2. In-Scope Technical Components

Good-faith security research is authorized strictly within the following designated targets:

| Component | In-Scope Boundaries | Primary Purpose |
|---|---|---|
| **EAORCS Thin Client** | Publicly released versions of the thin-client CLI binary and local execution engine. | Local privilege boundaries, cryptographic token verification, and isolation mechanics. |
| **Public Federation APIs** | Public-facing REST endpoints exposed by `api.airroofers.eu`, `license.airroofers.eu`, and `discovery.airroofers.eu`. | Handshake authentication, schema validation, and access control models. |
| **Artifact Verification Services** | Public release signing verification logic and cryptographic hash verification at `downloads.airroofers.eu`. | Release integrity and signature validation mechanisms. |

---

## 3. Strict Out-of-Scope Targets and Prohibited Activities

> [!WARNING]
> Any security testing conducted against out-of-scope targets or involving prohibited techniques is **strictly excluded from safe harbor** and may violate criminal and civil statutes under French law, including Articles 323-1 et seq. of the French *Code pénal* (*atteintes aux systèmes de traitement automatisé de données*).

The following are **strictly out of scope and prohibited**:

1. **Customer Tenancies and Environments:** Testing against, targeting, or accessing any customer workspace, private repository, tenant data, or customer-hosted EAORCS cluster.
2. **Third-Party Infrastructure and Upstream Providers:** Any testing targeting third-party cloud hosting providers, DNS providers, payment processing networks, or external telemetry pipelines.
3. **Personal and Customer Data Access:** Any attempt to view, exfiltrate, copy, modify, or disclose personal data, customer confidential information, or proprietary source code. If personal data or customer secrets are inadvertently encountered, **testing must cease immediately**, the data must not be copied or distributed, and Air Roofers must be notified without delay.
4. **Denial of Service (DoS/DDoS):** Any testing that degrades, impairs, or overwhelms system availability, capacity, or performance.
5. **Automated and Volumetric Scanning:** Running automated vulnerability scanners, brute-force attacks, or high-concurrency fuzzing tools against production endpoints without prior written authorization from Air Roofers Security Operations.
6. **Social Engineering and Physical Intrusion:** Phishing, spear-phishing, pretexting, or physical access attempts targeting Air Roofers employees, executives, facilities, or datacenters.
7. **Persistence and Backdoors:** Installing rootkits, webshells, persistent listeners, administrative backdoors, or lateral movement tooling within any Air Roofers infrastructure.
8. **Credential Harvesting:** Intercepting, stealing, or utilizing stolen third-party credentials, administrative tokens, or private signing certificates.
9. **Extortion and Ransomware:** Deploying malicious encryption, demanding financial compensation in exchange for vulnerability silence, or threatening public disclosure.
10. **Cryptocurrency Mining:** Utilizing any computing resources of the Platform for unauthorized proof-of-work or cryptocurrency computation.

---

## 4. Legal Safe Harbor Framework

### 4.1 Conditions for Safe Harbor Protection
AIR ROOFERS formally commits that it **will not voluntarily initiate civil litigation and will not file a criminal complaint (*plainte pénale*)** against a security researcher, provided the researcher strictly adheres to all of the following cumulative conditions:

1. **Good-Faith Conduct:** The researcher conducts testing solely for the purpose of identifying and reporting vulnerabilities to enhance system security.
2. **Scope Compliance:** The researcher operates strictly within the authorized scope (§2) and abstains from all prohibited activities (§3).
3. **Minimal Exposure:** The researcher accesses only the minimum data necessary to establish a proof of concept, and halts testing immediately upon confirming a vulnerability.
4. **Immediate Data Deletion:** Any data, secrets, or tokens encountered during testing are kept strictly confidential, not shared with third parties, and permanently deleted upon confirmation of the report.
5. **Strict Coordinated Disclosure:** The researcher maintains absolute confidentiality regarding the findings and refrains from public disclosure until the expiration of the agreed coordinated disclosure period (§6).
6. **No Extortion:** The researcher makes no demand for financial payment, ransom, or commercial advantage as a condition of reporting or withholding disclosure.

### 4.2 Limits of Safe Harbor and Judicial Independence
- **Corporate Commitment Only:** Safe harbor represents Air Roofers' corporate commitment regarding its own legal actions. Under French law, the public prosecutor (*procureur de la République*) retains independent statutory authority to initiate criminal prosecutions (*opportunité des poursuites*, Art. 40-1 Code de procédure pénale); Air Roofers cannot grant statutory criminal immunity or bind judicial authorities.
- **Third-Party Rights:** Air Roofers cannot and does not indemnify or protect researchers against claims by third parties (including customers, hosting vendors, upstream ISPs, or telecommunications carriers) whose systems or data may have been affected.

---

## 5. Vulnerability Reporting and Triage Process

### 5.1 Submission Protocol
Vulnerabilities must be submitted by email to: **`security@airroofers.eu`**

To protect sensitive information, researchers are strongly urged to encrypt reports using our public PGP key available at:  
`https://security.airroofers.eu/pgp`

### 5.2 Required Information
Reports must include:
1. Detailed description of the vulnerability and its potential impact;
2. Step-by-step reproduction instructions and minimal proof-of-concept;
3. Specific affected component, software version, or endpoint;
4. Any relevant HTTP requests, response headers, or diagnostic logs;
5. Researcher's preferred attribution name or handle.

### 5.3 Response Commitments
Air Roofers commits to the following operational timeline:
- **Acknowledgement:** Within **72 hours** of report receipt.
- **Initial Triage & Validation:** Within **7 business days**, communicating severity classification.
- **Status Updates:** Periodic updates at least every **14 business days** during active remediation.
- **Remediation Target:** Confirmed Critical vulnerabilities are targeted for mitigation within **15 business days**; High vulnerabilities within **30 business days**; Medium and Low issues within scheduled release cycles.

---

## 6. Coordinated Disclosure Timeline

Air Roofers adheres to a **90-day standard coordinated disclosure timeline**:
- The researcher agrees not to publicly disclose vulnerability details, technical mechanics, or proof-of-concept exploits for a period of **ninety (90) days** from the date of triage confirmation, or until Air Roofers has deployed an effective security update, whichever occurs first.
- If remediation requires extensive coordination across upstream vendors or ecosystem partners, Air Roofers and the researcher may agree in writing to mutually extend the disclosure window.
- Upon release of the patch, Air Roofers will coordinate with the researcher regarding public advisory wording and mutual attribution.

---

## 7. Researcher Recognition and Bug Bounty Status

7.1 **Hall of Fame Attribution:** With the researcher's express written consent, Air Roofers will formally credit researchers who report valid, in-scope vulnerabilities in our public Security Hall of Fame and accompanying release notes.

7.2 **Bug Bounty Program:** Air Roofers currently operates a **recognition-based disclosure program** and does not provide financial bug bounties. Any future transition to a monetary bounty program will be formally published at `security.airroofers.eu/bounty`.

---

## 8. Governing Law

This Policy and any disputes arising in connection with vulnerability research activities conducted hereunder shall be governed exclusively by the **laws of France**, without regard to conflict of law principles. The courts of **Paris, France** shall have exclusive jurisdiction.

---

**AIR ROOFERS SASU**  
229 rue Saint-Honoré, 75001 Paris, France  
RCS Paris 943 432 534 | TVA: FR89943432534  
Security Operations & Threat Intelligence  

---
*Classification: ENTERPRISE | PUBLIC — PENDING FORMAL LEGAL REVIEW*  
*Internal Circulation Only — External Publication Requires Legal Authority Signature*
