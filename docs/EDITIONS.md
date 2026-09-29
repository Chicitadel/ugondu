# Ugondu Edition Comparison — Commercial Feature Guide

> Air Roofers Ltd | Ujomor Systems Engineering Authority | Classification: PUBLIC

This document describes the distinct feature boundaries between Ugondu commercial editions, designed to drive subscription retention and upward tier migration.

---

## Edition Overview

### Community Edition — Free Forever

**Who it's for:** Individual developers, open-source projects, hobby deployments.

**What you get:**
- Full `ugondu deploy` CLI
- Universal repository provider support (GitHub, GitLab, Bitbucket, Gitea, Gogs, Azure DevOps, etc.)
- `quota-sync` deployment strategy (cPanel/DirectAdmin disk-safe)
- 1 active plugin slot
- `ugondu-plugin-node` and `ugondu-plugin-composer` included
- Community support via GitHub Issues

**Hard limitations:**
- No atomic deployments (symlink-based zero-downtime)
- No release rollbacks — once deployed, no instant recovery
- No execution telemetry or audit ledger
- Cannot install 3rd-party commercial plugins beyond slot 1
- Shown in-terminal upsell notices when locked features are attempted

**Token format:** No prefix (e.g., `community_token_123`)

---

### Professional Edition — \$X/month per workspace

**Who it's for:** Freelancers, agencies, small teams managing production workloads.

**Everything in Community, plus:**
- **Atomic deployment strategy** — zero-downtime symlink swaps (instantly roll to new release)
- **Release rollbacks** — maintain last 3 releases; one command to revert
- **5 plugin slots** — install and compose multiple deployment plugins
- **Plugin Manager Sandbox** — full sandboxed execution environment
- Priority email support

**Hard limitations:**
- No execution telemetry streaming to audit ledger
- No SLA guarantee

**Token format:** `ugp_` prefix (e.g., `ugp_abc123...`)

---

### Enterprise Edition — Custom pricing

**Who it's for:** Agencies, digital teams, SaaS products with multi-tenant deployment needs.

**Everything in Professional, plus:**
- **Unlimited plugins** — no slot restrictions
- **Execution telemetry** — all deployment steps audited and shipped to the Air Roofers Audit Ledger
- **SLA-backed support** — 4h response SLA
- **Multi-workspace governance** — centralized policy management
- **Dedicated identity integration** — custom SSO/SAML binding
- **White-label option** — rebrand Ugondu as your own product

**Token format:** `uge_` prefix (e.g., `uge_xyz789...`)

---

## Feature Gating Architecture

Feature enforcement is **server-side only**. The thin-client is "dumb" — it executes whatever recipe the Governance Server returns. The billing-gateway determines the edition from the token and the engine-core enforces capabilities:

```
Token → billing-gateway (edition resolution)
      → engine-core (strategy + plugin + rollback gating)
      → ExecutionRecipe (signed, delivered to client)
      → Thin Client (executes steps, cannot bypass)
```

Trying to use a Community token with Professional features does not crash — it gracefully downgrades the strategy and injects an `UPSELL_NOTICE` step into the recipe.

---

## Upgrade Path

```
Community
    │  Unlock: atomic deploys, rollbacks, 5 plugins
    ▼
Professional
    │  Unlock: telemetry, unlimited plugins, SLA, multi-workspace
    ▼
Enterprise
```

Upgrade at: **https://identity.airroofers.eu/upgrade**

---

*Copyright © 2026 Air Roofers Ltd. All Rights Reserved.*
