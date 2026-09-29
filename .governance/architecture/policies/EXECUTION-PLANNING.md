# Execution Planning Standard

**Governance Status:** FROZEN
**Version:** 2.0.0

This policy defines the hyper-mature, execution-governed planning standard required before any implementation wave begins. Future improvements to this template require an Architectural Decision Record (ADR), clear justification, and evidence that the change improves delivery.

## Permanent Planning Rule

> **No implementation plan may proceed to execution unless at least 90% of the engineering decisions that would otherwise arise during coding have already been documented, decomposed, assigned dependencies, provided rollback and verification procedures, and classified for parallel execution.**

## The Execution-Governed Implementation Plan

The implementation plan is an **input to the execution engine**, not just a descriptive document. Every plan must contain the following 32 sections exactly. Missing sections invalidate the plan.

### Core Structure
*   **Section 0 — Executive Summary** (Maps to Program Increment, Capability Wave, Execution Stream)
*   **Section 1 — Dependency Graph**
*   **Section 2 — Critical Path Analysis**
*   **Section 3 — Current State Analysis**
*   **Section 4 — Cross-Cutting Concerns**: Evaluates Security, Performance, Accessibility, Internationalization, Privacy, Compliance, Licensing, Telemetry, Disaster recovery, Upgrade/migration, and Backward compatibility explicitly as Applicable, Not Applicable, or Deferred.
*   **Section 5 — Repository Impact Matrix**
*   **Section 6 — Resource Planning & Classification**
*   **Section 7 — Parallel Execution Matrix**
*   **Section 8 — Micro Work Packages**
*   **Section 9 — Multiple Parallel Streams**
*   **Section 10 — Synchronization Map**
*   **Section 11 — Performance Budgets**
*   **Section 12 — Security Checklist**
*   **Section 13 — ADR Impact**
*   **Section 14 — Expanded Failure Matrix**
*   **Section 15 — Expanded Deployment Profiles**
*   **Section 16 — Expanded Verification Matrix & Acceptance Tests**
*   **Section 17 — Code Review Checklist**
*   **Section 18 — Exit Criteria**
*   **Section 19 — Automatic Next-Wave Generation**

### Execution Manifest & Automation
*   **Section 20 — Execution Manifest**: Machine-readable YAML defining the Program, Wave, Streams, Work Packages, and deployment/rollback profiles.
*   **Section 21 — Capability Ownership**: Ownership by domain capability, not by individual engineer.
*   **Section 22 — Capability Lifecycle & Maturity**: Tracks standard lifecycle phases (Discovery → Architecture → Contracts → Reference Impl → Runtime/Provider/Product Adapters → Validation → Performance → Security → Documentation → Release) and L0-L9 Maturity rating.
*   **Section 23 — Merge Contract**: Explicitly defines what is permitted vs. forbidden in the target Merge Wave.
*   **Section 24 — Evidence Budget**: Specific evidence artifacts required before completion (e.g., Build + Replay + Security).
*   **Section 25 — Operational Budget**: Resource ceilings (Memory, CPU, Latency, Connections, Payload Size).
*   **Section 26 — Migration Budget**: Compatibility with current DB vs. target DB, and data migration necessity.
*   **Section 27 — Release Readiness Score**: Objective, weighted scoring across categories.
*   **Section 28 — Technical Debt Register**: Introduced, removed, deferred, and the planned retirement wave.
*   **Section 29 — PI Continuity**: Automatic tracking of completed/started waves, resolved dependencies, and remaining risks.
*   **Section 30 — Engineering Completion Certificate**: Objective evidence snapshot generated post-execution.
*   **Section 31 — Platform Compatibility Matrix**: Forces evaluation of supported capability classes (Product, Runtime, CMS, Deployment, Storage, Identity, AI) without exhausting individual technologies.
