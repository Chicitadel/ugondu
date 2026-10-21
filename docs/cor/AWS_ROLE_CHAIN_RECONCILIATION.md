# AWS Role-Assumption Chain & Identity Policy Reconciliation

**Project:** Ugondu — Universal Delivery Operating System  
**Module:** COR — AWS Qualification & Security Infrastructure  
**Document:** `docs/cor/AWS_ROLE_CHAIN_RECONCILIATION.md`  
**Classification:** ENTERPRISE | AUDIT & RECONCILIATION  
**Legal Entity:** Air Roofers SASU  
**Governing Authority:** Ujomor Systems Engineering & Governance Authority  
**Author:** Systems Engineering & Security Governance Team  
**Date:** 2026-10-21  
**Target Repository:** `Chicitadel/ugondu`  
**Target Branch:** `phase4/production-hardening`  
**Status:** APPROVED FOR IMPLEMENTATION  

---

## 1. Executive Summary & Audit Context

During physical qualification gate execution in CI/CD pipeline runs `39536649366` and `39529554197`, job `aws-physical-gate` failed closed at step `Assume Tagged Execution Session` (line 187 of `.github/workflows/cor.yml`). The fail-closed architecture prevented unauthorized mutation, and the authoritative `cor-final-release-gate` correctly withheld release certification.

A comprehensive audit of AWS IAM configuration, repository manifests, and AWS Management Console records was conducted across:
1. `.github/workflows/cor.yml` (lines 180–235: OIDC configuration, role chaining, session tag enforcement).
2. `config/qualification/aws-target.json` (canonical target parameters).
3. `policy-packs/aws/cor/pack.yaml` (UPLM Policy Pack V9 specification).
4. `policy-packs/aws/cor/templates/roles/runner-assume-role.json` & `execution-role-trust.json`.
5. AWS IAM Console inspection of roles in Account `971671216490` (`eu-west-3`).

### Core Finding
The AWS IAM role-assumption failure was caused by an asymmetric authorization configuration on **Role 1 (`UgonduCORRunner`)**:
- While the target execution role **Role 2 (`UgonduCORExecutionRole`)** possesses an AssumeRole trust policy allowing `sts:AssumeRole` and `sts:TagSession` from `UgonduCORRunner` under the `UgonduTransactionId` tag condition,
- The caller role's identity policy (**`UgonduCORRunner-IAM-Policy`**) contains general resource management permissions but **lacks an explicit statement authorizing `sts:AssumeRole` and `sts:TagSession`** against `Resource: arn:aws:iam::971671216490:role/UgonduCORExecutionRole`.

In AWS IAM policy evaluation, even within a single account, when customer-managed identity policies are attached to a calling role, that calling principal must possess explicit identity-based permission to invoke `sts:AssumeRole` and `sts:TagSession` on the target resource. Because this identity permission was missing, AWS STS denied the assumption request immediately upon invocation.

---

## 2. Reconciled Role Inventory & Naming Disambiguation

### 2.1 Role Disambiguation & Elimination of Obsolete Draft References
Historical drafts and earlier design notes colloquially referenced an execution role named `ugondu-qualification-execution-role`. 

**Reconciliation Ruling:**
- The canonical, authoritative execution role name is **`UgonduCORExecutionRole`** (CamelCase, no hyphens).
- The obsolete reference `ugondu-qualification-execution-role` is definitively retired and purged from operational and release documentation. No secondary role exists or will be created.

### 2.2 Authorized Role Matrix

| Property | Role 1: Base OIDC Runner Role | Role 2: Qualification Execution Role |
| :--- | :--- | :--- |
| **Physical Name** | `UgonduCORRunner` | `UgonduCORExecutionRole` |
| **Full Role ARN** | `arn:aws:iam::971671216490:role/UgonduCORRunner` | `arn:aws:iam::971671216490:role/UgonduCORExecutionRole` |
| **AWS Account ID** | `971671216490` | `971671216490` |
| **Primary Region** | `eu-west-3` (Paris) | `eu-west-3` (Paris) |
| **Role Kind** | `RUNNER_ROLE` (Federation Entrypoint) | `EXECUTION_ROLE` (Workload Execution) |
| **GitHub Secret** | `AWS_ROLE_TO_ASSUME_OIDC_BASE` | `AWS_ROLE_TO_ASSUME_EXECUTION` |
| **Workflow Step** | `Configure Base OIDC Credentials` (L181) | `Assume Tagged Execution Session` (L187) |
| **Attached Policies** | `UgonduCORRunner-IAM-Policy` (Identity) | 5 Customer-Managed Split Policies (`aws.cor.v9`) |
| **Execution Prohibited** | `prohibitExecutionPolicyAttachment: true` | `false` (Mandatory target of split policies) |

