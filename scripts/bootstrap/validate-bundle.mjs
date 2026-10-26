#!/usr/bin/env node
/**
 * Fail-closed integrity checks for the universal bootstrap specification bundle.
 * This does not execute cloud operations or certify effective provider permissions.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const strict = process.argv.includes("--strict");
const required = [
  ".governance/platform/bootstrap/universal-bootstrap-capabilities.json",
  ".governance/platform/bootstrap/universal-bootstrap-bundle.json",
  ".governance/platform/bootstrap/role-catalog.json",
  ".governance/platform/bootstrap/policy-pack-contract.json",
  ".governance/platform/bootstrap/schemas/universal-bootstrap-bundle.schema.json",
  ".governance/platform/bootstrap/schemas/role-catalog.schema.json",
  ".governance/platform/bootstrap/schemas/policy-pack.schema.json",
  "docs/audit/UNIVERSAL_DEPLOYMENT_RESOURCE_AUTHORIZATION_CATALOGUE_2026-10-26.md",
  "docs/audit/UNIVERSAL_BOOTSTRAP_CLOUD_PROVISIONING_REMEDIATION_2026-10-26.md",
  "docs/governance/ANTIGRAVITY_CHANGE_GUARDRAIL.md",
  "package.json"
];
const errors = [];
const readJson = (relative) => {
  const full = path.join(root, relative);
  if (!fs.existsSync(full)) { errors.push(`MISSING_REQUIRED_ARTIFACT: ${relative}`); return null; }
  try { return JSON.parse(fs.readFileSync(full, "utf8")); }
  catch (e) { errors.push(`INVALID_JSON: ${relative}: ${e.message}`); return null; }
};
const registry = readJson(required[0]);
const bundle = readJson(required[1]);
const roles = readJson(required[2]);
const policy = readJson(required[3]);
const pkg = readJson("package.json");
const schemas = required.filter(p => p.endsWith(".schema.json")).map(readJson);
for (const file of required.slice(4)) if (!fs.existsSync(path.join(root, file))) errors.push(`MISSING_REQUIRED_ARTIFACT: ${file}`);

if (bundle) {
  if (bundle.status !== "specification-bundle-runtime-integration-required") errors.push("BUNDLE_STATUS_UNEXPECTED");
  if (bundle.bundle_invariants?.fail_closed !== true) errors.push("BUNDLE_FAIL_CLOSED_INVARIANT_MISSING");
  for (const item of bundle.required_package_contents ?? []) {
    if (item.required && !fs.existsSync(path.join(root, item.path))) errors.push(`MANIFEST_ARTIFACT_MISSING: ${item.path}`);
  }
  if (!Array.isArray(bundle.execution_order) || !bundle.execution_order.includes("validate-policy-semantics-and-boundaries")) errors.push("EXECUTION_ORDER_INCOMPLETE");
}
if (registry) {
  if (registry.task_id !== "UG-UPLM-BOOTSTRAP-UNIVERSAL-001") errors.push("TASK_ID_MISMATCH");
  if (registry.governance?.fail_closed !== true || registry.bootstrap_contract?.authority_gap_code !== "AUTHORITY_GAP") errors.push("REGISTRY_SECURITY_CONTRACT_INVALID");
  if (!Array.isArray(registry.lifecycle) || registry.lifecycle.length < 8) errors.push("LIFECYCLE_INCOMPLETE");
  if (!registry.providers || Object.keys(registry.providers).length < 7) errors.push("PROVIDER_CATALOGUE_INCOMPLETE");
}
if (roles) {
  const byId = new Map((roles.roles ?? []).map(x => [x.role_id, x]));
  for (const id of ["bootstrap_authority","runner_base","execution_role","observer_verifier"]) if (!byId.has(id)) errors.push(`REQUIRED_ROLE_MISSING: ${id}`);
  for (const [id, role] of byId) if (!role.purpose || !role.scope || !Array.isArray(role.constraints) || role.constraints.length === 0) errors.push(`ROLE_CONTRACT_INCOMPLETE: ${id}`);
  if (byId.get("runner_base")?.may_mutate_cloud_workloads !== false) errors.push("RUNNER_BASE_MUST_NOT_MUTATE_WORKLOADS_BY_DEFAULT");
  if (byId.get("execution_role")?.may_mutate_cloud_workloads !== true) errors.push("EXECUTION_ROLE_CONTRACT_INVALID");
}
if (policy) {
  for (const key of ["policy_pack_required_fields","target_scope_required_fields","generation_pipeline","coverage_model","policy_safety_invariants","required_outputs"]) if (!(key in policy)) errors.push(`POLICY_CONTRACT_FIELD_MISSING: ${key}`);
  for (const key of ["administrator_access_default","wildcard_action_default","wildcard_resource_default","self_escalation","arbitrary_pass_role","success_without_readback","success_on_permission_denial"]) if (policy.policy_safety_invariants?.[key] !== false) errors.push(`POLICY_INVARIANT_NOT_FALSE: ${key}`);
  if (policy.coverage_model?.missing_mapping_behavior !== "AUTHORITY_GAP") errors.push("UNKNOWN_PERMISSION_MAPPING_MUST_FAIL_CLOSED");
}
if (schemas.some(schema => schema && schema.$schema !== "https://json-schema.org/draft/2020-12/schema")) errors.push("SCHEMA_DRAFT_MISMATCH");
if (schemas.some(schema => schema && (!schema.type || !schema.properties || !Array.isArray(schema.required)))) errors.push("SCHEMA_STRUCTURE_INVALID");
if (pkg && (pkg.scripts?.["bootstrap:validate"] !== "node scripts/bootstrap/validate-bundle.mjs")) errors.push("PACKAGE_VALIDATION_SCRIPT_MISSING");

if (errors.length) {
  console.error("UNIVERSAL BOOTSTRAP BUNDLE: FAIL");
  errors.forEach(e => console.error(" - " + e));
  process.exitCode = 1;
} else {
  console.log("UNIVERSAL BOOTSTRAP BUNDLE: PASS — structural and cross-artifact integrity only");
  console.log(`Required files checked: ${required.length}`);
  console.log(`Provider definitions: ${Object.keys(registry.providers).length}`);
  console.log(`Logical role definitions: ${roles.roles.length}`);
  console.log(`Policy lifecycle stages: ${policy.generation_pipeline.length}`);
  if (strict) {
    console.error("STRICT QUALIFICATION: NOT PASSED — this script does not test runtime adapters, effective IAM, or live deployments.");
    process.exitCode = 2;
  } else console.log("Qualification status remains specification-only until runtime tests and target-bound physical receipts exist.");
}
