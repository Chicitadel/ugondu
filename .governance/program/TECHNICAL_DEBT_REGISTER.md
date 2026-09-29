# CORP Technical Debt Register

**Version**: 1.0.0 | **Owner**: Platform Engineering Authority | **Status**: ACTIVE

| ID | Description | Location | Priority | Stream | Resolution |
|----|-------------|----------|----------|--------|------------|
| TD-01 | Absolute Windows paths in exported audit artifacts | `scripts/package_external_audit.js`, evidence output | P0 | S3, S7 | AuditSanitizationEngine + portable path assertions |
| TD-02 | Hardcoded release gates in JavaScript | `engine/governance/ReleaseReadinessFrameworkEngine.js` | P0 | S6 | Migrate to `config/release_gates.yaml` |
| TD-03 | Direct filesystem calls outside WorkspaceResolverEngine | Multiple engine files | P0 | S3 | CI lint enforcement + WorkspaceResolverEngine wrapping |
| TD-04 | Determinism scores declared not measured | `engine/validation/DeterminismCertificationEngine.js` | P1 | S5 | Multi-run hash comparison with statistical evidence |
| TD-05 | Sequential qualification (no DAG) | `engine/execution/` and `package.json` scripts | P1 | S4 | Replace with dependency-aware execution graph |
| TD-06 | CLI lacks machine-readable output modes | `cli/` (8 files) | P1 | S10 | Add `--json`, `--yaml`, `--ci`, `--quiet` to all commands |
| TD-07 | No shared workspace snapshot cache | All engines that call WorkspaceResolverEngine per invocation | P1 | S3, S18 | Shared in-process snapshot store |
| TD-08 | Dashboard lacks live progress and topology graph | `public/`, `index.html` | P2 | S11 | WebSocket-driven progress, D3 topology renderer |
| TD-09 | Plugin manifests not validated before execution | `engine/plugin/` | P2 | S13 | Schema validation on load |
| TD-10 | Documentation not generated from authoritative sources | `docs/` (55 files, mostly hand-written) | P2 | S16 | CLI ref from command registry; API ref from JSDoc |