---

## 3. Two-Tier Delegation Architecture

The Ugondu Continuous Operations Readiness (COR) specification mandates a strict two-tier privilege boundary:

```
+-------------------------------------------------------------------------------+
| GitHub Actions Runner (Workflow: .github/workflows/cor.yml)                  |
+-------------------------------------------------------------------------------+
                                      |
         [1] OIDC Exchange (JWT: repo:Chicitadel/ugondu:*)
         Actions: sts:AssumeRoleWithWebIdentity
         Secret: AWS_ROLE_TO_ASSUME_OIDC_BASE
                                      v
+-------------------------------------------------------------------------------+
| Role 1: arn:aws:iam::971671216490:role/UgonduCORRunner                       |
| Policy: UgonduCORRunner-IAM-Policy                                            |
| Boundary: NO direct workload permissions; authorized only to assume Role 2    |
+-------------------------------------------------------------------------------+
                                      |
         [2] Chained STS AssumeRole Call (CLI: aws sts assume-role)
         Actions: sts:AssumeRole, sts:TagSession
         Mandatory Tags: UgonduTransactionId=${{ github.run_id }}, UgonduCOR=true
         Secret: AWS_ROLE_TO_ASSUME_EXECUTION
                                      v
+-------------------------------------------------------------------------------+
| Role 2: arn:aws:iam::971671216490:role/UgonduCORExecutionRole                 |
| Trust Policy: Requires UgonduTransactionId tag & Principal = UgonduCORRunner   |
| Execution Policies: UgonduCOR-V9-{Discovery,EC2-Creation,EC2-Cleanup,RDS-S3,   |
|                                   ECR-ECS}                                    |
+-------------------------------------------------------------------------------+
                                      |
         [3] Session Verification & Workload Execution
         Identity Verified: arn:aws:sts::971671216490:assumed-role/
                            UgonduCORExecutionRole/${TX_ID}
         Workloads: Conformance probes, Fargate deployment, residual cleanup
                                      v
+-------------------------------------------------------------------------------+
| AWS Infrastructure (eu-west-3) - Zero Residual Resources Enforced             |
+-------------------------------------------------------------------------------+
```

---

## 4. Exact Policy Specifications

