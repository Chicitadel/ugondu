# Ugondu COR V9 — Split Managed Policy Pack (`aws.cor.v9`)

Author: Ujomor Systems Engineering & Governance Authority  
Governance: Corporate Policy Governed

## Overview

This policy pack contains the five split customer-managed IAM policies and role trust templates for `UgonduCORExecutionRole` and `UgonduCORRunner` in AWS account `971671216490` (`eu-west-3`).

## Safety Posture (Section 0.1 Fixture Rule)

- **Preserve unattached test fixture:** Keep `UgonduCORExecutionRole` and the five `UgonduCOR-V9-*` policies as a controlled test fixture until read-only inspection (`policy.inspect`) and planning (`policy.plan`) gates are verified and approved.
- **Target role:** Attach the five execution policies ONLY to `UgonduCORExecutionRole`, NEVER to `UgonduCORRunner`.
- **Statement preservation:** All 46 statements and `Sid` identifiers are preserved 1:1 across the five customer-managed policy templates.
