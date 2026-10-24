<!--
******************************************************************************
* Project        : Ugondu Universal Delivery Operating System
* Module         : Architecture Specification & Universal Governance
* File           : UNIVERSAL_AUTONOMOUS_BOOTSTRAP.md
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

# Universal Autonomous Bootstrap and Policy Governance

**Status:** Implementation Specification & Governance Standard  
**Target:** Ugondu Universal Execution Engine; AWS COR is the Initial Adapter  
**Branch:** `phase4/production-hardening`  
**Normative Principle:** One bootstrap experience, one shared reconciler, provider-specific adapters, deterministic execution, and zero routine manual policy intervention.

---

## 1. Product Requirement

Ugondu bundles every policy stabilization mechanism, migration path, validation rule, and recovery routine required to bootstrap supported hosting environments. Enterprise operators and developers must not be subjected to manual policy creation, individual attachment steps, or repetitive console operations once the initial bootstrap identity is authorized.

The human setup is minimized to one initial provider-native authorization step, followed by one Ugondu command or UI action. Ugondu then discovers existing resources, validates ownership and policy documents, reconciles missing policy objects from the bundled versioned pack, attaches only approved policies, verifies effective prerequisites, and resumes deployment from a durable checkpoint.

The core reconciliation engine is fully deterministic and model-free. Identical deployment and recovery capabilities are guaranteed across CLI, UI, IDE, and CI/CD pipelines.

---

## 2. Authorization Boundary and Non-Escalation

No software process can grant itself permissions that its bootstrap identity does not already possess. "Autonomous" denotes the automated reconciliation of authorized intent; it never permits the bypass of provider authorization, organizational policies, governance approvals, or security boundaries.

The initial identity grant is established once by an authorized platform administrator or corporate IaC pipeline. Ugondu validates this authority prior to state mutation. If a required permission is denied, execution halts immediately before any partial workload deployment occurs, emitting a typed blocker identifying the exact missing action, resource, and condition.

Long-lived static access keys are prohibited. Ugondu mandates workload identity federation, OIDC, SSO, short-lived role sessions, and provider-native credential brokers.

---

## 3. Operator Experience: One Setup, One Action

The universal bootstrap workflow proceeds through standardized stages:

1. **One-Time Authorization Setup:** The operator is presented with the provider-native bootstrap principal name, a reviewed least-privilege policy bundle, and guidance. The principal is provisioned once with the approved bootstrap policy.
2. **Federated Connection:** Short-lived federated credentials are established. Secrets are never stored in repositories, policy packs, ledger journals, or logs.
3. **Execution Command:** The operator invokes `ugondu bootstrap --target <target-id>` (or clicks **Bootstrap and Deploy** in the management console).
4. **Autonomous Reconciliation:** The engine discovers active tenancy, accounts, subscriptions, regions, existing roles, policy documents, attachments, boundaries, and ownership metadata.
5. **Deterministic Plan and Apply:** An explicit, reviewable plan is synthesized. Low-risk additive changes proceed autonomously; high-risk trust changes or privilege expansions stop for explicit operator authorization.
6. **Live Verification:** Live read probes confirm policy digests, attachments, and conformance before advancing the checkpoint.
7. **Crash-Safe Recovery:** If an interruption occurs, the subsequent run reads the durable ledger, reconciles actual provider state, and resumes from the last verified transition without replaying non-idempotent calls.

---

## 4. AWS COR Naming, Ownership, and SLR Preflight

The AWS adapter discovers resources using canonical names before attempting creation:
- **Runner Role:** `UgonduCORRunner`
- **Execution Role:** `UgonduCORExecutionRole`
- **Bootstrap Principal:** `UgonduBootstrapRole` (when delegated bootstrap role isolation is configured)
- **Managed Policy Family:** `UgonduCOR-V9-*`
- **Expected Policies:** `UgonduCOR-V9-Discovery`, `UgonduCOR-V9-EC2-Creation`, `UgonduCOR-V9-EC2-Cleanup`, `UgonduCOR-V9-RDS-S3`, `UgonduCOR-V9-ECR-ECS`.

