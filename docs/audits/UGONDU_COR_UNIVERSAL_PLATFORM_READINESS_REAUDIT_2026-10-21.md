# Ugondu COR Universal Platform Readiness Re-Audit & Remediation

- **Product:** Ugondu Universal Delivery Operating System
- **Audit date:** 2026-10-21
- **Audited ref:** `phase4/production-hardening`
- **Audit scope:** COR/release governance, autonomous bootstrap and policy reconciliation, AWS physical qualification, provider-neutral policy governance, cross-OS/host/IDE/CLI/UI/CI execution, localization, continuity/resume, and regression boundaries
- **Classification:** Enterprise engineering audit
- **Disposition:** **NOT CERTIFIED FOR UNIVERSAL PRODUCTION RELEASE**
- **Evidence confidence:** Repository source inspection plus GitHub Actions run `39632147169`; not a complete live audit of every provider or host
- **Sign-off:** Pending remediation and independent re-qualification. This document is an audit disposition, not a claim of external certification or a cryptographic signature.

## 1. Colour-coded executive status

Legend: 🟢 verified passing evidence for the stated boundary · 🟡 partial/limited evidence or remediation required · 🔴 failed mandatory gate / unsafe gap · ⚪ not verified in this audit · 🔒 protected certified boundary; mutation requires an explicit approved modification-zone declaration.

| Domain / boundary | Status | Evidence and decision |
|---|---|---|
| COR repository qualification on audited candidate | 🟢 | Run `39632147169`: COR Certification job `119332941751` succeeded. This is limited to the checks actually executed by that workflow. |
| Authoritative final release gate | 🔴 | Run `39632147169`: COR Final Release Gate `119334272726` failed because AWS Physical Qualification failed. No overall release certification. |
| AWS OIDC runner → tagged execution-role assumption | 🟢 | Run `39632147169` completed “Configure Base OIDC Credentials” and “Assume Tagged Execution Session”; effective identity was verified by the workflow. |
| AWS V9 policy bootstrap step | 🟢/🟡 | Workflow step “Reconcile AWS COR V9 Policy Pack (Bootstrap Provision)” succeeded; effective-permission verification and read-only probes passed. This does not prove all clean-account, denied-permission, policy-drift, or quota paths. |
| AWS physical EC2/VPC lifecycle | 🟢 for tested actions | The physical run created VPC, subnets, security group, EC2 instance and EBS snapshot before failing later. Do not infer broad AWS service coverage from this sequence. |
| AWS RDS prerequisite / service-linked role | 🔴 | Physical certification failed at RDS DB subnet group creation with “Missing necessary credentials” / RDS service-linked-role prerequisite error. Bootstrap catches service-linked-role creation exceptions and continues, so a failed prerequisite can be hidden until later. |
| Rollback / residual cleanup | 🟢 for this failed transaction | Run log reports dependency-aware rollback and “Residual Scan: Clean!”. Must retain as a protected boundary and test on additional failure points. |
| Autonomous provisioning under denied IAM authority | 🔴 | Current script can record bootstrap denial and return exit code 0 from the bootstrap phase, then rely on a later verification failure. It does not consistently stop with a precise blocked state at the first denied mutation. |
| AWS policy pack portability / target configuration | 🔴 | `pack.yaml` pins account `971671216490` and region `eu-west-3`; loader rejects a target that differs. This is incompatible with import-time target selection unless a verified rendering/build step generates a target-specific manifest. |
| AWS policy region renderer | 🔴 | `RegionPolicyRenderer.ts` has a hardcoded default region list and a hardcoded fallback `eu-west-3`; it rejects every `Resource: "*"`, although some provider APIs require wildcard resource scope for read/list operations. It only substitutes tokens in `Resource`, not all policy fields. |
| Provider-neutral architecture | 🟡 | An orchestrator abstraction exists, but inspected implementation is strongly AWS/IAM-shaped. No evidence here establishes working GCP, Azure, Kubernetes, VPS, DirectAdmin, cPanel, shared-host, private-host or generic SSH adapter conformance. |
| Cross-OS / CLI / UI / IDE / headless parity | 🟡 | The orchestrator declares entrypoint types (CLI/UI/IDE/CI/workflow), but a type union is not proof that each entrypoint invokes the same tested execution path. Provider-specific shell commands and AWS CLI dependencies still need contract tests across supported environments. |
| Execution continuity / durable recovery | 🟡 | Ledger and resume planner modules exist. Verify storage durability, atomic writes, concurrent workers, crash recovery, replay protection, and persisted approvals before claiming resumability across process or machine loss. |
| Duplicate role prevention | 🟡 | Guard detects exact/normalized names when the discovery list is trustworthy. A failed or incomplete discovery must never be treated as an empty list; provider-native identity/path/scope and concurrent-create races need tests. |
| Policy digest correctness | 🔴 | `computePolicyDigest` uses `JSON.stringify(parsed, Object.keys(parsed).sort())`; the replacer array applies to nested objects too and can omit nested keys, making the digest unsuitable as a canonical recursive digest. Replace with a tested recursive canonical JSON implementation. |
| Localization / locale parity | 🟢/🟡 | The audited run's COR localization checks passed. Runtime errors, bootstrap diagnostics, plugin capability messages and provider-specific remediation still need parity checks for every supported locale. |
| cPanel / DirectAdmin / shared hosting / private host | ⚪ | No runtime adapter evidence was established in this audit. Treat as uncertified, not supported, until isolated contract and end-to-end tests pass. |
| Windows PowerShell / macOS / Linux CLI | ⚪/🟡 | The user has exercised PowerShell manually, while the inspected COR workflow uses Bash/Linux and AWS CLI. This is not proof of consistent cross-shell behavior. |
| AI-optional autonomous operation | 🟡 | Core orchestration code can run without an AI model, but parity is not yet proven end-to-end. AI must remain a planner/UX option, never a required authorization or execution dependency. |

