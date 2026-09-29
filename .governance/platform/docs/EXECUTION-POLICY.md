# EXECUTION POLICY

**Governance Status:** FROZEN
**Version:** 1.0.0
**Classification:** Enterprise Standard

## Refined Parallelization Policy
> "Maximize safe parallel execution after the Control Plane has frozen architecture, contracts, threat model (where applicable), capability ownership, and the dependency graph. Parallelism is determined by proven dependency independence, not by schedule pressure."

## The Serialized Release Pipeline (Control Plane)
While execution scales horizontally across independent lanes, the final path to production MUST remain strictly serialized to ensure governance safety and deterministic output. 

The definitive single serialized release pipeline is:

```text
Merge
  ↓
Integration
  ↓
Regression
  ↓
Replay
  ↓
Promotion
  ↓
ORR
  ↓
Release
```

All implementation work upstream of the `Merge` boundary is fully parallelized across execution lanes. Nothing downstream of the initial `Merge` may be parallelized.

## The Mandatory Repository Discovery Gate
Before any capability enters the Execution Fabric, it MUST pass the deterministic Repository Discovery Gate:

```text
Repository Discovery
        │
        ▼
Repository Exists?
        │
   ┌────┴────┐
   │         │
 Yes         No
   │         │
Audit        New Repository
   │
   ▼
Repository Already in Final Location?
   │
 ┌─┴───────────────┐
 │                 │
Yes                No
 │                 │
Refactor       Extract
 │                 │
 └──────┬──────────┘
        ▼
Contract Alignment
        ▼
Evidence Package
        ▼
Capability Merge
```

**MANDATORY GOVERNANCE RULE:**
> `D:\ujomor-platform` is the canonical discovery root for the entire ecosystem. Every implementation task must begin with an audit of that tree. Existing implementations are reused, extracted, or refactored whenever possible. Creating a new repository is permitted only after the discovery audit confirms that no equivalent capability already exists.

## Reversible & Non-Destructive Migration Pipeline
To guarantee zero downtime for the existing Consunexia platform during migration, the extraction pipeline must strictly follow this reversible, non-destructive sequence:
```text
Discovery -> Dependency Validation -> Clone/Split (Git-Native) -> Compile -> Regression Tests -> Switch Routing -> Production Shadow Validation -> Rollback Decision -> Refactor -> Retire Legacy
```

### 1. Dependency Validation Gate
Before any repository split is executed, a **Dependency Validation Gate** must pass. This guarantees no hidden compile-time dependencies remain entangled between the extracted bounded context and its legacy neighbors.

### 2. Shared Library Freeze Gate
Before **Wave 2 (Shared Component Promotion)** can begin, all shared libraries MUST be frozen and versioned. No concurrent extraction may modify a shared library.
`Freeze API -> Version -> Promote -> Consume`

### 3. Production Shadow Validation & Rollback Decision
Before refactoring begins, traffic is shadowed/mirrored to the new routing layer to detect regressions and compare logs. Refactoring NEVER begins until a formal `Rollback Decision` validates the safety of the shadowed routing.

## Core Philosophy
1.  **Safety Through Isolation:** Extract logic via API contracts.
2.  **No Monoliths:** Zero coupling between independent capabilities.
3.  **Strict Canonicality:** Production must always run from the modern node.
4.  **Operational Boringness:** Governance is successful when it becomes operationally boring. If engineers stop thinking about governance because deployments are predictable, evidence is trustworthy, and rollbacks are rare, the framework is working.
5.  **Evidence-Led Evolution:** No new governance abstractions without operational evidence demonstrating a need. GDRs must only be written to solve measured recurring deployment problems, never speculative architecture.
6.  **Engine Self-Governance:** The Governance Engine itself is governed by the Governance Engine. Every engine release must require its own build validation, regression validation, compatibility validation, evidence generation, promotion evaluation, ORR, deployment, and telemetry.
7.  **Architecture vs. Implementation:** Architecture dictates *what must remain true* (e.g., Promotion Replay must be deterministic). Implementation dictates *how it is achieved* (e.g., YAML vs PostgreSQL). Implementations may change freely; architecture changes require formal evidence.

