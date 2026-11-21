<!--
/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPLM Architecture Decision Records
 * File           : UPLM_ADR.md
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

# UPLM Architecture Decision Records (UPLM-ADR-001 through UPLM-ADR-005)

## UPLM-ADR-001: Server-Governed Plugin Admission & Zero Client Code Injection

- **Status:** FROZEN
- **Date:** 2026-10-18
- **Decision Authority:** Ujomor Systems Engineering & Governance Authority

### Context
Unrestricted client-side plugin execution allows supply-chain tampering, entitlement bypass, and arbitrary shell execution on customer hosts.

### Decision
All plugins in Ugondu are governed through the server-side `plugin-manager` (`:4003`) and `engine-core` (`:4001`):
1. Every plugin must supply a **Manifest Schema v2** signed with **Ed25519** verified against `config/trust/plugin_authority.pub.pem`.
2. Server-side plugins execute inside rootless, network-isolated Docker containers (`--rm --init --read-only --network=none --cap-drop=ALL --security-opt=seccomp=default --pids-limit=64`).
3. The Go thin client (`client/`) never downloads or executes arbitrary third-party binaries; it executes only canonical, strongly-typed step actions (`actions.go`, `actions_extended.go`) embedded in an Ed25519/HMAC-signed `ExecutionRecipe`.

### Consequences
- Complete eradication of unverified client-side plugin execution.
- Deterministic auditability of all plugin steps via `ExecutionRecipe` and `ExecutionTelemetry`.

---

## UPLM-ADR-002: Unified URRE & DEISE Durable State Machine Integration

- **Status:** FROZEN
- **Date:** 2026-10-18
- **Decision Authority:** Ujomor Systems Engineering & Governance Authority

### Context
Plugin executions and infrastructure mutations can fail mid-flight due to network partitions, process crashes, or out-of-band target drift.

### Decision
Bind all plugin and adapter actions into the **URRE** (Universal Resilient Recovery & Execution Engine) and **DEISE** (Deployment Environment Integrity & Self-Healing Engine) pipeline:
1. Prior to executing any deployment or repair plan, DEISE constructs an `EnvironmentTwin` and classifies drift (`PAYLOAD_DRIFT`, `TOPOLOGY_DRIFT`, `ENVIRONMENT_DRIFT`, `RUNTIME_DRIFT`, `INFRASTRUCTURE_DRIFT`).
2. Every DAG node transition is journaled atomically before and after mutation (`urre-journal.ts`, `client/engine/state.go`).
3. On process interruption or crash, `ugondu resume <txId>` reloads the persisted transaction state and skips already-verified idempotent nodes.
4. On unrecoverable step failure, URRE executes reverse-topological compensation/rollback across all activated plugins and adapters.

### Consequences
- Zero-data-loss recovery on cPanel/DirectAdmin/Cloud migrations (DEISE "Do No Harm" invariant).
- Mathematically verifiable crash-resume idempotency (`COR-4.15`, `COR-4.16`, `COR-4.17`).

---

## UPLM-ADR-003: Agentless Capability Parity & Execution Path Equivalence

- **Status:** FROZEN
- **Date:** 2026-10-18
- **Decision Authority:** Ujomor Systems Engineering & Governance Authority

### Context
As AI-assisted planning and remediation capabilities expand through the AI Inference Gateway, operators in regulated, deterministic, or air-gapped environments require full manual control without mandatory LLM dependencies.

### Decision
Enforce two immutable invariants across `server/capabilities` and `.governance/policies/capabilities-matrix.yaml`:
1. **Agentless Capability Parity Invariant**: Every commercially released capability must be invocable by a human operator through the canonical CLI (`ugondu`) and UI without requiring an AI model or agentic planner.
2. **Execution Path Equivalence Invariant**: Both human CLI/UI commands and AI Inference Gateway proposals must compile into the exact same `Intent -> ArchitectureIR -> UPPIE Policy Decision -> ExecutionAuthorization -> URRE Execution -> Independent Verification -> Evidence Passport` pipeline.

### Consequences
- AI providers act purely as intent/diagnostic accelerators and can never bypass UPPIE policy gates or IAM scope boundaries.

---

## UPLM-ADR-004: Five-Way Split AWS COR V9 Managed Policies with Transaction ABAC

- **Status:** FROZEN
- **Date:** 2026-10-18
- **Decision Authority:** Ujomor Systems Engineering & Governance Authority

### Context
AWS enforces a strict 6,144-character limit per managed IAM policy and a default limit of 10 managed policies per role. The comprehensive zero-trust COR V9 policy (`server/engine-core/Ugondu_CORExecutionRole_Policy_V9.json`, ~30.5 KB formatted) requires fine-grained resource ARN scoping, region locking (`eu-west-3`), and transaction-level ABAC tag matching (`UgonduCOR=true`, `UgonduTransactionId=${aws:PrincipalTag/UgonduTransactionId}`).

### Decision
Partition `Ugondu_CORExecutionRole_Policy_V9.json` into **5 domain-isolated AWS Managed Policies** attached to `arn:aws:iam::971671216490:role/UgonduCORExecutionRole`:
1. `UgonduCOR_V9_Part1_NetworkAndVPC`
2. `UgonduCOR_V9_Part2_ComputeAndSnapshots`
3. `UgonduCOR_V9_Part3_RDSAndStorage`
4. `UgonduCOR_V9_Part4_ContainersAndFargate`
5. `UgonduCOR_V9_Part5_ReadDiscoveryAndTelemetry`

Every mutating or destructive statement requires:
- `aws:RequestedRegion = "eu-west-3"` (or `s3:LocationConstraint = "eu-west-3"`)
- `aws:RequestTag/UgonduCOR = "true"` on creation and `aws:ResourceTag/UgonduCOR = "true"` on modification/deletion
- `aws:RequestTag/UgonduTransactionId = "${aws:PrincipalTag/UgonduTransactionId}"` with `Null` guard `{"aws:PrincipalTag/UgonduTransactionId": "false"}`
- Explicit `Deny` on tag stripping (`DenyRemovalOfUgonduOwnershipTags`, `DenyECSTagStripping`).

### Consequences
- Eliminates blast-radius leakage: a transaction session can never modify or delete AWS resources belonging to another transaction or non-COR workload in account `971671216490`.

---

## UPLM-ADR-005: Ed25519 Signed Release Evidence Bundle (`verify-evidence-bundle.mjs`)

- **Status:** FROZEN
- **Date:** 2026-10-18
- **Decision Authority:** Ujomor Systems Engineering & Governance Authority

### Context
Enterprise and Sovereign customers require cryptographic proof that every release candidate has passed governance, security, unit/contract/integration/e2e/conformance tests, and runtime readiness checks.

### Decision
Standardize a self-verifying `evidence/` bundle generated and verified by `scripts/release/verify-evidence-bundle.mjs` signed with **Ed25519** (`evidence/signatures/evidence-manifest.sig`), without ever committing private keys to the Git repository.
