/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Shared / Error Taxonomy
 * File           : errors.ts
 * Version        : 2.0.0
 * Author         : Server & Cryptography Engineering Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Last Modified  : 2026-09-30
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance:
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen (Wave 0 / Error Taxonomy)
 * - Zero String Hardcoding
 *
 * Standards:
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS
 * - NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

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
    PLUGIN_EXECUTION_TIMEOUT: 'PLUGIN_EXECUTION_TIMEOUT'
} as const;

export type ErrorCodeType = typeof ErrorCode[keyof typeof ErrorCode];

export interface UgonduErrorDetail {
    code: ErrorCodeType;
    message: string;
    target?: string;
    correlationId?: string;
    timestamp: number;
}
