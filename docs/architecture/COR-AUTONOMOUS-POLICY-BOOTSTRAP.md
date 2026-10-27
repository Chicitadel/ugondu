<!--
******************************************************************************
* Project        : Ugondu Universal Delivery Operating System
* Module         : Architecture Specification & Protected Governance
* File           : COR-AUTONOMOUS-POLICY-BOOTSTRAP.md
* Version        : 1.1.0
* Author         : Ujomor Systems Architecture & Platform Governance Authority
* Organization   : Ujomor Systems
* Created Date   : 2026-10-21
* Last Modified  : 2026-10-21
* Classification : ENTERPRISE | INTERNAL
*
* Governance:
* - Corporate Governance Approved
* - Security Reviewed
* - Architecture Controlled
* - Protocol Frozen
* - Modularization Enforced
*
* Standards:
* - ISO 27001
* - SOC 2
* - OWASP ASVS
* - NIST
*
* Signatures:
* - Architecture Authority
* - Security Authority
* - Governance Authority
* - Deployment Authority
*
* Copyright (c) 2026 Ujomor Systems
* All Rights Reserved.
******************************************************************************
-->

# COR Autonomous Policy Stabilization and Bootstrap Contract

**Status:** Implementation Contract for `phase4/production-hardening`  
**Scope:** Ugondu bootstrap, reconciliation, and recovery; AWS COR V9 is the initial provider adapter.  
**Decision:** Option A — autonomous reconciliation is the default path. Manual console instructions are not the normal recovery path.

---

## 1. Required User Experience

A platform operator must be able to execute one supported CLI command (or trigger one UI action) to bootstrap COR. The identical shared core reconciler engine is invoked across terminal, UI, IDE, CI/CD, model-assisted, and model-free execution entry points. Advanced assistive tooling may explain intent or summarize diagnostics, but core reconciliation remains 100% deterministic and operates fully independent of external model inference.

The autonomous bootstrap sequence enforces deterministic progression:
1. Discovers caller identity, provider tenancy, account/project, and target regions.
2. Inspects existing identity objects, roles, and managed policies.
3. Validates signed policy-pack provenance, recursive canonical digests, and policy documents.
4. Synthesizes a deterministic reconciliation plan.
5. Provisions or reconciles only canonical Ugondu-owned managed policies.
6. Attaches missing approved policies to the canonical execution role (`UgonduCORExecutionRole`).
7. Verifies attachments, session-tag trust preconditions, and provider-level boundaries.
8. Executes read-only conformance probes.
9. Persists signed cryptographic evidence and durable recovery checkpoints.
10. Resumes deterministically after interruption without replaying non-idempotent operations.

---

## 2. Existing Implementation Baseline

On `phase4/production-hardening`, `.github/workflows/cor.yml` executes:
1. `node scripts/aws-conformance/reconcile-bootstrap-policy-pack.mjs --phase bootstrap-provision` under base OIDC credentials.
2. Assumption of the tagged `UgonduCORExecutionRole` session.
3. `node scripts/aws-conformance/reconcile-bootstrap-policy-pack.mjs --phase verify-effective` under the execution role.
4. Read-only conformance probes and physical qualification.

The baseline reconciler validates five V9 policy templates and their SHA-256 digests. Production hardening elevates this foundation from an ad-hoc script into an enterprise ownership-safe reconciler that eliminates hidden prerequisite failures and unhandled error states.

---

## 3. Bootstrap Authority vs. Execution Authority

Autonomous execution must never be conflated with self-granting authorization. A software process cannot grant itself authority absent from its caller's principal. The bootstrap principal is authorized once by an enterprise platform administrator or sovereign IaC deployment. Routine downstream deployments require zero manual policy mutations.

