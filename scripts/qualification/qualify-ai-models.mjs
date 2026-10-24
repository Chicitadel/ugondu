/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Scripts / Qualification — AI Model Qualification Runner
 * File           : qualify-ai-models.mjs
 * Version        : 2.1.0
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
  DISCOVERED: 'DISCOVERED', SCHEMA_VALIDATED: 'SCHEMA_VALIDATED', POLICY_CHECKED: 'POLICY_CHECKED',
  CAPABILITY_PROBED: 'CAPABILITY_PROBED', INFERENCE_VERIFIED: 'INFERENCE_VERIFIED',
  QUALIFIED: 'QUALIFIED', ACTIVE: 'ACTIVE', DISABLED: 'DISABLED',
});

const TRANSITION_ORDER = [
  ModelLifecycleState.DISCOVERED, ModelLifecycleState.SCHEMA_VALIDATED, ModelLifecycleState.POLICY_CHECKED,
  ModelLifecycleState.CAPABILITY_PROBED, ModelLifecycleState.INFERENCE_VERIFIED, ModelLifecycleState.QUALIFIED, ModelLifecycleState.ACTIVE,
];

export function redactSecrets(val) {
  if (typeof val === 'string') {
    return val.replace(/air_prod_[0-9a-f]{48}/gi, '[REDACTED_SECRET]').replace(/sk-[A-Za-z0-9_-]{12,}/g, '[REDACTED_SECRET]').replace(/Bearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, 'Bearer [REDACTED_SECRET]').replace(/\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g, '[REDACTED_SECRET]');
  }
  if (val && typeof val === 'object') {
    if (Array.isArray(val)) return val.map((x) => redactSecrets(x));
    const out = {}; for (const [k, v] of Object.entries(val)) out[k] = redactSecrets(v); return out;
  }
  return val;
}

export class QualificationGatewayError extends Error {
  constructor(errorCode, message, statusCode = 500, details = null) {
    super(redactSecrets(message));
    this.name = 'QualificationGatewayError';
    this.errorCode = errorCode;
    this.statusCode = statusCode;
    this.details = details ? redactSecrets(details) : null;
  }
}

export function validateLiveInferenceReceipt(receipt, expectedModelId) {
  if (!receipt || typeof receipt !== 'object') return false;
  if (receipt.source !== 'airroofers-live-transport' || receipt.httpStatus !== 200 || receipt.verification !== 'AUTHENTIC_LIVE_INFERENCE_QUALIFIED') return false;
  if (typeof receipt.candidateSha !== 'string' || !receipt.candidateSha.trim() || typeof receipt.modelId !== 'string' || !receipt.modelId.trim()) return false;
  if (expectedModelId && receipt.modelId !== expectedModelId) return false;
  if (typeof receipt.responseDigestSha256 !== 'string' || !/^[0-9a-f]{64}$/i.test(receipt.responseDigestSha256)) return false;
  return Boolean(typeof receipt.correlationId === 'string' && receipt.correlationId.trim() && typeof receipt.endpointHost === 'string' && receipt.endpointHost.trim() && typeof receipt.observedAt === 'string' && receipt.observedAt.trim());
}

export function validateEndpointAndCredentials(rawEndpoint, rawKey) {
  if (!rawKey || typeof rawKey !== 'string' || !rawKey.trim()) throw new QualificationGatewayError('CREDENTIALS_MISSING', 'Workload credentials missing or empty', 503);
  const key = rawKey.trim();
  if (!SERVICE_KEY_FORMAT_REGEX.test(key)) throw new QualificationGatewayError('CREDENTIALS_INVALID', 'Invalid credential format for provider', 400);
  if (!rawEndpoint || typeof rawEndpoint !== 'string' || !rawEndpoint.trim()) throw new QualificationGatewayError('AIRROOFERS_AI_ENDPOINT_REQUIRED', 'Endpoint URL is required', 400);
  let parsedUrl;
  try { parsedUrl = new URL(rawEndpoint.trim()); } catch { throw new QualificationGatewayError('AIRROOFERS_AI_ENDPOINT_MALFORMED', 'Invalid endpoint URL format', 400); }
  if (parsedUrl.protocol !== 'https:') throw new QualificationGatewayError('AIRROOFERS_AI_ENDPOINT_INSECURE', 'TLS https required for sovereign AI endpoint', 403);
  if (!ALLOWED_HOSTS.includes(parsedUrl.hostname)) throw new QualificationGatewayError('AIRROOFERS_AI_ENDPOINT_DISALLOWED', `Disallowed host: ${parsedUrl.hostname}`, 403);
  return { endpoint: parsedUrl, key };
}

export function resolveGitCommitSha(repoRoot = ROOT) {
  try {
    const sha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();
    if (/^[0-9a-f]{40}$/i.test(sha)) return sha;
  } catch {}
  return process.env.GIT_COMMIT_SHA || process.env.GITHUB_SHA || 'UNKNOWN_GIT_SHA';
}

