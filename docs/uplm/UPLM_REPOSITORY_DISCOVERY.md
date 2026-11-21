<!--
/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPLM Phase 0 Repository Discovery
 * File           : UPLM_REPOSITORY_DISCOVERY.md
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

# UPLM Phase 0 — Repository Discovery Report

## 1. Executive Summary

This document records the authoritative Phase 0 forensic discovery of the Ugondu repository (`d:\ujomor-platform\products\ugondu`) for **Universal Plugin Lifecycle Management (UPLM)**. It inventories all workspaces, runtime services, plugin catalogs, durable state engines (`URRE` / `DEISE`), capability registries, client surfaces, and physical AWS certification topologies.

---

## 2. Monorepo & Workspace Topology

Ugondu is structured as a governed Node.js TypeScript workspace monorepo paired with a cross-platform Go thin client (`client/`):

| Workspace / Directory | Package Name | Port / Binary | Role in UPLM & Delivery |
|---|---|---|---|
| `server/shared` | `@ugondu/shared` | Library | Shared capability model (`CapabilityKind`), `trust_registry.ts`, `urre-journal.ts`, `urre-preflight.ts`, `urre-recovery.ts`, `environment-twin.ts`, `safepath.ts`, `ssrf.ts`, 12-locale `i18n.ts` |
| `server/engine-core` | `@ugondu/engine-core` | `:4001` | Primary orchestrator, Intent Compiler, `ArchitectureIR` DAG builder, URRE durable state machine, DEISE drift engine, AI Inference Gateway, Ed25519/HMAC recipe signing |
| `server/billing-gateway` | `@ugondu/billing-gateway` | `:4002` | Mandatag license authority integration, edition resolution (`COMMUNITY` through `SOVEREIGN`), plugin quota enforcement |
| `server/plugin-manager` | `@ugondu/plugin-manager` | `:4003` | UPLM admission gate, Ed25519 manifest verification, rootless container sandbox execution (`POST /v1/provision`, `POST /v1/deprovision`) |
| `server/event-bus` | `@ugondu/event-bus` | `:4004` | Isolated pub/sub message broker, audit trail dispatch, telemetry correlation |
| `server/repository-adapter` | `@ugondu/repository-adapter` | `:4005` | 9-provider Git/SCM detection, URL normalization, API resolution, credential key mapping |
| `server/uppie` | `@ugondu/uppie` | Library / Engine | Unified Policy & Permission Intelligence Engine (UPPIE) evaluating `ArchitectureIR` before issuing `ExecutionAuthorization` seals |
| `server/capabilities` | `@ugondu/capabilities` | Library / Registry | Runtime `CapabilityRegistry` and capability lifecycle declarations |
| `server/plugins/*` | Domain Plugins | Sandboxed | `aws-vpc-adapter`, `recovery-code`, `recovery-config`, `recovery-database`, `recovery-dependencies`, `recovery-http`, `recovery-network`, `recovery-zdd` |
| `plugins/*` | Bundled Build Plugins | Sandboxed | `ugondu-plugin-node`, `ugondu-plugin-composer` |
| `client/` | `ugondu` (Go 1.22+) | CLI Binary | Thin client executing signed recipes, local transaction journaling (`~/.ugondu/transactions/<txId>`), OIDC PKCE login, locale packs, and `repair`/`plugin` commands |

---

## 3. Discovered Plugin & Capability Inventory

### 3.1 Bundled & Domain Plugins
1. **`ugondu-plugin-node`**: Node.js (`npm`, `yarn`, `pnpm`, `bun`) lockfile verification and deterministic build execution.
2. **`ugondu-plugin-composer`**: PHP Composer dependency resolution and PSR-4 autoloader generation.
3. **`aws-vpc-adapter`** (`server/plugins/aws-vpc-adapter`): Physical AWS infrastructure lifecycle adapter for VPC, Subnet, Internet Gateway, Route Table, Security Group, EC2, EBS Snapshot, RDS, S3, ECR, and ECS Fargate.
4. **DEISE Recovery Plugins** (`server/plugins/recovery-*`):
   - `recovery-code`: Source tree and release payload integrity restoration.
   - `recovery-config`: Environment configuration and web server configuration repair.
   - `recovery-database`: Database connectivity and schema state recovery.
   - `recovery-dependencies`: Package tree and vendor directory reconstruction.
   - `recovery-http`: HTTP probe, TLS, and upstream routing restoration.
   - `recovery-network`: Firewall, security group, and route table remediation.
   - `recovery-zdd`: Atomic symlink (`current` -> `releases/<id>`) and physical document root (`public_html`) topology repair.

### 3.2 Trust & Cryptographic Roots
- **Plugin Authority Public Key**: `config/trust/plugin_authority.pub.pem` and `server/plugin-manager/plugin_pub.pem` (Ed25519).
- **Replay Protection Ledger**: `.service_replay_ledger.json` (untracked runtime state; forbidden in git index per `scripts/verify-release-integrity.js`).
- **Release Integrity Gate**: `scripts/verify-release-integrity.js` enforces zero repository-held private keys (`*private.pem`, `BEGIN PRIVATE KEY`) and verifies commit/tree hash bindings.

---

## 4. Durable State Machine Discovery (`URRE` & `DEISE`)

- **URRE (Universal Resilient Recovery & Execution Engine)**:
  - Persists deterministic DAG execution checkpoints in `.urre/checkpoints/` and `~/.ugondu/transactions/<txId>/state.json`.
  - Supports `ExecutionFaultInjector` (`afterNodePersisted`) for deterministic crash-resume testing (`server/engine-core/urre-crash-resume.ts`).
  - Executes reverse topological teardown on rollback (`COR-5.4`).
- **DEISE (Deployment Environment Integrity & Self-Healing Engine)**:
  - Constructs an `EnvironmentTwin` before any target mutation.
  - Classifies drift into `PAYLOAD_DRIFT`, `TOPOLOGY_DRIFT`, `ENVIRONMENT_DRIFT`, and `RUNTIME_DRIFT` (plus `INFRASTRUCTURE_DRIFT` for cloud resources).
  - Enforces the **"Do No Harm" Invariant**: blocks destructive `--delete` synchronization when topology drift is detected on intact releases.

---

## 5. AWS Physical Certification & IAM Authority Discovery

- **Target AWS Account**: `971671216490`
- **Target Region**: `eu-west-3` (Paris)
- **Canonical Execution Role**: `arn:aws:iam::971671216490:role/UgonduCORExecutionRole` (with OIDC federation runner `UgonduCORRunner`)
- **Policy Architecture**: `server/engine-core/Ugondu_CORExecutionRole_Policy_V9.json` defines strict ABAC tag-scoped (`UgonduCOR=true`, `UgonduTransactionId=${aws:PrincipalTag/UgonduTransactionId}`) permissions partitioned across 5 managed policies to respect AWS IAM managed policy size limits while enforcing zero-trust resource containment.