### Service-Linked Role (SLR) Preflight Resolution (COR-001 / COR-007)

To prevent downstream infrastructure failures (such as RDS DB subnet group creation failing due to missing service-linked roles), the reconciler enforces deterministic preflight resolution:
1. **Pre-Probe:** Execute `iam:GetRole` for `AWSServiceRoleForRDS` prior to initiating workload actions.
2. **Deterministic Convergence:** If the role exists, verify service principal `rds.amazonaws.com` and log `NO_OP`.
3. **Scoped Creation:** If absent, invoke `iam:CreateServiceLinkedRole` conditioned by `iam:AWSServiceName: rds.amazonaws.com` only when explicitly authorized.
4. **Race Condition Handling:** On `EntityAlreadyExists`, immediately re-read and verify role presence; never assume success without confirmation.
5. **Fail-Closed on Denial:** If creation returns `AccessDenied`, permissions boundary violations, or SCP denials, **never swallow or suppress exceptions**. Immediately emit `UG-BOOTSTRAP-AUTH-MISSING` and halt execution.

### Policy Attachment Responsibility

Workload policies belong exclusively on `UgonduCORExecutionRole`. The runner (`UgonduCORRunner`) retains only authority to federate, assume the execution role with mandatory transaction session tags (`UgonduTransactionId` and `UgonduCOR`), and perform scoped bootstrap operations. Workload permissions must never be attached directly to the runner.

---

## 5. Action-Aware Wildcard Validation and Dynamic Rendering

Blanket denial of wildcard resources (`Resource: "*"`) violates provider requirements where read/list/describe APIs natively mandate global scope (COR-005). The platform enforces action-aware semantic validation:

- **Action Capability Metadata:** The validator inspects provider action definitions. Actions requiring global scope (e.g., `ec2:Describe*`, `rds:Describe*`, `iam:List*`) are permitted `Resource: "*"` when appropriately scoped by condition keys (e.g., `aws:RequestedRegion`).
- **Prohibition on Mutative Wildcards:** Mutative operations (`ec2:RunInstances`, `ec2:CreateVpc`, `iam:AttachRolePolicy`) targeting `*` without resource constraints are strictly rejected.
- **Dynamic Target Parameterization:** Static account IDs and region fallbacks are removed (COR-004). Templates dynamically render target account, partition, and region parameters from verified deployment configurations.
- **Recursive Canonical JSON Digest:** Policy documents are fingerprinted using recursive canonical key sorting (COR-006) to ensure tamper detection is deterministic across all nesting levels.

---

## 6. Provider-Neutral Architecture

Policy governance is decoupled from AWS-specific primitives. The core platform interacts with targets via the `PolicyPermissionAdapter` interface:

```ts
type CapabilityState = "SUPPORTED" | "UNSUPPORTED" | "CONDITIONAL" | "UNKNOWN";

interface PolicyPermissionAdapter {
  providerId: string;
  discoverTarget(input: TargetSelector): Promise<DiscoveredTarget>;
  inspectPrincipal(target: DiscoveredTarget): Promise<PrincipalSnapshot>;
  inspectPolicy(target: DiscoveredTarget, logicalId: string): Promise<PolicySnapshot>;
  renderPolicy(pack: PolicyPack, target: DiscoveredTarget): Promise<RenderedPolicyPack>;
  validatePolicy(policy: RenderedPolicy): Promise<ValidationReport>;
  planReconciliation(state: ProviderSnapshot, pack: RenderedPolicyPack): Promise<ReconcilePlan>;
  applyApprovedPlan(plan: ReconcilePlan, context: ExecutionContext): Promise<ApplyResult>;
  verifyReconciliation(plan: ReconcilePlan): Promise<VerificationReport>;
  capabilities(): Promise<CapabilityManifest>;
}
```