## 2. Audit basis and limitations

### Directly inspected

- `server/capabilities/src/continuity/BootstrapPolicyOrchestrator.ts`
- `server/capabilities/src/continuity/RegionPolicyRenderer.ts`
- `server/capabilities/src/continuity/CanonicalPolicyRegistry.ts`
- `server/capabilities/src/continuity/DuplicateRoleGuard.ts`
- `server/capabilities/src/continuity/ResumePlanner.ts`
- `scripts/aws-conformance/reconcile-bootstrap-policy-pack.mjs`
- `policy-packs/aws/cor/pack.yaml`
- `policy-packs/aws/cor/bootstrap/runner-bootstrap-permissions.json`
- `policy-packs/aws/cor/templates/roles/execution-role-trust.json`
- `.github/workflows/cor.yml`
- Root `package.json`
- GitHub Actions run `39632147169`, jobs `119332941489`, `119332941751`, and `119334272726`

### Not established

This audit does **not** claim a complete line-by-line review of every file, every plugin, every OS, or every provider. It does not independently inspect the live AWS account beyond the evidence emitted by the workflow, nor certify the current live state after the run. The paths in the findings are repository paths on the audited ref. Any unsupported platform remains ⚪ until an adapter and its tests are present and executed.

## 3. Release-blocking findings

### COR-001 — Service-linked role failure is not fail-closed early enough

**Severity:** Critical · **Status:** 🔴 Open  
**Evidence:** `scripts/aws-conformance/reconcile-bootstrap-policy-pack.mjs`, bootstrap phase; run `39632147169` physical job log.

The script attempts:

```js
try {
  const slrRes = aws(
    ['iam', 'create-service-linked-role', '--aws-service-name', 'rds.amazonaws.com'],
    region
  );
  if (slrRes.status === 0) {
    console.log('[BOOTSTRAP-PROVISION] Autonomously created AWSServiceRoleForRDS service-linked role.');
  }
} catch {
  // Non-fatal if already exists or caller lacks SLR authority
}
```

The catch treats every thrown error identically, and a non-zero result is silently ignored. “Already exists”, “access denied”, “provider unavailable”, and malformed credentials are materially different states. The physical test then fails at RDS subnet-group creation.

**Required remediation**
1. Query for the service-linked role first using a supported read API.
2. If present, verify its service principal and canonical identity, then record `NO_OP`.
3. If absent, attempt creation only if the current authorization mode explicitly grants that capability.
4. On `EntityAlreadyExists`, re-read and verify; do not assume success without verification.
5. On access denied, missing credentials, SCP/permission-boundary denial, or unknown error, emit a typed blocker and stop before dependent RDS actions.
6. Record the error class, provider request ID, transaction ID, and safe remediation without exposing credentials.
7. Add tests for present, absent-and-created, race-created, access denied, permission boundary, service control policy, timeout, and unknown provider response.

### COR-002 — Bootstrap can misreport a denied mutation as a successful bootstrap phase

**Severity:** Critical · **Status:** 🔴 Open  
**Evidence:** `reconcile-bootstrap-policy-pack.mjs` sets `bootstrapProvisioningDenied`, writes a preliminary report, then returns `{ exitCode: 0, report }`; effective verification is expected to catch the failure later.

This defers the failure, weakens diagnosis, and can allow unrelated steps to run between the denied mutation and later verification. It contradicts the desired behavior: provision automatically where authorized; otherwise stop at the exact missing capability and explain the one-time authorization needed.

**Required remediation**
- Use a typed result such as `PROVISIONED`, `ALREADY_CONVERGED`, `DRIFT_RECONCILED`, `BLOCKED_AUTHORIZATION`, `BLOCKED_PROVIDER_UNAVAILABLE`, `BLOCKED_POLICY_INVALID`, or `UNKNOWN_OUTCOME`.
- Bootstrap may exit successfully only if the required policy pack is verified attached and its digest matches, or if the target is already converged.
- Do not treat a successful process exit as a successful reconciliation unless the machine-readable result says so.
- Do not continue to workload mutations after a required bootstrap operation returns access denied.
- Retry only transient, classified errors with bounded backoff; never retry authorization denial indefinitely.

### COR-003 — Policy provisioning logic is not a complete ownership-safe reconciler

**Severity:** Critical · **Status:** 🔴 Open  
**Evidence:** `reconcile-bootstrap-policy-pack.mjs` loops over the five policies; the current create/update/attach flow has incomplete handling of non-AccessDenied failures and can attempt to attach before proving that a missing policy has been created. The attached-policy listing can fail without a consistent hard stop; the script later infers state from partial observations.

