<!--
/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Developer & Operator Documentation (Guide 09)
 * File           : 09-cli-guide.md
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-10-18
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

# 09 — CLI Reference Guide (`ugondu`)

## 1. CLI Overview & Global Flags

The `ugondu` Go thin client (`client/cmd/cli.go`) is a zero-dependency cross-platform executable that communicates with the Ugondu Control Plane over HTTPS, verifies signed execution recipes, executes deterministic deployment and repair steps, and records local transaction journals under `~/.ugondu/transactions/<txId>/`.

### Global Flags
| Flag | Short | Description |
|---|---|---|
| `--locale <code\|tag>` | `-L` | Override output locale for the current invocation (e.g., `--locale fr-FR`, `-L de`) |
| `--system-locale` | — | Force detection from OS environment variables (`LC_ALL`, `LC_MESSAGES`, `LANG`) |
| `--force` | `-f` | Bypass interactive confirmation prompts for non-Interactive CI/CD pipelines |
| `--resume` | `-r` | Resume an interrupted deployment when passed to `ugondu deploy --resume [<txId>]` |

---

## 2. Canonical Command Reference

### 2.1 `ugondu auth` — OIDC / PKCE Loopback Authentication
Authenticates the operator against `identity.airroofers.eu` using a local `127.0.0.1` loopback listener with CSRF state protection.
```bash
ugondu auth login
ugondu auth status
ugondu auth logout
```

### 2.2 `ugondu deploy` — Resolve & Execute Signed Deployment Recipe
Scans the current Git repository, submits the `DeploymentContext` to `POST /v1/deploy/resolve`, persists the signed recipe to `~/.ugondu/transactions/<txId>/recipe.json`, executes each step, and reports telemetry to `POST /v1/telemetry/report`.
```bash
# Interactive deployment
ugondu deploy

# Unattended CI/CD deployment
ugondu deploy --force

# Resume latest or specific transaction via deploy flag
ugondu deploy --resume
ugondu deploy --resume tx-20261018-001
```

### 2.3 `ugondu resume [<transaction-id>]` — Durable Crash Recovery
Reloads `~/.ugondu/transactions/<txId>/recipe.json` and `state.json`, skips steps already marked `SUCCESS`, and resumes execution from the first incomplete step.
```bash
# Resume most recent transaction automatically
ugondu resume

# Resume specific transaction ID
ugondu resume tx-20261018-001
```

### 2.4 `ugondu status [<transaction-id>]` — Inspect Transaction & Hash Chain
Displays transaction status, tenant/project/environment bindings, cryptographic hashes (`PlanHash`, `PolicyHash`, `StateHash`), and per-step execution logs.
```bash
ugondu status
ugondu status tx-20261018-001
```

### 2.5 `ugondu rollback [<transaction-id>]` — Reverse Topological Rollback
Triggers atomic release pointer rollback or URRE compensation DAG execution.
```bash
ugondu rollback
ugondu rollback tx-20261018-001
```

### 2.6 `ugondu repair` — DEISE Environment Twin & Self-Healing (`client/cmd/repair.go`)
Invokes the Deployment Environment Integrity & Self-Healing Engine (DEISE) from the CLI without requiring any AI agent:
```bash
ugondu repair diagnose
ugondu repair plan
ugondu repair execute --dry-run
ugondu repair execute --force
```

### 2.7 `ugondu plugins` / `ugondu plugin` — UPLM Lifecycle Commands
```bash
ugondu plugins
ugondu plugin list
ugondu plugin verify ugondu-plugin-node
ugondu plugin install ugondu-plugin-node
ugondu plugin update ugondu-plugin-node
ugondu plugin remove ugondu-plugin-node
```

### 2.8 `ugondu locale` — 12-Locale Language Pack Management (`client/cmd/locale_cmd.go`)
```bash
ugondu locale current
ugondu locale detect
ugondu locale select
ugondu locale use es-ES
ugondu locale install ja-JP
ugondu locale update
ugondu locale reset
ugondu locale doctor
```

### 2.9 `ugondu version` & `ugondu help`
```bash
ugondu version
ugondu help
```
> **Fuzzy Typo Assistance:** If an unknown command is entered within Levenshtein edit distance `<= 2` (e.g., `ugondu deply`), the CLI automatically suggests the intended command (`Did you mean "deploy"?`).

---

## 3. Local Transaction Storage Layout

```text
~/.ugondu/
├── locale.json                        # Persisted user locale preference (0600)
└── transactions/                      # Mode 0700
    └── <transaction-id>/              # Mode 0700
        ├── recipe.json                # Signed ExecutionRecipe (0600)
        ├── state.json                 # Durable step journal & StateHash (0600)
        └── lock.pid                   # Process mutex preventing concurrent runs
```

---

## 4. Exit Codes & Troubleshooting

| Exit Code | Condition | Resolution |
|---:|---|---|
| `0` | Command succeeded or user safely aborted interactive destructive prompt (`n`) | None required |
| `1` | Missing command, unknown command, missing `.git`, corrupt `state.json`, or step execution failure | Inspect output or run `ugondu status <txId>` |

---

## 5. Clean-Room CLI Validation Checklist

- [ ] `ugondu help` renders localized command usage across all 12 supported locales (`--locale ar`, `--locale zh`, etc.).
- [ ] `ugondu deply` triggers Levenshtein suggestion `deploy` and exits with code `1`.
- [ ] `ugondu status` displays `PlanHash`, `PolicyHash`, and `StateHash` for the latest transaction.
- [ ] `cd client && go test ./...` passes all CLI, lock, state, and replay tests.
