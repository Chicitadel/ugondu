import os

docs_dir = "docs/authentication"
os.makedirs(docs_dir, exist_ok=True)

files = {
    "README.md": """# Universal Credential & Authentication Onboarding

Ugondu provides a secure, provider-neutral authentication system to manage connections to all supported targets.

## Principles
- **No hardcoded secrets**: Secrets are never placed in source code or committed to Git.
- **Temporary Credentials Preferred**: Federation, SSO, and STS temporary credentials are prioritized over long-lived access keys.
- **Clear Connection Identity**: Every connection maps to a specific environment (e.g., `aws-production`) and verifies the target account ID to prevent accidental deployment to the wrong environment.
- **Evidence Redaction**: Secrets are strictly redacted from transaction journals, logs, and evidence artifacts.

## Available Providers
- [AWS](AWS.md)
- [GitHub](GITHUB.md)
- [Kubernetes (UNQUALIFIED)](KUBERNETES.md)
- [Docker](DOCKER.md)
- [cPanel (UNQUALIFIED)](CPANEL.md)
- [DirectAdmin (UNQUALIFIED)](DIRECTADMIN.md)
- [SSH](SSH.md)
- [VPS (UNQUALIFIED)](VPS.md)

## Common Commands
```bash
ugondu auth list
ugondu auth add <provider>
ugondu auth test <connection-id>
ugondu auth revoke <connection-id>
```
""",
    "AWS.md": """# AWS Authentication

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
""",
    "GITHUB.md": """# GitHub Authentication

## Supported Authentication Methods
1. **GitHub App Installation Token (Preferred)**
2. **Fine-grained Personal Access Token (Fallback)**
3. **SSH Key (where required for repository operations)**

## Prerequisites
- A GitHub account.

## Verification Command
```bash
ugondu auth test github
```
""",
    "KUBERNETES.md": """# Kubernetes Authentication (UNQUALIFIED)

*Note: Kubernetes is currently UNQUALIFIED for execution.*

## Supported Authentication Methods
1. **Cloud-provider authentication (e.g., EKS IAM, GKE IAM)**
2. **Service-Account Token**
3. **Kubeconfig Context**

## Verification Command
```bash
ugondu auth test kubernetes
```
""",
    "DOCKER.md": """# Docker Authentication

## Supported Authentication Methods
1. **Local Docker Socket**
2. **Cloud Registry Authentication (ECR/GCR helpers)**
3. **SSH**
4. **Registry Credential (username/password)**

## Verification Command
```bash
ugondu auth test docker
```
""",
    "CPANEL.md": """# cPanel Authentication (UNQUALIFIED)

*Note: cPanel is currently UNQUALIFIED for execution.*

## Supported Authentication Methods
1. **API Token**
2. **SSH Key / Password (where explicitly supported)**

## Verification Command
```bash
ugondu auth test cpanel
```
""",
    "DIRECTADMIN.md": """# DirectAdmin Authentication (UNQUALIFIED)

*Note: DirectAdmin is currently UNQUALIFIED for execution.*

## Supported Authentication Methods
1. **API Credential**
2. **SSH Key / Password (where explicitly supported)**

## Verification Command
```bash
ugondu auth test directadmin
```
""",
    "SSH.md": """# SSH Authentication

## Supported Authentication Methods
1. **SSH Agent (Preferred)**
2. **SSH Private Key File**
3. **Password (Fallback, if explicitly supported)**

## Verification Command
```bash
ugondu auth test ssh
```
""",
    "VPS.md": """# VPS Authentication (UNQUALIFIED)

*Note: VPS is currently UNQUALIFIED for execution.*

## Supported Authentication Methods
1. **SSH Private Key**
2. **SSH Agent**
3. **Provider API Credential**

## Verification Command
```bash
ugondu auth test vps
```
""",
    "CREDENTIAL_SECURITY.md": """# Credential Security

Ugondu guarantees that authentication material is strictly protected.

## Secret Redaction
- Evidence artifacts (e.g., `transaction-journal.json`, diagnostics) undergo mandatory secret scanning.
- Output logs will show `AWS_ACCESS_KEY_ID = PRESENT` rather than raw values.

## Credential Storage
Ugondu uses provider-neutral secret reference identifiers (e.g., `secure://...`) and integrates with the host operating system's native secure credential manager, avoiding plaintext YAML/JSON storage.

## Protection against Account Mismatch
Ugondu verifies the target account identity (e.g., AWS Account ID) before initiating any physical execution, explicitly halting if the resolved identity does not match the planned target identity.
""",
    "CI_CD.md": """# CI/CD Authentication

When operating in CI/CD (such as GitHub Actions):

- **Use OIDC**: The pipeline should exchange its short-lived OIDC token for provider credentials (e.g., AWS IAM Role).
- **Environment Variables**: Ugondu can consume `AWS_ROLE_ARN` or `AWS_PROFILE` securely.
- **Never Hardcode Secrets**: Do not store secrets in `.github/workflows/*.yml`.
""",
    "TROUBLESHOOTING.md": """# Troubleshooting Authentication

- **Target Account Mismatch**: Execution blocked because the expected account ID does not match the authenticated identity. Ensure you select the correct connection (e.g., `aws-prod`).
- **Insufficient Permissions**: Execution blocked because the authenticated principal lacks rights to perform the requested operation. Check IAM policies.
- **Could not load credentials from any providers**: The CI environment failed to assume the OIDC role. Verify the Trust Policy and Role ARN.
"""
}

for filename, content in files.items():
    with open(os.path.join(docs_dir, filename), "w", encoding="utf-8") as f:
        f.write(content)

auth_arch = """# Ugondu Authentication Architecture

## The Connection Model
A Connection defines an authenticated link to a provider, separate from execution.
```yaml
connection:
  id: aws-prod-eu-west-3
  provider: aws
  target_type: cloud
  account_id: "123456789012"
  region: eu-west-3
  authentication:
    method: oidc-role
    credential_reference: secure://os-keychain/ugondu/aws/prod
  status: verified
```

## Provider Authentication Contract
Every adapter implements:
```typescript
interface ProviderAuthenticationAdapter {
    describeMethods(): AuthenticationMethod[];
    beginAuthentication(options?: unknown): Promise<AuthenticationChallenge>;
    validateAuthentication(connection: Connection): Promise<AuthenticationValidation>;
    inspectIdentity(connection: Connection): Promise<ProviderIdentity>;
    inspectCapabilities(connection: Connection): Promise<ProviderCapabilities>;
    inspectPermissions(connection: Connection, operation: OperationPlan): Promise<PermissionAssessment>;
    refreshAuthentication(connection: Connection): Promise<CredentialReference>;
    revokeAuthentication(connection: Connection): Promise<void>;
}
```

## Secret Scanning
A mandatory evidence gate scans all artifacts (journals, logs, diagnostics) for known secret patterns. If a secret is detected, the transaction is marked `BLOCKED`.
"""
with open("AUTHENTICATION_ARCHITECTURE.md", "w", encoding="utf-8") as f:
    f.write(auth_arch)

print("Created authentication documentation.")
