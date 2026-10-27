# Ugondu Universal Azure Deployment + Portable Hosting — Implementation Plan

**Date:** 2026-10-27  
**Branch:** `fix/azure-portability-cor-remediation-2026-10-27`  
**Governance:** Must comply with the central guardrail at `.governance/handover/UGONDU-AZURE-PORTABILITY-COR-2026-10-27.md`.  
**Status:** Planned implementation sequence; only the initial routing/planning changes described in the handover have been written so far.

## Objective

Enable Ugondu to discover, plan, execute, verify, recover and document deployments across supported Azure workload families, independent of whether the actor is a novice, an expert, a deterministic pipeline or an AI-assisted agent. Maintain one portable codebase and avoid a costly Azure-first architecture that blocks the current DirectAdmin/shared-host launch or future VPS/AWS migration.

“Universal” means an extensible, explicitly qualified catalogue of capabilities. It must not mean a false promise that every Azure product, region, permission model or application can be deployed under all conditions.

## Baseline findings from source review

1. `TargetFabric` declares Kubernetes as a target type but did not route it to the existing `KubernetesTargetAdapter`.
2. The same fabric had no Azure-specific target type/resolver. Generic `cloud` remains intentionally unsupported unless a concrete provider is selected.
3. The target schema enumerated generic cloud/Kubernetes types and did not declare Azure identity modes.
4. Existing deployment profiles and hosting contract provide starting points, but the source does not prove full shared-host/VPS/AWS portability or full Azure live execution.
5. Existing governance includes COR remediation work. This plan must not overwrite, supersede or claim closure of the canonical COR runner's outstanding requirements.

## Phase 0 — Re-baseline and scope control (no cloud spend)

- Read the latest main head, dedicated branch head, recent remediation branches and existing COR/UAIGOS plans.
- Build a source inventory for adapters, execution action handlers, provider registry, schemas, secrets, persistence, queue, telemetry, billing/license calls and tests.
- Search for unsupported target/action declarations, unreachable adapters, duplicate provider implementations, environment-specific paths, runtime/database assumptions and hard-coded product/plan identifiers.
- Record each finding as confirmed defect, design gap, unverified claim or external prerequisite.
- Run existing local tests/build if repository workspace and dependencies are available; record actual results.
- Deliverable: signed-off baseline matrix bound to exact commit/tree hash.

## Phase 1 — Canonical provider contract

- Extend the existing target schema and capability contract rather than adding a competing registry.
- Define provider identity, API version, capabilities, operation support, required scopes, regions/SKUs, quota requirements, cost characteristics, rollback semantics, cleanup semantics and evidence schema.
- Define canonical deployment spec fields: source/artifact identity, workload classification, desired state, dependency graph, environment, region, identity mode, secret references, policy set, budget gate, verification probes, rollback and retention.
- Define action lifecycle: planned -> authorized -> running -> verified/failed -> compensated/rolled-back -> evidence sealed.
- Every action must have a typed input/output schema, timeout, retry classification, idempotency strategy and explicit side-effect declaration.
- Unknown capabilities or missing executors must fail closed.
- Acceptance: schema contract tests prove provider and execution declarations agree.

## Phase 2 — Safe execution and cost controls

- Reuse Ugondu's canonical durable execution/state machine; do not create a separate Azure engine.
- Persist operation IDs, idempotency keys, checkpoints, provider operation handles and evidence pointers.
- Support timeout, throttling (429), transient 5xx, token expiry, cancellation and process restart.
- Distinguish retry-safe operations from non-idempotent mutations.
- Before apply: show plan, affected resources, estimated cost where available, policy findings, region/SKU/quotas and destructive-change summary.
- Require approval for privileged scope, production destructive changes, large recurring cost or untrusted IaC.
- Use managed identity/workload federation where possible. Redact tokens and sensitive outputs from logs and evidence.
- Acceptance: adversarial tests for missing role, expired identity, duplicate request, partial failure, retry, interrupted execution, cost gate and secret leakage.

