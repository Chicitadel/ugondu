# Governance Engine Regression Suite

**Purpose:** 
The Governance Framework is a deterministic software product (`Governance Engine v2.0`). This regression suite verifies the deterministic behavior of the Policy Engine and Promotion Engine against the Evidence Registry.

**CI Automation Mandate:** 
These scenarios are not merely documentation; they are the formal contract for executable automated assertions. Each scenario must be implemented as an automated CI test within the Governance Engine's own pipeline. The suite must pass consistently before any new Semantic Version is released.

## Test Cases

### 1. Risk Nuance Preservation
**Input:** Evidence set containing `Executed` Linting and `Simulated` Security Scan.
**Assertion:** `Release Confidence` score computes significantly lower than an identical set containing `Simulated` Linting and `Executed` Security Scan. 
**Rationale:** Simulating security is fundamentally higher risk than simulating style rules.

### 2. Operational Readiness Review Blocks Deployment
**Input:** Capability holds `PROMOTION APPROVED` status but lacks ORR standard YAML Evidence Record.
**Assertion:** Capability is blocked from entering the `Operations Lane`.
**Rationale:** The Promotion Engine does not authorize shadow deployment without verifiable operational primitives (manifests, rollback configuration).

### 3. Declarative Pack Enforcement
**Input:** A capability scored against `UI Policy Pack v1.1` lacks OpenAPI Evidence.
**Assertion:** Capability achieves `100% Compliance Score`.
**Rationale:** The Policy Engine must ignore `N/A` validators defined in the specific declarative Policy Pack, rather than penalizing UI capabilities for missing API artifacts.

### 4. Immutable Governance Decision Records
**Input:** Attempt to mutate `GDR-0001.md`.
**Assertion:** Engine detects mutation constraint violation and rejects.
**Rationale:** Governance history must be strictly append-only.

### 5. Freshness Invalidation
**Input:** Modification of `package.json` while capability holds `PROMOTION APPROVED`.
**Assertion:** `Build` and `Security` evidence records are instantly invalidated, transitioning capability back to `VALIDATION FAILED`.
**Rationale:** Stale evidence must never authorize a deployment.
