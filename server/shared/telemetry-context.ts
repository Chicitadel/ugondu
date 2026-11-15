/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Server / Shared / W3C Telemetry Context
 * File           : telemetry-context.ts
 * Version        : 2.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-10-18
 * Last Modified  : 2026-10-18
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
 * - W3C Trace Context Level 1
 * - ISO 27001 / SOC 2 / OWASP ASVS 5.0 / NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

import { AsyncLocalStorage } from 'async_hooks';
import { randomBytes, randomUUID } from 'crypto';

export const W3C_TRACEPARENT_VERSION = '00';
export const DEFAULT_TRACE_FLAGS = '01';

const TRACEPARENT_REGEX = /^([0-9a-f]{2})-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/i;
const ZERO_TRACE_ID = '00000000000000000000000000000000';
const ZERO_SPAN_ID = '0000000000000000';

export interface ParsedTraceparent {
    version: string;
    traceId: string;
    spanId: string;
    parentSpanId: string;
    traceFlags: string;
    sampled: boolean;
}

export interface TelemetryContext {
    traceId: string;
    spanId: string;
    parentSpanId?: string;
    traceFlags: string;
    traceparent: string;
    correlationId: string;
}

const telemetryAsyncStorage = new AsyncLocalStorage<TelemetryContext>();

export function generateTraceId(): string {
    return randomBytes(16).toString('hex');
}

export function generateSpanId(): string {
    return randomBytes(8).toString('hex');
}

export function formatTraceparent(
    traceId: string,
    spanId: string,
    traceFlags: string = DEFAULT_TRACE_FLAGS
): string {
    const cleanTraceId = /^[0-9a-f]{32}$/i.test(traceId) && traceId !== ZERO_TRACE_ID
        ? traceId.toLowerCase()
        : generateTraceId();
    const cleanSpanId = /^[0-9a-f]{16}$/i.test(spanId) && spanId !== ZERO_SPAN_ID
        ? spanId.toLowerCase()
        : generateSpanId();
    const cleanFlags = /^[0-9a-f]{2}$/i.test(traceFlags)
        ? traceFlags.toLowerCase()
        : DEFAULT_TRACE_FLAGS;
    return `${W3C_TRACEPARENT_VERSION}-${cleanTraceId}-${cleanSpanId}-${cleanFlags}`;
}

export function generateTraceparent(
    traceId?: string,
    spanId?: string,
    traceFlags: string = DEFAULT_TRACE_FLAGS
): string {
    return formatTraceparent(
        traceId || generateTraceId(),
        spanId || generateSpanId(),
        traceFlags
    );
}

export function parseTraceparent(headerValue?: string | string[] | null): ParsedTraceparent | null {
    if (!headerValue) return null;
    const raw = (Array.isArray(headerValue) ? headerValue[0] : headerValue).trim();
    const match = TRACEPARENT_REGEX.exec(raw);
    if (!match) return null;

    const version = match[1].toLowerCase();
    const traceId = match[2].toLowerCase();
    const spanId = match[3].toLowerCase();
    const traceFlags = match[4].toLowerCase();

    if (version === 'ff' || version !== W3C_TRACEPARENT_VERSION) return null;
    if (traceId === ZERO_TRACE_ID || spanId === ZERO_SPAN_ID) return null;

    return {
        version,
        traceId,
        spanId,
        parentSpanId: spanId,
        traceFlags,
        sampled: (parseInt(traceFlags, 16) & 0x01) === 0x01,
    };
}

function readHeader(
    headers: Record<string, any> | undefined,
    targetName: string
): string | undefined {
    if (!headers || typeof headers !== 'object') return undefined;
    const lowerTarget = targetName.toLowerCase();
    for (const [k, v] of Object.entries(headers)) {
        if (k.toLowerCase() === lowerTarget && v !== undefined && v !== null) {
            const str = (Array.isArray(v) ? v[0] : String(v)).trim();
            if (str.length > 0) return str;
        }
    }
    return undefined;
}

export function extractOrCreateTelemetryContext(
    headers?: Record<string, any>
): TelemetryContext {
    const rawTraceparent = readHeader(headers, 'traceparent');
    const parsed = parseTraceparent(rawTraceparent);

    const traceId = parsed ? parsed.traceId : generateTraceId();
    const spanId = parsed ? parsed.spanId : generateSpanId();
    const parentSpanId = parsed ? parsed.parentSpanId : undefined;
    const traceFlags = parsed ? parsed.traceFlags : DEFAULT_TRACE_FLAGS;
    const traceparent = formatTraceparent(traceId, spanId, traceFlags);

    const incomingCorrelation =
        readHeader(headers, 'x-correlation-id') ||
        readHeader(headers, 'x-request-id');
    const correlationId = incomingCorrelation || randomUUID();

    return {
        traceId,
        spanId,
        ...(parentSpanId ? { parentSpanId } : {}),
        traceFlags,
        traceparent,
        correlationId,
    };
}

export function getActiveTelemetryContext(): TelemetryContext | undefined {
    return telemetryAsyncStorage.getStore();
}

export function runWithTelemetryContext<T>(
    context: TelemetryContext,
    fn: () => T
): T {
    return telemetryAsyncStorage.run(context, fn);
}

export function createOutboundPropagationHeaders(
    source?: Partial<TelemetryContext> | Record<string, any>,
    extraHeaders?: Record<string, string>
): Record<string, string> {
    const active = getActiveTelemetryContext();
    const fromSource: Partial<TelemetryContext> =
        source && typeof source === 'object' && 'telemetryContext' in source
            ? (source as any).telemetryContext
            : (source as Partial<TelemetryContext>) || {};

    const traceId = fromSource.traceId || active?.traceId || generateTraceId();
    const spanId = fromSource.spanId || active?.spanId || generateSpanId();
    const traceFlags = fromSource.traceFlags || active?.traceFlags || DEFAULT_TRACE_FLAGS;
    const correlationId = fromSource.correlationId || active?.correlationId || randomUUID();
    const traceparent = formatTraceparent(traceId, spanId, traceFlags);

    return {
        ...(extraHeaders || {}),
        traceparent,
        'x-correlation-id': correlationId,
        'x-trace-id': traceId,
        'x-span-id': spanId,
    };
}

export const buildPropagationHeaders = createOutboundPropagationHeaders;
export const getPropagationHeaders = createOutboundPropagationHeaders;

export function telemetryContextMiddleware(req: any, res: any, next: any): void {
    const context = extractOrCreateTelemetryContext(req?.headers);

    if (req && typeof req === 'object') {
        req.telemetryContext = context;
        req.traceId = context.traceId;
        req.spanId = context.spanId;
        req.correlationId = context.correlationId;
        req.traceparent = context.traceparent;
    }

    if (res && typeof res.setHeader === 'function') {
        res.setHeader('traceparent', context.traceparent);
        res.setHeader('x-correlation-id', context.correlationId);
        res.setHeader('x-trace-id', context.traceId);
        res.setHeader('x-span-id', context.spanId);
    }

    telemetryAsyncStorage.run(context, () => {
        if (typeof next === 'function') {
            next();
        }
    });
}
