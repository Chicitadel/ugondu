<!--
******************************************************************************
 * Project        : EAORCS — Enterprise Assurance, Orchestration & Certification System
 * Module         : Policy Authority & Architecture
 * File           : EAORCS_Thin_Client_Policy_Bootstrap.md
 * Version        : 1.0.0
 * Author         : Ignatus Chika Ujomor | Founder & System Architect
 * Organization   : AIR ROOFERS (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-09-25
 * Last Modified  : 2026-09-25
 * Classification : ENTERPRISE | TECHNICAL SPECIFICATION & BOOTSTRAP PROTOCOL
 *
 * Governance:
 * - Corporate Governance Baseline — Pending Formal Legal Review
 * - Architecture Controlled
 * - Protocol Frozen
 *
 * Standards:
 * - RFC 8785 (JSON Canonicalization Scheme)
 * - ISO/IEC 27001 / FIPS 140-3
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

# EAORCS Thin-Client Policy Bootstrap Specification

**Product:** EAORCS — Enterprise Assurance, Orchestration & Certification System  
**Component:** Thin Client CLI & Runtime Bootstrap Protocol  
**Authority:** AIR ROOFERS (`https://policies.airroofers.eu`)  
**Operating Entity:** AIR ROOFERS (Société par actions simplifiée à associé unique)  
**Registered Office:** 229 rue Saint-Honoré, 75001 Paris, France (RCS Paris 943 432 534)  
**Document Version:** 1.0.0  
**Status:** DRAFT — PENDING FORMAL LEGAL REVIEW (Gate 7 — Human Legal Review)

---

## 1. Executive Purpose

This Specification establishes how the EAORCS thin client discovers, validates, caches, and enforces platform policy metadata without embedding monolithic, mutable legal texts directly inside client software binaries.

---

## 2. Architectural Design: Separation of Client & Policy Corpus

```
┌────────────────────────────────────────────────────────────────────────┐
│                        EAORCS THIN CLIENT                              │
│                                                                        │
│  ┌────────────────────────┐         ┌───────────────────────────────┐  │
│  │ Embedded Public Key    │         │ Local Cache Directory         │  │
│  │ (release_pubkey.pem)   │         │ (~/.eaorcs/policies/)         │  │
│  └───────────┬────────────┘         └───────────────▲───────────────┘  │
└──────────────┼──────────────────────────────────────┼──────────────────┘
               │                                      │
               │ Verify Signature                     │ Cache Validated Manifest
               ▼                                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│               AIR ROOFERS FEDERATED POLICY AUTHORITY                   │
│               https://policies.airroofers.eu/manifest.json             │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Core Rules
1. **No Monolithic Policy Text in Binaries:** The EAORCS thin-client binary contains zero hardcoded changeable contractual terms. It packages only an **embedded initial policy manifest** and the **Policy Authority public signing key**.
2. **Online Verification:** On startup or periodic sync (default: 24h), connected clients check `https://policies.airroofers.eu/manifest.json` for updated policy hashes and notices.
3. **Air-Gapped / Sovereign Resilience:** When running in Sovereign mode (offline / air-gapped), the thin client uses its embedded policy manifest signed at build-time, operating 100% offline without failing.

---

## 3. Bootstrap Handshake Protocol

```
[ THIN CLIENT STARTUP ]
         │
         ▼
[ Check Network Mode ] ──────► [ AIR-GAPPED / SOVEREIGN ]
         │                                 │
         │ Connected                       ▼
         ▼                      [ Load Embedded Manifest ]
[ GET /manifest.json ]                     │
         │                                 ▼
         ▼                      [ Verify Embedded Signature ]
[ Verify RS256/Ed25519 Sig ]               │
         │                                 ▼
    Valid? ──► NO ──► [ Fallback to Cache or Abort ]
         │
        YES
         ▼
[ Check SHA-256 Hashes ]
         │
         ▼
[ Update Local Cache (~/.eaorcs/policies/) ]
         │
         ▼
[ Ready for Workload Execution ]
```

### 3.1 Step-by-Step Execution
1. **Network Probe:** The client determines if external connectivity is authorized (based on `--air-gapped` flag or environment setting `EAORCS_OFFLINE=true`).
2. **Fetch Manifest:** If connected, the client issues a `GET https://policies.airroofers.eu/manifest.json`.
3. **Cryptographic Verification:** The client validates the signature in the manifest using the embedded `keys/release_public_key_v2.pem`.
4. **Cache Synchronization:** The client compares policy digests against its local cache located at `~/.eaorcs/policies/`. If a policy has updated, the client fetches the new document and verifies `SHA256(doc) == manifest.policies[i].sha256`.
5. **Local Storage:** Policies are cached locally in text and JSON format for offline audit inspection.

---

## 4. CLI Policy Commands

The EAORCS CLI exposes dedicated policy inspection commands for operators and compliance officers:

```bash
# Display currently active policy manifest and verification status
eaorcs policy status

# List all policies, versions, and SHA-256 hashes
eaorcs policy list

# Verify local policy cache integrity against Policy Authority
eaorcs policy verify

# Display the full text of a specific policy
eaorcs policy show POL-EULA

# Export compliance evidence bundle for audit
eaorcs policy export --output audit-policies.json
```

---

## 5. Sovereign / Air-Gapped Mode Implementation

In high-assurance Sovereign environments (Schedule 3 of `Enterprise_Government_Sovereign_Addendum.md`):
1. **Build-Time Freeze:** The distribution bundle includes an immutable `embedded_policy_manifest.json` signed by Air Roofers release keys for that release tag (`v2026.3.1-LTS`).
2. **Offline Trust Anchor:** The client never attempts network connections to `policies.airroofers.eu`.
3. **Auditability:** Local compliance verification relies exclusively on the signed embedded manifest and offline cryptographic tokens supplied via secure media.

---

**AIR ROOFERS**  
229 rue Saint-Honoré, 75001 Paris, France  
RCS Paris 943 432 534 | TVA: FR89943432534  
Engineering Architecture Directorate  

---
*Classification: ENTERPRISE | TECHNICAL SPECIFICATION*  
*Copyright (c) 2025-2026 AIR ROOFERS. All Rights Reserved.*