### Compatibility States
Every extracted repository MUST progress through objective Compatibility States.
1. **Legacy**: Only legacy interface active.
2. **Dual Compatibility**: Both legacy and new interfaces supported.
3. **New Preferred**: New interface preferred, legacy deprecated.
4. **Legacy Retired**: Legacy interface removed entirely.

### Repository Canonicality
Every repository exposes exactly ONE canonical state. A repository can never hold two canonical states simultaneously:
- **Legacy Canonical**
- **Transition Canonical**
- **Air Roofers Canonical**

**MANDATORY MIGRATION GOVERNANCE RULE:**
> No capability may be refactored until its repository has been successfully extracted or confirmed to already reside in its permanent location.

**OWNERSHIP STABILITY RULE:**
> Repository ownership never changes as a side-effect of migration. It only changes via formal Architectural Decision Record (ADR) or Migration Decision Record (MDR).

## Operational Tuning vs. Architecture Freeze
While the architecture, execution order, and migration gates are **FROZEN**, operational thresholds (e.g., execution budgets, scheduler queue sizing, timeout values, CI concurrency, benchmark thresholds) are tuning parameters and explicitly remain CONFIGURABLE.

## Repository Migration Classification
Every repository or capability MUST receive one of the following statuses before execution:
- **Native Refactor**: Preserve repo, refactor, migrate.
- **Embedded Extraction**: Extract bounded context from a mono-repo.
- **Shared Component Promotion**: Promote to shared platform library after dependency audit.
- **Merge**: Fold into another capability.
- **Archive**: Historical only.
- **Replace**: No useful implementation remains.

## Execution Fabric 2.0 (Orthogonal Lanes)
We utilize an **Execution Fabric** orchestrated by an **Evidence-Driven Scheduler**. To eliminate idle blocking and maximize throughput, execution is organized into three orthogonal dimensions rather than static queues.

| Lane            | Runs in Parallel                                                   | Gate        |
| --------------- | ------------------------------------------------------------------ | ----------- |
| Capability Lane | certify, ingestion, bootstrap, edge, telemetry, licensing, billing | Independent |
| Validation Lane | Build -> [Fan-Out: Contracts, OpenAPI, SDK, Security, Drift] | Continuous  |
| Operations Lane | Deployment, Shadow Validation, Rollback, Canonical Switch          | Serialized  |

### Readiness Dimensions
We explicitly separate software correctness from production rollout safety:
*   **Engineering Readiness**: Measures technical soundness (Builds, Tests, Contracts, SDK, Security). Passing engineering readiness does not authorize production rollout.
*   **Operational Readiness**: Measures safety of exposing production traffic (Deployment, Shadow Validation, Rollback, Telemetry).

### Governance Engine Maturity Model
The platform operates on a four-stage capability maturity framework:
1.  **Governance Designed:** Rules exist.
2.  **Governance Operational:** Rules are enforced automatically.
3.  **Governance Validated:** Operational telemetry demonstrates the rules improve delivery.
4.  **Governance Trusted:** Engineers no longer question promotion decisions because outcomes consistently justify them. This is an objective state achieved exclusively when:
    *   ≥95% of required evidence is executed rather than simulated.
    *   Promotion decisions are reproducible across environments.
    *   Governance Regression suite passes consistently.
    *   Shadow deployments remain within agreed divergence thresholds.
    *   Rollback frequency stays below a defined target.
    *   No governance-related production incidents occur over an agreed observation period.

### Capability State Machine (Event-Driven Governance)
Every capability program MUST progress through an explicit lifecycle. Importantly, Evidence Collection is completely decoupled from the Certification Decision, and Certification is decoupled from Promotion. Linear progression is replaced by an **Event-Driven Policy Engine**.

