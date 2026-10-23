/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Qualification — Air Roofers AI Live Canary Runner
 * File           : airroofers-ai-live-canary.mjs
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
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS
 * - NIST
 *
 * Notice:
 * Authenticated live inference canary runner executing against sovereign AI endpoints.
 * Requires genuine service-issued production credential via UGONDU_AIRROOFERS_AI_KEY.
 * Never executes mock transports or test doubles in this path.
 *
 * Copyright (c) 2026 Air Roofers SASU
 * All Rights Reserved.
 ******************************************************************************/

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const SERVICE_KEY_FORMAT_REGEX = /^air_prod_[0-9a-f]{48}$/;
const ALLOWED_HOSTS = ['ai.airroofers.eu', 'ai-staging.airroofers.eu'];
const DEFAULT_BASE_URL = 'https://ai.airroofers.eu';
const EVIDENCE_RELATIVE_PATH = path.join('docs', 'security', 'evidence', 'live_ai_canary_receipt.json');

export class LiveCanaryConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'LiveCanaryConfigurationError';
  }
}

export class LiveCanarySecurityError extends Error {
  constructor(message) {
    super(message);
    this.name = 'LiveCanarySecurityError';
  }
}

export class LiveCanaryApiError extends Error {
  constructor(message, statusCode, details = null) {
    super(message);
    this.name = 'LiveCanaryApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class LiveCanaryNetworkError extends Error {
  constructor(message) {
    super(message);
    this.name = 'LiveCanaryNetworkError';
  }
}

function resolveGitCommitSha(repoRoot) {
  try {
    const sha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();
    if (/^[0-9a-f]{40}$/i.test(sha)) return sha;
  } catch {
    // Git binary not available or detached container context
  }
  return process.env.GIT_COMMIT_SHA || process.env.GITHUB_SHA || 'UNKNOWN_GIT_SHA';
}

function redactSecrets(text) {
  if (typeof text !== 'string') return '';
  return text.replace(/air_prod_[0-9a-f]{48}/gi, '[REDACTED_SECRET]');
}

export async function runLiveCanary() {
  const apiKey = process.env.UGONDU_AIRROOFERS_AI_KEY;
  if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
    throw new LiveCanaryConfigurationError(
      'Live canary requires explicitly configured service-issued credential via UGONDU_AIRROOFERS_AI_KEY'
    );
  }

  const trimmedKey = apiKey.trim();
  if (!SERVICE_KEY_FORMAT_REGEX.test(trimmedKey)) {
    throw new LiveCanarySecurityError(
      'Credential format violation: UGONDU_AIRROOFERS_AI_KEY must match pattern /^air_prod_[0-9a-f]{48}$/'
    );
  }

  const rawBaseUrl = process.env.UGONDU_AIRROOFERS_AI_BASE_URL || DEFAULT_BASE_URL;
  let endpoint;
  try {
    endpoint = new URL(rawBaseUrl);
  } catch {
    throw new LiveCanaryConfigurationError(
      `Live canary endpoint URL is invalid: ${redactSecrets(rawBaseUrl)}`
    );
  }

  if (endpoint.protocol !== 'https:') {
    throw new LiveCanarySecurityError('Live canary endpoint must use HTTPS');
  }

  if (!ALLOWED_HOSTS.includes(endpoint.hostname)) {
    throw new LiveCanarySecurityError(
      `Live canary endpoint host '${endpoint.hostname}' is not allow-listed (${ALLOWED_HOSTS.join(', ')})`
    );
  }

  const gitSha = resolveGitCommitSha(ROOT);

