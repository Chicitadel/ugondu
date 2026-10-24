/******************************************************************************
 * Project        : EAORCS — Enterprise Assurance, Orchestration & Certification System
 * Module         : Commercial Documentation
 * File           : Cookie_Policy.md
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
 * - GDPR (Regulation (EU) 2016/679)
 * - ePrivacy Directive (Directive 2002/58/EC as amended by Directive 2009/136/EC)
 * - French Data Protection Law (Loi n° 78-17 du 6 janvier 1978 modifiée, Art. 82)
 * - CNIL Guidelines and Recommendations on Cookies and Trackers (Délibérations n° 2020-091 et 2020-092)
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
> This policy governs all cookies, HTTP headers, session tokens, and local storage mechanisms utilized across the Air Roofers web platforms and consoles. Formal sign-off by legal counsel is required prior to external publication at `airroofers.eu/cookies` (Gate 7). Internal circulation and engineering governance only.

---

# Cookie & Tracking Technologies Policy

**Product:** EAORCS — Enterprise Assurance, Orchestration & Certification System  
**Data Controller:** AIR ROOFERS (Société par actions simplifiée à associé unique)  
**Registered Office:** 229 rue Saint-Honoré, 75001 Paris, France (RCS Paris 943 432 534)  
**TVA Intracommunautaire:** FR89943432534  
**Contact:** `privacy@airroofers.eu`  
**Document Version:** 1.1.0-draft  
**Status:** DRAFT — PENDING FORMAL LEGAL REVIEW (Gate 7 — Human Legal Review)

---

## 1. Introduction and Scope

AIR ROOFERS ("Air Roofers", "we", "us") is dedicated to upholding the highest standards of data privacy and transparency. This Cookie Policy explains how and why cookies, web storage (HTML5 `localStorage` and `sessionStorage`), cryptographic authentication tokens, and related tracking technologies are deployed when you interact with the EAORCS web portals, documentation hubs, and federated service consoles (`airroofers.eu`, `hub.airroofers.eu`, `identity.airroofers.eu`, `license.airroofers.eu`, `billing.airroofers.eu`, and related subdomains).

This Policy is formulated in strict adherence to Article 82 of the French *Loi Informatique et Libertés*, the European ePrivacy Directive, the GDPR, and the guidelines and recommendations issued by the French Data Protection Authority (**CNIL** — Délibérations n° 2020-091 et 2020-092).

---

## 2. What Are Cookies and Local Trackers?

A cookie is a small data file deposited and read by your browser upon visiting a website. Equivalent technologies include local storage (`localStorage`, `sessionStorage`), software development kits (SDKs), and HTTP session tokens. In this Policy, all such storage mechanisms are referred to collectively as "Cookies".

Cookies may be:
- **Session Cookies:** Temporary files automatically deleted when you close your browser;
- **Persistent Cookies:** Files that remain stored on your terminal equipment until their configured expiration date or until manually removed by you;
- **First-Party Cookies:** Set directly by the Air Roofers domain you are visiting;
- **Third-Party Cookies:** Set by external partners or infrastructure providers.

---

## 3. Categories of Cookies Deployed

We categorize the cookies utilized across our ecosystem into the following functional groups:

### 3.1 Category 1: Strictly Necessary / Technical Cookies (Consent Exempt)
These cookies are indispensable for the operation, security, and authentication of the Air Roofers platform. Pursuant to Article 82 of the French *Loi Informatique et Libertés* and CNIL guidelines, **these cookies are exempt from the requirement of prior user consent** because their sole purpose is to enable or facilitate electronic communication, or they are strictly necessary to provide an online service explicitly requested by the user.

| Cookie / Token Name | Originating Domain | Purpose & Function | Retention Period | Consent Required? |
|---|---|---|---|---|
| `token` / `auth_session` | `.airroofers.eu` | Identity session token (RS256 JWT) securing authenticated access to console and API endpoints via `identity.airroofers.eu`. | Session / 12 hours | **NO (Exempt)** |
| `csrf_token` | Specific subdomain | Protection against Cross-Site Request Forgery (CSRF) attacks on form submissions. | Session | **NO (Exempt)** |
| `consent_preferences` | `airroofers.eu` | Stores the user's cookie consent choices (accept/reject) to avoid prompting on every page load. | 6 months | **NO (Exempt)** |
| `lb_affinity` | Platform edge | Ensures load-balancer stickiness to maintain continuity of user requests during active sessions. | Session | **NO (Exempt)** |

### 3.2 Category 2: UI Personalization & Expressed Preferences (CNIL Consent-Exempt Doctrine)
In accordance with CNIL Délibération n° 2020-091 (Section 5) and guidelines on trackers, cookies whose exclusive purpose is to remember interface preferences actively and expressly selected by the user (such as display language or color theme) are **exempt from prior consent**, provided they do not serve any cross-site tracking purpose:

| Cookie Name | Originating Domain | Purpose & Function | Retention Period | Consent Required? |
|---|---|---|---|---|
| `platform_lang` | `airroofers.eu` | Stores the user's explicit language selection (e.g., FR, EN) to maintain display consistency. | 6 months | **NO (CNIL Exempt — User-Requested)** |
| `ui_theme` | `hub.airroofers.eu` | Stores user's explicit display theme preference (Dark Mode / Light Mode). | 12 months | **NO (CNIL Exempt — User-Requested)** |
| `active_workspace_view` | `hub.airroofers.eu` | Preserves console table filters and layout chosen by the user during navigation. | 30 days | **NO (CNIL Exempt — User-Requested)** |

### 3.3 Category 3: Analytical and Performance Cookies (Consent Required)
Used exclusively to compile aggregated, non-identifying telemetry regarding site traffic, popular documentation topics, page load speeds, and navigation bottlenecks to guide technical optimizations.
- Where analytical tooling is deployed, Air Roofers configures IP anonymization (truncation of the last octet) and disables cross-site tracking.
- Where required by CNIL guidance, prior consent is obtained via the consent banner.

### 3.4 Strict Prohibition on Advertising Trackers
> [!IMPORTANT]
> **Air Roofers DOES NOT deploy advertising cookies, behavioral tracking pixels, third-party remarketing scripts, or data-broker trackers.** We do not sell or monetize personal browsing data.

---

## 4. Cookie Lifespan and Retention Limits

In strict compliance with CNIL recommendations:
1. **Consent Lifespan:** Your choice regarding cookies (whether acceptance or refusal) is retained for a maximum duration of **six (6) months**. Upon expiration, the consent banner will be re-presented to confirm your choices.
2. **Analytical Cookie Lifespan:** Non-essential analytical cookies have a maximum lifespan of **thirteen (13) months** from deposit, and their collected metric data is deleted or permanently aggregated thereafter.

---

## 5. Managing Your Cookie Preferences

You maintain complete control over the cookies stored on your terminal equipment through the following mechanisms:

### 5.1 Air Roofers Cookie Preference Center
You can access our interactive Cookie Preference Center at any time by clicking the **"Cookie Settings" (*Gestion des cookies*)** link located in the footer of all Air Roofers web pages. The center allows you to grant, review, customize, or withdraw your consent on a granular category-by-category basis. **Refusing cookies is as simple as accepting them, in accordance with CNIL requirements.**

### 5.2 Browser Configuration
You may configure your browser software to accept, reject, or prompt you prior to storing any cookie:
- **Google Chrome:** Settings > Privacy and Security > Cookies and other site data
- **Mozilla Firefox:** Options > Privacy & Security > Cookies and Site Data
- **Apple Safari:** Preferences > Privacy > Block all cookies
- **Microsoft Edge:** Settings > Privacy, search, and services > Cookies and site permissions

*Note: Disabling strictly necessary cookies in your browser settings will impair platform functionality and prevent authenticated login to the EAORCS consoles.*

---

## 6. Contact and Data Protection

For any inquiries regarding this Cookie Policy or our data protection practices, please contact:

**AIR ROOFERS**  
229 rue Saint-Honoré, 75001 Paris, France  
Email: `privacy@airroofers.eu`  

You also have the right to lodge a complaint with the French supervisory authority:  
**CNIL (Commission Nationale de l'Informatique et des Libertés)**  
3 Place de Fontenoy, TSA 80715, 75334 Paris Cedex 07, France | `https://www.cnil.fr`

---

*Classification: COMMERCIAL_AUTHORITY | DRAFT — PENDING FORMAL LEGAL REVIEW*  
*Internal Circulation Only — External Publication Requires Legal Authority Signature*
