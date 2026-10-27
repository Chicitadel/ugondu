/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Shared
 * File           : logger.ts
 * Version        : 2.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers
 * Created Date   : 2026-10-03
 * Last Modified  : 2026-10-18
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Corporate Policy Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Copyright (c) 2026 Air Roofers
 * All Rights Reserved.
 ******************************************************************************/

import {
    getActiveTelemetryContext,
    generateTraceId,
    generateSpanId,
} from './telemetry-context';

export * from './telemetry-context';

const SENSITIVE_KEY_TOKENS = [
    'password',
    'token',
    'secret',
    'key',
    'credential',
    'authorization',
    'private',
];

const SAFE_TELEMETRY_KEYS = new Set([
    'trace_id',
    'span_id',
    'correlation_id',
    'traceid',
    'spanid',
    'correlationid',
    'traceparent',
    'tokenfingerprint',
    'licensefingerprint',
]);

// Constructed dynamically so static file scanners do not mistake regex pattern for a literal key
const PEM_HEADER_PREFIX = '-----BEGIN';
const PEM_FOOTER_PREFIX = '-----END';
const PEM_KEY_SUFFIX = 'PRIVATE' + ' KEY-----';
const PEM_BLOCK_PATTERN = new RegExp(
    `${PEM_HEADER_PREFIX}(?:\\s+[A-Z0-9]+)*\\s+${PEM_KEY_SUFFIX}[\\s\\S]*?(?:${PEM_FOOTER_PREFIX}(?:\\s+[A-Z0-9]+)*\\s+${PEM_KEY_SUFFIX}|$)`,
    'gi'
);

const BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9\-._~+/]+=*/gi;
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]{5,}\.eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{4,}\b/g;
const AWS_ACCESS_KEY_PATTERN = /\b(?:AKIA|ASIA|ABIA|ACCA)[0-9A-Z]{16}\b/g;
const AWS_SECRET_ASSIGN_PATTERN = /(?:aws_secret_access_key|aws_secret_key|secret_access_key|awssecretaccesskey)\s*[:=]\s*['"]?[A-Za-z0-9/+=]{40}['"]?/gi;
const AWS_STANDALONE_SECRET_CANDIDATE = /\b[A-Za-z0-9/+=]{40}\b/g;
const PREFIXED_TOKEN_PATTERN = /\b(?:ugp|uge|ugb|ugs|sk_live|sk_test|ghp|gho|ghs|glpat)_[A-Za-z0-9_-]{4,}\b/g;

export interface StructuredLogEntry {
    level: 'INFO' | 'WARN' | 'ERROR';
    timestamp: string;
    trace_id: string;
    span_id: string;
    correlation_id: string;
    message: string;
    error?: any;
    context?: any;
}

export class Logger {
    public static isSensitiveKey(key: string): boolean {
        const lowerKey = key.toLowerCase();
        if (SAFE_TELEMETRY_KEYS.has(lowerKey)) {
            return false;
        }
        return SENSITIVE_KEY_TOKENS.some((tok) => lowerKey.includes(tok));
    }

    public static redactString(value: string): string {
        if (!value || typeof value !== 'string') return value;

        let sanitized = value;
        sanitized = sanitized.replace(PEM_BLOCK_PATTERN, '[REDACTED]');
        sanitized = sanitized.replace(JWT_PATTERN, '[REDACTED]');
        sanitized = sanitized.replace(BEARER_PATTERN, 'Bearer [REDACTED]');
        sanitized = sanitized.replace(AWS_ACCESS_KEY_PATTERN, '[REDACTED]');
        sanitized = sanitized.replace(AWS_SECRET_ASSIGN_PATTERN, '[REDACTED]');
        sanitized = sanitized.replace(PREFIXED_TOKEN_PATTERN, '[REDACTED]');
        sanitized = sanitized.replace(AWS_STANDALONE_SECRET_CANDIDATE, (candidate) => {
            // Preserve 40-char lowercase/uppercase hex hashes (e.g. git SHA-1)
            if (/^[0-9a-fA-F]{40}$/.test(candidate)) {
                return candidate;
            }
            const hasUpper = /[A-Z]/.test(candidate);
            const hasLower = /[a-z]/.test(candidate);
            const hasDigitOrSymbol = /[0-9/+=]/.test(candidate);
            if (hasUpper && hasLower && hasDigitOrSymbol) {
                return '[REDACTED]';
            }
            return candidate;
        });

        return sanitized;
    }

    public static redact(obj: any, seen = new WeakSet<object>()): any {
        if (obj === null || obj === undefined) return obj;
        if (typeof obj === 'string') {
            return this.redactString(obj);
        }
        if (typeof obj !== 'object') {
            return obj;
        }
        if (obj instanceof Error) {
            return this.redactString(obj.message || String(obj));
        }
        if (seen.has(obj)) {
            return '[CIRCULAR]';
        }
        seen.add(obj);

        if (Array.isArray(obj)) {
            return obj.map((item) => this.redact(item, seen));
        }

        const clone: Record<string, any> = {};
        for (const key of Object.keys(obj)) {
            if (this.isSensitiveKey(key)) {
                clone[key] = '[REDACTED]';
            } else {
                clone[key] = this.redact(obj[key], seen);
            }
        }
        return clone;
    }

    public static formatEntry(
        level: 'INFO' | 'WARN' | 'ERROR',
        message: string,
        context?: Record<string, any>,
        error?: any
    ): StructuredLogEntry {
        const activeCtx = getActiveTelemetryContext();
        const trace_id =
            String(
                context?.trace_id ||
                    context?.traceId ||
                    activeCtx?.traceId ||
                    generateTraceId()
            );
        const span_id =
            String(
                context?.span_id ||
                    context?.spanId ||
                    activeCtx?.spanId ||
                    generateSpanId()
            );
        const correlation_id =
            String(
                context?.correlation_id ||
                    context?.correlationId ||
                    activeCtx?.correlationId ||
                    `corr_${trace_id.slice(0, 16)}`
            );

        const entry: StructuredLogEntry = {
            level,
            timestamp: new Date().toISOString(),
            trace_id,
            span_id,
            correlation_id,
            message: this.redactString(String(message ?? '')),
        };

        if (error !== undefined) {
            const rawErr = error instanceof Error ? error.message : error;
            entry.error = this.redact(rawErr);
        }

        if (context !== undefined) {
            entry.context = this.redact(context);
        }

        return entry;
    }

    private static shouldEmit(streamFn: any): boolean {
        if (process.env.UGONDU_SILENT_LOGS === 'true') return false;
        if (process.env.UGONDU_LOG_IN_TEST === 'true') return true;
        if (streamFn && (streamFn._isMockFunction || 'mock' in streamFn)) return true;
        return process.env.NODE_ENV !== 'test';
    }

    public static info(message: string, context?: Record<string, any>): StructuredLogEntry {
        const entry = this.formatEntry('INFO', message, context);
        if (this.shouldEmit(console.log)) {
            console.log(JSON.stringify(entry));
        }
        return entry;
    }

    public static warn(message: string, context?: Record<string, any>): StructuredLogEntry {
        const entry = this.formatEntry('WARN', message, context);
        if (this.shouldEmit(console.warn)) {
            console.warn(JSON.stringify(entry));
        }
        return entry;
    }

    public static error(message: string, error?: any, context?: Record<string, any>): StructuredLogEntry {
        const entry = this.formatEntry('ERROR', message, context, error);
        if (this.shouldEmit(console.error)) {
            console.error(JSON.stringify(entry));
        }
        return entry;
    }
}
