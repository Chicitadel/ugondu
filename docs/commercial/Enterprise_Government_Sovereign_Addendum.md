/******************************************************************************
 * Project        : EAORCS — Enterprise Assurance, Orchestration & Certification System
 * Module         : Commercial Documentation
 * File           : Enterprise_Government_Sovereign_Addendum.md
 * Version        : 1.1.0-draft
 * Author         : Ignatus Chika Ujomor | Founder & System Architect
 * Organization   : AIR ROOFERS (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-09-24
 * Last Modified  : 2026-09-25
 * Classification : COMMERCIAL_AUTHORITY | DRAFT — PENDING LEGAL REVIEW
 *
 * Governance:
 * - Corporate Governance Baseline — Pending Formal Legal Review
 * - Architecture Controlled
 * - Protocol Frozen
 *
 * Standards:
 * - ISO 27001 / SOC 2 Type II
 * - ANSSI High-Assurance Security Standards (France)
 * - European Public Procurement Directives (Directive 2014/24/EU)
 * - NIST SP 800-53 / FIPS 140-3
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
> **LEGAL DRAFT BASELINE v1.1 — PENDING FORMAL LEGAL REVIEW**
> This Addendum establishes specialized contractual schedules for Enterprise, Public Sector, Sovereign, OEM, and MSP deployments. Formal legal review and bilateral execution via an authorized Order Form are required (Gate 7). Internal circulation and commercial governance only.

---

# Enterprise, Government & Sovereign Deployment Addendum

**Product:** EAORCS — Enterprise Assurance, Orchestration & Certification System  
**Licensor Entity:** AIR ROOFERS (Société par actions simplifiée à associé unique)  
**Registered Office:** 229 rue Saint-Honoré, 75001 Paris, France (RCS Paris 943 432 534)  
**TVA Intracommunautaire:** FR89943432534  
**Commercial Directorate:** `enterprise@airroofers.eu` | `sovereign@airroofers.eu`  
**Document Version:** 1.1.0-draft  
**Status:** DRAFT — PENDING FORMAL LEGAL REVIEW (Gate 7 — Human Legal Review)

---

## 1. Scope, Purpose, and Hierarchy

1.1 **Purpose:** This Addendum supplements and modifies the standard **EAORCS End User License Agreement (EULA)** and **Terms of Service** for Customers executing an Enterprise Order Form, Sovereign Contract, Government Procurement Agreement, or OEM/MSP Partnership Agreement.

1.2 **Contractual Precedence:** Where an authorized bilateral Order Form specifically references this Addendum, the terms of this Addendum shall supersede conflicting provisions in the standard EULA and Terms of Service, strictly to the extent of such express contradiction and subject to mandatory statutory law and the Customer DPA.

---

## 2. Schedule 1: Enterprise Deployments

Applicable to Customers licensed under the **ENTERPRISE Edition**:

2.1 **Multi-Cluster and Federated Scope:** The Enterprise Edition authorizes the deployment of the EAORCS thin client across all physical nodes, cloud clusters, and CI/CD pipelines owned or operated by the Customer's legal entity and its majority-owned subsidiaries.

2.2 **Enterprise Identity Federation:** Air Roofers provides integration support for corporate Single Sign-On (SAML 2.0 / OIDC) through `identity.airroofers.eu`, allowing role-based access control synchronized with the Customer's enterprise directory (Active Directory, Okta, Ping Identity).

2.3 **Negotiated Liability Cap:** Subject to mandatory statutory non-excludable liabilities, the parties may agree in the Enterprise Order Form to a customized financial liability cap (e.g., up to two times (2×) annual contract value).

2.4 **Security Audit Rights:** Upon thirty (30) business days' prior written notice and not more than once per calendar year, Enterprise Customers may conduct a remote security review of Air Roofers' compliance certifications, SOC 2 Type II reports, and third-party penetration test summaries under strict non-disclosure obligations.

---

## 3. Schedule 2: Government and Public Sector Deployments

Applicable to public authorities, state agencies, regional bodies, and public universities:

3.1 **Public Procurement and Administrative Rules:** Air Roofers warrants compliance with applicable European and French public procurement directives (Directive 2014/24/EU and French *Code de la commande publique*) applicable to its specific role as software licensor under the relevant tender documents and contract. Invoicing is conducted in accordance with statutory administrative payment rules (*Chorus Pro* for French public administrations).

3.2 **Strict Preservation of Intellectual Property Rights:**
- **No Implied Transfer:** In accordance with the constitutional principles established in the `EAORCS_IP_Ownership_and_Rights_Framework.md`, public-sector participation, public tenders, government grants, or administrative adoption **do NOT constitute an assignment or transfer of intellectual property rights** in the EAORCS Platform to the contracting authority.
- **Economic Rights Qualification:** Economic exploitation rights in the Platform are validly vested in AIR ROOFERS, subject to third-party rights, open-source licences, and founder moral rights. The government entity receives a non-exclusive license to use the software for its public mission.

3.3 **Public Records and Freedom of Information:** Audit reports and compliance summaries generated by the public authority using EAORCS may constitute public or administrative records to the extent required by applicable law, without conferring title to the underlying software engine, verification algorithms, or proprietary templates.

---

## 4. Schedule 3: Sovereign and High-Assurance Deployments

Applicable to Customers licensed under the **SOVEREIGN Edition** (defense, national security, intelligence, critical national infrastructure). Sovereign deployments are classified under one of two operating models:

### 4.1 Model A: Customer-Hosted / Air-Gapped Deployment
For maximum sovereignty and zero-trust environments:
- **Zero Outbound Connectivity:** Operates with 100% disconnected operations. The thin client and local nodes require no connection to `airroofers.eu` or external cloud services.
- **Offline Entitlement Verification:** Cryptographic licensing is maintained via air-gapped, pre-signed cryptographic certificate bundles issued by Mandatag via secure physical or out-of-band media.
- **Telemetry Suppression:** Outbound telemetry transmission is completely disabled at runtime.
- **Data Residency:** 100% of customer data, audit ledgers, cryptographic proofs, and metadata remain strictly localized within the Customer's physical sovereign facilities.

### 4.2 Model B: Air Roofers-Hosted / Dedicated Sovereign Cloud
For sovereign customers requiring managed cloud infrastructure:
- **Dedicated Single-Tenant Enclaves:** Infrastructure is logically and physically isolated from commercial multi-tenant clusters.
- **Sovereign Geographic Perimeter:** Hosted strictly within designated national borders (e.g., France/EEA) within SecNumCloud or sovereign-certified data centers.
- **Dedicated Key Management:** Customer maintains exclusive control or custody of root encryption keys via dedicated Hardware Security Modules (HSMs).

4.3 **Dedicated Engineering & Security Clearance:** Sovereign agreements include access to dedicated, named Air Roofers senior engineers holding appropriate security clearances, subject to bilateral clearance agreements.

---

## 5. Schedule 4: OEM (Original Equipment Manufacturer) Distribution Overlay

Applicable to partners embedding EAORCS within third-party hardware or software appliances:

5.1 **Embedding Grant:** Grants the OEM Partner a non-exclusive right to embed the compiled EAORCS thin-client binary as an integrated subcomponent of the Partner's commercial product.

5.2 **Downstream Licensing Protections:** The OEM Partner must pass through downstream license terms no less restrictive than the EAORCS EULA, prohibiting reverse engineering and protecting Air Roofers' intellectual property.

5.3 **Branding and Trademarks:** Any co-branding or "Powered by EAORCS" badge must comply with the Air Roofers Brand Identity Guidelines. The Partner acquires no trademark rights.

5.4 **Royalty Reporting and Verification:** OEM Partners report runtime unit distribution and settle royalties via AeroBill on a quarterly basis.

---

## 6. Schedule 5: MSP (Managed Service Provider) Partnership Overlay

Applicable to service providers utilizing EAORCS to deliver managed assurance services to end clients:

6.1 **Multi-Tenant Administration:** Authorizes the MSP to provision, manage, and monitor segregated tenant workspaces for their distinct end clients.

6.2 **Client Data Isolation:** The MSP warrants that it maintains strict logical and cryptographic segregation between end-client environments.

6.3 **Support Demarcation:** The MSP provides Tier 1 and Tier 2 operational support directly to its end clients; Air Roofers provides Tier 3 engineering escalation support to the MSP in accordance with the Support SLA.

---

**AIR ROOFERS**  
229 rue Saint-Honoré, 75001 Paris, France  
RCS Paris 943 432 534 | TVA: FR89943432534  
Commercial Directorate | Enterprise & Sovereign Markets  

---
*Classification: COMMERCIAL_AUTHORITY | DRAFT — PENDING FORMAL LEGAL REVIEW*  
*Corporate Governance Baseline — Internal Circulation Only — External Publication Requires Legal Authority Signature*
