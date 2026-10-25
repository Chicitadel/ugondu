/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Engine Core / AI / Lifecycle State Machine
 * File           : lifecycle-state.ts
 * Version        : 3.2.0
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

export class ModelLifecycleError extends Error {
    constructor(
        public readonly errorCode: string,
        message: string,
        public readonly statusCode = 400,
        public readonly details: Record<string, unknown> = {}
    ) {
        super(message);
        this.name = 'ModelLifecycleError';
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

    public recordSuccess(): void {
        this.consecutiveFailures = 0;
        this.state = 'CLOSED';
        this.openedAt = null;
    }

    public recordFailure(): 'CLOSED' | 'OPEN' | 'HALF_OPEN' {
        this.consecutiveFailures += 1;
        if (this.consecutiveFailures >= this.failureThreshold) {
            this.state = 'OPEN';
            this.openedAt = Date.now();
        }
        return this.state;
    }

    public isOpen(): boolean {
        if (this.state === 'OPEN') {
            if (this.openedAt && Date.now() - this.openedAt >= this.cooldownMs) {
                this.state = 'HALF_OPEN';
                return false;
            }
            return true;
        }
        return false;
    }

    public reset(): void {
        this.state = 'CLOSED';
        this.consecutiveFailures = 0;
        this.openedAt = null;
    }
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

export function assertValidLifecycleTransition(
    from: ModelQualificationState,
    to: ModelQualificationState,
    reasonCode?: LifecycleFailureReasonCode | string
): void {
    if (!isValidLifecycleTransition(from, to)) {
        throw new AiGatewayError(
            'INVALID_REQUEST',
            __t('ai.error.invalid_lifecycle_transition'),
            400,
            { from, to, reasonCode }
        );
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

    public getInitialDiscoveredState(): ModelQualificationState {
        return 'DISCOVERED';
    }

    public canTransition(from: ModelQualificationState, to: ModelQualificationState): boolean {
        return isValidLifecycleTransition(from, to);
    }

    public transition(
        from: ModelQualificationState,
        to: ModelQualificationState,
        context: {
            providerId: string;
            modelId: string;
            correlationId: string;
            reasonCode?: LifecycleFailureReasonCode | string;
            actor?: string;
            details?: Record<string, unknown>;
        }
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
        context: {
            providerId: string;
            modelId: string;
            correlationId: string;
            actor?: string;
            details?: Record<string, unknown>;
        }
    ): ModelLifecycleAuditRecord {
        return this.transition(from, targetState, { ...context, reasonCode });
    }

    public getAuditHistory(): ModelLifecycleAuditRecord[] {
        return [...this.auditRecords];
    }

    public getAuditRecords(): ModelLifecycleAuditRecord[] {
        return [...this.auditRecords];
    }

    public clearAuditHistory(): void {
        this.auditRecords.length = 0;
    }
}
