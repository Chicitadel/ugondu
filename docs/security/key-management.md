<!--
Governance: Air Roofers / UAIGOS 
Classification: ENTERPRISE | INTERNAL
-->
# Key Management

## Generating Ed25519 Keypairs
Use `openssl` to generate Ed25519 keypairs securely:
```bash
openssl genpkey -algorithm ed25519 -out ed25519_private.pem
openssl pkey -in ed25519_private.pem -pubout -out ed25519_public.pem
```

## Environment Variables
The following environment variables are required:
- `UGONDU_RECIPE_PRIVATE_KEY`
- `UGONDU_SERVICE_IDENTITY_PRIVATE_KEY`

## Security Policies
- **Keys MUST NEVER be committed to VCS.**
- For local development, there is a fallback path: `KEYS_DIR` environment variable (defaults to `../keys`).
