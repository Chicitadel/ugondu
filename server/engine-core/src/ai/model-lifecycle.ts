/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Engine Core / AI / Model Lifecycle
 * File           : model-lifecycle.ts
 * Version        : 3.3.0
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

import * as crypto from 'crypto';
import { AirRoofersAiProviderAdapter } from './airroofers-provider';
import { ModelQualificationReceipt, ModelQualificationState } from './contracts';
import {
    ALLOWLISTED_LIVE_ENDPOINT_HOST,
    createTrustedLiveInferenceReceipt,
    DEV_FALLBACK_KEY,
    DEV_KEY_ID,
    isTrustedLiveInferenceReceipt,
    LiveInferenceReceipt,
    LiveInferenceReceiptParams,
    ProvenanceConfigurationError,
    TrustedReceiptService,
    validateLiveInferenceReceipt,
} from './trusted-receipt';
import {
    assertValidLifecycleTransition,
    CircuitBreaker,
    computeReceiptDigest,
    isValidLifecycleTransition,
    LifecycleFailureReasonCode,
    loadPersistedLifecycleReceipt,
    ModelLifecycleAuditRecord,
    ModelLifecycleError,
    ModelLifecycleStateMachine,
    PersistedLifecycleRecord,
    persistLifecycleReceipt,
    VALID_LIFECYCLE_TRANSITIONS,
} from './lifecycle-state';

export type { LifecycleFailureReasonCode, LiveInferenceReceipt, LiveInferenceReceiptParams, ModelLifecycleAuditRecord, ModelQualificationReceipt, ModelQualificationState, PersistedLifecycleRecord };
export { ALLOWLISTED_LIVE_ENDPOINT_HOST, assertValidLifecycleTransition, CircuitBreaker, computeReceiptDigest, createTrustedLiveInferenceReceipt, DEV_FALLBACK_KEY, DEV_KEY_ID, isTrustedLiveInferenceReceipt, isValidLifecycleTransition, loadPersistedLifecycleReceipt, ModelLifecycleError, ModelLifecycleStateMachine, persistLifecycleReceipt, ProvenanceConfigurationError, TrustedReceiptService, VALID_LIFECYCLE_TRANSITIONS, validateLiveInferenceReceipt };

const SERVICE_KEY_FORMAT_REGEX = /^air_prod_[0-9a-f]{48}$/;

export function redactSecrets<T>(val: T): T {
    if (typeof val === 'string') {
        return val.replace(/air_prod_[0-9a-f]{48}/gi, '[REDACTED_SECRET]').replace(/sk-[A-Za-z0-9_-]{12,}/g, '[REDACTED_SECRET]').replace(/Bearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, 'Bearer [REDACTED_SECRET]').replace(/\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g, '[REDACTED_SECRET]') as unknown as T;
    }
    if (val && typeof val === 'object') {
        if (Array.isArray(val)) return val.map((x) => redactSecrets(x)) as unknown as T;
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(val)) out[k] = redactSecrets(v);
        return out as unknown as T;
    }
    return val;
}

export function computeSha256(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
}

export interface ModelLifecycleOptions {
    gitSha?: string;
    circuitBreakerOptions?: { failureThreshold?: number; cooldownMs?: number };
    adapter?: AirRoofersAiProviderAdapter;
}

export interface PolicyCheckOptions {
    credentialBroker?: { resolveHandle(ref: string): any };
    credentialRef?: string;
    secret?: string;
    requireCredentials?: boolean;
    expiresAt?: string;
}

export interface InferenceVerificationOptions {
    maxRetries?: number;
    initialBackoffMs?: number;
    adapter?: AirRoofersAiProviderAdapter;
}

export interface FullLifecycleOptions extends PolicyCheckOptions, InferenceVerificationOptions {
    probeFn?: (model: Record<string, any>) => Promise<boolean | { ok: boolean; reason?: string }>;
    executeFn?: (model: Record<string, any>) => Promise<string | { output?: string } | any>;
    adapter?: AirRoofersAiProviderAdapter;
    receiptMetadata?: Record<string, unknown>;
}

