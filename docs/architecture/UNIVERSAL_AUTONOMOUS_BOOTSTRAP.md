# Universal Autonomous Bootstrap and Policy Governance

**Status:** implementation specification / proposed change  
**Target:** Ugondu universal execution engine; AWS COR is the first adapter  
**Branch:** `feat/universal-autonomous-bootstrap`  
**Normative principle:** one bootstrap experience, one reconciler, provider-specific adapters, no routine manual policy attachment.

## 1. Product requirement

Ugondu must bundle every policy stabilization change, migration, validation rule, and recovery procedure required to bootstrap supported hosting environments. Users should not be asked to manually create each of the five AWS V9 policies, attach them one by one, or repeat provider-console operations after the bootstrap identity has been authorized.

The initial human task must be minimized to one provider-native authorization setup, followed by one Ugondu command or one UI action. Ugondu then discovers existing resources, validates ownership and policy documents, generates missing policy objects from the bundled versioned pack, attaches only approved policies, verifies effective prerequisites, and resumes deployment from its durable checkpoint.

AI is optional. The deterministic engine must offer the same deployment and recovery capabilities in terminal, UI, IDE, CI/CD, and model-assisted/non-model-assisted modes.

## 2. Important authorization boundary

No application can grant itself permissions that its bootstrap identity does not already possess. "Autonomous" means Ugondu performs the authorized work without routine human console operations; it does not mean bypassing provider authorization, organization policies, approval controls, or legal/security boundaries.

The first-run setup must be performed by an authorized platform administrator or a pre-approved platform mechanism. Ugondu must validate the grant before mutation. If a required permission is denied, it must stop before partial deployment, identify the exact provider/action/resource/condition that failed, and provide a single actionable remediation path.

Never ask users to paste long-lived cloud access keys into Ugondu. Prefer workload identity federation, SSO, OIDC, short-lived role sessions, and provider-native credential brokers. If the provider offers no suitable federation, document the least-risk supported alternative and its expiry/revocation process.

## 3. Beginner experience: one setup, then one action

The product flow should be:

1. **One-time authorization:** Ugondu shows the user the exact provider-native bootstrap principal name, a reviewed policy bundle, and a short guided setup. The user creates or selects that principal and grants the bundled bootstrap policy. Do not ask the user to create the five workload policies individually.
2. **Connect:** user authorizes a short-lived session / federation. Secrets are never written to the repository, policy pack, run ledger, or logs.
3. **Run:** user invokes `ugondu bootstrap` (or selects **Bootstrap and deploy** in the UI). The same engine handles both.
4. **Autonomous reconcile:** Ugondu discovers current account/project/subscription, region(s), roles, policy documents, attachments, boundaries, organization constraints, and ownership.
5. **Plan then apply:** Ugondu renders a deterministic, reviewable plan. Low-risk additive changes within the pre-authorized envelope can run automatically. Trust-policy changes, privilege expansion beyond the approved envelope, destructive changes, or ambiguous ownership stop for explicit approval.
6. **Verify and continue:** the engine re-reads the provider state, verifies policy hashes and attachments, performs conformance probes, records evidence, and resumes the deployment graph.
7. **Recover:** after a crash, cancellation, or lost terminal session, the next invocation reads the ledger, reconciles actual provider state, and resumes from the first unverified transition. It must not blindly replay non-idempotent operations.

The normal experience must not become a long wizard. Show one clear summary and request input only for genuinely unresolved choices (for example, target project, region, account, budget, or a high-risk authorization change).

## 4. AWS COR naming and ownership contract

The AWS adapter must use the existing canonical names and discover before creating:

- Runner role: `UgonduCORRunner`
- Execution role: `UgonduCORExecutionRole`
- Bootstrap principal: `UgonduBootstrapRole` only when the selected installation profile requires a distinct delegated bootstrap role and it does not already exist.
- Managed policy family: `UgonduCOR-V9-*`
- Expected policies: `UgonduCOR-V9-Discovery`, `UgonduCOR-V9-EC2-Creation`, `UgonduCOR-V9-EC2-Cleanup`, `UgonduCOR-V9-RDS-S3`, `UgonduCOR-V9-ECR-ECS`.

