# Operational Runbook: Portal Platform (CXCP)

This document outlines the operational procedures for the Portal Platform (`portal.airroofers.eu`).

## 1. Projection Staleness Monitoring
Portal projections are read models built asynchronously from upstream events. Operations must monitor the "Staleness Index".
- **Threshold**: Projections should remain within 500ms of the Event History.
- **Alerting**: If Staleness > 5000ms, alert Operations to investigate the Dispatcher latency or Portal consumer throughput.

## 2. Projection Rebuild Procedure
If a read model becomes corrupt or a schema change requires a retroactive view, the projection can be rebuilt entirely from the immutable Event History:
1. Deploy the new schema or projection logic alongside the existing projection.
2. Trigger the Replay API: `POST /internal/projections/rebuild?target=CustomerLicenseProjection`
3. The Portal Platform will consume events from `EventId: 0` into the new projection table.
4. Once the new projection catches up (Staleness < 500ms), flip the read alias to the new projection.
5. Drop the old projection.
*Zero downtime is guaranteed during this procedure.*

## 3. Handling Out-of-Order Events
If the `ProjectionConsumer` detects an out-of-order sequence (e.g., event sequence 5 arrives before sequence 4):
- The event is placed into an internal reorder buffer.
- When sequence 4 arrives, it processes both.
- If the buffer TTL expires, the projection drops the event and alerts Operations.

## 4. Disaster Recovery
If the Portal database is completely lost:
1. Provision an empty database.
2. Trigger a full Projection Rebuild from the infrastructure Event History.
3. No manual intervention or data restoration from backups is necessary for read models.
