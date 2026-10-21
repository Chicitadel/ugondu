# COR Autonomous Policy Stabilization and Bootstrap Contract

**Status:** Proposed implementation contract for `phase4/production-hardening`  
**Scope:** Ugondu bootstrap and recovery; AWS COR V9 is the first provider adapter.  
**Decision:** Option A — autonomous reconciliation is the default path. Manual console instructions are not the normal recovery path.

## 1. Required user experience

A user must be able to run one supported CLI command (or one UI action) to bootstrap COR. The same shared engine must be used by terminal, UI, IDE, CI, model-assisted and non-model-assisted entry points. AI may explain or help interpret intent, but it must not be a prerequisite for policy reconciliation.

The command must: discover the caller and target; inspect current resources; validate signed policy-pack provenance and policy documents; build a deterministic plan; provision or update only Ugondu-owned canonical policies; attach missing approved policies to the canonical execution role; verify attachments and trust; run read-only conformance probes; persist evidence and checkpoints; and resume safely after interruption.

## 2. Existing implementation discovered

On `phase4/production-hardening`, `.github/workflows/cor.yml` already calls:

1. `node scripts/aws-conformance/reconcile-bootstrap-policy-pack.mjs --phase bootstrap-provision` under base OIDC credentials.
2. Assumption of the tagged `UgonduCORExecutionRole` session.
3. `node scripts/aws-conformance/reconcile-bootstrap-policy-pack.mjs --phase verify-effective` under the execution role.
4. Read-only conformance probes.

The reconciler validates the five V9 policy templates and their SHA-256 values, attempts to reconcile policy versions and attachments, and emits an evidence report. This is a foundation, not proof that every required IAM operation is available or that every recovery path is complete.

## 3. Bootstrap authority is a distinct capability

Autonomous execution must not be confused with self-granting authority. A workload cannot grant itself permissions that its current principal does not possess. The bootstrap principal must be provisioned once by an authorized administrator, organization control plane, or pre-authorized IaC deployment. After that, routine deployments must not require manual policy attachment.

Maintain two distinct permission domains:

- **Bootstrap principal / runner:** identity discovery, read-only inspection of canonical roles and policies, create/update only canonical Ugondu-owned policy objects where explicitly allowed, attach only allow-listed policy ARNs to the canonical execution role, and verify the result.
- **Execution role:** runtime infrastructure permissions from the approved signed policy pack. Do not attach the execution pack to the runner.

Never grant the runner broad EC2/RDS/S3/ECS/ECR deployment permissions merely to make a workflow pass.

## 4. Required permission inventory

The bootstrap adapter must compute the actual required actions from the operations it plans to perform and report each missing action/resource pair. The baseline inventory to evaluate is:

- Identity and target discovery: `sts:GetCallerIdentity`, `iam:GetRole`, `iam:ListRolePolicies`, `iam:GetRolePolicy`, `iam:ListAttachedRolePolicies`, `iam:GetPolicy`, `iam:GetPolicyVersion`, `iam:ListPolicyVersions`.
- Create missing canonical managed policies, if enabled: `iam:CreatePolicy`, scoped to the exact canonical policy names and approved tags.
- Repair a canonical managed policy version, if enabled: `iam:CreatePolicyVersion` and, only when necessary and safe, `iam:DeletePolicyVersion` for the exact canonical policy ARN. Never delete the default version or a version required for rollback.
- Attach approved policies: `iam:AttachRolePolicy` scoped to the canonical execution role and constrained by `iam:PolicyARN` to the signed pack's exact policy ARN allow-list (a prefix match alone is not sufficient when an exact list can be generated).
- Trust-policy repair is a separate high-risk capability. It must not occur implicitly during routine bootstrap. Require explicit plan approval or pre-authorized IaC, compare the complete expected principal and conditions, and preserve rollback evidence.

The adapter must not treat AccessDenied, malformed output, missing credentials, throttling, or provider unavailability as evidence that an object does not exist. Classify each result distinctly and fail closed when a safe reconciliation decision cannot be made.

## 5. Policy stabilization and region selection

Region selection must be validated against the provider's region catalog and passed as a typed target parameter. Do not silently use the AWS CLI default region. Do not globally replace arbitrary strings in signed policy documents.

