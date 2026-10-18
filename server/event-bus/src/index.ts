/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Event Bus — Service Entry Point
 * File           : index.ts
 * Version        : 2026.3.1-LTS
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-10-03
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
 * - ISO 27001 / SOC 2 / OWASP ASVS 5.0 / NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

import express, { Request, Response } from 'express';
import axios from 'axios';
import {
    __t,
    NetworkDestinationPolicy,
    ErrorCode,
    Logger,
    telemetryContextMiddleware,
    createOutboundPropagationHeaders,
} from '@ugondu/shared';
import { eventStore, deadLetterLog, DeadLetterEntry } from './db';

export { eventStore, deadLetterLog, DeadLetterEntry };
export * from './events/entitlement-events';

export const SUPPORTED_SCHEMA_VERSIONS = new Set<string>(['1.0', '1.0.0', '2.0', '2.0.0']);

export interface VersionedEventEnvelope {
    eventId: string;
    schemaVersion: string;
    type: string;
    tenantId: string;
    correlationId: string;
    timestamp: string;
    payload: Record<string, any>;
}

export interface EventBusRuntimeConfig {
    maxQueueDepth: number;
    maxRetries: number;
    retryDelayMs: number;
}

const runtimeConfig: EventBusRuntimeConfig = {
    maxQueueDepth: Number(process.env.EVENT_BUS_MAX_QUEUE_DEPTH || 100),
    maxRetries: Number(process.env.EVENT_BUS_MAX_RETRIES || 3),
    retryDelayMs: Number(process.env.EVENT_BUS_RETRY_DELAY_MS || 10),
};

let activeQueueDepth = 0;

export function setEventBusConfig(overrides: Partial<EventBusRuntimeConfig>): void {
    if (typeof overrides.maxQueueDepth === 'number' && overrides.maxQueueDepth >= 0) {
        runtimeConfig.maxQueueDepth = overrides.maxQueueDepth;
    }
    if (typeof overrides.maxRetries === 'number' && overrides.maxRetries >= 1) {
        runtimeConfig.maxRetries = overrides.maxRetries;
    }
    if (typeof overrides.retryDelayMs === 'number' && overrides.retryDelayMs >= 0) {
        runtimeConfig.retryDelayMs = overrides.retryDelayMs;
    }
}

export function getEventBusConfig(): EventBusRuntimeConfig {
    return { ...runtimeConfig };
}

export function setSimulatedQueueDepth(depth: number): void {
    activeQueueDepth = Math.max(0, depth);
}

export function getActiveQueueDepth(): number {
    return activeQueueDepth;
}

export function validateEventEnvelope(
    raw: any
): { valid: true; envelope: VersionedEventEnvelope } | { valid: false; errors: string[] } {
    const errors: string[] = [];
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return { valid: false, errors: ['Event body must be a JSON object'] };
    }

    if (typeof raw.eventId !== 'string' || raw.eventId.trim().length === 0) {
        errors.push('eventId is required and must be a non-empty string');
    }

    if (
        typeof raw.schemaVersion !== 'string' ||
        !SUPPORTED_SCHEMA_VERSIONS.has(raw.schemaVersion.trim())
    ) {
        errors.push(
            `schemaVersion is required and must be one of: ${Array.from(SUPPORTED_SCHEMA_VERSIONS).join(', ')}`
        );
    }

    if (typeof raw.type !== 'string' || raw.type.trim().length === 0) {
        errors.push('type is required and must be a non-empty string');
    }

    if (typeof raw.tenantId !== 'string' || raw.tenantId.trim().length === 0) {
        errors.push('tenantId is required and must be a non-empty string');
    }

    if (typeof raw.correlationId !== 'string' || raw.correlationId.trim().length === 0) {
        errors.push('correlationId is required and must be a non-empty string');
    }

    const isValidTimestamp =
        (typeof raw.timestamp === 'string' &&
            raw.timestamp.trim().length > 0 &&
            !Number.isNaN(Date.parse(raw.timestamp))) ||
        (typeof raw.timestamp === 'number' && Number.isFinite(raw.timestamp) && raw.timestamp > 0);
    if (!isValidTimestamp) {
        errors.push('timestamp is required and must be a valid ISO-8601 date string or epoch timestamp');
    }

    if (!raw.payload || typeof raw.payload !== 'object' || Array.isArray(raw.payload)) {
        errors.push('payload is required and must be a non-null object');
    }

    if (errors.length > 0) {
        return { valid: false, errors };
    }

    const normalizedTimestamp =
        typeof raw.timestamp === 'number'
            ? new Date(raw.timestamp).toISOString()
            : raw.timestamp.trim();

    return {
        valid: true,
        envelope: {
            eventId: raw.eventId.trim(),
            schemaVersion: raw.schemaVersion.trim(),
            type: raw.type.trim(),
            tenantId: raw.tenantId.trim(),
            correlationId: raw.correlationId.trim(),
            timestamp: normalizedTimestamp,
            payload: Logger.redact(raw.payload),
        },
    };
}

