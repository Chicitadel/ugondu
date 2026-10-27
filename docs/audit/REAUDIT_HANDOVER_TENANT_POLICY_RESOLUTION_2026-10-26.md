# Ugondu Re-audit Handover — Tenant Policy Resolver and Impact Analysis

**Finding IDs:** UG-COR-IMPL-002 / UG-COR-IMPL-003  
**Implementation branch:** fix/whole-product-cor-remediation-2026-10-25  
**Scope:** engine-core tenant policy resolution and policy change impact analysis  
**Release disposition:** Universal COR / universal commercial release remains **NOT CERTIFIED**.

## Confirmed defects

- Resolver.evaluateRules returned ALLOW when context did not contain a rules array, contrary to the stated default-deny invariant. It also accepted arbitrary rule effects without action/resource matching and ignored the resource argument.
- ImpactAnalysis compared only rule-array lengths. A changed rule with the same number of entries could be reported as no added or removed rules and receive LOW risk with no approval requirement.

## Direct code remediation

- Resolver now denies missing, malformed, empty or unscoped policy input by default.
- Allow rules require explicit non-empty action and resource patterns; optional principals and attribute conditions are matched before the rule applies.
- Explicit DENY overrides every matching ALLOW. Unmatched requests, conflicting resource inputs, malformed rules and absent context resolve to DENY.
- Action, resource and principal wildcard matching escapes regex metacharacters before expanding the wildcard, avoiding accidental regex semantics.
- ImpactAnalysis now compares canonicalized rule values as multisets, so same-count mutations and duplicate additions/removals are detected.
- Added rules require approval and are MEDIUM risk; removals or changed rules are HIGH risk; no semantic change is LOW risk. Unsupported or non-JSON rule values are classified conservatively as HIGH risk and require approval.
- Added resolver and impact-analysis regression suites for default deny, scope matching, principal/condition mismatch, deny-overrides, malformed inputs, same-length mutation, canonical key order, approval and duplicate-rule handling.

## Verification

Run from repository root:

    npm --workspace=server/engine-core test -- --runInBand src/tenant/policy/resolver.spec.ts src/tenant/policy/impact.spec.ts
    npm --workspace=server/engine-core test -- --runInBand src/tenant/policy/digest.spec.ts
    npm run test --workspaces
    npm run build --workspaces

Exact-head CI is required. No local execution of the repository was available through the connected GitHub interface. Do not claim test PASS before the latest candidate workflow completes.

## Antigravity handoff guardrails

- Preserve default deny and explicit deny-overrides; do not reintroduce ALLOW fallback for missing rules.
- Keep rule evaluation deterministic and scoped to action/resource/principal/conditions.
- If richer IAM condition semantics are introduced, implement them explicitly with tests; never silently ignore unsupported conditions.
- Keep impact analysis canonical and content-sensitive. Any policy change must not be treated as unchanged merely because array lengths match.
- Keep this work on the consolidated whole-product branch and update the canonical guardrail ledger.

## Remaining gaps

This closes the confirmed resolver default-allow and count-only impact-analysis defects. It does not qualify provider adapters, live cloud execution, signed policy-pack portability, AI model fleet, native OS/IDE/host matrix, or immutable commercial artifact lifecycle. Universal COR remains **NOT CERTIFIED**.
