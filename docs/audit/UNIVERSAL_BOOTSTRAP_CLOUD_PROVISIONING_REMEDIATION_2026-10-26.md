# Ugondu Universal Bootstrap & Cloud Provisioning Remediation

**Task ID:** UG-UPLM-BOOTSTRAP-UNIVERSAL-001  
**Status:** IMMEDIATE ACTION — implementation specification; runtime implementation and live cloud qualification still required  
**Date:** 2026-10-26  
**Repository:** https://github.com/Chicitadel/ugondu  
**Branch:** `fix/universal-bootstrap-cloud-provisioning-2026-10-26`  
**Authority:** Air Roofers / UAIGOS governance  
**Canonical coordination:** [Antigravity Change Guardrail](../governance/ANTIGRAVITY_CHANGE_GUARDRAIL.md)  
**Legal-policy authority:** https://policies.airroofers.eu

## 1. Executive decision

The first physical AWS staging deployment failing for `UgonduPhysicalTest` is a capability-design gap, not a reason to grant a user blanket administrator access. Ugondu must provide one governed bootstrap package that discovers existing authority and resources, establishes or verifies a narrowly scoped execution role, renders provider-specific permission packs, provisions prerequisites and workloads through supported adapters, and emits durable evidence.

The package must be installable/invokable from the graphical UI, native terminal, CI/CD, supported IDEs, and model-assisted or model-free actors. These surfaces call the same capability contracts and authorization engine. No UI, model, plugin, terminal flag, or agent may bypass policy, approval, account/tenant scope, target selection, or evidence gates.

This document and its registry are the canonical implementation specification. They do not themselves grant AWS permissions, mutate a cloud account, or certify a physical deployment.

## 2. Confirmed context and limits

Repository evidence in existing COR handovers records:
- bootstrap fail-closed remediation for policy create/update/attach, service-linked-role operations, and final inventory read-back;
- previous policy-pack portability risk from account/region binding;
- an existing shared-hosting profile and staged shared-host → VPS → AWS migration contract;
- the requirement that unsupported providers and missing physical receipts remain fail-closed;
- a distinction between the OIDC/base role (`UgonduCORRunner`) and resource execution role (`UgonduCORExecutionRole`) in the V9 installation guidance.

The supplied `ugondu.zip` is a handover/policy artifact bundle, not a complete source checkout. It contains existing COR handovers, UPLM specifications and five V9 split managed-policy JSON files. It is useful design evidence but is not proof that all documented capabilities are implemented in the current runtime. Re-audit source and tests before coding; reuse the existing UPLM/COR/policy registry and bootstrap implementation rather than creating parallel services.

## 3. P0 security decision: bootstrap authority

### 3.1 Never self-escalate

An IAM identity that cannot create CloudFormation stacks cannot grant itself those permissions. Ugondu must not attempt a permission bypass, silently switch credentials, or retry with an undisclosed principal.

If the selected principal lacks authority, return a typed `AUTHORITY_GAP` result containing:
- caller account and principal ARN (redacted where appropriate);
- exact denied operation and target scope;
- whether a pre-approved bootstrap role/profile is configured;
- a least-privilege policy pack and admin-console/CLI handoff instructions;
- the precise operations requiring an authorized administrator;
- resume token / operation ID and verified checkpoint.

Stop before the denied mutation. Do not return exit code 0, mark a deployment successful, or proceed to dependent actions.

### 3.2 Supported bootstrap modes

1. **Delegated bootstrap (preferred):** administrator/organization platform team creates or authorizes a dedicated bootstrap/execution role through a reviewed, versioned package. Ugondu then assumes that role with short-lived credentials.
2. **OIDC federation:** CI/IDE automation uses a verified GitHub OIDC provider and narrowly scoped trust relationship; validate issuer, audience, repository, branch/environment, and session tags. Prefer ephemeral credentials over long-lived access keys.
3. **Explicit operator handoff:** when current identity lacks authority, generate a reviewed policy/role plan and stop for authorized operator execution; verify read-back before resuming.
4. **Existing role reuse:** discover candidate roles, attached policies, trust policies, permission boundaries, SCP/organization restrictions, and session-tag requirements. Reuse only after all invariants pass.
5. **Local/profile credentials:** allowed only through explicit provider-native credential chains; never log secrets or persist raw credentials in the ledger.