export function isCredentialsRequiredForModel(model: Record<string, any>, options: PolicyCheckOptions = {}): boolean {
    if (options.requireCredentials === true || model.credentialRef || model.requiresCredentials) return true;
    const provider = String(model.providerId || model.provider || '').toLowerCase();
    return Boolean(provider && !new Set(['mock', 'local', 'fixture']).has(provider));
}

export class ModelLifecycle {
    public readonly model: Record<string, any>;
    public readonly alias: string;
    public readonly providerId: string;
    public state: ModelQualificationState;
    public readonly gitSha: string;
    public inferenceVerificationDigest: string | null = null;
    public receipt: ModelQualificationReceipt | null = null;
    public liveInferenceReceipt: LiveInferenceReceipt | null = null;
    public readonly circuitBreaker: CircuitBreaker;
    public readonly history: Array<{ from: ModelQualificationState | null; to: ModelQualificationState; timestamp: string; reason?: string }>;
    public readonly adapter?: AirRoofersAiProviderAdapter;

    constructor(model: Record<string, any>, options: ModelLifecycleOptions = {}) {
        if (!model || typeof model !== 'object') throw new ModelLifecycleError('INVALID_REQUEST', 'Model payload must be an object', 400);
        this.model = { ...model };
        this.alias = model.alias || model.id || 'unassigned-model';
        this.providerId = model.providerId || model.provider || 'airroofers-ai';
        this.state = 'DISCOVERED';
        this.gitSha = options.gitSha || 'candidate-head';
        this.circuitBreaker = new CircuitBreaker(options.circuitBreakerOptions);
        this.history = [{ from: null, to: 'DISCOVERED', timestamp: new Date().toISOString(), reason: 'Discovered' }];
        this.adapter = options.adapter;
    }

    public assertLiveInferenceReceiptValid(): void {
        const isProduction = process.env.NODE_ENV === 'production';
        if (!this.liveInferenceReceipt) {
            throw new ModelLifecycleError('LIVE_INFERENCE_RECEIPT_REQUIRED', `Model '${this.alias}' missing verified LiveInferenceReceipt for ACTIVE status`, 403);
        }
        const r = this.liveInferenceReceipt;
        if (isProduction && (r.keyId === DEV_KEY_ID || r.testOnly || (this.receipt && (this.receipt as any).testOnly))) {
            throw new ModelLifecycleError(r.keyId === DEV_KEY_ID ? 'DEV_KEY_PROHIBITED_IN_PRODUCTION' : 'LIVE_INFERENCE_RECEIPT_REQUIRED', `Model '${this.alias}' qualified with dev-key or testOnly mock receipt cannot be activated in production`, 403);
        }
        if (!r.endpointHost || r.endpointHost !== ALLOWLISTED_LIVE_ENDPOINT_HOST) {
            throw new ModelLifecycleError('LIVE_INFERENCE_RECEIPT_REQUIRED', `Model '${this.alias}' endpoint host '${r.endpointHost}' disallowed; strictly requires '${ALLOWLISTED_LIVE_ENDPOINT_HOST}'`, 403);
        }
        if (!r.providerRequestId || typeof r.providerRequestId !== 'string' || !r.providerRequestId.trim()) {
            throw new ModelLifecycleError('LIVE_INFERENCE_RECEIPT_REQUIRED', `Model '${this.alias}' receipt missing providerRequestId`, 403);
        }
        if (r.candidateSha !== this.gitSha || r.modelId !== this.alias || (this.inferenceVerificationDigest && r.responseDigestSha256 !== this.inferenceVerificationDigest)) {
            throw new ModelLifecycleError('LIVE_INFERENCE_RECEIPT_REQUIRED', `Model '${this.alias}' receipt mismatch (candidate, model, or digest)`, 403);
        }
        try {
            if (!validateLiveInferenceReceipt(r, this.alias, this.gitSha)) {
                throw new ModelLifecycleError('LIVE_INFERENCE_RECEIPT_REQUIRED', `Model '${this.alias}' missing verified LiveInferenceReceipt for ACTIVE status`, 403);
            }
        } catch (err: any) {
            if (err instanceof ProvenanceConfigurationError || err instanceof ModelLifecycleError) throw err;
            throw new ModelLifecycleError('LIVE_INFERENCE_RECEIPT_REQUIRED', `Receipt validation failed: ${err.message}`, 403);
        }
        if (isProduction) {
            try {
                if (!isTrustedLiveInferenceReceipt(r)) throw new ModelLifecycleError('LIVE_INFERENCE_RECEIPT_REQUIRED', `Model '${this.alias}' live inference receipt failed provenance verification in production`, 403);
            } catch (err: any) {
                if (err instanceof ProvenanceConfigurationError || err instanceof ModelLifecycleError) throw err;
                throw new ModelLifecycleError('LIVE_INFERENCE_RECEIPT_REQUIRED', `Receipt provenance verification failed: ${err.message}`, 403);
            }
        }
    }

