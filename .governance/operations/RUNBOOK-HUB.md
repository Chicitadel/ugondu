# Operational Runbook: Hub Platform (OXCP)

This document outlines the operational procedures for the Hub Platform (`hub.airroofers.eu`).

## 1. Customer 360 and KPI Projection Rebuilds
If the definition of a KPI changes or a bug in the Customer 360 logic is deployed, the operational projections can be rebuilt with zero downtime from the Event History.

1. Deploy the updated Hub application (which registers a new projection schema version).
2. Trigger the Replay API: `POST /internal/projections/rebuild?target=OperationalKPIsProjection`
3. The Hub Platform will fetch all historical events from `EventId: 0` and recalculate all KPIs up to the present.
4. Once Staleness < 500ms, the router will automatically direct staff views to the updated projection.

## 2. Audit Timeline Reconstruction
The `UnifiedAuditTimeline` is inherently an append-only projection.
- Rebuilding the audit timeline involves scanning the Event History and mapping all domain events into human-readable chronologies.
- If an event type was previously ignored and is now included, a rebuild will insert it retroactively in the correct chronological position.

## 3. Delegation Failure Handling
Hub may initiate commands (e.g., "Suspend License").
- Commands are dispatched synchronously to the License platform API or asynchronously via targeted command queues.
- If the downstream platform is unavailable, Hub must gracefully notify the Operator that the command was queued or failed, and the Customer 360 projection will eventually reflect the change once it succeeds.
