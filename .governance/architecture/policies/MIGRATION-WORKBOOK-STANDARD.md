# Air Roofers Migration Workbook Standard

**Governance Status:** FROZEN
**Version:** 1.0.0

## The Repository Audit Rule (MANDATORY)
> Before implementing, refactoring, extracting, or migrating any capability, perform a repository audit rooted at `D:\ujomor-platform`. The audit must identify the canonical implementation, detect duplicate or obsolete repositories, and classify each repository as ACTIVE, MIGRATING, LEGACY, ARCHIVED, or EXPERIMENTAL. No migration or overwrite is permitted until this classification is complete and the destination repository has been confirmed.

## Migration Workbook Schema
Every execution task must use this Migration Workbook format rather than a greenfield implementation plan.

### 1. Current State
*   Repository path
*   Current deployment
*   Current subdomain
*   Runtime
*   Dependencies

### 2. Audit & Classification
*   Duplicate implementations
*   Missing modules
*   Obsolete modules
*   Shared libraries
*   Classification (ACTIVE, MIGRATING, LEGACY, ARCHIVED, EXPERIMENTAL)

### 3. Migration Execution
*   Files to move
*   Files to keep
*   Files to delete
*   Configuration changes

### 4. Refactoring
*   Namespace alignment
*   Configuration alignment
*   Contract alignment
*   Dependency cleanup

### 5. Validation
*   Tests
*   Deployment
*   Rollback
*   Evidence

## Migration Waves
*   **Wave 0:** Discovery & Audit
*   **Wave 1:** Extraction
*   **Wave 2:** Refactoring
*   **Wave 3:** Platform Integration
*   **Wave 4:** Production Readiness

## Execution Priority
1.  **Experience Layer:** `hub`, `portal`
2.  **Core Platform:** `identity`, `license`, `billing`, `products`, `operations`
3.  **Engineering:** `developer`, `downloads`
4.  **Supporting Services:** `bootstrap`, `certify`, `ingestion`, `edge`, `telemetry`