    public transitionTo(nextState: ModelQualificationState, reason = ''): void {
        if (nextState === 'DISABLED') {
            const prev = this.state; this.state = 'DISABLED';
            this.history.push({ from: prev, to: 'DISABLED', timestamp: new Date().toISOString(), reason });
            return;
        }
        const allowed = VALID_LIFECYCLE_TRANSITIONS[this.state];
        if (!allowed || !allowed.has(nextState)) {
            throw new ModelLifecycleError('INVALID_STATE_TRANSITION', `Illegal transition from '${this.state}' to '${nextState}'`, 400, { current: this.state, requested: nextState });
        }
        if (nextState === 'ACTIVE') this.assertLiveInferenceReceiptValid();
        const prev = this.state; this.state = nextState;
        this.history.push({ from: prev, to: nextState, timestamp: new Date().toISOString(), reason });
    }

    public canRoute(): boolean {
        if (this.state !== 'ACTIVE') return false;
        try { this.assertLiveInferenceReceiptValid(); return true; } catch { return false; }
    }

    public assertRoutable(): boolean {
        if (this.state !== 'ACTIVE') {
            throw new ModelLifecycleError('MODEL_DISABLED', `Model '${this.alias}' is in state '${this.state}', cannot be routed until ACTIVE`, 403, { modelAlias: this.alias, state: this.state });
        }
        this.assertLiveInferenceReceiptValid();
        return true;
    }

    public validateSchema(): this {
        if (this.state !== 'DISCOVERED') throw new ModelLifecycleError('INVALID_STATE_TRANSITION', `Schema validation requires DISCOVERED state, got ${this.state}`, 400);
        const id = this.model.alias || this.model.id;
        if (!id || typeof id !== 'string' || !id.trim() || (!this.model.providerId && !this.model.provider)) {
            this.transitionTo('DISABLED', 'Schema invalid: missing alias or provider');
            throw new ModelLifecycleError('CATALOG_INVALID', 'Model missing non-empty identifier alias or provider binding', 400);
        }
        this.transitionTo('SCHEMA_VALIDATED', 'Schema structural criteria validated');
        return this;
    }