  async function request(pathName, init = {}) {
    const targetUrl = new URL(pathName, endpoint);
    const startMs = Date.now();
    let response;
    try {
      response = await fetch(targetUrl, {
        ...init,
        redirect: 'error',
        signal: AbortSignal.timeout(10_000),
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${trimmedKey}`,
          'content-type': 'application/json',
          ...init.headers,
        },
      });
    } catch (err) {
      if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
        throw new LiveCanaryNetworkError(`Request timed out after 10000ms: ${pathName}`);
      }
      throw new LiveCanaryNetworkError(`Network transport failed for ${pathName}: ${err?.message || 'unknown'}`);
    }

    const latencyMs = Math.max(1, Date.now() - startMs);
    const contentType = response.headers.get('content-type') || '';
    if (!/application\/json/i.test(contentType)) {
      throw new LiveCanaryApiError(
        `AI API response must be JSON, got '${contentType}'`,
        response.status
      );
    }

    let body;
    try {
      body = await response.json();
    } catch (err) {
      throw new LiveCanaryApiError(
        `Failed to parse response body as JSON: ${err.message}`,
        response.status
      );
    }

    return {
      status: response.status,
      body,
      latencyMs,
      correlationId: response.headers.get('x-correlation-id') || null,
    };
  }

  // 1. Authenticated Model Discovery
  const discoveryCorrelationId = `corr-canary-models-${crypto.randomUUID()}`;
  const models = await request('/v1/ai/models', {
    method: 'GET',
    headers: {
      'x-correlation-id': discoveryCorrelationId,
    },
  });

  if (models.status !== 200) {
    throw new LiveCanaryApiError(
      `Authenticated model discovery must succeed with HTTP 200, got ${models.status}`,
      models.status
    );
  }

  const modelsList = Array.isArray(models.body?.models)
    ? models.body.models
    : Array.isArray(models.body?.data)
      ? models.body.data
      : Array.isArray(models.body)
        ? models.body
        : [];

  assert.ok(Array.isArray(modelsList), 'service must return a model list');
  assert.ok(modelsList.length > 0, 'no enabled model is available from service discovery');

  const selectedModel = modelsList.find((m) => (typeof m === 'object' && m.id === 'airroofers-sentinel-v1')) || modelsList[0];
  const returnedModelId = typeof selectedModel === 'string' ? selectedModel : selectedModel?.id;
  assert.ok(returnedModelId, 'Selected live model ID must be non-empty');

  // 2. Minimal Non-sensitive Test Inference Execution
  const executionCorrelationId = `corr-canary-exec-${crypto.randomUUID()}`;
  const executionRequestId = `req-canary-${crypto.randomUUID()}`;

  const minimalPayload = {
    model_id: returnedModelId,
    payload: {
      messages: [
        { role: 'user', content: 'Ping live canary execution' },
      ],
      max_tokens: 16,
      task: 'chat',
    },
    context: {
      tenant_id: 'tenant_ugondu',
      product_id: 'ugondu',
      environment: 'production',
      region: 'eu-west-3',
      correlation_id: executionCorrelationId,
      data_classification: 'public',
    },
  };

  const execution = await request('/v1/ai/execute', {
    method: 'POST',
    headers: {
      'x-correlation-id': executionCorrelationId,
      'x-request-id': executionRequestId,
      'x-tenant-id': 'tenant_ugondu',
    },
    body: JSON.stringify(minimalPayload),
  });

  if (execution.status !== 200) {
    throw new LiveCanaryApiError(
      `Authenticated AI execution must succeed with HTTP 200, got ${execution.status}`,
      execution.status,
      execution.body
    );
  }

  const completion =
    execution.body?.output ??
    execution.body?.completion ??
    execution.body?.result ??
    execution.body?.text;

  assert.ok(completion, 'service must return a non-empty completion');

  const completionString = typeof completion === 'string' ? completion : JSON.stringify(completion);
  const outputDigestSha256 = crypto.createHash('sha256').update(completionString).digest('hex');

  // 3. Emit Sanitized Redacted Evidence Receipt
  const receipt = {
    receiptType: 'AIRROOFERS_LIVE_AI_CANARY_RECEIPT',
    version: '1.0.0',
    gitSha,
    endpoint: endpoint.origin,
    hostname: endpoint.hostname,
    timestamp: new Date().toISOString(),
    discoveryStatusCode: models.status,
    executionStatusCode: execution.status,
    returnedModelId,
    availableModelCount: modelsList.length,
    correlationId: executionCorrelationId,
    latencyMs: {
      discovery: models.latencyMs,
      execution: execution.latencyMs,
      total: models.latencyMs + execution.latencyMs,
    },
    outputDigestSha256,
    verification: 'AUTHENTIC_LIVE_INFERENCE_QUALIFIED',
  };

  const evidenceFullPath = path.resolve(ROOT, EVIDENCE_RELATIVE_PATH);
  fs.mkdirSync(path.dirname(evidenceFullPath), { recursive: true });
  fs.writeFileSync(evidenceFullPath, JSON.stringify(receipt, null, 2) + '\n', 'utf8');

  console.log(JSON.stringify({
    result: 'LIVE_CANARY_PASS',
    host: endpoint.hostname,
    returnedModelId,
    gitSha,
    evidencePath: EVIDENCE_RELATIVE_PATH,
    timestamp: receipt.timestamp,
  }));

  return receipt;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  runLiveCanary().catch((error) => {
    const errorClass = error?.name || 'Error';
    const message = redactSecrets(String(error?.message || 'Live canary execution failed'));
    console.error(JSON.stringify({
      result: 'LIVE_CANARY_FAIL',
      errorClass,
      message,
      statusCode: error?.statusCode || null,
      details: error?.details || null,
      timestamp: new Date().toISOString(),
    }));
    process.exit(1);
  });
}
