# Universal Credential & Authentication Onboarding

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
