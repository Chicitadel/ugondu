/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Engine Core / AI / Model Lifecycle
 * File           : model-lifecycle.ts
 * Version        : 3.1.0
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
import * as fs from 'fs';
import * as path from 'path';
import { __t } from '@ugondu/shared';
import { AiGatewayError, ModelQualificationReceipt, ModelQualificationState } from './contracts';

export type { ModelQualificationReceipt, ModelQualificationState };

export type LifecycleFailureReasonCode =
    | 'SCHEMA_VALIDATION_FAILED' | 'POLICY_VIOLATION' | 'CAPABILITY_PROBE_FAILED'
    | 'INFERENCE_VERIFICATION_FAILED' | 'CREDENTIALS_INVALID' | 'ENDPOINT_DISALLOWED'
    | 'RATE_LIMIT_EXCEEDED' | 'HEALTH_CHECK_FAILED' | 'CONFORMANCE_FAILED'
    | 'DEGRADED_PERFORMANCE' | 'ADMIN_DISABLED' | 'MODEL_RETIRED' | 'UNKNOWN_FAILURE';

export interface ModelLifecycleAuditRecord {
    timestamp: string;
    correlationId: string;
    providerId: string;
    modelId: string;
    previousState: ModelQualificationState;
    newState: ModelQualificationState;
    reasonCode?: LifecycleFailureReasonCode | string;
    actor: string;
    details?: Record<string, unknown>;
}

export interface PersistedLifecycleRecord {
    schemaVersion: string;
    persistedAt: string;
    receiptDigest: string;
    receipt: ModelQualificationReceipt;
}

const SERVICE_KEY_FORMAT_REGEX = /^air_prod_[0-9a-f]{48}$/;