**Required remediation**
- Separate discovery, desired-state planning, authorization preflight, mutation, and post-mutation verification into explicit phases.
- A provider read failure must be `UNKNOWN`, never “resource absent”.
- Only adopt a pre-existing policy after verifying identity, ownership metadata, document digest, scope, and consumer set.
- Before replacing a policy version, verify ownership and all consumers; do not prune an old non-default version until the replacement is validated and rollback is possible.
- After every create/update/attach, re-read and verify the actual object.
- Use provider idempotency tokens where available; otherwise use transaction-scoped deterministic names and reconciliation reads.
- The same canonical pack must not be attached to the runner role.
- If the desired pack is already attached and valid, produce `NO_OP` with evidence and no write calls.

### COR-004 — Region/account/name values are pinned rather than rendered from validated target configuration

**Severity:** Critical · **Status:** 🔴 Open  
**Evidence:** `policy-packs/aws/cor/pack.yaml` pins account and region; loader requires exact equality with `resolveAwsTarget()`. The starter bootstrap JSON includes a fixed account ID in ARNs. `RegionPolicyRenderer.ts` defaults to `eu-west-3` and includes hardcoded regions.

**Required remediation**
- Keep a signed, provider-neutral source template with typed placeholders; keep target identity in a separate explicit deployment input.
- Validate target account/project/subscription/tenant, region/zone, resource namespace, and canonical role names before rendering.
- Render all supported ARN/resource fields and policy conditions, not just `Resource`.
- Produce a rendered artifact with source digest, renderer version, target identity, allowed regions, timestamp, and signature/evidence.
- Reject unresolved placeholders, unexpected account IDs, disallowed regions, resource wildcard expansion beyond an explicit provider capability rule, and cross-target resource references.
- Never “fix” portability by broadening every resource to `*`.
- Default target region must come from explicit user/provider configuration or a provider-native discovery result; no hidden fallback region.

### COR-005 — Wildcard-resource validation blocks legitimate provider policies

**Severity:** High · **Status:** 🔴 Open  
**Evidence:** `RegionPolicyRenderer.ts` marks every resource equal to `*` as invalid. Several AWS read/list/describe operations legitimately require `Resource: "*"` in IAM. Blanket rejection is not a valid least-privilege policy validator.

**Required remediation**
- Add provider action metadata: whether resource-level permissions are supported, which ARN types are valid, supported condition keys, and required global scope.
- Permit wildcard only when the provider's action catalogue requires/allows it and the statement is otherwise constrained appropriately.
- For AWS, test every action in the V9 pack against the official service authorization reference and IAM Access Analyzer/Policy Simulator where available.
- Reject unbounded wildcards for mutating actions unless an explicit reviewed exception exists.
- Make the validator report action/resource compatibility, not just string pattern matching.

### COR-006 — Policy digest canonicalization is not recursively canonical

**Severity:** High · **Status:** 🔴 Open  
**Evidence:** `CanonicalPolicyRegistry.ts`:

```ts
const normalized = JSON.stringify(parsed, Object.keys(parsed).sort());
```

A JSON replacer array is not a recursive object-key sorter; nested keys not present in the top-level allow-list can be omitted. This can cause false digest mismatches or weaken integrity comparison.

**Required remediation**
Use a recursive canonical JSON implementation with deterministic object-key ordering, array order preservation, strict JSON value validation, and published test vectors. Keep raw-file SHA-256 verification distinct from semantic canonical-document hashing.

```ts
type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export function canonicalJson(value: JsonValue): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  const object = value as Record<string, JsonValue>;
  return '{' + Object.keys(object).sort().map(
    (key) => JSON.stringify(key) + ':' + canonicalJson(object[key])
  ).join(',') + '}';
}
```

Production code must reject non-finite numbers and non-JSON values before canonicalization. Add nested-object regression vectors and verify that changing any nested permission changes the digest.

### COR-007 — Service-linked-role policy scope and authorization path need provider validation

**Severity:** High · **Status:** 🔴 Open  
**Evidence:** `runner-bootstrap-permissions.json` scopes `iam:CreateServiceLinkedRole` and `iam:GetRole` to a service-linked-role ARN. The workflow evidence shows that the runtime still could not satisfy the RDS prerequisite. The actual denial details need to be preserved to determine whether the cause is resource scoping, missing credentials, trust/role configuration, an account-level prerequisite, or an SDK path.

**Required remediation**
- Verify the exact AWS IAM authorization semantics for `iam:CreateServiceLinkedRole` and supported resource/condition keys. Use the provider-required resource scope and constrain with `iam:AWSServiceName` where supported.
- Separate “the role exists”, “the runner can create it”, and “the workload operation is using credentials that can see it”.
- Never swallow a service-linked-role error.
- Add a live-account test that confirms the expected role ARN and service principal before running RDS lifecycle tests.

### COR-008 — Orchestrator is not yet proof of universal provider support

**Severity:** High · **Status:** 🔴 Open for universal claim  
**Evidence:** `BootstrapPolicyOrchestrator.ts` uses AWS concepts such as region scope, AWS policy ARNs, runner/execution roles, STS tags and AWS resource-name patterns. Its entrypoint union lists CLI/UI/IDE/headless CI, but a type declaration alone does not prove those clients call the same reconciler. The only live provider gate evidenced here is AWS.

