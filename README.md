<!--
/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Repository Root Documentation (COR-014)
 * File           : README.md
 * Version        : 2.4.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-29
 * Last Modified  : 2026-10-18
 * Classification : PUBLIC | COMMERCIAL
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

# Ugondu — Universal Delivery Operating System

> **Air Roofers Commercial Product** | Ujomor Systems Engineering & Governance Authority

Ugondu is a **governed thin-client / microservice control-plane delivery operating system** that unifies application deployment, infrastructure orchestration, environment twin drift analysis (**DEISE**), durable execution recovery (**URRE**), and universal plugin lifecycle management (**UPLM**).

---

## Commercial Edition Hierarchy (AR-STD-PKG-005)

Ugondu enforces the canonical 5-tier Air Roofers commercial edition hierarchy via cryptographically signed `CapabilityManifest` and `ExecutionAuthorization` envelopes issued by the control plane (`ugondu.airroofers.eu`) in coordination with **Mandatag** (`license.airroofers.eu`) and **AeroBill** (`billing.airroofers.eu`).

> **Note:** Entitlement is resolved strictly via cryptographically signed JWT/JWS passports and `CapabilityManifest` envelopes—never via client-side string prefixes or local heuristics.

| Capability Domain | Community (1) | Professional (2) | Business (3) | Enterprise (4) | Sovereign (5) |
|---|:---:|:---:|:---:|:---:|:---:|
| **Repository Providers** (9 universal providers) | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Deployment Strategies** (`quota-sync`) | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Atomic Symlink & Zero-Downtime (`atomic`, `zdd`)** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Active UPLM Plugin Quota** | 1 | 5 | 25 | Unlimited | Unlimited |
| **DEISE Environment Twin & Basic Repair** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Dependency, Runtime, Docker & TLS Repair** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Live DB Reconstruction, Cloud IAM/Linkage & IaC Drift** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Kubernetes, VMware, Proxmox & Multi-Node HA** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **AI Inference Gateway & Intent Simulation** | Advisory | Standard | Fleet | Autonomous Policy | Air-Gapped / Sovereign |
| **Air-Gapped Recovery, Sovereign Vaults & Fault Domains** | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## System Architecture & Service Port Topology

```text
┌────────────────────────────────────────────────────────────────────────────┐
│                        Thin Client CLI (Go Binary)                         │
│   ugondu deploy | resume | status | rollback | repair | plugin | locale    │
└─────────────────────────────────────┬──────────────────────────────────────┘
                                      │ HTTPS / Bearer Passport + Signed Recipe
┌─────────────────────────────────────▼──────────────────────────────────────┐
│                     Engine Core (Node.js :4001)                            │
│  - Intent Compiler, ArchitectureIR DAG & UPPIE Policy Gate                 │
│  - URRE Durable State Machine & DEISE Environment Twin Drift Analyzer      │
│  - AI Inference Gateway & Ed25519 / HMAC-SHA256 Execution Sealing          │
└──────┬──────────────────┬────────────────────┬──────────────────────┬──────┘
       │                  │                    │                      │
┌──────▼──────┐    ┌──────▼──────┐      ┌──────▼──────┐        ┌──────▼──────┐
│  Billing    │    │  Plugin     │      │  Event Bus  │        │ Repository  │
│  Gateway    │    │  Manager    │      │  Broker     │        │ Adapter     │
│  :4002      │    │  :4003      │      │  :4004      │        │ :4005       │
└─────────────┘    └─────────────┘      └─────────────┘        └─────────────┘
```

| Service | Port | Responsibility | Health Endpoint |
|---|---:|---|---|
| `engine-core` | `4001` | Intent compilation, DAG computation, UPPIE policy evaluation, URRE orchestration, DEISE drift repair, AI Inference Gateway, Ed25519 recipe signing | `GET /health`, `GET /health/live`, `GET /health/ready`, `GET /v1/metadata` |
| `billing-gateway` | `4002` | Mandatag entitlement verification, edition resolution, quota enforcement | `GET /health`, `GET /health/live`, `GET /health/ready`, `GET /v1/metadata` |
| `plugin-manager` | `4003` | UPLM lifecycle state machine, Ed25519 manifest verification, rootless container sandbox execution | `GET /health`, `GET /health/live`, `GET /health/ready`, `GET /v1/metadata` |
| `event-bus` | `4004` | Isolated pub/sub telemetry, audit ledger routing, asynchronous event fan-out | `GET /health`, `GET /health/live`, `GET /health/ready`, `GET /v1/metadata` |
| `repository-adapter` | `4005` | Universal Git/SCM provider detection, URL normalization, ref discovery, webhook & deployment binding | `GET /health`, `GET /health/live`, `GET /health/ready`, `GET /v1/metadata` |

