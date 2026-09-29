# INGESTION PIPELINE ARCHITECTURE

**Governance Status:** FROZEN
**Version:** 1.0.0
**Classification:** Enterprise Standard

## The Ingestion Boundary
To guarantee operational stability, the Operations Platform is strictly prohibited from parsing or consuming raw authoring artifacts (Markdown, YAML, JSON configuration files) at runtime.

The architecture enforces an asynchronous **Ingestion Pipeline**:

`[Authoring Formats (Markdown/YAML/ADRs)] -> [Ingestion Parser] -> [Validation Rules] -> [Canonical Governance Store] -> [Operations Platform API]`

## Pipeline Stages
1. **Ingestion**: A background worker detects commits to the `.governance` directory. It uses file-specific lexers to extract structured metadata from the Authoring Formats.
2. **Validation**: The extracted payload is evaluated against the `v1.0 Governance Domain` schema (e.g., verifying that an ASI score mutation is accompanied by a valid ADR linkage).
3. **Storage**: The validated payload is hydrated into the relational/document `Canonical Governance Store`.
4. **Consumption**: The Operations Platform reads the typed domain objects exclusively via the Governance API.

This pattern isolates the control plane from formatting drifts and supports the future addition of CI outputs or Git metadata without requiring Dashboard re-writes.
