# CORP Risk Register

**Version**: 1.0.0 | **Owner**: Platform Engineering Authority | **Status**: ACTIVE

| ID | Risk | Stream | Likelihood | Impact | Mitigation |
|----|------|--------|------------|--------|------------|
| R-01 | Absolute path leakage in shared audit packages | S3, S7 | High | High | AuditSanitizationEngine enforces portable paths pre-export |
| R-02 | Determinism degradation on new platforms | S5 | Medium | High | Statistical multi-run measurement, SLO breach blocks release |
| R-03 | Platform entropy from parallel stream execution | S0 | Medium | Medium | Stream 0 gates all others; dependency graph enforced |
| R-04 | Plugin ecosystem introducing governance violations | S13, S15 | Low | High | Plugin manifest validation + sandboxing before execution |
| R-05 | Documentation drift from implementation | S16 | High | Medium | Docs generated from authoritative sources; CI drift check |
| R-06 | CI performance degradation as qualification grows | S4, S18 | Medium | Medium | Incremental DAG; snapshot cache; only dirty streams rerun |
| R-07 | Release gates becoming stale (hardcoded JS) | S6 | High | High | All gates moved to versioned YAML; validated on load |
| R-08 | CLI breaking changes breaking consumer integrations | S12 | Medium | High | Semver contract; compatibility test suite on every PR |
| R-09 | Workspace resolver bypassed by new engine authors | S3 | Medium | High | CI lint rule enforces no direct fs calls outside resolver |
| R-10 | Evidence package contains developer-machine artifacts | S7 | High | Medium | Sanitization pipeline + portable path assertion test |