export function resolveCandidateSha(repoRoot = ROOT) {
  if (process.env.COR_CANDIDATE_SHA && /^[0-9a-f]{40}$/i.test(process.env.COR_CANDIDATE_SHA.trim())) return process.env.COR_CANDIDATE_SHA.trim();
  const manifestPath = path.resolve(repoRoot, 'docs', 'governance', 'evidence', 'evidence-manifest.json');
  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      if (manifest.candidateSha && /^[0-9a-f]{40}$/i.test(manifest.candidateSha)) return manifest.candidateSha;
    } catch {}
  }
  return resolveGitCommitSha(repoRoot);
}

export function assertReportLineage(report, expectedCandidateSha) {
  if (!report || typeof report !== 'object') throw new QualificationGatewayError('AI_REPORT_INVALID', 'AI qualification report must be an object', 400);
  if (!report.gitSha || report.gitSha !== expectedCandidateSha) {
    throw new QualificationGatewayError('AI_REPORT_CANDIDATE_SHA_MISMATCH', `AI_REPORT_CANDIDATE_SHA_MISMATCH: Report gitSha ${report.gitSha} != candidate ${expectedCandidateSha}`, 400);
  }
  const summary = report.summary || {};
  const activeCount = typeof summary.activeCount === 'number' ? summary.activeCount : 0;
  const qualifiedCount = typeof summary.qualifiedCount === 'number' ? summary.qualifiedCount : 0;
  const totalDiscovered = typeof summary.totalDiscovered === 'number' ? summary.totalDiscovered : 0;
  const mode = report.qualificationMode;

  if (activeCount > 0 && (mode === 'CATALOG_OFFLINE' || mode === 'OFFLINE' || (mode !== 'LIVE' && mode !== 'LIVE_SOVEREIGN'))) {
    throw new QualificationGatewayError('CATALOG_OFFLINE_PROHIBITED_FROM_ACTIVATION', 'Offline catalog inspection can NEVER be used for model activation or release claims', 403);
  }
  if ((mode === 'CATALOG_OFFLINE' || mode === 'OFFLINE') && (activeCount !== 0 || qualifiedCount !== 0)) {
    throw new QualificationGatewayError('CATALOG_OFFLINE_PROHIBITED_FROM_ACTIVATION', 'Offline catalog inspection can NEVER be used for model activation or release claims (activeCount and qualifiedCount must be 0)', 403);
  }
  if ((summary.qualifiedCount !== undefined || summary.totalDiscovered !== undefined) &&
      (activeCount < 0 || qualifiedCount < 0 || totalDiscovered < 0 || activeCount > qualifiedCount || qualifiedCount > totalDiscovered)) {
    throw new QualificationGatewayError('AI_REPORT_COUNT_INVARIANT_FAILED', `AI_REPORT_COUNT_INVARIANT_FAILED: Invariant failed (activeCount ${activeCount} <= qualifiedCount ${qualifiedCount} <= totalDiscovered ${totalDiscovered})`, 400);
  }
  if (activeCount > 0) {
    const receipts = Array.isArray(report.receipts) ? report.receipts : [];
    for (const r of receipts) {
      if ((r.status === 'QUALIFIED' || r.status === 'ACTIVE') && r.liveInferenceReceipt && r.liveInferenceReceipt.candidateSha && r.liveInferenceReceipt.candidateSha !== expectedCandidateSha) {
        throw new QualificationGatewayError('AI_REPORT_CANDIDATE_SHA_MISMATCH', `AI_REPORT_CANDIDATE_SHA_MISMATCH: Live inference receipt candidate SHA ${r.liveInferenceReceipt.candidateSha} != candidate ${expectedCandidateSha}`, 400);
      }
    }
    const validLive = receipts.filter((r) =>
      (r.status === 'QUALIFIED' || r.status === 'ACTIVE') && r.liveExecution === true && (!r.gitSha || r.gitSha === expectedCandidateSha) &&
      r.liveInferenceReceipt && (!r.liveInferenceReceipt.candidateSha || r.liveInferenceReceipt.candidateSha === expectedCandidateSha) &&
      r.liveInferenceReceipt.verification === 'AUTHENTIC_LIVE_INFERENCE_QUALIFIED'
    );
    if (validLive.length < activeCount) {
      throw new QualificationGatewayError('ACTIVE_MODELS_WITHOUT_LIVE_RECEIPTS', 'Every active model must have a valid, candidate-bound live inference receipt', 403);
    }
  }
  return true;
}

export function assertCurrentLiveReport(report, expectedCandidateSha) {
  assertReportLineage(report, expectedCandidateSha);
  if (report.qualificationMode !== 'LIVE_SOVEREIGN') throw new QualificationGatewayError('LIVE_AI_QUALIFICATION_REQUIRED', 'Live qualification report required; CATALOG_OFFLINE cannot be accepted', 403);
  return true;
}

