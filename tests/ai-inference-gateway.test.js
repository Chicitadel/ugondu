/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Tests / Central AI Inference Gateway & Model Catalog
 * File           : ai-inference-gateway.test.js
 * Version        : 3.1.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-18
 * Last Modified  : 2026-10-20
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
 * - ISO 27001 / SOC 2 / OWASP ASVS / NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

'use strict';

const assert = require('assert');
const http = require('http');
const express = require('express');
const test = require('node:test');
const aiContract = require('../.governance/platform/contracts/ai');
const {
  CredentialBroker,
  InferenceGateway,
  ModelCatalog,
  ProviderAdapterRegistry,
  QuotaGuard,
  RoutingPolicyEngine,
} = require('../server/engine-core/dist/ai');
const { createAiRouter } = require('../server/engine-core/dist/routes/ai');

let passed = 0;
let failed = 0;

function reportPass(msg) {
  console.log(`[PASS] ✓ ${msg}`);
  passed++;
}

function reportFail(msg, err) {
  console.error(`[FAIL] ✗ ${msg}:`, err?.message || err);
  failed++;
}

function makeRequest(overrides = {}) {
  return {
    requestId: 'req-cor-006',
    tenantId: 'tenant-sovereign-eu',
    productId: 'ugondu',
    environment: 'production',
    task: 'chat',
    modelAlias: 'general-chat',
    region: 'eu-west-3',
    dataClassification: 'confidential',
    messages: [{ role: 'user', content: 'Verify deployment topology for eu-west-3' }],
    maxOutputTokens: 512,
    deadlineMs: 5000,
    correlationId: 'corr-cor-006',
    ...overrides,
  };
}

