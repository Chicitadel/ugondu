# OPERATIONS API CONTRACTS

**Governance Status:** FROZEN
**Version:** 1.0.0
**Classification:** Enterprise Standard

To decouple presentation layers (Web Dashboards, CLI, Mobile) from the underlying datastores, the Operations Platform strictly communicates over stable, RESTful APIs. 

Direct database access is strictly prohibited for any presentation layer.

## Platform-Wide Engineering Principle: Read-Oriented
> **Observation APIs are the default. Mutation APIs require explicit governance, authorization, and auditability.**

This principle applies equally across Governance, Runtime, Security, Operations, and Evidence domains.
The Operations Platform observes first and controls second. 

The only allowed mutation boundaries are:
- `POST /api/v1/incidents/{id}/acknowledge`
- `POST /api/v1/runbooks/{id}/execute`
- `POST /api/v1/deployments`
- `POST /api/v1/maintenance/toggle`

## Core API Definitions

### 1. Metrics API
Serves aggregated telemetry and health indicators.
- `GET /api/v1/metrics` - Fetch real-time operational metrics (Prometheus/OpenTelemetry bridge).
- `GET /api/v1/metrics/trends` - Fetch aggregated historical metrics.
- `GET /api/v1/health` - Aggregate health status of all subsystems.

### 2. Governance API
Converts static markdown ledgers into dynamic, queryable state.
- `GET /api/v1/governance/ledger` - Fetch current maturity stages and execution statuses.
- `GET /api/v1/governance/asi` - Fetch the real-time Architecture Stability Index score.
- `GET /api/v1/governance/baselines` - Fetch frozen baseline statuses.
- `GET /api/v1/governance/adrs` - Fetch list of architectural decision records.

### 3. Evidence API
Exposes the results of verification phases.
- `GET /api/v1/evidence/integration` - Fetch the latest Integration Evidence Pack summary.
- `GET /api/v1/evidence/operational` - Fetch the latest RC Assessment Evidence Pack summary.

### 4. Incident & Runbook API
Exposes response protocols and active incidents.
- `GET /api/v1/incidents` - List active and historical incidents.
- `POST /api/v1/incidents` - Manually trigger an incident status.
- `GET /api/v1/runbooks` - List available incident response runbooks.
- `GET /api/v1/runbooks/{id}` - Fetch specific runbook execution steps.

### 5. Deployment & Audit API
Exposes environment states and immutable logs.
- `GET /api/v1/deployments` - Fetch active deployment versions across environments.
- `GET /api/v1/audit` - Fetch immutable control-plane action logs.
- `GET /api/v1/secrets/status` - Fetch secret rotation compliance statuses (values are never exposed).
