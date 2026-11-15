# Troubleshooting Authentication

- **Target Account Mismatch**: Execution blocked because the expected account ID does not match the authenticated identity. Ensure you select the correct connection (e.g., `aws-prod`).
- **Insufficient Permissions**: Execution blocked because the authenticated principal lacks rights to perform the requested operation. Check IAM policies.
- **Could not load credentials from any providers**: The CI environment failed to assume the OIDC role. Verify the Trust Policy and Role ARN.