### 4.1 Role 1 Trust Relationship (`UgonduCORRunner`)
The trust policy grants GitHub Actions permission to assume the runner role via OpenID Connect:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowGitHubOIDCWebIdentityAssumption",
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::971671216490:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:Chicitadel/ugondu:*"
        }
      }
    }
  ]
}
```

### 4.2 Role 1 Required Identity Statement (`UgonduCORRunner-IAM-Policy`)
To unblock the role-assumption chain, the customer-managed policy `UgonduCORRunner-IAM-Policy` attached to `UgonduCORRunner` must include the following explicit statement:

```json
{
  "Sid": "AssumeCORExecutionRoleWithTransactionTag",
  "Effect": "Allow",
  "Action": [
    "sts:AssumeRole",
    "sts:TagSession"
  ],
  "Resource": "arn:aws:iam::971671216490:role/UgonduCORExecutionRole"
}
```

### 4.3 Role 2 Trust Relationship (`UgonduCORExecutionRole`)
Governed by `policy-packs/aws/cor/templates/roles/execution-role-trust.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowUgonduCORRunnerAssumeRoleWithSessionTag",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::971671216490:role/UgonduCORRunner"
      },
      "Action": [
        "sts:AssumeRole",
        "sts:TagSession"
      ],
      "Condition": {
        "Null": {
          "aws:RequestTag/UgonduTransactionId": "false"
        },
        "ForAllValues:StringEquals": {
          "aws:TagKeys": [
            "UgonduTransactionId",
            "UgonduCOR"
          ]
        }
      }
    }
  ]
}
```

---

## 5. Workflow Implementation Alignment

The workflow `.github/workflows/cor.yml` executes this chain at lines 181–233:

1. **Step 1: Configure Base OIDC Credentials (Lines 181–185)**
   - Exchanges GitHub Actions OIDC token for short-lived credentials of `UgonduCORRunner`.

2. **Step 2: Assume Tagged Execution Session (Lines 187–205)**
   - Issues `aws sts assume-role --role-arn "$EXECUTION_ROLE_ARN" --role-session-name "$TX_ID" --tags "Key=UgonduTransactionId,Value=$TX_ID" "Key=UgonduCOR,Value=true"`.
   - Mandatory tags enforce session tracking and isolation. No fallback to untagged session is permitted (`UG-COR-AWS-TAGGED-SESSION`).

3. **Step 3: Verification & Environment Export (Lines 216–233)**
   - Issues `aws sts get-caller-identity` to assert the session ARN ends with `:assumed-role/UgonduCORExecutionRole/${TX_ID}`.
   - Exports `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_SESSION_TOKEN` to `$GITHUB_ENV`.

---

## 6. Verification Runbook (PowerShell & AWS CLI)

Cloud operations personnel can verify and validate this reconciliation using the following PowerShell procedure:

```powershell
# ==============================================================================
# Ugondu COR AWS Role-Assumption Verification Runbook
# Authority: Ujomor Systems Engineering & Governance Authority
# Classification: ENTERPRISE
# ==============================================================================

# 1. Configuration Constants
$AccountId         = "971671216490"
$Region            = "eu-west-3"
$RunnerRoleName    = "UgonduCORRunner"
$ExecutionRoleName = "UgonduCORExecutionRole"
$RunnerRoleArn     = "arn:aws:iam::$AccountId`:role/$RunnerRoleName"
$ExecutionRoleArn  = "arn:aws:iam::$AccountId`:role/$ExecutionRoleName"
$PolicyName        = "UgonduCORRunner-IAM-Policy"
$TxId              = "cor-audit-$(Get-Date -Format 'yyyyMMddHHmmss')"

Write-Host "Starting AWS Role Chain Reconciliation Verification..." -ForegroundColor Cyan

# 2. Inspect Runner Identity Policy for Required AssumeRole Statement
Write-Host "Verifying identity policy on $RunnerRoleName..." -ForegroundColor Yellow
$PolicyArn = "arn:aws:iam::$AccountId`:policy/$PolicyName"
$VersionId = (aws iam get-policy --policy-arn $PolicyArn --query 'Policy.DefaultVersionId' --output text)
$PolicyDoc = (aws iam get-policy-version --policy-arn $PolicyArn --version-id $VersionId --query 'PolicyVersion.Document' --output json | ConvertFrom-Json)

$HasStatement = $PolicyDoc.Statement | Where-Object {
    $_.Sid -eq "AssumeCORExecutionRoleWithTransactionTag" -or
    ($_.Action -contains "sts:AssumeRole" -and $_.Action -contains "sts:TagSession" -and $_.Resource -eq $ExecutionRoleArn)
}

if (-not $HasStatement) {
    Write-Error "CRITICAL: Identity policy $PolicyName lacks permission to assume $ExecutionRoleArn!"
} else {
    Write-Host " PASS: $PolicyName contains valid delegation statement to assume $ExecutionRoleName." -ForegroundColor Green
}

# 3. Inspect Execution Role Trust Policy
Write-Host "Verifying trust relationship on $ExecutionRoleName..." -ForegroundColor Yellow
$TrustDoc = (aws iam get-role --role-name $ExecutionRoleName --query 'Role.AssumeRolePolicyDocument' --output json | ConvertFrom-Json)

$TrustPrincipal = $TrustDoc.Statement.Principal.AWS
if ($TrustPrincipal -ne $RunnerRoleArn) {
    Write-Error "CRITICAL: Trust principal mismatch. Expected $RunnerRoleArn, found $TrustPrincipal."
} else {
    Write-Host " PASS: Trust principal correctly configured to $RunnerRoleArn." -ForegroundColor Green
}

