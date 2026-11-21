# Ugondu COR Addendum — Universal Region Selection and Multi-Region Governance

**Authority:** Air Roofers SASU / Ujomor Systems Engineering & Governance Authority  
**Scope:** Provider-neutral core; all supported clouds, VPS/hosting, private hosts, deployment surfaces, operating systems, editions, and model-assisted/non-model-assisted execution  
**Document Version:** 1.0.0  
**Date:** 2026-10-21  
**Status:** Normative remediation specification & repository certification register

---

## 1. Mandatory Rule

**No deployment region, cloud location, zone, cluster, datacenter, or equivalent placement target may be silently hardcoded as the effective target.** Provider defaults may be used as discovery metadata, never as implicit actor consent.

The same deterministic placement resolver (`UniversalPlacementResolver`) serves CLI, UI, IDE, API, CI/CD, headless execution, and model-assisted execution. Model assistance may explain or recommend; it is never required for region selection, validation, policy rendering, or deployment.

Distinguish these states:

- `ACTOR_SELECTED`: explicit target supplied for this operation.
- `APPROVED_CONFIG`: scoped, previously approved project/environment target remains valid.
- `RECOMMENDATION`: proposed but not yet approved target.
- `UNRESOLVED`: missing, ambiguous, stale, conflicting, or unsupported target.

A remembered choice can be reused only when its provider, account/tenant/project, environment, workload scope, and operation match. Never inherit a region from an unrelated project or provider.

## 2. Beginner-Friendly Selection

Accept a provider-native identifier or a familiar name, for example `eu-west-3`, `Paris`, `France`, `Nigeria`, `South Africa`, `Cape Town`, or `West Africa`. These are input hints, not universal identifiers. Resolve them against the selected provider's current authoritative location catalogue (`AuthoritativeLocationCatalogue` / `AWS_REGION_CATALOGUE`). Do not imply that every provider has a region in every country or continent.

If the target is missing and no valid approved default exists, use this prompt in the actor's selected locale (`placement.prompt.select_region`):

> **Where should Ugondu deploy this workload?** Enter a city, country, or provider region ID—for example `Paris`, `France`, `Nigeria`, or `eu-west-3`. If you are unsure, choose **Recommend for me**. Ugondu will compare supported locations against your customers, latency, cost, data-residency rules, and required services before proposing a target.

When a name maps to multiple locations (for example `Europe` or `US`), show candidates with provider, native ID, location, required-service availability, and material limitations. Ask the actor to choose (`status: "AMBIGUOUS"`); never pick an arbitrary match.

For non-interactive CI or terminal automation, do not hang or guess. Return `REGION_SELECTION_REQUIRED` with a concise explanation and copyable command/configuration example. In UI (`PlacementWizardContract`), provide searchable choices, plain-language explanations, keyboard accessibility, and localized labels across all 12 supported locales.

## 3. Location-Based Recommendation is Advisory

Enforce this 7-level priority order in `UniversalPlacementResolver`:

1. Legal, residency, sovereignty, contractual, or organization policy constraints (`residencyRequirements`).
2. Explicit actor selection for this operation (`userInput` or `explicitLocationIds`).
3. Valid approved project/environment configuration (`approvedConfig` scoped to matching provider, project, environment, and workload).
4. Declared customer/audience geography and workload requirements (`audienceGeographies`).
5. Current provider service availability, measured/published latency, cost, and resilience requirements (`latencyObjectivesMs`).
6. Optional, permissioned, approximate IP-geolocation hint (`allowIpHint` + `ipSignal`).
7. If unresolved, fail closed with `REGION_SELECTION_REQUIRED` and ask; do not silently fall back.

A developer's location is not necessarily the customer's location. For example, an actor in France (`ipCountryHint: "FR"`) deploying an application for African or Nigerian consumers (`audienceGeographies: ["Africa", "Nigeria"]`) receives a recommendation for `af-south-1` (Cape Town, South Africa) rather than France. IP geolocation is approximate, is never treated as proof of physical location or consent, and never overrides an explicit selection or residency policy. Raw IP addresses are stripped and never persisted in `ResolvedPlacement`, rationale logs, or checkpoints (`rawIpPersisted: false`).

A recommendation may be auto-applied only under a separately configured, explicit automation policy (`autoApproveRecommendations: true`) whose scope already authorizes the target class. Otherwise, Ugondu returns `status: "REQUIRES_CONFIRMATION"`, `decisionState: "RECOMMENDATION"`, `requiresConfirmation: true` before the first externally visible deployment or policy mutation.

## 4. Multi-Region Support

Support one or more explicit targets per project, environment, workload, or service (`MultiRegionTopologyMode`: `"single-region" | "active-active" | "active-passive" | "disaster-recovery" | "independent"`). Allow independent regions for development, staging, and production. Before apply, validate:

- provider/account/tenant and region identifiers;
- service availability, quotas, identity/policy scope, networking, artifact/image availability and replication;
- secrets and encryption-key availability, database replication and consistency, DNS/routing, health checks, backups and restore;
- data flows across regional/national boundaries and residency constraints;
- latency objectives, failover behavior, disaster-recovery objectives, and cross-region charges;
- cleanup and rollback behavior for partial multi-region failures.

Distinguish active-active, active-passive, disaster-recovery, and independent regional deployments. Failover may use only pre-approved locations (`approvedFailoverLocations`). Never silently fail over to an unapproved region. Produce a dry-run plan and deterministic SHA-256 `planFingerprint`.

## 5. Provider-Neutral Core Contract

