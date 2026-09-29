# MDR-001

mdr: MDR-001
title: Certify Extraction
date: 2026-07-17
status: Executing # [Draft, Approved, Executing, Validated, Closed]

reason: |
  Extract the identity verification and certification context into a standalone 
  bounded service to decouple it from the consunexia monolith and prepare it 
  for the Air Roofers platform architecture.

source_repository: consunexia/consunexia-certify
target_repository: certify.airroofers.eu

migration_strategy: extraction

rollback_plan: |
  Route traffic back to consunexia legacy deployment via API Gateway. 
  No data mutation occurs in new service until Shadow Validation completes.

compatibility_state: legacy

evidence:
  - tests_passing: false # Pending CI configuration
  - history_preserved: false # N/A due to absence of source .git
  - dependencies_validated: true

approval:
  - Platform Architecture Council
