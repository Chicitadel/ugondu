/******************************************************************************
 * Project        : EAORCS — Enterprise Assurance, Orchestration & Certification System
 * Module         : Intellectual Property & Corporate Governance
 * File           : EAORCS_IP_Chain_of_Title_Register.md
 * Version        : 1.1.0-draft
 * Author         : Ignatus Chika Ujomor | Founder & System Architect
 * Organization   : AIR ROOFERS (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-09-24
 * Last Modified  : 2026-09-25
 * Classification : CONFIDENTIAL | INTERNAL IP GOVERNANCE AUDIT REGISTER
 *                  CORPORATE IP GOVERNANCE BASELINE — PENDING FORMAL LEGAL VALIDATION
 *
 * Governance:
 * - Corporate IP Governance Baseline — Pending Formal Legal Validation
 * - Architecture Controlled
 * - Protocol Frozen
 *
 * Standards:
 * - French Intellectual Property Code (Code de la propriété intellectuelle, Art. L. 131-2, L. 131-3)
 * - ISO 27001 Annex A.8 (Asset Management)
 * - OpenChain (ISO/IEC 5230 - Open Source License Compliance)
 * - Software Package Data Exchange (SPDX v2.3)
 *
 * Signatures:
 * - Architecture Authority: Ignatus Chika Ujomor
 * - Corporate Authority: AIR ROOFERS SASU
 * - Governance Authority: Air Roofers Corporate Governance
 * - Legal Authority: PENDING FORMAL AUDIT (Gate 7 — Human Legal Review)
 *
 * Copyright (c) 2025-2026 AIR ROOFERS. Moral rights reserved by Ignatus Chika Ujomor.
 ******************************************************************************/

---

# EAORCS — Enterprise Assurance, Orchestration & Certification System
## Intellectual Property Chain-of-Title & Asset Register

**Entity:** AIR ROOFERS (Société par actions simplifiée à associé unique)  
**Registered Office:** 229 rue Saint-Honoré, 75001 Paris, France (RCS Paris 943 432 534)  
**TVA Intracommunautaire:** FR89943432534  
**Classification:** STRICTLY CONFIDENTIAL — INTERNAL IP GOVERNANCE AUDIT REGISTER  
**Document Version:** 1.1.0-draft  
**Status:** CORPORATE IP GOVERNANCE BASELINE — PENDING FORMAL LEGAL VALIDATION

> **⚠ STATUS NOTICE:** All proprietary module entries carry status `ASSIGNMENT_PENDING` pending formal execution and counsel review of the EAORCS Founder IP Contribution and Assignment Deed (AR-IP-2025-01). Status shall transition to `ASSIGNED` only upon formal execution of that deed, and to `VERIFIED` only after qualified legal counsel review. Trademark entries carry status `CLAIMED_COMMERCIAL_MARK` — no INPI or EUIPO registration numbers are on record at the date of this version.

---

## 0. Title Status Reference

The following controlled status model governs all entries in this Register:

| Status | Meaning |
|:---|:---|
| `IDENTIFIED` | Asset catalogued; authorship research in progress |
| `AUTHORED` | Author confirmed; no assignment instrument yet drafted |
| `ASSIGNMENT_PENDING` | Draft deed exists (AR-IP-2025-01); not yet formally executed or counsel-validated |
| `ASSIGNED` | Deed formally executed, dated, and signed by both parties |
| `VERIFIED` | Deed reviewed and validated by qualified French *avocat à la cour* |
| `CLAIMED_COMMERCIAL_MARK` | Mark is actively used commercially; no INPI/EUIPO registration number on record |
| `APPLICATION_PENDING` | Trademark application filed; registration number assigned but grant pending |
| `REGISTERED` | Trademark registered; registration number on record — **MUST NOT be used without a registration number** |

---

## 1. Regulatory Purpose and Legal Context

Under Article L. 131-3 of the French *Code de la propriété intellectuelle*, lawful proof of copyright ownership and exploitation rights requires explicit, written chain-of-title documentation establishing the origin, authorship, and transfer terms for each software asset.

This Register maintains the definitive inventory of proprietary modules, software components, supporting legal instruments, and open-source dependencies constituting the EAORCS Platform as at release tag **`v2026.3.1-LTS`**. The OSS audit in §4 is directly linked to the SBOM and package lock file for that release tag.

The parties intend to maintain and record formal written chain-of-title instruments for all proprietary assets in compliance with French CPI Articles L. 131-2 and L. 131-3. Until the Founder IP Contribution and Assignment Deed (AR-IP-2025-01) is formally executed, all proprietary module entries carry the status `ASSIGNMENT_PENDING`.

