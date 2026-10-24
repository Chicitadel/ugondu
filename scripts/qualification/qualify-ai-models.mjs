/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Scripts / Qualification — AI Model Qualification Runner
 * File           : qualify-ai-models.mjs
 * Version        : 2.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-24
 * Last Modified  : 2026-10-24
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
 * - ISO 27001 / SOC 2 / OWASP ASVS / NIST
 *
 * Notice:
 * Deterministic model qualification runner for sovereign AI endpoints and catalog.
 * Manages model lifecycle transitions, schema validation, policy conformance,
 * capability probing, authentic live test inference, and verifiable evidence receipts.
 * Synthetic inference and offline active transitions are strictly prohibited.
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const SERVICE_KEY_FORMAT_REGEX = /^air_prod_[0-9a-f]{48}$/;
const ALLOWED_HOSTS = ['ai.airroofers.eu', 'ai-staging.airroofers.eu', 'ai.airroofers.de', 'ai.airroofers.fr'];
const EVIDENCE_REPORT_RELATIVE_PATH = path.join('docs', 'security', 'evidence', 'ai_model_qualification_report.json');

export const ModelLifecycleState = Object.freeze({
  DISCOVERED: 'DISCOVERED',
  SCHEMA_VALIDATED: 'SCHEMA_VALIDATED',
  POLICY_CHECKED: 'POLICY_CHECKED',
  CAPABILITY_PROBED: 'CAPABILITY_PROBED',
  INFERENCE_VERIFIED: 'INFERENCE_VERIFIED',
  QUALIFIED: 'QUALIFIED',
  ACTIVE: 'ACTIVE',
  DISABLED: 'DISABLED',
});

const TRANSITION_ORDER = [
  ModelLifecycleState.DISCOVERED,
  ModelLifecycleState.SCHEMA_VALIDATED,
  ModelLifecycleState.POLICY_CHECKED,
  ModelLifecycleState.CAPABILITY_PROBED,
  ModelLifecycleState.INFERENCE_VERIFIED,
  ModelLifecycleState.QUALIFIED,
  ModelLifecycleState.ACTIVE,
];

export function redactSecrets(val) {
  if (typeof val === 'string') {
    return val
      .replace(/air_prod_[0-9a-f]{48}/gi, '[REDACTED_SECRET]')
      .replace(/sk-[A-Za-z0-9_-]{12,}/g, '[REDACTED_SECRET]')
      .replace(/Bearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, 'Bearer [REDACTED_SECRET]')
      .replace(/\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g, '[REDACTED_SECRET]');
  }
  if (val && typeof val === 'object') {
    if (Array.isArray(val)) return val.map((x) => redactSecrets(x));
    const out = {};
    for (const [k, v] of Object.entries(val)) out[k] = redactSecrets(v);
    return out;
  }
  return val;
}

export class QualificationGatewayError extends Error {
  constructor(errorCode, message, statusCode = 500, details = null) {
    super(redactSecrets(message));
    this.name = 'AiGatewayError';
    this.errorCode = errorCode;
    this.statusCode = statusCode;
    this.details = details ? redactSecrets(details) : null;
  }
}

export function resolveGitCommitSha(repoRoot = ROOT) {
  try {
    const sha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();
    if (/^[0-9a-f]{40}$/i.test(sha)) return sha;
  } catch {
    // Git binary not available or containerized context
  }
  return process.env.GIT_COMMIT_SHA || process.env.GITHUB_SHA || 'UNKNOWN_GIT_SHA';
}

export class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold ?? 3;
    this.cooldownMs = options.cooldownMs ?? 30000;
    this.state = 'CLOSED';
    this.consecutiveFailures = 0;
    this.openedAt = null;
  }
  recordSuccess() { this.consecutiveFailures = 0; this.state = 'CLOSED'; this.openedAt = null; }
  recordFailure() {
    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.openedAt = Date.now();
    }
    return this.state;
  }
  isOpen() {
    if (this.state === 'OPEN') {
      if (this.openedAt && Date.now() - this.openedAt >= this.cooldownMs) {
        this.state = 'HALF_OPEN';
        return false;
      }
      return true;
    }
    return false;
  }
  reset() { this.consecutiveFailures = 0; this.state = 'CLOSED'; this.openedAt = null; }
}

