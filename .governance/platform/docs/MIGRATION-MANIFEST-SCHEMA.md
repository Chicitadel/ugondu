# MIGRATION MANIFEST SCHEMA

**Version:** 1.0.0
**Classification:** Enterprise Standard

## Purpose
Every repository or capability executing through the Migration-First pipeline MUST provide a `migration_manifest.yaml` at its root. This manifest acts as the deterministic input to the Adaptive Execution Scheduler, allowing dynamic routing of migration tasks.

## Schema Specification

```yaml
# migration_manifest.yaml

repository:
  name: certify.airroofers.eu # The target Air Roofers repository
  capabilities:
    - identity.verification
    - identity.certify

origin:
  path: consunexia/consunexia-certify # The source location

migration:
  strategy: extraction # [native_refactor, extraction, shared_promotion]
  
  compatibility_state: dual_compatibility # [legacy, dual_compatibility, new_preferred, legacy_retired]
  
  routing: legacy # [legacy, shadow, new]

  status:
    build: passing # [passing, failing, pending]
    tests: passing # [passing, failing, pending]

  metrics:
    score: 72 # Out of 100 based on the 7-point metric
    debt: 28  # 100 - score

scheduler:
  priority: critical
  parallelizable: true
```
