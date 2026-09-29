/******************************************************************************
 * Project        : Ujomor Platform
 * Module         : Orchestration - Workflow Engine
 * File           : WORKFLOW-ENGINE-GUIDE.md
 * Version        : 2.0.0 (Remediated)
 * Author         : Air Roofers Engineering
 * Organization   : Ujomor
 * Created Date   : 2026-07-17
 * Last Modified  : 2026-07-17
 * Classification : INTERNAL
 *
 * Provenance:
 * - AirRoofers\Operations\Orchestration\Workflow\Contracts\WorkflowDefinitionContract
 * - AirRoofers\Operations\Orchestration\Workflow\Contracts\WorkflowInstanceContract
 * - EVENT-ORCHESTRATION-WORKFLOW
 *
 * Governance:
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 *
 * Standards:
 * - ISO 27001
 * - SOC 2
 *
 * Copyright (c) 2026 Ujomor
 * All Rights Reserved.
 ******************************************************************************/

# Workflow Engine Developer Guide

## Introduction
The Ujomor Workflow Engine orchestrates complex, multi-step business processes across the Ujomor platform. It operates securely within the immutable Orchestration Dependency Graph:
`Event Platform -> Scheduler -> Notifications -> Automation -> Workflow`

## Source Contracts
This documentation is strictly derived from the PHP implementation contracts located at:
`d:\ujomor-platform\operations.airroofers.eu\src\Orchestration\Workflow\Contracts\`

### 1. Workflow Definition
Workflows are defined statically as Directed Acyclic Graphs (DAGs). 

The underlying contract is `AirRoofers\Operations\Orchestration\Workflow\Contracts\WorkflowDefinitionContract`:
```php
interface WorkflowDefinitionContract
{
    public function getDefinitionId(): string;
    public function getVersion(): string;
    public function getStates(): array; // Directed Acyclic Graph (DAG) of the workflow steps
    public function getInitialState(): string;
    public function getMetadata(): array;
}
```

### 2. Workflow Instance
When a definition is triggered, a runtime state machine is spawned. This execution context is governed by `AirRoofers\Operations\Orchestration\Workflow\Contracts\WorkflowInstanceContract`:

```php
interface WorkflowInstanceContract
{
    public function getInstanceId(): string;
    public function getDefinitionId(): string;
    public function getDefinitionVersion(): string;
    public function getCurrentState(): string;
    public function getContextData(): array; // Persisted workflow context state
    public function getStatus(): string; // 'RUNNING', 'SUSPENDED', 'COMPLETED', 'FAILED'
    public function getStartedAt(): \DateTimeImmutable;
}
```

## Governance Constraints
- **PHP Native**: The engine is fully implemented in PHP within the `operations.airroofers.eu` module. Do not attempt to use TypeScript SDK abstractions.
- **Acyclic Enforcement**: Workflows may schedule timeouts (`Scheduler`) or trigger manual tasks (`Notifications`), but those systems may never depend directly on the Workflow Engine.
- **Determinism**: Context Data arrays must only hold scalar state references, never complex runtime objects or large binary payloads.
