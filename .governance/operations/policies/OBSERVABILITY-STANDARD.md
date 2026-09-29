# Observability Standard

**Governance Status:** FROZEN
**Version:** 1.0.0

To enable the Platform Intelligence (Phase 8) and ensure operational resilience, every platform within the Air Roofers ecosystem must emit standardized observability data to the central `operations.airroofers.eu` platform.

## 1. Correlation Identifiers
- Every incoming HTTP request at the edge (Gateway/Load Balancer) MUST be assigned an `X-Correlation-ID`.
- This ID MUST be passed down to all downstream platform API calls.
- This ID MUST be included in every log line emitted during the request's lifecycle.

## 2. Structured Logging
All applications MUST log in JSON format to `stdout/stderr` (or to a designated centralized log rotation daemon). 

**Required Base Schema:**
```json
{
  "timestamp": "ISO8601",
  "level": "INFO|WARN|ERROR|DEBUG",
  "platform": "string (e.g., billing.airroofers.eu)",
  "correlation_id": "UUID",
  "message": "string",
  "context": { ... }
}
```

## 3. Metrics (Prometheus/OpenTelemetry Format)
Platforms MUST expose a `/metrics` endpoint that is unauthenticated internally but blocked from the public internet.

**Required Metrics:**
- `http_requests_total{method, route, status}`
- `http_request_duration_seconds_bucket{method, route}`
- `database_connection_pool_active`
- `event_bus_publish_failures_total`

## 4. Health Checks
Platforms MUST expose a `/health` endpoint.
- **Liveness Probe**: Returns 200 OK immediately if the web process is running.
- **Readiness Probe (`/health/ready`)**: Verifies backing connections (Database, Cache, Operations API). Returns 503 Service Unavailable if dependencies are unreachable.
