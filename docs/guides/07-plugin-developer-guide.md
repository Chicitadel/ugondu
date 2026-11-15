<!--
/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Developer & Operator Documentation (Guide 07)
 * File           : 07-plugin-developer-guide.md
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

# 07 — Plugin Developer Guide (UPLM)

## 1. Universal Plugin Lifecycle Management (UPLM) Overview

Ugondu plugins extend dependency resolution, build compilation, target provisioning, and DEISE structural recovery without modifying `engine-core`. Every plugin is managed by `plugin-manager` (`:4003`) under strict cryptographic verification and container sandboxing.

### Plugin Lifecycle States
`DISCOVERED` -> `VERIFIED` -> `INSTALLED` -> `ACTIVATED` -> `EXECUTING` -> `SUSPENDED` -> `ROLLED_BACK` -> `UNINSTALLED`

---

## 2. Plugin Manifest Schema v2

Every plugin directory (`plugins/<name>/manifest.json` or `server/plugins/<name>/manifest.json`) must provide a valid **Manifest Schema v2** document:

```json
{
  "schemaVersion": "2.0",
  "name": "ugondu-plugin-node",
  "version": "1.2.0",
  "entrypoint": "dist/index.js",
  "publisher": "Air Roofers Ltd",
  "editionMinimum": "COMMUNITY",
  "capabilities": ["NpmDependencyIntegrity"],
  "permissions": [
    "fs:read:workspace",
    "fs:write:build-output"
  ],
  "sandbox": {
    "network": "none",
    "readOnlyRootFilesystem": true,
    "pidsLimit": 64,
    "memoryLimitMb": 512,
    "timeoutSeconds": 120
  },
  "signature": "<base64-ed25519-signature>"
}
```

---

## 3. Sandbox Isolation & Security Controls

When `plugin-manager` executes a plugin (`POST /v1/provision` or `POST /v1/deprovision`), it spawns an ephemeral rootless container with hard kernel isolation flags:

```text
docker run \
  --rm \
  --init \
  --read-only \
  --network=none \
  --cap-drop=ALL \
  --security-opt=seccomp=default \
  --pids-limit=64 \
  --memory=512m \
  <plugin-image-digest>
```

### Edition Active Plugin Quotas
- **Community**: `1` active plugin
- **Professional**: `5` active plugins
- **Business**: `25` active plugins
- **Enterprise / Sovereign**: `Unlimited`

---

## 4. Signing & Verifying a Plugin with Ed25519

### Step 1: Canonicalize Manifest Payload
Remove the `signature` field, sort all JSON object keys lexicographically, and serialize with zero whitespace.

### Step 2: Sign with Offline Publisher Key
```bash
# Sign canonical manifest using an offline Ed25519 private key (never stored in repo)
UGONDU_PUBLISHER_PRIVATE_KEY_PATH=/secure/hsm/publisher_ed25519.pem \
  node sign_plugins.js plugins/ugondu-plugin-node/manifest.json
```

### Step 3: Verify Against Repository Trust Root
The public key at `config/trust/plugin_authority.pub.pem` (and `server/plugin-manager/plugin_pub.pem`) verifies the Ed25519 signature at admission time:
```bash
ugondu plugin verify ugondu-plugin-node
node scripts/ci/verify-trust-root.js
```

---

## 5. Exit Codes & Troubleshooting

| Error / Status | Code | Cause | Resolution |
|---|---:|---|---|
| `ED25519_SIGNATURE_INVALID` | `HTTP 403` / `Exit 1` | Manifest was edited after signing or signed with an untrusted key | Re-sign manifest against the key matching `config/trust/plugin_authority.pub.pem` |
| `PLUGIN_QUOTA_EXCEEDED` | `HTTP 402` / `Exit 1` | Tenant active plugins exceed edition limit (e.g., >1 on Community) | Deactivate unused plugins (`ugondu plugin remove <id>`) or upgrade edition |
| `SANDBOX_OOM_OR_PID_LIMIT` | `HTTP 500` / `Exit 137` | Plugin spawned >64 processes or exceeded memory ceiling | Reduce worker concurrency inside the plugin entrypoint |

---

## 6. Clean-Room Plugin Validation Checklist

- [ ] `manifest.json` contains all required Schema v2 fields (`name`, `version`, `entrypoint`, `permissions[]`, `publisher`, `signature`).
- [ ] `node scripts/ci/verify-trust-root.js` confirms trust root integrity.
- [ ] `npx jest tests/plugin-manager.test.js` passes all admission, quota, and sandbox isolation tests.
- [ ] No private `.pem` signing keys exist anywhere in the repository (`npm run verify:release-integrity`).
