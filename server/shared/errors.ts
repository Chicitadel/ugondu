/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Shared / Error Taxonomy & Domain Exceptions
 * File           : errors.ts
 * Version        : 3.0.0
 * Author         : Enterprise Architecture Council / Ujomor Systems Engineering Authority
 * Organization   : Air Roofers SASU / Ujomor Systems
 * Created Date   : 2026-09-30
 * Last Modified  : 2026-10-25
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance:
 * - Corporate Policy Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen (Wave 0 / Error Taxonomy)
 * - Zero String Hardcoding
 * - Fail-Closed Semantics
 *
 * Standards:
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS
 * - NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

import { Logger } from './logger';

export const ErrorCode = {
    // Input & Validation
    INVALID_INPUT: 'INVALID_INPUT',
    SCHEMA_VALIDATION_FAILED: 'SCHEMA_VALIDATION_FAILED',
    UNKNOWN_ACTION: 'UNKNOWN_ACTION',
    GENERIC_PAYLOAD_REJECTED: 'GENERIC_PAYLOAD_REJECTED',

    // Authentication & Workload Identity
    AUTH_FAILED: 'AUTH_FAILED',
    AUTH_TOKEN_MISSING: 'AUTH_TOKEN_MISSING',
    AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
    AUTH_TOKEN_MALFORMED: 'AUTH_TOKEN_MALFORMED',
    AUDIENCE_MISMATCH: 'AUDIENCE_MISMATCH',
    SCOPE_INSUFFICIENT: 'SCOPE_INSUFFICIENT',

    // Cryptographic & Trust
    SIGNATURE_INVALID: 'SIGNATURE_INVALID',
    TRUST_REJECTED: 'TRUST_REJECTED',
    KEY_NOT_FOUND: 'KEY_NOT_FOUND',
    KEY_REVOKED: 'KEY_REVOKED',
    KEY_EXPIRED: 'KEY_EXPIRED',
    KEY_PURPOSE_MISMATCH: 'KEY_PURPOSE_MISMATCH',
    REPLAY_DETECTED: 'REPLAY_DETECTED',

    // Policy & Authorization
    POLICY_VIOLATION: 'POLICY_VIOLATION',
    CAPABILITY_MISSING: 'CAPABILITY_MISSING',
    TENANT_UNAUTHORIZED: 'TENANT_UNAUTHORIZED',
    CROSS_TENANT_ACCESS_DENIED: 'CROSS_TENANT_ACCESS_DENIED',

    // State & Concurrency
    STATE_CORRUPT: 'STATE_CORRUPT',
    STATE_BINDING_MISMATCH: 'STATE_BINDING_MISMATCH',
    TRANSACTION_LOCKED: 'TRANSACTION_LOCKED',
    PERSISTENCE_FAILURE: 'PERSISTENCE_FAILURE',
    UNSAFE_RESUME: 'UNSAFE_RESUME',

    // Filesystem & Agent Safety
    SAFEPATH_ESCAPE: 'SAFEPATH_ESCAPE',
    ARCHIVE_TRAVERSAL: 'ARCHIVE_TRAVERSAL',
    ARCHIVE_BOMB: 'ARCHIVE_BOMB',
    ATOMIC_SWAP_FAILED: 'ATOMIC_SWAP_FAILED',

    // Network & SSRF
    SSRF_BLOCKED: 'SSRF_BLOCKED',
    DNS_REBINDING_DETECTED: 'DNS_REBINDING_DETECTED',
    REDIRECT_TARGET_BLOCKED: 'REDIRECT_TARGET_BLOCKED',

    // Plugin & Sandbox
    PLUGIN_NOT_AUTHORIZED: 'PLUGIN_NOT_AUTHORIZED',
    PLUGIN_SIGNATURE_INVALID: 'PLUGIN_SIGNATURE_INVALID',
    PLUGIN_SANDBOX_ESCAPE: 'PLUGIN_SANDBOX_ESCAPE',
    PLUGIN_OUTPUT_OVERFLOW: 'PLUGIN_OUTPUT_OVERFLOW',
    PLUGIN_EXECUTION_TIMEOUT: 'PLUGIN_EXECUTION_TIMEOUT',

    // Provider, Infrastructure & External Services
    PROVIDER_EXCEPTION: 'PROVIDER_EXCEPTION',
    AWS_PROVIDER_ERROR: 'AWS_PROVIDER_ERROR',
    AI_GATEWAY_ERROR: 'AI_GATEWAY_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',
    FILESYSTEM_ERROR: 'FILESYSTEM_ERROR',
    NETWORK_FAILURE: 'NETWORK_FAILURE',
    TIMEOUT_ERROR: 'TIMEOUT_ERROR',
    QUOTA_EXHAUSTION: 'QUOTA_EXHAUSTION',
    PERMISSION_DENIED: 'PERMISSION_DENIED'
} as const;

