<!--
/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Developer & Operator Documentation (Guide 01)
 * File           : 01-contributor-guide.md
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

# 01 — Contributor Guide

## 1. Overview & Governance Mandate

All contributions to the Ugondu platform (`@airroofers/ugondu-platform`) are governed by the Air Roofers corporate engineering standard and the frozen architectural state declared in `.governance/state/frozen.decisions.yaml`.

### Core Engineering Invariants
1. **Zero Architectural Drift**: Microservices (`engine-core`, `billing-gateway`, `plugin-manager`, `event-bus`, `repository-adapter`) communicate strictly over HTTP/JSON contracts and never cross-import internal source trees.
2. **File Size Governance (`AIR_ROOFERS_GUIDE_5_1`)**: Keep source and script files concise, modular, and `<= 500` lines.
3. **Zero Hardcoded UI Strings**: Every user-visible message in the Go thin client (`client/`) or Node.js control plane (`server/`) must resolve through the 12-locale internationalization dictionary (`ar`, `de`, `en`, `es`, `fr`, `hi`, `it`, `ja`, `ko`, `pt`, `ru`, `zh`).
4. **Zero Repository-Held Private Keys**: Never commit `.pem` private keys, raw credentials, `.env` files, or generated runtime ledgers (`.service_replay_ledger.json`).
5. **Corporate Header Standard**: Every governed file must carry the standard corporate header with `Author: Ujomor Systems Engineering & Governance Authority` and `- Corporate Policy Governed`.

---

## 2. Repository Layout & Bounded Contexts

```text
ugondu/
├── .governance/             # Frozen architecture, policies, schemas & state
├── api/openapi.yaml         # Canonical OpenAPI 3.1 contract
├── client/                  # Go thin-client CLI (cmd/, engine/, i18n/, locales/)
├── config/trust/            # Public trust roots (plugin_authority.pub.pem)
├── docs/
│   ├── guides/              # 14 Developer & Operator Guides
│   └── uplm/                # UPLM Phase 0 Discovery, Mapping, ADR & Baseline
├── locales/                 # Server 12-locale dictionaries
├── plugins/                 # Bundled build plugins (node, composer)
├── scripts/                 # Release integrity, locale validation & COR runners
├── server/
│   ├── shared/              # @ugondu/shared (types, i18n, URRE, DEISE twin, SSRF)
│   ├── engine-core/         # :4001 Primary orchestrator & recipe signer
│   ├── billing-gateway/     # :4002 Mandatag license & edition resolver
│   ├── plugin-manager/      # :4003 UPLM sandboxed plugin manager
│   ├── event-bus/           # :4004 Pub/sub event & telemetry router
│   ├── repository-adapter/  # :4005 9-provider Git/SCM adapter
│   ├── uppie/               # Unified Policy & Permission Intelligence Engine
│   ├── capabilities/        # CapabilityRegistry & lifecycle definitions
│   └── plugins/             # Domain & DEISE recovery plugins
└── tests/                   # Cross-service integration, adversarial & COR suites
```

---

## 3. Contribution Workflow & Branching Strategy

1. **Create a Feature or Remediation Branch**:
   ```bash
   git checkout -b feat/<capability-or-ticket-id>
   ```
2. **Implement Changes within Bounded Contexts**:
   - Update shared schemas in `server/shared` first and run `npm run build --workspace=@ugondu/shared`.
   - Maintain 12-locale parity whenever adding localization keys (`node scripts/validate-locales.js`).
3. **Run Local Verification Gates**:
   ```bash
   npm run build
   npm test
   npm run lint
   npm run verify:release-integrity
   node scripts/release/verify-evidence-bundle.mjs
   ```
4. **Conventional Commits**:
   Use structured commit prefixes (`feat:`, `fix:`, `security:`, `docs:`, `refactor:`, `test:`) referencing the governance requirement ID (e.g., `COR-014`).

---

## 4. Exit Codes & Gate Reference

| Command / Gate | Exit `0` | Exit `1` | Exit `2` |
|---|---|---|---|
| `npm run verify:release-integrity` | Clean tree, no private keys, valid evidence commit binding | Forbidden tracked artifact, private key detected, or SHA mismatch | Git/execution environment error |
| `node scripts/validate-locales.js` | All 12 locales have 100% key parity | Missing or untranslated locale keys | Invalid JSON syntax in locale file |
| `node scripts/release/verify-evidence-bundle.mjs` | All evidence files and Ed25519 signature verified | Missing artifact, SHA-256 digest mismatch, or invalid Ed25519 signature | Invalid CLI arguments or filesystem error |

---

## 5. Troubleshooting Common Contributor Issues

| Symptom | Root Cause | Resolution |
|---|---|---|
| `Cannot find module '@ugondu/shared'` during workspace build | `@ugondu/shared` has not been compiled before dependent workspaces | Run `npm run build --workspace=@ugondu/shared` first, then `npm run build` |
| `[FAIL] Release integrity: forbidden tracked artifacts` | `.service_replay_ledger.json`, `cor-evidence-bundle.json`, or `*_private.pem` was staged | Run `git rm --cached <file>` and ensure `.gitignore` excludes runtime artifacts |
| Go test fails in `client/i18n` | Missing key in one of `client/locales/*.json` | Synchronize keys across all 12 files in `client/locales/` and re-run `go test ./...` |

---

## 6. Clean-Room Validation Checklist

- [ ] Working tree contains zero untracked private keys (`*.pem`) or `.env` secrets.
- [ ] `npm run build` completes with exit code `0` across all 9 workspaces.
- [ ] `cd client && go test ./...` passes all thin-client unit tests.
- [ ] `npm test` passes unit, contract, and adversarial test suites.
- [ ] `npm run verify:release-integrity` outputs `[PASS] Release integrity`.
- [ ] `node scripts/release/verify-evidence-bundle.mjs --verify` outputs `[PASS]`.
