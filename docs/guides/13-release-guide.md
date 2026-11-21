<!--
/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Developer & Operator Documentation (Guide 13)
 * File           : 13-release-guide.md
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-10-18
 * Last Modified  : 2026-10-18
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

# 13 — Release & Certification Guide

## 1. Canonical Release Pipeline Overview (`ADR-005`)

Ugondu enforces an immutable, cryptographically attested release pipeline (`.github/workflows/release.yml`, `.goreleaser.yml`, `scripts/verify-release-integrity.js`, and `scripts/release/verify-evidence-bundle.mjs`). A single unified Go thin-client binary and multi-arch control-plane container image (`ghcr.io/airroofers/ugondu`) are built, signed, and syndicated only after passing all release gates.

---

## 2. Mandatory Release Evidence Bundle Structure (Section 14.3)

Every release candidate must generate and verify the canonical `evidence/` directory via `scripts/release/verify-evidence-bundle.mjs`:

```text
evidence/
├── manifest.json                              # Canonical SHA-256 index of all evidence artifacts
├── source/
│   ├── commit.txt                             # Exact Git HEAD SHA and tree hash
│   └── tracked-files.sha256                   # Deterministic SHA-256 of every git-tracked file
├── governance/
│   ├── policy-results.json                    # UAIGOS / UPPIE policy evaluation results
│   ├── exception-register.json                # Active governance exceptions (empty if zero)
│   └── adr-index.json                         # Frozen ADR & UPLM-ADR registry index
├── security/
│   ├── secrets-scan.sarif                     # SARIF v2.1.0 private-key & secret scan report
│   ├── dependency-scan.json                   # Workspace dependency vulnerability audit
│   ├── sbom.cdx.json                          # CycloneDX v1.5 Software Bill of Materials
│   └── provenance.json                        # SLSA v1.0 build provenance attestation
├── tests/
│   ├── unit-results.xml                       # JUnit XML unit test report
│   ├── contract-results.xml                   # JUnit XML OpenAPI/schema contract report
│   ├── integration-results.xml                # JUnit XML microservice integration report
│   ├── e2e-results.xml                        # JUnit XML end-to-end delivery lifecycle report
│   ├── security-results.xml                   # JUnit XML adversarial/SSRF/passport security report
│   ├── compatibility-results.json             # 12-locale & cross-platform compatibility matrix
│   └── aws-conformance-results.json           # COR V9 (`971671216490`, `eu-west-3`) conformance report
├── runtime/
│   ├── health-readiness.json                  # Readiness probes for ports 4001–4005
│   ├── trace-samples.json                     # OpenTelemetry / correlation trace samples
│   └── deployment-receipt.json                # Signed URRE / DEISE deployment verification receipt
└── signatures/
    └── evidence-manifest.sig                  # Ed25519 signature + public verification envelope
```

---

## 3. Step-by-Step Release Procedure

### Step 1: Pre-Release Cleanliness & Integrity Gate
```bash
npm run verify:release-integrity
node scripts/validate-locales.js
```

### Step 2: Full Workspace Build & Test Execution
```bash
npm run build
npm test
npm run lint
cd client && go test ./... && cd ..
```

### Step 3: Generate & Cryptographically Verify the Release Evidence Bundle
```bash
# Generate complete evidence/ bundle and sign manifest.json with Ed25519
node scripts/release/verify-evidence-bundle.mjs --generate

# Independently verify all artifact SHA-256 digests and Ed25519 signature
node scripts/release/verify-evidence-bundle.mjs --verify
```

### Step 4: Tag & Publish Release Candidate
```bash
git tag -a v1.0.0 -m "Release v1.0.0 — Certified COR & UPLM Baseline"
git push origin v1.0.0
```
Pushing the semantic version tag triggers `.github/workflows/release.yml`, which executes:
1. GoReleaser cross-compilation (`.deb`, `.rpm`, Homebrew tap, archives).
2. Multi-arch Docker build and push to `ghcr.io/airroofers/ugondu`.
3. Anchore Syft SBOM generation and Sigstore Cosign keyless signing.

---

## 4. Exit Codes & Release Gate Failures

| Script / Gate | Exit Code | Failure Cause | Remediation |
|---|---:|---|---|
| `scripts/verify-release-integrity.js` | `1` | Tracked private key (`*private.pem`) or stale `cor-evidence-bundle.json` | Remove forbidden file from Git index (`git rm --cached`) |
| `scripts/release/verify-evidence-bundle.mjs --verify` | `1` | Any file in `evidence/` is missing, modified, or `evidence-manifest.sig` fails Ed25519 verification | Re-run `node scripts/release/verify-evidence-bundle.mjs --generate` on clean HEAD |
| `verify-cor-candidate.ps1` | `1` | Lint failure, dirty working tree, or forbidden placeholder string | Fix lint/placeholder violation before tagging |

---

## 5. Clean-Room Release Validation Checklist

- [ ] `git status --porcelain` is clean prior to tagging.
- [ ] `npm run verify:release-integrity` outputs `[PASS]`.
- [ ] `node scripts/release/verify-evidence-bundle.mjs` generates all 20 required files under `evidence/` and verifies the Ed25519 signature in `evidence/signatures/evidence-manifest.sig`.
- [ ] `evidence/` remains untracked in Git (never committed to source control).
