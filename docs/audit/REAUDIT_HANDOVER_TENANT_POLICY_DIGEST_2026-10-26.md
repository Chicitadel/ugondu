# Ugondu Re-audit Handover — Tenant Policy Digest Stub

**Finding ID:** UG-COR-IMPL-001  
**Date:** 2026-10-26  
**Implementation branch:** fix/tenant-policy-digest-stub-2026-10-26  
**Base:** phase4/production-hardening at 87ac04242b4d55f38b4ef644549cea9ff38f57c7  
**Scope:** server/engine-core tenant policy digest utility  
**Release disposition:** Universal COR / universal commercial release remains **NOT CERTIFIED**.

## Confirmed defect

The production baseline implementation at server/engine-core/src/tenant/policy/digest.ts returned the literal string digest-hash for every input. Different policy contents therefore received the same value, so this method could not provide integrity, drift detection, or a cryptographic fingerprint.

## Direct remediation

- Replaced the placeholder with SHA-256 using Node's crypto module.
- Valid JSON strings and JSON-compatible objects use the already-declared canonicalize dependency (RFC 8785 canonical JSON) so nested key order and insignificant JSON whitespace do not change the digest.
- Buffer inputs are hashed as exact bytes; non-JSON text strings are hashed as exact UTF-8 content.
- Unsupported values fail closed through typed error codes rather than embedding raw user-facing English strings in the utility; callers should map those codes through the localization layer.
- Added digest.spec.ts tests for a 64-character SHA-256 result, recursive key-order invariance, JSON-string whitespace/order invariance, content sensitivity, literal text, unsupported values, and Buffer bytes.
- The test is discovered by the existing engine-core Jest configuration and the root all-workspaces test command.

## Verification

Run from repository root:

    npm --workspace=server/engine-core test -- --runInBand src/tenant/policy/digest.spec.ts
    npm run test --workspaces
    npm run build --workspaces

Local repository execution was not available through the connected GitHub interface. Exact-head CI must run and pass before the finding is marked accepted. Do not claim test PASS based only on test source inspection.

## Antigravity guardrails

- Keep this fix isolated until reviewed; do not overwrite the digest contract or replace canonicalization with a constant, weak hash, or JSON.stringify without recursive key sorting.
- If callers require a different contract for Buffer or text input, add explicit contract tests and version the API rather than silently changing digest semantics.
- Keep the canonicalize dependency in the existing engine-core workspace; do not introduce a cross-workspace import or duplicate a shared policy registry.
- Preserve deterministic output and fail-closed handling of unsupported input.
- Bind all test evidence to the exact candidate SHA.

## Remaining gaps

This closes only the confirmed constant-digest implementation. It does not close the AWS bootstrap, signed policy-pack account/region portability, region renderer compatibility, AI fleet, provider/OS/IDE/host matrix, or immutable artifact lifecycle findings. Universal COR remains **NOT CERTIFIED**.