**Required remediation**
- Define a provider-neutral domain model and capability contract; keep native policy JSON/YAML and provider-specific API semantics inside adapters.
- Each adapter must declare supported, unsupported, conditional, and unknown capabilities, API version, scope model, policy-size/attachment quotas, identity model, ownership metadata, dry-run support, effective-permission evaluation support, and rollback limitations.
- Do not advertise an adapter as supported until it passes adapter contract tests and a provider-specific qualification suite.
- Add separate qualification profiles for AWS, GCP, Azure, Kubernetes/RBAC, SSH-managed VPS, cPanel, DirectAdmin, and shared hosting. Do not imply that shared hosts support arbitrary IAM-like policy management; model their actual API/ACL/SSH capabilities.
- Where a platform has no policy API, use the narrowest available deployment mechanism and explicitly declare the lower assurance level. If the requested task cannot be safely performed, stop with a clear limitation instead of pretending full parity.

### COR-009 — Execution continuity and resume evidence must survive process loss

**Severity:** High · **Status:** 🟡 Open pending proof  
**Evidence:** `ExecutionContinuityLedger.ts` and `ResumePlanner.ts` exist. The inspected resume planner can create a plan from reconciliation deltas and blocks destructive deletion without an approval token, but the existence of these classes does not prove durable persistence or distributed locking.

**Required remediation**
- Persist transaction state atomically to a pluggable durable store; define file-store, SQLite, hosted database and CI-artifact backends where appropriate.
- Use append-only events with sequence number, previous-event hash, transaction ID, actor/entrypoint, desired-state digest, provider request ID, resource identity, outcome and redacted error details.
- Add a lease/lock or compare-and-swap to prevent concurrent actors from applying the same transaction twice.
- After restart, re-probe provider state before replaying any mutation; never infer “not applied” only from missing local completion events.
- Use idempotency keys where supported. Unknown outcomes require reconciliation, not blind replay.
- Destructive actions require explicit scoped approval bound to a plan digest, target, expiry, and actor; a length-only token is not sufficient approval verification.

### COR-010 — Duplicate role detection requires authoritative discovery and race-safe creation

**Severity:** High · **Status:** 🟡 Open pending tests  
**Evidence:** `DuplicateRoleGuard.ts` normalizes hyphens, underscores, periods and case, and blocks if preflight fails. This is useful but insufficient across providers and concurrent bootstraps.

**Required remediation**
- Distinguish exact canonical match, semantically equivalent role, near-duplicate, name collision, permission denied, incomplete pagination, and provider error.
- Discover all pages and relevant paths/namespaces/projects/tenants. Do not treat an incomplete page or AccessDenied as an empty list.
- Use provider-native conditional create, idempotency, or a distributed lock when available.
- If a canonical role already exists, inspect and reconcile it in place; do not create a suffix role to “get past” a conflict.
- Do not adopt or mutate unknown ownership. Report a single actionable blocker and preserve evidence.

### COR-011 — Runner bootstrap policy and workload policy boundaries require semantic tests

**Severity:** High · **Status:** 🟡  
**Evidence:** `runner-bootstrap-permissions.json` separates the runner from workload policies and scopes attach operations to the canonical execution role and V9 names. That is the right design direction, but effective policy behavior must be tested against actual IAM semantics and permission boundaries/SCPs.

**Required remediation**
- Keep bootstrap permissions limited to the canonical managed policy set, canonical execution role, necessary policy-version lifecycle, and explicitly required prerequisite roles.
- Add deny/negative tests proving runner cannot directly create/delete workload infrastructure, attach arbitrary policies, change its own trust, modify its own bootstrap policy, or attach V9 workload policies to itself.
- Verify permission boundaries, session policies, SCPs, trust policies, and resource policies are included in diagnostics; identity policy presence alone does not prove effective permission.
- Ensure bootstrap policy self-modification is not permitted by default. If a bootstrap policy update is necessary, require a signed version, preflight diff, immutable recovery copy, and explicit security boundary.
- Use short-lived federation; never ask users to paste long-lived cloud access keys into Ugondu.

### COR-012 — Multi-entrypoint parity and cross-platform packaging are not certified

**Severity:** High · **Status:** 🟡  
**Evidence:** root `package.json` requires Node >=20 and npm >=10; COR workflow uses Bash and Node 20, while user operations also include Windows PowerShell. Current evidence does not establish equivalent behavior on PowerShell, cmd, POSIX shells, IDE launchers, GUI, or offline operation.

**Required remediation**
- Put orchestration in a shared library and make UI/CLI/IDE/CI thin clients over the same typed request/result protocol.
- Use provider SDKs or platform-neutral process wrappers; avoid embedding shell-specific quoting in core logic.
- Provide native launchers for PowerShell, POSIX shells, GUI, IDE command palette, and CI. All must produce the same transaction ID, plan digest, evidence format and error codes.
- Test Windows, macOS and Linux on supported CPU architectures; pin supported runtime versions and test both minimum and current supported versions.
- For networkless operation, support plan validation and resume diagnostics from cached evidence, but clearly block provider mutations that require unreachable APIs.
- Model-assisted and non-model-assisted users must have equal execution capabilities. AI may explain, draft a plan or assist with intent; deterministic policy checks and execution remain in the core.

### COR-013 — Shared hosting and traditional hosting are not proven