Two strictly separated permission domains are enforced:
- **Bootstrap Principal / Runner (`UgonduCORRunner`):** Identity discovery, read-only inspection of canonical roles and policies, controlled creation/versioning of canonical Ugondu-owned policy objects where pre-authorized, attachment of only allow-listed policy ARNs to `UgonduCORExecutionRole`, and post-mutation verification.
- **Execution Role (`UgonduCORExecutionRole`):** Workload infrastructure permissions granted exclusively by the approved, signed V9 policy pack. Workload permissions are never granted to the runner principal.

---

## 4. Service-Linked Role (SLR) Preflight Resolution

To eliminate latent failures (such as COR-001/COR-007 where RDS DB subnet group creation fails downstream due to an unverified service-linked role), the bootstrap reconciler implements deterministic preflight prerequisite resolution:

1. **Deterministic Read Probe:** Query role existence via `iam:GetRole` for `AWSServiceRoleForRDS` prior to any mutating calls.
2. **Convergence Verification (`NO_OP`):** If the role exists, inspect its service principal (`rds.amazonaws.com`) and canonical state. Record `NO_OP` with evidence and proceed.
3. **Authorized Creation:** If absent, invoke `iam:CreateServiceLinkedRole` with `--aws-service-name rds.amazonaws.com` only when caller authorization explicitly includes this capability scoped by condition key `iam:AWSServiceName: rds.amazonaws.com`.
4. **Concurrent Creation Race:** If the provider returns `EntityAlreadyExists`, immediately re-read and verify the role. Never assume success without live read confirmation.
5. **Fail-Closed on Denial:** If creation returns `AccessDenied`, permissions-boundary violation, Service Control Policy (SCP) rejection, or network timeout:
   - **Never swallow or ignore exceptions in catch blocks.**
   - Emit typed diagnostic code `UG-BOOTSTRAP-AUTH-MISSING`.
   - Record provider request ID, transaction ID, and exact missing action (`iam:CreateServiceLinkedRole`).
   - Halt execution immediately before any dependent RDS operations execute.

---

## 5. Action-Aware Wildcard Validation and Target Rendering

Blanket rejection of `Resource: "*"` (COR-005) is architecturally incorrect because numerous AWS read/list/describe APIs natively mandate wildcard resource scope in IAM. The policy renderer and static validator apply action-aware semantic validation:

- **Action Metadata Catalogue:** The validator references provider action definitions to determine whether an API supports resource-level permissions.
- **Allowed Wildcards:** Actions that require global/all-resource scope (e.g., `ec2:Describe*`, `rds:Describe*`, `iam:List*`) legitimately permit `Resource: "*"`. Where supported by the provider, statements are constrained with condition keys (e.g., `aws:RequestedRegion`).
- **Denied Wildcards:** Any mutative action (`ec2:RunInstances`, `ec2:CreateVpc`, `s3:PutObject`, `iam:AttachRolePolicy`) targeting `Resource: "*"` is rejected during plan validation unless covered by an explicit, architecturally reviewed exception.
- **Target Parameterization:** All policy templates decouple target accounts, partitions, role paths, and regions (COR-004). Values are rendered from validated execution targets rather than static fallback defaults (e.g., eliminating hardcoded `eu-west-3` or pinned accounts).
- **Recursive Canonical Digest:** Policy integrity verification uses recursive canonical JSON hashing (COR-006), deterministically sorting nested keys and preserving array order.

---

## 6. Reconciliation State Machine and Fail-Closed Exit Semantics

The reconciler executes across explicit, durable lifecycle phases:

```txt
DISCOVERING -> VALIDATING -> PLANNING -> AUTHORIZED -> APPLYING -> VERIFYING -> COMPLETE
```

Terminal and resumable failure states include:
- `AUTHORITY_MISSING`
- `DRIFT_UNSAFE`
- `PROVIDER_UNAVAILABLE`
- `ACCESS_DENIED`
- `VERIFY_FAILED`
- `INTERRUPTED`

### Fail-Closed Exit Semantics (COR-002 / COR-003)