---

## 2. Proprietary Software Module Register

> **Status Note:** All entries below carry status `ASSIGNMENT_PENDING`. The supporting instrument (AR-IP-2025-01) exists as a corporate governance baseline draft. It has not been formally executed. Status will transition to `ASSIGNED` upon execution and to `VERIFIED` upon counsel validation.

| Module Identifier | Component / Subsystem | Origin & Creation | Primary Author | Intended Economic Rights Holder | Supporting Instrument | Status |
|:---|:---|:---|:---|:---|:---|:---|
| **MOD-001** | EAORCS Orchestration Core & State Machine (`engine/`) | Original development — `v2026.3.1-LTS` | Ignatus Chika Ujomor | AIR ROOFERS | Founder Contribution Deed AR-IP-2025-01 (draft) | `ASSIGNMENT_PENDING` |
| **MOD-002** | CLI Runtime & DevEx Commands (`cli/`, `bin/`) | Original development — `v2026.3.1-LTS` | Ignatus Chika Ujomor | AIR ROOFERS | Founder Contribution Deed AR-IP-2025-01 (draft) | `ASSIGNMENT_PENDING` |
| **MOD-003** | EAORCS Release Gate (`bin/release_gate.js`) | Original development — `v2026.3.1-LTS` | Ignatus Chika Ujomor | AIR ROOFERS | Founder Contribution Deed AR-IP-2025-01 (draft) | `ASSIGNMENT_PENDING` |
| **MOD-004** | Lifecycle Acceptance Test Suite (`tests/`) | Original development — `v2026.3.1-LTS` | Ignatus Chika Ujomor | AIR ROOFERS | Founder Contribution Deed AR-IP-2025-01 (draft) | `ASSIGNMENT_PENDING` |
| **MOD-005** | AeroBill Billing Integration (`engine/billing/`) | Original development — `v2026.3.1-LTS` | Ignatus Chika Ujomor | AIR ROOFERS | Founder Contribution Deed AR-IP-2025-01 (draft) | `ASSIGNMENT_PENDING` |
| **MOD-006** | Mandatag Entitlement Integration (`engine/licensing/`) | Original development — `v2026.3.1-LTS` | Ignatus Chika Ujomor | AIR ROOFERS | Founder Contribution Deed AR-IP-2025-01 (draft) | `ASSIGNMENT_PENDING` |
| **MOD-007** | Cryptographic Verification Layer (`engine/crypto/`) | Original development — `v2026.3.1-LTS` | Ignatus Chika Ujomor | AIR ROOFERS | Founder Contribution Deed AR-IP-2025-01 (draft) | `ASSIGNMENT_PENDING` |
| **MOD-008** | Schema & Metadata Framework (`schemas/`) | Original development — `v2026.3.1-LTS` | Ignatus Chika Ujomor | AIR ROOFERS | Founder Contribution Deed AR-IP-2025-01 (draft) | `ASSIGNMENT_PENDING` |
| **MOD-009** | API Definitions (`api/`) | Original development — `v2026.3.1-LTS` | Ignatus Chika Ujomor | AIR ROOFERS | Founder Contribution Deed AR-IP-2025-01 (draft) | `ASSIGNMENT_PENDING` |
| **MOD-010** | Documentation & Specifications (`docs/`) | Original development — `v2026.3.1-LTS` | Ignatus Chika Ujomor | AIR ROOFERS | Founder Contribution Deed AR-IP-2025-01 (draft) | `ASSIGNMENT_PENDING` |

---

## 3. Trademarks, Brands, and Domain Names

> **Status Note:** No INPI or EUIPO trademark registration numbers are on record for AIR ROOFERS or EAORCS at the date of this version. All marks carry status `CLAIMED_COMMERCIAL_MARK`. The status `REGISTERED` must not be used in any document until a registration number is on record and cited.

| Asset / Mark | Type | Jurisdiction | Claimed Owner | Operational Status | Title Status |
|:---|:---|:---|:---|:---|:---|
| **AIR ROOFERS** | Corporate tradename actively used commercially | France / EU | AIR ROOFERS (RCS Paris 943 432 534) | Active commercial use | `CLAIMED_COMMERCIAL_MARK` |
| **EAORCS** | Product tradename actively used commercially | France / EU / Global | AIR ROOFERS | Active commercial use | `CLAIMED_COMMERCIAL_MARK` |
| **airroofers.eu** | Primary domain name | EURid (EU) | AIR ROOFERS | Active production backbone | Registered domain — EURid |
| **airroofers.fr** | National domain name | AFNIC (France) | AIR ROOFERS | Active national redirect | Registered domain — AFNIC |

