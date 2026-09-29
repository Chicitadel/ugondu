# ORCHESTRATION EVENT CONTRACT: WORKFLOW

**Governance Status:** FROZEN
**Version:** 1.0.0

This document defines the strict lifecycle events emitted by the Workflow Engine within `operations.airroofers.eu`. All events MUST adhere to the CloudEvent envelope standard.

## 1. WorkflowInstanceStarted
Emitted when a new workflow instance is instantiated and begins execution.
- **Type**: `AirRoofers.Orchestration.WorkflowInstanceStarted`
- **Payload**:
  - `workflow_id`: string
  - `definition_id`: string
  - `version`: string
  - `started_at`: ISO8601

## 2. WorkflowTaskActivated
Emitted when the Workflow Engine transitions to a specific state (task) and waits for a completion trigger.
- **Type**: `AirRoofers.Orchestration.WorkflowTaskActivated`
- **Payload**:
  - `workflow_id`: string
  - `task_id`: string
  - `task_type`: string // 'HUMAN_APPROVAL', 'TIMEOUT', etc.
  - `activated_at`: ISO8601

## 3. WorkflowTaskCompleted
Emitted when an activated task receives its callback/trigger and completes.
- **Type**: `AirRoofers.Orchestration.WorkflowTaskCompleted`
- **Payload**:
  - `workflow_id`: string
  - `task_id`: string
  - `completed_at`: ISO8601
  - `result_payload`: object

## 4. WorkflowInstanceCompleted
Emitted when a workflow reaches its terminal state successfully.
- **Type**: `AirRoofers.Orchestration.WorkflowInstanceCompleted`
- **Payload**:
  - `workflow_id`: string
  - `completed_at`: ISO8601

## 5. WorkflowInstanceFailed
Emitted when a workflow fails and transitions to compensation or dead-letter state.
- **Type**: `AirRoofers.Orchestration.WorkflowInstanceFailed`
- **Payload**:
  - `workflow_id`: string
  - `failed_at`: ISO8601
  - `reason`: string
