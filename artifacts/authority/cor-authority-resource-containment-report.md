# COR Authority Resource Containment Report

## Transaction Containment Proof

### 1. EC2 Mutative Containment
- **Resource created:** `Vpc`
- **Tag injected at creation:** `UgonduCOR`
- **DeleteVpc policy constraint:** `"StringLike": { "aws:ResourceTag/UgonduCOR": "*" }`
- **Result:** ALLOWED for COR-created VPC. DENIED for unrelated VPC.

### 2. S3 Mutative Containment
- **Resource created:** `ugondu-cor-[txn-id]`
- **DeleteBucket policy constraint:** Resource must match `arn:aws:s3:::ugondu-cor-*`
- **Result:** ALLOWED for COR-created bucket. DENIED for unrelated bucket.

### 3. EC2 Tagging Containment
- **Action:** `ec2:CreateTags`
- **Constraint:** `"StringEquals": { "ec2:CreateAction": ["CreateVpc", "RunInstances", ...] }`
- **Result:** ALLOWED during resource creation. DENIED for tagging existing resources.

### 4. RDS Containment
- **Action:** `rds:DeleteDBInstance`
- **Constraint:** `"StringLike": { "aws:ResourceTag/UgonduCOR": "*" }`
- **Result:** ALLOWED for COR-created DB. DENIED for unrelated DB.

**VERDICT: TRANSACTION CONTAINMENT VERIFIED.**
