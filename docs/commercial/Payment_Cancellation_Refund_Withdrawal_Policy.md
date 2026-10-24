/******************************************************************************
 * Project        : EAORCS — Enterprise Assurance, Orchestration & Certification System
 * Module         : Commercial Documentation
 * File           : Payment_Cancellation_Refund_Withdrawal_Policy.md
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
 * - French Consumer Code (Code de la consommation, Art. L. 221-5, L. 221-18, L. 221-25, L. 221-28, L. 224-25-1 et seq., L. 616-1)
 * - Directive 2011/83/EU (Consumer Rights Directive)
 * - Directive (EU) 2019/770 (Digital Content and Digital Services Directive)
 * - French Civil Code (Art. 1366 — Electronic Proof)
 * - EU VAT Directives
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
> This policy governs all commercial payments, subscription renewals, statutory withdrawal procedures, conformity remedies, and contractual refunds across the Air Roofers federated platform. Formal sign-off by qualified French counsel (*avocat*) is mandatory prior to external commercial implementation or consumer sales (Gate 7). Internal circulation and engineering governance only.

---

# Commercial Payment, Cancellation, Refund & Statutory Withdrawal Policy

**Product:** EAORCS — Enterprise Assurance, Orchestration & Certification System  
**Commercial & Billing Authority:** AeroBill (`billing.airroofers.eu`)  
**Operating Company:** AIR ROOFERS (Société par actions simplifiée à associé unique)  
**Registered Office:** 229 rue Saint-Honoré, 75001 Paris, France (RCS Paris 943 432 534)  
**TVA Intracommunautaire:** FR89943432534  
**Commercial Inquiries:** `billing@airroofers.eu` | `commercial@airroofers.eu`  
**Document Version:** 1.1.0-draft  
**Status:** DRAFT — PENDING FORMAL LEGAL REVIEW (Gate 7 — Human Legal Review)

---

## 1. Scope, Federation Architecture, and Billing Authority

1.1 **Federation Architecture:** In strict alignment with the governing architectural principles of the Air Roofers platform:
- **AeroBill (`billing.airroofers.eu`)** is the sole and exclusive commercial billing, payment processing, tax accounting, and refund authority.
- **Mandatag (`license.airroofers.eu`)** is the centralized entitlement and cryptographic license authority.
- **EAORCS** enforces client-side entitlements and executes technical assurance workloads, but does **not** independently sell, bill, renew, modify, or refund entitlements.

1.2 **Scope:** This Policy applies to all commercial transactions, software subscriptions, perpetual licenses, and metered usage fees entered into with AIR ROOFERS ("Air Roofers", "we", "us") for the EAORCS Platform and associated federated services.

---

## 2. Payment Terms, Currency, and Invoicing

2.1 **Pricing and Currency:** All commercial prices, rate card tariffs, subscription fees, and overage charges are denominated exclusively in **Euros (EUR, €)**. Air Roofers is a French enterprise and does not publish authoritative rate cards in foreign currencies.

2.2 **Accepted Payment Methods:** Payments may be executed via:
- Major credit and debit cards (Visa, Mastercard, Carte Bancaire) processed through PCI-DSS Level 1 certified payment service providers;
- SEPA Direct Debit (B2B and B2C SEPA Core / B2B);
- Wire transfer (*virement bancaire*) for Enterprise and Sovereign contracts against formal invoices.

2.3 **Value Added Tax (VAT):**
- Prices displayed to **Consumers** are inclusive of all taxes (**TTC — Toutes Taxes Comprises**) calculated at the statutory French VAT rate or the applicable member state VAT rate under the EU Mini One Stop Shop (MOSS / OSS) rules.
- Prices quoted to **Professional and Enterprise Customers** are net of taxes (**HT — Hors Taxes**). French VAT applies to French entities. EU B2B customers must supply a validated VIES VAT identification number to benefit from reverse-charge mechanisms (*autoliquidation de la TVA*). Non-EU customers are responsible for local taxes and duties.

2.4 **Invoice Issuance:** Digital tax invoices are generated automatically by AeroBill upon transaction completion and delivered to the registered billing contact in compliant PDF format satisfying French electronic invoicing standards.

2.5 **Recurring Subscriptions and Renewals:** Monthly and annual subscriptions renew automatically at the end of each billing cycle unless cancelled by the Customer prior to the renewal date via the customer portal.

2.6 **Failed Payments:** If a scheduled payment fails, AeroBill will initiate automated retries over a ten (10) calendar day grace period. If payment remains unsettled after notice, the associated Mandatag Entitlement is transitioned to `SUSPENDED` status, restricting software capabilities until arrears are settled.

---

## 3. The Activation Event & SKU Legal Supply Classification

To eliminate ambiguity between purchase, delivery, activation, and software use, the lifecycle of an EAORCS transaction is defined as follows:

```
[ ORDER & PAYMENT ] ──► [ ENTITLEMENT ISSUANCE ] ──► [ DELIVERY AUTHORIZATION ] ──► [ ACTIVATION EVENT ] ──► [ ACTIVE USE ]
(AeroBill Transaction)      (Mandatag Token)           (Downloads Gateway)             (Client-Side Handshake)   (Workload Execution)
```

3.1 **Definition of Activation Event:** An "Activation Event" is the verifiable technical milestone at which digital performance has commenced. It is recorded upon the **earliest occurrence** of:
1. The initial cryptographic verification handshake between the installed EAORCS thin client and `license.airroofers.eu`;
2. The download of an entitlement-gated binary package from `downloads.airroofers.eu` using an authenticated personal access token;
3. The generation or consumption of the first cryptographic release certificate or assurance report using the Customer's entitlement.

3.2 **Legal Significance by SKU Classification:** The Activation Event is a technical event; its legal effect is strictly determined by the **legal supply classification** of the purchased SKU:
- **`DIGITAL_CONTENT` (Standalone thin-client binaries, static evaluation bundles, offline packages):** Governed by French Consumer Code Art. L. 221-28, 13°. If the Consumer executed the statutory waiver at checkout, the occurrence of the Activation Event marks the immediate cessation of the statutory withdrawal right.
- **`DIGITAL_SERVICE` (Continuous verification pipelines, hosted telemetry analysis, managed registry federation):** Governed by French Consumer Code Art. L. 221-25. The Activation Event marks the start of service execution. The statutory withdrawal right remains preserved during the 14-day period, with the Consumer liable for pro-rata payment for services rendered until full execution.
- **`MIXED` (Commercial subscriptions combining thin client software and cloud verification backends):** The content and service components are evaluated separately under their respective statutory regimes.

---

## 4. Consumer Statutory Right of Withdrawal (*Droit de Rétractation*)

### 4.1 Statutory 14-Day Right (French Consumer Code)
Under Article L. 221-18 of the French *Code de la consommation* and EU Directive 2011/83/EU, any Consumer entering into a distance contract has the right to withdraw without giving any reason within a period of **fourteen (14) calendar days** from the conclusion of the contract.

### 4.2 Digital Content Waiver Flow (Article L. 221-28, 13°)
Under Article L. 221-28, 13° of the French *Code de la consommation*, for supply of **digital content** not supplied on a tangible medium:
1. The right of withdrawal **cannot be exercised** once performance has begun, provided:
   - The Consumer has given their **prior express consent** to immediate performance before the end of the 14-day withdrawal period; and
   - The Consumer has expressly **acknowledged that they will lose their right of withdrawal** once performance has begun; and
   - Air Roofers has provided confirmation of the contract and the express consent on a **durable medium** (*support durable*) under Article L. 221-13.

### 4.2bis Digital Services Early-Commencement Flow (Article L. 221-25)
Under Article L. 221-25 of the French *Code de la consommation*, for supply of **digital services**:
1. If the Consumer requests that service performance commence during the 14-day withdrawal period, they must make an **express request** at checkout.
2. The Consumer **retains their right of withdrawal** during the 14-day period until the service has been fully performed.
3. If the Consumer exercises withdrawal before full performance, they must pay Air Roofers a **pro-rata amount** corresponding to the proportion of services supplied up to the date of notification of withdrawal, relative to the total contractual price.
4. The right of withdrawal ceases once the digital service has been fully performed, provided performance began following the Consumer's express request and acknowledgement that they lose their right upon full performance.

### 4.3 Mandatory Checkout Consent Implementation
The commercial checkout workflow displays distinct, un-preselected consent checkboxes tailored to the legal classification of the SKU:

#### (a) For Digital Content SKUs (`DIGITAL_CONTENT`):
> ☐ *"Je demande expressément l'accès immédiat au contenu numérique EAORCS avant la fin du délai légal de rétractation de 14 jours, et je reconnais expressément que je perdrai mon droit de rétractation dès le début de la fourniture numérique ou la survenance de l'Événement d'Activation."*  
> *(English: "I expressly request immediate access to the EAORCS digital content before the expiry of the 14-day statutory withdrawal period, and I expressly acknowledge that I will lose my right of withdrawal as soon as digital supply begins or the Activation Event occurs.")*

#### (b) For Digital Service SKUs (`DIGITAL_SERVICE`):
> ☐ *"Je demande expressément le début de l'exécution du service numérique EAORCS avant l'expiration du délai de rétractation de 14 jours. Je reconnais que je conserve mon droit de rétractation pendant ce délai, mais qu'en cas d'exercice, je serai redevable d'un montant proportionnel au service fourni jusqu'à ma notification, et que ce droit prendra fin une fois le service pleinement exécuté."*  
> *(English: "I expressly request the commencement of the EAORCS digital service before the expiry of the 14-day withdrawal period. I acknowledge that I retain my withdrawal right during this period, but if exercised, I will owe an amount proportional to the service provided up to notification, and that this right will cease once the service has been fully performed.")*

#### (c) For Mixed SKUs (`MIXED`):
The checkout presents both checkboxes or a composite declaration clearly identifying the separate legal consequences for the downloadable binary versus the ongoing verification service.

### 4.4 Withdrawal Notification and Reimbursement Procedure
Where withdrawal is validly exercised:
1. The Consumer sends the **Model Withdrawal Form** (`Consumer_Withdrawal_Notice.md`) or an unambiguous written notice to `withdrawals@airroofers.eu` or by postal mail to:  
   **AIR ROOFERS SASU — Service Rétractations, 229 rue Saint-Honoré, 75001 Paris, France**.
2. **Reimbursement:** AeroBill will reimburse the Consumer within **fourteen (14) calendar days** of receipt of notice:
   - For Digital Content (where waiver was not executed or performance had not begun): 100% of the price paid;
   - For Digital Services: total price paid minus the statutory pro-rata amount for days of service utilized.
3. Reimbursement uses the original payment method without any fee. Associated entitlements and access credentials are deactivated upon reimbursement.

---

## 5. Comprehensive Refund and Remedy Categories

Air Roofers structures all refund, return, and cancellation inquiries across five distinct statutory and contractual categories:

```
┌────────────────────────────────────────────────────────────────────────┐
│ CATEGORY 1: Consumer Statutory Withdrawal (French Art. L. 221-18 / 25 / 28) │
│ Reimbursed within 14 days; full refund for content; pro-rata for services.   │
├────────────────────────────────────────────────────────────────────────┤
│ CATEGORY 2: Statutory Conformity Remedies (French Art. L. 224-25-1 et seq.)  │
│ Bringing into conformity, price reduction, or contract termination.          │
├────────────────────────────────────────────────────────────────────────┤
│ CATEGORY 3: Contractual Subscription Cancellation                            │
│ Non-renewal at period-end; access continues until billing cycle expires.     │
├────────────────────────────────────────────────────────────────────────┤
│ CATEGORY 4: Voluntary Commercial Refunds                                     │
│ Exceptional goodwill by Air Roofers; non-precedential; discretionary.        │
├────────────────────────────────────────────────────────────────────────┤
│ CATEGORY 5: Payment Reversals, Fraud & Disputed Transactions                 │
│ Duplicate charges refunded; disputes investigated via evidence trails.       │
└────────────────────────────────────────────────────────────────────────┘
```

### 5.1 Category 1: Statutory Consumer Withdrawal
Governed strictly by §4 above and the French *Code de la consommation*. Cannot be excluded or restricted by contract where statutory conditions are met.

### 5.2 Category 2: Statutory Digital Content and Service Conformity Remedies
Under Articles L. 224-25-1 to L. 224-25-31 of the French *Code de la consommation*, Air Roofers provides statutory legal guarantees of conformity:
- **Scope of Guarantee:** The software and services must conform to contractual descriptions, fitness for purpose, functionality, compatibility, interoperability, and continuous security updates throughout the subscription duration.
- **Remedies:** In the event of non-conformity, the Consumer is entitled to have the digital content or service brought into conformity free of charge, without undue delay (within thirty days), and without major inconvenience.
- **Price Reduction or Termination:** If repair or update is impossible or disproportionate, the Consumer may demand a proportional price reduction or terminate the contract with full or partial reimbursement within fourteen (14) days.

### 5.3 Category 3: Contractual Cancellation by Edition and Agreement Type
- **Monthly Recurring Subscriptions (DEVELOPER, PROFESSIONAL, BUSINESS):** May be cancelled at any time via the customer portal. Cancellation takes effect at the end of the paid monthly billing cycle. Access remains active through cycle end; no pro-rata cash refunds are issued for unused days.
- **Annual Recurring Subscriptions:** May be cancelled with thirty (30) days' notice prior to the annual renewal date. Mid-term early termination does not generate a cash refund of prepaid fees, except where terminated for uncured material breach by Air Roofers.
- **Enterprise and Sovereign Contracts:** Governed exclusively by the bilateral termination and refund terms in the executed Order Form or Sovereign Addendum.
- **COMMUNITY Edition:** Free edition; may be discontinued at any time without financial obligation.

### 5.4 Category 4: Voluntary Commercial Refunds
In exceptional circumstances beyond statutory obligations, Air Roofers may grant a voluntary goodwill refund (e.g., severe technical incompatibility demonstrated within 48 hours of purchase that cannot be resolved). Any voluntary refund:
- Must be approved in writing by the Commercial Authority (`billing@airroofers.eu`);
- Is granted ex gratia without admission of legal liability;
- Does not create an ongoing entitlement or precedent for future orders.

### 5.5 Category 5: Duplicate Payments, Fraud, and Payment Disputes
- **Duplicate Charges:** Verified duplicate transactions are refunded in full within five (5) business days.
- **Unauthorized / Fraudulent Transactions:** Transactions identified as fraudulent by card networks are audited against the Legal Checkout Record and handled under applicable payment rules.
- **Payment Disputes and Chargebacks:** A chargeback initiated without prior notification to Air Roofers support is treated as an active commercial dispute:
  1. The Customer's Mandatag Entitlement may be temporarily restricted to prevent further unbilled consumption while the dispute is investigated;
  2. Air Roofers compiles and transmits the immutable Legal Checkout Record, cryptographic logs, and delivery evidence to the acquiring institution pursuant to French Civil Code Art. 1366;
  3. No arbitrary penalty fees are imposed; legitimate billing errors resolved in favor of the customer are settled without fees.

---

## 6. Service Level Agreement (SLA) Credits vs. Cash Refunds

In accordance with the **Support SLA Schedule** (`Support_SLA_Schedule.md`):
- SLA Service Credits are contractual price adjustments for operational downtime applied exclusively against future billing invoices.
- **SLA Service Credits are not cash refunds, cannot be converted to bank transfers, and are non-transferable.**

---

## 7. Consumer Mediation (*Médiation de la Consommation*)

In accordance with Articles L. 616-1 and R. 616-1 of the French *Code de la consommation*, Consumers have the right to resolve consumer disputes amicably through a certified consumer mediator at no financial cost.

Prior to contacting the mediator, the Consumer must first attempt to resolve the dispute directly by sending a written complaint by email to `support@airroofers.eu` or by postal mail to Air Roofers SASU. If the dispute is not settled within two (2) months of the written complaint, the Consumer may refer the matter to:

- **Designated Consumer Mediator:** `[CONSUMER_MEDIATOR_NAME]`
- **Mediation Organization:** `[MEDIATOR_ENTITY]`
- **Official Website for Claims:** `[MEDIATOR_WEBSITE]`
- **Postal Address:** `[MEDIATOR_ADDRESS]`

> *Note on Consumer Mediator:* Adhesion to an accredited French consumer mediation entity is pending completion under Gate 7/8. The placeholders above will be replaced with real accredited credentials prior to consumer publication.

---

## 8. The Legal Checkout Record Specification

To substantiate compliance with French distance-contracting rules and ensure evidentiary auditability, AeroBill records and archives an immutable **Legal Checkout Record** for every transaction, capturing:
- Customer classification (Consumer, Professional, Enterprise);
- Legal supply classification (`DIGITAL_CONTENT`, `DIGITAL_SERVICE`, `MIXED`);
- Order ID, transaction timestamp, IP address, and country code;
- SKU, edition, price in EUR, and VAT breakdown;
- Versions and cryptographic hashes of the EULA, Terms of Service, Privacy Policy, and this Policy in force at purchase;
- Timestamped record of the express consent checkbox for immediate supply or service commencement;
- Payment processor transaction identifier and Mandatag entitlement ID.

Complete data schema definitions are governed by `Legal_Checkout_Record_Specification.md`.

---

## 9. Governing Law and Dispute Jurisdiction

9.1 **Governing Law:** This Policy is governed exclusively by the **laws of France**, without prejudice to mandatory consumer protection laws of the consumer's country of habitual residence within the EEA.

9.2 **B2B Disputes:** All commercial disputes arising from B2B transactions shall be subject to the exclusive jurisdiction of the **competent courts of Paris, France** (*Tribunaux de Paris*).

9.3 **Consumer Disputes:** For Consumers, dispute jurisdiction is governed by Article R. 631-3 of the French *Code de la consommation* and applicable European jurisdictional regulations (Brussels I bis Regulation (EU) No 1215/2012).

---

**AIR ROOFERS**  
229 rue Saint-Honoré, 75001 Paris, France  
RCS Paris 943 432 534 | TVA: FR89943432534  
Commercial Directorate | AeroBill Authority  

---
*Classification: COMMERCIAL_AUTHORITY | DRAFT — PENDING FORMAL LEGAL REVIEW*  
*Corporate Governance Baseline — Internal Circulation Only — External Publication Requires Legal Authority Signature*
