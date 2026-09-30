# Ugondu — Universal Deployment Intelligence Platform

> **Air Roofers Commercial Product** | Ujomor Systems Engineering Authority

Ugondu is a **thin-client / server deployment intelligence platform** that replaces legacy shell deployment scripts with a governed, commercial-grade, edition-based software delivery platform. It is the successor to `smart_deploy.sh`.

---

## Commercial Editions

| Feature | Community | Professional | Enterprise |
|---|:---:|:---:|:---:|
| Git provider support (GitHub, GitLab, Bitbucket, Gitea, Gogs, Azure DevOps, AWS CodeCommit) | ✅ | ✅ | ✅ |
| `quota-sync` deployment strategy | ✅ | ✅ | ✅ |
| Plugin support (1 plugin) | ✅ | — | — |
| Plugin support (up to 5 plugins) | — | ✅ | — |
| Unlimited plugins | — | — | ✅ |
| Atomic symlink deployments | ❌ | ✅ | ✅ |
| Release rollbacks | ❌ | ✅ | ✅ |
| Plugin Manager Sandbox | limited | ✅ | ✅ |
| Execution telemetry & audit ledger | ❌ | — | ✅ |
| SLA & priority support | — | — | ✅ |

> Token prefix: `ugp_` = Professional, `uge_` = Enterprise, no prefix = Community

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Thin Client (Go)                   │  ← runs on your server
│  ugondu deploy → POST /v1/deploy/resolve            │
└───────────────────────┬─────────────────────────────┘
                        │  HTTPS (signed recipe)
┌───────────────────────▼─────────────────────────────┐
│              Engine Core (Node.js :4001)            │  ← Governance Server
│  - Computes DAG of execution steps                  │
│  - Enforces edition capabilities                    │
│  - Signs canonical execution recipes with Ed25519                    │
└──────┬──────────────────────────────────────────────┘
       │                          │
┌──────▼──────┐            ┌──────▼──────┐
│  Billing    │            │  Repository │
│  Gateway    │            │  Adapter    │
│  :4002      │            │  :4005      │
└─────────────┘            └─────────────┘
       │
┌──────▼──────┐    ┌─────────────┐
│  Plugin     │    │  Event Bus  │
│  Manager    │    │  :4004      │
│  :4003      │    └─────────────┘
└─────────────┘
```

## Quick Start

### Prerequisites

- Docker & Docker Compose
- A token from [identity.airroofers.eu](https://identity.airroofers.eu)

### 1. Configure environment

```bash
cp .env.example .env
# Configure server-side signing/trust settings and IDENTITY_AUTHORITY_URL; signing private keys remain server-side.
```

### 2. Start the governance server

```bash
docker compose up -d
```

### 3. Deploy from your project directory

```bash
# Set your license token
export UGONDU_TOKEN=ugp_your_professional_token

# Run the thin client
ugondu deploy
```

---

## Supported Repository Providers

| Provider | URL Pattern | Token Env |
|---|---|---|
| GitHub | `github.com` | `UGONDU_GITHUB_TOKEN` |
| GitLab (cloud + self-hosted) | `gitlab.com`, `/gitlab/` | `UGONDU_GITLAB_TOKEN` |
| Bitbucket | `bitbucket.org` | `UGONDU_BITBUCKET_TOKEN` |
| Gitea | `gitea.*` | `UGONDU_GITEA_TOKEN` |
| Gogs | `gogs.*` | `UGONDU_GOGS_TOKEN` |
| Azure DevOps | `dev.azure.com`, `visualstudio.com` | `UGONDU_AZURE_DEVOPS_TOKEN` |
| AWS CodeCommit | `amazonaws.com/v1/repos` | `AWS_SECRET_ACCESS_KEY` |
| Generic HTTPS | any HTTPS URL | `UGONDU_GIT_TOKEN` |
| Generic SSH | `git@*`, `ssh://` | `UGONDU_SSH_KEY_PATH` |

---

## Language Packs

Ugondu supports installable, signed language packs without rebuilding the core client. Locale selection is reversible and can use explicit user preference, environment configuration, tenant/project policy, or detected OS locale.

```bash
ugondu locale current
ugondu locale detect
ugondu locale select
ugondu locale use en-US
ugondu locale install fr-FR
ugondu locale update
ugondu locale reset
ugondu locale doctor
```

A one-time override is also available:

```bash
ugondu --locale en-US deploy
UGONDU_LOCALE=en-US ugondu deploy
```

Language packs contain presentation/localization content only. Proprietary server-side planning, governance, licensing, AI, execution logic, credentials, and private keys remain server-side.

## Plugins

Plugins are admitted through the governed plugin lifecycle. Third-party plugins must have a validated manifest, compatible action/capability declarations, provenance/signature verification, and execution isolation. The thin client never receives unrestricted plugin execution logic.

**Bundled plugins:**
- `ugondu-plugin-node` — npm/yarn/pnpm/bun dependency resolution and build
- `ugondu-plugin-composer` — PHP Composer dependency resolution

**Plugin lifecycle:**
```bash
ugondu plugin list
ugondu plugin verify <plugin>
ugondu plugin install <plugin>
ugondu plugin update <plugin>
ugondu plugin remove <plugin>
```

Plugin installation is subject to manifest, signature, capability, entitlement, and sandbox policy.

---

## Services

| Service | Port | Description |
|---|---|---|
| engine-core | 4001 | DAG computation and recipe signing |
| billing-gateway | 4002 | License and edition authority |
| plugin-manager | 4003 | Sandboxed plugin executor |
| event-bus | 4004 | Isolated pub/sub message router |
| repository-adapter | 4005 | Universal provider detection |

---

## Governance

Ugondu is governed under the Air Roofers UAIGOS framework. All architecture decisions are frozen in `.governance/state/frozen.decisions.yaml`.

---

*Copyright © 2026 Air Roofers Ltd. All Rights Reserved.*