function sleep(ms: number): Promise<void> {
    if (ms <= 0) return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export const app = express();
app.use(telemetryContextMiddleware);
app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
        status: 'ok',
        service: 'event-bus',
        timestamp: new Date().toISOString(),
    });
});

app.get('/health/live', (_req: Request, res: Response) => {
    res.status(200).json({
        status: 'live',
        service: 'event-bus',
        timestamp: new Date().toISOString(),
    });
});

app.get('/health/ready', (_req: Request, res: Response) => {
    const storeReady = eventStore.isReady();
    const queueHealthy = activeQueueDepth <= runtimeConfig.maxQueueDepth;
    if (!storeReady || !queueHealthy) {
        return res.status(503).json({
            status: 'not_ready',
            service: 'event-bus',
            checks: {
                eventStore: storeReady ? 'ok' : 'failed',
                queue: queueHealthy ? 'ok' : 'saturated',
            },
            queueDepth: activeQueueDepth,
            maxQueueDepth: runtimeConfig.maxQueueDepth,
            timestamp: new Date().toISOString(),
        });
    }
    return res.status(200).json({
        status: 'ready',
        service: 'event-bus',
        checks: {
            eventStore: 'ok',
            queue: 'ok',
        },
        queueDepth: activeQueueDepth,
        maxQueueDepth: runtimeConfig.maxQueueDepth,
        timestamp: new Date().toISOString(),
    });
});

app.get('/v1/metadata', (_req: Request, res: Response) => {
    res.status(200).json({
        service: 'event-bus',
        product: 'ugondu',
        version: '2026.3.1-LTS',
        supportedSchemaVersions: Array.from(SUPPORTED_SCHEMA_VERSIONS),
        maxQueueDepth: runtimeConfig.maxQueueDepth,
        maxRetries: runtimeConfig.maxRetries,
        deadLetterCount: deadLetterLog.length,
        endpoints: [
            '/health',
            '/health/live',
            '/health/ready',
            '/v1/metadata',
            '/v1/events/publish',
            '/v1/events/subscribe',
            '/v1/events/dlq',
        ],
        timestamp: new Date().toISOString(),
    });
});

app.get('/v1/events/dlq', (req: Request, res: Response) => {
    const headerTenant = req.headers['x-tenant-id'];
    const queryTenant = typeof req.query.tenantId === 'string' ? req.query.tenantId : undefined;
    if (
        typeof headerTenant === 'string' &&
        queryTenant &&
        headerTenant.trim() !== queryTenant.trim()
    ) {
        return res.status(403).json({
            error: 'Cross-tenant dead-letter access denied',
            code: ErrorCode.CROSS_TENANT_ACCESS_DENIED,
        });
    }
    const effectiveTenant =
        (typeof headerTenant === 'string' && headerTenant.trim()) || queryTenant;
    return res.status(200).json({
        deadLetterLog: eventStore.getDeadLetters(effectiveTenant),
    });
});

