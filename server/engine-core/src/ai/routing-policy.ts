/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Engine Core / AI / Routing Policy Engine
 * File           : routing-policy.ts
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

import { __t } from '@ugondu/shared';
import {
    AiGatewayError,
    CatalogModelEntry,
    CatalogProviderEntry,
    InferenceRequest,
    Modality,
    ToolCallRequest,
    ToolParameterSchema,
} from './contracts';
import { ModelCatalog } from './model-catalog';

export interface CircuitBreakerState {
    alias: string;
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    consecutiveFailures: number;
    openedAt?: number;
}

export interface RoutingDecision {
    primaryModel: CatalogModelEntry;
    primaryProvider: CatalogProviderEntry;
    effectiveTimeoutMs: number;
    validatedTools: Array<{ name: string; arguments: Record<string, unknown>; validated: boolean }>;
}

const FORBIDDEN_TOOL_NAMES = new Set([
    'shell_exec',
    'exec_raw',
    'command',
    'arbitrary_script',
    'bash',
    'sh',
    'powershell',
]);

const DEFAULT_TOOL_SCHEMAS: Record<string, ToolParameterSchema> = {
    inspect_topology: {
        required: ['target'],
        properties: { target: { type: 'string' }, depth: { type: 'number' } },
        additionalProperties: false,
    },
    verify_readiness: {
        required: ['serviceId'],
        properties: { serviceId: { type: 'string' } },
        additionalProperties: false,
    },
    calculate_cost: {
        required: ['tier'],
        properties: { tier: { type: 'string' }, replicas: { type: 'number' } },
        additionalProperties: false,
    },
    validate_manifest: {
        required: ['manifestVersion'],
        properties: { manifestVersion: { type: 'string' } },
        additionalProperties: false,
    },
    evaluate_policy: {
        required: ['policyId'],
        properties: { policyId: { type: 'string' } },
        additionalProperties: false,
    },
    classify_repository: {
        required: ['repoType'],
        properties: { repoType: { type: 'string' } },
        additionalProperties: false,
    },
    analyze_dockerfile: {
        required: ['baseImage'],
        properties: { baseImage: { type: 'string' } },
        additionalProperties: false,
    },
};

export class RoutingPolicyEngine {
    private readonly catalog: ModelCatalog;
    private readonly circuits = new Map<string, CircuitBreakerState>();
    private readonly failureThreshold: number;
    private readonly cooldownMs: number;

    constructor(
        catalog: ModelCatalog,
        options?: { failureThreshold?: number; cooldownMs?: number }
    ) {
        this.catalog = catalog;
        this.failureThreshold = options?.failureThreshold ?? 2;
        this.cooldownMs = options?.cooldownMs ?? 30000;
    }

    public evaluate(request: InferenceRequest): RoutingDecision {
        this.validateRequestEnvelope(request);

        const model = this.catalog.getModel(request.modelAlias);
        if (!model) {
            throw new AiGatewayError('MODEL_NOT_FOUND', __t('ai.error.model_not_found'), 404, {
                modelAlias: request.modelAlias,
            });
        }

        if (
            model.status !== 'enabled' ||
            this.catalog.isModelScopedDisabled(model.alias, {
                productId: request.productId,
                environment: request.environment,
                region: request.region,
                tenantId: request.tenantId,
            })
        ) {
            throw new AiGatewayError('MODEL_DISABLED', __t('ai.error.model_disabled'), 403, {
                modelAlias: request.modelAlias,
                status: model.status,
            });
        }

        const provider = this.catalog.getProvider(model.providerId);
        if (!provider || provider.status !== 'enabled') {
            throw new AiGatewayError('PROVIDER_DISABLED', __t('ai.error.provider_disabled'), 503, {
                providerId: model.providerId,
                modelAlias: model.alias,
            });
        }

        this.assertPolicyEligibility(model, provider, request);
        const validatedTools = this.validateToolCalls(model, request);

        const effectiveTimeoutMs = Math.min(request.deadlineMs, model.policy.timeoutMs);

        return {
            primaryModel: model,
            primaryProvider: provider,
            effectiveTimeoutMs,
            validatedTools,
        };
    }

    public resolvePolicyEquivalentFallbacks(
        primaryModel: CatalogModelEntry,
        request: InferenceRequest
    ): Array<{ model: CatalogModelEntry; provider: CatalogProviderEntry }> {
        const candidates: Array<{ model: CatalogModelEntry; provider: CatalogProviderEntry }> = [];
        const fallbackAliases = primaryModel.policy.fallbackAliases || [];

        for (const fallbackAlias of fallbackAliases) {
            if (fallbackAlias === primaryModel.alias) continue;
            const candidate = this.catalog.getModel(fallbackAlias);
            if (!candidate || candidate.status !== 'enabled') continue;
            if (
                this.catalog.isModelScopedDisabled(candidate.alias, {
                    productId: request.productId,
                    environment: request.environment,
                    region: request.region,
                    tenantId: request.tenantId,
                })
            ) {
                continue;
            }
            if (this.isCircuitOpen(candidate.alias)) continue;

            const provider = this.catalog.getProvider(candidate.providerId);
            if (!provider || provider.status !== 'enabled') continue;

            try {
                this.assertPolicyEligibility(candidate, provider, request);
                this.validateToolCalls(candidate, request);
                candidates.push({ model: candidate, provider });
            } catch {
                // Candidate does not satisfy policy equivalence (e.g. region or data classification mismatch)
                continue;
            }
        }

        return candidates;
    }

