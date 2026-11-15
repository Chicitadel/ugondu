# Ugondu Re-audit Handover — Policy-Pack Template Path Containment

**Finding ID:** UG-COR-SEC-012  
**Severity:** High — signed policy-pack integrity boundary  
**Repository:** https://github.com/Chicitadel/ugondu  
**Implementation branch:** `fix/cor-policy-pack-path-containment-production-base-2026-10-26`  
**Base branch:** `phase4/production-hardening`  
**Status:** Code and regression tests committed; workflow execution pending; no certification claim.

## Confirmed defect

`scripts/governance/verify-policy-pack-digests.mjs` extracted `templatePath` values from `pack.yaml` and used `path.join(baseDir, rel)` to read each referenced file without proving the path remained inside the policy-pack root. A crafted manifest could reference a parent directory or an absolute path. A symlink placed inside the pack could also point to content outside the pack. The verifier could then hash content outside the intended trust boundary and include it in the signed digest.

## Direct code remediation

- Added `resolvePolicyTemplatePath(baseDir, relativePath)`.
- Rejects empty, non-string, and absolute paths.
- Uses canonical path resolution and `path.relative` to reject lexical traversal and references to the pack root itself.
- Uses `realpathSync` containment to reject symlink escapes.
- Requires the resolved target to be a regular file.
- Updated `verifyPolicyPack` to fail closed and report an invalid template path rather than reading external content.

## Regression tests and CI wiring

Added `tests/policy-pack-path-containment.test.mjs` for:
1. Valid nested file within a policy pack.
2. Parent traversal rejection.
3. Absolute path rejection.
4. Missing file rejection.
5. Symlink to external file rejection (skipped only if the runner cannot create symlinks due to platform permissions).

Added `npm run test:policy-pack-boundary` and wired it as a mandatory step in `.github/workflows/ci.yml` before the externally pinned policy-pack signature check.

## Required verification

**Local isolated logic check:** Node.js v22.16.0 executed a temporary fixture harness containing the same resolver logic and three cases (valid contained file; traversal/absolute/missing/root references; symlink escape): **3 passed, 0 failed, 0 skipped**. This is a focused logic check, not a substitute for running the committed repository test file and complete CI against the candidate SHA.

Run against the exact PR head:

```bash
npm ci
npm run test:policy-pack-boundary
node scripts/governance/verify-policy-pack-digests.mjs
npm run governance:validate
npm run test:security
npm run test:integration
```

Capture exit codes, logs, workflow URLs, exact SHA and any skipped checks. The committed repository test file and full repository suites have not yet been executed locally. GitHub Actions COR run 40244796251 and CI run 40244796289 were observed in progress for candidate `bceb9ae65b96650b38fba2afd963bbade14f6b9f`; the finding remains YELLOW until the committed test and required gates pass on the exact final head. Do not rewrite or reuse older receipts as evidence for this commit.

## Antigravity agent guardrails

- Read `docs/governance/ANTIGRAVITY_CHANGE_GUARDRAIL.md` before changing code.
- Do not modify `master` or `phase4/production-hardening` directly.
- Do not add a second path-containment helper; reuse `resolvePolicyTemplatePath` for this contract after checking module boundaries.
- Do not loosen the boundary, follow external symlinks, or accept missing files to preserve a green status.
- Do not change the policy digest/signature protocol as part of this finding. Any protocol change requires an ADR, compatibility plan and independent review.
- Keep this PR draft until the exact candidate passes the mandatory workflow and receives independent review.

## Release disposition

This is a targeted security boundary fix, not universal COR certification. AI model fleet, live AWS lifecycle, non-AWS providers, native OS/IDE/hosting targets and immutable customer artifact lifecycle remain separately gated until authentic candidate-bound evidence exists.