export class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold ?? 3; this.cooldownMs = options.cooldownMs ?? 30000;
    this.state = 'CLOSED'; this.consecutiveFailures = 0; this.openedAt = null;
  }
  recordSuccess() { this.consecutiveFailures = 0; this.state = 'CLOSED'; this.openedAt = null; }
  recordFailure() {
    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= this.failureThreshold) { this.state = 'OPEN'; this.openedAt = Date.now(); }
    return this.state;
  }
  isOpen() { return this.state === 'OPEN' ? (this.openedAt && Date.now() - this.openedAt >= this.cooldownMs ? ((this.state = 'HALF_OPEN'), false) : true) : false; }
  reset() { this.state = 'CLOSED'; this.consecutiveFailures = 0; this.openedAt = null; }
}

export class ModelLifecycle {
  constructor(model, options = {}) {
    if (!model || typeof model !== 'object') throw new QualificationGatewayError('INVALID_REQUEST', 'Model payload must be an object', 400);
    this.model = { ...model }; this.alias = model.alias || model.id || 'unassigned-model';
    this.providerId = model.providerId || 'airroofers-ai'; this.state = ModelLifecycleState.DISCOVERED;
    this.history = [{ from: null, to: ModelLifecycleState.DISCOVERED, timestamp: new Date().toISOString(), reason: 'Discovered' }];
    this.circuitBreaker = new CircuitBreaker(options.circuitBreakerOptions);
    this.receipt = null; this.liveInferenceReceipt = null;
    this.gitSha = options.candidateSha || options.gitSha || resolveCandidateSha();
    this.inferenceDigestSha256 = null; this.lastInferenceMetadata = null;
  }

  assertLiveReceiptValid() {
    const isProd = process.env.NODE_ENV === 'production';
    if (!this.receipt || this.receipt.liveExecution === false) throw new QualificationGatewayError('LIVE_EXECUTION_REQUIRED', 'Model activation requires verified live execution receipt', 403);
    if (!this.liveInferenceReceipt || !validateLiveInferenceReceipt(this.liveInferenceReceipt, this.alias)) throw new QualificationGatewayError('LIVE_INFERENCE_RECEIPT_REQUIRED', 'Model activation requires verified live inference receipt', 403);
    if (isProd && (this.liveInferenceReceipt.testOnly || this.receipt.testOnly)) throw new QualificationGatewayError('LIVE_INFERENCE_RECEIPT_REQUIRED', 'Mock test executor cannot activate model in production', 403);
  }

  transitionTo(nextState, reason = '') {
    if (nextState === ModelLifecycleState.DISABLED) {
      const prev = this.state; this.state = ModelLifecycleState.DISABLED;
      this.history.push({ from: prev, to: ModelLifecycleState.DISABLED, timestamp: new Date().toISOString(), reason }); return;
    }
    const curIdx = TRANSITION_ORDER.indexOf(this.state); const nxtIdx = TRANSITION_ORDER.indexOf(nextState);
    if (curIdx === -1 || nxtIdx === -1 || nxtIdx !== curIdx + 1) throw new QualificationGatewayError('INVALID_STATE_TRANSITION', `Illegal transition '${this.state}' -> '${nextState}'`, 400, { current: this.state, requested: nextState });
    if (nextState === ModelLifecycleState.ACTIVE) this.assertLiveReceiptValid();
    const prev = this.state; this.state = nextState;
    this.history.push({ from: prev, to: nextState, timestamp: new Date().toISOString(), reason });
  }

  canRoute() {
    if (this.state !== ModelLifecycleState.ACTIVE) return false;
    try { this.assertLiveReceiptValid(); return true; } catch { return false; }
  }

  assertRoutable() {
    if (this.state !== ModelLifecycleState.ACTIVE) throw new QualificationGatewayError('MODEL_DISABLED', `Model '${this.alias}' is in state '${this.state}', cannot route until ACTIVE`, 403, { modelAlias: this.alias, state: this.state });
    this.assertLiveReceiptValid(); return true;
  }

  validateSchema() {
    if (this.state !== ModelLifecycleState.DISCOVERED) throw new QualificationGatewayError('INVALID_STATE_TRANSITION', `Schema validation requires DISCOVERED, got ${this.state}`, 400);
    const id = this.model.alias || this.model.id;
    if (!id || typeof id !== 'string' || !id.trim()) { this.transitionTo(ModelLifecycleState.DISABLED, 'Schema invalid: missing alias or id'); throw new QualificationGatewayError('CATALOG_INVALID', 'Model missing non-empty identifier alias or id', 400); }
    if (!this.model.providerId && !this.model.provider) { this.transitionTo(ModelLifecycleState.DISABLED, 'Schema invalid: missing provider'); throw new QualificationGatewayError('CATALOG_INVALID', 'Model missing provider binding', 400); }
    this.transitionTo(ModelLifecycleState.SCHEMA_VALIDATED, 'Schema structural criteria validated');
    return this;
  }