```text
DISCOVERED -> EXTRACTED -> CONFIGURED -> MODERNIZED -> VALIDATION COMPLETE -> [CERTIFICATION BLOCKED | CERTIFIED] -> PROMOTION APPROVED -> OPERATIONAL READINESS REVIEW -> DEPLOYED -> SHADOW VERIFIED -> CANONICAL -> LEGACY RETIRED
```

### Event-Driven Policy Graph
Rather than a sequential execution pipeline, each decision is an independent policy reacting to evidence:

```text
Validators
      │
      ▼
Evidence Registry
      │
      ▼
──────────────────────────
Policy Evaluation Engine
──────────────────────────
      │
      ├─────────────┐
      │             │
Certification   Risk Engine
      │             │
      └──────┬──────┘
             ▼
Promotion Engine
             │
             ▼
Operational Readiness Review (ORR)
             │
             ▼
Operations Scheduler
```

### Immutable Evidence Registry (First-Class Domain)
Evidence is a first-class domain entity, inherently bound to the cryptographic artifact it describes. The Evaluation Engine relies exclusively on these formalized records to ensure it never certifies code built from an earlier revision.

```yaml
# First-Class Evidence Record
id: ev_01H...
capability: certify
validator: security
version: 1.0.0
commit: abc123def456
timestamp: 2026-07-17T22:15:00Z
confidence: High
freshness: Valid
evidence_type: Executed
artifact: dist/bundle.js
checksum: sha256-...
status: passed
score: 10
mandatory: true
```

#### Evidence Status Taxonomy
To protect engine integrity, evidence provenance is explicitly classified:
*   **Executed**: Produced by an actual tool execution.
*   **Imported**: Obtained from an external trusted system.
*   **Simulated**: Placeholder used until tooling is connected.
*   **Manual Review**: Verified by a human reviewer.

### Declarative Policy Packs & Semantic Versioning
To prevent rigid, procedural governance, evidence evaluation is declarative. Capabilities are evaluated against discrete **Policy Packs** defined in YAML. 

**Governance Semantics Versioning & Compatibility Policy:**
To ensure historical reproducibility and independent evolution, all governance contracts must be strictly versioned (e.g., `Evidence Schema v1.3`, `Policy Pack v1.1`). Every promotion decision must record the exact governance semantics version used.

Furthermore, every Governance Engine version MUST explicitly publish a **Governance Compatibility Policy** detailing supported schema versions:
```text
Governance Engine Software Release 2.5.0
Supports: Governance Semantics 2.x
Supports: Evidence Schema 1.x
Supports: Policy Pack 1.x
Supports: ORR Schema 1.x
Breaking Changes: None
```

**Semantic vs. Software Versioning:**
There are two independent version streams to prevent unnecessary architectural churn:
* **Governance Semantics** (e.g., `v2.x`): Rarely changes; strictly controls policy logic and compatibility.
* **Governance Engine Software** (e.g., `v2.5.0`): Changes frequently for bug fixes, performance, automation, and observability without altering governance rules.

**Semantic Lifecycle & Policy Retirement:**
To allow semantics to evolve predictably without accumulating obsolete concepts, all contracts follow an explicit lifecycle:
`Proposal -> Experimental -> Supported -> Deprecated -> Retired`

As telemetry accumulates, the Analytics Engine must periodically evaluate whether transitional safeguards or legacy policies are still providing value. If operational evidence demonstrates they are no longer needed, they must be retired through the evidence-based review process. This ensures the governance system remains lean over time.

```yaml
policyPack: ui
version: 1.1.0
mandatory:
  - build
  - security
  - lint
optional:
  - accessibility
  - performance
not_applicable:
  - openapi
  - integration
promotion:
  requires:
    - certified
    - no_freeze
    - window_open
```

### Promotion Windows & Operational Readiness Review (ORR)
Promotion approval defines both *when* we can deploy and *until when*. 

```yaml
promotion:
  approved: true
  earliest: 2026-07-20T22:00Z
  expires: 2026-07-21T06:00Z
```

