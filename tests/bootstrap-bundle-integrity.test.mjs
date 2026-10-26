import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), "utf8"));

test("universal bootstrap manifest resolves every required package artifact", () => {
  const bundle = read(".governance/platform/bootstrap/universal-bootstrap-bundle.json");
  assert.equal(bundle.bundle_invariants.fail_closed, true);
  for (const schemaPath of [".governance/platform/bootstrap/schemas/universal-bootstrap-bundle.schema.json", ".governance/platform/bootstrap/schemas/role-catalog.schema.json", ".governance/platform/bootstrap/schemas/policy-pack.schema.json"]) {
    const schema = read(schemaPath);
    assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
    assert.ok(Array.isArray(schema.required) && schema.required.length > 0);
  }
  for (const artifact of bundle.required_package_contents) {
    if (artifact.required) assert.ok(fs.existsSync(path.join(root, artifact.path)), `missing ${artifact.path}`);
  }
});

test("role catalogue keeps runner, execution, bootstrap and verifier responsibilities distinct", () => {
  const catalog = read(".governance/platform/bootstrap/role-catalog.json");
  const roles = new Map(catalog.roles.map(role => [role.role_id, role]));
  for (const id of ["bootstrap_authority", "runner_base", "execution_role", "observer_verifier"]) assert.ok(roles.has(id));
  assert.equal(roles.get("runner_base").may_mutate_cloud_workloads, false);
  assert.equal(roles.get("execution_role").may_mutate_cloud_workloads, true);
  assert.ok(roles.get("execution_role").constraints.includes("policy permissions are derived from the approved plan"));
});

test("policy contract fails closed on unknown mappings and forbids standing administrator defaults", () => {
  const policy = read(".governance/platform/bootstrap/policy-pack-contract.json");
  assert.equal(policy.coverage_model.missing_mapping_behavior, "AUTHORITY_GAP");
  assert.equal(policy.coverage_model.unknown_action_behavior, "fail-closed");
  assert.equal(policy.policy_safety_invariants.administrator_access_default, false);
  assert.equal(policy.policy_safety_invariants.self_escalation, false);
  assert.equal(policy.policy_safety_invariants.success_without_readback, false);
});

test("bundle validator passes structural integrity without claiming live qualification", () => {
  const run = spawnSync(process.execPath, ["scripts/bootstrap/validate-bundle.mjs"], { cwd: root, encoding: "utf8" });
  assert.equal(run.status, 0, run.stdout + run.stderr);
  assert.match(run.stdout, /structural and cross-artifact integrity only/);
  assert.match(run.stdout, /not runtime tests|not runtime, IAM-effective-permission, or physical deployment qualification|Qualification status remains specification-only/);
});

test("strict validator does not misrepresent missing physical receipts as qualification", () => {
  const run = spawnSync(process.execPath, ["scripts/bootstrap/validate-bundle.mjs", "--strict"], { cwd: root, encoding: "utf8" });
  assert.equal(run.status, 2, run.stdout + run.stderr);
  assert.match(run.stderr, /STRICT QUALIFICATION: NOT PASSED/);
});

test("runtime UniversalBootstrapRuntime derives plan-bound policy pack for dumcholu-pilot-staging.yaml and fails closed on unmapped resources", async () => {
  const distPath = path.join(root, "server/capabilities/dist/index.js");
  if (!fs.existsSync(distPath)) return;
  const { UniversalBootstrapRuntime } = await import(`file://${distPath.replace(/\\/g, "/")}`);
  const cfnTemplate = fs.readFileSync(path.join(root, "infrastructure/aws/dumcholu-pilot-staging.yaml"), "utf8");
  const graph = UniversalBootstrapRuntime.derivePlanOperationGraph({
    accountId: "971671216490",
    region: "eu-west-3",
    environment: "staging",
    projectSlug: "dumcholu",
    transactionId: "tx-bundle-test-001",
    callerPrincipalArn: "arn:aws:iam::971671216490:role/UgonduCORRunner",
    executionRoleArn: "arn:aws:iam::971671216490:role/UgonduCORExecutionRole",
    iacServiceRoleArn: "arn:aws:iam::971671216490:role/UgonduIacServiceRole",
    cloudFormationTemplateContent: cfnTemplate,
  });
  assert.equal(graph.status, "READY");
  assert.equal(graph.exitCode, 0);
  assert.equal(graph.operations.length, 15);
  const pack = UniversalBootstrapRuntime.generatePlanBoundPolicyPack({
    graph,
    roleId: "execution_role",
    targetRoleArn: "arn:aws:iam::971671216490:role/UgonduCORExecutionRole",
  });
  const validation = UniversalBootstrapRuntime.validatePolicyPackAgainstContract(pack);
  assert.equal(validation.valid, true);
  assert.equal(validation.violations.length, 0);
});
