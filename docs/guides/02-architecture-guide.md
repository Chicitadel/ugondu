<!--
/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Developer & Operator Documentation (Guide 02)
 * File           : 02-architecture-guide.md
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

# 02 — Architecture Guide

## 1. System Topology & Design Philosophy

Ugondu implements a **thin-client / server-governed microservice architecture** (`ADR-001` through `ADR-006`). Business logic, policy evaluation (**UPPIE**), environment drift diagnosis (**DEISE**), durable execution planning (**URRE**), and cryptographic signing remain exclusively within the control plane. The Go thin client (`ugondu`) acts as a deterministic, zero-trust execution agent.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Actor Surface Layer                               │
│     Go Thin Client CLI (ugondu)   |   Web UI   |   CI/CD OIDC Runners       │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │ HTTPS (Bearer JWT Passport)
┌───────────────────────────────────▼─────────────────────────────────────────┐
│                     Engine Core Orchestrator (:4001)                        │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────────────────┐  │
│  │ Intent Simulator │─►│ ArchitectureIR   │─►│ UPPIE Policy & Quota Gate │  │
│  └──────────────────┘  └──────────────────┘  └─────────────┬─────────────┘  │
│                                                            ▼                │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────────────────┐  │
│  │ DEISE Twin Drift │◄─┤ URRE State Engine│◄─┤ ExecutionAuthorization    │  │
│  └──────────────────┘  └──────────────────┘  └───────────────────────────┘  │
└──────┬───────────────────┬─────────────────────┬─────────────────────┬──────┘
       │                   │                     │                     │
       ▼                   ▼                     ▼                     ▼
┌──────────────┐   ┌──────────────┐      ┌──────────────┐     ┌───────────────┐
│   Billing    │   │    Plugin    │      │  Event Bus   │     │  Repository   │
│   Gateway    │   │   Manager    │      │    Broker    │     │    Adapter    │
│    :4002     │   │    :4003     │      │    :4004     │     │     :4005     │
└──────────────┘   └──────────────┘      └──────────────┘     └───────────────┘
```

---

## 2. Control Plane Services (`4001`–`4005`)

| Service | Port | Bounded Context & Key Modules |
|---|---:|---|
| **`engine-core`** | `4001` | Evaluates deployment/repair intents, invokes `repository-adapter` and `billing-gateway`, compiles `ArchitectureIR` DAGs, obtains UPPIE `ExecutionAuthorization` seals, runs URRE/DEISE state machines, routes AI Inference Gateway requests, and signs `ExecutionRecipe` payloads with Ed25519/HMAC-SHA256. |
| **`billing-gateway`** | `4002` | Integrates with **Mandatag** (`license.airroofers.eu`) and **AeroBill** (`billing.airroofers.eu`) to verify signed entitlement passports and resolve the 5-tier edition hierarchy (`COMMUNITY`, `PROFESSIONAL`, `BUSINESS`, `ENTERPRISE`, `SOVEREIGN`). |
| **`plugin-manager`** | `4003` | Implements UPLM manifest validation (`PluginManifestV2`), Ed25519 publisher signature verification (`config/trust/plugin_authority.pub.pem`), edition plugin quota checks, and isolated container execution (`POST /v1/provision`, `POST /v1/deprovision`). |
| **`event-bus`** | `4004` | Provides asynchronous pub/sub event routing, correlation ID propagation, and immutable audit trail persistence. |
| **`repository-adapter`** | `4005` | Detects and normalizes 9 Git/SCM providers (`github`, `gitlab`, `bitbucket`, `gitea`, `gogs`, `azure-devops`, `aws-codecommit`, `generic-https`, `generic-ssh`) via `POST /v1/repository/resolve` and `GET /v1/repository/providers`. |

---

## 3. Core Execution Subsystems

### 3.1 Unified Policy & Permission Intelligence Engine (UPPIE)
Every mutation request is compiled into an `ArchitectureIR` DAG. UPPIE evaluates the DAG against tenant policies, edition capabilities (`.governance/policies/capabilities-matrix.yaml`), and target blast-radius constraints, issuing a short-lived `ExecutionAuthorization` containing an HMAC-SHA256 / Ed25519 seal over `irHash`. If `irHash` drifts or the TTL expires, `ProvisioningEngine.executePlan()` aborts immediately (`ADR-006`).

### 3.2 Deployment Environment Integrity & Self-Healing Engine (DEISE)
Before mutating any target environment, DEISE constructs an `EnvironmentTwin` (`server/shared/environment-twin.ts`) and classifies drift across five dimensions:
1. `PAYLOAD_DRIFT`: SHA-256 content mismatch between source artifact and target files.
2. `TOPOLOGY_DRIFT`: Broken `current` symlink or disconnected `public_html` document root when `releases/<id>` is intact.
3. `ENVIRONMENT_DRIFT`: Control-plane migration (e.g., cPanel to DirectAdmin path relocation).
4. `RUNTIME_DRIFT`: Missing runtime extensions, broken service unit, or unreachable database socket.
5. `INFRASTRUCTURE_DRIFT`: Out-of-band cloud resource mutation (e.g., security group, EC2 tag, or RDS parameter drift).

### 3.3 Universal Resilient Recovery & Execution Engine (URRE)
URRE manages durable DAG execution:
- Persists step state before and after each node in `.urre/checkpoints/` and `~/.ugondu/transactions/<txId>/state.json`.
- Supports deterministic fault injection (`ExecutionFaultInjector.afterNodePersisted`) for crash-recovery verification.
- Executes reverse-topological compensation/teardown upon step failure.

---

## 4. Schema: Signed `ExecutionRecipe` Contract

```json
{
  "transactionId": "tx-20261018-9f8a7b6c",
  "edition": "professional",
  "strategy": "atomic",
  "irHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "steps": [
    {
      "action": "VERIFY_ENVIRONMENT_TWIN",
      "payload": { "targetEnvironment": "cloud", "requireSha256": true }
    },
    {
      "action": "ATOMIC_SYMLINK_SWAP",
      "payload": { "releaseDir": "releases/202610181500", "currentLink": "current" }
    }
  ],
  "signature": "ed25519:8f4d2c9a..."
}
```

---

## 5. Exit Codes & Diagnostic Reference

| Component | Code / HTTP Status | Meaning | Remediation |
|---|---|---|---|
| `engine-core` | `HTTP 402` | Capability or plugin quota exceeds active edition | Upgrade edition via Mandatag/AeroBill or reduce active plugin count |
| `engine-core` | `HTTP 403` | UPPIE policy gate rejection or invalid `ExecutionAuthorization` seal | Inspect structured policy violation (`Policy ID`, `Affected Nodes`) |
| `plugin-manager` | `HTTP 422` | Ed25519 plugin signature or Schema v2 validation failure | Re-sign plugin manifest with authorized publisher key |
| `client` | `Exit 1` | Recipe verification failure, network error, or step failure | Run `ugondu status <txId>` and `ugondu resume <txId>` |

---

## 6. Clean-Room Architecture Validation Checklist

- [ ] Verify all 5 services start on ports `4001`–`4005` and return `{"status":"ok"}` on `GET /health`.
- [ ] Run `npx jest tests/architecture-guardrails.test.js tests/architecture-properties.test.js` to confirm zero cross-service boundary violations.
- [ ] Run `npx jest tests/passport-admission-gate.test.js` to confirm unsealed DAGs are deterministically rejected.
- [ ] Run `npx jest tests/twin-state-machine.test.js` to confirm DEISE blocks destructive overwrites on `TOPOLOGY_DRIFT`.
