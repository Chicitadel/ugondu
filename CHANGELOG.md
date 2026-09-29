# Ugondu Changelog

> Air Roofers Ltd | Ujomor Systems Engineering Authority

All notable changes to this product will be documented here.

---

## [1.0.0] — 2026-09-29 — Initial Commercial Release

### Added

**Platform Foundation**
- Thin-client / Governance Server architecture established
- Go thin-client (`ugondu deploy`) with `UGONDU_TOKEN`, `UGONDU_API_URL`, `UGONDU_TARGET_ENV` support
- `help`, `version`, `deploy` command routing
- Automatic git remote and branch detection (provider-agnostic)

**Microservices**
- `engine-core` (port 4001) — DAG computation and HMAC-SHA256 signed recipe generation
- `billing-gateway` (port 4002) — License verification and edition resolution via Identity Authority
- `plugin-manager` (port 4003) — Plugin discovery and sandboxed execution via `child_process`
- `event-bus` (port 4004) — Isolated pub/sub message router
- `repository-adapter` (port 4005) — Universal provider detection and URL normalization

**Commercial Edition Tiering**
- Community Edition: quota-sync strategy, 1 plugin, no rollbacks
- Professional Edition: atomic strategy, 5 plugins, rollbacks (`ugp_` token prefix)
- Enterprise Edition: unlimited plugins, telemetry (`uge_` token prefix)
- Server-enforced edition gating with in-terminal upsell notices

**Repository Provider Support**
- GitHub (cloud)
- GitLab (cloud + self-hosted instances)
- Bitbucket
- Gitea
- Gogs
- Azure DevOps
- AWS CodeCommit
- Generic HTTPS / Generic SSH (SSH → HTTPS normalization)

**Plugins**
- `ugondu-plugin-node` — npm/yarn/pnpm/bun dependency install + build
- `ugondu-plugin-composer` — PHP Composer dependency install

**Infrastructure**
- Docker multi-stage builds for all 5 microservices (non-root execution, HEALTHCHECK)
- `docker-compose.yml` with internal network isolation and structured logging
- `.env.example` configuration template
- GitHub Actions CI/CD pipeline (matrix builds, Go client, integration tests, Docker validation)
- Root npm workspace configuration

**Testing**
- `tests/billing-gateway.test.js` — edition resolution, capability enforcement
- `tests/engine-core.test.js` — recipe resolution, telemetry acceptance
- `tests/plugin-manager.test.js` — plugin listing, execution, 404 handling
- `tests/repository-adapter.test.js` — 8 provider detections, SSH normalization

**Documentation**
- `README.md` — architecture diagram, quick start, provider table, edition comparison
- `docs/EDITIONS.md` — full commercial edition feature guide
- `docs/ARCHITECTURE.md` — 4 frozen Architecture Decision Records
- `CHANGELOG.md` — this file

---

*Supersedes: smart_deploy.sh (legacy, preserved for immediate workflow compatibility)*
