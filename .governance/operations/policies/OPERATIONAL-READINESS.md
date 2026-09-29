# Operational Governance

**Governance Status:** FROZEN
**Version:** 1.0.0

Operational Governance (OG) separates the day-to-day running of the platform from the release cycle. This ensures that software is not only deployed but is fundamentally maintainable, resilient, and observable.

## Operational Ownership
The Operations layer (`operations.airroofers.eu`) strictly owns and dictates standards for:
- **Monitoring & Alerting**: Centralized dashboards, PagerDuty routing, anomaly detection.
- **Incident Response**: Declaration workflows, war rooms, and post-mortems.
- **Runbooks**: Executable documentation for common failures (e.g., database failovers).
- **Disaster Recovery (DR)**: Multi-region failover strategies and RTO/RPO targets.
- **Backup Strategy**: Automated, encrypted, and regularly tested database snapshots.
- **Capacity Planning**: Autoscaling rules and infrastructure limits.
- **SLO / SLA**: Target availabilities for internal and external services.
- **Health Probes**: Mandatory liveness and readiness endpoints.
- **Rollback Procedures**: Verified scripts or automated mechanisms to revert failed deployments.
