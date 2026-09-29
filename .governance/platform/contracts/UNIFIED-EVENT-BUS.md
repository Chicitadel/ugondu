# UNIFIED EVENT BUS

**Governance Status:** FROZEN
**Version:** 1.0.0
**Classification:** Enterprise Standard

## Event-Driven Decoupling
To achieve horizontal platform integration, the ecosystem relies on the **Unified Event Bus**.

## "Events as Facts" Policy
Events MUST describe domain facts, not commands. 
- **ALLOWED**: `TenantProvisioned`, `LicenseActivated`, `InvoiceIssued`, `DeploymentCompleted`, `EvidenceRecorded`
- **PROHIBITED**: `CreateUserNow`, `StartDeployment`

Keeping events factual ensures the system remains decoupled and easier to evolve.
