/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Governance / Platform Contracts / AI Inference Contract
 * File           : ai.js
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

'use strict';

const fs = require('fs');
const path = require('path');

const CATALOG_PATH = path.resolve(__dirname, '../../../config/model-catalog.json');

const ALLOWED_ENVIRONMENTS = new Set(['development', 'test', 'staging', 'production']);
const ALLOWED_TASKS = new Set(['chat', 'code', 'classification', 'embedding', 'structured']);
const ALLOWED_CLASSIFICATIONS = new Set(['public', 'internal', 'confidential', 'restricted']);
const ALLOWED_MODALITIES = new Set(['text', 'image', 'audio', 'video', 'embedding']);
const ALLOWED_FINISH_REASONS = new Set(['stop', 'length', 'tool_call', 'blocked', 'error']);
const ALLOWED_CREDENTIAL_SCHEMES = new Set(['env', 'aws-secrets', 'kms']);

function isValidCredentialRef(ref) {
    if (typeof ref !== 'string' || !ref.trim()) return false;
    const match = /^([a-z-]+):\/\/(.+)$/.exec(ref.trim());
    if (!match) return false;
    const [, scheme, target] = match;
    if (!ALLOWED_CREDENTIAL_SCHEMES.has(scheme) || target.trim().length < 2) return false;
    if (/^(sk-|AKIA|ASIA|Bearer\s|-----BEGIN)/i.test(target)) return false;
    return true;
}

function loadModelCatalog(customPath) {
    const resolved = customPath || process.env.UGONDU_MODEL_CATALOG_PATH || CATALOG_PATH;
    if (!fs.existsSync(resolved)) {
        throw new Error(`CATALOG_MISSING: ${resolved}`);
    }
    const raw = fs.readFileSync(resolved, 'utf8');
    const doc = JSON.parse(raw);
    validateModelCatalog(doc);
    return doc;
}

function validateModelCatalog(doc) {
    if (!doc || typeof doc !== 'object') {
        throw new Error('CATALOG_INVALID: root must be an object');
    }
    if (typeof doc.schemaVersion !== 'string' || !doc.schemaVersion.trim()) {
        throw new Error('CATALOG_INVALID: schemaVersion is required');
    }
    if (!Array.isArray(doc.providers) || doc.providers.length === 0) {
        throw new Error('CATALOG_INVALID: providers must be a non-empty array');
    }
    if (!Array.isArray(doc.models) || doc.models.length === 0) {
        throw new Error('CATALOG_INVALID: models must be a non-empty array');
    }

    const providerIds = new Set();
    for (const provider of doc.providers) {
        if (!provider.providerId || providerIds.has(provider.providerId)) {
            throw new Error(`CATALOG_INVALID: duplicate or missing providerId ${provider.providerId}`);
        }
        if (!isValidCredentialRef(provider.credentialRef)) {
            throw new Error(`CATALOG_INVALID: invalid credentialRef on provider ${provider.providerId}`);
        }
        providerIds.add(provider.providerId);
    }

    const aliases = new Set();
    for (const model of doc.models) {
        if (!model.alias || aliases.has(model.alias)) {
            throw new Error(`CATALOG_DUPLICATE_ALIAS: ${model.alias}`);
        }
        if (!providerIds.has(model.providerId)) {
            throw new Error(`CATALOG_INVALID: unknown providerId ${model.providerId} on model ${model.alias}`);
        }
        if (
            typeof model.providerModelIdRef !== 'string' ||
            !model.providerModelIdRef.startsWith('secretless-registry://')
        ) {
            throw new Error(`CATALOG_INVALID: invalid providerModelIdRef on model ${model.alias}`);
        }
        if (!isValidCredentialRef(model.credentialRef)) {
            throw new Error(`CATALOG_INVALID: invalid credentialRef on model ${model.alias}`);
        }
        if (!model.capabilities || !Array.isArray(model.capabilities.modalities)) {
            throw new Error(`CATALOG_INVALID: missing capabilities on model ${model.alias}`);
        }
        for (const mod of model.capabilities.modalities) {
            if (!ALLOWED_MODALITIES.has(mod)) {
                throw new Error(`CATALOG_INVALID: invalid modality ${mod} on model ${model.alias}`);
            }
        }
        aliases.add(model.alias);
    }
    return true;
}

