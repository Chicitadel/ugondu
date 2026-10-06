# UGONDU REMEDIATION EXECUTION PLAN

## PHASE 6 & 7: REMEDIATION IMPLEMENTATION

### [TASK-001] Security/IP Leakage (C0)
- **Target**: `client/cmd/cli.ts` (or equivalent client routers) and `server/engine-core/src/security/gateway.ts`.
- **Action**: Strip edition capability logic from the client. Ensure the CLI simply acts as a dumb terminal. The server must enforce all edition capabilities explicitly via API Gateway middleware.

### [TASK-002] Fake Modularity / Plugin Coupling (C0)
- **Target**: `server/engine-core/src/` (specifically domain models referencing plugins).
- **Action**: Eradicate `PaymentPlugin` imports. Rely strictly on dependency injection via `Capability Interfaces`. If the plugin is missing, the capability must gracefully degrade or return `UNSUPPORTED`.

### [TASK-003] Execution Recovery Completeness (C0)
- **Target**: `server/engine-core/src/recovery/state-manager.ts`.
- **Action**: Replace `// TODO: Implement crash recovery loop` with functional, persistence-backed transaction recovery logic for AWS Fargate/container preemptions.

### [TASK-004] Localization & Hardcoding (C1)
- **Target**: All `src` and `api` routes containing raw strings (e.g. "Deployment Failed").
- **Action**: Tokenize all identified text into `i18n.t('error.deployment.failed')` mapping back to universal locale JSONs.

---
*Autonomous Subagents will be dispatched to execute these implementations safely in parallel.*