**Severity:** High · **Status:** ⚪ Unverified  
**Required adapter families**
- VPS and dedicated servers: SSH, cloud-init, package/service managers, firewall APIs, systemd/OpenRC, rollback snapshots where supported.
- cPanel and DirectAdmin: supported panel APIs, account scope, deployment and DNS/SSL features actually exposed by the host.
- Shared hosting: file/FTP/SFTP deployment, supported PHP/runtime settings, database provisioning only where provider APIs permit, no assumed root access.
- Private/on-prem hosts: SSH/API adapters, proxy/jump host, private CA, offline or restricted egress.
- Containers/orchestrators: Docker/Podman, Kubernetes RBAC and admission controls, Helm, registries, cluster namespaces.
- CI/CD and IDE: GitHub Actions and other supported CI systems, local IDEs and headless agents.
- Each adapter must report capability gaps and safe fallbacks; never claim root, IAM, service creation or policy attachment where the host does not expose it.

### COR-014 — Localization checks need to cover remediation and adapter diagnostics

**Severity:** Medium · **Status:** 🟡  
**Evidence:** COR localization gates passed in run `39632147169`, but runtime diagnostic strings in the bootstrap scripts include hardcoded English messages.

**Required remediation**
- Move user-facing messages, warnings, prompts, capability descriptions, errors and recovery instructions into locale catalogs.
- Preserve stable machine-readable error codes independent of language.
- Validate placeholder parity, plural rules, fallback behavior and no missing keys across every supported locale.
- Keep logs structured and language-neutral where possible; localize presentation in CLI/UI, not the event ledger's canonical fields.

## 4. Normative provider-neutral contract

This is a target interface for remediation, not a claim that every adapter already implements it.

```ts
export type CapabilityStatus = 'SUPPORTED' | 'UNSUPPORTED' | 'CONDITIONAL' | 'UNKNOWN';

export interface ProviderCapability {
  id: string;
  status: CapabilityStatus;
  reasonCode?: string;
  requiredPrerequisites?: string[];
  compensatingControl?: string;
}

export interface ProviderIdentity {
  providerId: string;
  tenantOrAccountId: string;
  projectOrSubscriptionId?: string;
  regionOrLocation?: string;
  namespace?: string;
  principalId: string;
}

export type ReconcileOutcome =
  | 'NOT_APPLIED'
  | 'APPLIED_AND_MATCHES'
  | 'APPLIED_BUT_DRIFTED'
  | 'FOREIGN_OR_AMBIGUOUS'
  | 'UNKNOWN'
  | 'ACCESS_DENIED'
  | 'PROVIDER_UNAVAILABLE';

export interface PolicyPermissionAdapter {
  readonly providerId: string;
  discoverIdentity(): Promise<ProviderIdentity>;
  negotiateCapabilities(): Promise<ProviderCapability[]>;
  inspectPolicy(policyId: string): Promise<unknown>;
  planPolicyReconciliation(input: unknown): Promise<unknown>;
  applyPolicyReconciliation(plan: unknown): Promise<unknown>;
  verifyPolicyReconciliation(plan: unknown): Promise<ReconcileOutcome>;
  inspectAttachments(targetId: string): Promise<unknown>;
  attachPolicy?(targetId: string, policyId: string): Promise<void>;
  rollback?(evidence: unknown): Promise<unknown>;
}
```

Rules:
1. Unsupported capability is a first-class result, not a thrown generic error.
2. Unknown capability never authorizes a write.
3. Every adapter operation must be bounded by an explicit tenant/account/project/host/namespace target.
4. Native policy artifacts are preserved; normalized representations must not erase provider-specific semantics.
5. All write operations require plan digest, actor identity, transaction ID and durable event record.
6. An adapter may be marked `CERTIFIED` only after all mandatory contract tests and provider qualification gates pass for the recorded adapter version.

## 5. Autonomous bootstrap: intended user journey

The desired beginner experience is one authorization handover followed by a single command or UI action. It must not imply that software can bypass provider authorization.

### One-time authorization boundary

The user creates or authorizes the **canonical bootstrap identity** and installs the bundled starter policy through the provider's supported mechanism. This is the only manual step when the platform cannot safely delegate its own initial authority. The starter policy must be generated from the selected provider, account/tenant, and capabilities—not copied with another customer's account ID.

### Ugondu-controlled continuation

```text
ugondu bootstrap --provider <provider> --target <named-target> --mode autonomous
```

1. Discover current identity and target scope.
2. Verify bootstrap authority and provider reachability.
3. Load signed policy pack and validate source digest.
4. Render target-specific policies; validate quotas and resource/action compatibility.
5. Discover existing roles, policies, attachments, service prerequisites and ownership.
6. Produce a no-write plan and automatically apply only within the authorized scope.
7. Re-read and verify each mutation.
8. Run negative isolation tests and required read-only probes.
9. Persist signed/hashed evidence and checkpoint.
10. Continue deployment only if required capabilities are verified; otherwise stop with one concise, localized blocker and a minimal exact remediation.

### Safe denial behavior

If the starter policy lacks a required capability, Ugondu must not ask the beginner to guess which IAM checkbox to click. It should return:
- stable code, e.g. `UG-BOOTSTRAP-AUTH-MISSING`;
- the exact missing action and target resource;
- whether it is an identity-policy, trust-policy, permission-boundary, SCP, provider quota, or unavailable API issue (only when evidence supports that classification);
- the smallest provider-native one-time authorization patch, as a downloadable/copyable artifact;
- a command to resume after the administrator applies it;
- a durable checkpoint ID.

