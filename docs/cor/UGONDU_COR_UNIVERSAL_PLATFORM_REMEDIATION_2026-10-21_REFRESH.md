# Ugondu Universal Platform Remediation Plan — COR
- Date: 2026-10-21
- Baseline candidate: 7003775ceb4eaea69dbc220fcb0f94deb2d7d7e0
- Status: 🔴 Remediation required; not a certification record.
- Audit: [Re-audit](./UGONDU_COR_UNIVERSAL_READINESS_REAUDIT_2026-10-21_REFRESH.md)
- Sign-off: [Withheld sign-off](./UGONDU_COR_UNIVERSAL_READINESS_SIGN_OFF_2026-10-21_REFRESH.md)

## P0 — Signing order

File: .github/workflows/cor.yml. The current COR job finalizes and signs authority before the AWS physical job concludes. Remove the signer step from the COR job; produce unsigned provisional evidence. Make a separate signer job depend on COR, AWS physical gate and final release gate. Require all results to equal success, exact SHA equality, clean checkout, same-run evidence digests, verified policy signatures and target tuple. Pull requests must not sign production authority. Test failure, skipped, cancelled, missing and wrong-SHA conditions.

Proposed design only; not yet applied:

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

Validate the actual artifact handoff and permissions before implementation. Remove the old signing step; do not duplicate it.

## P0 — AWS physical qualification
1. Configure narrow OIDC subject/audience trust.
2. Grant sts:AssumeRole and sts:TagSession only to the intended workflow principal and approved role.
3. Keep tagged assumption mandatory; verify caller identity and transaction tags before mutation.
4. Run read-only probes then physical tests in an approved disposable target.
5. Test deploy, health, fault injection, rollback, teardown and independent zero-residual scan.
6. Bind evidence to SHA, run ID, transaction ID, region, target tuple and digest.
7. If IAM trust is unavailable, remain blocked; never substitute mocks.

## P0 — Candidate evidence
Create a manifest containing full SHA, repository, workflow/run IDs, target tuple, command, exit code, artifact SHA-256, signer identity and timestamp. Reject stale, incomplete, cross-commit or unsigned evidence.

## P1 — Universal target registry
For each actually supported cloud (AWS, Azure, Google Cloud, OCI and other registered providers), VPS/dedicated/private/bare-metal, Docker/Compose, Kubernetes/Helm, cPanel, DirectAdmin, Plesk and specific shared-host plans, record adapter/version, OS/version/architecture, runtime, permissions, capabilities, install/upgrade/health/rollback/uninstall/cleanup results, exact SHA and native evidence. Matrix declarations are not runtime evidence. Detect unsupported shared-host capabilities and fail before mutation.

Example schema (illustrative only, not real evidence):

~~~json
{
  "targetId": "provider-host/adapter/os/arch/runtime",
  "provider": "explicit-provider-id",
  "adapterVersion": "semver",
  "os": {"name": "explicit-os", "version": "explicit-version", "architecture": "explicit-arch"},
  "entryPoints": ["ui", "cli", "api", "ide"],
  "modelModes": ["model-free", "model-assisted"],
  "executionModes": ["fine-grained", "automated"],
  "capabilitiesRequired": ["explicit-capability-ids"],
  "qualificationEvidence": {
    "candidateSha": "full-40-character-sha",
    "workflowRunId": "required-run-id",
    "artifactDigest": "sha256:required-digest"
  },
  "status": "unqualified"
}
~~~

## P1 — Entry points, model modes and execution
UI, CLI, API, IDE and automation must use the same authorization/planning/approval engine. Model output is an untrusted proposal and cannot grant privileges. Model-free deterministic workflows remain usable. Compare plan digests, permissions, approvals and audit events. Use durable typed state, idempotency, transaction IDs, replay protection, dry-run, per-action approvals, cancellation, pause/resume, bounded retries and rollback.

## P1 — Localization, accessibility and zero hardcoding
Tokenize user-facing strings/errors; validate locale parity, pluralization, interpolation, RTL, fallback and pack expiry/signature. Test keyboard, screen reader, contrast, zoom/reflow and responsive UI. Move regions, IDs, ports, paths and provider assumptions into validated config/registries.

## Certified-boundary controls
Every zone needs ID, owned paths/interfaces, exact SHA, dependencies, threat model, tests, target tuple, evidence digest, expiry/revalidation triggers and modification allowlist. Dependency changes invalidate affected downstream zones. Avoid unrelated revalidation, but never block security fixes; require change record and affected-zone regression.

## Parallel workstreams
No independent subagents were spawned in this documentation pass. Proposed owners: A COR signer/gates; B AWS; C evidence; D provider/host adapters; E OS/runtime matrix; F execution safety; G UI/CLI/API/IDE and model parity; H localization/accessibility; I independent evidence review. Separate branches and file ownership; no concurrent writes to shared files, force-push or auto-merge. Integrate P0 first.

## Exit criteria
Same-SHA mandatory gates green; live AWS lifecycle and zero-residual proof; evidence for every advertised target tuple; signing after all gates; parity, security, locale and accessibility tests pass; independent approval. Until then 🔴 NOT CERTIFIED.
