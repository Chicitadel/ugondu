# ADR-0001: Modular Microservices, Bounded Contexts, and Fail-Closed COR Governance

- **Status:** Accepted
- **Date:** 2026-10-20
- **Organization:** Air Roofers SASU (France)
- **Authority:** Ujomor Systems Engineering & Governance Authority

## Context

Ugondu operates as a universal deployment intelligence and delivery operating system across cloud providers, container platforms, shared hosting environments, and repository providers. Enterprise governance (`UAIGOS` and `UG-COR-NO-STUBS-001`) requires strict bounded-context isolation, deterministic policy enforcement, cryptographic artifact verification, and fail-closed qualification evidence.

## Decision

1. **Five Bounded Microservices (Ports 4001–4005)**:
   - `engine-core` (`4001`): Execution DAG, DEISE recovery, URRE rollback, and policy gates.
   - `billing-gateway` (`4002`): Commercial entitlement and usage metering.
   - `plugin-manager` (`4003`): Sandboxed plugin verification (`vm.createContext`) and tenant authorization.
   - `event-bus` (`4004`): Auditable event routing and correlation propagation.
   - `repository-adapter` (`4005`): Multi-provider repository integration with SSRF network destination policy.
2. **Externalized Trust & Fail-Closed Evidence**:
   - Release evidence (`evidence/manifest.json`) and policy packs (`policy-packs/aws/cor/pack.yaml`) must be verified against externally injected Ed25519 public key trust anchors (`UGONDU_EVIDENCE_PUBLIC_KEY` and `UGONDU_PACK_PUBLIC_KEY`).
   - Evidence collection must import real test, scanner, lockfile SBOM, and runtime probe outputs and fail closed when any required artifact is missing, stale, or unverified.

## Consequences

- Zero repository-local key fallback in verification scripts.
- Platform and provider support claims are bounded to rows verified in `config/qualification/platform-matrix.json`.