Adapters preserve provider-native semantics. Normalization must never discard native conditions, boundaries, or inheritance rules. Capabilities marked `UNKNOWN` are treated as `UNSUPPORTED`.

---

## 7. Reconciliation Lifecycle and Fail-Closed Exit Semantics

The engine transitions deterministically across bounded phases:
```txt
DISCOVERING -> VALIDATING -> PLANNING -> AUTHORIZED -> APPLYING -> VERIFYING -> COMPLETE
```

### Fail-Closed Exit Semantics (COR-002 / COR-003)

- **Non-Zero Exit on Denial:** Any denied or unverified bootstrap mutation immediately terminates the process with a non-zero exit code and a structured diagnostic payload. Reporting a successful exit (0) while recording an internal denial is strictly prohibited.
- **Execution Halt:** Workload provisioning must not start if bootstrap reconciliation encountered a denial.
- **Strict Ordering:** Objects are created or updated and verified via live read before any role attachment call is issued.
- **Safe Adoption:** Pre-existing objects are adopted only when ownership metadata, canonical tags, and recursive digests match. Discrepancies trigger `DRIFT_UNSAFE` and stop without overwrite.

---

## 8. Protected Certification Boundaries

To eliminate architectural regression, production boundaries are classified under immutable governance in `docs/cor/CERTIFICATION_BOUNDARIES.yaml`:

### Certified Boundaries (Protected)
- `aws.oidc-tagged-role-chain`: OIDC federation and tagged execution-role assumption (`.github/workflows/cor.yml`, `policy-packs/aws/cor/templates/roles/execution-role-trust.json`).
- `aws.physical.vpc-ec2-ebs`: Core VPC, Subnet, Security Group, EC2 Instance, and EBS Snapshot provisioning (`server/engine-core/src/fabric/providers/aws-native-client.ts`).
- `aws.physical.urre-rollback`: Resilience engine dependency-aware rollback and residual cleanup (`server/engine-core/src/urre/`).

**Protected-Zone Rule:** Certified files cannot be modified without declaring an approved `MODIFICATION_ZONE`. Mutating protected paths without declaration fails governance validation immediately.

### Active Modification Zones
- `aws.bootstrap.slr-prerequisite`: Resolves COR-001/COR-007 (SLR preflight resolution).
- `aws.bootstrap.policy-reconciliation`: Resolves COR-002/COR-003 (Fail-closed exit semantics and ownership reconciler).
- `core.policy-renderer-and-digest`: Resolves COR-004/COR-005/COR-006 (Wildcard validation, target rendering, recursive canonical digest).
- `platform.provider-neutral-adapters`: Resolves COR-008/COR-013 (Universal adapter contracts and cross-OS parity).

Modifications to any zone mandate targeted tests and regression contract tests for all dependent certified boundaries.

---

## 9. Platform Governance and Deterministic Parity

Deterministic execution, policy validation, safe reconciliation, audit trails, and interruption recovery are core capabilities provided across all editions. Assistive intelligence or natural-language tooling operates strictly as an optional diagnostic and explanatory layer.

Under corporate governance policies:
- No assistive tool or model can bypass policy validation or security guardrails.
- No automated system can alter the authorization envelope or self-grant authority.
- No model output can approve a high-risk action or suppress a failed verification.
- Parity is strictly maintained: every deployment operation must execute identically with or without assistive tooling enabled.

---

## 10. Release Certification Acceptance Criteria

The universal platform readiness status is certified only upon verifying:
1. Deterministic execution on both fresh and converged target environments.
2. SLR preflight handles existing, race-created, and denied paths with clean fail-closed diagnostics.
3. Policy renderer and static validator correctly enforce action-aware wildcards without hardcoded targets.
4. Recursive canonical JSON digest reliably detects modifications and prevents tampering.
5. Certified protected boundaries (`aws.oidc-tagged-role-chain`, `aws.physical.vpc-ec2-ebs`, `aws.physical.urre-rollback`) remain completely unregressed.
6. All failure and denial states adhere to fail-closed exit semantics.