    public isCircuitOpen(alias: string): boolean {
        const record = this.circuits.get(alias);
        if (!record || record.state === 'CLOSED') {
            return false;
        }
        if (record.state === 'OPEN' && record.openedAt) {
            if (Date.now() - record.openedAt >= this.cooldownMs) {
                record.state = 'HALF_OPEN';
                return false;
            }
            return true;
        }
        return false;
    }

    public recordSuccess(alias: string): void {
        this.circuits.set(alias, {
            alias,
            state: 'CLOSED',
            consecutiveFailures: 0,
        });
    }

    public recordFailure(alias: string): CircuitBreakerState {
        const existing = this.circuits.get(alias) || {
            alias,
            state: 'CLOSED',
            consecutiveFailures: 0,
        };
        existing.consecutiveFailures += 1;
        if (existing.consecutiveFailures >= this.failureThreshold) {
            existing.state = 'OPEN';
            existing.openedAt = Date.now();
        }
        this.circuits.set(alias, existing);
        return { ...existing };
    }

    public resetCircuits(): void {
        this.circuits.clear();
    }

    public getCircuitStates(): CircuitBreakerState[] {
        return Array.from(this.circuits.values()).map(c => ({ ...c }));
    }

    private validateRequestEnvelope(request: InferenceRequest): void {
        if (!request || typeof request !== 'object') {
            throw new AiGatewayError('INVALID_REQUEST', __t('ai.error.invalid_request_body'), 400);
        }
        const requiredStrings: Array<keyof InferenceRequest> = [
            'requestId',
            'tenantId',
            'productId',
            'environment',
            'task',
            'modelAlias',
            'region',
            'dataClassification',
            'correlationId',
        ];
        for (const field of requiredStrings) {
            const val = request[field];
            if (typeof val !== 'string' || val.trim().length === 0) {
                throw new AiGatewayError('INVALID_REQUEST', __t('ai.error.missing_required_field'), 400, {
                    field,
                });
            }
        }
        if (
            typeof request.deadlineMs !== 'number' ||
            !Number.isFinite(request.deadlineMs) ||
            request.deadlineMs <= 0 ||
            request.deadlineMs > 120000
        ) {
            throw new AiGatewayError('DEADLINE_INVALID', __t('ai.error.invalid_deadline_ms'), 400, {
                deadlineMs: request.deadlineMs,
            });
        }
        if (!Array.isArray(request.messages) || request.messages.length === 0) {
            throw new AiGatewayError('INVALID_REQUEST', __t('ai.error.empty_messages'), 400);
        }
        // Reject raw provider URLs or secret-like modelAlias values
        if (/^https?:\/\//i.test(request.modelAlias) || /^(sk-|AKIA)/i.test(request.modelAlias)) {
            throw new AiGatewayError('INVALID_REQUEST', __t('ai.error.invalid_model_alias'), 400);
        }
    }

    private assertPolicyEligibility(
        model: CatalogModelEntry,
        provider: CatalogProviderEntry,
        request: InferenceRequest
    ): void {
        if (!model.environments.includes(request.environment)) {
            throw new AiGatewayError(
                'ENVIRONMENT_DISALLOWED',
                __t('ai.error.environment_disallowed'),
                403,
                { modelAlias: model.alias, environment: request.environment }
            );
        }

        if (
            !model.allowedRegions.includes(request.region) ||
            !provider.supportedRegions.includes(request.region)
        ) {
            throw new AiGatewayError('REGION_DISALLOWED', __t('ai.error.region_disallowed'), 403, {
                modelAlias: model.alias,
                region: request.region,
                allowedRegions: model.allowedRegions,
            });
        }

        if (!model.dataClassifications.includes(request.dataClassification)) {
            throw new AiGatewayError(
                'DATA_CLASSIFICATION_DISALLOWED',
                __t('ai.error.data_classification_disallowed'),
                403,
                {
                    modelAlias: model.alias,
                    dataClassification: request.dataClassification,
                    allowedClassifications: model.dataClassifications,
                }
            );
        }

        if (
            model.approvedProducts &&
            model.approvedProducts.length > 0 &&
            !model.approvedProducts.includes('*') &&
            !model.approvedProducts.includes(request.productId)
        ) {
            throw new AiGatewayError(
                'TENANT_OR_PRODUCT_DISALLOWED',
                __t('ai.error.product_disallowed'),
                403,
                { productId: request.productId, modelAlias: model.alias }
            );
        }

        if (
            model.approvedTenants &&
            model.approvedTenants.length > 0 &&
            !model.approvedTenants.includes('*') &&
            !model.approvedTenants.includes(request.tenantId)
        ) {
            throw new AiGatewayError(
                'TENANT_OR_PRODUCT_DISALLOWED',
                __t('ai.error.tenant_disallowed'),
                403,
                { tenantId: request.tenantId, modelAlias: model.alias }
            );
        }

        const requiredModality: Modality = request.task === 'embedding' ? 'embedding' : 'text';
        if (!model.capabilities.modalities.includes(requiredModality)) {
            throw new AiGatewayError(
                'CAPABILITY_UNSUPPORTED',
                __t('ai.error.modality_unsupported'),
                422,
                { modelAlias: model.alias, requiredModality }
            );
        }

        if (request.stream && !model.capabilities.streaming) {
            throw new AiGatewayError(
                'CAPABILITY_UNSUPPORTED',
                __t('ai.error.streaming_unsupported'),
                422,
                { modelAlias: model.alias }
            );
        }

        if (
            request.maxOutputTokens !== undefined &&
            request.maxOutputTokens > model.policy.maxOutputTokens
        ) {
            throw new AiGatewayError(
                'TOKEN_LIMIT_EXCEEDED',
                __t('ai.error.token_limit_exceeded'),
                422,
                {
                    requested: request.maxOutputTokens,
                    maxAllowed: model.policy.maxOutputTokens,
                }
            );
        }
    }

