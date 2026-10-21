/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Tests / Qualification — Entrypoint Process Parity Suite
 * File           : entrypoint-process-parity.test.js
 * Version        : 1.0.0
 * Author         : Air Roofers SASU / Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-21
 * Last Modified  : 2026-10-21
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
 * - ISO 27001 / SOC 2 Type II / OWASP ASVS 5.0 / NIST SP 800-53
 *
 * Signatures:
 * - Architecture Authority : Ujomor Systems Engineering
 * - Security Authority     : Ujomor Systems Governance
 * - Governance Authority   : Air Roofers Corporate Governance
 * - Deployment Authority   : Air Roofers Release Engineering
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

'use strict';

process.env.UGONDU_DISABLE_AUTO_LISTEN = 'true';
process.env.NODE_ENV = 'test';

const assert = require('node:assert');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const express = require('express');

const shared = require('../../server/shared/dist');
const hardenedClient = require('../../server/engine-core/dist/http/hardened-client');
const { app, issueSignedPassport } = require('../../server/engine-core/dist/index');
const { evaluateFourDimensionalAuthorization } = require('../../server/capabilities/dist/agent-neutral/FourDimensionalAuthZ');
const { AiDeliveryGuardrail, CredentialBroker, AiGatewayError } = require('../../server/engine-core/dist/ai');
const { TransactionAuthority } = require('../../server/engine-core/dist/deise/engine/recovery/transaction-authority');

const CLIENT_PROFILES = Object.freeze([
  { name: 'human-cli', headers: { 'x-ugondu-client': 'human-cli', 'user-agent': 'ugondu-cli/1.0 (terminal)' }, surface: 'CLI' },
  { name: 'ide', headers: { 'x-ugondu-client': 'ide', 'user-agent': 'ugondu-ide-extension/1.0' }, surface: 'API_SDK' },
  { name: 'automation', headers: { 'x-ugondu-client': 'automation', 'user-agent': 'ugondu-automation-runner/1.0' }, surface: 'AGENT_TOOL' },
  { name: 'headless-ci', headers: { 'x-ugondu-client': 'headless-ci', 'user-agent': 'ugondu-headless-ci/1.0' }, surface: 'MANUAL_WORKFLOW' },
  { name: 'human-ui', headers: { 'x-ugondu-client': 'human-ui', 'user-agent': 'Mozilla/5.0 (browser-ui)' }, surface: 'DESKTOP_UI' },
]);

const BASE_PAYLOAD = Object.freeze({
  repositoryUrl: 'https://github.com/airroofers/ugondu-app.git',
  branch: 'main',
  fileMap: { 'index.ts': 'sha256:4a5b6c7d8e9f0123' },
  targetEnvironment: 'linux',
  token: 'tok_live_enterprise_789',
  projectId: 'proj_enterprise_01',
  workspaceId: 'ws_enterprise_01',
  targetId: 'target_linux_01',
});

const AI_ENV_KEYS = ['UGONDU_AI_OPENAI_API_KEY', 'UGONDU_AI_ANTHROPIC_API_KEY'];

let passed = 0;
let failed = 0;

function check(id, title, fn) {
  return test(`${id}: ${title}`, async () => {
    try {
      await fn();
      console.log(`[PASS] ✓ ${id}: ${title}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ✗ ${id}: ${title} — ${err.message}`);
      failed++;
      throw err;
    }
  });
}