Before entering the serialized Operations Lane, capabilities must pass the **Operational Readiness Review (ORR)**. This final gate verifies operational primitives. It MUST NOT rerun build, security, or certification checks. It only verifies:
* Deployment manifests exist and are versioned.
* Rollback procedures have been validated.
* Monitoring, alerting, secrets, and configuration are available.
* Deployment ownership and on-call responsibility are assigned.

The ORR publishes operational evidence into the Evidence Registry exactly like every other validation stage:
```yaml
validator: operational-readiness
status: passed
category: operations
artifacts:
  - envoy.yaml
  - rollback.md
  - ownership.yaml
  - telemetry.yaml
confidence: high
```

### Governance Decision Records (GDR)
Significant policy decisions MUST be captured as Governance Decision Records.
*   **GDRs are immutable.** Never edit an existing GDR. Append a new GDR (e.g., `GDR-0002` superseding `GDR-0001`) to maintain an auditable, append-only history of governance evolution.

### Capability vs Repository Certification
*   **Repository Certification:** Answers *"Is this specific codebase technically safe?"*
*   **Capability Certification:** Answers *"Is the overall business capability safe across every underlying repository?"*
A Capability is only considered `CERTIFIED` when every constituent repository reaches the required certified state.

## Capability Evidence Packages
A capability program is only considered "done" when it produces a complete **Evidence Package**:

### Quantitative Certification Model
To provide measurable readiness, certification is scored out of 100 points:

| Gate               | Weight |
| ------------------ | -----: |
### Quantitative Certification Model (Multidimensional Scoring)
To prevent perfect scores on simulated evidence from masking risk, certification evaluates three independent metrics:
1.  **Compliance Score**: Did this repository satisfy the applicable policy?
2.  **Evidence Confidence Index**: How trustworthy is the supporting evidence? (Tracked multidimensionally by domain)
3.  **Release Confidence**: Given the evidence types, how much confidence should operations have in production deployment?

Each evidence type carries an inherent weight:
*   **Executed**: 1.0 (High confidence)
*   **Imported**: 1.0 (High confidence)
*   **Manual Review**: 0.7 (Medium confidence)
*   **Simulated**: 0.35 (Low confidence)

The Evidence Registry automatically computes the Evidence Confidence per domain, allowing targeted operational risk mapping.

**Example Report:**
```text
Compliance
██████████ 100%

Evidence Confidence (Multidimensional)
Build:      ██████████ 100%
Security:   ████░░░░░░ 48%
Contracts:  █████████░ 95%
Performance:███████░░░ 72%

Operational Risk: Low
Release Confidence: 82%
```

**Compliance Scoring Tiers:**
*   **95–100%**: Certified
*   **80–94%**: Provisionally Certified
*   **<80%**: Validation Failed

**Mandatory Gates:** Regardless of numerical score, a failure in Build, Security, or Contracts immediately transitions the capability to `CERTIFICATION BLOCKED`.

### Evidence Freshness Rules
Evidence must be current. The scheduler automatically invalidates affected evidence whenever relevant files change, enforcing:
*   `maxEvidenceAge: 24h`
*   Triggered Revalidation (e.g., modifying `package.json` immediately invalidates Build and Security evidence).

### Security Remediation Protocol
To prevent unintended breaking changes during execution, vulnerabilities must be triaged formally. `npm audit fix --force` is NEVER the default remediation.
1. Record the exact vulnerable dependency tree (`npm audit --json`).
2. Determine whether vulnerabilities affect production dependencies, dev-only tooling, or transitive layers.
3. Try standard `npm audit fix`.
4. Evaluate manual upgrades of affected packages to supported versions.
5. Use `npm audit fix --force` ONLY after reviewing breaking changes, as it can introduce major-version upgrades.

## Capability Evidence Packages
A capability program is only considered "done" when it produces a complete **Evidence Package**:
- Implementation code
- Unit & Integration tests
- API specifications (OpenAPI)
- SDK updates
- Event schemas
- Documentation
- Benchmark results
- Security scan results
- Dependency & drift validation
- **Migration status**
- **Rollback strategy**
- **Observability instrumentation**
- **Operational runbook**
- **Compatibility report**

