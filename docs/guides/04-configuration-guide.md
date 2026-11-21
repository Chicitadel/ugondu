<!--
/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Developer & Operator Documentation (Guide 04)
 * File           : 04-configuration-guide.md
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

# 04 — Configuration Guide

## 1. Configuration Precedence Model

Ugondu enforces a strict, deterministic configuration precedence hierarchy across both the control plane and the Go thin client (`A15` Environment-Driven Configuration Invariant):

1. **CLI Explicit Flags** (`--locale`, `--force`, `--resume`)
2. **Process Environment Variables** (`UGONDU_*`, `AWS_*`)
3. **Tenant / Project Policy Manifest** (Signed server-side `CapabilityManifest` & `Ugondu_Policy_Manifest_Schema.yaml`)
4. **User Local Configuration** (`~/.ugondu/config.json`, `~/.ugondu/locale.json`)
5. **Operating System / Environment Detection** (`LANG`, `LC_ALL`, `.git/config`)
6. **Compiled Safe Defaults** (`targetEnv=auto`, `locale=en`, `strategy=quota-sync`)

---

## 2. Control Plane Environment Variables

| Variable | Service(s) | Required | Default | Description |
|---|---|---|---|---|
| `UGONDU_PRIVATE_KEY` | `engine-core` | **Yes** | — | Server-side cryptographic key for signing `ExecutionRecipe` and `ExecutionAuthorization` seals |
| `IDENTITY_AUTHORITY_URL` | `engine-core`, `billing-gateway` | **Yes** | `https://identity.airroofers.eu/api/v1` | Air Roofers OIDC/SSO identity authority endpoint |
| `BILLING_AUTHORITY_URL` | `billing-gateway` | **Yes** | `https://billing.airroofers.eu/api/v1` | AeroBill / Mandatag commercial authority endpoint |
| `PORT` | All services | No | `4001`–`4005` | Service bind port (`4001` engine, `4002` billing, `4003` plugin, `4004` bus, `4005` repo) |
| `BILLING_GATEWAY_URL` | `engine-core` | No | `http://localhost:4002` | Internal URL for edition and entitlement verification |
| `PLUGIN_MANAGER_URL` | `engine-core` | No | `http://localhost:4003` | Internal URL for UPLM sandboxed plugin execution |
| `EVENT_BUS_URL` | `engine-core` | No | `http://localhost:4004` | Internal URL for pub/sub event emission |
| `REPOSITORY_ADAPTER_URL` | `engine-core` | No | `http://localhost:4005` | Internal URL for repository provider resolution |
| `PLUGIN_PUBLIC_KEY_PATH` | `plugin-manager` | No | `config/trust/plugin_authority.pub.pem` | Ed25519 public key used to verify plugin manifests |
| `UGONDU_CERT_REGION` | `engine-core` (COR/DEISE) | Conditional | `eu-west-3` | Required when running physical AWS certification or DEISE cloud repair |

---

## 3. Thin Client (`ugondu`) Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `UGONDU_TOKEN` | No (Community fallback) | `""` | Signed Bearer entitlement passport issued by Mandatag (`license.airroofers.eu`) |
| `UGONDU_API_URL` | No | `https://api.ugondu.airroofers.eu/v1` | Control plane API base URL |
| `UGONDU_TARGET_ENV` | No | `auto` | Target topology (`auto`, `cpanel`, `directadmin`, `cloud`, `kubernetes`, `baremetal`) |
| `UGONDU_LOCALE` | No | OS auto-detect / `en` | Active locale code (`ar`, `de`, `en`, `es`, `fr`, `hi`, `it`, `ja`, `ko`, `pt`, `ru`, `zh`) |
| `UGONDU_HOME` | No | `~/.ugondu` | Local directory for transaction journals (`transactions/<txId>`) and locale packs |

### Repository Provider Credential Environment Variables

| Provider | Environment Variable |
|---|---|
| GitHub | `UGONDU_GITHUB_TOKEN` |
| GitLab | `UGONDU_GITLAB_TOKEN` |
| Bitbucket | `UGONDU_BITBUCKET_TOKEN` |
| Gitea | `UGONDU_GITEA_TOKEN` |
| Gogs | `UGONDU_GOGS_TOKEN` |
| Azure DevOps | `UGONDU_AZURE_DEVOPS_TOKEN` |
| AWS CodeCommit | `AWS_ROLE_ARN` + `AWS_REGION` (OIDC via `AWS_WEB_IDENTITY_TOKEN_FILE`, or STS session); bare static `AWS_SECRET_ACCESS_KEY` is rejected |
| Generic HTTPS | `UGONDU_GIT_TOKEN` |
| Generic SSH | `UGONDU_SSH_KEY_PATH` |

---

## 4. Configuration Schema Validation (Zod / JSON Schema)

All runtime configuration is validated at startup using Zod schemas (`zod ^4.6.5`):

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "UgonduRuntimeConfig",
  "type": "object",
  "required": ["UGONDU_PRIVATE_KEY", "IDENTITY_AUTHORITY_URL", "BILLING_AUTHORITY_URL"],
  "properties": {
    "UGONDU_PRIVATE_KEY": { "type": "string", "minLength": 64 },
    "IDENTITY_AUTHORITY_URL": { "type": "string", "format": "uri" },
    "BILLING_AUTHORITY_URL": { "type": "string", "format": "uri" },
    "UGONDU_CERT_REGION": { "type": "string", "enum": ["eu-west-3", "us-east-1", "eu-central-1"] }
  },
  "additionalProperties": false
}
```

---

## 5. Exit Codes & Troubleshooting

| Error Condition | Exit Code | Resolution |
|---|---:|---|
| Missing `UGONDU_CERT_REGION` during DEISE cloud repair | `1` (Fail-Closed) | Export `UGONDU_CERT_REGION=eu-west-3` before invoking physical AWS repair |
| SSRF guard blocks `IDENTITY_AUTHORITY_URL` pointing to `169.254.169.254` | `1` | `server/shared/ssrf.ts` blocks link-local metadata IPs; use a valid HTTPS authority |
| Invalid locale passed to `UGONDU_LOCALE` | `0` (Graceful Fallback) | Falls back deterministically to `en` while logging a locale diagnostic warning |

---

## 6. Clean-Room Configuration Validation Checklist

- [ ] `.env` is listed in `.gitignore` and `git status --ignored` confirms `.env` is untracked.
- [ ] `config/trust/plugin_authority.pub.pem` is present and readable (`0644`).
- [ ] `~/.ugondu/transactions/` is created with `0700` directory permissions and `0600` file permissions.
- [ ] `ugondu locale doctor` reports valid locale resolution chain with zero missing dictionary keys.
