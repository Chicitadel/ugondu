# LOC Remediation Program: S0-S3 (Policy, Inventory, Analysis, Rehearsal)

This plan establishes the authoritative repository-wide LOC invariant policy, generates the deterministic violation inventory, analyzes the dependencies for safe decomposition, and executes a read-only projected-subject rehearsal. The LOC subsystem will be subjected to strict adversarial testing before any integration with the master certification runner, and physical decomposition will only begin after the read-only rehearsal is proven.

## User Review Required

> [!IMPORTANT]
> - **Blueprint Exclusions**: S0 dictates that no exclusion is permitted unless explicitly authorized by the blueprint and proven non-executable. Are there any specific documents in the blueprint we should cross-reference besides `Air Roofers Guide §5.1` and the existing CI configurations to determine authoritative exclusions?

## Proposed Changes

---

### LOC-S0: Authoritative Scope Discovery & Policy Freeze

#### [NEW] `engine/governance/loc_policy_auditor.js`
Performs `LOC-P0 — Blueprint Conformance` to discover and validate policy exclusions against the authoritative blueprint, existing governance, and CI configurations.
- **Rule**: `EXCLUSION_ALLOWED` iff blueprint explicitly authorizes it AND directory is non-executable for certification purposes AND CI/master runner uses identical policy AND attempts to place governed code there cannot bypass the rule.
- Freezes the validated policy into `.governance/policies/file-size-governance.json`. No ad-hoc exclusions are permitted.

---

### LOC-S1: Deterministic Subject Inventory

#### [NEW] `engine/governance/loc_inventory_generator.js`
A dumb inventory generator that reads `file-size-governance.json` and traverses `git ls-files` to inventory all governed JS/MJS/CJS files.
- Generates `.governance/loc/governed_file_inventory.json`.
- Binds subject identity tightly: `subjectDigest` wraps `treeDigest`, `policyDigest`, and `inventoryDigest`.
- Prevents same inventory from being reused against a different source tree.

---

### LOC-S2: Full Decomposition Analysis

#### [NEW] `engine/governance/loc_decomposition_analyzer.js`
Analyzes **all** 100+ violations (not just the largest) to map dependencies, exports/imports, state ownership, and domain boundaries using AST parsing.
- Generates `.governance/loc/decomposition_plan.json`.
- Proves ownership and establishes machine-testable safe extraction boundaries.
- **Domain Neutrality**: Specifically asserts that extraction of `DeepScanIntelligenceEngine.js` does not introduce AI/model/inference ownership into EAORCS.
- **No Semantic Delta**: Reconciles exports, routes, event names, and schemas to ensure `semanticDigestBefore == semanticDigestAfter`.

---

### LOC-S3: Authoritative Read-Only Projected Rehearsal

#### [NEW] `engine/governance/loc_rehearsal_engine.js`
Simulates actual execution consequences on a "shadow execution filesystem" (projected filesystem).
- Mutates the projected state in-memory (simulated deletes, creates, moves, import/export rewrites).
- Executes the **exact same authoritative validators** (same LOC verifier, interface verifier, domain verifier) against the projected state with writes disabled.
- **Projected LOC Verification**: Calculates projected LOC and globally verifies `violationsAfter == 0`. Detects incomplete remediation (new oversized files) and scope displacement (oversized files moved to excluded directories).
- Generates a comprehensive `rehearsal_plan.json` containing the projected subject, remediation graph, projected dependencies, and rehearsal digest.
- Emits verdict: `🟢 EXECUTION-EQUIVALENT` only if all mandatory predicates pass.

---

### Adversarial LOC Testing

#### [NEW] `tests/governance/loc_adversarial_rehearsal.test.js`
Implements 15 hostile tests (LOC-H01 to LOC-H15) to prove the LOC subsystem cannot be bypassed.
- Ensures oversized files fail, excluded directories are policy-authorized, new violations fail, policy drift fails, and projected extraction preserves domain ownership and public exports.
- **Timing**: These tests must pass *before* the LOC subsystem is integrated into the master certification gate (`run_governance.js`).

## Verification Plan

### Automated Tests
- Run `node engine/governance/loc_policy_auditor.js` to freeze the policy.
- Run `node engine/governance/loc_inventory_generator.js` to build the inventory.
- Run `node engine/governance/loc_decomposition_analyzer.js` to map all violations.
- Run `node engine/governance/loc_rehearsal_engine.js` to perform the read-only projection.
- Run `node tests/governance/loc_adversarial_rehearsal.test.js` to validate the 15 hostile scenarios.

### Manual Verification
- Await the `🟢 EXECUTION-EQUIVALENT` output from the rehearsal engine before commencing parallel physical decomposition (LOC-A through LOC-Z).
- (Post-Decomposition) Execute a fresh, full `F0-F17` certification cycle to independently prove algorithm equivalence and subject identity.
