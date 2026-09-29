# PLATFORM ORCHESTRATION REGISTRY & POLICY

**Governance Status:** FROZEN
**Version:** 1.0.0

This document defines the rules of engagement and architectural boundaries for the Enterprise Orchestration modules hosted within the `operations.airroofers.eu` infrastructure platform.

## The Immutable Rule of Orchestration State
> **No orchestration module may own business state.**

### Explanation
Orchestration modules exist to coordinate actions, manage time, handle failures, and route communication. They do **not** own the business entities they act upon.

- **Workflow Engine**: Tracks workflow execution state, step progress, and compensation state. It does *not* own the business entity being approved or processed.
- **Scheduler**: Tracks scheduled execution time, retries, and job state. It does *not* own the business payload of the job.
- **Notifications**: Tracks delivery status, read receipts, and routing preferences. It does *not* own the underlying business event that triggered the notification.
- **Automation**: Tracks rule evaluation and policy execution state. It does *not* own the domain objects it evaluates.

Business ownership remains strictly within the **Core Services**:
- Identity
- Products
- Licensing
- Billing

## Integration Paradigm
All orchestration modules MUST integrate with the rest of the ecosystem exclusively via the **Event Platform**. 
- They receive `CloudEvents` to trigger workflows, schedules, rules, or notifications.
- They emit `CloudEvents` to command Core Services to mutate business state or to announce orchestration milestones.
