/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Tests / Qualification — Runtime Config & Fail-Closed Zero-Hardcode Suite
 * File           : runtime-config-zero-hardcode.test.js
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-23
 * Last Modified  : 2026-10-23
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
 * Signatures:
 * - Architecture Authority : Ujomor Systems Engineering
 * - Security Authority     : Ujomor Systems Governance
 * - Governance Authority   : Air Roofers Corporate Governance
 * - Deployment Authority   : Air Roofers Release Engineering
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  AirRoofersAiProviderAdapter,
  CredentialBroker,
  InferenceGateway,
  ModelCatalog,
  ProviderAdapterRegistry,
  QuotaGuard,
  RoutingPolicyEngine,
  AiGatewayError,
} = require('../../server/engine-core/dist/ai');

const AIRROOFERS_SECRET_REF = 'env://UGONDU_AIRROOFERS_AI_KEY';
const MOCK_VALID_SECRET = 'air_prod_' + 'a1b2c3d4e5f678901234567890abcdef1234567890abcdef';

function makeBaseRequest(overrides = {}) {
  return {
    requestId: 'req-qual-zero-hardcode-001',
    tenantId: 'tenant-enterprise-fr',
    productId: 'ugondu',
    environment: 'production',
    task: 'chat',
    modelAlias: 'sovereign-eu-chat',
    region: 'eu-west-3',
    dataClassification: 'confidential',
    messages: [{ role: 'user', content: 'Audit runtime configuration zero hardcoding' }],
    maxOutputTokens: 256,
    deadlineMs: 5000,
    correlationId: 'corr-qual-zero-hardcode-001',
    ...overrides,
  };
}

function createHarness() {
  const catalog = new ModelCatalog();
  const credentialBroker = new CredentialBroker();
  credentialBroker.registerWorkloadSecret(AIRROOFERS_SECRET_REF, MOCK_VALID_SECRET);
  credentialBroker.registerWorkloadSecret('env://UGONDU_SOVEREIGN_MODEL_TOKEN', 'sov-token-deterministic-valid');

  const capturedEgressRequests = [];
  const mockTransport = async (req) => {
    capturedEgressRequests.push(req);
    return {
      status: 200,
      body: JSON.stringify({
        success: true,
        output: 'Dynamic runtime configuration verified with zero silent fallbacks',
        usage: { prompt_tokens: 16, completion_tokens: 24 },
        finishReason: 'stop',
      }),
    };
  };

  const providerRegistry = new ProviderAdapterRegistry(catalog, credentialBroker);
  providerRegistry.setHttpTransport(mockTransport);

  const routingPolicy = new RoutingPolicyEngine(catalog);
  const quotaGuard = new QuotaGuard();
  const gateway = new InferenceGateway({
    catalog,
    credentialBroker,
    providerRegistry,
    routingPolicy,
    quotaGuard,
  });

  const airroofersAdapter = new AirRoofersAiProviderAdapter(catalog, credentialBroker, mockTransport);

  return {
    catalog,
    credentialBroker,
    routingPolicy,
    gateway,
    airroofersAdapter,
    capturedEgressRequests,
  };
}

test('COR-AI-002.1: Valid runtime region passed explicitly is respected dynamically without mutation', async () => {
  const { gateway, routingPolicy, capturedEgressRequests } = createHarness();

  const testRegions = ['eu-west-3', 'eu-central-1'];

  for (const targetRegion of testRegions) {
    const req = makeBaseRequest({
      requestId: `req-explicit-region-${targetRegion}`,
      region: targetRegion,
    });

    const decision = routingPolicy.evaluate(req);
    assert.strictEqual(decision.primaryModel.alias, 'sovereign-eu-chat');
    assert.ok(decision.primaryModel.allowedRegions.includes(targetRegion));

    capturedEgressRequests.length = 0;
    const result = await gateway.invoke(req);

    assert.strictEqual(result.modelAlias, 'sovereign-eu-chat');
    assert.strictEqual(result.fallbackUsed, false);

    assert.strictEqual(capturedEgressRequests.length, 1);
    const sentBody = JSON.parse(capturedEgressRequests[0].body);
    assert.strictEqual(sentBody.context.region, targetRegion, `Context region must match explicit input ${targetRegion}`);

    const auditEvents = gateway.getAuditEvents(10);
    const lastAudit = auditEvents.find((e) => e.requestId === req.requestId);
    assert.ok(lastAudit, 'Audit record must be logged');
    assert.strictEqual(lastAudit.region, targetRegion, 'Audited region must match explicitly passed region');
  }
});