    public checkPolicy(options: PolicyCheckOptions = {}): this {
        if (this.state !== 'SCHEMA_VALIDATED') throw new ModelLifecycleError('INVALID_STATE_TRANSITION', `Policy check requires SCHEMA_VALIDATED state, got ${this.state}`, 400);
        const broker = options.credentialBroker;
        const credentialRef = this.model.credentialRef || options.credentialRef;
        const credentialsRequired = isCredentialsRequiredForModel(this.model, options);

        if (broker && credentialRef) {
            try { broker.resolveHandle(credentialRef); } catch (err: any) {
                this.transitionTo('DISABLED', `Policy check failed: ${err.errorCode || err.message}`);
                throw err;
            }
        } else if (credentialsRequired || options.secret !== undefined) {
            const secret = options.secret ?? process.env.UGONDU_AIRROOFERS_AI_KEY;
            if (!secret || typeof secret !== 'string' || !secret.trim()) {
                this.transitionTo('DISABLED', 'Credentials missing for model policy');
                throw new ModelLifecycleError('CREDENTIALS_MISSING', 'Workload credentials missing or empty', 503);
            }
            if (options.expiresAt && Date.now() >= new Date(options.expiresAt).getTime()) {
                this.transitionTo('DISABLED', 'Credentials expired for model policy');
                throw new ModelLifecycleError('CREDENTIALS_EXPIRED', 'Configured credentials have expired', 503, { expiresAt: options.expiresAt });
            }
            if (!SERVICE_KEY_FORMAT_REGEX.test(secret.trim())) {
                this.transitionTo('DISABLED', 'Credential format violation');
                throw new ModelLifecycleError('CREDENTIALS_INVALID', 'Invalid credential format for provider', 400);
            }
        }
        this.transitionTo('POLICY_CHECKED', 'Governance and credential policies verified');
        return this;
    }

    public async probeCapability(
        probeFn?: ((model: Record<string, any>) => Promise<boolean | { ok: boolean; reason?: string }>) | AirRoofersAiProviderAdapter | { adapter?: AirRoofersAiProviderAdapter },
        options: { adapter?: AirRoofersAiProviderAdapter } = {}
    ): Promise<this> {
        if (this.state !== 'POLICY_CHECKED') throw new ModelLifecycleError('INVALID_STATE_TRANSITION', `Capability probe requires POLICY_CHECKED state, got ${this.state}`, 400);
        const isProduction = process.env.NODE_ENV === 'production';
        if (isProduction && typeof probeFn === 'function') {
            this.transitionTo('DISABLED', 'Arbitrary probeFn callback injection rejected in production');
            throw new ModelLifecycleError('MOCK_ADAPTER_INJECTION_PROHIBITED', 'Production runtime rejects arbitrary probeFn callback: only concrete AirRoofersAiProviderAdapter permitted', 403);
        }
        const effectiveAdapter = (probeFn && typeof probeFn === 'object' && 'isProductionTransport' in probeFn)
            ? (probeFn as AirRoofersAiProviderAdapter)
            : ((probeFn as any)?.adapter || options?.adapter || this.adapter);

        if (isProduction) {
            if (!effectiveAdapter || !effectiveAdapter.isProductionTransport()) {
                this.transitionTo('DISABLED', 'Concrete AirRoofersAiProviderAdapter with genuine transport strictly required in production');
                throw new ModelLifecycleError('MOCK_ADAPTER_INJECTION_PROHIBITED', 'Production runtime strictly requires concrete AirRoofersAiProviderAdapter for capability probing', 403);
            }
            try { await effectiveAdapter.capabilities(); } catch (err: any) {
                this.transitionTo('DISABLED', `Capability probe failed: ${err.message}`); throw err;
            }
            this.transitionTo('CAPABILITY_PROBED', 'Capabilities probed via concrete adapter');
            return this;
        }

        try {
            if (typeof probeFn === 'function') {
                const probeResult = await probeFn(this.model);
                if (probeResult === false || (probeResult && typeof probeResult === 'object' && probeResult.ok === false)) {
                    const reason = (probeResult && typeof probeResult === 'object' && probeResult.reason) || 'Capability probe reported unsupported status';
                    this.transitionTo('DISABLED', reason);
                    throw new ModelLifecycleError('CAPABILITY_UNSUPPORTED', reason, 400);
                }
            } else if (effectiveAdapter) { await effectiveAdapter.capabilities(); }
            this.transitionTo('CAPABILITY_PROBED', 'Capabilities probed and verified');
            return this;
        } catch (err: any) {
            if ((this.state as string) !== 'DISABLED') this.transitionTo('DISABLED', `Capability probe exception: ${err.message}`);
            throw err;
        }
    }

