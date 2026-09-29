# CORP Decision Register

**Version**: 1.0.0 | **Owner**: Platform Engineering Authority | **Status**: ACTIVE

| ID | Decision | Rationale | Stream | Date | Authority |
|----|----------|-----------|--------|------|-----------|
| DEC-01 | WorkspaceResolverEngine is the sole filesystem topology service | Eliminates path leakage, ensures portability across OS | S3 | 2026-08-07 | Architecture Authority |
| DEC-02 | Release gates defined in versioned YAML, not JavaScript | Enables profile-driven gates without code changes | S6 | 2026-08-07 | Governance Authority |
| DEC-03 | Constitution contains principles only — no implementation rules | Keeps constitutional changes extraordinarily rare | S1 | 2026-08-07 | Governance Authority |
| DEC-04 | Determinism measured from ≥3 executions, not declared | Produces defensible audit evidence | S5 | 2026-08-07 | Quality Authority |
| DEC-05 | All CLI commands must support `--json`, `--yaml`, `--ci` | Enables machine consumption without screen-scraping | S10 | 2026-08-07 | DX Lead |
| DEC-06 | Exported audit packages undergo sanitization before zip | Prevents developer path leakage in external distributions | S3, S7 | 2026-08-07 | Security Authority |
| DEC-07 | Plugin manifests schema-validated before execution | Prevents governance violations from untrusted extensions | S13 | 2026-08-07 | Security Authority |
| DEC-08 | Governance artifacts carry 10-field mandatory metadata schema | Enables deterministic traceability and automated validation | S1 | 2026-08-07 | Governance Authority |
| DEC-09 | Qualification runs an execution DAG, not a sequential loop | Enables incremental, parallel, and resumable qualification | S4 | 2026-08-07 | Engineering Lead |
| DEC-10 | CORP program governs all streams; no stream starts without registration | Prevents architectural drift and uncontrolled scope | S0 | 2026-08-07 | Platform Engineering Authority |
| DEC-11 | Stream S21 (Independent Validation) approved as first ARR-governed architecture freeze exception | Internal certification is necessary but not sufficient for commercial readiness; independent evidence required for external commercial claims | S21 | 2026-08-07 | Freeze Governance Board |
| DEC-12 | Release packages split into 4 distinct audiences: commercial, audit, sdk, regulatory | Prevents shipping internal implementation to audiences that don't need it | Packaging | 2026-08-07 | Commercial Authority |
| DEC-13 | SBOM generated in both SPDX 2.3 and CycloneDX 1.5 formats per release | Ensures compatibility with both procurement and security tooling ecosystems | S15 | 2026-08-07 | Security Authority |