test('COR-AI-002.2: Missing region fails closed with REGION_REQUIRED_OR_AMBIGUOUS and prompt examples', async () => {
  const { gateway, routingPolicy, airroofersAdapter } = createHarness();

  const missingRegionValues = [undefined, null, '', '   '];

  for (const blankRegion of missingRegionValues) {
    const req = makeBaseRequest({ region: blankRegion });

    assert.throws(
      () => routingPolicy.evaluate(req),
      (err) => {
        assert.ok(err instanceof AiGatewayError, 'Must be instance of AiGatewayError');
        assert.ok(
          err.errorCode === 'REGION_REQUIRED_OR_AMBIGUOUS' || err.errorCode === 'UNSUPPORTED_OR_MISSING_REGION',
          `Expected REGION_REQUIRED_OR_AMBIGUOUS or UNSUPPORTED_OR_MISSING_REGION, got ${err.errorCode}`
        );
        assert.strictEqual(err.statusCode, 400);
        assert.ok(Array.isArray(err.details?.examples) && err.details.examples.length >= 3);
        assert.ok(err.details.examples.includes('eu-west-3'));
        assert.ok(err.details.examples.includes('af-south-1'));
        assert.ok(err.details.prompt && err.details.prompt.includes('Provide an explicit target region'));
        return true;
      }
    );

    await assert.rejects(
      async () => gateway.invoke(req),
      (err) => {
        assert.ok(err instanceof AiGatewayError);
        assert.ok(
          err.errorCode === 'REGION_REQUIRED_OR_AMBIGUOUS' || err.errorCode === 'UNSUPPORTED_OR_MISSING_REGION'
        );
        assert.strictEqual(err.statusCode, 400);
        return true;
      }
    );

    await assert.rejects(
      async () => airroofersAdapter.invoke(req),
      (err) => {
        assert.ok(err instanceof AiGatewayError);
        assert.ok(
          err.errorCode === 'REGION_REQUIRED_OR_AMBIGUOUS' || err.errorCode === 'UNSUPPORTED_OR_MISSING_REGION'
        );
        assert.strictEqual(err.statusCode, 400);
        return true;
      }
    );
  }
});

test('COR-AI-002.3: Ambiguous region fails closed with REGION_REQUIRED_OR_AMBIGUOUS without silent Paris fallback', async () => {
  const { gateway, routingPolicy, airroofersAdapter } = createHarness();

  const ambiguousRegions = ['ambiguous', 'auto', 'recommend', 'prompt', 'unknown', '*', 'any', 'default', 'all'];

  for (const amb of ambiguousRegions) {
    const req = makeBaseRequest({ region: amb });

    assert.throws(
      () => routingPolicy.evaluate(req),
      (err) => {
        assert.ok(err instanceof AiGatewayError);
        assert.ok(
          err.errorCode === 'REGION_REQUIRED_OR_AMBIGUOUS' || err.errorCode === 'UNSUPPORTED_OR_MISSING_REGION',
          `Expected REGION_REQUIRED_OR_AMBIGUOUS for ambiguous region "${amb}", got ${err.errorCode}`
        );
        assert.strictEqual(err.statusCode, 400);
        assert.strictEqual(err.details?.providedRegion, amb);
        assert.ok(Array.isArray(err.details?.examples));
        return true;
      }
    );

    await assert.rejects(
      async () => gateway.invoke(req),
      (err) => {
        assert.ok(err instanceof AiGatewayError);
        assert.ok(
          err.errorCode === 'REGION_REQUIRED_OR_AMBIGUOUS' || err.errorCode === 'UNSUPPORTED_OR_MISSING_REGION'
        );
        assert.strictEqual(err.statusCode, 400);
        return true;
      }
    );

    await assert.rejects(
      async () => airroofersAdapter.invoke(req),
      (err) => {
        assert.ok(err instanceof AiGatewayError);
        assert.ok(
          err.errorCode === 'REGION_REQUIRED_OR_AMBIGUOUS' || err.errorCode === 'UNSUPPORTED_OR_MISSING_REGION'
        );
        assert.strictEqual(err.statusCode, 400);
        return true;
      }
    );
  }
});

