<!--
/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Developer & Operator Documentation (Guide 11)
 * File           : 11-aws-operations-guide.md
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

# 11 — AWS Operations Guide

## 1. AWS Physical Architecture & Zero-Trust Identity

Ugondu's AWS physical operations and COR certification execute in AWS Account **`971671216490`** inside canonical region **`eu-west-3`** (Paris) using short-lived OIDC/STS credentials (`sts:AssumeRoleWithWebIdentity` / session-tagged role assumption) with zero repository-held static AWS access keys.

### Core Identity Entities
- **AWS Account ID**: `971671216490`
- **Canonical Region**: `eu-west-3`
- **Execution Role**: `arn:aws:iam::971671216490:role/UgonduCORExecutionRole`
- **CI OIDC Runner Role**: `arn:aws:iam::971671216490:role/UgonduCORRunner`
- **ECS Task Execution Role**: `arn:aws:iam::971671216490:role/ecsTaskExecutionRole`
- **OIDC Provider**: `arn:aws:iam::971671216490:oidc-provider/token.actions.githubusercontent.com`

---

## 2. The 5 AWS COR V9 Split Managed Policies

To comply with AWS's 6,144-character limit per managed policy while enforcing comprehensive resource-level and transaction-tag ABAC isolation (`server/engine-core/Ugondu_CORExecutionRole_Policy_V9.json`), `UgonduCORExecutionRole` attaches **5 split managed policies**:

| Policy # | Managed Policy Name | Scope & Enforced Conditions |
|---:|---|---|
| **1** | `UgonduCOR_V9_Part1_NetworkAndVPC` | SSM AMI parameter read (`arn:aws:ssm:*::parameter/aws/service/ami-amazon-linux-latest/*`), plus creation, attachment, routing, and deletion of VPCs, Subnets, Internet Gateways, Route Tables, and Security Groups in `eu-west-3` with `UgonduCOR=true` and `UgonduTransactionId=${aws:PrincipalTag/UgonduTransactionId}` |
| **2** | `UgonduCOR_V9_Part2_ComputeAndSnapshots` | `ec2:RunInstances`, `ec2:CreateSnapshot`, `ec2:CreateTags`, `ec2:TerminateInstances`, `ec2:DeleteNetworkInterface`, `ec2:DeleteSnapshot`, and explicit `Deny` on `ec2:DeleteTags` (`DenyRemovalOfUgonduOwnershipTags`) |
| **3** | `UgonduCOR_V9_Part3_RDSAndStorage` | RDS instances (`ugondu-db-${aws:PrincipalTag/UgonduTransactionId}-*`), snapshots (`ugondu-rds-snap-${aws:PrincipalTag/UgonduTransactionId}-*`), subnet groups (`ugondu-rds-subnet-${aws:PrincipalTag/UgonduTransactionId}-*`), and S3 buckets (`ugondu-cor-bucket-${aws:PrincipalTag/UgonduTransactionId}-*`) locked to `s3:LocationConstraint=eu-west-3` |
| **4** | `UgonduCOR_V9_Part4_ContainersAndFargate` | ECR repository (`ugondu-cor-fargate-${aws:PrincipalTag/UgonduTransactionId}`), ECS clusters, services, and task definitions (`ugondu-cor-fargate-${aws:PrincipalTag/UgonduTransactionId}-*`), `iam:PassRole` for `ecsTaskExecutionRole` to `ecs-tasks.amazonaws.com`, and `DenyECSTagStripping` |
| **5** | `UgonduCOR_V9_Part5_ReadDiscoveryAndTelemetry` | Read-only `Describe*` and `ListTagsForResource` across EC2, RDS, ECR, and ECS (`AllowGlobalReadDiscovery`) |

---

## 3. Standard AWS Operational Procedures

### 3.1 Assuming `UgonduCORExecutionRole` with Transaction Session Tags
Every physical execution or certification run must bind `UgonduTransactionId` as an STS session tag:

```bash
export TX_ID="tx-$(date +%Y%m%d%H%M%S)"
aws sts assume-role \
  --role-arn "arn:aws:iam::971671216490:role/UgonduCORExecutionRole" \
  --role-session-name "ugondu-${TX_ID}" \
  --tags Key=UgonduTransactionId,Value="${TX_ID}" Key=UgonduCOR,Value=true \
  --region eu-west-3
```

### 3.2 Running Physical COR-4 / COR-5 / COR-7 Certification
```bash
export AWS_REGION="eu-west-3"
export UGONDU_CERT_REGION="eu-west-3"

# Execute VPC, EC2, RDS, S3, URRE & DEISE physical certification
npx ts-node server/engine-core/physical-certification.ts

# Execute ECR & ECS Fargate physical certification (COR-7)
npx ts-node server/engine-core/physical-fargate-certification.ts

# Execute URRE deterministic crash-resume certification
npx ts-node server/engine-core/urre-crash-resume.ts
```

### 3.3 Orphaned Resource Scan & Zero-Residual Verification
If an execution is forcibly terminated outside URRE, run the residual scanner and VPC orphan handler:
```bash
npx ts-node scripts/ci/residual-scanner.ts
npx ts-node scripts/cor/aws-vpc-orphan-handler.ts
```

---

## 4. Exit Codes & Troubleshooting

| AWS Error / Symptom | Cause | Resolution |
|---|---|---|
| `AccessDenied` on `ec2:CreateVpc` or `rds:CreateDBInstance` | STS session is missing `PrincipalTag/UgonduTransactionId` or request is targeting a region other than `eu-west-3` | Assume `UgonduCORExecutionRole` with `--tags Key=UgonduTransactionId,Value=<txId>` and set `AWS_REGION=eu-west-3` |
| `AccessDenied` on `ec2:DeleteTags` or `ecs:UntagResource` | Explicit `DenyRemovalOfUgonduOwnershipTags` / `DenyECSTagStripping` guard triggered | Working as designed—ownership tags (`UgonduCOR=true`) can never be stripped from active COR resources |
| `DependencyViolation` during `ec2:DeleteVpc` | ENIs, Subnets, IGWs, or Security Groups still attached to the VPC | Run `scripts/cor/aws-vpc-orphan-handler.ts` which detaches and deletes dependencies in reverse topological order |

---

## 5. Clean-Room AWS Validation Checklist

- [ ] `aws sts get-caller-identity` confirms Account `971671216490`.
- [ ] All 5 `UgonduCOR_V9_Part*` managed policies are attached to `UgonduCORExecutionRole`.
- [ ] `UGONDU_CERT_REGION` and `AWS_REGION` are both set to `eu-west-3`.
- [ ] Post-execution `ZeroResiduals` audit (`COR-5.7`) confirms zero orphaned VPCs, instances, RDS instances, ECS services, or S3 buckets in `eu-west-3`.
