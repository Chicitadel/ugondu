# ORCHESTRATION EVENT CONTRACT: SCHEDULER

**Governance Status:** FROZEN
**Version:** 1.0.0

This document defines the strict lifecycle events emitted by the Job Scheduler Engine within `operations.airroofers.eu`. All events MUST adhere to the CloudEvent envelope standard.

## 1. JobScheduled
Emitted when a new job has been successfully registered and persisted.
- **Type**: `AirRoofers.Orchestration.JobScheduled`
- **Payload**:
  - `job_id`: string
  - `scheduled_at`: ISO8601 Timestamp
  - `payload_event_type`: string

## 2. JobStarted
Emitted when the engine picks up a job for execution immediately prior to dispatching the configured payload event.
- **Type**: `AirRoofers.Orchestration.JobStarted`
- **Payload**:
  - `job_id`: string
  - `started_at`: ISO8601 Timestamp

## 3. JobCompleted
Emitted after the job has successfully dispatched its target event.
- **Type**: `AirRoofers.Orchestration.JobCompleted`
- **Payload**:
  - `job_id`: string
  - `completed_at`: ISO8601 Timestamp

## 4. JobCancelled
Emitted when a scheduled job is explicitly cancelled before execution.
- **Type**: `AirRoofers.Orchestration.JobCancelled`
- **Payload**:
  - `job_id`: string
  - `cancelled_at`: ISO8601 Timestamp

## 5. JobFailed
Emitted when a job execution fails (e.g., failure to route the event, timeout). Used to trigger dead-letter queues and escalation.
- **Type**: `AirRoofers.Orchestration.JobFailed`
- **Payload**:
  - `job_id`: string
  - `failed_at`: ISO8601 Timestamp
  - `reason`: string
  - `retry_count`: integer
