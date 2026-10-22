/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Engine Core / AI / Contracts
 * File           : contracts.ts
 * Version        : 3.1.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-18
 * Last Modified  : 2026-10-22
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

export type Modality = 'text' | 'image' | 'audio' | 'video' | 'embedding';

export type DeploymentEnvironment = 'development' | 'test' | 'staging' | 'production';
export type InferenceTask = 'chat' | 'code' | 'classification' | 'embedding' | 'structured';
export type DataClassification = 'public' | 'internal' | 'confidential' | 'restricted';
export type ModelStatus = 'enabled' | 'disabled' | 'deprecated';
export type FinishReason = 'stop' | 'length' | 'tool_call' | 'blocked' | 'error';

export interface ModelCapability {
    streaming: boolean;
    toolCalling: boolean;
    structuredOutput: boolean;
    modalities: Modality[];
    maxInputTokens?: number;
    maxOutputTokens?: number;
}

export interface ToolCallRequest {
    name: string;
    arguments: Record<string, unknown>;
}

export interface ToolParameterSchema {
    required?: string[];
    properties?: Record<string, { type: string }>;
    additionalProperties?: boolean;
}

export interface InferenceRequest {
    requestId: string;
    tenantId: string;
    productId: string;
    environment: DeploymentEnvironment;
    task: InferenceTask;
    modelAlias: string;             // stable internal alias, not a provider model ID
    region: string;
    dataClassification: DataClassification;
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    maxOutputTokens?: number;
    deadlineMs: number;
    correlationId: string;
    stream?: boolean;
    requestedTools?: ToolCallRequest[];
    authorizedTools?: string[];
    toolSchemas?: Record<string, ToolParameterSchema>;
}

export interface InferenceResult {
    requestId: string;
    providerId: string;
    modelAlias: string;
    adapterVersion: string;
    output: string;
    usage?: { inputTokens?: number; outputTokens?: number };
    finishReason: FinishReason;
    latencyMs: number;
    toolCalls?: Array<{
        name: string;
        arguments: Record<string, unknown>;
        validated: boolean;
    }>;
    fallbackUsed?: boolean;
    primaryModelAlias?: string;
    costUsd?: number;
}

export interface InferenceProvider {
    readonly providerId: string;
    capabilities(): Promise<ModelCapability[]>;
    invoke(request: InferenceRequest): Promise<InferenceResult>;
    healthCheck(): Promise<{ ok: boolean; checkedAt: string; reasonCode?: string }>;
}

export interface CatalogProviderEntry {
    providerId: string;
    legalEntity: string;
    adapterVersion: string;
    protocol: 'aws-sigv4-https' | 'https-json' | 'local-deterministic';
    endpointEnvVar: string;
    defaultEndpoint?: string;
    endpointPolicy?: string;
    notes?: string;
    accountRef: string;
    credentialRef: string;
    status: ModelStatus;
    supportedRegions: string[];
    supportedModalities: Modality[];
    supportsStreaming: boolean;
    supportsToolCalling: boolean;
    defaultTimeoutMs: number;
}

export interface CatalogModelPolicy {
    timeoutMs: number;
    maxOutputTokens: number;
    fallbackAliases: string[];
    rateLimitRpm: number;
    costPer1kInput: number;
    costPer1kOutput: number;
    pricingSource?: string;
    pricingDate?: string;
}

export interface CatalogModelConformance {
    contractTestsPassed: boolean;
    lastVerifiedAt: string;
    suiteVersion: string;
}

export interface CatalogModelGovernance {
    owner: string;
    approver: string;
    rotationDays: number;
    expiresAt?: string;
    incidentOwner: string;
}

export interface CatalogModelEntry {
    alias: string;
    providerId: string;
    providerModelIdRef: string;
    credentialRef: string;
    status: ModelStatus;
    environments: DeploymentEnvironment[];
    allowedRegions: string[];
    dataClassifications: DataClassification[];
    approvedProducts?: string[];
    approvedTenants?: string[];
    allowedTools?: string[];
    capabilities: ModelCapability;
    policy: CatalogModelPolicy;
    conformance?: CatalogModelConformance;
    governance: CatalogModelGovernance;
}