export type ErrorCodeType = typeof ErrorCode[keyof typeof ErrorCode];

export interface UgonduErrorDetail {
    code: ErrorCodeType;
    message: string;
    target?: string;
    correlationId?: string;
    timestamp: number;
}

/**
 * Base Domain Error for Ugondu Enterprise Architecture.
 * Carries typed error codes, structured metadata, and audit correlation identifiers.
 */
export class UgonduDomainError extends Error {
    public readonly code: ErrorCodeType;
    public readonly details?: Record<string, unknown>;
    public readonly originalError?: unknown;
    public readonly timestamp: number;
    public readonly correlationId?: string;

    constructor(
        code: ErrorCodeType,
        message: string,
        details?: Record<string, unknown>,
        originalError?: unknown
    ) {
        super(message);
        this.name = 'UgonduDomainError';
        this.code = code;
        this.details = details;
        this.originalError = originalError;
        this.timestamp = Date.now();
        this.correlationId = typeof details?.correlationId === 'string' ? details.correlationId : undefined;
        Object.setPrototypeOf(this, new.target.prototype);
    }

    public toJSON(): UgonduErrorDetail {
        return {
            code: this.code,
            message: this.message,
            target: typeof this.details?.target === 'string' ? this.details.target : undefined,
            correlationId: this.correlationId,
            timestamp: this.timestamp
        };
    }
}

export class AwsProviderError extends UgonduDomainError {
    constructor(message: string, details?: Record<string, unknown>, originalError?: unknown) {
        super(ErrorCode.AWS_PROVIDER_ERROR, message, details, originalError);
        this.name = 'AwsProviderError';
    }
}

export class AiProviderError extends UgonduDomainError {
    constructor(message: string, details?: Record<string, unknown>, originalError?: unknown) {
        super(ErrorCode.AI_GATEWAY_ERROR, message, details, originalError);
        this.name = 'AiProviderError';
    }
}

export class DatabaseError extends UgonduDomainError {
    constructor(message: string, details?: Record<string, unknown>, originalError?: unknown) {
        super(ErrorCode.DATABASE_ERROR, message, details, originalError);
        this.name = 'DatabaseError';
    }
}

export class FilesystemError extends UgonduDomainError {
    constructor(message: string, details?: Record<string, unknown>, originalError?: unknown) {
        super(ErrorCode.FILESYSTEM_ERROR, message, details, originalError);
        this.name = 'FilesystemError';
    }
}

export class NetworkError extends UgonduDomainError {
    constructor(message: string, details?: Record<string, unknown>, originalError?: unknown) {
        super(ErrorCode.NETWORK_FAILURE, message, details, originalError);
        this.name = 'NetworkError';
    }
}

export class QuotaExhaustionError extends UgonduDomainError {
    constructor(message: string, details?: Record<string, unknown>, originalError?: unknown) {
        super(ErrorCode.QUOTA_EXHAUSTION, message, details, originalError);
        this.name = 'QuotaExhaustionError';
    }
}

export class PermissionDeniedError extends UgonduDomainError {
    constructor(message: string, details?: Record<string, unknown>, originalError?: unknown) {
        super(ErrorCode.PERMISSION_DENIED, message, details, originalError);
        this.name = 'PermissionDeniedError';
    }
}

export class TimeoutError extends UgonduDomainError {
    constructor(message: string, details?: Record<string, unknown>, originalError?: unknown) {
        super(ErrorCode.TIMEOUT_ERROR, message, details, originalError);
        this.name = 'TimeoutError';
    }
}

export interface ClassifiedError {
    code: ErrorCodeType;
    isPermissionDenied: boolean;
    isTimeout: boolean;
    isQuotaExceeded: boolean;
    isNetworkFailure: boolean;
    isFailClosed: boolean;
}

/**
 * Classifies raw exceptions from cloud, AI, database, filesystem, or network providers.
 */
