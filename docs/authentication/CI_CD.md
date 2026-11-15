# CI/CD Authentication

When operating in CI/CD (such as GitHub Actions):

- **Use OIDC**: The pipeline should exchange its short-lived OIDC token for provider credentials (e.g., AWS IAM Role).
- **Environment Variables**: Ugondu can consume `AWS_ROLE_ARN` or `AWS_PROFILE` securely.
- **Never Hardcode Secrets**: Do not store secrets in `.github/workflows/*.yml`.
