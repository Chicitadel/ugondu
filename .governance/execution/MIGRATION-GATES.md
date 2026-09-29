# [TOKEN:MIGRATION_ACCEPTANCE_GATES]

## PURPOSE
To prevent unverified architectural changes, blind refactoring, and unvalidated repository extractions from destabilizing the ecosystem.

## IMMUTABLE MIGRATION RULE
> **No automated refactoring, namespace replacement, file movement, or repository migration may be performed until the target repository has been audited and designated as the canonical destination. Every migration must be followed by build verification, static analysis, integration testing, and deployment validation before the source repository is considered migrated.**

## THE 7 GATES OF MIGRATION ACCEPTANCE
Every migration MUST pass the following gates sequentially. A failure at any gate blocks the migration from being marked as complete.

### Gate 1: Repository Audit
* Canonical destination identified.
* Legacy stubs identified.

### Gate 2: Migration
* Files moved.
* Namespaces updated.

### Gate 3: Build
* Dependencies resolved (Composer/NPM).
* Autoloader generated successfully.

### Gate 4: Static Analysis
* Syntax checks pass (`php -l` or equivalent).
* No broken imports or missing classes.

### Gate 5: Tests
* Unit tests pass.
* Integration tests pass.

### Gate 6: Deployment
* Configuration mapped correctly.
* Environment variables migrated.

### Gate 7: Smoke Tests
* Critical paths resolve with HTTP 200/3xx.
* No fatal runtime errors.

## OUTPUT FORMAT
All migration completions MUST be accompanied by an evidence-based output matrix:
```text
Repository: [NAME]
Migration: PASS/FAIL
Composer: PASS/FAIL
Namespaces: PASS/FAIL
Routes: PASS/FAIL
Views: PASS/FAIL
Authentication: PASS/FAIL
Integration Tests: PASS/FAIL
Deployment: PASS/FAIL
Smoke Test: PASS/FAIL
```

## COMPATIBILITY LAYER RULE
During migration, it is acceptable to introduce temporary adapters, aliases, and facades ONLY IF:
* They are clearly marked as temporary.
* They have an owner.
* They have an associated removal task.
* They have a target removal milestone.

# Canonical Repository Migration Rule
When a source repository already contains the canonical implementation of a platform capability, the first objective is to migrate that implementation into its permanent repository while preserving functionality, history where practical, and deployment artifacts. Scaffolding a new implementation in the destination repository before migrating the existing code is prohibited, except for minimal bootstrapping needed to receive the migrated code.

# Canonical Platform Stabilization Framework
The execution sequence for transitioning repositories to their final architectures is:
1. **Stage 1**: Repository Consolidation
2. **Stage 2**: Repository Verification
3. **Stage 3**: Namespace Normalization
4. **Stage 4**: SDK Adoption
5. **Stage 5**: Dependency Inversion
6. **Stage 6**: Legacy Retirement

# Repository Exit Checklist
Before any legacy repository is archived or deprecated (Stage 6), it must satisfy all of the following requirements:
| Check | Required |
| --- | --- |
| All source files accounted for | Yes |
| Git history preserved | Yes |
| Composer/autoload valid | Yes |
| Tests passing | Yes |
| Public routes verified | Yes |
| Configuration migrated | Yes |
| Environment variables reviewed | Yes |
| Database migrations reviewed | Yes |
| Scheduled jobs migrated | Yes |
| Assets migrated | Yes |
| Documentation updated | Yes |
| Legacy repository marked read-only | Yes |

# Canonical Capability Ownership Rule
Every business capability must have exactly one canonical owner repository. Other repositories may consume that capability only through published APIs, SDKs, events, or gateway contracts. Duplicate implementations are prohibited except during controlled migration, where they must be explicitly marked as temporary and removed before Stage 6.

# Migration Pattern Taxonomy
The platform migration strategy distinguishes three distinct patterns to prevent forcing all repositories into identical workflows:

## Pattern A — Repository Consolidation
Existing mature repositories become canonical.
* Billing
* License
* Telemetry
* Hub
* Portal

## Pattern B — Capability Consolidation
Capabilities scattered across repositories are unified into a new canonical repository.
* Identity
* (Future: Zero Trust)

## Pattern C — Capability Extraction
A capability embedded inside another platform becomes an independent platform.
* Products
* (Potentially: Downloads, Documentation)

# Consumer Last Rule
During Capability Extraction, no consuming repository may be modified until the destination platform has:
* complete domain model,
* stable public contracts,
* versioned APIs,
* capability verification,
* integration tests.

Consumers migrate only after the destination has become operational.

# Canonical Read Rule
Any repository that owns a canonical business capability is the sole authoritative read source for that capability. Other repositories may cache or index the data for performance, but they must never become alternative sources of truth.

# Phase 4 Rollback Criteria
Before migrating consumers to the Products canonical platform, explicit rollback conditions are defined:
* **Developer**: Roll back on contract failure or latency spikes.
* **Hub**: Roll back if product resolution or metadata mismatch occurs.
* **License**: Roll back if entitlement activation behavior drifts.
* **Billing**: Roll back if plan mappings change or invoice generation fails.