export function redactSecrets<T>(val: T): T {
    if (typeof val === 'string') {
        return val
            .replace(/air_prod_[0-9a-f]{48}/gi, '[REDACTED_SECRET]')
            .replace(/sk-[A-Za-z0-9_-]{12,}/g, '[REDACTED_SECRET]')
            .replace(/Bearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, 'Bearer [REDACTED_SECRET]')
            .replace(/\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g, '[REDACTED_SECRET]') as unknown as T;
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

export class ModelLifecycleError extends Error {
    public readonly errorCode: string;
    public readonly statusCode: number;
    public readonly details: Record<string, unknown>;

    constructor(errorCode: string, message: string, statusCode = 400, details: Record<string, unknown> = {}) {
        super(message);
        this.name = 'ModelLifecycleError';
        this.errorCode = errorCode;
        this.statusCode = statusCode;
        this.details = details;
    }
}

export class CircuitBreaker {
    public readonly failureThreshold: number;
    public readonly cooldownMs: number;
    public state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
    public consecutiveFailures = 0;
    public openedAt: number | null = null;
    constructor(options: { failureThreshold?: number; cooldownMs?: number } = {}) {
        this.failureThreshold = options.failureThreshold ?? 3;
        this.cooldownMs = options.cooldownMs ?? 30000;
    }
    public recordSuccess(): void { this.consecutiveFailures = 0; this.state = 'CLOSED'; this.openedAt = null; }
    public recordFailure(): 'CLOSED' | 'OPEN' | 'HALF_OPEN' {
        this.consecutiveFailures += 1;
        if (this.consecutiveFailures >= this.failureThreshold) { this.state = 'OPEN'; this.openedAt = Date.now(); }
        return this.state;
    }
    public isOpen(): boolean {
        if (this.state === 'OPEN') {
            if (this.openedAt && Date.now() - this.openedAt >= this.cooldownMs) { this.state = 'HALF_OPEN'; return false; }
            return true;
        }
        return false;
    }
    public reset(): void { this.state = 'CLOSED'; this.consecutiveFailures = 0; this.openedAt = null; }
}

export const VALID_LIFECYCLE_TRANSITIONS: Readonly<Record<ModelQualificationState, ReadonlySet<ModelQualificationState>>> = Object.freeze({
    DISCOVERED: new Set<ModelQualificationState>(['SCHEMA_VALIDATED', 'DEGRADED', 'DISABLED', 'RETIRED']),
    SCHEMA_VALIDATED: new Set<ModelQualificationState>(['POLICY_CHECKED', 'DEGRADED', 'DISABLED', 'RETIRED']),
    POLICY_CHECKED: new Set<ModelQualificationState>(['CAPABILITY_PROBED', 'DEGRADED', 'DISABLED', 'RETIRED']),
    CAPABILITY_PROBED: new Set<ModelQualificationState>(['INFERENCE_VERIFIED', 'DEGRADED', 'DISABLED', 'RETIRED']),
    INFERENCE_VERIFIED: new Set<ModelQualificationState>(['QUALIFIED', 'DEGRADED', 'DISABLED', 'RETIRED']),
    QUALIFIED: new Set<ModelQualificationState>(['ACTIVE', 'DEGRADED', 'DISABLED', 'RETIRED']),
    ACTIVE: new Set<ModelQualificationState>(['QUALIFIED', 'DEGRADED', 'DISABLED', 'RETIRED']),
    DEGRADED: new Set<ModelQualificationState>(['DISCOVERED', 'SCHEMA_VALIDATED', 'POLICY_CHECKED', 'CAPABILITY_PROBED', 'INFERENCE_VERIFIED', 'QUALIFIED', 'DISABLED', 'RETIRED']),
    DISABLED: new Set<ModelQualificationState>(['DISCOVERED', 'QUALIFIED', 'RETIRED']),
    RETIRED: new Set<ModelQualificationState>(['DISCOVERED']),
});

export function isValidLifecycleTransition(from: ModelQualificationState, to: ModelQualificationState): boolean {
    if (from === to) return true;
    if (to === 'ACTIVE' && from !== 'QUALIFIED') return false;
    const allowed = VALID_LIFECYCLE_TRANSITIONS[from];
    return allowed ? allowed.has(to) : false;
}

export function assertValidLifecycleTransition(from: ModelQualificationState, to: ModelQualificationState, reasonCode?: LifecycleFailureReasonCode | string): void {
    if (!isValidLifecycleTransition(from, to)) {
        throw new AiGatewayError('INVALID_REQUEST', __t('ai.error.invalid_lifecycle_transition') || `Invalid model qualification transition from ${from} to ${to}: transition to ACTIVE requires prior QUALIFIED status.`, 400, { from, to, reasonCode });
    }
}

export function computeReceiptDigest(receipt: ModelQualificationReceipt): string {
    const canonical = JSON.stringify({
        providerId: receipt.providerId,
        modelId: receipt.modelId,
        state: receipt.state,
        candidateSha: receipt.candidateSha,
        apiContractVersion: receipt.apiContractVersion,
        checks: receipt.checks,
    });
    return crypto.createHash('sha256').update(canonical).digest('hex');
}

export function persistLifecycleReceipt(receipt: ModelQualificationReceipt, filePath: string): PersistedLifecycleRecord {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const record: PersistedLifecycleRecord = {
        schemaVersion: '1.0.0',
        persistedAt: new Date().toISOString(),
        receiptDigest: computeReceiptDigest(receipt),
        receipt: JSON.parse(JSON.stringify(receipt)),
    };
    fs.writeFileSync(filePath, JSON.stringify(record, null, 2), 'utf8');
    return record;
}

export function loadPersistedLifecycleReceipt(filePath: string): PersistedLifecycleRecord {
    if (!fs.existsSync(filePath)) throw new AiGatewayError('CATALOG_INVALID', `Lifecycle receipt file not found: ${filePath}`, 404);
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as PersistedLifecycleRecord;
    if (!parsed?.receipt?.providerId || !parsed?.receipt?.modelId) {
        throw new AiGatewayError('CATALOG_INVALID', `Malformed lifecycle receipt at ${filePath}`, 500);
    }
    return parsed;
}

export class ModelLifecycleStateMachine {
    private readonly auditRecords: ModelLifecycleAuditRecord[] = [];
    public getInitialDiscoveredState(): ModelQualificationState { return 'DISCOVERED'; }
    public canTransition(from: ModelQualificationState, to: ModelQualificationState): boolean { return isValidLifecycleTransition(from, to); }
    public transition(
        from: ModelQualificationState,
        to: ModelQualificationState,
        context: { providerId: string; modelId: string; correlationId: string; reasonCode?: LifecycleFailureReasonCode | string; actor?: string; details?: Record<string, unknown> }
    ): ModelLifecycleAuditRecord {
        assertValidLifecycleTransition(from, to, context.reasonCode);
        const record: ModelLifecycleAuditRecord = {
            timestamp: new Date().toISOString(),
            correlationId: context.correlationId,
            providerId: context.providerId,
            modelId: context.modelId,
            previousState: from,
            newState: to,
            reasonCode: context.reasonCode,
            actor: context.actor || 'system',
            details: context.details,
        };
        this.auditRecords.push(record);
        return record;
    }
    public failCheck(
        from: ModelQualificationState,
        targetState: 'DEGRADED' | 'DISABLED' | 'RETIRED',
        reasonCode: LifecycleFailureReasonCode,
        context: { providerId: string; modelId: string; correlationId: string; actor?: string; details?: Record<string, unknown> }
    ): ModelLifecycleAuditRecord {
        return this.transition(from, targetState, { ...context, reasonCode });
    }
    public getAuditHistory(): ModelLifecycleAuditRecord[] { return [...this.auditRecords]; }
    public getAuditRecords(): ModelLifecycleAuditRecord[] { return [...this.auditRecords]; }
    public clearAuditHistory(): void { this.auditRecords.length = 0; }
}

export interface ModelLifecycleOptions {
    gitSha?: string;
    circuitBreakerOptions?: { failureThreshold?: number; cooldownMs?: number };
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
}

export interface FullLifecycleOptions extends PolicyCheckOptions, InferenceVerificationOptions {
    probeFn?: (model: Record<string, any>) => Promise<boolean | { ok: boolean; reason?: string }>;
    executeFn?: (model: Record<string, any>) => Promise<string | { output?: string } | any>;
    receiptMetadata?: Record<string, unknown>;
}

export function isCredentialsRequiredForModel(model: Record<string, any>, options: PolicyCheckOptions = {}): boolean {
    if (options.requireCredentials === true) return true;
    if (model.credentialRef || model.requiresCredentials) return true;
    const provider = String(model.providerId || model.provider || '').toLowerCase();
    const localProviders = new Set(['mock', 'local', 'fixture']);
    return Boolean(provider && !localProviders.has(provider));
}

export class ModelLifecycle {
    public readonly model: Record<string, any>;
    public readonly alias: string;
    public readonly providerId: string;
    public state: ModelQualificationState;
    public readonly gitSha: string;
    public inferenceVerificationDigest: string | null = null;
    public receipt: ModelQualificationReceipt | null = null;
    public readonly circuitBreaker: CircuitBreaker;
    public readonly history: Array<{ from: ModelQualificationState | null; to: ModelQualificationState; timestamp: string; reason?: string }>;

    constructor(model: Record<string, any>, options: ModelLifecycleOptions = {}) {
        if (!model || typeof model !== 'object') throw new ModelLifecycleError('INVALID_REQUEST', 'Model payload must be an object', 400);
        this.model = { ...model };
        this.alias = model.alias || model.id || 'unassigned-model';
        this.providerId = model.providerId || model.provider || 'airroofers-ai';
        this.state = 'DISCOVERED';
        this.gitSha = options.gitSha || 'candidate-head';
        this.circuitBreaker = new CircuitBreaker(options.circuitBreakerOptions);
        this.history = [{ from: null, to: 'DISCOVERED', timestamp: new Date().toISOString(), reason: 'Discovered' }];
    }

    public transitionTo(nextState: ModelQualificationState, reason = ''): void {
        if (nextState === 'DISABLED') {
            const prev = this.state;
            this.state = 'DISABLED';
            this.history.push({ from: prev, to: 'DISABLED', timestamp: new Date().toISOString(), reason });
            return;
        }
        const allowed = VALID_LIFECYCLE_TRANSITIONS[this.state];
        if (!allowed || !allowed.has(nextState)) {
            throw new ModelLifecycleError('INVALID_STATE_TRANSITION', `Illegal transition from '${this.state}' to '${nextState}'`, 400, { current: this.state, requested: nextState });
        }
        const prev = this.state;
        this.state = nextState;
        this.history.push({ from: prev, to: nextState, timestamp: new Date().toISOString(), reason });
    }

    public canRoute(): boolean { return this.state === 'ACTIVE'; }
    public assertRoutable(): boolean {
        if (this.state !== 'ACTIVE') {
            throw new ModelLifecycleError('MODEL_DISABLED', `Model '${this.alias}' is in state '${this.state}', cannot be routed until ACTIVE`, 403, { modelAlias: this.alias, state: this.state });
        }
        return true;
    }

    public validateSchema(): this {
        if (this.state !== 'DISCOVERED') throw new ModelLifecycleError('INVALID_STATE_TRANSITION', `Schema validation requires DISCOVERED state, got ${this.state}`, 400);
        const id = this.model.alias || this.model.id;
        if (!id || typeof id !== 'string' || !id.trim()) {
            this.transitionTo('DISABLED', 'Schema invalid: missing alias or id');
            throw new ModelLifecycleError('CATALOG_INVALID', 'Model missing non-empty identifier alias or id', 400);
        }
        if (!this.model.providerId && !this.model.provider) {
            this.transitionTo('DISABLED', 'Schema invalid: missing provider');
            throw new ModelLifecycleError('CATALOG_INVALID', 'Model missing provider binding', 400);
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
            try {
                broker.resolveHandle(credentialRef);
            } catch (err: any) {
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

    public async probeCapability(probeFn?: (model: Record<string, any>) => Promise<boolean | { ok: boolean; reason?: string }>): Promise<this> {
        if (this.state !== 'POLICY_CHECKED') throw new ModelLifecycleError('INVALID_STATE_TRANSITION', `Capability probe requires POLICY_CHECKED state, got ${this.state}`, 400);
        try {
            if (typeof probeFn === 'function') {
                const probeResult = await probeFn(this.model);
                if (probeResult === false || (probeResult && typeof probeResult === 'object' && probeResult.ok === false)) {
                    const reason = (probeResult && typeof probeResult === 'object' && probeResult.reason) || 'Capability probe reported unsupported status';
                    this.transitionTo('DISABLED', reason);
                    throw new ModelLifecycleError('CAPABILITY_UNSUPPORTED', reason, 400);
                }
            }
            this.transitionTo('CAPABILITY_PROBED', 'Capabilities probed and verified');
            return this;
        } catch (err: any) {
            if ((this.state as string) !== 'DISABLED') this.transitionTo('DISABLED', `Capability probe exception: ${err.message}`);
            throw err;
        }
    }

    public async verifyInference(
        executeFn?: (model: Record<string, any>) => Promise<string | { output?: string } | any>,
        options: InferenceVerificationOptions = {}
    ): Promise<this> {
        if (this.state !== 'CAPABILITY_PROBED') {
            throw new ModelLifecycleError('INVALID_STATE_TRANSITION', `Inference verification requires CAPABILITY_PROBED state, got ${this.state}`, 400);
        }
        if (!executeFn || typeof executeFn !== 'function') {
            throw new ModelLifecycleError('NO_INFERENCE_EXECUTOR', 'Real provider executor is required for inference verification', 400);
        }
        if (this.circuitBreaker.isOpen()) {
            throw new ModelLifecycleError('CIRCUIT_OPEN', 'Circuit breaker is OPEN; inference rejected', 503, { consecutiveFailures: this.circuitBreaker.consecutiveFailures });
        }
        const maxRetries = options.maxRetries ?? 2;
        const initialBackoffMs = options.initialBackoffMs ?? 20;
        let attempt = 0;
        let lastError: any = null;

        while (attempt <= maxRetries) {
            try {
                const result = await executeFn(this.model);
                this.circuitBreaker.recordSuccess();

                let rawOutput: string | null = null;
                if (typeof result === 'string') rawOutput = result;
                else if (result && typeof result === 'object' && typeof (result as any).output === 'string') rawOutput = (result as any).output;

                if (!rawOutput || !rawOutput.trim()) {
                    throw new ModelLifecycleError('INVALID_INFERENCE_OUTPUT', 'Inference verification returned empty or null output', 400);
                }

                this.inferenceVerificationDigest = computeSha256(rawOutput.trim());
                this.transitionTo('INFERENCE_VERIFIED', 'Minimal test inference verified');
                return this;
            } catch (err: any) {
                lastError = err;
                if (err instanceof ModelLifecycleError && (err.errorCode as string) === 'INVALID_INFERENCE_OUTPUT') {
                    this.transitionTo('DISABLED', `Inference output invalid: ${err.message}`);
                    throw err;
                }
                const is429 = err?.statusCode === 429 || err?.errorCode === 'PROVIDER_RATE_LIMITED' || /429|rate limit/i.test(err?.message || '');
                if (is429) {
                    this.circuitBreaker.recordFailure();
                    if (this.circuitBreaker.isOpen()) {
                        throw new ModelLifecycleError('CIRCUIT_OPEN', 'Circuit breaker tripped OPEN on rate limit (429)', 503, { consecutiveFailures: this.circuitBreaker.consecutiveFailures });
                    }
                    attempt++;
                    if (attempt <= maxRetries) {
                        await new Promise((r) => setTimeout(r, initialBackoffMs * Math.pow(2, attempt - 1)));
                        continue;
                    }
                    throw new ModelLifecycleError('PROVIDER_RATE_LIMITED', 'Rate limit (429) exceeded after retry backoff', 429);
                }
                this.circuitBreaker.recordFailure();
                throw err;
            }
        }
        throw lastError;
    }

    public qualify(metadata: Record<string, unknown> = {}): this {
        if (this.state !== 'INFERENCE_VERIFIED') throw new ModelLifecycleError('INVALID_STATE_TRANSITION', `Qualification requires INFERENCE_VERIFIED state, got ${this.state}`, 400);
        if (!this.inferenceVerificationDigest) {
            throw new ModelLifecycleError('INFERENCE_NOT_VERIFIED', 'Cannot qualify model without verified inference digest', 400);
        }
        this.receipt = {
            providerId: this.providerId,
            modelId: this.alias,
            state: 'QUALIFIED',
            candidateSha: this.gitSha,
            apiContractVersion: '3.1.0',
            qualifiedAt: new Date().toISOString(),
            correlationId: (metadata.correlationId as string) || `corr-qual-${Date.now()}`,
            checks: [
                { checkId: 'schema-validation', status: 'PASS' },
                { checkId: 'policy-check', status: 'PASS' },
                { checkId: 'capability-probe', status: 'PASS' },
                { checkId: 'inference-verification', status: 'PASS', resultDigest: this.inferenceVerificationDigest },
            ],
            ...metadata,
        };
        this.transitionTo('QUALIFIED', 'Qualification receipt signed');
        return this;
    }

    public activate(): this {
        if (this.state !== 'QUALIFIED') throw new ModelLifecycleError('INVALID_STATE_TRANSITION', `Activation requires QUALIFIED state, got ${this.state}`, 400);
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
            circuitBreaker: {
                state: this.circuitBreaker.state,
                consecutiveFailures: this.circuitBreaker.consecutiveFailures,
                openedAt: this.circuitBreaker.openedAt,
            },
            history: this.history,
            receipt: this.receipt,
        });
    }

    public async runFullLifecycle(options: FullLifecycleOptions = {}): Promise<ModelQualificationReceipt | any> {
        this.validateSchema();
        const credentialsRequired = isCredentialsRequiredForModel(this.model, options);
        const policyOptions: PolicyCheckOptions = {
            ...options,
            requireCredentials: credentialsRequired ? true : options.requireCredentials,
        };
        this.checkPolicy(policyOptions);
        await this.probeCapability(options.probeFn);
        await this.verifyInference(options.executeFn, options);
        this.qualify(options.receiptMetadata);
        this.activate();
        return this.getReceipt();
    }
}
