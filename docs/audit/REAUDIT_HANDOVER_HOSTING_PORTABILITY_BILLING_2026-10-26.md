# Re-audit Handover — Hosting Portability & Federated Billing Authority

**Finding group:** UG-PORTABILITY-BILLING-001  
**Branch:** `fix/hosting-portability-billing-persistence-2026-10-26`  
**Stacked PR:** [#29](https://github.com/Chicitadel/ugondu/pull/29)  
**Base candidate:** `4cabc3533e81e0fb0e3890a9290489414984439c`  
**Decision:** **Not release-certified.** This branch has code and regression suites added; exact-head workflow acceptance and live-host qualification remain pending.

## Confirmed defects

### DirectAdmin file/path and lifecycle false-success
`DirectAdminNativeClient` interpolated account-controlled names/IDs into remote file paths. Shell quoting did not prevent path traversal such as `../`. It also reported a hosted app as running after only creating/checking a `public_html` directory, despite not deploying the requested image/application or confirming HTTP health. The delete path could remove the `public_html` tree for a syntactically valid ID without proving the adapter owned that resource.

### Billing token store misreported persistence
The file store swallowed write failures and still returned success/readiness. Corrupt persisted JSON could be treated as an empty registry. A configured directory failure could silently fall back to temporary storage. This risks loss of persisted license state and false health reports.

### Federated entitlement authority boundary
The billing gateway could authorize from locally cached token records and reuse in-process idempotency results. In production this could let an old cached entitlement survive an external revocation. Air Roofers federated billing/entitlements (AeroBill/Mandatag) must remain the production source of truth.

## Physical code changes

- DirectAdmin: validated identifier path segments and SSH port; unsafe IDs fail closed; app deploy no longer returns fake success; app deletion is refused unless a real ownership/deployment model exists; DB/storage/snapshot identifiers are validated.
- Billing storage: exported a testable JSON store with strict record validation, explicit readiness/error codes, private file permissions, temp-file write + fsync + atomic rename, and no silent production-style fallback to `/tmp`.
- Billing gateway: production requires `BILLING_AUTHORITY_URL` or contracted `IDENTITY_AUTHORITY_URL`; authorization bypasses local cached allow decisions and queries the authority for each request; missing authority fails closed; production does not reuse in-process idempotency authorization responses.
- Added `license-store-portability.spec.ts` for reload persistence, file mode, corrupt state, configured data path failure, and write failure.
- Added billing gateway tests for live authority lookup and missing authority, plus DirectAdmin path traversal/false-deployment regression cases.
- Added new localized errors to the English source and all 12 locale JSON files in both `server/shared/locales` and root `locales` catalogs.
- Reworked `.governance/platform/deployment/shared-hosting.json` and added `docs/deployment/SHARED_HOSTING_LAUNCH_AND_MIGRATION.md`.

## Low-cost hosting decision

Use the existing shared host for initial launch only if the host provides a supported Node.js runtime, HTTPS, environment/secret injection, a private writable persistent data directory outside the web root, and outbound HTTPS to the Air Roofers authority. Do not require Docker, root, systemd or always-on custom background daemons. Use host-managed process supervision and cron only for bounded scheduled tasks.

If those prerequisites are missing, use a managed Node platform or small VPS rather than attempting unsupported runtime hacks. AWS can be adopted later by changing deployment/infrastructure configuration and qualified provider adapters. Billing semantics and entitlement source of truth must not change with hosting.

## Central policy and source-of-truth rules

- Billing/entitlement source: AeroBill/Mandatag federated authority.
- Legal policy source: https://policies.airroofers.eu (central authority; do not duplicate central legal policy content).
- Hosting profile: `.governance/platform/deployment/shared-hosting.json`.
- Canonical agent guardrail: [ANTIGRAVITY_CHANGE_GUARDRAIL.md](../governance/ANTIGRAVITY_CHANGE_GUARDRAIL.md).

## Required evidence before acceptance

Run on exact current PR head:
```bash
npm run test:locales
npm run verify:t03
npm --workspace=server/engine-core test -- --runInBand src/targets/__tests__/directadmin.spec.ts
npm --workspace=server/billing-gateway test -- --runInBand src/__tests__/license-store-portability.spec.ts src/__tests__/billing-gateway.spec.ts
npm run build --workspaces
npm run test --workspaces
npm run test:integration
npm run test:security
npm run governance:validate
```

The tests above are acceptance commands, not recorded pass results. GitHub CI/COR on the exact latest SHA must complete first. Do not count unit mocks as a real DirectAdmin host receipt. A production authority URL and authorized non-destructive host smoke test are required to qualify the current host. The AWS/GCP/Azure physical matrix, AI model fleet and immutable artifact lifecycle remain separate universal-COR blockers.
