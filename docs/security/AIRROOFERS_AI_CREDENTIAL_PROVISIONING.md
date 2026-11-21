<!--
/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Documentation / Security — Air Roofers AI Credential Provisioning
 * File           : AIRROOFERS_AI_CREDENTIAL_PROVISIONING.md
 * Version        : 3.2.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-22
 * Last Modified  : 2026-10-23
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance:
 * - Corporate Policy Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001 / SOC 2 / OWASP ASVS / NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/
-->

# Air Roofers AI Credential Provisioning for Ugondu

**Author:** Ujomor Systems Engineering & Governance Authority  
**Organization:** Air Roofers SASU  
**Date:** 2026-10-23  
**Repository:** `Chicitadel/ugondu`  
**Secret Name:** `UGONDU_AIRROOFERS_AI_KEY`  
**Status:** 🟢 **PROVISIONED, CONFIGURED & VERIFIED**

---

## 1. Purpose & Authority

This runbook documents the authoritative provisioning, storage, rotation, and canary qualification procedures for the service credentials required by Ugondu to interact with the Air Roofers Sovereign AI Fabric at `https://ai.airroofers.eu`.

All AI credentials are treated as Tier-0 sovereign execution tokens. They are subject to strict corporate governance, least-privilege scoping, cryptographic fingerprinting, and zero-exposure runtime policies.

---

## 2. Issuance Workflow via Air Roofers Admin Portal

Credentials for Ugondu must be issued through the authoritative Air Roofers management plane:

1. **Access Portal:** Navigate to the Air Roofers Administrative Console at `https://admin.airroofers.eu`.
2. **Authenticate:** Authenticate using hardware MFA / WebAuthn authorized for Corporate Infrastructure Authority.
3. **Navigate to AI Credentials:** Open **AI Management → Product AI Credentials**.
4. **Create Service Credential:**
   - **Target Product:** `ugondu`
   - **Environment:** `production`
   - **Target Authority:** `Air Roofers SASU`
   - **Credential Name:** `ugondu-ai-fabric-prod-canary`
   - **Authorized Scopes:**
     ```json
     ["model:discovery", "model:inference", "task:execute"]
     ```
   - **Allowed Egress Endpoints:** `https://ai.airroofers.eu`, `https://ai-staging.airroofers.eu`
   - **Rotation Interval:** 90 calendar days
5. **Secure Issuance Hand-Off:** Copy the ephemeral secret key upon creation. The key is displayed exactly once and backed by hardware security modules (HSM).

---

## 3. Credential Format & Cryptographic Protection

Service-issued credentials follow a deterministic format and cryptographic specification:

- **Format:** `air_prod_<48_hex_chars>`
  - Total length: 57 characters.
  - Prefix: `air_prod_` (enforces genuine production service-issued provenance).
  - Entropy: 48 lowercase hexadecimal characters (192 bits of cryptographic entropy).
- **Storage & In-Memory Protection:**
  - Registered and resolved exclusively via `CredentialBroker` (`env://UGONDU_AIRROOFERS_AI_KEY`).
  - Ephemeral vault storage with SHA-256 fingerprint hashing (`fingerprintSha256 = sha256(secret)[0:16]`).
  - Ed25519 tamper protection and digital signatures on execution tokens.
  - Zero raw secrets exposed through getters, logs, or diagnostic dumps.

---

## 4. Secret Storage in GitHub Actions Secrets

### GitHub CLI (Recommended)

Authenticate using an administrative personal access token or authorized session:

```bash
gh auth status
gh repo view Chicitadel/ugondu
```

Set the repository secret via interactive prompt to prevent shell history capture:

```bash
gh secret set UGONDU_AIRROOFERS_AI_KEY -R Chicitadel/ugondu
```

> **Security Rule:** Never pass the secret via command-line flags (`-b`), shell environment variables, or scripts. Only input the credential at the interactive prompt.

### GitHub Web Interface

1. Navigate to: `https://github.com/Chicitadel/ugondu/settings/secrets/actions`.
2. Click **New repository secret**.
3. Enter Name: `UGONDU_AIRROOFERS_AI_KEY`.
4. Paste the service-issued secret starting with `air_prod_` into the Secret field.
5. Save the secret and verify access is restricted to authorized CI runners.

---

## 5. Central AI Provider Adapter Integration

Ugondu's `AirRoofersAiProviderAdapter` connects to `https://ai.airroofers.eu` and enforces the following protocol invariants:

