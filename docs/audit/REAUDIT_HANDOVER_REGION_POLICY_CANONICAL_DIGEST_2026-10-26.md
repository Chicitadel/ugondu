# Ugondu Re-audit Handover — Region Policy Renderer and Canonical Digest

**Finding IDs:** UG-COR-POLICY-REGION-001 / UG-COR-POLICY-DIGEST-001  
**Implementation branch:** fix/region-policy-canonical-digest-2026-10-26  
**Base:** phase4/production-hardening at 87ac04242b4d55f38b4ef644549cea9ff38f57c7  
**Release disposition:** Universal COR / universal commercial release remains **NOT CERTIFIED**.

## Confirmed gaps and remediation

1. RegionPolicyRenderer validated regions with a pattern that rejected partitioned/multi-segment AWS region identifiers such as us-gov-west-1.
2. When multiple allowed regions were configured, Resource tokens expanded across all regions but an aws:RequestedRegion condition token was replaced only with the first region, creating inconsistent scope behavior.
3. RegionPolicyRenderer.documentSha256 hashed pretty-printed JSON bytes, while CanonicalPolicyRegistry.computePolicyDigest uses recursive canonical JSON. Equivalent nested policies with different object key order could therefore receive inconsistent digests across the two code paths.

## Direct code changes

- Expanded syntax validation to accept AWS region identifiers with multiple alphanumeric segments; this validates naming syntax only and does not claim that a region exists or is enabled in an account.
- Expanded aws:RequestedRegion token values to the explicit allowedRegions list when more than one region is configured, consistent with the existing multi-region Resource expansion.
- Reused computePolicyDigest from CanonicalPolicyRegistry for the renderer's documentSha256 so both paths share the existing canonical digest authority.
- Added regression tests for us-gov-west-1, multi-region Resource and RequestedRegion alignment, and nested-key-order canonical digest parity.

## Verification commands

    npm --workspace=server/capabilities test -- --runInBand src/tests/region-policy-renderer.spec.ts
    npm run test --workspaces
    npm run build --workspaces

Exact-head CI must pass before the finding is accepted. Local repository execution was not available through the connected GitHub interface.

## Antigravity anti-drift requirements

- Do not add a competing digest implementation; use CanonicalPolicyRegistry.computePolicyDigest as the canonical authority.
- Preserve explicit allowedRegions and fail closed when no region is supplied; do not silently default to eu-west-3.
- Keep region syntax validation distinct from live region-availability qualification.
- Any change to IAM condition semantics requires negative and positive policy-rendering tests.
- Bind all evidence to the exact candidate SHA and preserve the current protected production baseline.

## Remaining gaps

This patch does not remove account/region pinning from the signed AWS policy pack or prove cross-account/region live AWS lifecycle qualification. AI fleet qualification, provider/OS/IDE/host matrix, and immutable artifact lifecycle evidence also remain open. Universal COR remains **NOT CERTIFIED**.
