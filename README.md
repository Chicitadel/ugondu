# Ugondu — Universal Deployment Intelligence Platform

> **Air Roofers Commercial Product** | Ujomor Systems Engineering Authority

Ugondu is a **thin-client / server deployment intelligence platform** that replaces legacy shell deployment scripts with a governed, commercial-grade, edition-based delivery engine. It is the successor to `smart_deploy.sh`.

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
│  - Signs recipe with HMAC-SHA256                    │
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
# Edit .env: set UGONDU_PRIVATE_KEY, IDENTITY_AUTHORITY_URL
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

## Plugins

Plugins are discovered from the `plugins/` directory. Each plugin requires a `manifest.json` and an `index.js`.

**Bundled plugins:**
- `ugondu-plugin-node` — npm/yarn/pnpm/bun dependency resolution and build
- `ugondu-plugin-composer` — PHP Composer dependency resolution

**To install a community plugin:**
```bash
# Copy the plugin directory into plugins/
cp -r my-plugin plugins/
# Restart the plugin-manager service
docker compose restart plugin-manager
```

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