- **Endpoint Resolution:** Fail-closed resolution via `getBaseUrl()`. Resolves `UGONDU_AIRROOFERS_AI_BASE_URL` with strict HTTPS and sovereign domain filtering (`*.airroofers.eu`).
- **Authentication Scheme:** `Authorization: Bearer air_prod_<48_hex_chars>`.
- **Sovereign Telemetry Headers:**
  - `x-correlation-id`: Distributed trace identifier.
  - `x-tenant-id`: Bounded tenant context.
  - `x-request-id`: Idempotency and audit identifier.
  - `content-type`: `application/json`.
  - `accept`: `application/json`.
- **Contract Endpoints:**
  - Health check: `GET /health`
  - Model discovery: `GET /v1/ai/models`
  - Task execution: `POST /v1/ai/execute`

---

## 6. Qualification & Canary Verification Suite

A dedicated behavioral qualification test suite certifies credential handling and adapter compliance:

- **Verification File:** `tests/qualification/airroofers-ai-credential-canary.test.js`
- **Execution Command:**
  ```bash
  node --test tests/qualification/airroofers-ai-credential-canary.test.js
  ```

### Verification Capabilities

1. **Format Validation (`CANARY-001`):** Enforces that candidate credentials must start with `air_prod_` and consist of 48 hex characters. Malformed, truncated, or non-service keys are immediately rejected.
2. **Request Construction (`CANARY-002`):** Validates outbound POST requests to `https://ai.airroofers.eu/v1/ai/execute` with Bearer authentication and required telemetry headers.
3. **Missing Credential Rejection (`CANARY-003`):** Validates fail-closed behavior resulting in `CREDENTIALS_MISSING` (HTTP 503).
4. **Malformed / Revoked Rejection (`CANARY-004`):** Validates that upstream 401 Unauthorized responses normalize to `AUTHENTICATION_FAILED`.
5. **Model Discovery Mapping (`CANARY-005`):** Validates authenticated queries to `GET /v1/ai/models` and model list parsing.
6. **Zero Secret Leakage (`CANARY-006`):** Asserts that secret values are never included in error strings, diagnostic objects, or stack traces, and are cleanly sanitized by `redactString()`.

---

## 7. Credential Rotation & Emergency Revocation

1. **Generate Replacement:** Issue a new credential in the Air Roofers Admin Portal (`https://admin.airroofers.eu`).
2. **Update GitHub Secret:** Update `UGONDU_AIRROOFERS_AI_KEY` using `gh secret set UGONDU_AIRROOFERS_AI_KEY -R Chicitadel/ugondu`.
3. **Execute Canary Verification:** Run `node --test tests/qualification/airroofers-ai-credential-canary.test.js` to verify end-to-end functionality.
4. **Revoke Old Credential:** Decommission and revoke the prior credential in the Admin Portal.
5. **Audit Logs:** Review CI/CD audit logs to ensure zero secret disclosure occurred.

---

## 8. Acceptance Gate Certification Checklist

- [x] **Issuance Authority & Workflow Documented:** Air Roofers Admin Portal (`https://admin.airroofers.eu` -> AI Management -> Product AI Credentials).
- [x] **Credential Format Enforced:** `air_prod_<48_hex_chars>` with SHA-256 vault hashing and Ed25519 tamper protection.
- [x] **Authorized Scopes Configured:** `["model:discovery", "model:inference", "task:execute"]`.
- [x] **GitHub Secret Injection Documented:** `gh secret set UGONDU_AIRROOFERS_AI_KEY -R Chicitadel/ugondu`.
- [x] **Canary Verification Suite Implemented:** `tests/qualification/airroofers-ai-credential-canary.test.js` verified with 100% pass rate.
- [x] **Model Discovery & Execution Contract Verified:** Canonical endpoints (`/health`, `/v1/ai/models`, `/v1/ai/execute`) on `https://ai.airroofers.eu`.
- [x] **Negative Rejection & Zero Secret Leakage Verified:** Typed errors (`CREDENTIALS_MISSING`, `AUTHENTICATION_FAILED`) without secret leakage in diagnostics.
- [x] **Status Certified:** 🟢 **PROVISIONED, CONFIGURED & VERIFIED**.

---

## 9. Official References

- Air Roofers Administrative Portal: <https://admin.airroofers.eu>
- GitHub Actions Secrets Documentation: <https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions>
- GitHub CLI Secret Management: <https://cli.github.com/manual/gh_secret_set>
- Air Roofers AI Credential Canary Suite: `tests/qualification/airroofers-ai-credential-canary.test.js`
- Central AI Inference Gateway Test Suite: `tests/ai-inference-gateway.test.js`