export class ModelLifecycle {
  constructor(model, options = {}) {
    if (!model || typeof model !== 'object') throw new QualificationGatewayError('INVALID_REQUEST', 'Model payload must be an object', 400);
    this.model = { ...model };
    this.alias = model.alias || model.id || 'unassigned-model';
    this.providerId = model.providerId || 'airroofers-ai';
    this.state = ModelLifecycleState.DISCOVERED;
    this.history = [{ from: null, to: ModelLifecycleState.DISCOVERED, timestamp: new Date().toISOString(), reason: 'Discovered' }];
    this.circuitBreaker = new CircuitBreaker(options.circuitBreakerOptions);
    this.receipt = null;
    this.gitSha = options.gitSha || resolveGitCommitSha();
    this.inferenceDigestSha256 = null;
    this.lastInferenceMetadata = null;
  }

  transitionTo(nextState, reason = '') {
    if (nextState === ModelLifecycleState.DISABLED) {
      const prev = this.state;
      this.state = ModelLifecycleState.DISABLED;
      this.history.push({ from: prev, to: ModelLifecycleState.DISABLED, timestamp: new Date().toISOString(), reason });
      return;
    }
    const curIdx = TRANSITION_ORDER.indexOf(this.state);
    const nxtIdx = TRANSITION_ORDER.indexOf(nextState);
    if (curIdx === -1 || nxtIdx === -1 || nxtIdx !== curIdx + 1) {
      throw new QualificationGatewayError('INVALID_STATE_TRANSITION', `Illegal transition '${this.state}' -> '${nextState}'`, 400, { current: this.state, requested: nextState });
    }
    const prev = this.state;
    this.state = nextState;
    this.history.push({ from: prev, to: nextState, timestamp: new Date().toISOString(), reason });
  }

  canRoute() { return this.state === ModelLifecycleState.ACTIVE; }

  assertRoutable() {
    if (this.state !== ModelLifecycleState.ACTIVE) {
      throw new QualificationGatewayError('MODEL_DISABLED', `Model '${this.alias}' is in state '${this.state}', cannot route until ACTIVE`, 403, { modelAlias: this.alias, state: this.state });
    }
    return true;
  }

  validateSchema() {
    if (this.state !== ModelLifecycleState.DISCOVERED) throw new QualificationGatewayError('INVALID_STATE_TRANSITION', `Schema validation requires DISCOVERED, got ${this.state}`, 400);
    const id = this.model.alias || this.model.id;
    if (!id || typeof id !== 'string' || !id.trim()) {
      this.transitionTo(ModelLifecycleState.DISABLED, 'Schema invalid: missing alias or id');
      throw new QualificationGatewayError('CATALOG_INVALID', 'Model missing non-empty identifier alias or id', 400);
    }
    if (!this.model.providerId && !this.model.provider) {
      this.transitionTo(ModelLifecycleState.DISABLED, 'Schema invalid: missing provider');
      throw new QualificationGatewayError('CATALOG_INVALID', 'Model missing provider binding', 400);
    }
    this.transitionTo(ModelLifecycleState.SCHEMA_VALIDATED, 'Schema structural criteria validated');
    return this;
  }

