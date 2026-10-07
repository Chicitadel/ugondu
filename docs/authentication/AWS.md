# AWS Authentication

## Supported Authentication Methods
1. **GitHub OIDC / IAM Role Assumption (Preferred for CI/CD)**
2. **AWS SSO / IAM Identity Center (Preferred for Local)**
3. **Existing AWS CLI profile**
4. **Temporary STS credentials**
5. **Access Key Pair (Fallback, NOT Recommended)**

## Preferred Method: GitHub OIDC / IAM Role (CI/CD)
The most secure method for CI/CD is configuring GitHub Actions to assume an AWS IAM Role via OpenID Connect (OIDC).

### Prerequisites
- An AWS account.
- Administrator access to configure an IAM OIDC Identity Provider.
- A GitHub repository.

### Exact Customer Steps
1. Create an OIDC Identity Provider in AWS IAM (URL: `https://token.actions.githubusercontent.com`, Audience: `sts.amazonaws.com`).
2. Create an IAM Role for Ugondu COR.
3. Configure the Trust Policy:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Principal": { "Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com" },
         "Action": "sts:AssumeRoleWithWebIdentity",
         "Condition": {
           "StringLike": { "token.actions.githubusercontent.com:sub": "repo:<YOUR_ORG>/<YOUR_REPO>:*" },
           "StringEquals": { "token.actions.githubusercontent.com:aud": "sts.amazonaws.com" }
         }
       }
     ]
   }
   ```
4. Attach least-privilege permissions to the Role (ECR, ECS, CloudWatch, etc.).
5. Set `AWS_ROLE_TO_ASSUME` as a GitHub Secret/Variable with the Role ARN.

### Exact Ugondu Command
In CI/CD, Ugondu automatically discovers the environment variables provided by `aws-actions/configure-aws-credentials`.

### Verification Command
```bash
ugondu auth test aws
```

### Security Warnings
- **NEVER use root AWS credentials.**
- **DO NOT commit `accessKey.csv` to GitHub.**