Do not label this “fully autonomous” if the provider does not allow the current identity to grant itself the missing authority. No system can safely self-grant permissions beyond its authorized principal.

## 6. Required remediation sequence

| Priority | Workstream | Required output | Exit gate |
|---|---|---|---|
| P0 | AWS SLR and fail-closed bootstrap | Typed prerequisite reconciliation; no swallowed errors; correct exit status | RDS prerequisite tests pass, denied path blocks immediately |
| P0 | Policy reconciliation correctness | Plan/apply/verify phases; correct create-before-attach flow; ownership verification | Clean install, drift, already-converged, quota, denial and race tests pass |
| P0 | Target configuration and renderer | Provider target inputs; no fixed account/region; action-aware wildcard rules | Two AWS accounts and two regions pass with no cross-target ARN |
| P0 | Digest/signature | Recursive canonicalization and signed pack provenance | Nested permission changes always change digest; tampering rejected |
| P0 | Security boundary | Runner/workload separation; no self-escalation; scoped policy attachment | Positive and negative IAM tests plus live Access Analyzer/Simulator evidence |
| P1 | Provider-neutral core | Capability negotiation and adapter contract | Fake-provider contract suite passes; unsupported capability blocks safely |
| P1 | AWS/GCP/Azure/Kubernetes adapters | Native policy and identity adapters | Separate adapter qualification report per provider/version |
| P1 | VPS/private host/panels/shared host | SSH/panel/host adapters and explicit capability profiles | Tests on disposable fixtures for each declared host profile |
| P1 | Durable continuity | Persistent ledger, leases, idempotency, restart reconciliation | Kill/restart and concurrent-run tests pass without duplicate resources |
| P1 | CLI/UI/IDE/CI parity | Thin clients sharing one execution protocol | Same fixture yields same plan digest and outcome across entrypoints |
| P1 | OS matrix | Windows PowerShell, macOS, Linux; runtime matrix | Build/test matrix green on each declared supported OS |
| P2 | Localization | Complete catalog coverage and locale diagnostics | Missing-key/placeholder/plural/fallback gates pass all supported locales |
| P2 | Certification registry | Per-feature/per-platform boundary registry and evidence links | Status changes only through recorded evidence and approved change zones |

## 7. Regression guardrails and certification walk-down

### Protected-zone rule

A certified boundary is immutable by default. A change must declare one or more `MODIFICATION_ZONE` entries and enumerate dependent certified zones. The CI system runs:
- targeted tests for the modified zone;
- contract tests for every dependent zone;
- full qualification only when a dependency graph proves the change can affect it or when the change is security-sensitive;
- no unnecessary revalidation of unrelated certified zones.

A zone must not be labelled certified merely because a prior run was green. Certification is tied to a commit SHA, adapter version, test suite version, environment profile, evidence digest and expiry/revalidation trigger.

```yaml
# Proposed registry schema example; replace with the repository's canonical schema.
apiVersion: ugondu.io/cor-boundary/v1
kind: CertificationBoundary
metadata:
  id: aws.oidc-tagged-role-chain
  owner: security
spec:
  status: CERTIFIED
  certifiedCommit: "<exact-commit-sha>"
  adapterVersion: "aws-iam/<exact-version>"
  evidence:
    workflowRun: "39632147169"
    artifactDigest: "<verified-evidence-digest>"
  protectedPaths:
    - ".github/workflows/cor.yml"
    - "policy-packs/aws/cor/templates/roles/execution-role-trust.json"
  mutationPolicy: REQUIRE_EXPLICIT_MODIFICATION_ZONE
  dependencies:
    - aws.bootstrap.policy-reconciliation
  invalidationTriggers:
    - "trust-policy-template-changed"
    - "OIDC-subject-conditions-changed"
    - "AWS-adapter-major-version-changed"
```

Do not invent evidence digests or certified commit IDs; CI must fill them from verified artifacts. A change to a protected path without a declared modification zone must fail governance validation. Security fixes are permitted only with explicit change declaration and the required dependent tests.

## 8. Qualification matrix — every platform/host must be explicit

Status is ⚪ until a supported adapter version and evidence artifact are recorded.

| Platform family | Required qualification | Current audit status |
|---|---|---|
| AWS IAM / EC2 / EBS / RDS / S3 / ECR / ECS | bootstrap, policy version lifecycle, role chain, service-linked roles, regional rendering, rollback, negative tests | 🔴 overall physical gate failed |
| Google Cloud IAM / projects / service accounts | project scope, IAM bindings, service-account impersonation, policy conditions, quotas, rollback | ⚪ |
| Microsoft Azure RBAC / subscriptions / resource groups | tenant/subscription scope, role assignments, managed identity, deny assignments, locks | ⚪ |
| Kubernetes RBAC / admission / namespaces | Role/ClusterRole bindings, namespace scope, impersonation prevention, dry-run, rollback | ⚪ |
| Other cloud providers | native identity/policy API and quota model | ⚪ |
| VPS / dedicated server | SSH identity, sudo scope, package/service changes, firewall, rollback and host-key verification | ⚪ |
| cPanel | supported API scopes, domains, files, databases, SSL/DNS where available | ⚪ |
| DirectAdmin | supported API scopes, domains, files, databases, SSL/DNS where available | ⚪ |
| Shared hosting | SFTP/FTP, document root, supported runtime, database/API limits, no-root safeguards | ⚪ |
| Private/on-prem host | private routing, proxy, private CA, offline/limited network, credentials broker | ⚪ |
| Docker / Podman | image provenance, runtime config, volume/network safety, rollback | ⚪ |
| GitHub Actions and other CI | OIDC/federation, scoped secrets, artifacts, cancellation/retry and concurrency | 🟡 GitHub Actions AWS path partially exercised |
| Windows / PowerShell | path quoting, exit codes, signals, secure credential lifecycle, resume | ⚪ |
| macOS / POSIX shell | paths, shell quoting, runtime compatibility, signal handling | ⚪ |
| Linux / Bash / headless | exit semantics, signals, idempotency, resume | 🟡 workflow tested on Ubuntu |
| IDEs and GUI | same plan digest and execution semantics as CLI; no privileged hidden UI-only behavior | ⚪ |
| Model-assisted UX | model cannot bypass guardrails; plan digest binds approval and action | ⚪ |
| Model-free UX | full deterministic core execution and clear prompts without inference API | 🟡 architecture direction present; parity unproven |

