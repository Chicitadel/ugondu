import test from "node:test";
import assert from "node:assert/strict";
import { buildPlan, executePlan, parseArgs, validateConfig } from "../scripts/bootstrap/gcp-one-step-bootstrap.mjs";

const base = { project: "ugondu-staging-512906", region: "europe-west1", githubRepo: "Chicitadel/ugondu", pool: "ugondu-github", provider: "github-oidc", serviceAccount: "ugondu-bootstrap", mode: "plan" };

test("GCP bootstrap plan is target-bound, repo-restricted and does not grant workload roles", () => {
  const plan = buildPlan(base);
  assert.equal(plan.provider, "gcp");
  assert.equal(plan.project_id, base.project);
  assert.equal(plan.identity.attribute_condition, "assertion.repository == 'Chicitadel/ugondu'");
  assert.deepEqual(plan.role_grants, []);
  assert.equal(plan.invariants.no_project_owner_or_editor_grants, true);
  assert.ok(plan.enable_apis.includes("sts.googleapis.com"));
  assert.match(plan.plan_digest, /^[a-f0-9]{64}$/);
});

test("plan digest remains identical between plan and apply invocation", () => {
  const planDigest = buildPlan({ ...base, mode: "plan" }).plan_digest;
  const applyDigest = buildPlan({ ...base, mode: "apply", approvedDigest: planDigest }).plan_digest;
  assert.equal(planDigest, applyDigest);
});

test("rejects invalid project, repository and WIF resource identifiers", () => {
  assert.throws(() => validateConfig({ ...base, project: "Bad_Project" }), /INVALID_GCP_PROJECT_ID/);
  assert.throws(() => validateConfig({ ...base, githubRepo: "someone else's repo" }), /INVALID_GITHUB_REPOSITORY/);
  assert.throws(() => validateConfig({ ...base, pool: "../pool" }), /INVALID_WIF_RESOURCE_ID/);
});

test("argument parser requires values and rejects unknown switches", () => {
  assert.throws(() => parseArgs(["--project"]), /MISSING_VALUE/);
  assert.throws(() => parseArgs(["--magic"]), /UNKNOWN_ARGUMENT/);
  assert.equal(parseArgs(["--project", base.project, "--github-repo", base.githubRepo, "--apply"]).mode, "apply");
});

test("apply requires exact plan digest before invoking any provider command", () => {
  let calls = 0;
  const plan = buildPlan({ ...base, mode: "apply", approvedDigest: "wrong" });
  assert.throws(() => executePlan({ ...base, mode: "apply", approvedDigest: "wrong" }, plan, () => { calls++; return ""; }), /PLAN_DIGEST_APPROVAL_REQUIRED/);
  assert.equal(calls, 0);
});

test("active project mismatch fails before any mutation", () => {
  let calls = 0;
  const plan = buildPlan({ ...base, mode: "apply" });
  const runner = (args) => {
    calls++;
    if (args[0] === "config") return "another-project";
    return "";
  };
  assert.throws(() => executePlan({ ...base, mode: "apply", approvedDigest: plan.plan_digest }, plan, runner), /ACTIVE_GCLOUD_PROJECT_MISMATCH/);
  assert.equal(calls, 1);
});