Names are registry entries, not strings duplicated across scripts. Account IDs, partition, region, role path, policy path, tag keys, provider API versions, and edition capabilities must be configuration/schema values validated at runtime. Never create a hyphenated legacy role merely because stale documentation names it. If a canonical name exists, adopt only after identity, trust, permissions, ownership and external-consumer checks pass. If inspection is denied, report **INCONCLUSIVE**, not "missing".

### Policy attachment responsibility

The V9 workload policies belong on `UgonduCORExecutionRole`, not `UgonduCORRunner`. The runner should retain only the authority needed to federate, assume the execution role with approved session tags, and perform narrowly scoped bootstrap operations explicitly assigned to it. Do not copy broad EC2/RDS/S3 workload permissions into the runner merely to silence a denied probe.

The current runner JSON contains infrastructure create/delete permissions and hard-coded `us-east-1` resource ARNs while the COR target is `eu-west-3`. This must be remediated by separating runner bootstrap permissions from execution permissions and rendering regional resources from the validated target configuration. Do not replace the region-specific ARNs with wildcards as a shortcut.

### Required runner delegation statement

The bundled AWS runner policy template must contain this statement, with the target ARN rendered from validated account/partition/path configuration rather than hard-coded in production templates:

```json
{
  "Sid": "AssumeCORExecutionRoleWithTransactionTag",
  "Effect": "Allow",
  "Action": [
    "sts:AssumeRole",
    "sts:TagSession"
  ],
  "Resource": "arn:aws:iam::971671216490:role/UgonduCORExecutionRole"
}
```

This statement is necessary but not sufficient. The execution role trust policy must trust the exact runner role and enforce the required non-empty `UgonduTransactionId` request tag while allowing only the approved tag keys, including `UgonduCOR` when the workflow sends it. The live workflow must prove the assumption; static JSON inspection alone is not proof.

### Bootstrap permission envelope

The AWS bootstrap pack must include a separately versioned, reviewable inline policy for the initial bootstrap principal. Its authority should be limited to the exact installation profile and target account. It must provide the actions required to inspect policy/role state, create or update only the managed policy family Ugondu owns, attach only approved pack policies to the canonical execution role, and verify results. Any AWS action that cannot be safely restricted by resource ARN must be explicitly documented, condition-scoped where supported, and covered by a negative isolation test.

Do not silently assume that `iam:CreatePolicy`, trust-policy mutation, role creation, or permissions-boundary modification can all be restricted to a single role ARN. Validate AWS IAM resource-level support and condition keys per action. Keep trust changes and privilege-boundary changes in a higher-risk approval class. The bootstrap principal must not be able to grant itself arbitrary administrator access, remove guardrails, or attach arbitrary policies.

The exact JSON policy is generated from the provider adapter and selected installation profile, schema-validated, rendered for the selected account/region, diffed against the prior version, and packaged with its digest. Do not use the 400-line Visual Editor policy as the bootstrap policy: it mixes runner delegation, workload provisioning and cleanup, uses inconsistent regions, and is too broad for the bootstrap boundary.

## 5. Provider-neutral architecture

Policy provisioning is not an AWS-only feature. Implement a provider-neutral policy governance core and a provider adapter per platform. Initial adapter candidates include AWS IAM, Google Cloud IAM, Azure RBAC/managed identities, Kubernetes RBAC, supported CI/CD and source-control permission systems, and hosting platforms that expose custom policy/permission APIs. Each adapter must declare actual capabilities rather than pretending all platforms support the same permission model.

Core interfaces:

```ts
type CapabilityState = "SUPPORTED" | "UNSUPPORTED" | "CONDITIONAL" | "UNKNOWN";

interface PolicyPermissionAdapter {
  providerId: string;
  discoverTarget(input: TargetSelector): Promise<DiscoveredTarget>;
  inspectPrincipal(target: DiscoveredTarget): Promise<PrincipalSnapshot>;
  inspectPolicy(target: DiscoveredTarget, logicalId: string): Promise<PolicySnapshot>;
  renderPolicy(pack: PolicyPack, target: DiscoveredTarget): Promise<RenderedPolicyPack>;
  validatePolicy(policy: RenderedPolicy): Promise<ValidationReport>;
  planReconciliation(state: ProviderSnapshot, pack: RenderedPolicyPack): Promise<ReconcilePlan>;
  applyApprovedPlan(plan: ReconcilePlan, context: ExecutionContext): Promise<ApplyResult>;
  verifyReconciliation(plan: ReconcilePlan): Promise<VerificationReport>;
  capabilities(): Promise<CapabilityManifest>;
}
```

