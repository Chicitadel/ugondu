# Ugondu: Low-Cost Shared-Host Launch and Portable Migration Contract

**Governed by:** UAIGOS / Ugondu Antigravity Change Guardrail  
**Hosting profile:** `.governance/platform/deployment/shared-hosting.json`  
**Legal policy authority:** https://policies.airroofers.eu  
**Status:** Implementation and design handover; live host qualification remains required.

## Decision

Use the current DirectAdmin shared host as the launch target only if the host provides a supported Node.js runtime, environment-variable/secret injection, HTTPS, a private writable data directory outside the web root, outbound HTTPS access to the Air Roofers federated authority, and a panel-managed persistent service process. This is the lowest-cost option only when those prerequisites already exist.

If any prerequisite is missing, do not emulate it with filesystem tricks, a fake `systemd`, an unqualified shell deployment, or a memory-only licence cache. Use a small managed Node runtime/VPS or an appropriate managed application platform instead. AWS remains a later infrastructure option once traction, official engagement, or funding justifies it.

## Non-negotiable authority separation

- AeroBill/Mandatag (Air Roofers federated system) owns billing, subscription, edition and entitlement business logic.
- The Ugondu billing gateway acts as an authenticated consumer/adapter of that authority. Production authorization must query the configured authority on each decision; local files are not authoritative entitlement state and must not permit stale grants.
- The billing gateway must return unavailable/fail-closed when the authority is missing or unreachable. It must never convert upstream outages into “valid” or lower-tier fallback grants.
- Legal policies are centrally maintained at https://policies.airroofers.eu. Repository documents may link to the central source, but must not fork or silently copy legal-policy text into a second governance authority.
- Provider support is capability-gated by verified evidence; a DirectAdmin/cPanel/AWS label alone is not proof of supported execution.

## Required environment contract

| Variable | Requirement |
|---|---|
| `NODE_ENV` | `production` in production deployment |
| `PORT` | Use the host-provided port; never hard-code deployment port in application logic |
| `BILLING_AUTHORITY_URL` | Preferred canonical URL for Air Roofers federated billing authority; production-required |
| `IDENTITY_AUTHORITY_URL` | Supported identity/verification endpoint where this is the contracted authority integration; do not use it as a silent fallback to an unrelated service |
| `DATA_DIR` | Optional private writable directory for non-production/development cache and permitted local state; outside public document root, persistent across restarts |
| `UGONDU_LOCALE` | Optional locale selection, resolved through shared localization |
| Service signing/trust settings | Inject through hosting environment or approved secret management; never commit keys, tokens, or service credentials |

A missing mandatory production authority is an availability failure, not a reason to authorize against locally cached records.

## Runtime and file-system rules for shared hosting

1. Do not require root privileges, Docker, Kubernetes, systemd, package-manager installation at runtime, or arbitrary background daemons.
2. Use the hosting panel's supported Node application/process manager; cron may perform bounded scheduled maintenance only.
3. Keep persistent application data, temporary files, uploads, secrets and backups outside `public_html` and any publicly served directory.
4. Validate identifiers before translating them into remote file-system paths. Shell quoting alone is not path containment.
5. An existing directory is not proof of a deployed or healthy application. A provider adapter must not report successful deployment until install/start/readiness behavior is actually supported and independently verified.
6. If a hosting feature is not supported, return an explicit unqualified/unsupported result and keep it out of the capability manifest; do not simulate it with a successful `mkdir`.

## Migration contract: shared host → VPS → AWS

Keep application, policy, billing authority, edition mapping, API contracts, and capability registry unchanged. Migration should change only environment-specific configuration and infrastructure/deployment artifacts:

- runtime and process supervision;
- DNS, TLS termination and reverse proxy configuration;
- database/asset-store endpoints and credentials;
- private data/backup locations;
- approved secret injection;
- provider adapters and infrastructure templates, each qualified separately;
- monitoring, backups, restore validation and rollback steps.

Do not make billing semantics depend on the selected hosting provider. Run export/import checksum verification and a restore rehearsal for any authoritative application data store. Entitlement and subscription truth must remain in AeroBill/Mandatag so a hosting migration does not fork licenses.

## Release gate for a target

Every advertised target needs a target-specific, candidate-bound receipt for: clean install, configuration injection, signed-service authentication, authority availability, authorization positive/negative cases, restart persistence, backups/restore, upgrade, rollback, uninstall and residual-resource scan. Shared-host tests must be non-destructive and must not run against a customer DirectAdmin account without explicit authorization.

## Evidence boundary

This blueprint is not proof that the current shared host satisfies the prerequisites. Confirm them through an explicit non-destructive discovery probe and a supervised smoke test before launch. The DirectAdmin native app adapter must remain unqualified where it cannot actually deploy, start and probe an application.