app.post('/v1/events/subscribe', (req: Request, res: Response): any => {
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, any>;
    const eventType = typeof body.type === 'string' && body.type.trim()
        ? body.type.trim()
        : typeof body.event === 'string' && body.event.trim()
            ? body.event.trim()
            : '';
    const webhookUrl = typeof body.webhookUrl === 'string' ? body.webhookUrl.trim() : '';
    const tenantId = typeof body.tenantId === 'string' && body.tenantId.trim()
        ? body.tenantId.trim()
        : '';

    if (!eventType || !webhookUrl || !tenantId) {
        return res.status(400).json({
            error: __t('event_req'),
            code: ErrorCode.SCHEMA_VALIDATION_FAILED,
            details: ['tenantId, type (or event), and webhookUrl are required'],
        });
    }

    const headerTenant = req.headers['x-tenant-id'];
    if (typeof headerTenant === 'string' && headerTenant.trim() !== tenantId) {
        return res.status(403).json({
            error: 'Cross-tenant subscription rejected',
            code: ErrorCode.CROSS_TENANT_ACCESS_DENIED,
        });
    }

    if (!NetworkDestinationPolicy.isAllowed(webhookUrl)) {
        return res.status(400).json({
            error: __t('err_ssrf_blocked'),
            code: ErrorCode.SSRF_BLOCKED,
        });
    }

    eventStore.addSubscriber(eventType, webhookUrl, tenantId);
    Logger.info(__t('new_sub', eventType, webhookUrl), { tenantId, type: eventType });

    return res.status(201).json({
        subscribed: true,
        tenantId,
        type: eventType,
        message: __t('subscribed'),
    });
});