---

## Repository Provider Capability Matrix (`COR-014`)

Every provider entry in the runtime `repository-adapter` (`:4005`) is tracked across seven canonical operations (`detect`, `authenticate`, `metadata`, `refs`, `fetch`, `webhook`, `deployment`) with truthful lifecycle status (`tested` for test-verified operations, `implemented` for coded handler definitions, and `supported` reserved strictly for live-certified provider environments):

| Provider ID | URL / Host Pattern | Credential Env Var | `detect` | `authenticate` | `metadata` | `refs` | `fetch` | `webhook` | `deployment` |
|---|---|---|---|---|---|---|---|---|---|
| `github` | `github.com` | `UGONDU_GITHUB_TOKEN` | `tested` | `tested` | `tested` | `tested` | `tested` | `implemented` | `implemented` |
| `gitlab` | `gitlab.com`, `/gitlab/` | `UGONDU_GITLAB_TOKEN` | `tested` | `tested` | `tested` | `tested` | `tested` | `implemented` | `implemented` |
| `bitbucket` | `bitbucket.org` | `UGONDU_BITBUCKET_TOKEN` | `tested` | `tested` | `tested` | `tested` | `tested` | `implemented` | `implemented` |
| `gitea` | `gitea.*` | `UGONDU_GITEA_TOKEN` | `tested` | `tested` | `tested` | `tested` | `tested` | `implemented` | `implemented` |
| `gogs` | `gogs.*` | `UGONDU_GOGS_TOKEN` | `tested` | `tested` | `tested` | `tested` | `tested` | `implemented` | `implemented` |
| `azure-devops` | `dev.azure.com`, `visualstudio.com` | `UGONDU_AZURE_DEVOPS_TOKEN` | `tested` | `tested` | `tested` | `tested` | `tested` | `implemented` | `implemented` |
| `aws-codecommit` | `codecommit`, `amazonaws.com/v1/repos` | `AWS_ROLE_ARN` + `AWS_REGION` (OIDC via `AWS_WEB_IDENTITY_TOKEN_FILE`, or STS session); bare static `AWS_SECRET_ACCESS_KEY` is rejected | `tested` | `tested` | `tested` | `tested` | `tested` | `implemented` | `implemented` |
| `generic-https` | `https://*` | `UGONDU_GIT_TOKEN` | `tested` | `tested` | `tested` | `tested` | `tested` | `unavailable` | `implemented` |
| `generic-ssh` | `git@*`, `ssh://*` | `UGONDU_SSH_KEY_PATH` | `tested` | `tested` | `tested` | `tested` | `tested` | `unavailable` | `implemented` |

---

## AI Inference Gateway & Agentless Capability Parity

Ugondu includes a governed **AI Inference Gateway** inside `engine-core` supporting multi-provider routing (OpenAI, Anthropic, Google Vertex/Gemini, AWS Bedrock, Azure OpenAI, Mistral, Cohere, and Sovereign Local/vLLM endpoints) with strict schema validation, token budgeting, circuit breaking, and zero-trust redaction.

Under the **Agentless Capability Parity Invariant** and **Execution Path Equivalence Invariant**:
1. Every commercially released executable capability is 100% invocable by a human operator through the canonical CLI and UI without requiring an external LLM.
2. Both manual CLI/UI requests and AI-assisted intents converge on the exact same `Intent -> ArchitectureIR -> UPPIE Policy Gate -> ExecutionAuthorization -> URRE Execution -> Independent Verification -> Evidence Passport` pipeline.

---

## Universal Plugin Lifecycle Management (UPLM) & CLI Commands

UPLM governs the entire lifecycle of delivery, target-adapter, and recovery plugins (`DISCOVERED -> VERIFIED -> INSTALLED -> ACTIVATED -> EXECUTING -> SUSPENDED -> ROLLED_BACK -> UNINSTALLED`).

```bash
# Authenticate via OIDC / PKCE loopback flow
ugondu auth login
ugondu auth status
ugondu auth logout

# Core deployment & durable transaction lifecycle
ugondu deploy [--force]
ugondu resume [<transaction-id>]
ugondu status [<transaction-id>]
ugondu rollback [<transaction-id>]

# DEISE environment twin diagnosis & structural repair
ugondu repair diagnose
ugondu repair plan
ugondu repair execute [--dry-run]

# UPLM governed plugin lifecycle
ugondu plugins
ugondu plugin list
ugondu plugin verify <plugin-id>
ugondu plugin install <plugin-id>
ugondu plugin update <plugin-id>
ugondu plugin remove <plugin-id>
```