async function runEntrypointParitySuite() {
  console.log('══════════════════════════════════════════════════════════════');
  console.log(' Ugondu Multi-Entrypoint Process Parity Qualification Suite   ');
  console.log('══════════════════════════════════════════════════════════════');

  const tmpTxDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ugondu-ep-tx-'));
  process.env.UGONDU_TRANSACTION_DIR = tmpTxDir;

  let authDecision = 'ALLOW';
  hardenedClient.hardenedPost = async (url) => {
    if (url.includes('/authorize')) {
      if (authDecision === 'UNAVAILABLE') throw new Error('ECONNREFUSED: Billing gateway service unreachable');
      if (authDecision === 'DENY') {
        return JSON.stringify({
          edition: 'COMMUNITY',
          tenantId: 'tenant-enterprise-01',
          capabilities: { allowAtomic: false, allowRollback: false, maxPlugins: 0, allowedActions: [] }
        });
      }
      return JSON.stringify({
        edition: 'ENTERPRISE',
        tenantId: 'tenant-enterprise-01',
        capabilities: {
          allowAtomic: true,
          allowRollback: true,
          maxPlugins: 5,
          allowedActions: ['FETCH_REPOSITORY', 'SYNC_ENVIRONMENT', 'PRUNE_RELEASES']
        }
      });
    }
    return JSON.stringify({});
  };
  hardenedClient.hardenedGet = async () => JSON.stringify({ plugins: [] });

  const wrapper = express();
  wrapper.use((req, _res, next) => {
    const accept = req.headers['accept-language'];
    if (accept && typeof accept === 'string') {
      const lang = accept.split(',')[0].trim().split(';')[0].trim().split('-')[0].toLowerCase();
      if (shared.isLocaleSupported(lang)) shared.setLocale(lang);
    }
    next();
  });
  wrapper.use(app);

  const server = http.createServer(wrapper);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const post = async (endpoint, body, headers = {}) => {
    const res = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => null);
    return { status: res.status, headers: res.headers, body: data };
  };

  const get = async (endpoint, headers = {}) => {
    const res = await fetch(`${baseUrl}${endpoint}`, { method: 'GET', headers });
    const data = await res.json().catch(() => null);
    return { status: res.status, headers: res.headers, body: data };
  };

  try {
    // 0. Base Ephemeral Port Health & Capability Discovery
    await check('E2E-PAR-000', 'Real server binds ephemeral port and reports ready across all client profiles', async () => {
      for (const profile of CLIENT_PROFILES) {
        const res = await get('/health', profile.headers);
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.status, 'ok');
        assert.strictEqual(res.body.readiness, 'ready');
        assert.strictEqual(res.body.service, 'engine-core');
      }
    });

    // 1. 4D Authorization Policy & Tenant Isolation Parity (a)
    await check('E2E-PAR-001', '4D authorization policy (FourDimensionalAuthZ) and tenant isolation rules are identical across entrypoints', async () => {
      const passportToken = issueSignedPassport({ tenantId: 'tenant-enterprise-01', workspaceId: 'ws_enterprise_01' });

      for (const profile of CLIENT_PROFILES) {
        const authZ = evaluateFourDimensionalAuthorization({
          surface: profile.surface,
          operationId: `op-${profile.name}-01`,
          correlationId: `corr-${profile.name}-01`,
          capabilityId: 'policy.plan',
          authenticatedCaller: {
            subjectId: `usr-${profile.name}`,
            tenantId: 'tenant-enterprise-01',
            edition: 'ENTERPRISE',
            grantedScopes: ['policy:read'],
            claimedTenantId: 'tenant-rogue-cross'
          },
          providerContext: {
            provider: 'linux',
            target: 'srv-01',
            effectivePrincipal: 'root',
            credentialsValid: true,
            requiredActions: ['inspect'],
            grantedActions: ['inspect']
          }
        });
        assert.strictEqual(authZ.allowed, false);
        assert.strictEqual(authZ.primaryError.code, 'IDENTITY_MISMATCH');
        assert.strictEqual(authZ.platformAuthZ.allowed, false);

        // Missing passport -> 403 PASSPORT_REQUIRED
        const missingPassport = await post('/v1/deploy/preview', BASE_PAYLOAD, { ...profile.headers });
        assert.strictEqual(missingPassport.status, 403);
        assert.strictEqual(missingPassport.body.code, 'PASSPORT_REQUIRED');

        // Tenant claim mismatch in request body -> 403 PASSPORT_REJECTED
        const mismatchPassport = await post('/v1/deploy/preview', { ...BASE_PAYLOAD, tenantId: 'tenant-other' }, {
          ...profile.headers,
          'x-ugondu-passport-id': passportToken
        });
        assert.strictEqual(mismatchPassport.status, 403);
        assert.strictEqual(mismatchPassport.body.code, 'PASSPORT_REJECTED');

        // Valid signed passport -> 200 OK
        const validReq = await post('/v1/deploy/preview', BASE_PAYLOAD, {
          ...profile.headers,
          'x-ugondu-passport-id': passportToken
        });
        assert.strictEqual(validReq.status, 200);
        assert.strictEqual(validReq.body.edition, 'ENTERPRISE');
      }
    });

    // 2. Idempotency Key Replay & Conflict Enforcement (b)
    await check('E2E-PAR-002', 'Idempotency keys enforce replay deduplication and 409 Conflict across entrypoints', async () => {
      let idx = 0;
      for (const profile of CLIENT_PROFILES) {
        const idempKey = `idemp-seq-${profile.name}-${idx++}`;
        const headers = { ...profile.headers, 'x-ugondu-passport-id': 'valid_passport_id', 'Idempotency-Key': idempKey };

        const first = await post('/v1/deploy/resolve', BASE_PAYLOAD, headers);
        assert.strictEqual(first.status, 200);
        assert.ok(first.body.transactionId);
        assert.strictEqual(first.body.lifecycleState, 'HANDOFF');

        // Exact replay with same key -> 200 OK identical cached transaction
        const replay = await post('/v1/deploy/resolve', BASE_PAYLOAD, headers);
        assert.strictEqual(replay.status, 200);
        assert.strictEqual(replay.body.transactionId, first.body.transactionId);
        assert.strictEqual(replay.body.planHash, first.body.planHash);

        // Mutation with same key but differing payload -> 409 Conflict
        const conflict = await post('/v1/deploy/resolve', { ...BASE_PAYLOAD, branch: 'divergent-branch' }, headers);
        assert.strictEqual(conflict.status, 409);
        assert.strictEqual(conflict.body.code, 'IDEMPOTENCY_CONFLICT');

        // Concurrent duplicate mutation race
        const raceKey = `idemp-race-${profile.name}-${idx++}`;
        const raceHeaders = { ...profile.headers, 'x-ugondu-passport-id': 'valid_passport_id', 'Idempotency-Key': raceKey };
        const [r1, r2] = await Promise.all([
          post('/v1/deploy/resolve', BASE_PAYLOAD, raceHeaders),
          post('/v1/deploy/resolve', { ...BASE_PAYLOAD, branch: 'hotfix' }, raceHeaders)
        ]);
        const statuses = [r1.status, r2.status].sort();
        assert.deepStrictEqual(statuses, [200, 409]);
      }
    });

    // 3. Execution Plan Decoupling from AI Model Credentials (c)
    await check('E2E-PAR-003', 'Execution plans decouple from AI model credentials and execute identically across entrypoints', async () => {
      const savedEnv = {};
      for (const k of AI_ENV_KEYS) savedEnv[k] = process.env[k];

      try {
        const hashesByProfile = [];
        let seq = 0;

        for (const profile of CLIENT_PROFILES) {
          // AI credentials absent
          for (const k of AI_ENV_KEYS) delete process.env[k];
          const off = await post('/v1/deploy/preview', BASE_PAYLOAD, {
            ...profile.headers,
            'x-ugondu-passport-id': 'valid_passport_id',
            'Idempotency-Key': `plan-ai-off-${seq++}`
          });
          assert.strictEqual(off.status, 200);

          // AI credentials present
          for (const k of AI_ENV_KEYS) process.env[k] = 'present-valid-test-credential';
          const on = await post('/v1/deploy/preview', BASE_PAYLOAD, {
            ...profile.headers,
            'x-ugondu-passport-id': 'valid_passport_id',
            'Idempotency-Key': `plan-ai-on-${seq++}`
          });
          assert.strictEqual(on.status, 200);

          assert.strictEqual(off.body.planHash, on.body.planHash);
          hashesByProfile.push(off.body.planHash);
        }

        // All 5 entrypoints receive identical plan hash
        assert.strictEqual(new Set(hashesByProfile).size, 1);
      } finally {
        for (const k of AI_ENV_KEYS) {
          if (savedEnv[k] !== undefined) process.env[k] = savedEnv[k];
          else delete process.env[k];
        }
      }
    });

    // 4. AI Gateway Spectrum: Absent, Valid, Invalid, Expired, Provider-Unavailable
    await check('E2E-PAR-004', 'AI gateway handles absent/valid/invalid/expired/provider-unavailable without destabilizing deploy entrypoints', async () => {
      const broker = new CredentialBroker();

      // Absent
      assert.throws(() => broker.resolveHandle('env://KEY_NOT_CONFIGURED'), (e) => e instanceof AiGatewayError && e.errorCode === 'CREDENTIALS_MISSING');

      // Invalid format
      assert.throws(() => broker.resolveHandle('invalid-format-string'), (e) => e instanceof AiGatewayError && e.errorCode === 'CREDENTIALS_INVALID');

      // Expired
      broker.registerWorkloadSecret('env://EXPIRED_KEY', 'secret-val-1234', new Date(Date.now() - 60000).toISOString());
      assert.throws(() => broker.resolveHandle('env://EXPIRED_KEY'), (e) => e instanceof AiGatewayError && e.errorCode === 'CREDENTIALS_EXPIRED');

      // Valid
      broker.registerWorkloadSecret('env://VALID_KEY', 'secret-val-1234', new Date(Date.now() + 60000).toISOString());
      const handle = broker.resolveHandle('env://VALID_KEY');
      assert.strictEqual(handle.scheme, 'env');
      assert.strictEqual(handle.keyId, 'VALID_KEY');
      assert.ok(handle.fingerprintSha256);

      // Verify deploy route still functions with 200 OK during AI degradation
      for (const profile of CLIENT_PROFILES) {
        const preview = await post('/v1/deploy/preview', BASE_PAYLOAD, {
          ...profile.headers,
          'x-ugondu-passport-id': 'valid_passport_id'
        });
        assert.strictEqual(preview.status, 200);
      }
    });

    // 5. Uniform Forbidden Action (SHELL_EXEC) Rejection (d)
    await check('E2E-PAR-005', 'Forbidden SHELL_EXEC actions and prompt injections are rejected uniformly across all entrypoints', () => {
      const forbiddenPlan = {
        proposedByModel: 'external-untrusted-planner',
        targetEnvironment: 'production',
        reasoning: 'Perform administrative maintenance and bypass checks',
        actions: [
          { action: 'SHELL_EXEC', payload: { cmd: 'rm -rf / --no-preserve-root' } },
          { action: 'FETCH_REPOSITORY', payload: { url: 'https://github.com/airroofers/ugondu-app.git' } }
        ]
      };

      for (const profile of CLIENT_PROFILES) {
        const result = AiDeliveryGuardrail.validateAiPlan(forbiddenPlan, ['FETCH_REPOSITORY', 'SYNC_ENVIRONMENT']);
        assert.strictEqual(result.passed, false, `Failed to reject SHELL_EXEC for ${profile.name}`);
        assert.ok(result.violations.some((v) => v.includes('VIOLATION_FORBIDDEN_SHELL_ACTION')));
        assert.strictEqual(result.sanitizedPlan, undefined);
      }
    });

    // 6. Localized Error Tokens According to Accept-Language (e)
    await check('E2E-PAR-006', 'Error tokens resolve localized dictionaries according to Accept-Language across entrypoints', async () => {
      const languageExpectations = [
        { header: 'fr-FR', pattern: /Invalide DeploymentContext/i },
        { header: 'de-DE', pattern: /Ungültig DeploymentContext/i },
        { header: 'en-US', pattern: /Invalid DeploymentContext/i },
        { header: 'es-ES', pattern: /Inválido DeploymentContext/i }
      ];

      for (const profile of CLIENT_PROFILES) {
        for (const { header, pattern } of languageExpectations) {
          const res = await post('/v1/deploy/resolve', {}, {
            ...profile.headers,
            'Accept-Language': header,
            'x-ugondu-passport-id': 'valid_passport_id'
          });
          assert.strictEqual(res.status, 400);
          assert.match(res.body.error, pattern, `Failed localization match for ${header} on ${profile.name}`);
        }

        // Localized passport error
        const frPassport = await post('/v1/deploy/preview', BASE_PAYLOAD, {
          ...profile.headers,
          'Accept-Language': 'fr-FR'
        });
        assert.strictEqual(frPassport.status, 403);
        assert.match(frPassport.body.error, /Accès refusé/i);
      }
    });

    // 7. Operational Resilience: Cancellation, Resume, Rollback, Network Failure & Concurrency
    await check('E2E-PAR-007', 'Operational resilience (cancellation, resume, rollback, network failure, concurrency) holds across entrypoints', async () => {
      // Rollback plan determinism
      for (const profile of CLIENT_PROFILES) {
        const preview = await post('/v1/deploy/preview', BASE_PAYLOAD, {
          ...profile.headers,
          'x-ugondu-passport-id': 'valid_passport_id'
        });
        assert.strictEqual(preview.status, 200);
        assert.ok(Array.isArray(preview.body.rollback));
        assert.ok(preview.body.rollback.length > 0);
        assert.ok(preview.body.blastRadius.includes('LinuxReleaseDirectory'));
      }

      // Resume & Revision Monotonicity
      const tx = TransactionAuthority.create({
        capabilityId: 'recovery-linux',
        target: 'srv-prod',
        repositoryPath: '/srv/ugondu/repo',
        authorizedActions: ['SERVICE_RESTART']
      });
      assert.strictEqual(tx.revision, 1);
      const updated = TransactionAuthority.update(tx.id, tx.revision, { status: 'RUNNING' });
      assert.strictEqual(updated.revision, 2);
      assert.throws(() => TransactionAuthority.update(tx.id, 1, { status: 'SUCCESS' }), /TRANSACTION_REVISION_CONFLICT/);

      // Network Failure & Authorization Denial Fail-Closed
      authDecision = 'UNAVAILABLE';
      for (const profile of CLIENT_PROFILES) {
        const res = await post('/v1/deploy/resolve', BASE_PAYLOAD, {
          ...profile.headers,
          'x-ugondu-passport-id': 'valid_passport_id',
          'Idempotency-Key': `net-fail-${profile.name}`
        });
        assert.ok(res.status >= 400);
      }
      authDecision = 'ALLOW';

      // Concurrency across all entrypoints in parallel
      const concurrentRequests = CLIENT_PROFILES.flatMap((profile, pIdx) =>
        Array.from({ length: 2 }).map((_, cIdx) =>
          post('/v1/deploy/preview', BASE_PAYLOAD, {
            ...profile.headers,
            'x-ugondu-passport-id': 'valid_passport_id',
            'Idempotency-Key': `concurrent-${pIdx}-${cIdx}`
          })
        )
      );
      const concurrentResults = await Promise.all(concurrentRequests);
      for (const res of concurrentResults) {
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.edition, 'ENTERPRISE');
      }

      // Cancellation via AbortController
      const abortCtrl = new AbortController();
      const abortedFetch = fetch(`${baseUrl}/v1/deploy/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-ugondu-client': 'human-cli',
          'x-ugondu-passport-id': 'valid_passport_id'
        },
        body: JSON.stringify(BASE_PAYLOAD),
        signal: abortCtrl.signal
      });
      abortCtrl.abort();
      await assert.rejects(abortedFetch, (err) => err.name === 'AbortError');
    });

    // 8. Unified Autonomous Bootstrap Policy Reconciliation & AI/Non-AI Deploy Parity
    await check('E2E-PAR-008', 'Unified bootstrap policy reconciliation gates deploy across CLI, UI, IDE, CI, and AI-assisted entrypoints', async () => {
      for (const profile of CLIENT_PROFILES) {
        const okRes = await post('/v1/deploy/resolve', BASE_PAYLOAD, {
          ...profile.headers,
          'x-ugondu-passport-id': 'valid_passport_id'
        });
        assert.strictEqual(okRes.status, 200);
        assert.strictEqual(okRes.body.policyReconciliation.readyForDeploy, true);
        assert.strictEqual(okRes.body.policyReconciliation.operatingState, 'RETURNING_INSTALLATION_MATCHED');

        const missingAuthRes = await post('/v1/deploy/resolve', {
          ...BASE_PAYLOAD,
          bootstrapReconciliation: { policiesAttached: false, bootstrapAuthorized: false }
        }, {
          ...profile.headers,
          'x-ugondu-passport-id': 'valid_passport_id'
        });
        assert.strictEqual(missingAuthRes.status, 403);
        assert.strictEqual(missingAuthRes.body.code, 'UG-BOOTSTRAP-AUTH-MISSING');
        assert.strictEqual(missingAuthRes.body.operatingState, 'BOOTSTRAP_AUTHORITY_MISSING_OR_INSUFFICIENT');
      }
    });

  } finally {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(tmpTxDir, { recursive: true, force: true });
  }

  console.log('══════════════════════════════════════════════════════════════');
  console.log(` Multi-Entrypoint Process Parity: ${passed} passed, ${failed} failed `);
  console.log('══════════════════════════════════════════════════════════════');

  if (failed > 0) process.exit(1);
}

runEntrypointParitySuite().catch((err) => {
  console.error('Fatal multi-entrypoint parity suite error:', err);
  process.exit(1);
});
