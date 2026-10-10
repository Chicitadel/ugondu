/******************************************************************************
 * Project        : ujomor-platform
 * Module         : Platform Operations
 * File           : RUNBOOKS.md
 * Version        : 1.0.0
 * Author         : Antigravity AI
 * Organization   : Ujomor
 * Created Date   : 2026-07-17
 * Last Modified  : 2026-07-17
 * Classification : INTERNAL
 *
 * Governance:
  * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS
 * - NIST
 *
 * Signatures:
 * - Architecture Authority
 * - Security Authority
 * - Governance Authority
 * - Deployment Authority
 *
 * Copyright (c) 2026 Ujomor
 * All Rights Reserved.
 ******************************************************************************/

# [TOKEN:OPERATIONS_RUNBOOKS]

## PURPOSE
This document provides the operational runbooks and incident response procedures for core platform services, aligning with the tokenized governance and observability standards.

## SUPPORTED SERVICES
1. Scheduler
2. Notifications
3. Automation
4. Workflow

---

# [RUNBOOK:SCHEDULER]

## SERVICE: Scheduler
**Purpose:** Manages execution of delayed or recurring tasks.

### INCIDENT: Missed Execution / Stalled Queue
**Symptoms:** 
- Metrics show increasing queue depth.
- Scheduled tasks are not executing within tolerance.

**Resolution Steps:**
1. **Verify Metrics:** Check the `scheduler_queue_depth` and `scheduler_execution_latency` metrics.
2. **Check Logs:** Search structured logs with `service=scheduler` for deadlocks, database connection errors, or memory limits.
3. **Scale Workers:** If purely load-based, increase the number of worker replicas.
4. **Database Locks:** Investigate database for stuck lock rows. Manually clear locks older than 5 minutes if identified as orphaned.
5. **Restart Service:** Restart the scheduler instances if health checks indicate a deadlock.

---

# [RUNBOOK:NOTIFICATIONS]

## SERVICE: Notifications
**Purpose:** Dispatches email, SMS, and in-app notifications to end users.

### INCIDENT: Delivery Failures / High Bounce Rate
**Symptoms:**
- Third-party provider reporting high error rates.
- Internal telemetry reporting `notification_dispatch_failure`.

**Resolution Steps:**
1. **Provider Status:** Check the status page of the third-party providers.
2. **Credential Validation:** Verify that API keys and secrets injection are valid and not expired.
3. **Rate Limiting:** Check if the platform has exceeded external API rate limits. If so, apply backoff and throttle configurations.
4. **Queue Inspection:** Review the Dead Letter Queue (DLQ). Re-drive failed messages once the upstream provider is stable.

---

# [RUNBOOK:AUTOMATION]

## SERVICE: Automation
**Purpose:** Executes user-defined business rules and system-level automation tasks.

### INCIDENT: Infinite Loops / Resource Exhaustion
**Symptoms:**
- Extremely high CPU/Memory usage on automation executors.
- Logs show recurring execution of the same automation trigger.

**Resolution Steps:**
1. **Identify Trigger:** Use distributed tracing and correlation IDs to identify the loop origin.
2. **Circuit Breaker:** If a specific user automation is misconfigured, disable the specific automation rule temporarily via the admin console.
3. **Throttling:** Ensure execution rate limits are enforced.
4. **Service Restart:** Kill OOM-prone workers to flush bad state, allowing clean workers to pick up governed executions.

---

# [RUNBOOK:WORKFLOW]

## SERVICE: Workflow
**Purpose:** Manages long-running, multi-step business processes and state transitions.

### INCIDENT: Stuck State / Orchestration Failure
**Symptoms:**
- Workflows stuck in `IN_PROGRESS` state beyond expected SLA.
- Failed state transitions.

**Resolution Steps:**
1. **State Inspection:** Query the workflow state database to find records where `updated_at` is older than the SLA threshold.
2. **Dependency Check:** Verify that external dependencies (microservices, APIs) required for the state transition are healthy.
3. **Manual Override:** For critical stuck workflows, use the governance-approved admin API to force a state transition or trigger a retry event.
4. **Audit Log:** Ensure any manual intervention is recorded in the platform audit logs.

