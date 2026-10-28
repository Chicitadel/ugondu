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

## ADR-005: Thin-Client Canonical Marketplace Distribution

**Status:** FROZEN  
**Date:** 2026-10-03

### Context
To achieve maximum legitimate distribution coverage, Ugondu must be installable via native package managers (apt, brew, winget) and marketplaces. Distributing varied edition-specific binaries or allowing proprietary server code to leak into client packages compromises IP and creates severe fragmentation.

### Decision
Ugondu adopts a **Canonical Release Pipeline** where a single unified Go thin-client binary is built, cryptographically signed, and syndicated across all supported distribution channels (CLI repositories, App Stores, Docker Hub). 
- **Edition architecture is entirely server-enforced.** The universal client queries its capability limits from the server based on the user's license.
- No proprietary orchestration logic exists in the client.

### Consequences
- Requires strong build-pipeline automation (e.g., GitHub Actions) to syndicate the single artifact.
- The client CLI must be programmed to handle `403` or `402` capability rejection from the server by rendering a standard upgrade prompt, avoiding opaque crashes.
- See the full [Distribution Blueprint](DISTRIBUTION.md) for the coverage matrix and detailed strategy.

## ADR-006: Intent-Driven Execution and UPM Gating Invariant
**Date:** 2026-10-04
**Status:** ACCEPTED
**Context:** The engine must enforce strict compliance, licensing, and security policies before provisioning any infrastructure. We require absolute certainty that no API route, future AI agent, or local script can bypass the policy checks.
**Decision:** 
1. **Cryptographic Execution Seal:** All intents are simulated to produce an `ArchitectureIR`. This DAG is evaluated by the Unified Policy Model (UPPIE), which generates an `ExecutionAuthorization` object secured by an HMAC SHA-256 seal.
2. **The Invariant:** The `ProvisioningEngine.executePlan()` strictly requires this Authorization seal. If the current runtime DAG (`irHash`) does not perfectly match the authorized DAG, or if the token TTL expires, execution immediately aborts.
3. **Structured Explanations:** Policy rejections yield structured evidence (Policy ID, Target Capability, Affected Nodes, Remediation) rather than raw generic errors.
**Consequences:** The UPM is un-bypassable. Execution logic and Validation logic are physically and cryptographically decoupled.
