# Ugondu Architecture Decision Records

> Air Roofers Ltd | Ujomor Systems Engineering Authority | FROZEN

## ADR-001: Thin-Client / Server Architecture

**Status:** FROZEN  
**Date:** 2026-09-29

### Context

Legacy `smart_deploy.sh` embeds all deployment logic in a single shell script running on the user's server. This exposes business logic, makes updates hard, and cannot be commercially licensed.

### Decision

Adopt a **thin-client / governance server** split:
- **Thin client** (Go binary) runs on the user's server. It only executes steps it receives from the server — it contains no deployment logic.
- **Governance Server** (Node.js microservices) computes, authorizes, and signs the execution recipe centrally.

This enables **IP protection** (logic never leaves the server), **commercial edition enforcement** (server-side, tamper-proof), and **zero-deployment client updates** (clients always call the latest API).

### Consequences

- Client must have network access to Governance Server
- All capabilities are enforced server-side — cannot be bypassed by modifying the binary
- Community users can self-host the server if they compile from source

---

## ADR-002: Edition Enforcement via Signed Recipes

**Status:** FROZEN  
**Date:** 2026-09-29

### Context

A naive approach would have the client check its own token to decide which features to enable. This is trivially bypassable.

### Decision

The engine-core **signs** every `ExecutionRecipe` with `HMAC-SHA256` using a server-held private key. The recipe itself encodes the permitted strategy and steps. The client receives a signed recipe and executes it verbatim — it cannot inject or modify steps without invalidating the signature.

### Consequences

- Feature gating is cryptographically enforced
- Client cannot upgrade its own edition

---

## ADR-003: Microservice Isolation per Concern

**Status:** FROZEN  
**Date:** 2026-09-29

### Bounded Contexts

| Service | Owns | Port |
|---|---|---|
| `engine-core` | DAG computation, recipe signing | 4001 |
| `billing-gateway` | License verification, edition resolution | 4002 |
| `plugin-manager` | Plugin discovery, sandboxed execution | 4003 |
| `event-bus` | Pub/sub isolation | 4004 |
| `repository-adapter` | Provider detection, URL normalization | 4005 |

No service directly imports another's code. Communication is HTTP-only. This prevents circular dependencies and allows independent scaling.

---

## ADR-004: quota-sync Default for cPanel/DirectAdmin

**Status:** FROZEN  
**Date:** 2026-09-29

### Context

cPanel and DirectAdmin require `public_html` to be a **physical directory** (not a symlink) for disk usage tracking. The `atomic` strategy (symlink swap) breaks quota tracking.

### Decision

For `targetEnvironment: cpanel | directadmin`, the engine-core **always defaults** to `quota-sync` strategy (rsync to physical directory), regardless of edition. Professional/Enterprise users on cPanel must explicitly set `targetEnvironment: cloud` to enable atomic deployments.

---

*Copyright © 2026 Air Roofers Ltd. All Rights Reserved.*
