# Ugondu GCP One-Step Bootstrap — Re-audit Handover

**Finding:** UG-GCP-BOOTSTRAP-UX-001  
**Branch:** `feat/gcp-one-step-bootstrap-2026-10-27`  
**Parent:** DirectAdmin safety candidate `6e5b5c45408d1ba66cb47ede6ba7ce94a4bf639f`  
**Status:** IMPLEMENTED IN CODE; exact-head regression/CI/COR evidence pending  
**Scope:** Simplify first-time GCP identity bootstrap to one governed plan/apply command without widening permissions.

## User problem

The AWS bootstrap flow had a more complete guided bundle while GCP setup required operators to navigate IAM, APIs, service accounts and Workload Identity Federation manually. That leaves inexperienced users stranded and increases configuration drift.

The screenshot shows project `ugondu-staging-512906` and an inherited organization-level grant set. Those inherited grants are context, not permission to add more privilege. The new workflow must not attempt to remove or alter organizational grants.

## Physical implementation

- `scripts/bootstrap/gcp-one-step-bootstrap.mjs`: one CLI for plan and apply.
- `.governance/platform/bootstrap/gcp-bootstrap-profile.json`: canonical GCP onboarding contract.
- `.governance/platform/bootstrap/universal-bootstrap-bundle.json`: adds the GCP profile, runtime, regression suite and workflow to the dependency-closed bundle.
- `.governance/platform/bootstrap/universal-bootstrap-capabilities.json`: records that identity bootstrap is implemented while workload deployment remains unqualified.
- `package.json`: adds `npm run bootstrap:gcp` and `npm run test:bootstrap:gcp`.
- `tests/gcp-one-step-bootstrap.test.mjs`: covers plan scope, digest stability, identifier validation, explicit approval and project mismatch.
- `.github/workflows/gcp-bootstrap-safety.yml`: exact-SHA safety tests.
- `docs/governance/ANTIGRAVITY_CHANGE_GUARDRAIL.md`: anti-drift constraints.

## User experience

Plan first (read-only):

```bash
npm run bootstrap:gcp -- --project ugondu-staging-512906 --region europe-west1 --github-repo Chicitadel/ugondu --plan
```

Review the JSON output and its SHA-256 `plan_digest`, then apply only that reviewed plan:

```bash
npm run bootstrap:gcp -- --project ugondu-staging-512906 --region europe-west1 --github-repo Chicitadel/ugondu --apply --approve-plan-digest <DIGEST_FROM_PLAN>
```

The script checks the active gcloud project and active identity before mutation, enables the five bootstrap APIs, creates or reuses the WIF pool/provider and dedicated service account, binds the exact repository principal with `roles/iam.workloadIdentityUser`, and reads back the provider condition and IAM binding. It does not persist service-account keys.

## Safety boundaries

- No project Owner, Editor, or workload deployment role is granted.
- The GitHub OIDC provider condition is bound to the exact `OWNER/REPO`.
- No workload deploy is attempted. This bootstrap only establishes the federation foundation.
- Organization policies, inherited IAM grants, deny policies and permission boundaries remain authoritative.
- Missing authority, wrong active project, plan-digest mismatch, or failed read-back exits nonzero with `AUTHORITY_GAP`/typed error.
- The project ID must be supplied explicitly; the tool will not silently switch the configured gcloud project.
- GCP physical deployment qualification is still pending. No physical receipt is implied by unit tests.

## Known next implementation stage

After this foundation is verified, implement provider-specific GCP plan compilation from Terraform resources (Cloud Run, Artifact Registry, Cloud DNS, Certificate Manager, Cloud Storage, Secret Manager and Cloud SQL), resource-scoped IAM role synthesis, policy diff/approval, authorized apply, rollback and read-back receipts. Unknown resource/action mappings must fail closed with `AUTHORITY_GAP`; do not default to Project Editor.

## Acceptance

1. Pass `npm run test:bootstrap:gcp`.
2. Pass `npm run bootstrap:validate`.
3. Pass full CI and COR on the exact final SHA.
4. For physical qualification, run against the authorized staging project with a candidate-bound evidence receipt; do not paste credentials or keys into chat.
5. Keep PR draft/unmerged until review and required qualification evidence are complete.

**Disposition:** UX and WIF bootstrap foundation implemented; full GCP deployment adapter and universal COR certification remain open.
