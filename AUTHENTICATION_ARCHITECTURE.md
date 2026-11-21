# Ugondu Authentication Architecture

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
