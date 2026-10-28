<!--
/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Developer & Operator Documentation (Guide 03)
 * File           : 03-local-development-guide.md
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

# 03 — Local Development Guide

## 1. Prerequisites & Toolchain Matrix

| Tool | Minimum Version | Recommended Version | Verification Command |
|---|---|---|---|
| **Node.js** | `>=20.0.0` | `20.18.0 LTS` | `node --version` |
| **npm** | `>=10.0.0` | `10.8.0+` | `npm --version` |
| **Go** | `>=1.22.0` | `1.22.5+` | `go version` |
| **Docker & Compose** | `>=24.0.0` | `27.x` | `docker compose version` |
| **Git** | `>=2.40.0` | `2.46.0+` | `git --version` |

---

## 2. Step-by-Step Local Bootstrap

### Step 1: Clone & Install Workspace Dependencies
```bash
git clone https://github.com/Chicitadel/ugondu.git
cd ugondu
npm ci
```

### Step 2: Configure Local `.env` (Untracked)
```bash
cp .env.example .env
```
Populate `.env` with a local development signing secret generated via OpenSSL (never commit `.env`):
```bash
# Generate ephemeral 32-byte hex signing key for local recipes
openssl rand -hex 32
```
Example local `.env`:
```dotenv
UGONDU_PRIVATE_KEY=a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90
IDENTITY_AUTHORITY_URL=https://identity.airroofers.eu/api/v1
BILLING_AUTHORITY_URL=https://billing.airroofers.eu/api/v1
PORT_ENGINE_CORE=4001
PORT_BILLING_GATEWAY=4002
PORT_PLUGIN_MANAGER=4003
PORT_EVENT_BUS=4004
PORT_REPOSITORY_ADAPTER=4005
```

### Step 3: Build All Server Workspaces
```bash
npm run build
```
This compiles TypeScript across `server/shared`, `server/engine-core`, `server/billing-gateway`, `server/plugin-manager`, `server/event-bus`, `server/repository-adapter`, `server/uppie`, `server/capabilities`, and `server/tests`.

### Step 4: Build the Go Thin Client (`client/`)
```bash
cd client
go build -o ../bin/ugondu .
cd ..
```

---

## 3. Running the Control Plane Locally

### Option A: Native Node.js Processes
```bash
# Terminal 1: Event Bus (:4004)
npm run start:bus

# Terminal 2: Billing Gateway (:4002)
npm run start:billing

# Terminal 3: Plugin Manager (:4003)
npm run start:plugins

# Terminal 4: Repository Adapter (:4005)
node server/repository-adapter/dist/index.js

# Terminal 5: Engine Core (:4001)
npm run start:engine
```

### Option B: Docker Compose Stack
```bash
npm run docker:up
npm run docker:logs
```
To stop the stack cleanly:
```bash
npm run docker:down
```

---

## 4. Running Tests & Verification Suites

```bash
# Run all workspace unit & integration tests
npm test

# Run specific root Jest suite
npx jest tests/engine-core.test.js
npx jest tests/repository-adapter.test.js
npx jest tests/plugin-manager.test.js

# Run Go thin-client tests
cd client && go test -v ./...

# Run release integrity & evidence bundle verification
npm run verify:release-integrity
node scripts/release/verify-evidence-bundle.mjs
```

---

## 5. Exit Codes & Troubleshooting

| Issue / Error | Exit Code | Cause | Fix |
|---|---:|---|---|
| `EADDRINUSE: address already in use :::4001` | `1` | Another instance of `engine-core` or Docker container is bound to `4001` | Run `npm run docker:down` or terminate the process holding port `4001` |
| `Error: UGONDU_PRIVATE_KEY is required` | `1` | `.env` is missing or `UGONDU_PRIVATE_KEY` is empty | Set a 64-char hex secret in `.env` |
| `TS2307: Cannot find module '@ugondu/shared'` | `2` | `server/shared/dist` has not been built | Run `npm run build --workspace=@ugondu/shared` |

---

## 6. Clean-Room Local Development Validation Checklist

- [ ] `npm ci` and `npm run build` succeed with zero TypeScript errors.
- [ ] `curl -s http://localhost:4001/health` returns `{"status":"ok","service":"engine-core"}`.
- [ ] `curl -s http://localhost:4002/health` returns `{"status":"ok","service":"billing-gateway"}`.
- [ ] `curl -s http://localhost:4003/health` returns `{"status":"ok","service":"plugin-manager"}`.
- [ ] `curl -s http://localhost:4004/health` returns `{"status":"ok","service":"event-bus"}`.
- [ ] `curl -s http://localhost:4005/health` returns `{"status":"ok","service":"repository-adapter","cor_level":"A"}`.
- [ ] `cd client && go test ./...` passes 100% of packages (`cmd`, `engine`, `i18n`).