- **Strict Non-Zero Exit:** If any required bootstrap mutation is denied or cannot be verified, the reconciler must return a non-zero process exit code and a structured failure packet. It must NEVER exit with status 0 while recording an internal denial.
- **Immediate Execution Halt:** Workload provisioning must never be invoked after a denied bootstrap mutation. Downstream jobs are blocked immediately at the point of failure.
- **Create-Before-Attach Lifecycle:** Policy objects must be created or updated, and their live read digests verified, before any attachment operation is attempted.
- **Ownership Verification:** Pre-existing policies sharing canonical names are adopted only if their tags, ownership metadata, and recursive digests match. Foreign or ambiguous policies trigger `DRIFT_UNSAFE` and halt without overwrite.

---

## 7. Verification and Evidence Requirements

Bootstrap success requires live read confirmation across all dimensions:
- Caller identity and AWS partition match configured target.
- Execution role trust policy requires runner ARN and mandates session tags `UgonduTransactionId` and `UgonduCOR`.
- All five V9 policies exist with current default version digests matching expected canonical digests.
- All five policies are attached to `UgonduCORExecutionRole`.
- No workload execution policies are attached to `UgonduCORRunner`.
- Read-only conformance probes execute successfully.
- Evidence report records exact timestamps, transaction IDs, policy digests, and provider request IDs.

---

## 8. Protected-Zone Governance and Mutation Boundaries

To prevent regressions in qualified production paths, all components are partitioned into formal certification boundaries as codified in `docs/cor/CERTIFICATION_BOUNDARIES.yaml`:

### Certified Boundaries (Immutable by Default)
1. `aws.oidc-tagged-role-chain`: OIDC credential exchange and tagged execution-role assumption (`.github/workflows/cor.yml`, `policy-packs/aws/cor/templates/roles/execution-role-trust.json`).
2. `aws.physical.vpc-ec2-ebs`: VPC, Subnet, Security Group, EC2 Instance, and EBS Snapshot provisioning (`server/engine-core/src/fabric/providers/aws-native-client.ts`).
3. `aws.physical.urre-rollback`: Dependency-aware rollback and residual resource cleanup (`server/engine-core/src/urre/`).

**Mutation Rule:** Certified paths cannot be modified unless an active `MODIFICATION_ZONE` is formally approved. Mutating protected paths without authorization triggers immediate CI rejection.

### Active Modification Zones
1. `aws.bootstrap.slr-prerequisite`: Addressing COR-001/COR-007 (SLR preflight resolution).
2. `aws.bootstrap.policy-reconciliation`: Addressing COR-002/COR-003 (Fail-closed exit semantics and ownership reconciler).
3. `core.policy-renderer-and-digest`: Addressing COR-004/COR-005/COR-006 (Action-aware wildcard validation, target rendering, recursive canonical digest).
4. `platform.provider-neutral-adapters`: Addressing COR-008/COR-013 (Universal adapter contracts and cross-OS parity).

Any pull request touching a modification zone must execute targeted unit tests and full contract test suites for all dependent certified boundaries.

---

## 9. Failure Handling and Remediation Protocol

When a bootstrap identity lacks a required permission:
1. Halt immediately before any state mutation occurs.
2. Emit machine-readable diagnostic `UG-BOOTSTRAP-AUTH-MISSING`.
3. Generate a minimal, scoped provider-native authorization patch artifact (e.g., downloadable IAM policy JSON).
4. Persist transaction state in the durable execution ledger.
5. Present the exact resume command: `ugondu resume --transaction <transaction-id>`.

---

## 10. Universal Platform Acceptance Gate

The COR autonomous policy bootstrap is certified for universal production release only when:
- Clean account and pre-converged targets execute deterministically with zero drift.
- SLR preflight handles existing, race-created, and denied paths cleanly.
- Action-aware wildcard validation permits verified read actions while blocking mutative wildcards.
- Recursive canonical JSON digest accurately identifies policy modifications.
- Protected certified boundaries remain completely unregressed.
- All exit semantics are strictly fail-closed.