# 4. Simulate Live Assumption Chain
Write-Host "Testing chained role assumption with transaction tags..." -ForegroundColor Yellow
$AssumeOutput = aws sts assume-role `
    --role-arn $ExecutionRoleArn `
    --role-session-name $TxId `
    --tags "Key=UgonduTransactionId,Value=$TxId" "Key=UgonduCOR,Value=true" `
    --query 'Credentials.[AccessKeyId,SecretAccessKey,SessionToken]' `
    --output text

$Creds = -split $AssumeOutput
if ($Creds.Count -lt 3) {
    Write-Error "CRITICAL: Role assumption failed to return temporary session credentials."
} else {
    Write-Host " PASS: Chained role assumption succeeded." -ForegroundColor Green
    
    # 5. Verify Session Identity
    $Env:AWS_ACCESS_KEY_ID     = $Creds[0]
    $Env:AWS_SECRET_ACCESS_KEY = $Creds[1]
    $Env:AWS_SESSION_TOKEN     = $Creds[2]
    $Env:AWS_DEFAULT_REGION    = $Region

    $CurrentArn = (aws sts get-caller-identity --query 'Arn' --output text)
    Write-Host "Active Session ARN: $CurrentArn" -ForegroundColor Cyan

    if ($CurrentArn -match "assumed-role/$ExecutionRoleName/$TxId") {
        Write-Host " PASS: Active caller identity strictly matches expected tagged session." -ForegroundColor Green
    } else {
        Write-Error "CRITICAL: Caller identity mismatch: $CurrentArn"
    }

    # Clean up environment variables
    Remove-Item Env:\AWS_ACCESS_KEY_ID
    Remove-Item Env:\AWS_SECRET_ACCESS_KEY
    Remove-Item Env:\AWS_SESSION_TOKEN
    Remove-Item Env:\AWS_DEFAULT_REGION
}

Write-Host "Role Chain Verification Completed." -ForegroundColor Cyan
```

---

## 7. Release Exit Criteria & Unblocking Sequence

To lift the withholding of the Ugondu COR Universal Certification, the following sequence must be completed:

- [ ] **Step 1: IAM Policy Remediation**: Update `UgonduCORRunner-IAM-Policy` in AWS Account `971671216490` by attaching statement `AssumeCORExecutionRoleWithTransactionTag`.
- [ ] **Step 2: Verification Execution**: Execute the PowerShell runbook above; verify 100% PASS on trust relationship, identity authorization, and chained tagged assumption.
- [ ] **Step 3: GitHub Secrets Audit**: Ensure GitHub Secrets in repository `Chicitadel/ugondu` match:
  - `AWS_ROLE_TO_ASSUME_OIDC_BASE`: `arn:aws:iam::971671216490:role/UgonduCORRunner`
  - `AWS_ROLE_TO_ASSUME_EXECUTION`: `arn:aws:iam::971671216490:role/UgonduCORExecutionRole`
  - Variable `AWS_REGION`: `eu-west-3`
- [ ] **Step 4: CI Workflow Trigger**: Re-run workflow `cor.yml` on branch `phase4/production-hardening`.
- [ ] **Step 5: Physical Lifecycle Verification**: Confirm `aws-physical-gate` executes:
  - Conformance read-only probes (`run-aws-conformance.mjs`).
  - Physical Fargate qualification (`physical-fargate-certification.ts`).
  - Zero-residual resources scanner (`residual-scanner.ts`).
- [ ] **Step 6: Gate Sign-off**: Verify that `cor-final-release-gate` transitions from `failure` to `success` and authorizes release certification.

---

## 8. Document Authority & Review

| Role | Organization / Authority | Status | Date |
| :--- | :--- | :--- | :--- |
| **Cloud Operations Authority** | Air Roofers SASU | APPROVED | 2026-10-21 |
| **Security Engineering Authority** | Ujomor Systems Engineering & Governance Authority | APPROVED | 2026-10-21 |
| **Systems Architecture Authority** | Ujomor Systems Engineering & Governance Authority | APPROVED | 2026-10-21 |
| **Platform Release Authority** | Air Roofers SASU | APPROVED | 2026-10-21 |
