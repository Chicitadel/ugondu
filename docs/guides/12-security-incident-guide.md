<!--
/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Developer & Operator Documentation (Guide 12)
 * File           : 12-security-incident-guide.md
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-10-18
 * Last Modified  : 2026-10-18
 * Classification : ENTERPRISE | RESTRICTED
 *
 * Governance:
 * - Corporate Policy Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS 5.0
 * - NIST SP 800-53
 *
 * Signatures:
 * - Architecture Authority
 * - Security Authority
 * - Governance Authority
 * - Deployment Authority
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/
-->

# 12 — Security Incident Response Guide

## 1. Security Governance & Threat Model

Ugondu operates under zero-trust security invariants (`ISO 27001`, `SOC 2`, `OWASP ASVS 5.0`, `NIST SP 800-53`):
- **Cryptographic Recipe & Passport Integrity**: Ed25519 and HMAC-SHA256 signatures over canonical payloads with replay-protection ledgers (`server/shared/trust_registry.ts`, `client/engine/replay.go`).
- **SSRF & Path Traversal Prevention**: Enforced via `server/shared/ssrf.ts`, `server/shared/safepath.ts`, and `client/engine/safepath.go`.
- **Container Sandbox Isolation**: Rootless `--network=none --cap-drop=ALL --read-only` execution in `plugin-manager`.
- **AWS ABAC Containment**: Transaction-tagged IAM boundaries in `Ugondu_CORExecutionRole_Policy_V9.json`.

---

## 2. Incident Severity Classification

| Severity | Classification | Trigger Examples | Target Response SLA |
|---|---|---|---|
| **SEV-1 (Critical)** | Cryptographic key compromise, unauthorized cross-tenant access, or active production data exposure | Suspected leak of `UGONDU_PRIVATE_KEY`, publisher Ed25519 signing key, or AWS role compromise | `< 15 minutes` |
| **SEV-2 (High)** | Policy gate bypass attempt, plugin sandbox escape attempt, or SSRF/path-traversal anomaly | Repeated `PASSPORT_REPLAY_DETECTED` or `UPPIE_SEAL_MISMATCH` alerts | `< 1 hour` |
| **SEV-3 (Medium)** | Dependency vulnerability (CVE High) or expired trust certificate | `npm audit` / CycloneDX SBOM alert | `< 24 hours` |
| **SEV-4 (Low)** | Rate-limit exhaustion or malformed client telemetry | Automated scanner noise | `< 72 hours` |

---

## 3. Incident Playbooks

### Playbook A: Emergency Cryptographic Key Rotation (`SEV-1`)
If `UGONDU_PRIVATE_KEY` or the plugin authority signing key is suspected of compromise:

1. **Rotate Control Plane Recipe & Trust Keys**:
   ```bash
   node scripts/rotate-keys.js
   node scripts/ci/verify-trust-root.js
   ```
2. **Invalidate Active Replay & Session Ledgers**:
   Purge runtime `.service_replay_ledger.json` across `engine-core` and `plugin-manager` instances and restart all control-plane tasks so all pre-rotation `ExecutionAuthorization` tokens are immediately rejected.
3. **Verify Repository Cleanliness**:
   ```bash
   npm run verify:release-integrity
   ```

### Playbook B: Quarantine a Compromised or Malicious Plugin (`SEV-1` / `SEV-2`)
1. Suspend and remove the plugin from active tenant registries (`server/data/plugins.json`).
2. Revoke the publisher key entry in `server/shared/trust_registry.ts`.
3. Terminate any running sandbox containers:
   ```bash
   docker ps --filter "label=ugondu.sandbox=true" -q | xargs -r docker kill
   ```

### Playbook C: AWS IAM Session Revocation & Resource Containment (`SEV-1`)
If an AWS OIDC or STS session in account `971671216490` exhibits anomalous API calls in CloudTrail:
1. Attach the inline `AWSRevokeOlderSessions` policy to `UgonduCORExecutionRole` and `UgonduCORRunner`:
   ```bash
   aws iam put-role-policy \
     --role-name UgonduCORExecutionRole \
     --policy-name EmergencyRevokeOlderSessions \
     --policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Deny","Action":"*","Resource":"*","Condition":{"DateLessThan":{"aws:TokenIssueTime":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}}}]}'
   ```
2. Run the residual scanner to identify and terminate any unauthorized tagged resources in `eu-west-3`:
   ```bash
   npx ts-node scripts/ci/residual-scanner.ts
   ```

---

## 4. Security Verification & Regression Suites

After any incident containment or security patch, run the full adversarial and security regression suite:

```bash
npx jest tests/security-regression.test.js \
         tests/adversarial-execution.test.js \
         tests/ssrf-execution.test.js \
         tests/passport-cryptography.test.js \
         tests/passport-freshness-replay.test.js \
         tests/passport-toctou-reality.test.js \
         tests/tenant-isolation.test.js
```

---

## 5. Exit Codes & Diagnostic Reference

| Security Gate | Exit `0` | Exit `1` |
|---|---|---|
| `npm run verify:release-integrity` | Zero private keys or forbidden artifacts in Git index | Private key material (`BEGIN ... PRIVATE KEY`) or forbidden artifact detected |
| `node scripts/ci/verify-trust-root.js` | Trust root public key matches expected fingerprint | Trust root missing or tampered |
| `node scripts/release/verify-evidence-bundle.mjs --verify` | SARIF secrets scan has 0 findings and Ed25519 signature is valid | Tampered evidence artifact or invalid signature |

---

## 6. Clean-Room Post-Incident Validation Checklist

- [ ] Compromised keys rotated and revoked in `trust_registry.ts` and secret stores.
- [ ] `npm run verify:release-integrity` passes with exit code `0`.
- [ ] All 7 security & adversarial Jest suites (`security-regression`, `adversarial-execution`, `ssrf-execution`, `passport-*`, `tenant-isolation`) pass 100%.
- [ ] Fresh Ed25519-signed evidence bundle generated (`node scripts/release/verify-evidence-bundle.mjs`).
