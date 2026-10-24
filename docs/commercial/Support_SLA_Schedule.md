/******************************************************************************
 * Project        : EAORCS — Enterprise Assurance, Orchestration & Certification System
 * Module         : Commercial Documentation
 * File           : Support_SLA_Schedule.md
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
 * - French Civil Code (Force majeure, Art. 1218)
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
> This document defines operational service level targets and contractual service credit remedies. Final approval by corporate legal counsel is mandatory prior to external commercial execution (Gate 7). Internal circulation and engineering governance only.

---

# Support & Service Level Agreement (SLA) Schedule

**Product:** EAORCS — Enterprise Assurance, Orchestration & Certification System  
**Service Provider:** AIR ROOFERS (Société par actions simplifiée à associé unique)  
**Registered Office:** 229 rue Saint-Honoré, 75001 Paris, France (RCS Paris 943 432 534)  
**Support Operations:** `support@airroofers.eu` | Portal: `support.airroofers.eu`  
**Document Version:** 0.3.0-draft  
**Status:** DRAFT — PENDING FORMAL LEGAL REVIEW (Gate 7 — Human Legal Review)

---

## 1. Scope and Applicability

This Support & Service Level Agreement Schedule ("SLA") establishes the operational availability commitments, technical incident response times, and service credit remedies provided by AIR ROOFERS ("Air Roofers", "we", "us") for the EAORCS Platform and its associated federated backend services.

This SLA applies strictly to Customers holding an active, paid commercial Entitlement (PROFESSIONAL, BUSINESS, ENTERPRISE, SOVEREIGN). The COMMUNITY Edition and DEVELOPER Edition are provided on an unmanaged, best-effort basis without financial availability guarantees.

---

## 2. Edition Service Level Commitments

All availability commitments and support targets are calibrated across licensed Editions as follows:

| Edition | Guaranteed Monthly Uptime | Initial Response (P1 Critical) | Initial Response (P2 High) | Initial Response (P3 Medium) | Support Channels Available | Support Hours Coverage |
|---|---|---|---|---|---|---|
| **COMMUNITY** | No Guarantee | No SLA | No SLA | No SLA | Community Forum | Best-effort / Unmonitored |
| **DEVELOPER** | No Uptime SLA | 48 business hrs | No SLA | No SLA | Email | Mon–Fri, 09:00–18:00 Europe/Paris |
| **PROFESSIONAL** | **99.0%** | **24 hours** | 72 hours | No SLA | Email + Ticket Portal | Mon–Fri, 09:00–18:00 Europe/Paris |
| **BUSINESS** | **99.5%** | **8 hours** | 24 hours | 72 hours | Dedicated Ticket Queue | Mon–Fri, 08:00–20:00 Europe/Paris |
| **ENTERPRISE** | **99.9%** | **4 hours** | 8 hours | 24 hours | Dedicated CSM + Phone + Ticket | 24/7/365 (P1/P2); Business (P3/P4) |
| **SOVEREIGN** | **99.99%** *(Dedicated Cloud)* | **1 hour** | 4 hours | By Agreement | Dedicated Engineering Contact | 24/7/365 All Priorities |

*Response times represent the elapsed duration between initial ticket logging through authorized channels and first substantive diagnostic response by an Air Roofers engineer. Business hours are based on the Europe/Paris timezone (CET/CEST). For Sovereign air-gapped deployments, availability of local customer hardware is excluded; the Sovereign SLA applies to dedicated cloud deployments or engineering response commitments as set forth in the executed Order Form.*

---

## 3. Incident Classification Matrix

Incident severity is assessed objectively during triage based on operational impact:

| Priority | Label | Operational Criteria | Example Scenarios |
|---|---|---|---|
| **P1** | **Critical — Outage** | Core Platform capability or certification service is completely down or inaccessible across an entire production cluster; severe data integrity risk. | Complete failure of `license.airroofers.eu` or `api.airroofers.eu`; inability to mint or verify release certificates. |
| **P2** | **High — Degraded** | Major functional capability severely impaired; business operations significantly hindered without effective temporary workaround. | Automated verification pipeline halting intermittent jobs; telemetry backlog exceeding threshold; latency degradation >500%. |
| **P3** | **Medium — Minor** | Non-critical component or localized feature impaired; standard operations proceed with minimal operational impact or viable workaround. | Console UI rendering discrepancy; minor schema formatting warnings; scheduled reporting export delays. |
| **P4** | **Low — Inquiry** | General questions, feature enhancement requests, documentation clarifications, or guidance. | API integration questions; rate card inquiries; SDK configuration best practices. |

---

## 4. Uptime Calculation and Measurement Methodology

4.1 **Measurement Window:** Uptime is measured continuously over each calendar month (from 00:00:00 UTC on the first day to 23:59:59 UTC on the final day).

4.2 **Measurable Endpoints:** Availability is measured against the following production endpoints:
- `identity.airroofers.eu` (Authentication & token verification);
- `license.airroofers.eu` (Mandatag entitlement checking & cryptographic proofs);
- `billing.airroofers.eu` (AeroBill metering & billing APIs);
- `downloads.airroofers.eu` (Authenticated binary delivery gateway).

4.3 **Calculation Formula:**
$$\text{Monthly Uptime \%} = \left( \frac{\text{Total Operational Minutes} - \text{Unscheduled Downtime Minutes}}{\text{Total Operational Minutes}} \right) \times 100$$

4.4 **Authoritative Source:** Availability measurements are determined using Air Roofers internal telemetry metrics corroborated by external synthetic monitoring points published at `status.airroofers.eu`.

---

## 5. Contractual Exclusions from Uptime Calculations

The following events and durations are explicitly excluded from the calculation of Unscheduled Downtime:

1. **Scheduled Maintenance:** Planned maintenance windows announced with at least seventy-two (72) hours' prior notice via `status.airroofers.eu` or email notification, typically scheduled during off-peak hours (22:00–06:00 Europe/Paris).
2. **Emergency Security Mitigation:** Unplanned maintenance required to deploy urgent zero-day patches, isolate critical infrastructure, or neutralize imminent cybersecurity threats, with notice provided as soon as practicable.
3. **Customer Environment and Configuration:** Failures, latency, or outages caused by Customer-managed infrastructure, local network failure, firewall misconfiguration, corrupted local workspaces, or unsupported client runtimes.
4. **Third-Party Network and Transit Failures:** Major upstream telecommunications failures, DNS root outage, BGP routing disruptions, or cloud infrastructure provider global outages beyond the reasonable control of Air Roofers.
5. **Unauthorized Usage:** Outages caused by usage exceeding agreed throughput limits, unauthorized concurrency load testing, or violations of the Acceptable Use Policy.
6. **Force Majeure:** Events satisfying the legal criteria of *force majeure* under Article 1218 of the French *Code civil* (acts of war, state of emergency, natural disasters, national infrastructure sabotage).

---

## 6. Service Credit Remedy Framework

### 6.1 Legal Nature of Service Credits
The parties expressly agree that Service Credits:
- Constitute a **contractual price adjustment** for service degradation;
- Do **not** constitute cash refunds, liquidated damages, bank payments, or an admission of legal fault or contractual breach;
- Constitute the Customer's **sole and exclusive monetary remedy** for any failure by Air Roofers to satisfy guaranteed uptime targets, without prejudice to statutory consumer rights or contractual termination rights for persistent material breach.

### 6.2 Service Credit Tiers (Monthly Invoiced Fee Percentage)

For eligible paid subscriptions, Service Credits are calculated as a percentage of the pro-rated monthly fee attributable to the affected service:

| Monthly Uptime Achieved | Applicable Service Credit (Percentage of Monthly Fee) |
|---|---|
| Less than guaranteed target, but $\ge 98.0\%$ | **10%** credit |
| Less than $98.0\%$, but $\ge 95.0\%$ | **25%** credit |
| Less than $95.0\%$ | **50%** credit (Maximum aggregate monthly credit cap) |

### 6.3 Claim and Application Procedure
To receive a Service Credit:
1. The Customer must submit a formal written claim to `billing@airroofers.eu` within **thirty (30) calendar days** following the end of the affected calendar month;
2. The claim must include ticket reference numbers, dates, error logs, and affected correlation identifiers;
3. Validated credits will be applied automatically against the next scheduled commercial invoice issued by AeroBill. Service credits cannot be exchanged for cash, transferred, or assigned.

---

## 7. Enterprise and Sovereign Customization

7.1 **Bespoke Overrides:** For Enterprise and Sovereign Customers, bespoke availability targets (including up to 99.999% high-availability architectures), customized financial penalty schedules, dedicated air-gap response protocols, or on-site engineering intervention may be established via an executed **Enterprise Order Form** or **Sovereign Addendum**.

7.2 **Precedence:** Where a fully executed Enterprise Agreement specifically contradicts this Schedule, the terms of the Enterprise Agreement shall take precedence.

---

**AIR ROOFERS SASU**  
229 rue Saint-Honoré, 75001 Paris, France  
RCS Paris 943 432 534 | TVA: FR89943432534  
Operations & Customer Assurance Directorate  

---
*Classification: COMMERCIAL_AUTHORITY | DRAFT — PENDING FORMAL LEGAL REVIEW*  
*Internal Circulation Only — External Publication Requires Legal Authority Signature*