## 9. Test catalogue required before universal sign-off

### Bootstrap and policy tests
- Empty target with valid bootstrap authority.
- Returning target already converged: zero writes.
- Partial pack attached: only missing items repaired.
- Existing policy has same name but foreign digest/owner: block without overwrite.
- Policy absent: create, re-read, verify digest, then attach.
- Policy create denied, attach denied, policy version limit, quota exceeded, API timeout, invalid signature.
- Cross-account, cross-region, wrong project, wrong tenant, wrong namespace.
- Existing service-linked role, create race, access denied, malformed provider response.
- Permission boundary/SCP denies a call even when identity policy allows it.
- Runner attempts direct workload mutation or self-attachment: denied.
- Arbitrary managed policy attachment attempt: denied.
- A failed discovery never becomes “resource absent”.

### Continuity and recovery tests
- Kill process before mutation, during mutation, after mutation before event persistence, after event persistence before verification.
- Restart on a different machine with durable ledger.
- Two actors resume the same transaction concurrently.
- Reconcile unknown outcomes by reading provider state before replay.
- Tampered ledger, missing checkpoint, stale approval, changed plan digest.
- Destructive rollback with mixed owned/foreign resources; foreign resources preserved.
- Every created resource is tagged/annotated with transaction and ownership metadata where provider supports it.

### OS/entrypoint/locale tests
- Windows PowerShell, macOS, Linux shell, headless CI.
- CLI, GUI, IDE, scheduled automation, model-assisted and model-free flows.
- Equivalent fixture produces identical canonical plan digest and same machine-readable outcome.
- All supported locales: no missing keys, placeholder mismatch, untranslated user-facing errors, or locale-dependent machine behavior.

### Provider adapter tests
- Contract suite must run against a fake provider for deterministic failures and against disposable/sandbox provider targets for live qualification.
- Every capability is tested as supported, unsupported, conditional and unknown.
- Native policy semantics are checked with the provider's validation/simulation tools where available.
- Test quotas and pagination; partial results cannot certify success.
- Keep each provider's certification independent; AWS green cannot imply GCP or shared-host green.

## 10. Concrete file-level remediation map

| File / path | Required change | Zone |
|---|---|---|
| `scripts/aws-conformance/reconcile-bootstrap-policy-pack.mjs` | Fix fail-closed result semantics; correct create/update/attach ordering; explicit ownership; verify after each mutation; surface SLR errors; do not return success on denial | 🔴 Modification zone |
| `policy-packs/aws/cor/bootstrap/runner-bootstrap-permissions.json` | Generate from target template; validate supported action/resource/condition semantics; include only required bootstrap operations; test no self-escalation | 🔴 Modification zone |
| `policy-packs/aws/cor/pack.yaml` | Separate generic source manifest from rendered target; remove customer-specific target pin from reusable source; signed rendered manifest per target | 🔴 Modification zone |
| `policy-packs/aws/cor/templates/roles/execution-role-trust.json` | Parameterize account/runner identity safely; preserve required tag-key conditions; add regression tests before changes | 🔒 Protected unless explicitly declared |
| `server/capabilities/src/continuity/RegionPolicyRenderer.ts` | Remove hidden region defaults; render all provider-supported fields; action-aware wildcard validation; validate target identity and unresolved tokens | 🔴 Modification zone |
| `server/capabilities/src/continuity/CanonicalPolicyRegistry.ts` | Recursive canonical digest; externalized canonical definitions; provider-neutral identifiers and versioned registry | 🔴 Modification zone |
| `server/capabilities/src/continuity/DuplicateRoleGuard.ts` | Pagination, provider-native identity keys, race-safe create, ownership distinction | 🟡 Modification zone |
| `server/capabilities/src/continuity/ExecutionContinuityLedger.ts` | Durable adapter interface, atomic append, hash chain, concurrency lease, integrity checks | 🟡 Modification zone |
| `server/capabilities/src/continuity/ResumePlanner.ts` | Bind approvals to target/plan digest/expiry/actor; reconcile unknown outcomes before replay | 🟡 Modification zone |
| `server/capabilities/src/continuity/BootstrapPolicyOrchestrator.ts` | Provider-neutral contract; capability negotiation; typed outcomes; common entrypoint protocol | 🟡 Modification zone |
| `.github/workflows/cor.yml` | Keep mandatory gates fail-closed; add OS/adapter contract matrix; preserve exact-SHA evidence and final gate | 🔒 Protected; modify only with declared zone |
| `package.json` / workspace scripts | Pin and test runtime matrix; avoid unpinned transient test runners; expose bootstrap/check/resume commands | 🟡 Modification zone |
| Locale catalog(s) | Tokenize user-facing diagnostics and provider remediation | 🟡 Modification zone |
| Proposed `docs/cor/CERTIFICATION_BOUNDARIES.yaml` | Add evidence-bound protected-zone registry and dependency graph | New file |