    public async verifyInference(
        executeFn?: ((model: Record<string, any>) => Promise<string | { output?: string } | any>) | AirRoofersAiProviderAdapter | InferenceVerificationOptions,
        options: InferenceVerificationOptions = {}
    ): Promise<this> {
        if (this.state !== 'CAPABILITY_PROBED') throw new ModelLifecycleError('INVALID_STATE_TRANSITION', `Inference verification requires CAPABILITY_PROBED state, got ${this.state}`, 400);
        const isProduction = process.env.NODE_ENV === 'production';

        if (isProduction && typeof executeFn === 'function') {
            this.transitionTo('DISABLED', 'Arbitrary executeFn callback injection rejected in production');
            throw new ModelLifecycleError('MOCK_ADAPTER_INJECTION_PROHIBITED', 'Production runtime rejects arbitrary executeFn callback injection: only concrete AirRoofersAiProviderAdapter permitted', 403);
        }
        if (isProduction && ((options as any)?.mockAdapter || (executeFn as any)?.mockAdapter || (executeFn as any)?.isMock)) {
            this.transitionTo('DISABLED', 'Mock adapter injection rejected in production');
            throw new ModelLifecycleError('MOCK_ADAPTER_INJECTION_PROHIBITED', 'Production runtime rejects arbitrary executeFn or mock adapter injection', 403);
        }

        const effectiveAdapter = (executeFn && typeof executeFn === 'object' && 'isProductionTransport' in executeFn)
            ? (executeFn as AirRoofersAiProviderAdapter)
            : ((executeFn as any)?.adapter || options?.adapter || this.adapter);

        if (isProduction) {
            if (!effectiveAdapter || !effectiveAdapter.isProductionTransport()) {
                this.transitionTo('DISABLED', 'Concrete AirRoofersAiProviderAdapter with genuine transport strictly required in production');
                throw new ModelLifecycleError('MOCK_ADAPTER_INJECTION_PROHIBITED', 'Production runtime strictly requires concrete AirRoofersAiProviderAdapter for inference verification', 403);
            }
            if (this.circuitBreaker.isOpen()) {
                throw new ModelLifecycleError('CIRCUIT_OPEN', 'Circuit breaker is OPEN; inference rejected', 503, { consecutiveFailures: this.circuitBreaker.consecutiveFailures });
            }
            try {
                const { output, receipt } = await effectiveAdapter.verifyInferenceForQualification(this.alias, this.gitSha);
                this.circuitBreaker.recordSuccess();
                this.inferenceVerificationDigest = computeSha256(output.trim());
                this.liveInferenceReceipt = receipt;
                this.transitionTo('INFERENCE_VERIFIED', 'Minimal test inference verified via concrete adapter');
                return this;
            } catch (err: any) {
                this.circuitBreaker.recordFailure();
                this.transitionTo('DISABLED', `Production inference verification failed: ${err.message}`);
                throw err;
            }
        }

        const opts: InferenceVerificationOptions = (typeof executeFn === 'object' && !('isProductionTransport' in executeFn)) ? (executeFn as InferenceVerificationOptions) : options;
        const fn = typeof executeFn === 'function' ? executeFn : undefined;

        if (!fn && !effectiveAdapter) {
            throw new ModelLifecycleError('NO_INFERENCE_EXECUTOR', 'Real provider executor is required for inference verification', 400);
        }
        if (effectiveAdapter && !fn) {
            const { output, receipt } = await effectiveAdapter.verifyInferenceForQualification(this.alias, this.gitSha);
            this.circuitBreaker.recordSuccess();
            this.inferenceVerificationDigest = computeSha256(output.trim());
            this.liveInferenceReceipt = receipt;
            this.transitionTo('INFERENCE_VERIFIED', 'Minimal test inference verified via adapter');
            return this;
        }

        if (this.circuitBreaker.isOpen()) {
            throw new ModelLifecycleError('CIRCUIT_OPEN', 'Circuit breaker is OPEN; inference rejected', 503, { consecutiveFailures: this.circuitBreaker.consecutiveFailures });
        }

        const maxRetries = opts.maxRetries ?? 2;
        const initialBackoffMs = opts.initialBackoffMs ?? 20;
        let attempt = 0, lastError: any = null;

        while (attempt <= maxRetries) {
            try {
                const result = await fn!(this.model);
                this.circuitBreaker.recordSuccess();
                let rawOutput: string | null = null;
                if (typeof result === 'string') rawOutput = result;
                else if (result && typeof result === 'object' && typeof (result as any).output === 'string') rawOutput = (result as any).output;
                else if (result && typeof result === 'object' && typeof (result as any).responseDigestSha256 === 'string') rawOutput = (result as any).responseDigestSha256;
                if (!rawOutput || !rawOutput.trim()) throw new ModelLifecycleError('INVALID_INFERENCE_OUTPUT', 'Inference verification returned empty or null output', 400);

                this.inferenceVerificationDigest = computeSha256(rawOutput.trim());
                const correlationId = (result && typeof result === 'object' && (result.correlationId || result.providerRequestId)) || `corr-qual-${Date.now()}`;
                this.liveInferenceReceipt = createTrustedLiveInferenceReceipt({
                    source: 'airroofers-live-transport',
                    httpStatus: 200,
                    verification: 'AUTHENTIC_LIVE_INFERENCE_QUALIFIED',
                    candidateSha: this.gitSha,
                    modelId: this.alias,
                    endpointHost: ALLOWLISTED_LIVE_ENDPOINT_HOST,
                    providerRequestId: (result && typeof result === 'object' && result.providerRequestId) || correlationId,
                    responseDigestSha256: this.inferenceVerificationDigest,
                    correlationId,
                    observedAt: new Date().toISOString(),
                    testOnly: true,
                });
                this.transitionTo('INFERENCE_VERIFIED', 'Minimal test inference verified');
                return this;
            } catch (err: any) {
                lastError = err;
                if (err instanceof ModelLifecycleError && (err.errorCode as string) === 'INVALID_INFERENCE_OUTPUT') {
                    this.transitionTo('DISABLED', `Inference output invalid: ${err.message}`); throw err;
                }
                const is429 = err?.statusCode === 429 || err?.errorCode === 'PROVIDER_RATE_LIMITED' || /429|rate limit/i.test(err?.message || '');
                if (is429) {
                    this.circuitBreaker.recordFailure();
                    if (this.circuitBreaker.isOpen()) throw new ModelLifecycleError('CIRCUIT_OPEN', 'Circuit breaker tripped OPEN on rate limit (429)', 503, { consecutiveFailures: this.circuitBreaker.consecutiveFailures });
                    attempt++;
                    if (attempt <= maxRetries) {
                        await new Promise((r) => setTimeout(r, initialBackoffMs * Math.pow(2, attempt - 1)));
                        continue;
                    }
                    throw new ModelLifecycleError('PROVIDER_RATE_LIMITED', 'Rate limit (429) exceeded after retry backoff', 429);
                }
                this.circuitBreaker.recordFailure(); throw err;
            }
        }
        throw lastError;
    }

