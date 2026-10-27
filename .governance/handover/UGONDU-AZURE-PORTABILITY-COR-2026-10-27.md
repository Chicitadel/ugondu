# Ugondu Azure + Hosting Portability Remediation — Central Guardrail

**Date:** 2026-10-27  
**Branch:** `fix/azure-portability-cor-remediation-2026-10-27`  
**Base:** `main` at `2c22cfa82e5214617940dac95162ac12a3c51ac1`  
**Authority:** This file is the shared handover contract for Antigravity agents/actors working on this remediation stream.  
**Status:** IN PROGRESS — NOT COR-CERTIFIED; live Azure execution is NOT implemented by the initial adapter.

## 1. Purpose and non-negotiable invariants

Close the verified Azure provider routing gap and establish a governed, portable path toward comprehensive Azure deployment support without weakening Ugondu's execution engine, existing provider architecture, UAIGOS governance, COR gates, or release evidence requirements.

1. Never commit to `main` or `master` from this workstream. All changes remain on the dedicated branch until independent review and CI pass.
2. Do not claim Azure live deployment, universal Azure coverage, COR closure, or commercial certification from plan generation or mocked tests.
3. Azure actions must fail closed if no executor is registered for the action. No silent fallback to SSH, Docker, shared hosting, or a different Azure service.
4. No new competing billing, subscription, licence, entitlement, product-catalogue, or payment implementation. Air Roofers' federated billing/entitlement authorities remain AeroBill and Mandatag. Ugondu consumes their approved APIs/contracts.
5. One codebase must remain portable across DirectAdmin/cPanel shared hosting, VPS, Docker, Kubernetes and later AWS/Azure. Runtime-specific details belong in provider adapters/configuration profiles, not business-domain code.
6. Keep shared-hosting launch economical: no mandatory Kubernetes, database, queue, telemetry collector, always-on worker, or cloud service when the selected deployment profile does not require it.
7. Never hard-code product names, plan IDs, commercial prices, entitlement decisions, cloud credentials, tenant IDs or deployment secrets in provider code.
8. Every claim must have traceable source, test output and commit identity. Missing evidence is NOT TESTED, never PASS.
9. Do not delete, overwrite or rename existing governance evidence merely to make a report green. Reconcile its authority and regenerate evidence only through the established runner.
10. No architectural downgrade, duplicate adapter, parallel state machine, bypass of the canonical execution graph, or second policy registry is permitted.

## 2. Changes made on this branch

- Added `server/engine-core/src/targets/azure.ts`: a typed Azure target planner for ARM template, Bicep, Terraform, App Service, Container Apps, AKS, Functions, virtual machines and Static Web Apps workload kinds. It validates required context, identity mode, template paths and deployment name; emits explicit cost/approval, executor-registration, live-evidence and cleanup gates.
- Added Azure to the canonical target type schema and identity-mode enumeration.
- Registered Azure and Kubernetes adapters in `TargetFabric`. The pre-existing fabric declared Kubernetes as a target type but did not resolve it to the existing Kubernetes adapter; Azure/cloud target routing was also absent.
- Exported the Azure adapter from the target module.
- Added regression coverage for Kubernetes resolution, Azure resolution, explicit plan-only status, cost gate, executor-registration gate and path traversal rejection.

### Scope limitation

The Azure adapter is intentionally **plan-only**. Its action identifiers are not proof of implemented Azure API handlers. The next implementation phases must connect actions to real, typed executors and live subscription-backed tests. Do not mark this finding fully closed until those executor handlers exist and evidence proves their behavior.

## 3. Architecture ownership

- **Canonical execution/state machine:** existing Ugondu execution engine; do not fork it for Azure.
- **Provider resolution/capabilities:** existing target fabric plus the canonical capability registry; avoid duplicate registries.
- **Azure control plane:** typed Azure executor adapters over supported SDK/REST/IaC interfaces.
- **Infrastructure description:** ARM/Bicep/Terraform integration through a safe plan/apply contract.
- **Secrets/identity:** managed identity or workload federation first; service-principal secrets only as a controlled fallback and never in source or logs.
- **Billing:** AeroBill is authoritative.
- **Entitlements/licensing:** Mandatag is authoritative.
- **Product/plan catalogue:** centralized Air Roofers product registry is authoritative.
- **Hosting profile:** declarative deployment profile; business logic must not branch on hosting vendor.
- **Evidence/COR:** existing governance/certification runner is authoritative; provider-specific tests produce inputs to it, not an alternative certificate.

## 4. Agent protocol — mandatory before each task

1. Read this file and the active COR remediation plan before editing.
2. Read the current branch head, diff and relevant code/tests; do not rely on old chat summaries.
3. Confirm no conflicting change already implements the same capability. Extend the superior existing abstraction rather than duplicate it.
4. State the exact defect, source evidence, intended files, test command and rollback plan before writing.
5. Implement the physical source change on this branch before handing anything to another actor.
6. Add regression tests for success, invalid input, failure/timeout, permission denial, retry/resume, cleanup and security boundary as relevant.
7. Run focused tests, type-check/build, full relevant suite and governance/COR gates available in the environment. Record actual command/output/exit status; never fabricate test results.
8. Review the final diff for unrelated changes, duplicated code, credential leakage, product-name hardcoding, weakened policy, platform lock-in and hosting-specific business logic.
9. Update this handover note and the implementation matrix with commit SHA and evidence references. Do not overwrite another actor's updates; reconcile concurrent changes.
10. If a test cannot run due to missing Azure access, network, secrets, quota or cost, record BLOCKED/NOT TESTED with the precise reason. Do not treat it as a pass.
11. Stop and ask for owner approval before destructive production operations, paid resource creation, privilege expansion, DNS/domain changes, data migration or actions that may incur nontrivial costs.
12. Do not merge this branch without review, passing CI and a verified change summary.

