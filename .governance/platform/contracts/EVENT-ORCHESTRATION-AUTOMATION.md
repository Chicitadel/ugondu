# ORCHESTRATION EVENT CONTRACT: AUTOMATION

**Governance Status:** FROZEN
**Version:** 1.0.0

This document defines the strict lifecycle events emitted by the Declarative Automation Engine within `operations.airroofers.eu`. All events MUST adhere to the CloudEvent envelope standard.

## 1. RuleTriggered
Emitted when an incoming event matches a rule's criteria but before evaluation is complete.
- **Type**: `AirRoofers.Orchestration.RuleTriggered`
- **Payload**:
  - `rule_id`: string
  - `event_source`: string
  - `timestamp`: ISO8601

## 2. RuleEvaluated
Emitted when the expression engine completes evaluation.
- **Type**: `AirRoofers.Orchestration.RuleEvaluated`
- **Payload**:
  - `rule_id`: string
  - `result`: boolean
  - `evaluation_duration_ms`: integer

## 3. ActionExecuted
Emitted when a configured action for a true rule evaluation is successfully executed.
- **Type**: `AirRoofers.Orchestration.ActionExecuted`
- **Payload**:
  - `rule_id`: string
  - `action_type`: string
  - `action_id`: string
  - `executed_at`: ISO8601

## 4. RuleExecutionFailed
Emitted when evaluation or action execution fails.
- **Type**: `AirRoofers.Orchestration.RuleExecutionFailed`
- **Payload**:
  - `rule_id`: string
  - `phase`: string // 'EVALUATION' or 'EXECUTION'
  - `reason`: string