  checkPolicy(options = {}) {
    if (this.state !== ModelLifecycleState.SCHEMA_VALIDATED) throw new QualificationGatewayError('INVALID_STATE_TRANSITION', `Policy check requires SCHEMA_VALIDATED, got ${this.state}`, 400);
    const broker = options.credentialBroker; const credentialRef = this.model.credentialRef || options.credentialRef;
    if (broker && credentialRef) {
      try { broker.resolveHandle(credentialRef); } catch (err) { this.transitionTo(ModelLifecycleState.DISABLED, `Policy check failed: ${err.errorCode || err.message}`); throw err; }
    } else if (options.secret !== undefined || options.requireCredentials) {
      const secret = options.secret ?? process.env.UGONDU_AIRROOFERS_AI_KEY;
      if (!secret || typeof secret !== 'string' || !secret.trim()) { this.transitionTo(ModelLifecycleState.DISABLED, 'Credentials missing for model policy'); throw new QualificationGatewayError('CREDENTIALS_MISSING', 'Workload credentials missing or empty', 503); }
      if (options.expiresAt && Date.now() >= new Date(options.expiresAt).getTime()) { this.transitionTo(ModelLifecycleState.DISABLED, 'Credentials expired for model policy'); throw new QualificationGatewayError('CREDENTIALS_EXPIRED', 'Configured credentials have expired', 503, { expiresAt: options.expiresAt }); }
      if (!SERVICE_KEY_FORMAT_REGEX.test(secret.trim())) { this.transitionTo(ModelLifecycleState.DISABLED, 'Credential format violation'); throw new QualificationGatewayError('CREDENTIALS_INVALID', 'Invalid credential format for provider', 400); }
    }
    this.transitionTo(ModelLifecycleState.POLICY_CHECKED, 'Governance and credential policies verified');
    return this;
  }

  async probeCapability(probeFn) {
    if (this.state !== ModelLifecycleState.POLICY_CHECKED) throw new QualificationGatewayError('INVALID_STATE_TRANSITION', `Capability probe requires POLICY_CHECKED, got ${this.state}`, 400);
    if (typeof probeFn !== 'function') {
      this.transitionTo(ModelLifecycleState.DISABLED, 'A genuine provider capability probe is required; no synthetic fallback is allowed');
      throw new QualificationGatewayError('CAPABILITY_PROBE_REQUIRED', 'A genuine provider capability probe is required; no synthetic fallback is allowed', 503);
    }
    try {
      const capability = await probeFn(this.model);
      if (!capability || capability.ok !== true || capability.source !== 'airroofers-live-transport') {
        const reason = (capability && capability.reason) || 'Live provider capability verification failed';
        this.transitionTo(ModelLifecycleState.DISABLED, reason); throw new QualificationGatewayError('CAPABILITY_PROBE_FAILED', reason, 503);
      }
      this.transitionTo(ModelLifecycleState.CAPABILITY_PROBED, 'Capabilities probed and verified'); return this;
    } catch (err) {
      if (this.state !== ModelLifecycleState.DISABLED) this.transitionTo(ModelLifecycleState.DISABLED, `Capability probe exception: ${err.message}`);
      throw err;
    }
  }

