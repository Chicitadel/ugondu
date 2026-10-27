# Ugondu Execution & Master COR Checklist (Phase: Final Pre-Certification)

**Date:** 2026-10-05
**State:** Candidate Remediation
**Goal:** Achieve 100% PASS on Physical Certification without synthetic overrides.

## Executive Summary
This document serves as the formal execution guide and master checklist for the final pre-certification campaign of the Ugondu Universal Autonomous Platform. All P0 deficiencies from previous audits will be systematically addressed by a massive parallel subagent fleet.

## Subagent Fleet Strategy
A specialized, parallel fleet of subagents will be invoked to execute the remaining requirements:
1.  **Fargate/ECS Lead Subagent:** Implements P0-6 (Fargate physical orchestration, Awsvpc, Task vs Execution roles).
2.  **URRE Idempotency & Resiliency Subagent:** Implements P0-4 (Kill/Restart/Resume tests using actual DAG persistence).
3.  **Universal Action/Interface Subagent:** Implements P0-7 (Canonical action registry).
4.  **Localization & Tokenization Integrity Subagent:** Corrects boundary failures; translates to all existing languages, zero hard-coding of true UI text.
5.  **Stubs, Mocks, & Microservices Subagent:** Eliminates deprecated code/stubs non-destructively; verifies boundaries.
6.  **Immutable Certification Runner Subagent:** Finalizes P0-2 and P0-3, ensuring the runner uses `GateEvaluator` to mechanically translate observations to unalterable gate states (`PASS`, `FAIL`, `NOT_PROVEN`).

---

## MASTER CHECKLIST

### P0-1: Build & Source Integrity
- [x] Subagent implementation freeze.
- [ ] Run exact pushed commit through CI (Build, test, lint).

### P0-2: Immutable COR Runner
- [x] Remove all `appendGate('PASS')` string replacements.
- [ ] Implement `ExecutionObservation -> GateEvaluator -> ImmutableGateResult`.
- [ ] Mechanically enforce: OBSERVED SUCCESS -> PASS, SIMULATION -> NOT_PROVEN.

### P0-3: Real AWS Physical Lifecycle
- [ ] True RDS instantiation (Polling until `available`).
- [ ] True EC2 instantiation.
- [ ] True S3 Bucket & Object lifecycle.
- [ ] True AWS VPC/Subnet creation.

### P0-4: URRE Restart/Resume/Idempotency
- [ ] Serialize transaction state to disk.
- [ ] Simulate process crash / kill.
- [ ] Resume URRE from persistent state.
- [ ] Verify topological teardown of recovered DAG.

### P0-5: Physical DEISE
- [x] Use `AwsPhysicalRepairExecutor` for out-of-band drift.
- [ ] Physically mutate an AWS resource.
- [ ] DEISE detects and fires corrective AWS API operation.
- [ ] Verify mutation via separate read.

### P0-6: Fargate/ECS Orchestration
- [ ] Implement `awsvpc` networking.
- [ ] Distinguish Task Execution Role from Task Role.
- [ ] Verify ECS service-level failure/recovery.

### P0-7: Universal Action / Interface Layer
- [ ] Consistently expose canonical Universal Action Registry across CLI, UI, and workflows.

### Localization, Tokenization & Code Quality
- [ ] Classify extracted strings (UI vs Constants).
- [ ] Localize UI text across all required languages (fr, es, de, zh, ja, etc.).
- [ ] Non-destructive elimination of deprecated/obsolete code.
- [ ] Total elimination of remaining stubs/mocks.