export interface IdentityProtectionPolicy {
    productIdentityName: string;
    organization: string;
    discloseInternalProviderToEndUser: boolean;
    identityResponseToken: string;
}

export interface ModelCatalogDocument {
    schemaVersion: string;
    catalogId?: string;
    updatedAt?: string;
    constitutionalInvariant?: string;
    zeroHardcodingGovernance?: {
        standard?: string;
        policy?: string;
        enforcement?: string;
    };
    identityPolicy?: IdentityProtectionPolicy;
    providers: CatalogProviderEntry[];
    models: CatalogModelEntry[];
}

export type AiErrorCode =
    | 'INVALID_REQUEST'
    | 'CATALOG_INVALID'
    | 'CATALOG_DUPLICATE_ALIAS'
    | 'MODEL_NOT_FOUND'
    | 'MODEL_DISABLED'
    | 'MODEL_CONFORMANCE_FAILED'
    | 'PROVIDER_NOT_FOUND'
    | 'PROVIDER_DISABLED'
    | 'CREDENTIALS_MISSING'
    | 'CREDENTIALS_EXPIRED'
    | 'CREDENTIALS_INVALID'
    | 'AUTHENTICATION_FAILED'
    | 'REGION_DISALLOWED'
    | 'DATA_CLASSIFICATION_DISALLOWED'
    | 'ENVIRONMENT_DISALLOWED'
    | 'TENANT_OR_PRODUCT_DISALLOWED'
    | 'CAPABILITY_UNSUPPORTED'
    | 'DEADLINE_INVALID'
    | 'TOKEN_LIMIT_EXCEEDED'
    | 'TOOL_NOT_ALLOWED'
    | 'TOOL_UNAUTHORIZED'
    | 'TOOL_SCHEMA_INVALID'
    | 'QUOTA_EXCEEDED'
    | 'RATE_LIMIT_EXCEEDED'
    | 'CONCURRENCY_LIMIT_EXCEEDED'
    | 'PROVIDER_TIMEOUT'
    | 'PROVIDER_RATE_LIMITED'
    | 'UPSTREAM_UNAVAILABLE'
    | 'NETWORK_INTERRUPTED'
    | 'MALFORMED_OUTPUT'
    | 'CIRCUIT_OPEN'
    | 'NO_POLICY_EQUIVALENT_FALLBACK'
    | 'STREAM_CANCELLED'
    | 'UNAUTHORIZED_ADMIN'
    | 'AIRROOFERS_AI_ENDPOINT_REQUIRED'
    | 'AIRROOFERS_AI_ENDPOINT_INSECURE'
    | 'AIRROOFERS_AI_ENDPOINT_MALFORMED'
    | 'AIRROOFERS_AI_ENDPOINT_DISALLOWED';

export class AiGatewayError extends Error {
    public readonly errorCode: AiErrorCode;
    public readonly statusCode: number;
    public readonly details: Record<string, unknown>;

    constructor(
        errorCode: AiErrorCode,
        message: string,
        statusCode = 400,
        details: Record<string, unknown> = {}
    ) {
        super(message);
        this.name = 'AiGatewayError';
        this.errorCode = errorCode;
        this.statusCode = statusCode;
        this.details = details;
    }
}

export interface AiAuditRecord {
    eventId: string;
    timestamp: string;
    requestId: string;
    correlationId: string;
    tenantId: string;
    productId: string;
    environment: string;
    region: string;
    dataClassification: string;
    requestedModelAlias: string;
    resolvedModelAlias: string;
    providerId: string;
    adapterVersion: string;
    policyDecision: 'ALLOW' | 'DENY' | 'FALLBACK_ALLOW';
    outcome: 'SUCCESS' | 'DENIED' | 'FAILED' | 'CANCELLED' | 'ADMIN_CHANGE';
    errorCode?: AiErrorCode;
    latencyMs: number;
    usage?: { inputTokens?: number; outputTokens?: number };
    costUsd?: number;
    actor?: string;
    notes?: string;
}

export interface AdminAuthContext {
    actorId: string;
    role: string;
    adminToken?: string;
    reason?: string;
}

export interface StreamChunk {
    requestId: string;
    tenantId: string;
    sequence: number;
    delta: string;
    done: boolean;
}