test('COR-AI-002.4: Disallowed or unsupported region fails closed without silent region alteration', async () => {
  const { gateway, routingPolicy } = createHarness();

  const req = makeBaseRequest({ region: 'us-west-2' });

  assert.throws(
    () => routingPolicy.evaluate(req),
    (err) => {
      assert.ok(err instanceof AiGatewayError);
      assert.ok(err.errorCode === 'REGION_DISALLOWED' || err.errorCode === 'UNSUPPORTED_OR_MISSING_REGION');
      assert.strictEqual(err.statusCode, 403);
      assert.strictEqual(err.details?.region, 'us-west-2');
      return true;
    }
  );

  await assert.rejects(
    async () => gateway.invoke(req),
    (err) => {
      assert.ok(err instanceof AiGatewayError);
      assert.ok(err.errorCode === 'REGION_DISALLOWED' || err.errorCode === 'UNSUPPORTED_OR_MISSING_REGION');
      assert.strictEqual(err.statusCode, 403);
      return true;
    }
  );
});

test('COR-AI-002.5: Missing model fails closed with MODEL_NOT_FOUND without silent substitution', async () => {
  const { gateway, routingPolicy, airroofersAdapter } = createHarness();

  const invalidModelValues = [undefined, null, '', '   ', 'non-existent-model-alias', 'general-chat-unregistered'];

  for (const badModel of invalidModelValues) {
    const req = makeBaseRequest({ modelAlias: badModel });

    assert.throws(
      () => routingPolicy.evaluate(req),
      (err) => {
        assert.ok(err instanceof AiGatewayError);
        assert.strictEqual(err.errorCode, 'MODEL_NOT_FOUND', `Expected MODEL_NOT_FOUND for ${badModel}`);
        assert.strictEqual(err.statusCode, 404);
        return true;
      }
    );

    await assert.rejects(
      async () => gateway.invoke(req),
      (err) => {
        assert.ok(err instanceof AiGatewayError);
        assert.strictEqual(err.errorCode, 'MODEL_NOT_FOUND');
        assert.strictEqual(err.statusCode, 404);
        return true;
      }
    );

    await assert.rejects(
      async () => airroofersAdapter.invoke(req),
      (err) => {
        assert.ok(err instanceof AiGatewayError);
        assert.strictEqual(err.errorCode, 'MODEL_NOT_FOUND');
        assert.strictEqual(err.statusCode, 404);
        return true;
      }
    );
  }
});

test('COR-AI-002.6: Base URL defaults to https://ai.airroofers.eu and dynamically respects UGONDU_AIRROOFERS_AI_BASE_URL', () => {
  const catalog = new ModelCatalog();
  const broker = new CredentialBroker();
  const adapter = new AirRoofersAiProviderAdapter(catalog, broker);

  const prevEnv = process.env.UGONDU_AIRROOFERS_AI_BASE_URL;
  try {
    delete process.env.UGONDU_AIRROOFERS_AI_BASE_URL;
    const defaultUrl = adapter.getBaseUrl();
    assert.strictEqual(defaultUrl, 'https://ai.airroofers.eu', 'Must default to https://ai.airroofers.eu');

    process.env.UGONDU_AIRROOFERS_AI_BASE_URL = 'https://ai-staging.airroofers.eu';
    const overriddenUrl = adapter.getBaseUrl();
    assert.strictEqual(overriddenUrl, 'https://ai-staging.airroofers.eu', 'Must respect env override');

    process.env.UGONDU_AIRROOFERS_AI_BASE_URL = 'https://ai.airroofers.de';
    assert.strictEqual(adapter.getBaseUrl(), 'https://ai.airroofers.de');

    process.env.UGONDU_AIRROOFERS_AI_BASE_URL = 'http://insecure.airroofers.eu';
    assert.throws(() => adapter.getBaseUrl(), (err) => err.errorCode === 'AIRROOFERS_AI_ENDPOINT_INSECURE');

    process.env.UGONDU_AIRROOFERS_AI_BASE_URL = 'https://malicious-external-host.com';
    assert.throws(() => adapter.getBaseUrl(), (err) => err.errorCode === 'AIRROOFERS_AI_ENDPOINT_DISALLOWED');
  } finally {
    if (prevEnv !== undefined) {
      process.env.UGONDU_AIRROOFERS_AI_BASE_URL = prevEnv;
    } else {
      delete process.env.UGONDU_AIRROOFERS_AI_BASE_URL;
    }
  }
});
