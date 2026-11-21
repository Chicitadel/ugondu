# Ugondu COR V9 — Threat Model & Security Guardrails

Author: Ujomor Systems Engineering & Governance Authority  
Governance: Corporate Policy Governed

## Security Controls

1. **Bootstrap & Runtime Separation:** `UgonduCORRunner` may only assume `UgonduCORExecutionRole` with required `UgonduTransactionId` and `UgonduCOR` session tags. Execution policies are prohibited on `UgonduCORRunner`.
2. **Transaction Isolation:** Mutating EC2, RDS, S3, ECR, and ECS statements enforce `aws:PrincipalTag/UgonduTransactionId` and `aws:RequestedRegion = eu-west-3`.
3. **Tag Stripping Protection:** Explicit `Deny` rules (`DenyRemovalOfUgonduOwnershipTags`, `DenyECSTagStripping`) prevent removal of `UgonduCOR=true` tags.
4. **Scoped PassRole:** `AllowPassRoleForECS` restricts `iam:PassRole` to `arn:aws:iam::971671216490:role/ecsTaskExecutionRole` when passed to `ecs-tasks.amazonaws.com`.
5. **Safe Retirement:** Adopted, shared, user-owned, external, and unknown-ownership objects are preserved during retirement/uninstall. `--force` never bypasses ownership or safety checks.