The OIDC runner/base role must not receive broad workload-provisioning permissions by default. Separate bootstrap authority, execution role, CloudFormation service role, and workload runtime role where the provider's trust model requires them.

### 3.3 No blanket `cloudformation:*` default

Do not prescribe `cloudformation:*` or `AdministratorAccess` as the standard remedy. Build the exact action set from the reviewed deployment template and provider adapter. Scope stack operations to approved stack-name/ARN patterns, account, region, tags and change-set workflow where supported. Use conditions for resource creation where the API supports them. Where AWS requires `Resource: "*"` for a particular discovery/create operation, document the exception, add the narrowest supported conditions, and test both permitted and forbidden cases.

Constrain `iam:PassRole` to explicitly approved service roles and services. Never allow arbitrary role passing. Treat IAM role/policy creation and trust-policy changes as privileged bootstrap operations requiring explicit admin authorization and read-back verification.

## 4. Canonical bootstrap package

Implement one signed, versioned package under the existing UPLM/COR ownership. The manifest at `.governance/platform/bootstrap/universal-bootstrap-capabilities.json` is the canonical capability/adapter/edition registry. Policy templates are generated from the selected target and approved action set; do not create independent per-interface policy copies.

Package lifecycle:
1. `DISCOVER`: inspect identity, account/tenant/project, available provider APIs, existing roles, policies, trust, boundaries, organization restrictions, DNS zone ownership, certificates, stack/workspace state, tags and drift.
2. `RESOLVE_TARGET`: require explicit or previously approved target; region/location recommendations are advisory until selected.
3. `PLAN`: compute an idempotent plan and dependencies; separate read-only inspection from mutations.
4. `VALIDATE`: validate schemas, signatures, policy syntax, least privilege, target scoping, plan digest, provider capabilities, cost guardrails and policy version.
5. `AUTHORIZE`: verify caller rights and required approval. If authority is absent, return `AUTHORITY_GAP` and stop.
6. `APPROVE`: show human-readable diff, cost estimate where available, destructive actions, resource scope and rollback limits. Non-interactive actors return a typed approval requirement if consent is missing.
7. `APPLY`: execute through provider-native APIs / CloudFormation / Terraform adapters with idempotency and checkpoints.
8. `VERIFY`: read resources back from provider APIs; verify stack/workspace outputs, DNS, certificate state, distribution deployment, health checks, identity and tags.
9. `CERTIFY`: emit immutable candidate-bound evidence with actor, policy digest, plan digest, provider/account/region, operation IDs, timestamps, result and redacted logs.
10. `FREEZE`: bind the evidence to exact source, adapter, manifest and policy-pack digests.
11. `HANDOFF`: persist recovery instructions and unresolved items.

Every stage is durable and resumable. On timeout, process crash, partial provider failure, denial, stale state or digest mismatch, reconcile live state before resume. Never blindly replay a mutation.

## 5. Universal provider capability domains

The catalog separates the provider-neutral contract from provider-specific adapters. A capability is advertised as supported only after its own tests and qualification receipts pass.

### AWS
- IAM identity discovery, role/trust/policy inspection, Access Analyzer validation, scoped role assumption and bootstrap handoff.
- CloudFormation stacks, change sets, drift detection, events, outputs, rollback and deletion protection.
- Terraform execution adapter: init/validate/plan/apply/destroy, backend locking, state encryption/versioning, provider/plugin lockfile, plan artifact digest, workspace isolation, state recovery and policy checks. Never run Terraform against unreviewed remote state or apply a stale plan.
- Route 53 hosted-zone discovery, record-set change batches, ownership/zone checks, TTL and rollback snapshots.
- ACM public/private certificate inventory, request, DNS validation, issuance polling, attachment and renewal readiness. Region placement is resource-specific: CloudFront viewer certificates must be requested in `us-east-1`; regional ALB/API Gateway certificates belong in the relevant service region.
- CloudFront distribution configuration, origin access controls, aliases, certificate association, deployment status, invalidations and rollback to prior known configuration.
- Workload adapters as needed: VPC/subnets/security groups, EC2/EBS, ECR/ECS/Fargate, load balancers, RDS, S3, KMS, Secrets Manager, CloudWatch/logging, backup and monitoring.
- Account, partition, region, tags, quotas, cost estimation and cleanup ownership checks.