    public qualify(metadata: Record<string, unknown> = {}): this {
        if (this.state !== 'INFERENCE_VERIFIED') throw new ModelLifecycleError('INVALID_STATE_TRANSITION', `Qualification requires INFERENCE_VERIFIED state, got ${this.state}`, 400);
        if (!this.inferenceVerificationDigest) throw new ModelLifecycleError('INFERENCE_NOT_VERIFIED', 'Cannot qualify model without verified inference digest', 400);
        if (metadata.liveInferenceReceipt) {
            if (!validateLiveInferenceReceipt(metadata.liveInferenceReceipt, this.alias, this.gitSha)) {
                throw new ModelLifecycleError('LIVE_INFERENCE_RECEIPT_REQUIRED', 'Provided receipt failed validation', 403);
            }
            this.liveInferenceReceipt = metadata.liveInferenceReceipt as LiveInferenceReceipt;
        }
        const isMockExecutor = Boolean(this.liveInferenceReceipt?.testOnly);
        this.receipt = {
            providerId: this.providerId,
            modelId: this.alias,
            state: 'QUALIFIED',
            candidateSha: this.gitSha,
            apiContractVersion: '3.1.0',
            qualifiedAt: new Date().toISOString(),
            correlationId: this.liveInferenceReceipt?.providerRequestId || this.liveInferenceReceipt?.correlationId || (metadata.correlationId as string) || `corr-qual-${Date.now()}`,
            checks: [
                { checkId: 'schema-validation', status: 'PASS' },
                { checkId: 'policy-check', status: 'PASS' },
                { checkId: 'capability-probe', status: 'PASS' },
                { checkId: 'inference-verification', status: 'PASS', resultDigest: this.inferenceVerificationDigest },
            ],
            ...metadata,
            ...(isMockExecutor ? { testOnly: true, liveExecution: false } : {}),
        };
        this.transitionTo('QUALIFIED', 'Qualification receipt signed');
        return this;
    }