## Phase 3 — Azure infrastructure-as-code executors

- ARM: validate template and parameters, deploy at supported scope, poll operations, collect outputs and error details.
- Bicep: lint/build and deploy compiled template, preserve source/compiled digest, parameters and deployment operation ID.
- Terraform: validate/plan/apply with pinned provider versions, backend locking, state protection and explicit destroy approval. Never silently use local state in a shared deployment environment.
- Azure API/SDK executor: use versioned service clients, typed resource contracts, API version allow-lists and bounded retries.
- Preview/what-if must be separated from apply; plan output is not a deployment.
- Acceptance: offline fixtures, schema tests, sandbox live tests and evidence linked to source revision.

## Phase 4 — Core application compute

Implement and qualify service adapters in this order, based on common application demand and manageable test cost:

1. **App Service:** source/package and container deployment, runtime stack, app settings, secret references, deployment slots where available, TLS/domain prerequisites, health probes and rollback.
2. **Azure Container Registry + Container Apps:** image build/publish provenance, revision lifecycle, ingress, secrets, identity, scale rules and cleanup.
3. **Azure Functions:** runtime/language matrix, package/image deployment, triggers/bindings, identity and smoke tests.
4. **Static Web Apps / Storage static website:** build output, routes, cache rules, custom domain/TLS constraints and rollback.
5. **AKS:** Kubernetes adapter reuse, namespace/RBAC, manifests/Helm, ingress, storage, network policy, autoscaling, cluster version compatibility and upgrades.
6. **Virtual Machines / Scale Sets:** image, disks, NIC/NSG, extensions, boot diagnostics, health and recovery.
7. **Batch/GPU/HPC and niche workloads:** only after capability-specific acceptance tests and cost controls are designed.

Each service adapter must implement provision/update/deploy/verify/rollback/cleanup only where those operations are supported and tested. It must publish explicit unsupported operations rather than returning success.

## Phase 5 — Azure dependencies and operations

- Networking: VNet, subnet, NSG, DNS, routing, public/private ingress, private endpoints, firewall and restricted egress.
- Edge: load balancing, Application Gateway/Front Door/CDN when required by workload.
- Identity/security: Entra, RBAC scope, managed identity, workload federation, Key Vault secret references, certificate lifecycle and Azure Policy preflight.
- Data/messaging: supported database, object/file storage, queues and event services with dependency ordering, backups, migration safeguards and service health checks.
- Observability: Azure Monitor, Log Analytics and Application Insights integration with retention/cost controls.
- Governance: tags, policy, region allow-list, quota preflight, resource inventory and cost attribution.
- Acceptance: isolated service contract tests and a composite multi-resource app deployment fixture.

## Phase 6 — AI- and actor-independent orchestration

- Workload discovery detects languages, frameworks, build files, containers, IaC, database dependencies, ports, health endpoints, startup commands and required secrets without executing untrusted scripts.
- Classification produces candidate deployment architectures with confidence and missing information.
- For low confidence, ask targeted questions or run safe read-only inspection; never guess dangerous defaults.
- AI can propose plans, code changes and remediation, but canonical validators and policy gates decide what can execute.
- Provide the same plan/execute/verify contract to CLI, API, CI, UI and AI actors.
- Add remediation suggestions for permission errors, quotas, region restrictions, health failures and invalid configuration. Automatic repair must be bounded, diff-based and tested.
- Acceptance: equivalent input produces policy-equivalent execution plans regardless of actor/model path.

## Phase 7 — Portable hosting and minimum-cost launch

### DirectAdmin/cPanel shared hosting
- Detect available runtime, memory, filesystem permissions, cron availability, database engine, document root, SSH/API access and background-worker restrictions.
- Support static/compatible application deployment where host constraints permit; do not promise arbitrary long-running services on shared hosting.
- Store configuration/secrets outside the public document root; use immutable release folders and atomic promotion where supported.
- Use MySQL/MariaDB only through the configured repository/storage adapter. Do not couple domain logic to a specific engine.
- Use cron for scheduled jobs when supported. Avoid mandatory always-on workers and privileged services.
- Include quota checks, disk/memory preflight, deployment backup, rollback, log redaction and cleanup.
- Keep dependencies optional: no required Kubernetes, managed DB, Redis, message broker or paid observability for a simple launch profile.