### Other clouds and platforms
- Azure: subscription/tenant/region/resource group identity, role assignment plan, ARM/Bicep/Terraform adapter, DNS/certificate and deployment verification.
- GCP: organization/project/region identity, IAM service account/workload identity, Terraform/Deployment Manager alternatives as currently supported, DNS/certificate and deployment verification.
- Kubernetes: cluster/context/namespace discovery, RBAC, manifests/Helm, secrets references, rollout/health, rollback and drift checks.
- VPS/private cloud: provider APIs or explicit SSH/Ansible adapters, host identity verification, least-privilege service account, firewall, reverse proxy/TLS, backup and health checks.
- cPanel/DirectAdmin/shared hosting: panel/API/SSH capabilities only where actually available; no root/systemd/Docker assumptions. Use host-managed runtime/TLS, private persistent storage and cron constraints. Do not claim arbitrary application deploy success if the adapter cannot install, start and health-check the application.
- Generic hosting: capability probing first; unsupported operations are clearly marked unavailable and never emulated as success.

Provider-specific features, IAM models and resource semantics remain in adapters; the canonical state machine, approval, policy evaluation, audit, entitlement and evidence rules remain shared.

## 6. DNS and certificate workflow contract

1. Discover the authoritative DNS provider and verify zone ownership and write access.
2. Resolve the requested FQDN and certificate scope; reject ambiguous ownership or conflicting records.
3. Determine attachment target before requesting the certificate.
4. For CloudFront, request ACM certificate in `us-east-1`; for regional integrations use the relevant target region.
5. Prefer DNS validation. Create only the exact ACM validation CNAMEs in the verified authoritative zone. For external DNS providers, present exact record name/value and use their supported API or require operator handoff.
6. Poll with bounded timeout and durable checkpoints; do not report issued before provider read-back says `ISSUED`.
7. Attach only to the selected, verified target. For CloudFront wait for distribution deployment; for ALB/API Gateway verify association and endpoint TLS.
8. Verify DNS resolution, certificate chain/hostname/expiry and end-to-end HTTPS from an independent probe where possible.
9. Record prior DNS/configuration values for rollback. Never delete pre-existing records or a customer-owned distribution without ownership/provenance evidence.

## 7. Terraform safety contract

- Terraform is an adapter, not a second governance engine.
- Pin Terraform version and provider dependencies; retain `.terraform.lock.hcl` and verify module provenance.
- Require explicit backend, workspace, target account/project/subscription and location; no silent default region/account.
- Encrypt remote state, enforce backend access controls, state versioning and locking; never commit state or credentials.
- Plan artifact is immutable and bound to source revision, provider lockfile, workspace, target identity, variables digest, policy digest and expiration.
- Apply only the exact approved plan; re-plan if any binding or live state changes.
- Use policy-as-code to deny public exposure, wildcard privilege, destructive data changes, unmanaged secrets, out-of-scope regions, or unapproved spend according to policy.
- Destroy requires separate explicit authorization, inventory/provenance checks and recoverability review.

## 8. Edition capability strategy

Principle: Community is useful, safe and end-to-end for a small target; upgrades sell scale, breadth, expertise and governance—not permission to escape safety controls.

