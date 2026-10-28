<!--
/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Developer & Operator Documentation (Guide 14)
 * File           : 14-operator-runbook.md
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

# 14 — Operator Runbook

## 1. Control Plane Service Health & Readiness Checks

Operators monitor five core microservices on ports `4001`–`4005`. All services emit structured JSON logs to `stdout`/`stderr` with correlation IDs (`A12`, `A17`).

```bash
# Probe all 5 control-plane services
for port in 4001 4002 4003 4004 4005; do
  echo -n "Port $port: "
  curl -sf "http://localhost:${port}/health" || echo "UNHEALTHY"
done
```

| Service | Port | Expected Health Response | Critical Dependency |
|---|---:|---|---|
| `engine-core` | `4001` | `{"status":"ok","service":"engine-core"}` | `UGONDU_PRIVATE_KEY`, ports `4002`–`4005` |
| `billing-gateway` | `4002` | `{"status":"ok","service":"billing-gateway"}` | `BILLING_AUTHORITY_URL` / `server/data/billing.json` |
| `plugin-manager` | `4003` | `{"status":"ok","service":"plugin-manager"}` | `config/trust/plugin_authority.pub.pem`, Docker daemon |
| `event-bus` | `4004` | `{"status":"ok","service":"event-bus"}` | Internal pub/sub queue |
| `repository-adapter` | `4005` | `{"status":"ok","service":"repository-adapter","cor_level":"A"}` | Outbound HTTPS/SSH (SSRF-guarded) |

---

## 2. Standard Day-2 Operational Procedures

### 2.1 Recovering an Interrupted Deployment Transaction (URRE)
When a deployment is interrupted by a network drop or host reboot:
1. Inspect the transaction state and step journal:
   ```bash
   ugondu status
   ```
2. Verify the `PlanHash`, `PolicyHash`, and `StateHash` integrity reported by `status`.
3. Resume deterministic execution from the last incomplete node:
   ```bash
   ugondu resume <transaction-id>
   ```

### 2.2 Diagnosing & Repairing Target Environment Drift (DEISE)
When a target webroot (`public_html`), symlink (`current`), or cloud resource drifts out of band (e.g., after a cPanel to DirectAdmin control-plane migration):
1. Run non-destructive DEISE diagnosis:
   ```bash
   ugondu repair diagnose
   ```
2. Review the classified drift category (`TOPOLOGY_DRIFT`, `ENVIRONMENT_DRIFT`, `PAYLOAD_DRIFT`, `RUNTIME_DRIFT`, or `INFRASTRUCTURE_DRIFT`):
   - If `TOPOLOGY_DRIFT` is flagged while `releases/` is intact, DEISE automatically blocks `--delete` overwrites (**Do No Harm Invariant**).
3. Preview and execute the structural repair plan:
   ```bash
   ugondu repair plan
   ugondu repair execute --dry-run
   ugondu repair execute --force
   ```

### 2.3 Executing Emergency Release Rollback
```bash
# Roll back the latest transaction or a specific transaction ID
ugondu rollback <transaction-id>
```

### 2.4 Draining & Restarting Fargate / Docker Control Plane Tasks
All control-plane services handle `SIGTERM` for graceful connection draining (`A13`):
```bash
# Docker Compose rolling restart
docker compose up -d --build --no-deps engine-core

# AWS ECS Fargate rolling deployment in eu-west-3
aws ecs update-service \
  --cluster ugondu-production-cluster \
  --service ugondu-engine-core \
  --force-new-deployment \
  --region eu-west-3
```

---

## 3. Troubleshooting & Triage Matrix

| Alert / Symptom | Root Cause | Operator Action |
|---|---|---|
| `err_tx_state_corrupt` during `ugondu status` or `ugondu resume` | Local `~/.ugondu/transactions/<txId>/state.json` was truncated by an ungraceful disk power-off | Restore checkpoint from `.urre/checkpoints/` or re-initialize transaction via `ugondu deploy` |
| `HTTP 402 Payment Required` on `/v1/deploy/resolve` | Tenant license expired or requested strategy (`atomic`) exceeds `COMMUNITY` edition | Verify tenant entitlement in `billing-gateway` (`:4002`) or refresh passport via `ugondu auth login` |
| Stale lockfile (`lock.pid`) blocking `ugondu deploy` | Previous CLI process was killed with `SIGKILL` (`kill -9`) | Verify PID in `~/.ugondu/transactions/<txId>/lock.pid` is no longer running, then remove `lock.pid` and run `ugondu resume <txId>` |
| Locale output showing fallback English keys | Selected locale pack needs refresh | Run `ugondu locale doctor` followed by `ugondu locale update` |

---

## 4. Operator Exit Code Reference

| Command | Exit `0` | Exit `1` |
|---|---|---|
| `ugondu status [<txId>]` | Transaction state loaded and hash chain valid | Transaction not found (`ErrStateNotFound`) or state corrupt (`ErrStateCorrupt`) |
| `ugondu resume [<txId>]` | All remaining steps completed and telemetry reported `SUCCESS` | Recipe parse failure or step execution failure (telemetry reported `FAILED`) |
| `ugondu repair execute` | Environment twin drift repaired and verified | Repair blocked by UPPIE policy or target unreachable |

---

## 5. Clean-Room Operator Handover Checklist

- [ ] All 5 control-plane health endpoints (`:4001`–`:4005/health`) respond `HTTP 200` within `< 200ms`.
- [ ] `ugondu locale doctor` reports healthy 12-locale dictionary state.
- [ ] `npm run verify:release-integrity` and `node scripts/release/verify-evidence-bundle.mjs --verify` both report `[PASS]`.
- [ ] Zero orphaned resources exist in AWS account `971671216490` (`eu-west-3`).