The current V9 pack has a fixed target scope and signed hashes. If region portability is required, introduce a deterministic policy-rendering stage with:
- canonical, region-neutral source templates;
- typed placeholders for account, partition, region, and resource identifiers;
- schema validation before rendering;
- deny-by-default rejection of unresolved placeholders and unexpected regions;
- rendered-policy size, action, resource, condition, and statement-count checks;
- content hashes and evidence for the rendered artifacts;
- a signature/provenance policy appropriate to generated artifacts;
- tests for at least `eu-west-3`, a second supported region, invalid regions, and cross-account ARNs.

Never bypass signature verification or widen resource ARNs to `*` to make a regional mismatch disappear. AWS global IAM ARNs and regional service resource ARNs must be handled according to their service-specific ARN semantics.

## 6. Reconciliation state machine

Use explicit durable states:

`DISCOVERING -> VALIDATING -> PLANNING -> AUTHORIZED -> APPLYING -> VERIFYING -> COMPLETE`

Terminal or resumable exception states include `AUTHORITY_MISSING`, `DRIFT_UNSAFE`, `PROVIDER_UNAVAILABLE`, `ACCESS_DENIED`, `VERIFY_FAILED`, and `INTERRUPTED`.

Before every mutation:
1. Persist the intended operation and idempotency key.
2. Re-read the target object and confirm its canonical identity and ownership.
3. Confirm the requested action is in the approved plan and the policy pack is trusted.
4. Execute one mutation.
5. Re-read provider state and verify the postcondition.
6. Persist evidence and advance the checkpoint.

On restart, inspect actual provider state before retrying. Do not blindly replay non-idempotent operations. If an object is foreign, ambiguous, or unexpectedly changed, stop and preserve it.

## 7. Verification requirements

A successful bootstrap must verify all of the following from live reads, not inferred booleans:

- caller account and principal are expected;
- canonical runner and execution role names/ARNs match target configuration;
- execution role trust allows the expected runner and enforces required session tags, including both `UgonduTransactionId` and `UgonduCOR` when the workflow sends both;
- every expected policy exists and its current default document matches the validated/rendered expected document;
- every expected policy is attached to the execution role;
- no execution policy is attached to the runner;
- effective read-only conformance probes succeed;
- required negative boundary probes are denied;
- region/account scope is consistent;
- the report records evidence, timestamps, policy hashes, operation outcomes, and any skipped/unsupported checks.

A successful API response from `AttachRolePolicy` is not sufficient without a subsequent attachment read. A failed `ListAttachedRolePolicies` call must be classified as inconclusive, not as an empty attachment list.

## 8. CI and test contract

The COR workflow must preserve the ordering: bootstrap identity -> validate/plan -> bootstrap reconcile -> tagged execution session -> verify effective policy state -> conformance probes -> evidence upload. No mutating operation may occur before the plan and authorization preflight are complete.

Required automated tests:
- clean first installation and already-correct repeat installation;
- each policy missing individually and all policies missing;
- regional drift and invalid region;
- missing policy, stale default version, and managed-policy version quota;
- AccessDenied on each required IAM operation;
- malformed provider responses, throttling and provider outage;
- wrong account, wrong role, wrong trust principal, missing/extra session tags;
- interrupted run at every mutation boundary and resume from the durable checkpoint;
- foreign policy/role collisions and duplicate-role prevention;
- no runner attachment of execution policies;
- exact parity of results through CLI, UI and non-AI execution adapters;
- no secrets in logs or evidence;
- live AWS verification only in the explicitly authorized physical qualification job.

Tests must use injected AWS-call adapters or isolated test accounts; they must never mutate the production qualification account as part of ordinary unit tests.

## 9. Option A failure behavior

If the bootstrap identity lacks a required permission, Ugondu must:
- stop before any dependent mutation;
- identify the exact missing action, resource, and condition when evidence supports that conclusion;
- preserve a machine-readable report and resumable checkpoint;
- distinguish insufficient authority from network outage, missing resource, and malformed response;
- offer a generated least-privilege bootstrap policy/IaC artifact for an authorized administrator to apply once;
- resume automatically on the next run after authority is granted.

The user must not be instructed to manually attach each runtime policy as the normal path. Manual intervention is only an exceptional authority bootstrap or a deliberate approval for a high-risk trust change.

## 10. Release acceptance gate

Do not mark autonomous policy bootstrap production-ready until the implementation, tests, signed-pack verification, workflow ordering, live evidence, and recovery behavior all pass. A documentation-only change or a green static test is not proof of live IAM authorization. Keep the release gate fail-closed.
