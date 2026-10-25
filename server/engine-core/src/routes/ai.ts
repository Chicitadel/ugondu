/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Engine Core / Routes / AI Gateway Route
 * File           : ai.ts
 * Version        : 3.0.0
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
 * - ISO 27001 / SOC 2 / OWASP ASVS / NIST SP 800-53
 *
 * Signatures:
 * - Architecture Authority : Ujomor Systems Engineering
 * - Security Authority     : Ujomor Systems Governance
 * - Governance Authority   : Air Roofers Corporate Governance
 * - Deployment Authority   : Air Roofers Release Engineering
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

import express, { Request, Response, Router } from 'express';
import { __t } from '@ugondu/shared';
import {
    AdminAuthContext,
    AiGatewayError,
    InferenceGateway,
    InferenceRequest,
    ModelStatus,
} from '../ai';

function extractAdminContext(req: Request): AdminAuthContext {
    const actorId = String(req.headers['x-ugondu-actor-id'] || req.body?.actorId || '').trim();
    const role = String(req.headers['x-ugondu-role'] || req.body?.role || '').trim();
    const authHeader = String(req.headers['authorization'] || '');
    const tokenFromBearer = authHeader.toLowerCase().startsWith('bearer ')
        ? authHeader.slice(7).trim()
        : '';
    const adminToken =
        String(req.headers['x-ugondu-admin-token'] || '').trim() || tokenFromBearer;
    const reason = String(req.body?.reason || req.headers['x-ugondu-reason'] || '').trim();

    return {
        actorId,
        role,
        adminToken: adminToken || undefined,
        reason: reason || undefined,
    };
}

function sendGatewayError(
    res: Response,
    err: unknown,
    gateway: InferenceGateway,
    reqBody?: Partial<InferenceRequest>
): void {
    if (err instanceof AiGatewayError) {
        res.status(err.statusCode).json({
            error: err.errorCode,
            message: gateway.credentialBroker.redactString(err.message),
            requestId: reqBody?.requestId || 'unknown',
            correlationId: reqBody?.correlationId || 'unknown',
            details: gateway.credentialBroker.redactObject(err.details),
        });
        return;
    }
    const fallbackMessage = gateway.credentialBroker.redactString(
        (err as Error)?.message || __t('ai.error.internal_gateway_failure')
    );
    res.status(500).json({
        error: 'UPSTREAM_UNAVAILABLE',
        message: fallbackMessage,
        requestId: reqBody?.requestId || 'unknown',
        correlationId: reqBody?.correlationId || 'unknown',
    });
}

export function createAiRouter(customGateway?: InferenceGateway): Router {
    const router = Router();
    const gateway = customGateway ?? new InferenceGateway();
    router.use(express.json({ limit: '256kb' }));

    const handleInvoke = async (req: Request, res: Response): Promise<void> => {
        const body = req.body as InferenceRequest;
        try {
            if (body?.stream === true) {
                const abortController = new AbortController();
                req.on('close', () => {
                    abortController.abort();
                });

                res.setHeader('Content-Type', 'text/event-stream');
                res.setHeader('Cache-Control', 'no-cache');
                res.setHeader('Connection', 'keep-alive');

                for await (const chunk of gateway.invokeStream(body, abortController.signal)) {
                    res.write(`data: ${JSON.stringify(chunk)}\n\n`);
                }
                res.end();
                return;
            }

            const result = await gateway.invoke(body);
            // Redact internal provider implementation identity for end-user HTTP responses
            res.status(200).json({
                ...result,
                providerId: 'ugondu-platform',
            });
        } catch (err) {
            sendGatewayError(res, err, gateway, body);
        }
    };

    const handleListModels = (_req: Request, res: Response): void => {
        const models = gateway.catalog.listModels(false).map(m => ({
            alias: m.alias,
            status: m.status,
            environments: m.environments,
            allowedRegions: m.allowedRegions,
            dataClassifications: m.dataClassifications,
            capabilities: m.capabilities,
            maxOutputTokens: m.policy.maxOutputTokens,
            timeoutMs: m.policy.timeoutMs,
        }));
        res.status(200).json({
            schemaVersion: gateway.catalog.getSchemaVersion(),
            models,
        });
    };

    const handleAdminModelStatus = (req: Request, res: Response): void => {
        try {
            const alias = String(req.params['alias'] || '').trim();
            const status = req.body?.status as ModelStatus;
            if (!['enabled', 'disabled', 'deprecated'].includes(status)) {
                throw new AiGatewayError('INVALID_REQUEST', __t('ai.error.invalid_model_status'), 400, {
                    status,
                });
            }
            const auth = extractAdminContext(req);
            const scope = req.body?.scope;
            const change = gateway.setModelStatus(alias, status, auth, scope);
            res.status(200).json({
                status: 'UPDATED',
                change,
            });
        } catch (err) {
            sendGatewayError(res, err, gateway, req.body);
        }
    };

    const handleDiagnostics = async (req: Request, res: Response): Promise<void> => {
        try {
            const auth = extractAdminContext(req);
            const report = await gateway.getAdminDiagnostics(auth);
            res.status(200).json(report);
        } catch (err) {
            sendGatewayError(res, err, gateway);
        }
    };

    router.post('/invoke', handleInvoke);
    router.post('/v1/ai/invoke', handleInvoke);

    router.get('/models', handleListModels);
    router.get('/v1/ai/models', handleListModels);

    router.post('/admin/models/:alias/status', handleAdminModelStatus);
    router.post('/v1/ai/admin/models/:alias/status', handleAdminModelStatus);

    router.get('/diagnostics', handleDiagnostics);
    router.get('/v1/ai/diagnostics', handleDiagnostics);

    return router;
}

export const aiRouter = createAiRouter();