  checkPolicy(options = {}) {
    if (this.state !== ModelLifecycleState.SCHEMA_VALIDATED) throw new QualificationGatewayError('INVALID_STATE_TRANSITION', `Policy check requires SCHEMA_VALIDATED, got ${this.state}`, 400);
    const broker = options.credentialBroker;
    const credentialRef = this.model.credentialRef || options.credentialRef;
    if (broker && credentialRef) {
      try { broker.resolveHandle(credentialRef); } catch (err) {
        this.transitionTo(ModelLifecycleState.DISABLED, `Policy check failed: ${err.errorCode || err.message}`);
        throw err;
      }
    } else if (options.secret !== undefined || options.requireCredentials) {
      const secret = options.secret ?? process.env.UGONDU_AIRROOFERS_AI_KEY;
      if (!secret || typeof secret !== 'string' || !secret.trim()) {
        this.transitionTo(ModelLifecycleState.DISABLED, 'Credentials missing for model policy');
        throw new QualificationGatewayError('CREDENTIALS_MISSING', 'Workload credentials missing or empty', 503);
      }
      if (options.expiresAt && Date.now() >= new Date(options.expiresAt).getTime()) {
        this.transitionTo(ModelLifecycleState.DISABLED, 'Credentials expired for model policy');
        throw new QualificationGatewayError('CREDENTIALS_EXPIRED', 'Configured credentials have expired', 503, { expiresAt: options.expiresAt });
      }
      if (!SERVICE_KEY_FORMAT_REGEX.test(secret.trim())) {
        this.transitionTo(ModelLifecycleState.DISABLED, 'Credential format violation');
        throw new QualificationGatewayError('CREDENTIALS_INVALID', 'Invalid credential format for provider', 400);
      }
    }
    this.transitionTo(ModelLifecycleState.POLICY_CHECKED, 'Governance and credential policies verified');
    return this;
  }

  async probeCapability(probeFn) {
    if (this.state !== ModelLifecycleState.POLICY_CHECKED) throw new QualificationGatewayError('INVALID_STATE_TRANSITION', `Capability probe requires POLICY_CHECKED, got ${this.state}`, 400);
    try {
      if (typeof probeFn === 'function') {
        const probeResult = await probeFn(this.model);
        if (probeResult === false || (probeResult && probeResult.ok === false)) {
          const reason = probeResult?.reason || 'Capability probe reported unsupported status';
          this.transitionTo(ModelLifecycleState.DISABLED, reason);
          throw new QualificationGatewayError('CAPABILITY_UNSUPPORTED', reason, 400);
        }
      }
      this.transitionTo(ModelLifecycleState.CAPABILITY_PROBED, 'Capabilities probed and verified');
      return this;
    } catch (err) {
      if (this.state !== ModelLifecycleState.DISABLED) this.transitionTo(ModelLifecycleState.DISABLED, `Capability probe exception: ${err.message}`);
      throw err;
    }
  }

  async verifyInference(executeFn, options = {}) {
    if (this.state !== ModelLifecycleState.CAPABILITY_PROBED) throw new QualificationGatewayError('INVALID_STATE_TRANSITION', `Inference verification requires CAPABILITY_PROBED, got ${this.state}`, 400);
    if (typeof executeFn !== 'function') throw new QualificationGatewayError('EXECUTION_FUNCTION_REQUIRED', 'Inference verification requires an executable provider probe function', 400);
    if (this.circuitBreaker.isOpen()) throw new QualificationGatewayError('CIRCUIT_OPEN', 'Circuit breaker is OPEN; inference rejected', 503, { consecutiveFailures: this.circuitBreaker.consecutiveFailures });

    const maxRetries = options.maxRetries ?? 2;
    const initialBackoffMs = options.initialBackoffMs ?? 20;
    let attempt = 0;
    let lastError = null;

    while (attempt <= maxRetries) {
      try {
        const result = await executeFn(this.model);
        this.circuitBreaker.recordSuccess();
        const rawOutput = typeof result === 'string' ? result : JSON.stringify(result?.output ?? result?.completion ?? result?.result ?? result?.text ?? result);
        if (!rawOutput || rawOutput === '""' || rawOutput === '{}') throw new QualificationGatewayError('INFERENCE_OUTPUT_EMPTY', 'Provider inference returned empty output', 502);
        this.inferenceDigestSha256 = crypto.createHash('sha256').update(rawOutput).digest('hex');
        this.lastInferenceMetadata = { latencyMs: result?.latencyMs, correlationId: result?.correlationId };
        this.transitionTo(ModelLifecycleState.INFERENCE_VERIFIED, 'Authentic live test inference verified');
        return this;
      } catch (err) {
        lastError = err;
        const is429 = err?.statusCode === 429 || err?.errorCode === 'PROVIDER_RATE_LIMITED' || /429|rate limit/i.test(err?.message || '');
        if (is429) {
          this.circuitBreaker.recordFailure();
          if (this.circuitBreaker.isOpen()) throw new QualificationGatewayError('CIRCUIT_OPEN', 'Circuit breaker tripped OPEN on rate limit (429)', 503, { consecutiveFailures: this.circuitBreaker.consecutiveFailures });
          attempt++;
          if (attempt <= maxRetries) {
            await new Promise((r) => setTimeout(r, initialBackoffMs * Math.pow(2, attempt - 1)));
            continue;
          }
          throw new QualificationGatewayError('PROVIDER_RATE_LIMITED', 'Rate limit (429) exceeded after retry backoff', 429);
        }
        this.circuitBreaker.recordFailure();
        throw err;
      }
    }
    throw lastError;
  }