Provider adapters preserve native policy documents and semantics. A normalized descriptor is for inventory, planning and evidence; it must not flatten away native conditions, inheritance, deny rules, resource hierarchy, boundary policies, organization constraints, or role-assignment scope.

If a provider cannot express a required guardrail, the adapter must report the gap and either provide a tested compensating control or block the unsafe operation. `UNKNOWN` must never be treated as `SUPPORTED`.

## 6. Policy pack contents and bundle integrity

Ship the bootstrap implementation and its policy assets in the same versioned release artifact. At minimum, the bundle includes:

- provider capability manifest and adapter version compatibility;
- canonical names/IDs and ownership/adoption rules;
- bootstrap policy templates and provider-specific workload policy packs;
- schema definitions and policy renderer;
- deterministic policy validator and static analysis rules;
- dry-run planner and apply/reconcile engine;
- trust/identity checks and preflight permission probe catalog;
- idempotent attachment and policy-version migration logic;
- durable execution ledger and recovery handlers;
- redacted audit/evidence format and retention configuration;
- provider contract tests, fixture policies, positive tests, and negative isolation tests;
- CLI and UI entry points that call the same core API;
- migration notes and a machine-readable bundle manifest with hashes/signatures.

A release is invalid if a referenced policy file, template, schema, migration, or adapter required by its manifest is absent, hash-mismatched, or incompatible. The bundle must not depend on an undocumented local file or a human remembering a previous console edit.

## 7. Reconciliation algorithm

For each run:

1. Resolve provider, account/project/subscription, target region(s), principal and installation profile from explicit configuration or discovered identity.
2. Verify the active caller and tenant boundary. Refuse cross-account/project mutations unless explicitly selected and authorized.
3. Load the signed bundle and validate all digests, schemas, adapter compatibility and policy-size limits.
4. Discover existing roles, policy objects, attachments, trust, boundaries, deny rules, external consumers and ownership evidence.
5. Classify each object as `UGONDU_OWNED`, `UGONDU_ADOPTED`, `EXTERNAL`, `FOREIGN_OR_AMBIGUOUS`, or `UNKNOWN`.
6. Render policies for the target's validated region/project and provider-specific resource scopes.
7. Generate a deterministic plan. Deduplicate by stable provider identity and canonical logical ID, not by display name alone.
8. Run preflight authorization probes and evaluate every planned action against the bootstrap grant. If a required operation is not authorized, fail before applying any avoidable partial change and emit a remediation packet.
9. Apply additive, reversible, pre-authorized changes in dependency order. Each operation has an idempotency key and before/after evidence.
10. Re-read the provider. Verify policy digest, attachment target, trust conditions, effective capability where supported, and negative isolation boundaries.
11. Mark a checkpoint verified only after provider state matches expected state. Continue deployment only after all mandatory prerequisites pass.
12. On interruption, re-inspect actual provider state and classify each operation as `NOT_APPLIED`, `APPLIED_AND_MATCHES`, `APPLIED_BUT_DRIFTED`, `FOREIGN_OR_AMBIGUOUS`, `UNKNOWN`, `ACCESS_DENIED`, or `PROVIDER_UNAVAILABLE`. Resume only from verified facts.

Never infer a missing role or policy from `AccessDenied`, a timeout, malformed output, or provider outage. Never delete a role/policy solely because it has an Ugondu-looking tag. Unknown ownership, external consumers, ambiguous identity, or failed verification block destructive actions.

## 8. One-command UX

Target CLI contract (exact command names may be adapted to the existing CLI conventions, but do not implement a second engine):

```text
ugondu bootstrap --target <configured-target>
ugondu deploy --target <configured-target>
```

