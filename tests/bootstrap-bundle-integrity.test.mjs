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
  assert.match(run.stdout, /specification artifact integrity only/);
  assert.match(run.stdout, /not runtime tests|not runtime, IAM-effective-permission, or physical deployment qualification|Qualification status remains specification-only/);
});

test("strict validator does not misrepresent missing physical receipts as qualification", () => {
  const run = spawnSync(process.execPath, ["scripts/bootstrap/validate-bundle.mjs", "--strict"], { cwd: root, encoding: "utf8" });
  assert.equal(run.status, 2, run.stdout + run.stderr);
  assert.match(run.stderr, /STRICT QUALIFICATION: NOT PASSED/);
});
