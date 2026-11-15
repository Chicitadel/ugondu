# Ugondu portable Compose security hardening

**Finding IDs:** UG-COR-FEDERATION-EGRESS-001, UG-COR-INGRESS-BOUNDARY-001, UG-COR-RESOURCE-BOUNDS-001  
**Date:** 2026-10-30  
**Candidate branch:** `security/arf-cloud-portable-compose-hardening-2026-10-30`  
**Base:** Ugondu COR runtime verifier candidate `8a6e5a27e5ffecec41c84ced84a2e5d86cad4a33`

## Confirmed deployment defects

The root `docker-compose.yml` had three concrete deployment issues:
1. `billing-gateway` was attached only to `ugondu-internal`, whose network has `internal: true`. The service is configured to call external Air Roofers Identity and AeroBill endpoints; it therefore had no external egress path.
2. `engine-core` published `4001:4001` on all host interfaces. That bypassed the intended separately reviewed TLS edge/SSM access boundary. The shared AWS pilot host contract advertises the Ugondu host port as 8081.
3. Fixed `container_name` values prevented normal Compose scaling and replacement semantics. Service containers also lacked explicit memory bounds and basic privilege restrictions.

## Physical remediation

- `billing-gateway` now attaches to both the isolated internal network and the egress-capable external network. It retains internal service discovery while reaching the external identity and billing authorities.
- `engine-core` now binds host ingress only to `127.0.0.1:${UGONDU_BIND_PORT:-8081}` while retaining container port 4001. A local TLS edge or SSM tunnel must own external ingress.
- Removed fixed `container_name` values from all services.
- Added explicit per-service memory limits, init process, dropped Linux capabilities and `no-new-privileges` security option.
- Internal-only plugin, repository-adapter and event-bus services remain isolated from external egress.
- Added `tests/deployment/compose-network-contract.test.mjs` and wired it into `npm run test:governance`.

## Validation

The Compose contract tests assert:
- billing gateway has both internal discovery and external egress;
- external AeroBill and Identity authority URLs remain configured;
- engine host port is loopback-only and matches the AWS pilot host port contract;
- all services have explicit memory bounds;
- fixed container names are absent;
- internal-only services remain isolated.

Exact-head Ugondu COR and CI/CD workflows must pass on this branch before code qualification is considered complete. No AWS host, public TLS edge or application deployment is provisioned by this change.

## Release status

This closes only the Compose network/ingress/resource-boundary defects. Live federation transaction tests, external TLS edge, host deployment, database/secret lifecycle and final UAIGOS/COR sign-off remain separate release gates.