## 5. Required Azure service implementation matrix

Every service family needs explicit statuses: `MISSING`, `PLANNED`, `IMPLEMENTED_OFFLINE`, `LIVE_TESTED`, `CERTIFIED`, or `BLOCKED`. “Supported” must identify supported operations and limits, not merely a service name.

- ARM and Bicep: template parse/lint, parameter validation, what-if/plan, deployment, operation polling, outputs, rollback/compensation and evidence.
- Terraform: init/validate/plan/apply/destroy, backend/state lock, secret redaction, provider/version pinning and drift handling.
- App Service: Linux/Windows, runtime and container deployment, configuration/secret references, slots, health probes, TLS/custom domains, rollback.
- Container Apps and ACR: build/push provenance, revision/traffic control, ingress, environment dependencies, identity and cleanup.
- AKS: cluster preflight, namespace/RBAC, Helm/manifests, ingress/storage/network policy, upgrades, autoscaling, health and rollback.
- Functions: supported language/runtime matrix, triggers/bindings, package/image deployment, identity and smoke tests.
- Virtual machines/scale sets: image, disk, NIC, NSG, boot diagnostics, extensions, health, scale and recovery.
- Static Web Apps/Storage: build outputs, deployment token or supported identity, routes, custom domains, TLS and CDN integration.
- Networking: VNet/subnets, DNS, private endpoints, load balancers, Front Door/Application Gateway, firewall/routing and egress.
- Data/messaging: supported Azure database/storage/queue services, dependency ordering, backups, migration safeguards and least privilege.
- Security/operations: Entra, RBAC, managed identity, Key Vault, Azure Policy, Monitor, Log Analytics, Application Insights, diagnostics and cost tags.
- Enterprise/hybrid/specialized: private networking, restricted egress, multi-region, GPU/HPC and workload-specific limitations only when separately qualified.

Do not advertise all Azure products as universally supported. The registry must state capability version, operation support, constraints, live evidence and last qualification.

## 6. Portable low-cost hosting policy

### Shared hosting / DirectAdmin launch profile

- Keep application runtime compatible with the host's supported runtime; where persistent Node workers or containers are prohibited, deploy static frontend/PHP-compatible edge or use an external API runtime only when approved.
- Prefer MySQL/MariaDB where that is the host's managed database. Use migrations and repository/storage interfaces; never encode database vendor assumptions in domain logic.
- Use cron for scheduled work when supported; do not assume a permanent queue consumer or privileged system service.
- Keep durable state outside ephemeral release directories; separate configuration and secrets from public document roots.
- Use immutable/versioned release directories where host permissions allow, atomic promotion where supported, verified backups and rollback.
- Use provider-neutral object-storage interfaces and filesystem adapters with explicit durability/locking capabilities.
- Avoid Kubernetes, managed databases, paid observability and always-on cloud compute as launch prerequisites.

### VPS / container / AWS migration profile

- Preserve the same canonical deployment specification, domain services, migrations and provider-neutral interfaces.
- Add infrastructure through provider profiles and adapters; do not fork application logic.
- Use managed database/object storage/queue/telemetry only when traction, reliability or official engagement justifies recurring cost.
- Migrate data with rehearsed export/import, checksums, restore tests, DNS TTL planning and a rollback window.
- Maintain portable OCI images where container execution is supported, but do not make OCI a prerequisite for shared hosting.

### Shared business service authorities

AeroBill and Mandatag remain external federated authorities for billing and entitlements. Ugondu must handle unavailable authority APIs safely: fail closed for protected paid actions, preserve idempotency keys, avoid duplicate charges, and surface retryable status. Do not introduce local shadow entitlements or bypass verification when the network is unavailable.

## 7. Near-zero-cost delivery sequence

1. Offline/source audit and capability inventory; no Azure resources.
2. Pure unit/contract tests using fixtures and local mocks.
3. IaC syntax validation and static security checks without apply.
4. Local Docker tests only where Docker is already available; shared-hosting profile tests remain runnable without Docker.
5. Free CI minutes/local runner for type-check, unit, schema, policy and regression tests.
6. Only after a costed plan and owner approval: a short-lived dedicated Azure test resource group, smallest supported SKU, explicit region/quotas, budget alerts, time-limited test window and teardown verification.
7. Capture real outputs/logs and costs, then remove test resources and inspect for residual billable assets.
8. Repeat live qualification only for materially changed provider code, supported service version or Azure API contract.

Cost alerts are not hard spending caps. No live Azure test may begin without a named owner, budget ceiling, expected resource inventory, cleanup procedure and approval.

## 8. Release/COR exit gates

- [ ] No writes to main/master from this workstream.
- [ ] Type-check and build pass.
- [ ] Focused adapter tests and full relevant regression suite pass.
- [ ] Schema and capability registry agree.
- [ ] No unsupported action is advertised as executable.
- [ ] Executor actions are registered and fail closed when absent.
- [ ] Live Azure evidence exists for every capability advertised as live-supported.
- [ ] Security, cost, cleanup and recovery tests pass.
- [ ] AeroBill/Mandatag ownership is preserved with contract tests.
- [ ] Shared-hosting profile works without requiring Azure/AWS resources.
- [ ] VPS/AWS migration plan preserves data and avoids application code forks.
- [ ] UAIGOS governance and COR certification runner pass on the exact final commit.
- [ ] Independent reviewer confirms no regression, duplicate architecture or unsupported claim.

**Current verdict:** implementation work started; adapter routing and planning contract added; runtime tests have not been executed in this environment; live Azure execution is not implemented or certified; COR remains open pending full qualification.
