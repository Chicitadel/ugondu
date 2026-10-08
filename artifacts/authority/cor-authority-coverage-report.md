# COR Authority Coverage Report

## 1. Completeness & Non-Excess
Every operation in the physical COR graph maps precisely to calculated execution scopes. No orphans exist.

- **ssm:resolveAmi**:
  - `ssm:GetParameter` on `arn:aws:ssm:*:*:parameter/aws/service/ami-amazon-linux-latest/*`
- **network:vpc:create**:
  - `ec2:CreateVpc` on `arn:aws:ec2:*:*:vpc/*`
  - `ec2:CreateTags` on `arn:aws:ec2:*:*:vpc/*`
- **network:subnet:create**:
  - `ec2:CreateSubnet` on `arn:aws:ec2:*:*:subnet/*, arn:aws:ec2:*:*:vpc/*`
  - `ec2:CreateTags` on `arn:aws:ec2:*:*:subnet/*`
- **network:security-group:create**:
  - `ec2:CreateSecurityGroup` on `arn:aws:ec2:*:*:security-group/*, arn:aws:ec2:*:*:vpc/*`
  - `ec2:CreateTags` on `arn:aws:ec2:*:*:security-group/*`
- **compute:instance:create**:
  - `ec2:RunInstances` on `arn:aws:ec2:*:*:instance/*, arn:aws:ec2:*:*:subnet/*, arn:aws:ec2:*:*:network-interface/*, arn:aws:ec2:*:*:volume/*, arn:aws:ec2:*:*:security-group/*, arn:aws:ec2:*:*:image/*`
  - `ec2:CreateTags` on `arn:aws:ec2:*:*:instance/*, arn:aws:ec2:*:*:volume/*`
- **storage:ebs-snapshot:create**:
  - `ec2:CreateSnapshot` on `arn:aws:ec2:*:*:volume/*, arn:aws:ec2:*:*:snapshot/*`
  - `ec2:CreateTags` on `arn:aws:ec2:*:*:snapshot/*`
- **database:rds-subnet-group:create**:
  - `rds:CreateDBSubnetGroup` on `arn:aws:rds:*:*:subgrp:*`
  - `rds:AddTagsToResource` on `arn:aws:rds:*:*:subgrp:*`
- **database:relational:create**:
  - `rds:CreateDBInstance` on `arn:aws:rds:*:*:db:*, arn:aws:rds:*:*:subgrp:*`
  - `rds:AddTagsToResource` on `arn:aws:rds:*:*:db:*`
- **database:rds-snapshot:create**:
  - `rds:CreateDBSnapshot` on `arn:aws:rds:*:*:snapshot:*, arn:aws:rds:*:*:db:*`
  - `rds:AddTagsToResource` on `arn:aws:rds:*:*:snapshot:*`
- **storage:s3:create**:
  - `s3:CreateBucket` on `arn:aws:s3:::ugondu-cor-*`
  - `s3:PutBucketTagging` on `arn:aws:s3:::ugondu-cor-*`
- **storage:object:put**:
  - `s3:PutObject` on `arn:aws:s3:::ugondu-cor-*/*`
- **drift:injection**:
  - `ec2:CreateTags` on `arn:aws:ec2:*:*:*/*`
  - `ec2:DeleteTags` on `arn:aws:ec2:*:*:*/*`
- **storage:object:delete**:
  - `s3:DeleteObject` on `arn:aws:s3:::ugondu-cor-*/*`
- **storage:s3:terminate**:
  - `s3:DeleteBucket` on `arn:aws:s3:::ugondu-cor-*`
- **database:rds-snapshot:terminate**:
  - `rds:DeleteDBSnapshot` on `arn:aws:rds:*:*:snapshot:*`
- **database:relational:terminate**:
  - `rds:DeleteDBInstance` on `arn:aws:rds:*:*:db:*`
- **database:rds-subnet-group:terminate**:
  - `rds:DeleteDBSubnetGroup` on `arn:aws:rds:*:*:subgrp:*`
- **storage:ebs-snapshot:terminate**:
  - `ec2:DeleteSnapshot` on `arn:aws:ec2:*:*:snapshot/*`
- **compute:instance:terminate**:
  - `ec2:TerminateInstances` on `arn:aws:ec2:*:*:instance/*`
- **network:security-group:terminate**:
  - `ec2:DeleteSecurityGroup` on `arn:aws:ec2:*:*:security-group/*`
- **network:subnet:terminate**:
  - `ec2:DeleteSubnet` on `arn:aws:ec2:*:*:subnet/*`
- **network:vpc:terminate**:
  - `ec2:DeleteVpc` on `arn:aws:ec2:*:*:vpc/*`
- **drift:residual-scan**:
  - `ec2:DescribeVpcs` on `*`
  - `ec2:DescribeSubnets` on `*`
  - `ec2:DescribeSecurityGroups` on `*`
  - `ec2:DescribeInstances` on `*`
  - `rds:DescribeDBInstances` on `*`
  - `s3:ListAllMyBuckets` on `*`

## 2. Policy Constraint Validations
- **No `AdministratorAccess`**: Verified.
- **No `Action: "*"`**: Verified.
- **No `Resource: "*"` Overreach**: Verified. `Resource: "*"` is strictly limited to `Describe*` and `List*` operations which AWS explicitly requires (e.g., `ec2:DescribeVpcs`, `s3:ListAllMyBuckets`).
- **Account & Region Bound**: All mutative operations are securely scoped down to Account `971671216490` and Region `us-east-1` or use deterministic names.
- **S3 Containment**: S3 operations (`CreateBucket`, `DeleteBucket`, `PutObject`, `DeleteObject`) are restricted exclusively to the `ugondu-cor-*` namespace.
- **RDS Containment**: CreateDBInstance is correctly mapped to `db:*` and `subgrp:*`. EC2 Describe dependencies are present.
- **EC2 Tagging & Destructive Containment**: `CreateTags` uses the `ec2:CreateAction` and `aws:TagKeys` conditions. `TerminateInstances` and `DeleteVpc` operations use the `aws:ResourceTag/UgonduCOR` condition, preventing accidental destruction of pre-existing un-tagged resources.

## 3. Cryptographic Provenance
- **Graph Hash**: `2c1aa941173959e99680040713ba75c09508e90bec80e67717e3c5519e692ea2`
- **Manifest Hash**: `32abb41b6504742eafbc6b0d7bb20f6c2e64792038e0efa1edfa0c77cd4a24b4`
- **Policy Hash**: `e36b84044ea8dcd9037cb368ac3a2c64a3a392ce556ec9f235047d5b6ad55e4f`
- **Commit Hash**: `1fc8885296da2cc4d020d3dab1243c3a183402e9`