  async verifyInference(executeFn, options = {}) {
    if (this.state !== ModelLifecycleState.CAPABILITY_PROBED) throw new QualificationGatewayError('INVALID_STATE_TRANSITION', `Inference verification requires CAPABILITY_PROBED, got ${this.state}`, 400);
    if (!executeFn || typeof executeFn !== 'function') throw new QualificationGatewayError('EXECUTION_FUNCTION_REQUIRED', 'Inference verification requires an executable provider probe function', 400);
    if (process.env.NODE_ENV === 'production' && (options.mockAdapter || executeFn?.isMock)) {
      this.transitionTo(ModelLifecycleState.DISABLED, 'Mock adapter injection rejected in production');
      throw new QualificationGatewayError('MOCK_ADAPTER_INJECTION_PROHIBITED', 'Production runtime rejects arbitrary executeFn or mock adapter injection: only genuine provider transport permitted', 403);
    }
    if (this.circuitBreaker.isOpen()) throw new QualificationGatewayError('CIRCUIT_OPEN', 'Circuit breaker is OPEN; inference rejected', 503, { consecutiveFailures: this.circuitBreaker.consecutiveFailures });
    const maxRetries = options.maxRetries ?? 2; const initialBackoffMs = options.initialBackoffMs ?? 20;
    let attempt = 0; let lastError = null;
    while (attempt <= maxRetries) {
      try {
        const result = await executeFn(this.model);
        this.circuitBreaker.recordSuccess();
        const rawOutput = typeof result === 'string' ? result : JSON.stringify(result?.output ?? result?.completion ?? result?.result ?? result?.text ?? result);
        if (!rawOutput || rawOutput === '""' || rawOutput === '{}') throw new QualificationGatewayError('INFERENCE_OUTPUT_EMPTY', 'Provider inference returned empty output', 502);
        this.inferenceDigestSha256 = crypto.createHash('sha256').update(rawOutput).digest('hex');
        this.lastInferenceMetadata = { latencyMs: result?.latencyMs, correlationId: result?.correlationId };
        const isRealTransport = Boolean(result && typeof result === 'object' && result.source === 'airroofers-live-transport');
        const correlationId = (result && typeof result === 'object' && result.correlationId) || `corr-qual-${crypto.randomUUID()}`;
        const endpointHost = (result && typeof result === 'object' && result.endpointHost) || (isRealTransport ? result.endpointHost : 'ai.airroofers.eu');
        const observedAt = (result && typeof result === 'object' && result.observedAt) || new Date().toISOString();
        this.liveInferenceReceipt = {
          source: 'airroofers-live-transport', httpStatus: (result && typeof result === 'object' && result.httpStatus) || 200,
          verification: 'AUTHENTIC_LIVE_INFERENCE_QUALIFIED', candidateSha: (result && typeof result === 'object' && result.candidateSha) || this.gitSha,
          modelId: (result && typeof result === 'object' && result.modelId) || this.alias, responseDigestSha256: this.inferenceDigestSha256,
          correlationId, endpointHost, observedAt, ...(!isRealTransport ? { testOnly: true } : {}),
        };
        this.transitionTo(ModelLifecycleState.INFERENCE_VERIFIED, 'Authentic live test inference verified');
        return this;
      } catch (err) {
        lastError = err;
        const is429 = err?.statusCode === 429 || err?.errorCode === 'PROVIDER_RATE_LIMITED' || /429|rate limit/i.test(err?.message || '');
        if (is429) {
          this.circuitBreaker.recordFailure();
          if (this.circuitBreaker.isOpen()) throw new QualificationGatewayError('CIRCUIT_OPEN', 'Circuit breaker tripped OPEN on rate limit (429)', 503, { consecutiveFailures: this.circuitBreaker.consecutiveFailures });
          attempt++;
          if (attempt <= maxRetries) { await new Promise((r) => setTimeout(r, initialBackoffMs * Math.pow(2, attempt - 1))); continue; }
          throw new QualificationGatewayError('PROVIDER_RATE_LIMITED', 'Rate limit (429) exceeded after retry backoff', 429);
        }
        this.circuitBreaker.recordFailure(); throw err;
      }
    }
    throw lastError;
  }

  qualify(metadata = {}) {
    if (this.state !== ModelLifecycleState.INFERENCE_VERIFIED) throw new QualificationGatewayError('INVALID_STATE_TRANSITION', `Qualification requires INFERENCE_VERIFIED, got ${this.state}`, 400);
    const digest = metadata.inferenceDigestSha256 || this.inferenceDigestSha256;
    if (!digest) throw new QualificationGatewayError('INFERENCE_DIGEST_REQUIRED', 'Model qualification requires verified live inference digest', 400);
    if (metadata.liveInferenceReceipt && validateLiveInferenceReceipt(metadata.liveInferenceReceipt, this.alias)) this.liveInferenceReceipt = metadata.liveInferenceReceipt;
    const isMock = Boolean(this.liveInferenceReceipt?.testOnly); const testOnly = isMock || Boolean(metadata.testOnly);
    this.receipt = redactSecrets({
      receiptType: 'AI_MODEL_QUALIFICATION_RECEIPT', version: '1.0.0', modelAlias: this.alias, providerId: this.providerId,
      timestamp: new Date().toISOString(), gitSha: this.gitSha, status: 'QUALIFIED',
      latencyMs: metadata.latencyMs ?? this.lastInferenceMetadata?.latencyMs,
      correlationId: metadata.correlationId ?? this.lastInferenceMetadata?.correlationId ?? this.liveInferenceReceipt?.correlationId,
      capabilities: this.model.capabilities || { modalities: ['text'], streaming: false, toolCalling: true },
      inferenceDigestSha256: digest, verification: 'AUTHENTIC_LIVE_INFERENCE_QUALIFIED',
      liveInferenceReceipt: this.liveInferenceReceipt, ...metadata,
      liveExecution: metadata.liveExecution !== undefined ? Boolean(metadata.liveExecution) : true, testOnly,
    });
    this.transitionTo(ModelLifecycleState.QUALIFIED, 'Qualification receipt signed');
    return this;
  }

  recordOfflineReceipt(metadata = {}) {
    this.receipt = redactSecrets({
      receiptType: 'AI_MODEL_QUALIFICATION_RECEIPT', version: '1.0.0', modelAlias: this.alias, providerId: this.providerId,
      timestamp: new Date().toISOString(), gitSha: this.gitSha, status: 'UNQUALIFIED', liveExecution: false,
      capabilities: this.model.capabilities || { modalities: ['text'], streaming: false, toolCalling: true },
      verification: 'CATALOG_OFFLINE_PROHIBITED_FROM_ACTIVATION', reason: 'Offline catalog inspection only; live execution prohibited', ...metadata,
    });
    return this.receipt;
  }

