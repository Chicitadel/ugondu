<!--
/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPLM Phase 0 Operational & AWS COR V9 Baseline
 * File           : UPLM_BASELINE.md
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

# UPLM Phase 0 — Operational & AWS COR V9 Baseline

## 1. Baseline Identity

| Parameter | Baseline Value |
|---|---|
| **Platform Version** | `1.0.0` (`@airroofers/ugondu-platform`) |
| **Architecture Maturity** | `DISTRIBUTED_PLATFORM` (`v4.1`) |
| **Governance Freeze State** | `ARCHITECTURE_FREEZE: TRUE`, `PROTOCOL_FREEZE: TRUE`, `GOVERNANCE_FREEZE: TRUE`, `PACKAGING_FREEZE: TRUE` |
| **Control Plane Ports** | `4001` (`engine-core`), `4002` (`billing-gateway`), `4003` (`plugin-manager`), `4004` (`event-bus`), `4005` (`repository-adapter`) |
| **Supported Locales (12)** | `ar`, `de`, `en`, `es`, `fr`, `hi`, `it`, `ja`, `ko`, `pt`, `ru`, `zh` |
| **Commercial Editions (5)** | `COMMUNITY` (1), `PROFESSIONAL` (2), `BUSINESS` (3), `ENTERPRISE` (4), `SOVEREIGN` (5) |
| **AWS Target Account** | `971671216490` |
| **AWS Canonical Region** | `eu-west-3` (Paris) |
| **AWS Execution Role** | `arn:aws:iam::971671216490:role/UgonduCORExecutionRole` |
| **ECS Task Execution Role** | `arn:aws:iam::971671216490:role/ecsTaskExecutionRole` |

---

## 2. AWS COR V9 Split Managed Policies Baseline (`971671216490` / `eu-west-3`)

The canonical IAM policy source (`server/engine-core/Ugondu_CORExecutionRole_Policy_V9.json`) is baselined across 5 managed policies attached to `UgonduCORExecutionRole`:

### 2.1 Policy 1: `UgonduCOR_V9_Part1_NetworkAndVPC`
- **Scope**: VPC, Subnet, Internet Gateway, Route Table, Security Group creation, attachment, routing, and tag-bound deletion in `eu-west-3`.
- **Mandatory Conditions**:
  - `aws:RequestedRegion = "eu-west-3"`
  - `aws:RequestTag/UgonduCOR = "true"` (on create) / `aws:ResourceTag/UgonduCOR = "true"` (on mutate/delete)
  - `aws:RequestTag/UgonduTransactionId = "${aws:PrincipalTag/UgonduTransactionId}"`

### 2.2 Policy 2: `UgonduCOR_V9_Part2_ComputeAndSnapshots`
- **Scope**: `ec2:RunInstances`, `ec2:CreateSnapshot`, `ec2:CreateTags`, `ec2:TerminateInstances`, `ec2:DeleteNetworkInterface`, `ec2:DeleteSnapshot`, and explicit `Deny` on `ec2:DeleteTags` (`DenyRemovalOfUgonduOwnershipTags`).
- **Mandatory Conditions**: Transaction-tag ABAC binding + explicit ownership tag preservation.

### 2.3 Policy 3: `UgonduCOR_V9_Part3_RDSAndStorage`
- **Scope**:
  - RDS: `ugondu-db-${aws:PrincipalTag/UgonduTransactionId}-*`, `ugondu-rds-snap-${aws:PrincipalTag/UgonduTransactionId}-*`, `ugondu-rds-subnet-${aws:PrincipalTag/UgonduTransactionId}-*`
  - S3: `arn:aws:s3:::ugondu-cor-bucket-${aws:PrincipalTag/UgonduTransactionId}-*` with `s3:LocationConstraint = "eu-west-3"`

### 2.4 Policy 4: `UgonduCOR_V9_Part4_ContainersAndFargate`
- **Scope**:
  - ECR: `arn:aws:ecr:eu-west-3:971671216490:repository/ugondu-cor-fargate-${aws:PrincipalTag/UgonduTransactionId}`
  - ECS: `task-definition/ugondu-cor-fargate-${aws:PrincipalTag/UgonduTransactionId}-*`, `cluster/ugondu-cor-fargate-${aws:PrincipalTag/UgonduTransactionId}-*`, `service/ugondu-cor-fargate-${aws:PrincipalTag/UgonduTransactionId}-*/*`
  - IAM: `iam:PassRole` on `arn:aws:iam::971671216490:role/ecsTaskExecutionRole` to `ecs-tasks.amazonaws.com`
  - Explicit `Deny`: `DenyECSTagStripping` (`ecs:UntagResource` when `aws:ResourceTag/UgonduCOR = "true"`).

### 2.5 Policy 5: `UgonduCOR_V9_Part5_ReadDiscoveryAndTelemetry`
- **Scope**: Read-only `Describe*` and `ListTagsForResource` operations across EC2, RDS, ECR, and ECS (`Sid: AllowGlobalReadDiscovery`) enabling DEISE `EnvironmentTwin` construction, independent verification reads, and post-teardown `ZeroResiduals` verification.

---

## 3. Capability Registry & Lifecycle Baseline

| Capability Tier | Baseline Capabilities Count | Enforcement Mechanism |
|---|---:|---|
| **Community (`COMMUNITY`)** | 32 core safety, discovery, twin, dry-run, passport, rollback & basic repair capabilities | Default signed capability manifest |
| **Professional (`PROFESSIONAL`)** | +20 dependency, runtime, web server, TLS, DNS, DB connectivity, Docker, VPS & migration capabilities | Mandatag signed entitlement passport |
| **Business (`BUSINESS`)** | +14 live DB reconstruction, cloud linkage/IAM, IaC drift, ZDD topology, load balancer & fleet capabilities | Mandatag signed entitlement passport |
| **Enterprise (`ENTERPRISE`)** | +13 Kubernetes, VMware, Proxmox, multi-node HA, failover, forensic recovery & delegated operator capabilities | Mandatag signed entitlement passport |
| **Sovereign (`SOVEREIGN`)** | +10 autonomous code patching, isolated fault domains, air-gapped recovery, sovereign vaults & passport chains | Sovereign air-gapped / HSM-signed entitlement passport |

---

## 4. Baseline Verification Commands

```bash
# 1. Verify release integrity (zero private keys, clean tracked artifacts)
npm run verify:release-integrity

# 2. Build all TypeScript server workspaces
npm run build

# 3. Execute workspace and root test suites
npm test

# 4. Generate and verify the Ed25519-signed release evidence bundle
node scripts/release/verify-evidence-bundle.mjs
```