**Bundled & Governed Plugins:**
- `ugondu-plugin-node` — Node.js (`npm`, `yarn`, `pnpm`, `bun`) dependency resolution and deterministic build
- `ugondu-plugin-composer` — PHP Composer dependency resolution and autoloader optimization
- `aws-vpc-adapter` — AWS VPC, Subnet, IGW, RouteTable, SecurityGroup, EC2, RDS, S3, and ECS Fargate physical adapter
- `recovery-code`, `recovery-config`, `recovery-database`, `recovery-dependencies`, `recovery-http`, `recovery-network`, `recovery-zdd` — DEISE domain recovery plugins

---

## 12-Locale Signed Language Pack Architecture

Ugondu ships with 100% parity across **12 canonical locales** (`en`, `fr`, `es`, `de`, `it`, `pt`, `ru`, `zh`, `ja`, `ko`, `ar`, `hi`) across both the Go thin client (`client/locales/*.json`) and the Node.js control plane (`locales/*.json`, `server/shared/locales/`).

```bash
ugondu locale current
ugondu locale detect
ugondu locale select
ugondu locale use fr-FR
ugondu locale install de-DE
ugondu locale update
ugondu locale reset
ugondu locale doctor
```

One-time execution overrides:
```bash
ugondu --locale es-ES deploy
UGONDU_LOCALE=ja-JP ugondu status
```

---

## Documentation Index

### Developer & Operator Guides (`docs/guides/`)
1. [Contributor Guide](docs/guides/01-contributor-guide.md)
2. [Architecture Guide](docs/guides/02-architecture-guide.md)
3. [Local Development Guide](docs/guides/03-local-development-guide.md)
4. [Configuration Guide](docs/guides/04-configuration-guide.md)
5. [AI Provider Onboarding Guide](docs/guides/05-ai-provider-onboarding-guide.md)
6. [Repository Provider Guide](docs/guides/06-repository-provider-guide.md)
7. [Plugin Developer Guide](docs/guides/07-plugin-developer-guide.md)
8. [Target Adapter Guide](docs/guides/08-target-adapter-guide.md)
9. [CLI Reference Guide](docs/guides/09-cli-guide.md)
10. [Cross-Platform Guide](docs/guides/10-cross-platform-guide.md)
11. [AWS Operations Guide](docs/guides/11-aws-operations-guide.md)
12. [Security Incident Guide](docs/guides/12-security-incident-guide.md)
13. [Release & Certification Guide](docs/guides/13-release-guide.md)
14. [Operator Runbook](docs/guides/14-operator-runbook.md)

### UPLM Phase 0 Architecture & Baseline (`docs/uplm/`)
- [UPLM Repository Discovery](docs/uplm/UPLM_REPOSITORY_DISCOVERY.md)
- [UPLM Component Mapping](docs/uplm/UPLM_COMPONENT_MAPPING.md)
- [UPLM Architecture Decision Records](docs/uplm/UPLM_ADR.md)
- [UPLM Operational & AWS COR V9 Baseline](docs/uplm/UPLM_BASELINE.md)

---

*Copyright © 2026 Air Roofers Ltd. All Rights Reserved.*


---

## Qualification Status

Status vocabulary is deliberate. `implemented` means code exists; `tested` means unit/contract tests pass in CI against local doubles; `qualified` means the capability passed a live, evidence-backed run in the named environment. Only `qualified` entries may be described as supported in customer-facing material.

| Platform / target | Status | Evidence still required before `qualified` |
|---|---|---|
| Go client — Linux amd64/arm64, macOS amd64/arm64, Windows amd64 | `tested` (build + unit matrix in CI) | Native end-to-end deployment per OS |
| AWS (IAM, EC2/VPC, RDS, S3, ECR, ECS/Fargate) | `implemented` | Live isolated-account run, IAM policy simulation, failure injection, rollback/cleanup |
| Docker/OCI, Kubernetes | `implemented` | Live engine/cluster conformance, upgrade and recovery tests |
| cPanel / DirectAdmin | `tested` (discovery, honest `UNKNOWN` capabilities) | Real hosted-account deployment and rollback |
| Azure, GCP, OCI, IBM Cloud | `unavailable` | Provider adapters and capability qualification |

Migration between targets may legitimately return `BLOCKED` when a required target capability is missing; Ugondu never emulates a missing capability silently.