---

## 4. Open-Source Software (OSS) Dependency Compliance Catalogue

In accordance with OpenChain (ISO/IEC 5230) standards, the open-source dependencies listed below were audited as at release tag **`v2026.3.1-LTS`** (package lock file and SBOM artifact for that tag are the authoritative audit reference). None of the incorporated OSS components impose viral copyleft obligations (e.g., GPL/AGPL) on the proprietary server-side or core engine of EAORCS:

| Package Name | Audited Version (v2026.3.1-LTS) | Applicable License | Copyright Holder / Origin | Viral Copyleft Risk? | Distribution Compatibility |
|:---|:---|:---|:---|:---|:---|
| `pypdf` | Runtime CLI | BSD-3-Clause | PyPDF Authors | **NO** | Permitted in commercial distribution |
| `qs` | HTTP Utilities | BSD-3-Clause | Jordan Harband | **NO** | Permitted in commercial distribution |
| `ms` | Time Formatting | MIT License | Vercel, Inc. | **NO** | Permitted in commercial distribution |
| `cookie` | Cookie Serializer | MIT License | Roman Shtylman | **NO** | Permitted in commercial distribution |
| `deepmerge` | Schema Utility | MIT License | James Hall | **NO** | Permitted in commercial distribution |
| `rollup` | Bundling Pipeline | MIT License | Rich Harris & Rollup Contributors | **NO (Build-time only)** | Permitted |
| `esbuild` | Build Optimizer | MIT License | Evan Wallace | **NO (Build-time only)** | Permitted |
| `vite` | Tooling Runtime | MIT License | Yuxi (Evan) You & Vite Contributors | **NO (Build-time only)** | Permitted |

*Full license texts and attribution notices are compiled and delivered in `dist/EAORCS-Enterprise/licenses/LICENSE.md` for the `v2026.3.1-LTS` release. This catalogue must be re-verified against the updated package lock and SBOM at each subsequent LTS release tag.*

---

## 5. Audit Protocols and Governance Cadence

5.1 **Quarterly Title Verification:** The Corporate Governance Directorate conducts a quarterly review of this Register against git commit author provenance and signed contributor agreements.

5.2 **Zero Dependency Vulnerability Standard:** All dependencies listed in §4 are audited through automated Software Bill of Materials (SBOM) generation and vulnerability scanning (OWASP Dependency-Check) prior to every LTS release tag. The SBOM for `v2026.3.1-LTS` is the evidential baseline for this version of the Register.

5.3 **Archival & Chain-of-Title Safeguard:** All signed Founder Contribution Deeds, transfer certificates, and trademark registration certificates shall be permanently archived in the Air Roofers Corporate Records under the supervision of the Président. Until formal execution, the draft deed (AR-IP-2025-01) is retained as a corporate governance baseline only.

5.4 **Status Transition Gate:** Entries transition from `ASSIGNMENT_PENDING` to `ASSIGNED` only upon formal execution of the Founder IP Contribution and Assignment Deed (AR-IP-2025-01) by both parties. Transition to `VERIFIED` requires review by qualified French *avocat à la cour* (Gate 7 — Human Legal Review, Remediation Plan v0.5).

---

## 6. Change Record

| Version | Date | Author | Change |
|:---|:---|:---|:---|
| 1.0.0 | 2026-09-24 | Ignatus Chika Ujomor / AIR ROOFERS Corporate Governance | Initial creation |
| 1.1.0-draft | 2026-09-25 | AIR ROOFERS Corporate Governance | Gate 2 remediation: controlled status model (ASSIGNMENT_PENDING); trademark CLAIMED_COMMERCIAL_MARK status; OSS audit linked to v2026.3.1-LTS SBOM; status reference table added |

---

**AIR ROOFERS**  
Corporate Governance & Legal Records Office  
229 rue Saint-Honoré, 75001 Paris, France  
RCS Paris 943 432 534

---
*Classification: CONFIDENTIAL | INTERNAL IP GOVERNANCE AUDIT REGISTER*  
*Corporate IP Governance Baseline — Pending Formal Legal Validation*  
*Copyright (c) 2025-2026 AIR ROOFERS. Moral rights reserved by Ignatus Chika Ujomor under French CPI Art. L. 121-1.*