  qualify(metadata = {}) {
    if (this.state !== ModelLifecycleState.INFERENCE_VERIFIED) throw new QualificationGatewayError('INVALID_STATE_TRANSITION', `Qualification requires INFERENCE_VERIFIED, got ${this.state}`, 400);
    const digest = metadata.inferenceDigestSha256 || this.inferenceDigestSha256;
    if (!digest) throw new QualificationGatewayError('INFERENCE_DIGEST_REQUIRED', 'Model qualification requires verified live inference digest', 400);
    this.receipt = redactSecrets({
      receiptType: 'AI_MODEL_QUALIFICATION_RECEIPT',
      version: '1.0.0',
      modelAlias: this.alias,
      providerId: this.providerId,
      timestamp: new Date().toISOString(),
      gitSha: this.gitSha,
      status: 'QUALIFIED',
      liveExecution: metadata.liveExecution !== undefined ? Boolean(metadata.liveExecution) : true,
      latencyMs: metadata.latencyMs ?? this.lastInferenceMetadata?.latencyMs,
      correlationId: metadata.correlationId ?? this.lastInferenceMetadata?.correlationId,
      capabilities: this.model.capabilities || { modalities: ['text'], streaming: false, toolCalling: true },
      inferenceDigestSha256: digest,
      verification: 'AUTHENTIC_LIVE_INFERENCE_QUALIFIED',
      ...metadata,
    });
    this.transitionTo(ModelLifecycleState.QUALIFIED, 'Qualification receipt signed');
    return this;
  }

  recordOfflineReceipt(metadata = {}) {
    this.receipt = redactSecrets({
      receiptType: 'AI_MODEL_QUALIFICATION_RECEIPT',
      version: '1.0.0',
      modelAlias: this.alias,
      providerId: this.providerId,
      timestamp: new Date().toISOString(),
      gitSha: this.gitSha,
      status: 'UNQUALIFIED',
      liveExecution: false,
      capabilities: this.model.capabilities || { modalities: ['text'], streaming: false, toolCalling: true },
      verification: 'CATALOG_OFFLINE_PROHIBITED_FROM_ACTIVATION',
      reason: 'Offline catalog inspection only; live execution prohibited',
      ...metadata,
    });
    return this.receipt;
  }

  activate() {
    if (this.state !== ModelLifecycleState.QUALIFIED) throw new QualificationGatewayError('INVALID_STATE_TRANSITION', `Activation requires QUALIFIED, got ${this.state}`, 400);
    if (!this.receipt || !this.receipt.liveExecution) {
      throw new QualificationGatewayError('LIVE_EXECUTION_REQUIRED', 'Model activation requires verified live execution receipt', 403);
    }
    this.transitionTo(ModelLifecycleState.ACTIVE, 'Activated for live routing');
    return this;
  }

  getReceipt() { return redactSecrets(this.receipt); }