## 11. Suggested deterministic command surface

The exact CLI names should be aligned with existing command conventions before implementation. The behavioral contract should be:

```bash
# Inspect current identity, capabilities, desired policy pack and plan; no writes.
ugondu bootstrap inspect --target <target-id>

# One-command autonomous bootstrap and continuation; deterministic core, no model required.
ugondu bootstrap run --target <target-id> --mode autonomous

# Resume the saved transaction after an interruption or after an administrator grants
# the precise missing bootstrap permission.
ugondu resume --transaction <transaction-id>

# Explain the exact blocker without changing state.
ugondu doctor --transaction <transaction-id> --format human
ugondu doctor --transaction <transaction-id> --format json
```

Equivalent UI actions must call the same core APIs. The UI must not contain a separate policy mutation implementation. AI-enabled editions may provide natural-language intent, contextual explanations and assisted planning, but the same deterministic plan validation and execution APIs must run underneath. Core autonomous provisioning and resume must not be paywalled behind AI.

## 12. Edition and feature policy

| Capability | Community / basic | Professional | Enterprise / governed |
|---|---|---|---|
| Deterministic bootstrap, policy validation, least-privilege checks | Included | Included | Included |
| CLI/UI/IDE/CI parity and model-free execution | Included | Included | Included |
| Durable local ledger and safe resume | Included | Included | Included |
| Provider adapter contracts and capability declarations | Included for supported adapters | Included | Included |
| Basic signed evidence and export | Included | Included | Included |
| Central policy governance, fleet inventory, organization-wide approvals | — | Optional | Included |
| Multi-actor approvals, policy-as-code integrations, long retention/SIEM export | — | Optional | Included |
| AI assistance | Optional add-on if enabled | Optional/included by SKU | Optional/included by SKU |

Do not withhold safety-critical behavior, accurate blocker reporting, duplicate prevention, or crash-safe resume from lower editions.

## 13. Completion and certification criteria

The universal readiness status may turn green only when all of the following are true:

1. AWS COR final release gate passes for the exact candidate SHA.
2. AWS RDS service-linked-role path succeeds on a clean disposable target and its denied path blocks clearly and safely.
3. Bootstrap returns non-zero / typed blocked status on required authorization denial and does not continue into workload mutation.
4. All five V9 policies are rendered for the configured target, created or reconciled, attached to the correct execution role, and independently re-read for exact digest and attachment verification.
5. Recursive canonical digest and signed policy pack tamper tests pass.
6. Positive and negative security tests prove separation between runner/bootstrap and workload permissions.
7. Durable resume passes process-crash and concurrent-actor tests.
8. Each claimed provider adapter passes its own contract and qualification suites.
9. Each claimed OS and entrypoint passes the shared parity suite.
10. Shared hosting, cPanel, DirectAdmin, VPS and private-host support are not declared certified until each profile has its own evidence.
11. Localization and repository governance gates pass.
12. Certification evidence is bound to the exact commit, adapter versions, target profile, test-suite version and artifact digest.

## 14. Sign-off record

**Audit result:** 🔴 **NO-GO — UNIVERSAL RELEASE NOT CERTIFIED**

**Reason:** The audited run's COR code qualification passed, but the authoritative final release gate failed because AWS physical certification failed during the RDS prerequisite path. Provider-neutral, cross-OS, shared-host, and model-free/model-assisted parity claims are not fully evidenced. Source inspection also found concrete bootstrap error-handling, target-hardcoding, wildcard validation, and canonical digest issues.

**Accepted certified boundaries to preserve:**
- OIDC base credential configuration and tagged execution-role assumption as observed in run `39632147169`.
- Successful VPC/subnet/security-group/EC2/EBS actions for that tested transaction.
- Dependency-aware cleanup and clean residual scan for that failed transaction.
- COR code-level qualification checks that passed on the exact audited candidate, without extending the claim beyond their test scope.

**Protected boundary rule:** These passing boundaries are 🔒 protected from unrelated modifications. Any necessary change must declare a modification zone and run the exact dependent contract tests. The failed RDS and final-release boundaries remain 🔴 until evidence proves resolution.

**Sign-off authority:** Ujomor Systems Engineering & Governance Authority — *pending review after remediation*  
**Independent reviewer:** *pending*  
**Signed timestamp:** *not signed*  
**Evidence digest:** *must be generated by CI from the final report artifact*  
**Next disposition:** Re-run targeted bootstrap/RDS tests, then full mandatory COR and physical qualification on the same exact candidate SHA.

---

**Final caution:** “Universal” means a consistent core contract with provider-specific adapters and honest capability declarations—not pretending every host offers the same permission model. No implementation may self-grant authority that the current identity does not possess. The minimal bootstrap handover should be as small as the provider allows, after which Ugondu performs every authorized reconciliation, verification and deployment step autonomously.
