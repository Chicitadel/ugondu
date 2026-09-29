# Wave O1: Evidence Emitter Specification & Architecture

This document defines the Canonical Evidence Schema for `Governance Semantics v2.x`. 

## Objective
**Every repository must be capable of producing a complete, machine-generated Evidence Package from a single CI execution.**

This removes governance logic from application repositories. Repositories act exclusively as *Emitters*; the Governance Platform acts as the *Collector*.

---

## 1. The Evidence Collector Contract

To avoid embedding governance logic into every repository, the architecture mandates strict separation of concerns:

```text
Repository
    ↓
CI Pipeline
    ↓
Evidence YAML (Emitter)
    ↓
Evidence Collector
    ↓
Evidence Registry
    ↓
Promotion Engine
```

**Emitter Responsibilities (Repository):**
* Run the tooling (tests, scanners, linters).
* Map the output into the Canonical Evidence Schema.
* Push the YAML to the Collector.

**Collector Responsibilities (Governance Platform):**
* Ingest the YAML payload.
* Validate the schema against `Governance Semantics v2.x`.
* Normalize paths, IDs, and timestamps.
* Persist to the immutable Evidence Registry.

---

## 2. Immutable Build & Evidence Identity

To guarantee provenance and auditability, every evidence payload establishes two immutable identities:

### 2.1 Build Identity
`Build Identity = Repository Name + Commit SHA + Pipeline Run ID + Timestamp`
This ensures that any Promotion Replay points to a singular, reproducible execution space (what was executed).

### 2.2 Evidence Package Identity
`Evidence Identity = Build Identity + Schema Version + Evidence Hash + Collector Version`
This distinguishes *what was executed* from *what was actually evaluated*. It prevents replay drift caused by schema changes or collector version upgrades.

---

## 3. Freshness Enforcement (TTL)
Promotion automatically rejects stale evidence. Old successful runs cannot mask current regressions. Every evidence block MUST include an explicit TTL (`validUntil`).

*   **Security Scans:** 24 hours
*   **Performance Benchmarks:** 7 days
*   **Contract Tests:** 24 hours
*   **Unit Tests:** 24 hours

---

## 4. Canonical Evidence Schema (YAML)
Every repository must emit exactly the same top-level structure. If a capability does not apply to a specific repository type, it must be explicitly marked as such (e.g., `status: not_applicable`).

```yaml
schemaVersion: "2.0"

repository:
  name: "certify"
  version: "1.2.0"
  commit: "a1b2c3d4e5f6g7h8"
  branch: "main"

pipeline:
  id: "run-98765"
  started: "2026-07-18T10:00:00Z"
  finished: "2026-07-18T10:05:00Z"

build:
  status: "success"
  duration: 45s

tests:
  unit:
    status: "success"
    validUntil: "2026-07-19T10:00:00Z"
  integration:
    status: "success"
    validUntil: "2026-07-19T10:00:00Z"
  contract:
    status: "success"
    validUntil: "2026-07-19T10:00:00Z"

security:
  dependency_scan:
    status: "success"
    validUntil: "2026-07-19T10:00:00Z"
  sast:
    status: "success"
    validUntil: "2026-07-19T10:00:00Z"
  secrets:
    status: "success"
    validUntil: "2026-07-19T10:00:00Z"

performance:
  benchmark:
    status: "not_applicable"
    validUntil: "2026-07-25T10:00:00Z"

sdk:
  compatibility:
    status: "success"

artifacts:
  checksum: "sha256:8f4343466488ee830..."

promotion:
  confidence: 1.0 # 1.0 = Executed, 0.35 = Simulated

metadata:
  generatedBy: "github-actions"
  engineVersion: "2.5.0"
```

---

## 5. Wave O1 Roadmap & Success Criteria

The automation of Evidence will roll out in the following execution sequence:

1. **O1.1 Evidence Emitter Specification:** (Complete - This Document).
2. **O1.2 Evidence Collector Service:** Stand up the ingestion endpoint.
3. **O1.3 Standard Pipeline Library:** Create a shared pipeline library (`ci/build.yml`, `ci/security.yml`, etc.) so repositories import modules rather than duplicating logic.
4. **O1.4 Capability Adapters:** Build thin ecosystem wrappers (NodeAdapter, PythonAdapter, JavaAdapter) that translate native tool output into the Canonical Schema.
5. **O1.5 & O1.6 Implementation:** Enforce freshness TTLs and Immutable Identities at the Collector layer.
6. **O1.7 Initial Success Criteria:** Wave O1 is considered complete when the following three repositories fully automate their evidence emission:
    *   `certify` (Node/TypeScript Service)
    *   `ingestion` (Python Service)
    *   `bootstrap` (Infrastructure/Config)
