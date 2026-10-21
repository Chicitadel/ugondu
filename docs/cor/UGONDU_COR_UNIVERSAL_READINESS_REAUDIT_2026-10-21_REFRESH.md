# Ugondu COR Re-audit — Universal Platform Readiness
- Date: 2026-10-21
- Repository: https://github.com/Chicitadel/ugondu
- Baseline: phase4/production-hardening
- Candidate SHA observed in PR #3 metadata: 7003775ceb4eaea69dbc220fcb0f94deb2d7d7e0
- Decision: 🔴 **UNIVERSAL COR NOT CERTIFIED**
- Scope: current workflow and test source review plus observed job-level results. This is not live qualification of every advertised platform.

## 1. Executive findings

The workflow contains exact-SHA checkout/clean-tree assertions, tagged-only AWS role assumption, and a final release gate dependent on the COR job and AWS physical gate. Run 39529554197 shows the COR job succeeded, AWS physical qualification failed at tagged role assumption, and the final release gate failed. This is evidence that release was withheld, not evidence of successful AWS qualification.

**New P0 finding:** the COR job runs “Sign final COR authority” before the separate AWS physical gate completes. A signed authority artifact may be produced even if a mandatory physical gate later fails. Move authoritative signing after every mandatory gate, or make the earlier artifact explicitly provisional and non-authoritative.

**Evidence integrity:** PR #3 reports head SHA 7003775ceb4eaea69dbc220fcb0f94deb2d7d7e0. Earlier audit PR #9 was based on prior base SHA 89b23bf60c6f0015c2cc0feaa063ec402c82d9af and reported non-mergeable. Do not combine evidence across SHAs without verified ancestry and an exact-SHA manifest.

## 2. Colour-coded progress register

Legend: 🟢 bounded evidence for exact tested candidate/scope; 🔵 implemented guardrail but not fully qualified; 🟡 partial evidence; 🔴 blocked/failing; ⚪ not assessed. Status never transfers to another SHA or untested target tuple.

| Zone / feature / level | State | Evidence and exit condition |
|---|---|---|
| Exact-SHA checkout and clean-tree assertions | 🟢 | Present in .github/workflows/cor.yml; rerun on release candidate. |
| COR build, locale, I18N, typecheck, workspace tests | 🟢 | Run 39529554197 reports COR job steps successful; exact-run scope only. |
| Tagged AWS assumption has no untagged fallback | 🔵 | Guard present; live assumption failed in recorded run. |
| Final gate depends on COR and AWS physical gate | 🔵 | Source/test present; recorded gate failed closed. |
| Final signing downstream of every mandatory gate | 🔴 | Signer currently runs inside COR job before AWS gate completes. |
| AWS OIDC trust, sts:TagSession and execution-role trust | 🔴 | Run 39529554197 failed at Assume Tagged Execution Session. |
| AWS read-only probes | 🔴 | Skipped in recorded run. |
| AWS physical deployment / Fargate | 🔴 | Skipped in recorded run. |
| AWS rollback / teardown / zero-residual proof | 🔴 | Cleanup verification skipped. |
| Candidate SHA reconciliation | 🟡 | Earlier audit branch base is stale; require one immutable manifest. |
| Workflow guard tests | 🟢 | Invoked in successful COR job; custom YAML parser is layout-dependent. |
| Full-history secret scanning | 🟡 | Checklist claims 445 commits / 4,469 files; not freshly independently verified here. |
| Locale key parity / 12 locales | 🟡 | Checklist reports parity; current full evidence not re-run here. |
| Signed language/policy packs | 🟡 | Prior checklist reports tests; rotation/revocation runtime behavior not proven. |
| DirectAdmin adapter isolation | 🟡 | Dedicated adapter reported; live API/auth/recovery not evidenced here. |
| cPanel adapter | 🟡 | Does not qualify all versions/plans/quotas/API permissions. |
| Go thin-client matrix: Windows amd64, Linux amd64/arm64, macOS amd64/arm64 | 🟢 | Historical CI only for those five targets. |
| Other OS versions, architectures, shells, runtimes | ⚪ | Native evidence required per advertised tuple. |
| Docker/Compose and Kubernetes/Helm live mutation | 🟡 | Some checks reported; live lifecycle/rollback/cleanup unproven. |
| AWS, Azure, Google Cloud, OCI and other clouds | ⚪ | Qualify each implemented provider separately. |
| VPS, dedicated, private host, bare metal | ⚪ | Capability and lifecycle qualification missing. |
| cPanel, DirectAdmin, Plesk, shared-host plans | ⚪ | Each requires independent plan/version qualification. |
| UI, terminal/CLI, API and IDE entry points | ⚪ | End-to-end policy/authorization parity unproven. |
| Model-assisted and model-free execution | ⚪ | Must prove same policy/approval behavior with or without models. |
| Fine-grained execution / approvals | ⚪ | Per-action authorization, immutable plan and audit proof missing. |
| Automation / retries / resume / recovery | ⚪ | Idempotency, durable state, replay defense and recovery evidence missing. |
| Accessibility and multi-locale runtime UX | 🟡 | Static locale checks do not prove screen-reader, keyboard, contrast, responsive or translated runtime parity. |
| Overall universal COR | 🔴 | Withheld. |

