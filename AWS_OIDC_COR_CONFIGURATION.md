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

## Step 2: Create the Ugondu COR IAM Role

1. Go to **AWS IAM Console** -> **Roles** -> **Create role**.
2. Select **Web identity**.
3. **Identity provider**: Select the `token.actions.githubusercontent.com` provider you just created.
4. **Audience**: Select `sts.amazonaws.com`.
5. **GitHub organization**: Enter `Chicitadel`
6. **GitHub repository**: Enter `ugondu`
7. **GitHub branch**: Enter `phase4/production-hardening`
8. Click **Next**.

## Step 3: Attach Least-Privilege Permissions

Do not grant AdministratorAccess. The physical COR needs permissions to discover, create, verify, and delete specific resources for certification.

1. On the **Add permissions** page, select **Create policy**.
2. Switch to the **JSON** tab and paste the following policy (adjust based on the exact services your Fargate adapter touches):
   ```json
   {
       "Version": "2012-10-17",
       "Statement": [
           {
               "Effect": "Allow",
               "Action": [
                   "ecr:CreateRepository",
                   "ecr:DeleteRepository",
                   "ecr:DescribeRepositories",
                   "ecr:GetAuthorizationToken",
                   "ecr:InitiateLayerUpload",
                   "ecr:UploadLayerPart",
                   "ecr:CompleteLayerUpload",
                   "ecr:PutImage",
                   "ecr:BatchCheckLayerAvailability",
                   "ecs:CreateCluster",
                   "ecs:DeleteCluster",
                   "ecs:DescribeClusters",
                   "ecs:RegisterTaskDefinition",
                   "ecs:DeregisterTaskDefinition",
                   "ecs:DescribeTaskDefinition",
                   "ecs:CreateService",
                   "ecs:DeleteService",
                   "ecs:DescribeServices",
                   "ecs:UpdateService",
                   "iam:PassRole"
               ],
               "Resource": "*"
           }
       ]
   }
   ```
3. Name the policy `UgonduCORPolicy` and click **Create policy**.
4. Return to the Role creation tab, refresh the policies, select `UgonduCORPolicy`, and click **Next**.
5. Name the role **`UgonduCORRunner`** and click **Create role**.

## Step 4: Configure GitHub Secrets

1. Open the Ugondu GitHub repository: **Settings** -> **Secrets and variables** -> **Actions**.
2. Add a new **Repository secret**:
   - **Name**: `AWS_ROLE_TO_ASSUME`
   - **Secret**: The ARN of the role you just created (e.g., `arn:aws:iam::123456789012:role/UgonduCORRunner`).

## Step 5: Verify the GitHub Actions Configuration

Ensure that `.github/workflows/cor.yml` (or your active certification workflow) uses the OIDC model properly.

```yaml
permissions:
  id-token: write
  contents: read

steps:
  - name: Configure AWS credentials from OIDC
    uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: ${{ secrets.AWS_ROLE_TO_ASSUME }}
      aws-region: us-east-1
      audience: sts.amazonaws.com
```

*(Note: Ugondu's current `cor.yml` workflow is already configured to read this input; it just needs the secret populated.)*

## Step 6: Rerun the Physical COR

Once the AWS Role ARN is stored in GitHub Secrets:

1. Navigate to the **Actions** tab in GitHub.
2. Select the **COR Certification** workflow.
3. Click **Run workflow** (ensure you select the `phase4/production-hardening` branch).
4. The workflow will now exchange a secure, short-lived OIDC token for temporary AWS STS credentials and execute the physical tests safely.

---

### Regarding your `accessKey.csv`
If you used the `accessKey.csv` on your local PC to script the creation of the OIDC Role (via the AWS CLI), that is perfectly acceptable. However, **do not upload those keys to GitHub or paste them here**. Ugondu now operates under the Universal Credential Specification, meaning CI deployments strictly utilize OIDC short-lived identity.