For a new target, `bootstrap` performs discovery, preflight, policy reconciliation, verification and durable checkpointing. `deploy` invokes bootstrap automatically if prerequisites are absent, then continues deployment. A `--plan` mode shows a no-mutation plan. A `--resume` mode resumes from the ledger and reconciles actual state first. Non-interactive CI must fail closed if required target choices or high-risk approvals are missing.

The UI exposes the same operation as **Bootstrap and deploy**, with progress grouped by meaningful stages, not a page-per-policy wizard. CLI, UI, IDE, API and AI tool calls must call the same orchestration API and share the same state machine and evidence ledger.

## 9. AI edition policy

The deterministic bootstrap, policy validation, safe reconciliation, audit, interruption recovery, CLI and UI parity are baseline platform capabilities and must not be paywalled behind AI. Higher tiers may add natural-language goal interpretation, diagnostic summaries, plan explanations, and supervised recommendations. AI cannot bypass policy validation, alter the authorization envelope, approve its own high-risk action, suppress a failed verification, or convert an unknown provider capability into an allowed action.

## 10. Required tests and release gates

### AWS COR
- Delegation statement is present in the bundled runner policy with the canonical execution role target.
- Trust policy allows exactly the intended principal and required session tag keys.
- Runner policy does not include broad workload create/delete actions unless a separately reviewed bootstrap capability requires a narrowly scoped exception.
- Five V9 policies are generated/imported and attached to `UgonduCORExecutionRole` automatically when authorized; no manual attachment step appears in normal flow.
- Resource ARNs are generated for `eu-west-3` (or selected validated region); no accidental `us-east-1` leakage.
- A second run is idempotent and creates no duplicate roles or policies.
- `AccessDenied` during inspection yields `INCONCLUSIVE`, not false missing-resource conclusions.
- Explicit deny, permission boundary, organization policy, quota, unsupported action, and trust mismatch produce actionable fail-closed results.
- Negative tests prove the runner cannot attach arbitrary policies, assume unrelated roles, modify unrelated workloads, remove ownership tags, or cross account boundaries.
- Live OIDC workflow verifies assumed role and tags, then runs read-only conformance probes, then mutation tests only in the approved test environment.

### Cross-provider
- Adapter contract tests cover capability negotiation, rendering, dry-run plans, apply, verification, denial and recovery.
- Provider-native deny/inheritance/boundary semantics survive normalization.
- Unsupported capability is reported accurately and blocks unsafe execution.
- Crash injection after every mutating operation proves safe resume.
- CLI and UI runs produce equivalent plans and state transitions.
- The same tests run with AI disabled and enabled; deterministic safety outcomes must match.

### Release blocking conditions
Do not release if any required policy asset is absent, a hash/signature is invalid, a policy is overbroad, a region is hard-coded contrary to target configuration, a bootstrap action lacks a tested permission, an attachment cannot be verified, the engine can duplicate an existing role, or recovery treats unknown state as success.

## 11. Implementation sequence

1. **Bundle and source-of-truth:** make policy pack manifest, role/policy naming registry, bootstrap templates, renderer, and digests part of the versioned release.
2. **AWS COR stabilization:** separate runner from execution permissions; correct region rendering; implement autonomous five-policy create/update/attach/verify; add idempotency and authorization preflight.
3. **Durable continuity:** integrate every policy operation into the shared execution ledger and recovery state machine.
4. **Shared interfaces:** route CLI/UI/IDE/CI/AI actions through the same engine.
5. **Provider-neutral contracts:** implement capability negotiation and adapter contract tests before adding GCP, Azure, Kubernetes or other platforms.
6. **Release hardening:** run positive/negative, crash-recovery, cross-account and least-privilege tests; publish a signed bundle manifest and beginner quick-start.

## 12. Acceptance statement

A beginner should perform one authorized provider setup and then start Ugondu with one command or one click. Ugondu should create or reconcile all required Ugondu-owned policies, attach them to the correct target, verify access, and continue the deployment without routine manual IAM/policy operations. The same deterministic behavior must work with AI absent. When the provider or bootstrap grant prevents a safe action, Ugondu must stop with an exact diagnosis and a minimal remediation, never claim autonomy where the required authority is absent.
