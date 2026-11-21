# AWS OIDC Configuration for Ugondu Physical COR

The physical COR execution is currently **BLOCKED** because the GitHub Actions runner lacks a valid AWS identity.

To unblock the certification **without committing your CSV credentials**, follow these exact steps to create an IAM Role that GitHub Actions can securely assume via OpenID Connect (OIDC).

## Step 1: Create the GitHub OIDC Identity Provider in AWS

If your AWS account does not already have a GitHub OIDC provider, you must create one.

1. Open the **AWS IAM Console** -> **Identity providers** -> **Add provider**.
2. Select **OpenID Connect**.
3. **Provider URL**: `https://token.actions.githubusercontent.com`
4. Click **Get thumbprint**.
5. **Audience**: `sts.amazonaws.com`
6. Click **Add provider**.

## Step 2: Create the Two-Role Ugondu COR IAM Architecture

`.github/workflows/cor.yml` uses a two-role OIDC + tagged execution session model (`UG-COR-AWS-TAGGED-SESSION`):

1. **Base OIDC Role (`AWS_ROLE_TO_ASSUME_OIDC_BASE`)**:
   - **Trusted entity**: Web identity (`token.actions.githubusercontent.com`, audience `sts.amazonaws.com`).
   - **Repository / branch trust**: `repo:Chicitadel/ugondu:ref:refs/heads/main` and `repo:Chicitadel/ugondu:ref:refs/heads/phase4/production-hardening`.
   - **Permissions**: `sts:AssumeRole` and `sts:TagSession` on the execution role (`AWS_ROLE_TO_ASSUME_EXECUTION`), plus bootstrap policy-pack reconciliation permissions used by `scripts/aws-conformance/reconcile-bootstrap-policy-pack.mjs`.
2. **Tagged Execution Role (`AWS_ROLE_TO_ASSUME_EXECUTION`)**:
   - **Trusted entity**: Base OIDC Role (`AWS_ROLE_TO_ASSUME_OIDC_BASE`) with `sts:AssumeRole` and `sts:TagSession` requiring session tags `UgonduTransactionId` and `UgonduCOR=true`.
   - **Permissions**: Least-privilege policy for ECR, ECS/Fargate, IAM `PassRole`, CloudWatch Logs, and conformance probes (`run-aws-conformance.mjs`, `physical-certification.ts`, `physical-fargate-certification.ts`, `residual-scanner.ts`) scoped to `eu-west-3` (or `vars.AWS_REGION`).

## Step 3: Configure GitHub Secrets and Variables

1. Open the Ugondu GitHub repository: **Settings** -> **Secrets and variables** -> **Actions**.
2. Configure **Repository secrets**:
   - `AWS_ROLE_TO_ASSUME_OIDC_BASE`: ARN of the base GitHub OIDC role.
   - `AWS_ROLE_TO_ASSUME_EXECUTION`: ARN of the tagged execution role.
   - `COR_PUBLIC_KEY` and `COR_SIGNING_KEY`: Ed25519 trust-root and authority signing keys.
3. Configure **Repository variables**:
   - `AWS_REGION`: Target AWS region (for example `eu-west-3`).
   - `AWS_PHYSICAL_QUALIFICATION_ENABLED`: Set to `true` only when explicitly authorized for physical qualification.

## Step 4: Verify the GitHub Actions Configuration

`.github/workflows/cor.yml` requires `workflow_dispatch` with `inputs.run_aws_physical_qualification == true`, `vars.AWS_PHYSICAL_QUALIFICATION_ENABLED == 'true'`, and a trusted release branch (`main` or `phase4/production-hardening`):

```yaml
permissions:
  id-token: write
  contents: read

steps:
  - name: Configure Base OIDC Credentials
    uses: aws-actions/configure-aws-credentials@e3dd6a429d7300a6a4c196c26e071d42e0343502
    with:
      role-to-assume: ${{ secrets.AWS_ROLE_TO_ASSUME_OIDC_BASE }}
      aws-region: ${{ vars.AWS_REGION }}
```

The workflow then runs `reconcile-bootstrap-policy-pack.mjs --phase bootstrap-provision`, assumes `AWS_ROLE_TO_ASSUME_EXECUTION` with mandatory session tags (`UgonduTransactionId`, `UgonduCOR=true`), verifies effective permissions, executes read-only conformance probes, runs `physical-certification.ts` and `physical-fargate-certification.ts`, and asserts zero residual resources via `residual-scanner.ts`.

## Step 5: Trigger Physical COR

```powershell
gh workflow run cor.yml --repo Chicitadel/ugondu --ref main -f run_aws_physical_qualification=true
```

---

### Regarding your `accessKey.csv`
If you used the `accessKey.csv` on your local PC to script the creation of the OIDC Role (via the AWS CLI), that is perfectly acceptable. However, **do not upload those keys to GitHub or paste them here**. Ugondu now operates under the Universal Credential Specification, meaning CI deployments strictly utilize OIDC short-lived identity.