export function classifyProviderError(err: unknown): ClassifiedError {
    const errorObj = err as any;
    const name = String(errorObj?.name || '');
    const code = String(errorObj?.code || '');
    const message = String(errorObj?.message || '');
    const status = Number(errorObj?.statusCode || errorObj?.status || errorObj?.$metadata?.httpStatusCode || 0);

    const isPermissionDenied =
        status === 401 ||
        status === 403 ||
        code === 'EACCES' ||
        code === 'EPERM' ||
        /AccessDenied|Unauthorized|AuthFailure|Forbidden|InvalidClientTokenId|SignatureDoesNotMatch/i.test(name + code + message);

    const isTimeout =
        status === 408 ||
        status === 504 ||
        code === 'ETIMEDOUT' ||
        code === 'ESOCKETTIMEDOUT' ||
        /Timeout|RequestTimeout|OperationTimedOut/i.test(name + code + message);

    const isQuotaExceeded =
        status === 429 ||
        code === 'ECONNRESET' ||
        /Throttl|QuotaExceeded|RequestLimitExceeded|ProvisionedThroughputExceeded|RateLimit/i.test(name + code + message);

    const isNetworkFailure =
        code === 'ENOTFOUND' ||
        code === 'ECONNREFUSED' ||
        code === 'EAI_AGAIN' ||
        code === 'EHOSTUNREACH' ||
        code === 'ENETUNREACH' ||
        /NetworkingError|NetworkError|ConnectionError|FetchError/i.test(name + code + message);

    let resolvedCode: ErrorCodeType = ErrorCode.PROVIDER_EXCEPTION;
    if (isPermissionDenied) resolvedCode = ErrorCode.PERMISSION_DENIED;
    else if (isQuotaExceeded) resolvedCode = ErrorCode.QUOTA_EXHAUSTION;
    else if (isTimeout) resolvedCode = ErrorCode.TIMEOUT_ERROR;
    else if (isNetworkFailure) resolvedCode = ErrorCode.NETWORK_FAILURE;

    return {
        code: resolvedCode,
        isPermissionDenied,
        isTimeout,
        isQuotaExceeded,
        isNetworkFailure,
        isFailClosed: true
    };
}

export type ProviderType = 'AWS' | 'AI' | 'DATABASE' | 'FILESYSTEM' | 'NETWORK';

/**
 * Translates arbitrary caught provider exceptions into observable, typed domain errors
 * with structured audit logging and fail-closed metadata.
 */
export function translateProviderError(
    provider: ProviderType,
    error: unknown,
    context?: Record<string, unknown>
): UgonduDomainError {
    const rawMessage = error instanceof Error ? error.message : String(error);
    const classification = classifyProviderError(error);

    const mergedDetails: Record<string, unknown> = {
        provider,
        rawName: (error as any)?.name,
        rawCode: (error as any)?.code,
        statusCode: (error as any)?.statusCode || (error as any)?.$metadata?.httpStatusCode,
        failClosed: true,
        classification,
        ...context
    };

    let domainError: UgonduDomainError;

    if (classification.isPermissionDenied) {
        domainError = new PermissionDeniedError(
            `[${provider}] Permission denied: ${rawMessage}`,
            mergedDetails,
            error
        );
    } else if (classification.isQuotaExceeded) {
        domainError = new QuotaExhaustionError(
            `[${provider}] Quota exhaustion / rate limit exceeded: ${rawMessage}`,
            mergedDetails,
            error
        );
    } else if (classification.isTimeout) {
        domainError = new TimeoutError(
            `[${provider}] Operation timed out: ${rawMessage}`,
            mergedDetails,
            error
        );
    } else if (classification.isNetworkFailure) {
        domainError = new NetworkError(
            `[${provider}] Network failure: ${rawMessage}`,
            mergedDetails,
            error
        );
    } else {
        switch (provider) {
            case 'AWS':
                domainError = new AwsProviderError(`AWS provider error: ${rawMessage}`, mergedDetails, error);
                break;
            case 'AI':
                domainError = new AiProviderError(`AI provider error: ${rawMessage}`, mergedDetails, error);
                break;
            case 'DATABASE':
                domainError = new DatabaseError(`Database provider error: ${rawMessage}`, mergedDetails, error);
                break;
            case 'FILESYSTEM':
                domainError = new FilesystemError(`Filesystem error: ${rawMessage}`, mergedDetails, error);
                break;
            case 'NETWORK':
                domainError = new NetworkError(`Network error: ${rawMessage}`, mergedDetails, error);
                break;
            default:
                domainError = new UgonduDomainError(ErrorCode.PROVIDER_EXCEPTION, rawMessage, mergedDetails, error);
        }
    }

    // Always emit structured audit error log
    Logger.error(domainError.message, domainError, mergedDetails);

    return domainError;
}