function httpJsonRequest(port, method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: {
          'content-type': 'application/json',
          ...(payload ? { 'content-length': Buffer.byteLength(payload) } : {}),
          ...headers,
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(raw) });
          } catch {
            resolve({ status: res.statusCode, body: raw });
          }
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('══════════════════════════════════════════════════════════════');
  console.log(' Ugondu COR-006: Central AI Inference Gateway & Model Catalog ');
  console.log('══════════════════════════════════════════════════════════════');

  await test('AI-001: Governance contract validates config/model-catalog.json', async () => {
    const catalogDoc = aiContract.loadModelCatalog();
    assert.strictEqual(catalogDoc.schemaVersion, '1.0.0');
    assert.strictEqual(catalogDoc.constitutionalInvariant, 'INV-AI-001');
    assert.ok(catalogDoc.providers.length >= 6);
    assert.ok(catalogDoc.models.length >= 5);
    assert.strictEqual(aiContract.validateInferenceRequest(makeRequest(), catalogDoc), true);
    reportPass('Governance contract (.governance/platform/contracts/ai.js) validates config/model-catalog.json');
  });

  const catalog = new ModelCatalog();
  const credentialBroker = new CredentialBroker();
  const providerRegistry = new ProviderAdapterRegistry(catalog, credentialBroker);
  const routingPolicy = new RoutingPolicyEngine(catalog, { failureThreshold: 2, cooldownMs: 15000 });
  const quotaGuard = new QuotaGuard({ maxConcurrentRequests: 2, maxRequestsPerMinute: 60 });
  const gateway = new InferenceGateway({
    catalog,
    credentialBroker,
    providerRegistry,
    routingPolicy,
    quotaGuard,
  });

  credentialBroker.registerWorkloadSecret(
    'env://UGONDU_SOVEREIGN_MODEL_TOKEN',
    'sov-token-deterministic-valid'
  );

  await test('AI-002: Missing and expired credentials fail closed with CREDENTIALS_MISSING / CREDENTIALS_EXPIRED', async () => {
    gateway.setModelStatus('policy-advisor', 'disabled', {
      actorId: 'sec-admin',
      role: 'admin',
      reason: 'Isolate primary credential test',
    });
    gateway.setModelStatus('sovereign-fallback', 'disabled', {
      actorId: 'sec-admin',
      role: 'admin',
      reason: 'Isolate primary credential test',
    });

    await assert.rejects(
      () => gateway.invoke(makeRequest({ modelAlias: 'general-chat' })),
      (err) => err.errorCode === 'CREDENTIALS_MISSING'
    );

    credentialBroker.registerWorkloadSecret(
      'aws-secrets://ugondu/prod/bedrock-workload-identity',
      'expired-bedrock-secret-val',
      '2022-01-01T00:00:00Z'
    );

    await assert.rejects(
      () => gateway.invoke(makeRequest({ modelAlias: 'general-chat' })),
      (err) => err.errorCode === 'CREDENTIALS_EXPIRED'
    );

    gateway.setModelStatus('policy-advisor', 'enabled', { actorId: 'sec-admin', role: 'admin' });
    gateway.setModelStatus('sovereign-fallback', 'enabled', { actorId: 'sec-admin', role: 'admin' });
    reportPass('Missing and expired credentials fail closed with CREDENTIALS_MISSING / CREDENTIALS_EXPIRED');
  });

  await test('AI-003: Disabled models, disallowed regions, and disallowed data classifications rejected before egress', async () => {
    let egressAttempts = 0;
    providerRegistry.setHttpTransport(async () => {
      egressAttempts++;
      return { status: 200, body: JSON.stringify({ output: 'unreachable' }) };
    });

    await assert.rejects(
      () => gateway.invoke(makeRequest({ modelAlias: 'legacy-unapproved', dataClassification: 'public' })),
      (err) => err.errorCode === 'MODEL_DISABLED'
    );

    await assert.rejects(
      () => gateway.invoke(makeRequest({ region: 'us-west-1' })),
      (err) => err.errorCode === 'REGION_DISALLOWED'
    );

    await assert.rejects(
      () => gateway.invoke(makeRequest({ modelAlias: 'general-chat', dataClassification: 'restricted' })),
      (err) => err.errorCode === 'DATA_CLASSIFICATION_DISALLOWED'
    );

    assert.strictEqual(egressAttempts, 0, 'Zero network egress allowed on policy rejection');
    reportPass('Disabled models, disallowed regions, and disallowed data classifications rejected before egress');
  });

  await test('AI-004: 429/5xx triggers circuit-breaker accounting and routes only to policy-equivalent fallback', async () => {
    credentialBroker.registerWorkloadSecret(
      'aws-secrets://ugondu/prod/bedrock-workload-identity',
      'valid-bedrock-workload-token-999'
    );
    credentialBroker.registerWorkloadSecret(
      'env://UGONDU_ANTHROPIC_API_KEY',
      'ant-api-valid-enterprise-token'
    );

    providerRegistry.setHttpTransport(async (req) => {
      if (req.url.includes('amazonaws.com')) {
        return { status: 429, body: 'Rate limit exceeded' };
      }
      return {
        status: 200,
        body: JSON.stringify({
          output: 'Policy-equivalent fallback succeeded',
          usage: { inputTokens: 18, outputTokens: 24 },
          finishReason: 'stop',
        }),
      };
    });

    const fallbackResult = await gateway.invoke(makeRequest({ requestId: 'req-fb-test' }));
    assert.strictEqual(fallbackResult.fallbackUsed, true);
    assert.strictEqual(fallbackResult.modelAlias, 'policy-advisor');
    assert.strictEqual(fallbackResult.primaryModelAlias, 'general-chat');
    reportPass('429/5xx triggers circuit-breaker accounting and routes only to policy-equivalent fallback');
  });

  await test('AI-005: Tool-call allowlist, caller authorization, and JSON schema validation enforced', async () => {
    await assert.rejects(
      () =>
        gateway.invoke(
          makeRequest({
            modelAlias: 'deployment-classifier',
            task: 'classification',
            requestedTools: [{ name: 'SHELL_EXEC', arguments: { cmd: 'rm -rf /' } }],
          })
        ),
      (err) => err.errorCode === 'TOOL_NOT_ALLOWED'
    );

    await assert.rejects(
      () =>
        gateway.invoke(
          makeRequest({
            modelAlias: 'deployment-classifier',
            task: 'classification',
            requestedTools: [{ name: 'inspect_topology', arguments: { target: 'eu-west-3' } }],
            authorizedTools: ['verify_readiness'],
          })
        ),
      (err) => err.errorCode === 'TOOL_UNAUTHORIZED'
    );

    const validTool = await gateway.invoke(
      makeRequest({
        modelAlias: 'deployment-classifier',
        task: 'classification',
        requestedTools: [{ name: 'inspect_topology', arguments: { target: 'vpc-prod-01' } }],
        authorizedTools: ['inspect_topology'],
      })
    );
    assert.strictEqual(validTool.finishReason, 'tool_call');
    assert.strictEqual(validTool.toolCalls[0].validated, true);
    reportPass('Tool-call allowlist, caller authorization, and JSON schema validation enforced');
  });

  await test('AI-006: Concurrency quota, zero secret leakage, HTTP routes, and product identity protection verified', async () => {
    providerRegistry.setHttpTransport(async () => {
      await new Promise((r) => setTimeout(r, 50));
      return { status: 200, body: JSON.stringify({ output: 'ok', finishReason: 'stop' }) };
    });

    const c1 = gateway.invoke(makeRequest({ requestId: 'conc-1', tenantId: 'tenant-burst' }));
    const c2 = gateway.invoke(makeRequest({ requestId: 'conc-2', tenantId: 'tenant-burst' }));
    const c3 = gateway.invoke(makeRequest({ requestId: 'conc-3', tenantId: 'tenant-burst' }));

    await assert.rejects(() => c3, (err) => err.errorCode === 'CONCURRENCY_LIMIT_EXCEEDED');
    await Promise.all([c1, c2]);

    const rawSecret = 'sk-live-TOPSECRET112233445566';
    credentialBroker.registerWorkloadSecret('env://UGONDU_OPENAI_API_KEY', rawSecret);
    providerRegistry.setHttpTransport(async () => {
      throw new Error(`Connection error using key ${rawSecret}`);
    });
    gateway.setModelStatus('policy-advisor', 'disabled', { actorId: 'admin', role: 'admin' });
    gateway.setModelStatus('sovereign-fallback', 'disabled', { actorId: 'admin', role: 'admin' });

    await assert.rejects(
      () => gateway.invoke(makeRequest({ modelAlias: 'code-analyzer', task: 'code' })),
      (err) => {
        assert.ok(!err.message.includes(rawSecret), 'Secret must never appear in error message');
        return true;
      }
    );

    gateway.setModelStatus('sovereign-fallback', 'enabled', { actorId: 'admin', role: 'admin' });

    const app = express();
    app.use(createAiRouter(gateway));
    const server = await new Promise((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    const port = server.address().port;

    try {
      const idHttp = await httpJsonRequest(
        port,
        'POST',
        '/v1/ai/invoke',
        makeRequest({
          modelAlias: 'deployment-classifier',
          messages: [{ role: 'user', content: 'Who are you and which LLM provider are you?' }],
        })
      );
      assert.strictEqual(idHttp.status, 200);
      assert.strictEqual(idHttp.body.providerId, 'ugondu-platform');
      assert.ok(idHttp.body.output.includes('Ugondu Universal Deployment Intelligence Assistant'));
      assert.ok(!/openai|anthropic|bedrock|gemini/i.test(idHttp.body.output));

      const unauthDiag = await httpJsonRequest(port, 'GET', '/v1/ai/diagnostics');
      assert.strictEqual(unauthDiag.status, 403);

      const authDiag = await httpJsonRequest(port, 'GET', '/v1/ai/diagnostics', null, {
        'x-ugondu-actor-id': 'chief-auditor',
        'x-ugondu-role': 'auditor',
      });
      assert.strictEqual(authDiag.status, 200);
      assert.ok(!JSON.stringify(authDiag.body).includes(rawSecret));
    } finally {
      server.close();
    }

    reportPass('Concurrency quota, zero secret leakage, HTTP routes, and product identity protection verified');
  });

  console.log('══════════════════════════════════════════════════════════════');
  console.log(` AI Inference Gateway Results: ${passed} passed, ${failed} failed `);
  console.log('══════════════════════════════════════════════════════════════');

  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error('Fatal test failure:', err);
  process.exit(1);
});
