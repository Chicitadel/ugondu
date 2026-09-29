/******************************************************************************
 * Project        : Enterprise Autonomous Operational Readiness & Certification System (EAORCS)
 * Module         : Branch Protection & Main Repository Integrity Policy
 * File           : BRANCH_PROTECTION_POLICY.md
 * Version        : REL-2026.3.1-LTS
 * Author         : Architectural Governance Council & Ujomor Systems Engineering
 * Organization   : Air Roofers Platform Ecosystem & Ujomor Systems
 * Created Date   : 2026-08-21
 * Last Modified  : 2026-08-21
 * Classification : GOVERNMENT | ENTERPRISE | RESTRICTED
 *
 * Governance:
 * - Architecture Authority Approved
 * - Security Reviewed (ISO 27001, SOC 2, OWASP ASVS, NIST SP 800-161, DORA, NIS2)
 * - Corporate Policy Governed (UAIGOS 3.0.0 Enterprise)
 *
 * Standards:
 * - ISO 27001 Section A.14.2.8
 * - SOC 2 Trust Services Criteria CC8.1
 * - NIST SP 800-161 Supply Chain Risk Management
 *
 * Signatures:
 * - Architecture Authority
 * - Security Authority
 * - Governance Authority
 * - Deployment Authority
 *
 * Copyright (c) 2026 Air Roofers Platform Ecosystem & Ujomor Systems
 * All Rights Reserved.
 ******************************************************************************/

# EAORCS Main Branch Protection & Repository Integrity Policy

## 1. Objective & Scope

This policy defines the immutable rules governing protected branches (`main`, `master`, and `release/*`) across all repositories in the Air Roofers and EAORCS platform ecosystems. The objective is to enforce zero uncertified code injection, guarantee cryptographic auditability, and ensure that every commit promoted to production has passed pristine CI qualification.

---

## 2. Core Protection Invariants

### 2.1 Direct Commit Prohibition
- **No Direct Commits**: Direct commits and non-fast-forward pushes to `main`, `master`, and `release/*` branches are strictly prohibited.
- **Pull Request Requirement**: All code changes, documentation updates, and governance amendments must be submitted via a Pull Request (PR).
- **Zero Administrative Bypass**: Branch protection enforcement applies universally to all developers, engineering leads, automated bots, and administrative accounts without exception.

### 2.2 Mandatory CI Status Checks
Before any PR can be merged into a protected branch, the following automated status checks must pass with exit code `0`:
1. **Zero-Drift Certification Pipeline** (`certification.yml` / `eaorcs-certify.yml`):
   - Full history checkout (`fetch-depth: 0`).
   - Physical Git HEAD verification against `GITHUB_SHA`.
   - Master qualification runner execution with cache bypass (`--bypassCache`).
   - Subject verification asserting live HEAD equality with qualification receipt.
   - Clean working tree verification (zero uncommitted or untracked artifact drift).
2. **Zero Synthetic Pass Scanner** (`zero_synthetic_pass_scanner.test.js`):
   - 100% AST and JSON evidence inspection across the codebase.
   - Zero tolerance for mock, synthetic, or placeholder PASS artifacts.
3. **Publication Parity Gate** (`publication_parity_gate.test.js`):
   - Strict zero-write verification confirming local HEAD equals remote tracking branch and qualification subject.
4. **Security Vulnerability Audit**:
   - Automated dependency vulnerability scan with zero high or critical findings.

### 2.3 Mandatory Peer & Governance Reviews
- **Minimum Approvals**: Every PR requires a minimum of 2 authorized peer reviews before merging.
- **Code Owner Approval**: Changes affecting `.governance/`, `.audit/`, `engine/certification/`, or `engine/constitution/` require explicit review and cryptographic sign-off from the Architectural Governance Council and Security Authority.
- **Stale Approval Invalidation**: Any new commit pushed to an open PR automatically dismisses existing approvals, requiring re-review.

### 2.4 Cryptographic Signatures & Linear History
- **Signed Commits Required**: All commits must be cryptographically signed using GPG or Ed25519 keys registered with authorized identity profiles.
- **Linear History Enforced**: Merge commits and non-linear rebases that obscure history are forbidden. PRs must be squash-merged or rebased to preserve a linear, deterministic commit lineage.
- **Branch Deletion Protection**: Protected branches cannot be renamed or deleted.

---

## 3. Enforcement & Audit Trail

| Rule | Enforcement Mechanism | Failure Action |
| :--- | :--- | :--- |
| Direct Push Prevention | Git Server Hooks & Repository Protection Settings | Immediate Rejection (403 Forbidden) |
| CI Status Gating | GitHub Actions Workflow Status Checks | Merge Blocked (Required Check Pending/Failed) |
| Review Threshold | Multi-Party Sign-Off Policy Engine | Merge Blocked (Awaiting Approvals) |
| Working Tree Cleanliness | Zero-Drift Step in `certification.yml` | CI Build Failure |
| Lineage Immutability | Pre-Receive Merkle Root Verification | Push Rejected |

---

## 4. Compliance & Verification

Compliance with this policy is continuously audited via automated governance gates and verified during each release cycle. Any violation or attempt to circumvent branch protection triggers an immediate security incident review under SOC 2 and ISO 27001 operational standards.
