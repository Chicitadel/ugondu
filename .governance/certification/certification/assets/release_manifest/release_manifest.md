
# UPVCRAS Release Assurance Decision (AR-STD-038 v3.0)

**Product:** `airroofers-platform` v`1.0.0`
**Release Decision:** 🟢 RELEASE CANDIDATE APPROVED (SELF-VALIDATED)
**Decision ID:** `dec-bd66682c-273d-49ba-8360-f248ca3ac682`
**Architecture Baseline:** `UPVCRAS-3.0.0` | **Trust Model:** `v1.0.0`
**Manifest Hash:** `205a2cc8777a02f6be49d24f1a308f924363e65a49c03c7eb878dc73bc33ab61`
**Release Integrity Digest:** `HMACSigned(SHA256):205A2CC8777A02F6`
**Policy Pack:** `ENTERPRISE v3.2.0` | **Mode:** `RELEASE_CANDIDATE`

## Executed Certification Runners
| Runner | Status | Tests | Duration |
|---|---|---|---|
| architecture-runner v3.0.0 | ✅ PASSED | 1/1 | 5ms |
| api-contract-runner v3.0.0 | ✅ PASSED | 4/4 | 5ms |
| security-runner v3.0.0 | ✅ PASSED | 5/5 | 4ms |
| framework-integrity-runner v3.0.0 | ✅ PASSED | 3/3 | 4ms |

## Rule Evaluation Trace Matrix
| Rule ID | Domain | Required Trust | Evaluated Trust | Result | Rationale |
|---|---|---|---|---|---|
| RULE-7251440E | architecture-runner | LOCAL | LOCAL | PASS | Runner tests passed. |
| RULE-88501A74 | api-contract-runner | LOCAL | LOCAL | PASS | Runner tests passed. |
| RULE-6E0A3AD5 | security-runner | LOCAL | LOCAL | PASS | Runner tests passed. |
| RULE-657EE367 | framework-integrity-runner | LOCAL | LOCAL | PASS | Runner tests passed. |

**Total Managed Assets Collected:** 8 artifacts


## Cryptographic Signatures & Key Governance
- **Key Identifier (keyId):** `KEY-UPVCRAS-PROD-2026-v3-94939cf2`
- **Algorithm & Version:** `RSA-2048` (v`1.0.0`)
- **Key Validity Period:** `2026-07-24T07:44:10.260Z` to `2027-07-24T07:44:10.260Z`
- **HMAC Integrity Digest:** `HMACSigned(SHA256):C6BB78557FCE6320A7A29FBD2D79F11B748988A4BB22045008FA6EE28B922FAD`
- **RSA Digital Signature:** `SIG_RSA2048_KEY-UPVCRAS-PROD-2026-v3-94939cf2_UxDmI3q0lmXc7nwTTGap9OMD4nr7byeZFCTs4axMjL5Jjmee`
- **Signature Verification:** `PASSED (VERIFIED)`
- **Independent Vault Validation:** `VALIDATED` (8/8 verified)