app.post('/v1/events/publish', async (req: Request, res: Response): Promise<any> => {
    // 1. Bounded Queue / Backpressure Guard
    if (activeQueueDepth >= runtimeConfig.maxQueueDepth) {
        Logger.warn('Event Bus queue capacity reached; applying backpressure', {
            queueDepth: activeQueueDepth,
            maxQueueDepth: runtimeConfig.maxQueueDepth,
        });
        return res.status(429).json({
            error: 'Event Bus queue capacity exceeded',
            code: 'BACKPRESSURE_REJECTED',
            queueDepth: activeQueueDepth,
            maxQueueDepth: runtimeConfig.maxQueueDepth,
        });
    }

    // 2. Versioned Envelope Schema Validation
    const validation = validateEventEnvelope(req.body);
    if (!validation.valid) {
        return res.status(400).json({
            error: __t('event_req'),
            code: ErrorCode.SCHEMA_VALIDATION_FAILED,
            details: validation.errors,
        });
    }

    const { envelope } = validation;

    // 3. Tenant Isolation Guard
    const headerTenant = req.headers['x-tenant-id'];
    if (typeof headerTenant === 'string' && headerTenant.trim() !== envelope.tenantId) {
        Logger.warn('Cross-tenant event publish blocked', {
            headerTenant: headerTenant.trim(),
            envelopeTenant: envelope.tenantId,
            eventId: envelope.eventId,
        });
        return res.status(403).json({
            error: 'Cross-tenant event publish denied',
            code: ErrorCode.CROSS_TENANT_ACCESS_DENIED,
        });
    }

    // 4. Idempotency Deduplication by eventId
    if (eventStore.hasProcessedEvent(envelope.eventId)) {
        Logger.info('Duplicate eventId suppressed by idempotency filter', {
            eventId: envelope.eventId,
            tenantId: envelope.tenantId,
            type: envelope.type,
        });
        return res.status(200).json({
            dispatched: false,
            deduplicated: true,
            idempotentReplay: true,
            eventId: envelope.eventId,
            tenantId: envelope.tenantId,
            type: envelope.type,
        });
    }

    activeQueueDepth++;
    try {
        eventStore.markEventProcessed(envelope.eventId, envelope.timestamp);

        Logger.info(__t('dispatching') + ` ${envelope.type}`, {
            eventId: envelope.eventId,
            tenantId: envelope.tenantId,
            schemaVersion: envelope.schemaVersion,
            correlation_id: envelope.correlationId,
            payload: envelope.payload,
        });

        const subscribers = eventStore.getSubscribers(envelope.type, envelope.tenantId);
        Logger.info(__t('notified', subscribers.length, envelope.type), {
            eventId: envelope.eventId,
            tenantId: envelope.tenantId,
            subscriberCount: subscribers.length,
        });

        const outboundHeaders = createOutboundPropagationHeaders({
            ...(req as any).telemetryContext,
            correlationId: envelope.correlationId,
        });

        let deliveredCount = 0;
        let deadLetteredCount = 0;

        for (const webhookUrl of subscribers) {
            if (!NetworkDestinationPolicy.isAllowed(webhookUrl)) {
                const reason = __t('messages.error.ssrf_policy_rejection');
                Logger.error(__t('delivery_failed', webhookUrl, reason), reason, {
                    eventId: envelope.eventId,
                    tenantId: envelope.tenantId,
                });
                eventStore.addDeadLetter({
                    eventId: envelope.eventId,
                    schemaVersion: envelope.schemaVersion,
                    type: envelope.type,
                    tenantId: envelope.tenantId,
                    correlationId: envelope.correlationId,
                    webhookUrl,
                    attempts: 0,
                    reason: 'SSRF_BLOCKED',
                    failedAt: new Date().toISOString(),
                    payload: envelope.payload,
                });
                deadLetteredCount++;
                continue;
            }

            let delivered = false;
            let lastErrorMessage = 'delivery_failed';
            let attempts = 0;

            for (let attempt = 1; attempt <= runtimeConfig.maxRetries; attempt++) {
                attempts = attempt;
                try {
                    await axios.post(
                        webhookUrl,
                        {
                            eventId: envelope.eventId,
                            schemaVersion: envelope.schemaVersion,
                            type: envelope.type,
                            tenantId: envelope.tenantId,
                            correlationId: envelope.correlationId,
                            timestamp: envelope.timestamp,
                            payload: envelope.payload,
                        },
                        {
                            headers: outboundHeaders,
                            timeout: 5000,
                        }
                    );
                    delivered = true;
                    deliveredCount++;
                    Logger.info(__t('delivered', webhookUrl), {
                        eventId: envelope.eventId,
                        tenantId: envelope.tenantId,
                        attempt,
                    });
                    break;
                } catch (err: any) {
                    lastErrorMessage = Logger.redactString(String(err?.message || err));
                    Logger.warn(__t('delivery_failed', webhookUrl, lastErrorMessage), {
                        eventId: envelope.eventId,
                        tenantId: envelope.tenantId,
                        attempt,
                        maxRetries: runtimeConfig.maxRetries,
                    });
                    if (attempt < runtimeConfig.maxRetries) {
                        await sleep(runtimeConfig.retryDelayMs);
                    }
                }
            }

            if (!delivered) {
                const dlqEntry: DeadLetterEntry = {
                    eventId: envelope.eventId,
                    schemaVersion: envelope.schemaVersion,
                    type: envelope.type,
                    tenantId: envelope.tenantId,
                    correlationId: envelope.correlationId,
                    webhookUrl,
                    attempts,
                    reason: lastErrorMessage,
                    failedAt: new Date().toISOString(),
                    payload: envelope.payload,
                };
                eventStore.addDeadLetter(dlqEntry);
                deadLetteredCount++;
            }
        }

        return res.status(200).json({
            dispatched: true,
            deduplicated: false,
            eventId: envelope.eventId,
            tenantId: envelope.tenantId,
            type: envelope.type,
            schemaVersion: envelope.schemaVersion,
            deliveredCount,
            deadLetteredCount,
            payload: envelope.payload,
            message: __t('event_success', envelope.type, deliveredCount),
        });
    } finally {
        activeQueueDepth = Math.max(0, activeQueueDepth - 1);
    }
});

app.use((err: any, _req: Request, res: Response, _next: express.NextFunction) => {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: Logger.redactString(String(err?.message || err)) });
});

const PORT = process.env.PORT || 4004;
export let serverInstance: any = null;

if (require.main === module) {
    serverInstance = app.listen(PORT, () => {
        Logger.info(__t('listening', __t('ugondu_event_bus'), PORT));
    });
}