function validateInferenceRequest(request, catalogDoc) {
    const catalog = catalogDoc || loadModelCatalog();
    if (!request || typeof request !== 'object') {
        throw new Error('INVALID_REQUEST: request must be an object');
    }
    const requiredStrings = [
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
        if (typeof request[field] !== 'string' || !request[field].trim()) {
            throw new Error(`INVALID_REQUEST: missing ${field}`);
        }
    }
    if (!ALLOWED_ENVIRONMENTS.has(request.environment)) {
        throw new Error(`ENVIRONMENT_DISALLOWED: ${request.environment}`);
    }
    if (!ALLOWED_TASKS.has(request.task)) {
        throw new Error(`INVALID_REQUEST: unsupported task ${request.task}`);
    }
    if (!ALLOWED_CLASSIFICATIONS.has(request.dataClassification)) {
        throw new Error(`DATA_CLASSIFICATION_DISALLOWED: ${request.dataClassification}`);
    }
    if (typeof request.deadlineMs !== 'number' || request.deadlineMs <= 0) {
        throw new Error('DEADLINE_INVALID: deadlineMs must be a positive number');
    }
    if (!Array.isArray(request.messages) || request.messages.length === 0) {
        throw new Error('INVALID_REQUEST: messages must be a non-empty array');
    }

    const model = catalog.models.find(m => m.alias === request.modelAlias);
    if (!model) {
        throw new Error(`MODEL_NOT_FOUND: ${request.modelAlias}`);
    }
    if (model.status !== 'enabled') {
        throw new Error(`MODEL_DISABLED: ${request.modelAlias}`);
    }
    if (!model.allowedRegions.includes(request.region)) {
        throw new Error(`REGION_DISALLOWED: ${request.region} for model ${request.modelAlias}`);
    }
    if (!model.dataClassifications.includes(request.dataClassification)) {
        throw new Error(
            `DATA_CLASSIFICATION_DISALLOWED: ${request.dataClassification} for model ${request.modelAlias}`
        );
    }
    return true;
}

function validateInferenceResult(result) {
    if (!result || typeof result !== 'object') {
        throw new Error('MALFORMED_OUTPUT: result must be an object');
    }
    const requiredStrings = ['requestId', 'providerId', 'modelAlias', 'adapterVersion', 'output', 'finishReason'];
    for (const field of requiredStrings) {
        if (typeof result[field] !== 'string' || result[field].length === 0) {
            throw new Error(`MALFORMED_OUTPUT: missing ${field}`);
        }
    }
    if (!ALLOWED_FINISH_REASONS.has(result.finishReason)) {
        throw new Error(`MALFORMED_OUTPUT: invalid finishReason ${result.finishReason}`);
    }
    if (typeof result.latencyMs !== 'number' || result.latencyMs < 0) {
        throw new Error('MALFORMED_OUTPUT: latencyMs must be a non-negative number');
    }
    return true;
}

module.exports = {
    id: 'ai',
    version: '1.0.0',
    constitutionalInvariant: 'INV-AI-001',
    catalogPath: CATALOG_PATH,
    methods: [
        'invoke',
        'invokeStream',
        'listModels',
        'setModelStatus',
        'getAdminDiagnostics',
        'generateText',
        'embedText',
        'analyzeImage',
    ],
    routes: [
        'POST /v1/ai/invoke',
        'GET /v1/ai/models',
        'POST /v1/ai/admin/models/:alias/status',
        'GET /v1/ai/diagnostics',
    ],
    isValidCredentialRef,
    loadModelCatalog,
    validateModelCatalog,
    validateInferenceRequest,
    validateInferenceResult,
};