### VPS / Docker / Kubernetes / AWS
- Same application artifact, canonical deployment specification, domain code, migration model and test contracts.
- Provider adapters manage runtime differences; configuration profiles declare differences without branching domain logic.
- Use OCI images when supported, but preserve non-container deployment for shared hosting.
- AWS migration must be a provider-profile switch plus data migration plan, not a business-code rewrite.
- Data migration: export, checksum, import, restore rehearsal, dual-run only when justified, DNS TTL, rollback window and final consistency check.

### AeroBill and Mandatag integration
- AeroBill remains the billing authority; Mandatag remains the entitlement/licensing authority.
- Do not duplicate price calculation, invoice creation, subscription status or entitlement logic inside Ugondu.
- Use API contracts, idempotency keys, timeouts, retry policy, audit IDs and explicit unavailable states.
- Fail closed for paid/protected actions when entitlement cannot be verified; do not invent local entitlement grants.
- Test duplicate webhook delivery, timeout, stale response, authority outage, replay and reconciliation.

## Phase 8 — Certification evidence and COR closure

For every capability:
- Static/type/schema checks.
- Unit and deterministic contract tests.
- Mocked API tests, explicitly labelled offline.
- Integration tests with disposable resources where feasible.
- Permission-denial and adversarial tests.
- Failure injection, interrupted execution, resume, rollback and cleanup.
- Cost/resource inventory and residual-resource audit.
- Security tests for secrets, least privilege, untrusted IaC, path traversal and log redaction.
- Evidence bundle: commit SHA, tree digest, tool versions, test commands/output, subscription/region context with secrets redacted, resource IDs, timestamps, deployment operation IDs, cost evidence and cleanup receipt.
- Release matrix must distinguish `PASS`, `FAIL`, `BLOCKED`, and `NOT TESTED`.

Run the canonical UAIGOS/COR workflow on the exact final code-bearing commit. No hand-created summary, stale certificate or synthetic pass can replace the runner. COR closure is only claimed if every authoritative gate passes and the evidence subject matches the final source tree.

## Near-zero-cost test strategy

**Free/offline first**
- Type-check and unit tests.
- JSON schema and policy validation.
- Mock Azure Resource Manager responses, throttling, permission denial, long-running operation polling and transient errors.
- Bicep/Terraform lint/validate where tooling is already available; pin versions and avoid cloud apply.
- Test path safety, idempotency, plan serialization and evidence manifests.
- Reuse existing CI minutes or a local machine; no Azure resources required.

**Controlled live phase**
- Live testing is blocked until the user has an active subscription and explicitly approves a budget.
- Use one isolated resource group, one region, the lowest practical SKU, short test windows and an explicit resource inventory.
- Create budget alerts but treat them as alerts, not hard caps.
- Avoid managed databases, NAT gateways, premium tiers, always-on AKS clusters and long-running compute during the first live qualification.
- Tear down after each test and verify residual resources in the subscription.
- Record actual cost; do not extrapolate unverified prices into a promise.

## Exit criteria

The project is not “complete” until:
- Azure adapters are executable, not plan-only.
- Each advertised capability maps to registered action handlers.
- All focused and full regression tests pass on the final branch.
- Live tests cover each release-advertised Azure capability.
- Shared hosting profile is tested without cloud dependencies.
- VPS/AWS migration path has a rehearsed data and rollback procedure.
- AeroBill/Mandatag authority boundaries are contract-tested.
- UAIGOS/COR gates pass with fresh evidence bound to the exact final source tree.
- Independent review confirms no drift, duplication, unsupported claims or code architecture downgrade.
