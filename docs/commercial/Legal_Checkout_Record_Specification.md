/******************************************************************************
 * Project        : EAORCS — Enterprise Assurance, Orchestration & Certification System
 * Module         : Commercial Documentation & Checkout Architecture
 * File           : Legal_Checkout_Record_Specification.md
 * Version        : 1.1.0-draft
 * Author         : Ignatus Chika Ujomor | Founder & System Architect
 * Organization   : AIR ROOFERS (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-09-24
 * Last Modified  : 2026-09-25
 * Classification : ENTERPRISE | TECHNICAL SPECIFICATION & COMPLIANCE STANDARD
 *
 * Governance:
 * - Corporate Governance Baseline — Pending Formal Legal Review
 * - Architecture Controlled
 * - Protocol Frozen
 *
 * Standards:
 * - French Consumer Code (Code de la consommation, Art. L. 221-13, L. 221-25, L. 221-28, R. 221-3)
 * - French Civil Code (Code civil, Art. 1366 — Écrit électronique comme preuve)
 * - French Commercial Code (Code de commerce, Art. L. 123-22 — Conservation des documents comptables)
 * - ISO/IEC 27001 (Audit Trail Integrity)
 * - W3C Verifiable Credentials Data Model v2.0
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

# Legal Checkout Record (LCR) Technical & Compliance Specification

**Product:** EAORCS — Commercial Checkout & Evidentiary Governance  
**Governing Authority:** AeroBill (`billing.airroofers.eu`) & Mandatag (`license.airroofers.eu`)  
**Operating Entity:** AIR ROOFERS (Société par actions simplifiée à associé unique)  
**Registered Office:** 229 rue Saint-Honoré, 75001 Paris, France (RCS Paris 943 432 534)  
**TVA Intracommunautaire:** FR89943432534  
**Document Version:** 1.1.0-draft  
**Status:** DRAFT — PENDING FORMAL LEGAL REVIEW (Gate 7 — Human Legal Review)

---

## 1. Executive Purpose and Legal Rationale

Under French and European distance-selling legislation (Articles L. 221-13, L. 221-25, and L. 221-28, 13° of the French *Code de la consommation*), the legal validity of digital distance contracts depends upon the trader's ability to demonstrate:
1. The customer's classification (B2B vs Consumer);
2. The exact legal classification of the supply (`DIGITAL_CONTENT`, `DIGITAL_SERVICE`, or `MIXED`);
3. For consumers, the requisite express consents, requests, and acknowledgements corresponding to the supply type;
4. Provision of confirmation on a **durable medium** (*support durable*);
5. An immutable timestamped record substantiating the exact terms and versions in force at transaction time.

This Specification establishes the normative data schema, cryptographic sealing, and archiving protocols for the **Legal Checkout Record (LCR)** minted by AeroBill for every commercial order across the Air Roofers platform.

---

## 2. Evidentiary Architecture & Flow

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ 1. CHECKOUT UI  │ ────► │ 2. AEROBILL     │ ────► │ 3. MANDATAG     │ ────► │ 4. SECURE VAULT │
│ Consent Capture │       │ LCR Minting     │       │ Token Issuance  │       │ Field Retained  │
│ Classification  │       │ RS256 / Ed25519 │       │ Entitlement ID  │       │ (Art. 1366 CC)  │
└─────────────────┘       └─────────────────┘       └─────────────────┘       └─────────────────┘
```

---

## 3. Normative JSON Schema (v1.1)

Every commercial transaction must generate a payload conforming to the following conditional JSON structure:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "AirRoofersLegalCheckoutRecord",
  "type": "object",
  "required": [
    "recordId",
    "timestamp",
    "customer",
    "commercial",
    "contractualGovernance",
    "paymentEvidence",
    "integrity"
  ],
  "properties": {
    "recordId": { "type": "string", "format": "uuid" },
    "timestamp": { "type": "string", "format": "date-time" },
    "customer": {
      "type": "object",
      "required": ["userId", "email", "classification", "jurisdiction", "ipAddress"],
      "properties": {
        "userId": { "type": "string" },
        "email": { "type": "string", "format": "email" },
        "organizationId": { "type": ["string", "null"] },
        "classification": { "type": "string", "enum": ["CONSUMER", "PROFESSIONAL", "ENTERPRISE", "GOVERNMENT"] },
        "jurisdiction": { "type": "string", "pattern": "^[A-Z]{2}$" },
        "declaredCountry": { "type": "string", "pattern": "^[A-Z]{2}$" },
        "ipAddress": { "type": "string" },
        "userAgent": { "type": "string" }
      }
    },
    "commercial": {
      "type": "object",
      "required": ["orderId", "sku", "edition", "legalSupplyType", "billingModel", "amountHtEur", "vatRate", "vatAmountEur", "amountTtcEur", "currency"],
      "properties": {
        "orderId": { "type": "string" },
        "sku": { "type": "string" },
        "edition": { "type": "string", "enum": ["DEVELOPER", "PROFESSIONAL", "BUSINESS", "ENTERPRISE", "SOVEREIGN"] },
        "legalSupplyType": { "type": "string", "enum": ["DIGITAL_CONTENT", "DIGITAL_SERVICE", "MIXED"] },
        "billingModel": { "type": "string", "enum": ["MONTHLY_RECURRING", "ANNUAL_RECURRING", "PERPETUAL", "METERED"] },
        "amountHtEur": { "type": "number", "minimum": 0 },
        "vatRate": { "type": "number", "minimum": 0 },
        "vatAmountEur": { "type": "number", "minimum": 0 },
        "amountTtcEur": { "type": "number", "minimum": 0 },
        "currency": { "type": "string", "enum": ["EUR"] }
      }
    },
    "contractualGovernance": {
      "type": "object",
      "required": ["eulaVersion", "termsVersion", "refundPolicyVersion", "privacyPolicyVersion", "termsHash"],
      "properties": {
        "eulaVersion": { "type": "string" },
        "termsVersion": { "type": "string" },
        "refundPolicyVersion": { "type": "string" },
        "privacyPolicyVersion": { "type": "string" },
        "withdrawalNoticeVersion": { "type": ["string", "null"] },
        "productInfoSheetVersion": { "type": ["string", "null"] },
        "termsHash": { "type": "string", "description": "SHA-256 hash of governing contractual package" },
        "consentTextHash": { "type": ["string", "null"], "description": "SHA-256 hash of consent checkbox wording" }
      }
    },
    "statutoryConsent": {
      "type": "object",
      "description": "Required when customer.classification == 'CONSUMER'; null or omitted for B2B",
      "properties": {
        "isConsumer": { "type": "boolean" },
        "expressConsentImmediatePerformance": { "type": ["boolean", "null"], "description": "Art. L. 221-28 13° for DIGITAL_CONTENT" },
        "acknowledgementLossOfWithdrawal": { "type": ["boolean", "null"], "description": "Art. L. 221-28 13° for DIGITAL_CONTENT" },
        "expressRequestImmediateService": { "type": ["boolean", "null"], "description": "Art. L. 221-25 for DIGITAL_SERVICE" },
        "acknowledgementProRataLiability": { "type": ["boolean", "null"], "description": "Art. L. 221-25 for DIGITAL_SERVICE" },
        "acknowledgementLossUponFullPerformance": { "type": ["boolean", "null"], "description": "Art. L. 221-25 for DIGITAL_SERVICE" },
        "consentTimestamp": { "type": ["string", "null"], "format": "date-time" },
        "checkboxWordingSha256": { "type": ["string", "null"] }
      }
    },
    "paymentEvidence": {
      "type": "object",
      "required": ["pspProvider", "pspTransactionId", "invoiceId", "paymentStatus"],
      "properties": {
        "pspProvider": { "type": "string" },
        "pspTransactionId": { "type": "string" },
        "invoiceId": { "type": "string" },
        "paymentStatus": { "type": "string", "enum": ["SETTLED", "AUTHORIZED", "COMPLETED"] }
      }
    },
    "activationEvidence": {
      "type": "object",
      "properties": {
        "entitlementId": { "type": "string" },
        "downloadTokenHash": { "type": "string" },
        "deliveryTimestamp": { "type": ["string", "null"], "format": "date-time" },
        "activationTimestamp": { "type": ["string", "null"], "format": "date-time" },
        "firstUseTimestamp": { "type": ["string", "null"], "format": "date-time" }
      }
    },
    "integrity": {
      "type": "object",
      "required": ["sha256PayloadHash", "signatureAlgorithm", "sealedSignature", "signingKeyThumbprint"],
      "properties": {
        "sha256PayloadHash": { "type": "string" },
        "signatureAlgorithm": { "type": "string", "enum": ["RS256", "Ed25519"] },
        "sealedSignature": { "type": "string" },
        "signingKeyThumbprint": { "type": "string" }
      }
    }
  }
}
```

---

## 4. Field Specification & Audit Guidelines

| Field Path | Mandate | Audit Purpose & Evidentiary Value |
|:---|:---|:---|
| `customer.classification` | **Mandatory** | Establishes whether statutory consumer protections apply or whether B2B commercial terms govern. |
| `commercial.legalSupplyType` | **Mandatory** | Determines applicable withdrawal rules (`DIGITAL_CONTENT` Art. L. 221-28 vs `DIGITAL_SERVICE` Art. L. 221-25). |
| `statutoryConsent.expressConsentImmediatePerformance` | Mandatory for Consumer Content | Evidences compliance with Article L. 221-28, 13° of the French *Code de la consommation*. |
| `statutoryConsent.expressRequestImmediateService` | Mandatory for Consumer Service | Evidences compliance with Article L. 221-25 of the French *Code de la consommation*. |
| `contractualGovernance.termsHash` | **Mandatory** | SHA-256 hash of governing contract documents at transaction time. |
| `activationEvidence.deliveryTimestamp` | Upon Delivery | Timestamp when digital delivery authorization or download link was made available. |
| `activationEvidence.firstUseTimestamp` | Upon Handshake | Timestamp of first verified client interaction or assurance report execution. |
| `integrity.sealedSignature` | **Mandatory** | Cryptographic digital signature sealed by the private key of AeroBill (`billing.airroofers.eu`). |

---

## 5. Archival and Legal Admissibility (Article 1366 Code Civil)

### 5.1 Admissibility as Electronic Evidence
Under Article 1366 of the French *Code civil*, electronic writing has the same probative value as writing on paper, provided that the person from whom it emanates can be duly identified and that it is established and preserved under conditions that guarantee its integrity. The LCR, sealed cryptographically by AeroBill, constitutes reliable electronic evidence (*commencement de preuve par écrit / preuve électronique recevable*) enjoying evidentiary value pursuant to Article 1366.

### 5.2 Field-Level Retention Framework (Proposed Baseline)
Rather than applying an undifferentiated blanket retention period across all fields, LCR data is categorized across five distinct statutory and operational retention classes (subject to formal legal review under Gate 7):

| Retention Class | Duration | Statutory Basis | Covered Fields |
|:---|:---|:---|:---|
| **`ACCOUNTING_RECORD`** | **10 years** | French *Code de commerce* Art. L. 123-22 | `orderId`, `amountHtEur`, `vatRate`, `vatAmountEur`, `amountTtcEur`, `currency`, `invoiceId`, `pspTransactionId` |
| **`CONTRACTUAL_EVIDENCE`** | **5 years** | French *Code civil* Art. 2224 (statutory prescription) | `userId`, `email`, `organizationId`, `classification`, `eulaVersion`, `termsVersion`, `termsHash`, `deliveryTimestamp` |
| **`CONSUMER_CONSENT_EVIDENCE`** | **5 years** | French *Code civil* Art. 2224 / Consumer Code | `statutoryConsent.*`, `checkboxWordingSha256`, `consentTimestamp`, `consentTextHash` |
| **`SECURITY_FRAUD_EVIDENCE`** | **3 years** | Legitimate interests / Fraud prevention | `ipAddress`, `userAgent`, `sealedSignature`, `sha256PayloadHash`, `signingKeyThumbprint` |
| **`TECHNICAL_TELEMETRY`** | **12 months** | Operational minimization | Ephemeral handshake traces, intermediate diagnostic timestamps |

### 5.3 Dispute Defense Protocol
In the event of a payment dispute, chargeback, or consumer litigation, the relevant LCR records are exported into a tamper-evident PDF/A confirmation bundle transmitted to financial institutions or judicial authorities as electronic proof pursuant to French Civil Code Art. 1366.

---

**AIR ROOFERS**  
229 rue Saint-Honoré, 75001 Paris, France  
RCS Paris 943 432 534 | TVA: FR89943432534  
Commercial Directorate | AeroBill Evidentiary Architecture  

---
*Classification: ENTERPRISE | TECHNICAL SPECIFICATION & COMPLIANCE STANDARD*  
*Corporate Governance Baseline — Pending Formal Legal Review — Copyright (c) 2025-2026 AIR ROOFERS*