Implemented in `server/capabilities/src/continuity/UniversalPlacementResolver.ts`:

```ts
export type PlacementScope =
  | "organization" | "project" | "environment" | "workload" | "service";

export type PlacementSource =
  | "actor-explicit" | "approved-project-config" | "policy-required"
  | "recommendation-accepted" | "migration-approved";

export type PlacementStatus =
  | "RESOLVED" | "AMBIGUOUS" | "UNSUPPORTED"
  | "CONFLICTS_WITH_POLICY" | "REQUIRES_CONFIRMATION"
  | "UNAVAILABLE" | "REGION_SELECTION_REQUIRED";

export type PlacementDecisionState =
  | "ACTOR_SELECTED" | "APPROVED_CONFIG" | "RECOMMENDATION" | "UNRESOLVED";
```

The core owns the decision flow, policy validation, approval, continuity, and evidence. Adapters own provider-specific catalogue discovery, native identifiers, regional resource semantics, and API behavior. Hosting targets without a cloud region concept (`cpanel`, `directadmin`, `vps`, `private-host`) declare their actual placement model (`hosting-location` or `datacenter`) rather than pretending to support cloud regions.

## 6. Region-Aware Policy Generation

Implemented in `server/capabilities/src/continuity/RegionPolicyRenderer.ts` and `scripts/aws-conformance/target-resolver.mjs`:

- Removed hardcoded deployment-region literals from runtime defaults; `RegionPolicyRenderer` requires an explicit, non-empty `allowedRegions` array and rejects unresolved `${REGION}` or `${ACCOUNT_ID}` placeholders.
- Distinguishes regional and global resources: `iam:*`, `s3:*`, and `sts:*` global ARNs remain unscoped by region while regional EC2/RDS/ECR/ECS/SSM resources are scoped strictly to the approved region set.
- Action-aware wildcard validation (`LEGITIMATE_WILDCARD_ACTION_REGEX`) permits `Resource: "*"` only on read/list/describe actions (`ec2:Describe*`, `s3:ListAllMyBuckets`, `iam:Get*`, `iam:List*`, `ssm:Describe*`) while blocking `Resource: "*"` on mutating actions.
- Scopes permissions to the smallest approved set of regions and resources; never widens to `*` across all regions/accounts to bypass `AccessDenied`.

## 7. Continuity, Drift, and Resume

Every checkpoint in `ExecutionContinuityLedger` and `ResumePlanner` records provider and tenant/project identity (without secrets), approved location set and provenance, `planFingerprint`, policy bundle version, per-location operation state, resource references, and idempotency keys. On resume, unexpected locations or unverified ownership trigger fail-closed drift blocks (`OWNERSHIP_OR_PERMISSIONS_AMBIGUOUS`).

## 8. Failure Outcomes

| Condition | Required & Verified Behavior |
|---|---|
| Missing target, interactive | Prompts actor with localized `placement.prompt.select_region` and examples (`Paris`, `France`, `Nigeria`, `eu-west-3`). |
| Missing target, non-interactive | Stops before mutation with `REGION_SELECTION_REQUIRED` (`UG-REGION-SELECTION-REQUIRED`). |
| Ambiguous city/country/name | Returns `AMBIGUOUS` with candidate list (`eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-central-1`); no arbitrary selection. |
| Unsupported or unavailable target | Returns `UNSUPPORTED` with supported provider alternatives; no silent substitution. |
| Residency/policy conflict | Blocks with `CONFLICTS_WITH_POLICY`. |
| Explicit choice conflicts with IP hint | Honors explicit actor choice (`ACTOR_SELECTED`). |
| Developer in France building for African audience | Recommends `af-south-1` (Cape Town) based on `audienceGeographies`, overriding developer IP hint (`FR`). |
| Unapproved location in multi-region/failover plan | Rejects plan (`CONFLICTS_WITH_POLICY`). |
| Unresolved template or policy location | Rejects generated policy (`RegionPolicyRenderer`). |

## 9. Certification and Sign-Off Matrix

| Zone | Verification Suite | Status |
|---|---|---|
| Region hardcoding prevention | `universal-placement-resolver.spec.ts`, `universal-region-selection.test.js` (`URS-003`) | **🟢 CERTIFIED (Core & AWS Target Resolver)** |
| Beginner-friendly CLI/UI selection | `universal-region-selection.test.js` (`URS-001`, `URS-002`), `GraphicalControlContracts.ts` | **🟢 CERTIFIED (Contract & Qualification)** |
| Provider-neutral location adapter | `UniversalPlacementResolver.ts` (`DefaultPlacementAdapter`) | **🟢 CERTIFIED (Core Contract)** / **🟡 IN PROGRESS (Live non-AWS providers)** |
| Policy compiler/reconciler region scoping | `RegionPolicyRenderer.ts`, `universal-region-selection.test.js` (`URS-007`) | **🟢 CERTIFIED** |
| Multi-region planning and failover | `UniversalPlacementResolver.ts`, `universal-region-selection.test.js` (`URS-007`, `URS-008`) | **🟢 CERTIFIED (Core Planner)** |
| IP-based recommendation & privacy | `UniversalPlacementResolver.ts`, `universal-region-selection.test.js` (`URS-004`, `URS-005`, `URS-006`) | **🟢 CERTIFIED** |
| Resume, drift and recovery | `ExecutionContinuityLedger.ts`, `ResumePlanner.ts` | **🟢 CERTIFIED** |
| 12-Locale & accessibility parity | `server/shared/locales/*.json`, `scripts/validate-locales.js` | **🟢 CERTIFIED (12/12 Locales)** |