## 3. Evidence and source snapshots

Workflow: .github/workflows/cor.yml, fetched blob SHA b810e2112cef32a6516855148843d5424e94d3f8.

Tagged-only assumption snapshot:

~~~bash
set -euo pipefail
if [ -z "${EXECUTION_ROLE_ARN}" ]; then
  echo "::error::AWS_EXECUTION_ROLE_MISSING: execution role is not configured."
  exit 1
fi
CREDS=$(aws sts assume-role \
  --role-arn "$EXECUTION_ROLE_ARN" \
  --role-session-name "$TX_ID" \
  --tags "Key=UgonduTransactionId,Value=$TX_ID" "Key=UgonduCOR,Value=true" \
  --query 'Credentials.[AccessKeyId,SecretAccessKey,SessionToken]' \
  --output text)
~~~

No untagged fallback appears in the snapshot; live AWS assumption still fails.

Premature signing snapshot from the COR job:

~~~yaml
      - name: Independently finalize COR
        run: node scripts/cor-finalize.js

      - name: Sign final COR authority
        if: github.event_name != 'pull_request'
        run: node scripts/cor-signer.js
~~~

AWS is a separate job, so signing is not gated by the AWS result.

Run 39529554197: COR job success; AWS Assume Tagged Execution Session failure; AWS probes, physical certification, Fargate and cleanup steps skipped; final release gate failure. https://github.com/Chicitadel/ugondu/actions/runs/39529554197

Guard test: tests/qualification/cor-workflow-gates.test.js, fetched blob SHA 8a833d64090eeef970ff212b2fd0faf14241e005. It checks tagged-only assumption, identity verification, ordering and final-gate dependencies. Its custom YAML reader is layout-dependent; add mutation tests for reordered, renamed, duplicated, nested and altered-condition jobs or use a maintained YAML parser.

## 4. Remediation priority

### P0-1 — Authoritative signing after all gates
- Remove scripts/cor-signer.js from the COR job.
- COR job produces unsigned provisional evidence only.
- A final gate checks every mandatory child job.
- A separate signer job depends on COR, AWS physical gate and final gate, and requires all to be success.
- Verify full SHA, same-run artifact digests, policy signatures, evidence freshness and target tuple before signing.
- Pull-request runs must never issue production authority.
- Add negative tests for failed, skipped, cancelled, missing and wrong-SHA evidence.

Proposed design only (not implemented):

~~~yaml
  cor-final-release-gate:
    if: always()
    needs: [cor, aws-physical-gate]
    runs-on: ubuntu-latest
    steps:
      - name: Require every mandatory gate to have succeeded
        env:
          COR_RESULT: ${{ needs.cor.result }}
          AWS_RESULT: ${{ needs.aws-physical-gate.result }}
        shell: bash
        run: |
          set -euo pipefail
          test "$COR_RESULT" = "success"
          test "$AWS_RESULT" = "success"

  sign-final-authority:
    needs: [cor, aws-physical-gate, cor-final-release-gate]
    if: github.event_name != 'pull_request' && needs.cor.result == 'success' && needs.aws-physical-gate.result == 'success' && needs.cor-final-release-gate.result == 'success'
    runs-on: ubuntu-latest
    steps:
      - name: Checkout exact candidate
        uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
        with:
          ref: ${{ github.sha }}
          fetch-depth: 0
      - name: Verify exact candidate
        run: |
          set -euo pipefail
          test "$(git rev-parse HEAD)" = "$GITHUB_SHA"
          test -z "$(git status --porcelain)"
      - name: Verify candidate evidence
        run: node scripts/release/verify-evidence-bundle.mjs --verify
      - name: Sign final authority
        run: node scripts/cor-signer.js
~~~