    public activate(receipt?: LiveInferenceReceipt): this {
        if (this.state !== 'QUALIFIED') throw new ModelLifecycleError('INVALID_STATE_TRANSITION', `Activation requires QUALIFIED state, got ${this.state}`, 400);
        if (receipt) {
            if (!validateLiveInferenceReceipt(receipt, this.alias, this.gitSha)) {
                throw new ModelLifecycleError('LIVE_INFERENCE_RECEIPT_REQUIRED', 'Provided receipt failed validation', 403);
            }
            this.liveInferenceReceipt = receipt;
        }
        this.assertLiveInferenceReceiptValid();
        this.transitionTo('ACTIVE', 'Activated for live routing');
        return this;
    }

    public getReceipt(): ModelQualificationReceipt | null { return this.receipt ? redactSecrets(this.receipt) : null; }

    public getDiagnostics(): Record<string, unknown> {
        return redactSecrets({
            alias: this.alias,
            providerId: this.providerId,
            state: this.state,
            canRoute: this.canRoute(),
            inferenceVerificationDigest: this.inferenceVerificationDigest,
            liveInferenceReceipt: this.liveInferenceReceipt,
            circuitBreaker: { state: this.circuitBreaker.state, consecutiveFailures: this.circuitBreaker.consecutiveFailures, openedAt: this.circuitBreaker.openedAt },
            history: this.history,
            receipt: this.receipt,
        });
    }

    public async runFullLifecycle(options: FullLifecycleOptions = {}): Promise<ModelQualificationReceipt | any> {
        const isProduction = process.env.NODE_ENV === 'production';
        if (isProduction && ((options as any).mockAdapter || (options.executeFn as any)?.isMock || typeof options.executeFn === 'function' || typeof options.probeFn === 'function')) {
            this.transitionTo('DISABLED', 'Mock adapter or callback injection rejected in production');
            throw new ModelLifecycleError('MOCK_ADAPTER_INJECTION_PROHIBITED', 'Production runtime rejects arbitrary executeFn/probeFn or mock adapter injection: only genuine provider transport permitted', 403);
        }
        this.validateSchema();
        const credentialsRequired = isCredentialsRequiredForModel(this.model, options);
        const policyOptions: PolicyCheckOptions = { ...options, requireCredentials: credentialsRequired ? true : options.requireCredentials };
        this.checkPolicy(policyOptions);
        await this.probeCapability(options.probeFn || options.adapter);
        await this.verifyInference(options.executeFn || options.adapter, options);
        this.qualify(options.receiptMetadata);
        this.activate();
        return this.getReceipt();
    }
}