| Capability | Community | Professional | Enterprise |
|---|---|---|---|
| One guided deployment target | Included | Included | Included |
| Read-only discovery, dry-run plan, human approval | Included | Included | Included |
| Basic AWS CloudFormation deployment path | One template/profile, manual admin handoff | Multiple templates/environments | Organization-wide catalog and delegated bootstrap |
| Terraform | Validate/plan + guided apply handoff | Governed apply, state/backend integrations | Multi-account/org orchestration and policy-as-code |
| DNS + ACM + CloudFront | Guided checklist and exact manual record instructions | Automated supported-provider workflow | Multi-zone, multi-account delegation and approvals |
| Other clouds / Kubernetes / VPS | Discover + clearly labelled adapters; basic manual handoff | Qualified automated adapters per entitlement | Cross-cloud orchestration, fleet policies and governance |
| UI, CLI and IDE | UI + CLI baseline, documented API | IDE integrations and advanced CLI | Org-level controls and policy administration |
| Model-free / model-assisted | Both; deterministic path works without models | Optional model-assisted planning/explanations | Governed agent orchestration with scoped autonomy |
| OS/platform coverage | Core supported OS list, transparent limitations | Expanded native qualification matrix | Fleet management and organization-specific qualification |
| Execution continuity | Local durable run record/export | Encrypted remote ledger, resume and multi-run history | Shared tenant ledger, retention policy, delegated approvals |
| Policy granularity | Safe presets + visible plan | Custom scoped policy packs and policy simulation | Organization policy hierarchy, exception workflows, policy-as-code |
| Evidence/audit | Local exportable redacted evidence | Signed receipts and audit history | Centralized retention, compliance exports, evidence governance |
| Rollback/recovery | Basic supported rollback | Multi-stage recovery and drift remediation | Cross-environment recovery orchestration and controls |
| Cost controls | Basic estimated cost disclosure where available | Budget thresholds and environment profiles | Org budgets, approval thresholds and fleet reports |

No edition may bypass IAM authorization, secrets handling, target selection, approval requirements, fail-closed behavior, or truthful evidence. Community users can deploy a small supported workload; paid editions improve automation depth, scale, breadth and control. Entitlements are authoritative only through Air Roofers AeroBill/Mandatag; never move billing authority into local cache or this registry.

## 9. UI / CLI / IDE / agent parity

The canonical API and CLI must expose equivalent operations:
- `ugondu bootstrap inspect`
- `ugondu bootstrap plan --target <id> --output <plan>`
- `ugondu bootstrap validate --plan <plan>`
- `ugondu bootstrap authorize --plan <plan>`
- `ugondu bootstrap apply --plan <plan>`
- `ugondu bootstrap status --operation <id>`
- `ugondu bootstrap resume --operation <id>`
- `ugondu bootstrap evidence --operation <id>`
- `ugondu cloud dns plan`, `ugondu cloud certificate plan`, `ugondu cloud terraform plan`

These are proposed commands, not claims of existing CLI support; map them into current CLI conventions after source inspection. UI buttons and IDE/agent tools call the same API contracts. Every command supports JSON output, localized human-readable errors, explicit target selection, dry-run, timeout, and non-interactive typed approval requirements. Model-free execution is mandatory; models may explain or draft plans but cannot grant authority or alter policy outcomes.

## 10. Implementation phases and priorities

### P0 — stop false success and unblock safe staging
- P0.1 Inventory current bootstrap entrypoints, role/policy templates, action registry, signature/digest logic, trust policies, workflow gates and tests. Identify existing implementation owner and file overlap before editing.
- P0.2 Reproduce `UgonduPhysicalTest` denial with sanitized evidence; determine exact denied API/action, account, region, target stack ARN/name and whether failure is IAM, SCP, boundary, trust, service role, or missing prerequisite.
- P0.3 Ensure every denied required mutation returns typed `AUTHORITY_GAP`, non-zero CLI outcome and durable checkpoint; add regression for CloudFormation create/execute change set, PassRole denial, policy attachment denial, missing trust and failed read-back.
- P0.4 Create signed bootstrap manifest and scoped AWS action bundles. Preserve V9 policy intent, but make target/account/region/stack/role parameters explicit and digest-bound; do not silently edit existing policy semantics.
- P0.5 Generate an administrator-reviewed bootstrap handoff package with explicit role trust and action policies; do not self-escalate the caller.
- P0.6 Add CloudFormation staging path including prerequisites (VPC/subnet group, IAM service role if required, stack events, rollback state) and validate the supplied `infrastructure/aws/dumcholu-pilot-staging.yaml` by inspecting the actual template before deriving permissions.
- P0.7 Add a test proving no action follows `AUTHORITY_GAP` and exit status is non-zero; exact-head CI must run.

### P1 — unify IaC, DNS, TLS and edge provisioning
- P1.1 Implement/reuse Terraform adapter and immutable plan binding.
- P1.2 Implement Route 53 and external DNS adapters with zone ownership and reversible record changes.
- P1.3 Implement ACM request/validation/issuance and target-specific region routing.
- P1.4 Implement CloudFront distribution/alias/certificate integration and asynchronous deployment verification.
- P1.5 Add idempotency, timeout, resume, read-back, drift detection, rollback and orphan inventory.
- P1.6 Add policy simulator/Access Analyzer validation where supported; run positive and negative scope tests.