  getDiagnostics() {
    return redactSecrets({
      alias: this.alias,
      providerId: this.providerId,
      state: this.state,
      canRoute: this.canRoute(),
      circuitBreaker: {
        state: this.circuitBreaker.state,
        consecutiveFailures: this.circuitBreaker.consecutiveFailures,
        openedAt: this.circuitBreaker.openedAt,
      },
      history: this.history,
      receipt: this.receipt,
    });
  }

  async runFullLifecycle(options = {}) {
    this.validateSchema();
    this.checkPolicy(options);
    await this.probeCapability(options.probeFn);
    await this.verifyInference(options.executeFn || options.executeProbe, options);
    this.qualify(options.receiptMetadata);
    this.activate();
    return this.getReceipt();
  }
}

export async function runModelQualification(options = {}) {
  const rootDir = options.rootDir || ROOT;
  const gitSha = options.gitSha || resolveGitCommitSha(rootDir);
  const liveKey = options.secret || process.env.UGONDU_AIRROOFERS_AI_KEY;
  const liveBaseUrl = options.baseUrl || process.env.UGONDU_AIRROOFERS_AI_BASE_URL;
  const isLiveConfigured = Boolean((liveKey && liveBaseUrl && !options.offline) || options.mode === 'LIVE_SOVEREIGN');
  const qualificationMode = isLiveConfigured ? 'LIVE_SOVEREIGN' : 'CATALOG_OFFLINE';
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction && qualificationMode !== 'LIVE_SOVEREIGN') {
    throw new QualificationGatewayError('LIVE_QUALIFICATION_REQUIRED', 'LIVE_QUALIFICATION_REQUIRED: Production certification requires live provider discovery and inference', 503);
  }

  let discoveredModels = [];
  if (qualificationMode === 'LIVE_SOVEREIGN') {
    if (options.discoveredModels && Array.isArray(options.discoveredModels)) {
      discoveredModels = options.discoveredModels;
    } else {
      const endpoint = new URL((liveBaseUrl || 'https://ai.airroofers.eu').trim());
      if (endpoint.protocol !== 'https:' || !ALLOWED_HOSTS.includes(endpoint.hostname)) {
        throw new QualificationGatewayError('AIRROOFERS_AI_ENDPOINT_DISALLOWED', `Disallowed host: ${endpoint.hostname}`, 403);
      }
      if (!SERVICE_KEY_FORMAT_REGEX.test(liveKey?.trim() || '')) {
        throw new QualificationGatewayError('CREDENTIALS_INVALID', 'Invalid credential format for provider', 400);
      }
      const res = await fetch(new URL('/v1/ai/models', endpoint), {
        headers: { accept: 'application/json', authorization: `Bearer ${liveKey.trim()}`, 'x-correlation-id': `corr-qual-models-${crypto.randomUUID()}` },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) throw new QualificationGatewayError('UPSTREAM_UNAVAILABLE', `Live model discovery failed: ${res.status}`, res.status);
      const data = await res.json();
      const list = Array.isArray(data?.models) ? data.models : Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      discoveredModels = list.map((m) => (typeof m === 'string' ? { id: m, alias: m, providerId: 'airroofers-ai' } : { ...m, providerId: 'airroofers-ai' }));
    }
  } else {
    const catalogPath = path.resolve(rootDir, 'config', 'model-catalog.json');
    if (fs.existsSync(catalogPath)) {
      const catalogDoc = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
      discoveredModels = (catalogDoc.models || []).map((m) => ({ ...m }));
    } else {
      if (isProduction) throw new QualificationGatewayError('CATALOG_MISSING', 'Production requires valid model catalog', 500);
      discoveredModels = [{ alias: 'airroofers-sentinel-v1', providerId: 'airroofers-ai', capabilities: { modalities: ['text'], streaming: false, toolCalling: true } }];
    }
  }

  const modelDiagnostics = [];
  const receipts = [];

  for (const rawModel of discoveredModels) {
    const lifecycle = new ModelLifecycle(rawModel, { gitSha });
    if (qualificationMode === 'CATALOG_OFFLINE') {
      try { lifecycle.validateSchema(); } catch {}
      if (lifecycle.state !== ModelLifecycleState.DISABLED) {
        lifecycle.transitionTo(ModelLifecycleState.DISABLED, 'Catalog offline mode: live qualification prohibited');
      }
      const receipt = lifecycle.recordOfflineReceipt();
      modelDiagnostics.push(lifecycle.getDiagnostics());
      receipts.push(receipt);
    } else {
      try {
        lifecycle.validateSchema();
        lifecycle.checkPolicy({ secret: liveKey, requireCredentials: true });
        await lifecycle.probeCapability(options.probeFn || (async () => ({ ok: true })));

        const executeProbe = options.executeProbe || (async (model) => {
          const endpoint = new URL((liveBaseUrl || 'https://ai.airroofers.eu').trim());
          const modelId = model.id || model.alias;
          const correlationId = `corr-qual-exec-${crypto.randomUUID()}`;
          const startMs = Date.now();
          const res = await fetch(new URL('/v1/ai/execute', endpoint), {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              accept: 'application/json',
              authorization: `Bearer ${liveKey.trim()}`,
              'x-correlation-id': correlationId,
              'x-request-id': `req-qual-${crypto.randomUUID()}`,
              'x-tenant-id': 'tenant_ugondu',
            },
            body: JSON.stringify({
              model_id: modelId,
              payload: { messages: [{ role: 'user', content: 'Ping live qualification probe' }], max_tokens: 16, task: 'chat' },
              context: { tenant_id: 'tenant_ugondu', product_id: 'ugondu', environment: 'production', region: 'eu-west-3', correlation_id: correlationId, data_classification: 'public' },
            }),
            signal: AbortSignal.timeout(10000),
          });
          const latencyMs = Math.max(1, Date.now() - startMs);
          if (res.status !== 200) throw new QualificationGatewayError(res.status === 429 ? 'PROVIDER_RATE_LIMITED' : 'UPSTREAM_UNAVAILABLE', `Live inference failed: HTTP ${res.status}`, res.status);
          const data = await res.json();
          const output = data?.output ?? data?.completion ?? data?.result ?? data?.text;
          if (!output) throw new QualificationGatewayError('MALFORMED_OUTPUT', 'Provider response missing completion output', 502);
          return { output, latencyMs, correlationId, modelId };
        });

        await lifecycle.verifyInference(executeProbe);
        lifecycle.qualify({ liveExecution: true });
        lifecycle.activate();
        modelDiagnostics.push(lifecycle.getDiagnostics());
        receipts.push(lifecycle.getReceipt());
      } catch (err) {
        if (lifecycle.state !== ModelLifecycleState.DISABLED) {
          try { lifecycle.transitionTo(ModelLifecycleState.DISABLED, err.message); } catch {}
        }
        modelDiagnostics.push({ ...lifecycle.getDiagnostics(), failureReason: redactSecrets(err.message) });
      }
    }
  }

  const report = redactSecrets({
    reportType: 'AI_MODEL_QUALIFICATION_REPORT',
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    gitSha,
    qualificationMode,
    summary: {
      totalDiscovered: discoveredModels.length,
      qualifiedCount: receipts.filter((r) => r.status === 'QUALIFIED' && r.liveExecution === true).length,
      activeCount: modelDiagnostics.filter((m) => m.state === ModelLifecycleState.ACTIVE).length,
      disabledCount: modelDiagnostics.filter((m) => m.state === ModelLifecycleState.DISABLED).length,
    },
    receipts,
    diagnostics: modelDiagnostics,
  });

  const reportFullPath = path.resolve(rootDir, EVIDENCE_REPORT_RELATIVE_PATH);
  fs.mkdirSync(path.dirname(reportFullPath), { recursive: true });
  fs.writeFileSync(reportFullPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
  return report;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  runModelQualification()
    .then((report) => console.log(JSON.stringify({ result: 'QUALIFICATION_COMPLETE', summary: report.summary, gitSha: report.gitSha })))
    .catch((err) => {
      console.error(JSON.stringify({ result: 'QUALIFICATION_FAILED', error: redactSecrets(err.message) }));
      process.exit(1);
    });
}