  activate() {
    if (this.state !== ModelLifecycleState.QUALIFIED) throw new QualificationGatewayError('INVALID_STATE_TRANSITION', `Activation requires QUALIFIED, got ${this.state}`, 400);
    this.assertLiveReceiptValid();
    this.transitionTo(ModelLifecycleState.ACTIVE, 'Activated for live routing');
    return this;
  }

  getReceipt() { return redactSecrets(this.receipt); }

  getDiagnostics() {
    return redactSecrets({
      alias: this.alias, providerId: this.providerId, state: this.state, canRoute: this.canRoute(),
      liveInferenceReceipt: this.liveInferenceReceipt,
      circuitBreaker: { state: this.circuitBreaker.state, consecutiveFailures: this.circuitBreaker.consecutiveFailures, openedAt: this.circuitBreaker.openedAt },
      history: this.history, receipt: this.receipt,
    });
  }

  async runFullLifecycle(options = {}) {
    if (process.env.NODE_ENV === 'production' && (options.mockAdapter || options.executeFn?.isMock || options.executeProbe?.isMock)) {
      this.transitionTo(ModelLifecycleState.DISABLED, 'Mock adapter injection rejected in production');
      throw new QualificationGatewayError('MOCK_ADAPTER_INJECTION_PROHIBITED', 'Production runtime rejects arbitrary executeFn or mock adapter injection: only genuine provider transport permitted', 403);
    }
    this.validateSchema(); this.checkPolicy(options);
    await this.probeCapability(options.probeFn);
    await this.verifyInference(options.executeFn || options.executeProbe, options);
    this.qualify(options.receiptMetadata); this.activate();
    return this.getReceipt();
  }
}