### P2 — broaden provider and hosting coverage
- Azure, GCP, Kubernetes, VPS/private cloud, cPanel/DirectAdmin/shared-host adapters; capability discovery first.
- Native OS/architecture qualification; Windows/macOS/Linux shells and supported environments.
- Verify every adapter can install/configure/start/health-check/upgrade/rollback/uninstall before advertising deployment support.

### P3 — UX, IDE, agent and editions
- UI wizard for identity, target, region, permissions, plan diff, approvals, progress, resume and evidence.
- CLI parity and stable API schema.
- IDE adapters and model agent tool definitions over canonical API.
- Capability registry drives entitlement/edition UI; no duplicated hardcoded feature matrix.
- Community path remains useful; upgrades expose richer control and automation without safety downgrade.

### P4 — certification and release
- Run deterministic unit/property/adversarial tests; policy validation; adapter contract tests; ephemeral-account integration tests; authorized physical deployment; DNS/TLS end-to-end checks; recovery/rollback tests.
- Test all UI/CLI/IDE/model-free/model-assisted entrypoints for equivalent authorization decisions.
- Bind evidence to exact candidate SHA and policy/manifest digests; independent review; update UAIGOS readiness and sign-off.
- Universal COR remains withheld until each advertised provider/host/OS/IDE/mode has authentic, current qualification evidence.

## 11. Required tests and evidence

- Identity mismatch, wrong account/tenant, wrong region, wrong partition, stale credentials, expired token, denied API, SCP deny, permission boundary deny, missing PassRole, invalid trust, OIDC audience/repo/branch mismatch.
- Existing resource reuse, conflicting DNS records, hosted-zone ambiguity, duplicate certificate, certificate pending validation/failed validation, CloudFront still deploying.
- Terraform stale plan, lock contention, remote state unavailable, lockfile mismatch, drift between plan/apply, destructive action without explicit approval.
- Partial apply/crash/resume, duplicate request/idempotency, timeout, rollback failure, unowned resource cleanup attempt, digest/signature mismatch.
- UI/CLI/IDE/model-free/model-assisted parity and no model-required control path.
- Edition entitlement denied/expired/stale authority; community still has supported deployment route.
- Every denial is non-zero / typed failure; no fake PASS; no secrets in logs, evidence or state.

Evidence fields: candidate SHA, adapter version, manifest digest, policy digest, plan digest, operation ID, principal, account/tenant/project, target/region, approval actor, provider request IDs, resource inventory, test command, exit code, timestamp, redacted logs, unresolved items and release disposition.

## 12. Acceptance criteria

This work can be marked implementation-complete only when:
- one canonical bootstrap manifest and policy generator are wired into the current bootstrap execution path;
- no duplicate policy registries or interface-specific authorization implementations exist;
- all required mutations are fail-closed with typed errors and durable resume checkpoints;
- account/region/tenant/role/trust scope is resolved, never silently hardcoded;
- IAM policy validation and positive/negative scope tests pass;
- CloudFormation and Terraform adapters are integrated through shared governance;
- DNS, ACM and CloudFront workflows verify actual provider state and certificate/endpoint health;
- edition capabilities derive from the canonical registry and entitlement authority;
- UI, CLI, IDE and agent paths share policy/approval/evidence gates;
- exact-head CI/COR pass and physical staging evidence exists;
- independent UAIGOS review accepts evidence.

Until these criteria are met, status is **IMMEDIATE ACTION / NOT CERTIFIED**. This is a governed implementation specification and task activation, not proof that the AWS restriction has already been resolved.

## 13. Rollback and non-goals

- Never modify `master` or protected production branches directly.
- Never replace the existing bootstrap service, UPLM or policy registry with a parallel implementation.
- Never attach broad policies to the OIDC runner/base role as a shortcut.
- Never delete or replace roles, hosted zones, certificates, distributions, state files or data without ownership proof and explicit approval.
- Roll back only resources created by the current operation and recorded in the execution ledger; preserve pre-existing resources and evidence.
- Do not claim support for an adapter until its lifecycle is physically qualified.