## Execution Budgets & Automatic Decomposition
Every capability program is assigned an **Execution Budget**. If a program exceeds its budget, the scheduler will automatically emit a `Recommend Decomposition` signal, forcing the capability to be broken down into smaller pieces rather than delaying the merge wave.

## Migration Wave Framework & Evidence Gates
Instead of simple extraction tasks, the migration is governed by explicit waves with mandatory **Evidence Gates**. No wave may be marked complete without generating its exact evidence package.

**EXECUTION CONCURRENCY RULE:**
> To maximize safe throughput, Waves 1A, 1B, 1C, and 1C.5 MUST run in parallel across all extracted repositories. Conversely, Waves 1B.5, 1D, and 1E interact with live production traffic and MUST run sequentially or in controlled phases per capability.

**EVIDENCE ARTIFACT RULE:**
> Every governance statement that asserts completion MUST reference an evidence artifact. A wave is only complete when its concrete artifacts are generated and approved.

### Wave 0 — Discovery
**Evidence Required:**
- Repository Inventory
- Capability Inventory
- Complete Dependency Graph
- Shared Component Graph
- Migration Manifests (`migration_manifest.yaml`)

### Wave 1A — Repository Split
**Evidence Required:**
- Git history verification (or formal declaration of N/A)
- Build success
- Test success
- Repository Identity Verification (Default branch exists, CI points to correct repo, packages match bounded context)
- MDR Approved

### Wave 1B — Infrastructure Configuration [PARALLEL]
**Evidence Required:**
- **Repository Readiness**: Branch protection configured, metadata verified.
- **CI/CD Readiness**: Build, test, static analysis, artifact publishing, dependency scanning pipelines green.
- **Deployment Readiness**: Environment separation, secrets management, health endpoints configured.
- **Routing Readiness**: Domain mapped, TLS, reverse proxy, internal service discovery configured.
- **Compatibility Readiness**: Legacy endpoint inventory mapped, compatibility adapters running, state = Dual Compatibility.

### Wave 1B.5 — Deployment Verification [SERIAL]
**Evidence Required:**
- **Shadow Readiness**: Mirrored traffic verified in live environment, structured logging, metrics, trace correlation, error comparison reports.
- **Rollback Readiness**: Rollback procedure exercised in live environment, MDR updated, Evidence Package generated.

### Wave 1C — Structural Modernization [PARALLEL]
**Evidence Required:**
- Namespace migration applied
- Configuration externalized
- Endpoint routing aligned
- SDK integration authored

### Wave 1C.5 — Capability Certification [PARALLEL]
**Evidence Required (Per Capability):**
- ✅ Quantitative Certification Score evaluated
- ✅ No mandatory gate failures (Security, Build, Contracts)
- ✅ Evidence package generated

### Wave 1D — Canonical Switch [SERIAL]
**Evidence Required:**
- Operational validation report
- Transition of repository canonicality approved
- Validation Complete -> Canonical Switch Approval -> Legacy Archived

### Wave 1E — Legacy Retirement [SERIAL]
**Evidence Required:**
- Legacy infrastructure decommissioned
- MDR Closure

### Layered Merge Waves
Instead of waiting for a massive single integration point, merges happen incrementally:
`Capability Merge -> Platform Merge -> Foundation Merge -> Ecosystem Merge`

## Complete Maturity Pipeline
```text
Control Plane (FROZEN)
    │
    ▼
Architecture -> Contracts -> Threat Model -> Dependency Freeze -> Capability Ownership
    │
    ▼
Repository Discovery Gate (Migration-First)
    │
    ▼
Execution Fabric (Adaptive Scheduler)
    │
    ▼
Continuous Validation (Queue C)
    │
    ▼
Layered Merge Waves (Queue D)
    │
    ▼
IC2 Decision
    │
    ▼
RC Assessment
    │
    ▼
RC Decision
    │
    ▼
Ready for Production Validation
    │
    ▼
GA Decision
```

