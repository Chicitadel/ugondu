# ARCHITECTURE STABILITY INDEX (ASI)

**Governance Status:** ACTIVE
**Version:** 1.0.0
**Classification:** Enterprise Metric

The Architecture Stability Index (ASI) is the primary health indicator for a module that has reached the **Release Candidate (RC)** or **Production Validation (PV)** milestones. 

An RC MUST maintain an ASI of 100% to qualify for General Availability (GA). Any deviations require formal Architecture Decision Record (ADR) approval and reset the validation timeline.

## Metric Definitions

| Metric | Target | Description |
| :--- | :---: | :--- |
| **Contract changes after freeze** | 0 | Number of unapproved mutations to frozen schemas or interfaces. |
| **Reverse dependency violations** | 0 | Number of dependencies violating the strict acyclic graph. |
| **ADR exceptions** | 0 | Number of architectural deviations merged without a formal ADR. |
| **Integration regressions** | 0 | Number of previously passing Integration Streams that now fail. |
| **Documentation drift** | 0 | Number of structural or semantic validation failures in documentation provenance. |
| **Breaking API changes** | 0 | Number of non-backward compatible modifications to public interfaces. |

## ASI Scoring
- **100% (Green)**: Zero violations across all metrics. Safe to proceed with PV/GA.
- **< 100% (Red)**: Governance breached. Implementation is halted until the violation is reverted or formally ratified via an ADR.
