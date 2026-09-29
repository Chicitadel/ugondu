# MIGRATION DECISION RECORD (MDR) SCHEMA

**Version:** 1.0.0
**Classification:** Enterprise Standard

## Purpose
The Migration Decision Record (MDR) formally documents the extraction rationale, boundaries, rollback plans, and compatibility states of a migration execution. It acts similarly to an ADR, but is scoped purely to the transition from a legacy state to an Air Roofers state.

## Lifecycle
An MDR follows a strict progression:
`Draft -> Approved -> Executing -> Validated -> Closed (Read-Only)`

*Once an MDR is Closed, it is strictly immutable. If circumstances require a different migration path, a new MDR must be created to preserve the audit trail.*

## Schema Specification

```yaml
# mdr-001-example.yaml

mdr: MDR-001
title: Certify Extraction
date: YYYY-MM-DD
status: Draft # [Draft, Approved, Executing, Validated, Closed]

reason: |
  Extract the identity verification and certification context into a standalone 
  bounded service to decouple it from the consunexia monolith.

source_repository: consunexia/consunexia-certify
target_repository: certify.airroofers.eu

migration_strategy: extraction

rollback_plan: |
  Route traffic back to consunexia legacy deployment via API Gateway. 
  No data mutation occurs in new service until Shadow Validation completes.

compatibility_state: dual_compatibility

evidence:
  - tests_passing
  - history_preserved
  - dependencies_validated

approval:
  - Platform Architecture Council
```
