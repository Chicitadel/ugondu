#!/usr/bin/env node
/**
 * Ugondu GCP one-step bootstrap.
 * Plan mode is read-only. Apply mode only creates a repo-restricted GitHub OIDC
 * Workload Identity Federation path and enables the minimum APIs for that path.
 * It does NOT grant project Owner/Editor or workload deployment roles.
 */
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import process from "node:process";

const REQUIRED_APIS = [
  "iam.googleapis.com",
  "iamcredentials.googleapis.com",
  "cloudresourcemanager.googleapis.com",
  "serviceusage.googleapis.com",
  "sts.googleapis.com",
];
const DEFAULTS = { pool: "ugondu-github", provider: "github-oidc", serviceAccount: "ugondu-bootstrap" };

export function parseArgs(argv) {
  const result = { mode: "plan", region: undefined, ...DEFAULTS };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--apply") result.mode = "apply";
    else if (arg === "--plan") result.mode = "plan";
    else if (["--project", "--region", "--github-repo", "--pool", "--provider", "--service-account", "--approve-plan-digest"].includes(arg)) {
      const value = argv[++i];
      if (!value || value.startsWith("--")) throw new Error(`MISSING_VALUE:${arg}`);
      const key = ({ "--project":"project", "--region":"region", "--github-repo":"githubRepo", "--pool":"pool", "--provider":"provider", "--service-account":"serviceAccount", "--approve-plan-digest":"approvedDigest" })[arg];
      result[key] = value;
    } else if (arg === "--help" || arg === "-h") result.help = true;
    else throw new Error(`UNKNOWN_ARGUMENT:${arg}`);
  }
  return result;
}

export function validateConfig(c) {
  if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(c.project ?? "")) throw new Error("INVALID_GCP_PROJECT_ID");
  if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(c.pool) || !/^[a-z0-9][a-z0-9-]{0,62}$/.test(c.provider)) throw new Error("INVALID_WIF_RESOURCE_ID");
  if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(c.serviceAccount)) throw new Error("INVALID_SERVICE_ACCOUNT_ID");
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(c.githubRepo ?? "")) throw new Error("INVALID_GITHUB_REPOSITORY");
  if (c.region && !/^[a-z]+-[a-z]+[0-9]$/.test(c.region)) throw new Error("INVALID_GCP_REGION");
  return c;
}

export function buildPlan(c) {
  validateConfig(c);
  const plan = {
    schema_version: "1.0.0",
    provider: "gcp",
    project_id: c.project,
    region: c.region ?? null,
    mode: "plan-bound",
    github_repository: c.githubRepo,
    identity: {
      pool_id: c.pool,
      provider_id: c.provider,
      service_account_id: c.serviceAccount,
      issuer_uri: "https://token.actions.githubusercontent.com",
      attribute_condition: `assertion.repository == '${c.githubRepo}'`,
      service_account_impersonation: true,
    },
    enable_apis: REQUIRED_APIS,
    role_grants: [],
    invariants: {
      read_only_discovery_before_mutation: true,
      repository_condition_required: true,
      no_long_lived_service_account_keys: true,
      no_project_owner_or_editor_grants: true,
      no_workload_deployment_roles_by_default: true,
      billing_and_entitlements_authority: "Air Roofers AeroBill/Mandatag",
      legal_policy_authority: "https://policies.airroofers.eu",
    },
    operations: [
      "verify target project and active caller",
      "enable the five bootstrap APIs",
      "create workload identity pool if absent",
      "create GitHub OIDC provider restricted to the exact repository",
      "create dedicated bootstrap service account if absent",
      "allow only the repository-bound WIF principal to impersonate that service account",
      "read back APIs, pool, provider condition and IAM binding",
    ],
    non_claims: [
      "This bootstrap does not grant permissions to deploy workloads.",
      "A successful WIF setup does not certify GCP deployment capabilities.",
      "Organization policies, deny policies and inherited IAM grants remain authoritative.",
    ],
  };
  const digest = crypto.createHash("sha256").update(JSON.stringify(plan)).digest("hex");
  return { ...plan, plan_digest: digest };
}

function run(command, args, options = {}) {
  const r = spawnSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...options });
  if (r.error) throw new Error(`COMMAND_UNAVAILABLE:${command}:${r.error.message}`);
  if (r.status !== 0) throw new Error(`COMMAND_FAILED:${command} ${args.join(" ")}: ${(r.stderr || "").trim()}`);
  return (r.stdout || "").trim();
}

function gcloud(args) { return run("gcloud", args); }

