<!--
/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Developer & Operator Documentation (Guide 08)
 * File           : 08-target-adapter-guide.md
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-10-18
 * Last Modified  : 2026-10-18
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance:
 * - Corporate Policy Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS 5.0
 * - NIST SP 800-53
 *
 * Signatures:
 * - Architecture Authority
 * - Security Authority
 * - Governance Authority
 * - Deployment Authority
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/
-->

# 08 — Target Adapter Guide

## 1. Universal Target Adapter Architecture

Ugondu decouples deployment and recovery orchestration from physical infrastructure via the **Target Adapter Contract**. Target adapters translate canonical `ArchitectureIR` DAG actions and `DEISE` repair plans into target-specific mutations across:
- **Shared/Managed Hosting Control Planes**: `cpanel`, `directadmin`
- **Cloud Providers**: `aws` (VPC, EC2, RDS, S3, ECR, ECS Fargate), `gcp`, `azure`
- **Container & Cluster Orchestrators**: `docker`, `kubernetes`
- **Virtualization & Bare Metal**: `vps`, `baremetal`, `vmware`, `proxmox`

---

## 2. Canonical Target Environment Strategies (`ADR-004`)

| Target Environment | Default Strategy | Atomic Symlink (`current`) | Physical Webroot (`public_html`) | DEISE Drift Guards |
|---|---|---|---|---|
| `cpanel` | `quota-sync` | Opt-in via `cloud` override | Required physical directory for disk quota tracking | `LR-0001`, `LR-0002` |
| `directadmin` | `quota-sync` | Opt-in via `cloud` override | `domains/<domain>/public_html` physical root | `LR-0002_DirectAdminMigrationFracture` |
| `cloud` (AWS/VPS) | `atomic` | `releases/<id>` -> `current` | Symlinked to `current/public` | `INFRASTRUCTURE_DRIFT`, `TOPOLOGY_DRIFT` |
| `kubernetes` | `atomic` (Rolling/ZDD) | Immutable image digest `@sha256:...` | Container filesystem (`readOnlyRootFilesystem`) | Pod/Deployment readiness & replica state |
| `baremetal` | `atomic` / `direct` | Configurable per recipe | Physical or symlinked root | `BasicFileIntegrityRepair`, `SymlinkRepair` |

---

## 3. Implementing a Target Adapter

### 3.1 Server-Side Provider Capability Declaration (`server/shared/capability-model.ts`)
Every target adapter registers a `ProviderCapabilityDeclaration`:

```typescript
import { CapabilityKind, ProviderCapabilityDeclaration } from '@ugondu/shared/capability-model';

export const AwsTargetDeclaration: ProviderCapabilityDeclaration = {
  provider: 'aws',
  supportedCapabilities: [
    CapabilityKind.Compute,
    CapabilityKind.Network,
    CapabilityKind.Database,
    CapabilityKind.Storage,
    CapabilityKind.Registry,
    CapabilityKind.Observability,
    CapabilityKind.Backup,
    CapabilityKind.Recovery
  ],
  supportedRegions: ['eu-west-3', 'eu-central-1', 'us-east-1'],
  authMethods: ['oidc-sts', 'iam-role'],
  limits: { maxConcurrentTransactions: 50 },
  pricingModel: 'pay-as-you-go'
};
```

### 3.2 Mandatory 4-Phase Execution Contract
Every mutating operation in a Target Adapter must implement four deterministic phases:
1. **`discover(context)`**: Queries actual target state to populate `EnvironmentTwin` (`OBSERVATION_ONLY`).
2. **`mutate(action, payload)`**: Applies the idempotent change with transaction ownership tags (`UgonduCOR=true`, `UgonduTransactionId=<txId>`).
3. **`verify(resourceId, expectedState)`**: Performs an independent read-back (`VERIFICATION_ONLY`) and hashes the canonical provider response via `ProviderResponseCanonicalizer`.
4. **`compensate(resourceId)`**: Reverses the mutation during URRE topological rollback (`CLEANUP_ONLY`).

### 3.3 Client-Side Safe Path Enforcement (`client/engine/safepath.go` & `server/shared/safepath.ts`)
All file-based target adapters must validate paths through `SafePath` before writing or linking:
- Reject path traversal sequences (`..`, `..\`).
- Reject null bytes (`\x00`).
- Verify resolved target path remains strictly inside the authorized workspace boundary.

---

## 4. Testing Target Adapters

```bash
# Test fabric interfaces and target adapters
npx jest tests/fabric-interfaces.test.js tests/fabric-adapters.test.js
npx jest tests/roadmap-r1-targets.test.js

# Test cPanel / DirectAdmin migration and rollback conformance
npx jest tests/move-source-target.test.js tests/move-rollback-cert.test.js
```

---

## 5. Exit Codes & Troubleshooting

| Error Code | Cause | Resolution |
|---|---|---|
| `SAFEPATH_TRAVERSAL_BLOCKED` | Target path resolved outside workspace root | Normalize relative paths inside the recipe payload |
| `DEISE_DO_NO_HARM_BLOCK` | Target `public_html` topology is broken while `releases/` is intact | Run `ugondu repair execute` to relink topology without overwriting payload |
| `UNQUALIFIED_IMAGE_TAG_REJECTED` | Container adapter received `:latest` instead of `@sha256:<digest>` | Pin container image by immutable SHA-256 digest |

---

## 6. Clean-Room Adapter Validation Checklist

- [ ] Adapter declares capabilities using `CapabilityKind` in `server/shared/capability-model.ts`.
- [ ] All mutations attach transaction ownership metadata (`UgonduTransactionId`).
- [ ] Every mutation is followed by an independent read-back verification before marking the node `SUCCESS`.
- [ ] `npx jest tests/fabric-adapters.test.js tests/roadmap-r1-targets.test.js` passes with exit code `0`.