    private validateToolCalls(
        model: CatalogModelEntry,
        request: InferenceRequest
    ): Array<{ name: string; arguments: Record<string, unknown>; validated: boolean }> {
        if (!request.requestedTools || request.requestedTools.length === 0) {
            return [];
        }

        if (!model.capabilities.toolCalling) {
            throw new AiGatewayError(
                'CAPABILITY_UNSUPPORTED',
                __t('ai.error.tool_calling_unsupported'),
                422,
                { modelAlias: model.alias }
            );
        }

        const allowedModelTools = new Set(model.allowedTools || []);
        const authorizedCallerTools = request.authorizedTools
            ? new Set(request.authorizedTools)
            : allowedModelTools;

        const validated: Array<{ name: string; arguments: Record<string, unknown>; validated: boolean }> = [];

        for (const tool of request.requestedTools) {
            if (!tool || typeof tool.name !== 'string' || !tool.name.trim()) {
                throw new AiGatewayError('TOOL_SCHEMA_INVALID', __t('ai.error.tool_name_missing'), 400);
            }

            if (FORBIDDEN_TOOL_NAMES.has(tool.name.toLowerCase())) {
                throw new AiGatewayError('TOOL_NOT_ALLOWED', __t('ai.error.forbidden_shell_tool'), 403, {
                    toolName: tool.name,
                });
            }

            if (!allowedModelTools.has(tool.name)) {
                throw new AiGatewayError('TOOL_NOT_ALLOWED', __t('ai.error.tool_not_in_allowlist'), 403, {
                    toolName: tool.name,
                    modelAlias: model.alias,
                });
            }

            if (!authorizedCallerTools.has(tool.name)) {
                throw new AiGatewayError('TOOL_UNAUTHORIZED', __t('ai.error.tool_unauthorized'), 403, {
                    toolName: tool.name,
                });
            }

            this.validateSingleToolSchema(tool, request.toolSchemas?.[tool.name]);
            validated.push({
                name: tool.name,
                arguments: tool.arguments,
                validated: true,
            });
        }

        return validated;
    }

    private validateSingleToolSchema(
        tool: ToolCallRequest,
        customSchema?: ToolParameterSchema
    ): void {
        if (!tool.arguments || typeof tool.arguments !== 'object' || Array.isArray(tool.arguments)) {
            throw new AiGatewayError('TOOL_SCHEMA_INVALID', __t('ai.error.tool_args_must_be_object'), 400, {
                toolName: tool.name,
            });
        }

        const schema = customSchema || DEFAULT_TOOL_SCHEMAS[tool.name];
        if (!schema) {
            return;
        }

        if (Array.isArray(schema.required)) {
            for (const reqKey of schema.required) {
                if (tool.arguments[reqKey] === undefined || tool.arguments[reqKey] === null) {
                    throw new AiGatewayError(
                        'TOOL_SCHEMA_INVALID',
                        __t('ai.error.tool_missing_required_arg'),
                        400,
                        { toolName: tool.name, missingArgument: reqKey }
                    );
                }
            }
        }

        if (schema.properties) {
            for (const [argName, argVal] of Object.entries(tool.arguments)) {
                const propSpec = schema.properties[argName];
                if (!propSpec) {
                    if (schema.additionalProperties === false) {
                        throw new AiGatewayError(
                            'TOOL_SCHEMA_INVALID',
                            __t('ai.error.tool_unexpected_arg'),
                            400,
                            { toolName: tool.name, argument: argName }
                        );
                    }
                    continue;
                }
                if (typeof argVal !== propSpec.type) {
                    throw new AiGatewayError(
                        'TOOL_SCHEMA_INVALID',
                        __t('ai.error.tool_arg_type_mismatch'),
                        400,
                        {
                            toolName: tool.name,
                            argument: argName,
                            expectedType: propSpec.type,
                            actualType: typeof argVal,
                        }
                    );
                }
            }
        }
    }
}