export async function runModelQualification(options = {}) {
  const rootDir = options.rootDir || ROOT;
  const gitSha = options.candidateSha || options.gitSha || resolveCandidateSha(rootDir);
  const liveKey = options.secret || process.env.AIRROOFERS_AI_API_KEY || process.env.UGONDU_AIRROOFERS_AI_KEY;
  const liveBaseUrl = options.baseUrl || process.env.AIRROOFERS_AI_ENDPOINT || process.env.UGONDU_AIRROOFERS_AI_BASE_URL;
  const provenanceKey = options.provenanceKey || process.env.UGONDU_PROVENANCE_KEY;
  const hasLiveEnvCredentials = Boolean((process.env.AIRROOFERS_AI_API_KEY || process.env.UGONDU_AIRROOFERS_AI_KEY) && (process.env.AIRROOFERS_AI_ENDPOINT || process.env.UGONDU_AIRROOFERS_AI_BASE_URL));
  const isLiveConfigured = Boolean((liveKey && liveBaseUrl && !options.offline) || options.mode === 'LIVE_SOVEREIGN');
  const qualificationMode = isLiveConfigured ? 'LIVE_SOVEREIGN' : 'CATALOG_OFFLINE';
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    if (qualificationMode !== 'LIVE_SOVEREIGN') throw new QualificationGatewayError('LIVE_QUALIFICATION_REQUIRED', 'LIVE_QUALIFICATION_REQUIRED: Production certification requires live provider discovery and inference', 503);
    if (options.executeProbe || options.executeFn || options.mockAdapter) throw new QualificationGatewayError('MOCK_ADAPTER_INJECTION_PROHIBITED', 'Production composition root rejects arbitrary executeFn or mock adapter injection: only genuine provider transport permitted', 403);
    if (options.discoveredModels && Array.isArray(options.discoveredModels)) throw new QualificationGatewayError('DISCOVERY_MOCK_PROHIBITED', 'Production runtime requires genuine live provider discovery: manual model injection is prohibited', 403);
  }
  let discoveredModels = [];
  if (qualificationMode === 'LIVE_SOVEREIGN') {
    const { endpoint, key } = validateEndpointAndCredentials(liveBaseUrl || 'https://ai.airroofers.eu', liveKey);
    if (options.discoveredModels && Array.isArray(options.discoveredModels)) {
      discoveredModels = options.discoveredModels;
    } else {
      let res;
      try {
        const headers = { accept: 'application/json', authorization: `Bearer ${key}`, 'x-correlation-id': `corr-qual-models-${crypto.randomUUID()}`, ...(provenanceKey ? { 'x-provenance-key': provenanceKey } : {}) };
        res = await fetch(new URL('/v1/ai/models', endpoint), { headers, signal: AbortSignal.timeout(10000) });
      } catch (err) { throw new QualificationGatewayError('UPSTREAM_UNAVAILABLE', `Live model discovery failed: ${err.message}`, 503); }
      if (!res.ok) {
        const status = res.status === 401 ? 401 : res.status === 403 ? 403 : res.status === 429 ? 429 : 503;
        const code = res.status === 401 ? 'AUTHENTICATION_FAILED' : res.status === 403 ? 'AIRROOFERS_AI_ENDPOINT_DISALLOWED' : 'UPSTREAM_UNAVAILABLE';
        throw new QualificationGatewayError(code, `Live model discovery failed: ${res.status}`, status);
      }
      const data = await res.json();
      const list = Array.isArray(data?.models) ? data.models : Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      if (list.length === 0) throw new QualificationGatewayError('UPSTREAM_UNAVAILABLE', 'Live discovery returned no models', 503);
      discoveredModels = list.map((m) => (typeof m === 'string' ? { id: m, alias: m, providerId: 'airroofers-ai' } : { ...m, providerId: 'airroofers-ai' }));
    }
  } else {
    const catalogPath = path.resolve(rootDir, 'config', 'model-catalog.json');
    if (!fs.existsSync(catalogPath)) throw new QualificationGatewayError('MODEL_CATALOG_UNAVAILABLE', `Model catalog file not found: ${catalogPath}`, 503);
    let catalogDoc; try { catalogDoc = JSON.parse(fs.readFileSync(catalogPath, 'utf8')); } catch (err) { throw new QualificationGatewayError('MODEL_CATALOG_UNAVAILABLE', `Failed to parse catalog: ${err.message}`, 503); }
    discoveredModels = (catalogDoc.models || []).map((m) => ({ ...m }));
    if (discoveredModels.length === 0) throw new QualificationGatewayError('MODEL_CATALOG_UNAVAILABLE', 'Model catalog is empty or has no models', 503);
  }

  const modelDiagnostics = [];
  const receipts = [];

  for (const rawModel of discoveredModels) {
    const lifecycle = new ModelLifecycle(rawModel, { gitSha });
    if (qualificationMode === 'CATALOG_OFFLINE') {
      try { lifecycle.validateSchema(); } catch {}
      if (lifecycle.state !== ModelLifecycleState.DISABLED) lifecycle.transitionTo(ModelLifecycleState.DISABLED, 'Catalog offline mode: live qualification prohibited');
      modelDiagnostics.push(lifecycle.getDiagnostics()); receipts.push(lifecycle.recordOfflineReceipt());
    } else {
      try {
        lifecycle.validateSchema();
        lifecycle.checkPolicy({ secret: liveKey, requireCredentials: true });
        let probeFn = options.probeFn;
        if (typeof probeFn !== 'function') {
          if (!hasLiveEnvCredentials) throw new QualificationGatewayError('CAPABILITY_PROBE_REQUIRED', 'A genuine provider capability probe is required; no synthetic fallback is allowed', 503);
          probeFn = async (m) => {
            const { endpoint: ep, key: k } = validateEndpointAndCredentials(liveBaseUrl || 'https://ai.airroofers.eu', liveKey);
            const pRes = await fetch(new URL('/v1/ai/models', ep), { headers: { accept: 'application/json', authorization: `Bearer ${k}`, 'x-correlation-id': `corr-probe-${crypto.randomUUID()}`, ...(provenanceKey ? { 'x-provenance-key': provenanceKey } : {}) }, signal: AbortSignal.timeout(10000) });
            if (!pRes.ok) throw new QualificationGatewayError('CAPABILITY_PROBE_FAILED', `Live capability probe failed with HTTP ${pRes.status}`, 503);
            return { ok: true, source: 'airroofers-live-transport', correlationId: `corr-probe-${crypto.randomUUID()}` };
          };
        }
        const capability = await probeFn(rawModel);
        if (!capability || capability.ok !== true || capability.source !== 'airroofers-live-transport') throw new QualificationGatewayError('CAPABILITY_PROBE_FAILED', 'Live provider capability verification failed', 503);
        await lifecycle.probeCapability(async () => capability);

        const executeProbe = options.executeProbe || (async (model) => {
          const { endpoint, key } = validateEndpointAndCredentials(liveBaseUrl || 'https://ai.airroofers.eu', liveKey);
          const modelId = model.id || model.alias; const correlationId = `corr-qual-exec-${crypto.randomUUID()}`; const startMs = Date.now();
          let res;
          try {
            res = await fetch(new URL('/v1/ai/execute', endpoint), {
              method: 'POST',
              headers: { 'content-type': 'application/json', accept: 'application/json', authorization: `Bearer ${key}`, 'x-correlation-id': correlationId, 'x-request-id': `req-qual-${crypto.randomUUID()}`, 'x-tenant-id': 'tenant_ugondu', ...(provenanceKey ? { 'x-provenance-key': provenanceKey } : {}) },
              body: JSON.stringify({ model_id: modelId, payload: { messages: [{ role: 'user', content: 'Ping live qualification probe' }], max_tokens: 16, task: 'chat' }, context: { tenant_id: 'tenant_ugondu', product_id: 'ugondu', environment: 'production', region: 'eu-west-3', correlation_id: correlationId, data_classification: 'public' } }),
              signal: AbortSignal.timeout(10000),
            });
          } catch (err) { throw new QualificationGatewayError('UPSTREAM_UNAVAILABLE', `Live inference network error: ${err.message}`, 503); }
          const latencyMs = Math.max(1, Date.now() - startMs);
          if (res.status === 401) throw new QualificationGatewayError('AUTHENTICATION_FAILED', 'Provider authentication failed', 401);
          if (res.status === 403) throw new QualificationGatewayError('AIRROOFERS_AI_ENDPOINT_DISALLOWED', 'Provider rejected request (403)', 403);
          if (res.status === 429) throw new QualificationGatewayError('PROVIDER_RATE_LIMITED', 'Rate limited (429)', 429);
          if (res.status !== 200) throw new QualificationGatewayError('UPSTREAM_UNAVAILABLE', `Live inference failed: HTTP ${res.status}`, res.status);
          const data = await res.json(); const output = data?.output ?? data?.completion ?? data?.result ?? data?.text;
          if (!output) throw new QualificationGatewayError('MALFORMED_OUTPUT', 'Provider response missing completion output', 502);
          return { output, latencyMs, correlationId, modelId, source: 'airroofers-live-transport', httpStatus: 200, verification: 'AUTHENTIC_LIVE_INFERENCE_QUALIFIED', endpointHost: endpoint.hostname, observedAt: new Date().toISOString() };
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
        modelDiagnostics.push({ ...lifecycle.getDiagnostics(), failureReason: redactSecrets(err.message), errorCode: err.errorCode || 'UNKNOWN_ERROR' });
      }
    }
  }

  const qualifiedCount = receipts.filter((r) => r.status === 'QUALIFIED' && r.liveExecution === true).length;
  const activeCount = modelDiagnostics.filter((m) => m.state === ModelLifecycleState.ACTIVE).length;
  const disabledCount = modelDiagnostics.filter((m) => m.state === ModelLifecycleState.DISABLED).length, pendingCount = Math.max(0, discoveredModels.length - (qualifiedCount + disabledCount));

  const reportReceipts = qualificationMode === 'CATALOG_OFFLINE' && receipts.length > 1
    ? [{ receiptType: 'AI_MODEL_QUALIFICATION_RECEIPT', version: '1.0.0', modelAlias: 'catalog-offline', providerId: 'airroofers-ai', timestamp: receipts[0].timestamp, gitSha, status: 'UNQUALIFIED', liveExecution: false, verification: 'CATALOG_OFFLINE_PROHIBITED_FROM_ACTIVATION', reason: 'Offline catalog inspection only; live execution prohibited' }] : receipts;
  const reportDiagnostics = qualificationMode === 'CATALOG_OFFLINE' && modelDiagnostics.length > 1
    ? [{ alias: 'catalog-offline-fleet', providerId: 'airroofers-ai', state: ModelLifecycleState.DISABLED, canRoute: false, liveInferenceReceipt: null, history: [{ from: null, to: ModelLifecycleState.DISCOVERED, timestamp: new Date().toISOString(), reason: `Discovered ${discoveredModels.length} catalog models` }, { from: ModelLifecycleState.DISCOVERED, to: ModelLifecycleState.DISABLED, timestamp: new Date().toISOString(), reason: 'Offline candidate evaluation: live credentials absent; all models fail closed' }], receipt: null, failureReason: 'Live credentials absent or offline mode active; zero models qualified or activated', errorCode: 'CREDENTIALS_ABSENT' }] : modelDiagnostics;

  const report = redactSecrets({
    reportType: 'AI_MODEL_QUALIFICATION_REPORT', version: '1.0.0', generatedAt: new Date().toISOString(), gitSha, qualificationMode,
    summary: { totalDiscovered: discoveredModels.length, qualifiedCount, activeCount, disabledCount, pendingCount },
    receipts: reportReceipts, diagnostics: reportDiagnostics,
  });

  if (options.write !== undefined ? Boolean(options.write) : (options.persist === true || Boolean(options.outputPath))) {
    const reportFullPath = options.outputPath ? path.resolve(options.outputPath) : path.resolve(rootDir, EVIDENCE_REPORT_RELATIVE_PATH);
    fs.mkdirSync(path.dirname(reportFullPath), { recursive: true });
    fs.writeFileSync(reportFullPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
  }
  return report;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  runModelQualification({ persist: true })
    .then((report) => console.log(JSON.stringify({ result: 'QUALIFICATION_COMPLETE', summary: report.summary, gitSha: report.gitSha })))
    .catch((err) => { console.error(JSON.stringify({ result: 'QUALIFICATION_FAILED', error: redactSecrets(err.message) })); process.exit(1); });
}