export function executePlan(c, plan, runner = gcloud) {
  if (c.mode !== "apply") throw new Error("APPLY_MODE_REQUIRED");
  if (!c.approvedDigest || c.approvedDigest !== plan.plan_digest) throw new Error("PLAN_DIGEST_APPROVAL_REQUIRED");
  // Confirm project and identity before any mutation; never switch projects silently.
  const activeProject = runner(["config", "get-value", "project"]);
  if (activeProject !== c.project) throw new Error("ACTIVE_GCLOUD_PROJECT_MISMATCH");
  const activeAccount = runner(["auth", "list", "--filter=status:ACTIVE", "--format=value(account)"]);
  if (!activeAccount) throw new Error("NO_ACTIVE_GCLOUD_IDENTITY");
  const projectNumber = runner(["projects", "describe", c.project, "--format=value(projectNumber)"]);
  if (!/^\d+$/.test(projectNumber)) throw new Error("PROJECT_NUMBER_UNAVAILABLE");

  for (const api of REQUIRED_APIS) runner(["services", "enable", api, "--project", c.project]);
  const poolName = `projects/${projectNumber}/locations/global/workloadIdentityPools/${c.pool}`;
  const providerName = `${poolName}/providers/${c.provider}`;
  const saEmail = `${c.serviceAccount}@${c.project}.iam.gserviceaccount.com`;
  const existingPools = runner(["iam", "workload-identity-pools", "list", "--project", c.project, "--location", "global", "--format=value(name)"]);
  if (!existingPools.split(/\r?\n/).some(x => x.endsWith("/" + c.pool))) {
    runner(["iam", "workload-identity-pools", "create", c.pool, "--project", c.project, "--location", "global", "--display-name", "Ugondu GitHub Actions"]);
  }
  const existingProviders = runner(["iam", "workload-identity-pools", "providers", "list", "--project", c.project, "--location", "global", "--workload-identity-pool", c.pool, "--format=value(name)"]);
  if (!existingProviders.split(/\r?\n/).some(x => x.endsWith("/" + c.provider))) {
    runner(["iam", "workload-identity-pools", "providers", "create-oidc", c.provider,
      "--project", c.project, "--location", "global", "--workload-identity-pool", c.pool,
      "--display-name", "GitHub repository OIDC", "--issuer-uri", "https://token.actions.githubusercontent.com",
      "--attribute-mapping", "google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.actor=assertion.actor",
      "--attribute-condition", `assertion.repository == '${c.githubRepo}'`]);
  }
  const serviceAccounts = runner(["iam", "service-accounts", "list", "--project", c.project, "--format=value(email)"]);
  const serviceAccountExists = serviceAccounts.split(/\r?\n/).includes(saEmail);
  if (serviceAccountExists) {
    // Never attach GitHub federation to an existing identity without proving it
    // has no direct project-level workload grants. This prevents privilege
    // inheritance through an accidentally reused service account.
    const projectPolicy = JSON.parse(runner(["projects", "get-iam-policy", c.project, "--format=json"]));
    const existingGrants = (projectPolicy.bindings ?? []).filter(binding =>
      (binding.members ?? []).includes(`serviceAccount:${saEmail}`));
    if (existingGrants.length > 0) throw new Error("EXISTING_SERVICE_ACCOUNT_HAS_PROJECT_GRANTS");
  } else {
    runner(["iam", "service-accounts", "create", c.serviceAccount, "--project", c.project, "--display-name", "Ugondu bootstrap federation"]);
  }
  // Verify the provider before granting the service-account impersonation binding.
  const providerReadback = runner(["iam", "workload-identity-pools", "providers", "describe", c.provider,
    "--project", c.project, "--location", "global", "--workload-identity-pool", c.pool, "--format=json"]);
  if (!providerReadback.includes(c.githubRepo) || !providerReadback.includes("assertion.repository")) throw new Error("WIF_PROVIDER_READBACK_MISMATCH");
  const principal = `principalSet://iam.googleapis.com/${poolName}/attribute.repository/${c.githubRepo}`;
  runner(["iam", "service-accounts", "add-iam-policy-binding", saEmail, "--project", c.project,
    "--role", "roles/iam.workloadIdentityUser", "--member", principal]);
  // Read-back checks are mandatory; no "success" receipt without them.
  const bindingReadback = runner(["iam", "service-accounts", "get-iam-policy", saEmail, "--project", c.project, "--format=json"]);
  if (!bindingReadback.includes(principal) || !bindingReadback.includes("roles/iam.workloadIdentityUser")) throw new Error("WIF_BINDING_READBACK_MISMATCH");
  return { status: "BOOTSTRAP_VERIFIED", project_id: c.project, project_number: projectNumber, active_caller: activeAccount, provider: providerName, service_account: saEmail, plan_digest: plan.plan_digest, role_grants: plan.role_grants, note: "No workload deployment roles were granted." };
}

function main() {
  const c = parseArgs(process.argv.slice(2));
  if (c.help) {
    process.stdout.write("Ugondu GCP bootstrap\nPlan: node scripts/bootstrap/gcp-one-step-bootstrap.mjs --project PROJECT_ID --github-repo OWNER/REPO [--region REGION]\nApply: add --apply --approve-plan-digest SHA256_FROM_PLAN\nRequires gcloud, active user authentication and authority to enable APIs/create WIF resources. Apply does not grant workload roles.\n");
    return;
  }
  validateConfig(c);
  const plan = buildPlan(c);
  if (c.mode === "plan") {
    process.stdout.write(JSON.stringify(plan, null, 2) + "\n");
    return;
  }
  const receipt = executePlan(c, plan);
  process.stdout.write(JSON.stringify(receipt, null, 2) + "\n");
}
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  try { main(); } catch (error) { process.stderr.write(JSON.stringify({ status: "AUTHORITY_GAP", code: error.message, exit_code: 1 }) + "\n"); process.exitCode = 1; }
}