## GOVERNANCE FREEZE DECLARATION (ARCHITECTURE MAINTENANCE MODE)
The Execution Fabric and Governance Framework (`Governance Engine v2.x`) are formally **FROZEN** and operating in Architecture Maintenance Mode. The primary platform backlog is now exclusively operational (e.g., replacing simulated evidence, increasing automation, reducing lead times).

### Maintenance Mode Default Actions
| Type of Change | Default Action |
| :--- | :--- |
| Implementation improvement | Allowed |
| Bug fix | Allowed |
| Performance optimization | Allowed |
| Operational automation | Allowed |
| New telemetry | Allowed |
| Dashboard/report improvements | Allowed |
| Governance semantic change | Requires evidence and benchmark review |
| New architectural abstraction | Presumed rejected unless telemetry justifies it |

### The Ultimate Governance Invariant
Regardless of technological evolution or implementation choices, one invariant supersedes all others:
> **A governance decision must always be explainable, reproducible, and attributable.**

### The 5-Question Evolution Benchmark & Data-Driven ARB
From this point onward, any proposal for `Governance Semantics v3.x` must clear a strict Data-Driven Architecture Review Board (ARB). The proposal must include a formal evidence package answering these five questions:
1. What operational KPI regressed, and what telemetry demonstrates the problem?
2. Which KPI improves if this change is adopted, and what is the success metric post-deployment?
3. Can the same result be achieved without changing governance semantics?
4. What is the compatibility and migration impact?
5. Can the existing replay engine still reproduce historical decisions?
If these questions cannot be answered with an evidence package, the proposal never enters design review.

**Periodic Architecture Review:**
To ensure the baseline does not permanently stagnate despite years of operational learning, a lightweight review will be conducted annually. The sole purpose of this review is to answer: *"Does operational evidence justify any change to governance semantics?"* The default outcome is always **no change** unless the evidence package satisfies the ARB criteria.

## Roadmap Sequences
- **Wave 1 (Maximum Safe Parallelism)**: Licensing, Billing, Telemetry.
- **Wave 2**: Developer Platform, SDKs, CLI, Webhooks, Sandbox, API Keys.

## Governance Analytics Engine & Ownership Boundaries
To prevent "smart governance" from becoming an opaque control system, platform responsibilities are strictly separated by ownership:
*   **Policy Engine:** Owns decisions.
*   **Analytics Engine:** Owns measurement.
*   **Operations:** Owns deployment.

None of these layers may own or modify each other. The **Governance Analytics Engine** is a strict measurement layer (not a decision layer) whose sole responsibility is consuming the Evidence Registry to emit telemetry on friction points, ensuring the Policy Engine learns but never self-modifies.

### Explicit Promotion Authorization (The "Cutover" Gate)
Certification indicates technical soundness, but the actual cutover is controlled by the Promotion Engine. This ensures deployments happen during safe windows and respects infrastructure concurrency. The Promotion Engine consumes the outputs from the Policy Engine and explicitly updates the system state to `PROMOTION APPROVED`.

**Promotion Replayability (Deterministic Audits):**
Every promotion decision must be fully reproducible. Given a `repository`, `evidence package`, and `governance semantics version`, any engineer or auditor must be able to replay the evaluation through the Policy Engine and obtain the exact identical `PROMOTION APPROVED` or `REJECTED` result.

**Platform Success Criteria (KPIs):**
| KPI | Desired Trend |
| :--- | :--- |
| Mean time Certification → Deployment | ↓ |
| ORR failure rate | ↓ |
| Rollback frequency | ↓ |
| Shadow/Production divergence | ↓ |
| Executed evidence ratio | ↑ |
| Simulated evidence ratio | ↓ |
| Deployment lead time | ↓ |
| False Promotion approvals | 0 |
| Post-release incidents | ↓ |

*Example output from the Analytics Engine:* "API v3 Policy Pack blocks deployments 15% of the time due to missing secrets. Recommendation: Automate secret validation."