Validate actual artifact handoff and permissions before implementation. Remove the old signing step; do not duplicate it.

### P0-2 — AWS live qualification
1. Configure OIDC trust with narrow subject/audience.
2. Grant sts:AssumeRole and sts:TagSession only to the intended workflow principal/role.
3. Keep tagged assumption mandatory; verify caller identity and transaction tags before mutation.
4. Run read-only probes, then deploy on an approved disposable target.
5. Test health checks, fault injection, rollback, teardown and independent residual-resource scan.
6. Bind evidence to full SHA, workflow run, transaction ID, region, target tuple and artifact digest.
7. If IAM trust is unavailable, remain blocked; do not substitute mocks.

### P0-3 — Exact-SHA evidence
Create a manifest containing full SHA, repository, workflow/run IDs, target tuple, command, exit code, artifact SHA-256, signer identity and timestamp. Reject stale, incomplete, cross-commit or unsigned evidence. Re-run mandatory workflows after source changes.

### P1 — Target/provider/host qualification
Declare every actually supported target: AWS, Azure, Google Cloud, OCI and other registered providers; VPS/dedicated/private/bare-metal; Docker/Compose; Kubernetes/Helm; cPanel, DirectAdmin, Plesk and specific shared-host plans. For each record adapter/version, OS/version/architecture, runtime, permissions, capabilities, install/upgrade/health/rollback/uninstall/cleanup results, exact SHA and native evidence. A matrix row is not runtime evidence. Shared hosting must detect missing capabilities and fail safely before mutation.

### P1 — Entry points, model modes, execution safety
Route UI, CLI, API, IDE and automation through the same authorization, planning and approval engine. Model outputs are untrusted proposals and cannot grant privileges. Model-free mode must support deterministic workflows. Compare plan digests, permission decisions, approvals and audit events across modes. Test model outage, malformed output, prompt injection, rate limits and provider deprecation. Use durable typed state, idempotent actions, transaction IDs, replay protection, dry-run, per-action approvals, cancellation, pause/resume, bounded retries and rollback.

### P1 — Localization, accessibility and zero hardcoding
Tokenize user-facing text and errors; validate locale parity, pluralization, interpolation, RTL, fallback and pack expiry/signature. Test keyboard-only navigation, screen readers, contrast, zoom/reflow and responsive UI. Replace embedded regions, IDs, ports, paths and provider assumptions with validated configuration/registries.

## 5. Certified-boundary protection

Every certified zone needs stable ID, owned paths/interfaces, exact SHA, dependencies, threat model, test suite, target tuple, evidence digest, expiry/revalidation triggers and mutation allowlist. Changes to owned paths, public contracts, dependencies, policies, workflow, runtime, signing key or adapter invalidate affected zones and dependants. Unrelated zones should not be rerun unless dependency analysis shows impact. Security fixes are never blocked: require a change record and affected-zone regression. Never transfer green status across SHAs or target tuples.

## 6. Parallel workstream plan

No independent subagents were spawned in this audit. Proposed ownership:

| Workstream | Boundary | Exit criterion |
|---|---|---|
| A. COR signing/gates | Workflow, signer and gate tests | Signing after all gates; negative mutation tests pass |
| B. AWS | AWS conformance/physical scripts | Tagged OIDC, probes, lifecycle, rollback, zero residual |
| C. Evidence | Manifest and bundle verifier | Results bound to exact SHA/target |
| D. Cloud/host adapters | Target adapter modules | Capability, plan, apply, rollback, cleanup per provider |
| E. OS/runtime | CI workflows and target declarations | Native evidence per declared tuple |
| F. Execution safety | Shared engine, approvals, durable state | Fine-grained and automation failure tests pass |
| G. Entry-point/model parity | UI/CLI/API/IDE and parity tests | Same policy and approval semantics |
| H. Localization/accessibility | Tokens, packs and accessibility tests | Supported locales/UI checks pass |
| I. Independent review | Audit/evidence only | Evidence independently verified |

Use separate branches, explicit file ownership, small changes, no concurrent writes to shared files, no force-push/auto-merge, and approved modification records for frozen zones. Integrate P0 first, then target adapters and OS, then parity/localization/accessibility, then independent review.

## 7. Release exit criteria

All mandatory checks must pass on the same SHA; AWS physical lifecycle and zero-residual evidence must exist; every advertised target tuple must be qualified; signer must consume verified same-run evidence; and independent review must approve.

**Final decision: 🔴 NOT CERTIFIED.**
