<!-- Project: Ugondu | Organization: Air Roofers SASU | Governance: UAIGOS 3.0.0 -->
# COR Follow-up Audit — 2026-10-25 04:41 UTC
## VPC quota recovery, candidate-bound COR reconciliation, physical cleanup safety, AI activation and universality

**Authority & authorship:** Air Roofers SASU Enterprise Architecture Council & Ujomor Systems Engineering & Governance Authority  
**Repository:** https://github.com/Chicitadel/ugondu  
**Production branch:** `phase4/production-hardening`  
**Implementation candidate:** [`1f05cccb4a0148a91ec2f177dd0ecd5af11e7b82`](https://github.com/Chicitadel/ugondu/commit/1f05cccb4a0148a91ec2f177dd0ecd5af11e7b82)  
**Evidence-only descendant:** [`162b45898591546b66b789a433b069abe838338b`](https://github.com/Chicitadel/ugondu/commit/162b45898591546b66b789a433b069abe838338b)  
**Candidate CI:** [run 40160710160](https://github.com/Chicitadel/ugondu/actions/runs/40160710160)  
**AWS physical run with observed pass:** [run 40160710161, job 121071472638](https://github.com/Chicitadel/ugondu/actions/runs/40160710161/job/121071472638)  
**Related run 40160710161 overall:** [run](https://github.com/Chicitadel/ugondu/actions/runs/40160710161) — physical job passed, but COR evidence-freshness step failed and final release gate failed.  
**Latest COR/physical run:** [run 40161212443](https://github.com/Chicitadel/ugondu/actions/runs/40161212443) — COR Certification passed; AWS Physical Qualification Gate was still running at the 04:41 UTC inspection. This report does not presume its eventual result.  
**Live AI canary receipt:** [live_ai_canary_receipt.json](../security/evidence/live_ai_canary_receipt.json)  
**Verdict:** **QUALIFIED WITH BOUNDED TARGET SUPPORT — UNIVERSAL COR NOT GRANTED. Release lineage is not yet fully green.**

---

## 1. Executive determination

This inspection confirms real progress, but not universal release completion.

1. The candidate CI run `40160710160` is reported as successful across its configured 18 jobs.
2. The AWS Physical Qualification Gate job `121071472638` in run `40160710161` completed successfully, including physical certification, Fargate certification and residual-resource cleanup verification. This is a real, useful scoped pass.
3. The same run `40160710161` is **not an end-to-end release pass**: its COR Certification job failed at **“Verify evidence freshness (candidate-bound, evidence-only descendant)”**, so release-integrity/signing/finalization steps were skipped and the final release gate failed.
4. A later run `40161212443` has COR Certification success and evidence freshness success, but its AWS Physical Qualification Gate remained **in progress** when inspected. Until that physical job and the final gate complete successfully, there is no single verified run demonstrating all mandatory gates green together.
5. The production source now has a fail-closed S3 tag observation path: `NoSuchTagSet` becomes an empty tag list and the required-tag assertion fails. The previously documented synthetic `AccessDenied` success-shaped fallback is absent in the inspected current source.
6. The newly added VPC cleanup preflight still has safety/robustness concerns (detailed below): swallowed describe/delete errors and cleanup based only on `UgonduCOR=true` plus a different transaction tag are not a strong enough ownership proof for a zero-risk commercial certification tool.
7. AI canary evidence proves one live inference for `sentinel-guard-v1`; it does not prove fleet activation. The checked-in canary receipt says discovery and execution HTTP 200 and 30 endpoint-available models. The governed report remains a separate qualification artifact; each model must have its own valid receipt and approval before activation.
8. Native OS, IDE, host and cloud lifecycle evidence remains bounded. Universal certification must remain red until each advertised target is either fully qualified or explicitly removed from the support promise.

**Important evidence rule:** a successful physical job on one run and a successful COR job on another are not interchangeable. Evidence must be bound to one authorized candidate/evidence lineage and the final release gate must validate the complete set.

## 2. Run reconciliation and colour-coded state

Legend: 🟢 pass for the exact recorded scope; 🟡 partial / in progress / evidence scope limited; 🔴 failed / blocked / not proven; ⚪ not assessed.

| Gate / capability | Current status | Verified interpretation | Required exit |
|---|---|---|---|
| Candidate CI — 40160710160 | 🟢 Scoped pass | Reported 18 configured jobs successful for candidate `1f05cccb...`. | Rerun after any affected source, workflow, dependency or policy change. |
| AWS physical qualification — 40160710161 | 🟢 Scoped pass | Job 121071472638 succeeded; physical certification, Fargate certification and residual scan completed successfully. | Preserve exact job artifacts and bind the pass to the release candidate being finalized. |
| COR Certification — 40160710161 | 🔴 Failed | Evidence-freshness step failed; downstream release integrity, signing and finalization steps skipped. | Diagnose candidate/manifest/receipt lineage and rerun on exact candidate/authorized evidence-only descendant. |
| Final release gate — 40160710161 | 🔴 Failed | Correctly blocked because not every mandatory gate succeeded. | All required gates must pass in one valid candidate lineage. |
| COR Certification — 40161212443 | 🟢 Scoped pass | Steps including evidence freshness, release integrity, trust-root check, fresh qualification and signing completed successfully. | Keep scoped until paired AWS physical gate and final release gate complete. |
| AWS physical qualification — 40161212443 | 🟡 In progress at inspection | The physical certification step was still running; no final conclusion is asserted here. | Recheck run and final gate; update this dashboard only from completed job outputs. |
| S3 tag observation | 🟢 Scoped code-path correction | NoSuchTagSet produces an empty observed set and required-tag assertion fails. No synthetic AccessDenied success response in inspected source. | Add/run negative tests for AccessDenied, missing tags, wrong transaction/run ID and provider timeout. |
| VPC pre-cleanup safety | 🟡 Residual risk | Cleanup suppresses some AWS errors and uses an incomplete ownership predicate; a clean residual scan alone does not prove all cleanup failures are surfaced. | Require run UUID + owner marker + age/lease + full manifest; never swallow failed cleanup or verification calls. |
| Live AI API canary | 🟢 Single-model canary | `https://ai.airroofers.eu` returned HTTP 200 for discovery and inference; model `sentinel-guard-v1`; 30 endpoint models reported. | Keep canary scope separate from fleet qualification and activation. |
| AI fleet activation | 🔴 Not proven | Endpoint discovery count is not a count of qualified or active models. | Real authenticated inference + signed receipt + policy approval per model. |
| Windows amd64 | 🟡 Scoped | 215/215 Node qualification tests are reported; full product lifecycle not established. | Native install/start/auth/AI/deploy/upgrade/rollback/uninstall/recovery E2E. |
| Linux amd64 | 🟡 Scoped | Thin-client/governance scope; full product lifecycle not established. | Native full lifecycle suite. |
| macOS arm64 | 🟡 Scoped | Go thin-client only in current evidence. | Full native product suite and signing/notarization where applicable. |
| Linux arm64 / macOS amd64 | 🔴 | Cross-compilation only; no native execution proof. | Native runner, all mandatory lifecycle tests, signed receipts. |
| VS Code | 🟡 Experimental | Not yet a certified IDE integration. | Versioned install/auth/AI/command/update/uninstall E2E. |
| JetBrains / Cursor / Windsurf / Neovim | 🔴 | Unsupported or unqualified in current target matrix. | Implement and qualify each or explicitly exclude from advertised support. |
| cPanel / DirectAdmin / SSH/VPS / Kubernetes / Docker | 🟡 | Full real-host/cluster lifecycle evidence not established for each claimed target. | Install, secrets, health, persistence, upgrade, rollback, recovery and teardown receipts per target. |
| GCP / Azure | 🔴 | No qualifying physical provider lifecycle evidence in reviewed scope. | Implement real adapters and qualify, or explicitly exclude. |
| Signed release publication/install | 🔴 | No reviewed evidence proves published artifact installation, upgrade, rollback and uninstall. | Publish/sign, then test the actual immutable artifact in a clean environment. |
| **Universal COR** | 🔴 **NOT GRANTED** | Run-level gate mismatch, AI fleet inactive/unproven, and OS/IDE/host matrix incomplete. | One authorized candidate lineage with every mandatory gate green and every advertised target qualified. |

## 3. F-23 — VPC quota: progress and remaining safe-cleanup requirements

### Confirmed progress

Run `40160710161` AWS physical job `121071472638` completed successfully after the VPC quota problem was addressed. The recorded steps include AWS region configuration, OIDC credentials, policy reconciliation, effective-permission verification, read-only conformance probes, physical certification, Fargate certification and residual-resource cleanup verification.

### Residual code-level concern

The inspected `server/engine-core/physical-certification.ts` defines `cleanupStaleTestVpcs(region, currentTxId)`. It selects VPCs by `tag:UgonduCOR=true`, then considers a VPC removable when its `UgonduTransactionId` exists and differs from the current transaction. It also catches describe/delete errors and continues, including a non-blocking outer catch.

This is not a sufficiently strong cleanup contract for a commercial deployment engine:

- A generic COR tag plus a different transaction ID is weaker than a unique run ownership record. A VPC may be shared by another authorized test, retained for investigation, or belong to a concurrent/older run that is not safe to delete.
- Swallowing a failed describe call can make the function proceed without knowing the inventory.
- Swallowing delete failures can leave resources behind while the routine appears to finish.
- The helper does not show a durable resource manifest/lease or an independent approval/age policy for stale-resource deletion.
- Cleanup should never be “best effort” if the result is used as COR evidence. Unknown inventory or uncertain ownership must block provisioning and certification.

### Required hardened ownership contract

Each run must have a cryptographically unique `runId` (UUID), explicit owner marker, candidate SHA, creation timestamp and lease/expiry in tags and a durable manifest. Only delete a resource when all required ownership attributes match the project's cleanup policy, the resource is not leased by an active run, and its identifier is present in that run's owned-resource inventory. If the provider cannot prove ownership, stop and emit a typed blocker.

Illustrative contract (not drop-in code; adapt to existing client/error abstractions):

```ts
type CorResourceOwnership = {
  runId: string;
  candidateSha: string;
  owner: 'ugondu-cor';
  createdAt: string;
  leaseExpiresAt: string;
};

function isSafeToCleanup(
  tags: Record<string, string>,
  expected: CorResourceOwnership,
  now: Date,
): boolean {
  return tags['UgonduOwner'] === expected.owner
    && tags['UgonduRunId'] === expected.runId
    && tags['UgonduCandidateSha'] === expected.candidateSha
    && tags['UgonduCreatedAt'] === expected.createdAt
    && tags['UgonduLeaseExpiresAt'] === expected.leaseExpiresAt
    && Date.parse(expected.leaseExpiresAt) < now.getTime();
}
```

This example illustrates the ownership policy only. The actual implementation must use a validated tag schema, UTC timestamps, durable manifest, active-run/lease check, provider-observed tags and the existing governed error/token system. Do not rely on transaction IDs alone as the authorization to delete.

### Required cleanup failure semantics

```ts
// Contract pseudocode: inventory and deletion errors are blockers, not ignored.
const inventory = await describeOwnedResources(runId); // must throw on provider error
const manifest = await loadDurableResourceManifest(runId);

assertEveryManifestResourceHasMatchingOwnership(inventory, manifest);
await deleteOnlyVerifiedRunOwnedResources(manifest);
const residual = await scanRunOwnedResources(runId); // must throw if scan is incomplete
if (residual.length !== 0) {
  throw new CorCleanupIncompleteError({ runId, residualResourceIds: residual.map(x => x.id) });
}
```

Implement against the actual repository interfaces and typed errors; this is an acceptance contract, not a claim that the pseudocode is already wired.

### Acceptance tests

- DescribeVpcs/DescribeSubnets/DescribeSecurityGroups permission denied or timeout => cleanup aborts and COR fails closed.
- Resource missing run UUID, owner marker, candidate SHA, creation timestamp or lease => never deleted automatically.
- Active lease/concurrent run => resource preserved.
- Stale, fully owned resource => deletion permitted and recorded in manifest.
- Delete failure => non-zero failure, explicit residual IDs and failure artifact.
- Final scan failure/incomplete pagination => no green cleanup result.
- Successful cleanup => independent scan confirms zero run-owned resources; unrelated VPCs remain unchanged.
- Repeat the same cleanup command => idempotent and safe.
- Concurrent runs in the same AWS account/region serialize; different accounts/regions use independent concurrency keys.

## 4. F-24 — S3 tag verification: source correction and proof still required

### Current source observation

In the current branch version of `server/engine-core/physical-certification.ts`, the `GetBucketTaggingCommand` error handling treats `NoSuchTagSet` as an empty tag set; the subsequent required-tag checks fail if `UgonduCOR=true` or the matching `UgonduTransactionId` is absent. The previously identified synthetic `AccessDenied` branch that returned fabricated expected tags is absent in the inspected source.

### Remaining acceptance criteria

1. Add direct regression tests proving AccessDenied propagates or becomes a typed fail-closed error.
2. Missing tag set, missing tag, wrong value, wrong transaction/run ID, timeout and upstream 5xx must fail.
3. Only actual provider-observed tag values can pass.
4. Test must assert that no fallback object or fixture can impersonate the SDK response in the production composition root.
5. Run these tests and the real AWS physical gate on the same candidate lineage used by final COR.
6. Confirm the test verifies both ownership tags and the candidate/run identity tags introduced by the hardened cleanup contract.

## 5. Evidence lineage — resolve the split-run state

The current evidence cannot be summarized as “all gates green”:

- In run `40160710161`, the AWS physical job passed but COR Certification failed at evidence freshness, and the final release gate failed.
- In run `40161212443`, COR Certification passed including evidence freshness and signing steps, while AWS physical qualification was still in progress at inspection time.

The required next action is to inspect the completed status of run `40161212443`, including the AWS physical job and final gate. If either fails, diagnose and rerun. If both pass, verify the final run's exact candidate SHA, evidence manifest, receipt digests, and candidate-to-evidence-descendant diff. An earlier physical pass cannot be silently carried across a source change.

The evidence-only descendant must contain only explicitly permitted evidence/manifest changes. If source, workflow, policy or dependency files changed between candidate and descendant, freshness must fail and the affected qualification must rerun.

## 6. AI activation — dynamic discovery is not model activation

### Observed live canary receipt

The committed receipt records:

- Endpoint: `https://ai.airroofers.eu`
- Discovery HTTP status: `200`
- Execution HTTP status: `200`
- Model executed: `sentinel-guard-v1`
- Endpoint-available model count: `30`
- Verification: `AUTHENTIC_LIVE_INFERENCE_QUALIFIED`
- Receipt candidate SHA: `1f05cccb4a0148a91ec2f177dd0ecd5af11e7b82`

This is meaningful evidence for one model's live inference on that receipt's candidate. It does not prove that all 30 models are present in the governed catalog, eligible for the same data classes/regions, tested, approved, or active.

### Required model lifecycle

1. Authenticate to the API using secrets injected by the approved secret manager; never commit keys, tokens or credentials.
2. Discover models dynamically; validate schema, model ID uniqueness, endpoint identity, capabilities and version/expiry.
3. Reconcile discovery against the governed registry. Unknown models remain disabled by default.
4. For each policy-eligible model, run real authenticated inference with privacy-safe test inputs and a bounded timeout.
5. Verify TLS/endpoint policy, request ID, response schema, output digest, model identity, region/data classification, quota/cost and provider policy.
6. Produce a signed receipt bound to candidate SHA, model ID/version, provider request ID, policy version, endpoint host, timestamp and output digest.
7. Apply an explicit approval policy before moving a model to `ACTIVE`; no status may be manually edited to simulate a successful test.
8. Reconcile state counts from the receipt inventory: discovered, eligible, tested, qualified, approved, active, disabled, failed and revoked.
9. Test 401/403, unknown model, 404, 429, 5xx, timeout, DNS/TLS failure, cancellation, malformed response, duplicate IDs, replay, stale SHA, revoked key, signature tampering, tenant isolation, region policy, budget exhaustion and secret redaction.
10. On model removal, credential expiry, policy change or receipt expiry, disable routing until the model is requalified.

### Model status policy

| State | Meaning | May receive production traffic? |
|---|---|---|
| Discovered | API reports model exists | No |
| Eligible | Catalog and policy permit evaluation | No |
| Tested | Live inference evidence exists | No, pending qualification/approval |
| Qualified | All technical and policy gates passed with valid receipt | Only after explicit approval |
| Active | Approved, fresh receipt and policy checks are valid | Yes, within authorized scope |
| Disabled / Failed / Revoked / Expired | Any mandatory requirement is unmet | No |

The canary must remain separate from fleet activation. If credentials or provider access are absent, report `BLOCKED` or `CATALOG_OFFLINE`; never fabricate qualified/active counts.

## 7. Platform/OS/IDE/host universality

Universal support is a claim about a versioned support contract, not a desire to run everywhere. Each target must have an exact target identity (OS, architecture, runtime, version, host/IDE/provider version), an immutable candidate SHA, test logs, signed evidence, and a complete lifecycle test.

| Target family | Current certification colour | Mandatory exit evidence |
|---|---|---|
| Windows amd64 | 🟡 | Full product lifecycle; 215/215 tests are scoped Node qualification only. |
| Linux amd64 | 🟡 | Native full product lifecycle, not only thin-client/governance. |
| macOS arm64 | 🟡 | Native full product lifecycle and signing/notarization where applicable. |
| Linux arm64 | 🔴 | Native execution and full lifecycle; cross-build is insufficient. |
| macOS amd64 | 🔴 | Native Intel execution and full lifecycle or formal exclusion from support. |
| VS Code | 🟡 | Supported-version extension install, authentication, command, AI, update and uninstall E2E. |
| JetBrains | 🔴 | Real plugin implementation and compatibility tests or explicit exclusion. |
| Cursor | 🔴 | Cursor-specific integration proof; do not infer from VS Code. |
| Windsurf | 🔴 | Windsurf-specific integration proof or explicit exclusion. |
| Neovim | 🔴 | CLI/LSP lifecycle, diagnostics, authentication and command E2E or explicit exclusion. |
| AWS ECS/Fargate eu-west-3 | 🟡 | One physical job passed, but complete final run lineage still needs closure; include failure cleanup. |
| cPanel / DirectAdmin | 🟡 | Disposable real host: deploy, secrets, health, persistence, upgrade, rollback, uninstall. |
| SSH/VPS | 🟡 | Native distro/init-system matrix, recovery and rollback. |
| Kubernetes | 🟡 | Real cluster install, secrets, probes, storage, network policy, upgrade, rollback and teardown. |
| Docker | 🟡 | Runtime lifecycle on every advertised host, not compose schema/build only. |
| GCP / Azure | 🔴 | Real adapters and physical qualification or explicit non-support. |
| Published release | 🔴 | Immutable signed artifact, clean install, upgrade, rollback and uninstall from that artifact. |

To claim universality, either qualify every target advertised as supported or narrow the public support matrix to the subset proven by fresh evidence. Fail-closed rejection of an unsupported target is a security pass, not a support pass.

## 8. UAIGOS 3.0.0 and Air Roofers product-integration controls

### Zero operational hardcoding

- Provider/model inventories, supported target lists, mutable endpoint configuration, environment-specific IDs, quotas/retry budgets, tenant/product allowlists and user-visible text must come from validated registries, configuration or localization tokens.
- Security invariants (e.g. the AI anti-SSRF host allowlist) may remain code-level constants only when formally documented, threat-modelled, change-controlled and covered by negative tests. Do not make endpoints arbitrarily configurable in a way that enables SSRF.
- Scan source, build output and package exports; fail CI on unregistered strings, stale duplicated registries and unknown capabilities.

### Zero production mocks/stubs/scaffolding/partial implementations

- Production composition roots must instantiate concrete provider transports; test doubles must be isolated in test-only packages and excluded from release bundles.
- Reject no-op handlers, placeholder returns, fake progress, default-success fallbacks, synthetic provider observations, silent catches and “TODO but success” branches.
- Scan source and emitted artifacts, then test reachable dependency graphs and runtime composition. Static scans alone do not prove the absence of every stub.
- Every required operation must either execute fully or return a typed, observable failure. “Not implemented”, missing credentials and unsupported provider must be visible and block certification.
- No UI/CLI/dashboard may claim a target is supported unless its target-specific lifecycle receipt exists.

### Evidence integrity and regression prevention

- Bind every result to candidate SHA, workflow run/job, target identity, configuration and dependency digests, test command, raw log/artifact digest, timestamp, policy version and signature.
- Evidence-only descendants may change only approved evidence files. Any relevant source/config/workflow/dependency change invalidates affected receipts.
- Dashboard states must be derived from machine-readable evidence and must reject stale SHAs, skipped mandatory gates, incomplete manifests and manually greened rows.
- Require independent post-run cleanup scans, not just a successful rollback message.
- Keep personal data and secrets out of evidence artifacts; redact prompts, outputs and credentials where required.

## 9. Exact verification sequence

Run in a clean checkout of the final candidate. Commands below are a proposed execution sequence; verify each script exists in the target SHA before relying on it and preserve each exit code:

```bash
set -euo pipefail
git status --short
git rev-parse HEAD
npm ci
npm run build --workspaces --if-present
npm run lint --workspaces --if-present
npm run typecheck --workspaces --if-present
npm test --workspaces --if-present
node scripts/validate-locales.js
node scripts/governance/validate-repository.mjs
node scripts/governance/verify-policy-pack-digests.mjs
node scripts/governance/verify-evidence-freshness.mjs
node --test tests/qualification/ai-barrel-export-qualification.test.js
node --test tests/qualification/model-lifecycle-qualification.test.js
node --test tests/qualification/model-lifecycle-adversarial-qualification.test.js
```

Then:
1. Run F-24 negative tests and cleanup adversarial tests.
2. Run live AI model qualification using authorized credentials and produce per-model receipts; do not change model status by hand.
3. Run physical AWS lifecycle under account/region serialization, with quota preflight, durable run-owned resource manifest, safe rollback and independent residual scan.
4. Complete the COR release workflow and inspect every required job, including the final gate.
5. Verify candidate/descendant diffs and manifest hashes; reject any source drift disguised as an evidence-only descendant.
6. Run native lifecycle suites for every advertised OS/architecture/IDE/host.
7. Publish/sign the immutable release, then install/upgrade/rollback/uninstall that exact artifact in a clean environment.
8. Regenerate the dashboard from verified evidence. Any missing, stale, failed or skipped mandatory gate prevents Universal COR.

Do not run destructive cleanup against shared/customer infrastructure without exact run ownership and explicit authorization.

## 10. Immediate action order

1. **P0 — Close current run 40161212443:** check AWS physical job and final gate completion. Record the final result only after the jobs terminate.
2. **P0 — Resolve run lineage:** reconcile why run 40160710161 physical qualification passed while evidence freshness failed. Ensure one final candidate lineage has both fresh COR and AWS physical passes.
3. **P0 — Harden VPC cleanup:** unique run UUID + owner + candidate SHA + timestamp/lease + durable manifest; no swallowed inventory/deletion errors; fail closed on unknown ownership.
4. **P0 — Prove F-24:** negative tests for AccessDenied, missing/wrong tags, stale transaction/run ID, timeout and provider error, then real physical qualification.
5. **P0 — AI fleet qualification:** per-model live inference receipts, policy approval and verified activation state. A 30-model discovery count is not activation.
6. **P1 — Native/IDE/host matrix:** implement and test each advertised target, or narrow the published support promise.
7. **P1 — Signed commercial release:** publish the artifact and run install/upgrade/rollback/uninstall E2E.
8. **P1 — Machine-generated dashboard:** enforce evidence freshness and no-regression checks in CI.

## 11. Final certification decision

**Current state: QUALIFIED WITH BOUNDED TARGET SUPPORT — UNIVERSAL COR NOT GRANTED.**

Progress is real: candidate CI is reported green, a physical AWS gate passed in run `40160710161`, the S3 synthetic-success defect has been corrected in the inspected source path, and COR certification passed in run `40161212443`. But these successes do not yet form a single verified complete release run: run `40160710161` failed evidence freshness/final release, and run `40161212443` had an AWS physical job still running at inspection time.

The product must not be marked universally green until the latest run's physical and final gates finish successfully, cleanup safety is hardened, AI models are individually qualified and approved, every advertised OS/IDE/host has full lifecycle proof, and the signed published artifact is installation-tested.