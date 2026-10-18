/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Engine Core / AI / Model Catalog
 * File           : model-catalog.ts
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

import * as fs from 'fs';
import * as path from 'path';
import { __t } from '@ugondu/shared';
import {
    AdminAuthContext,
    AiGatewayError,
    CatalogModelEntry,
    CatalogProviderEntry,
    IdentityProtectionPolicy,
    ModelCatalogDocument,
    ModelStatus,
} from './contracts';
import { CredentialBroker } from './credential-broker';

export interface ModelStatusScope {
    productId?: string;
    environment?: string;
    region?: string;
    tenantId?: string;
}

export interface AdminCatalogChangeEvent {
    timestamp: string;
    actorId: string;
    targetType: 'model' | 'provider';
    targetId: string;
    previousStatus: ModelStatus;
    newStatus: ModelStatus;
    scope?: ModelStatusScope;
    reason: string;
}

export class ModelCatalog {
    private document!: ModelCatalogDocument;
    private readonly providersById = new Map<string, CatalogProviderEntry>();
    private readonly modelsByAlias = new Map<string, CatalogModelEntry>();
    private readonly scopedDisables = new Map<string, Set<string>>();
    private readonly changeHistory: AdminCatalogChangeEvent[] = [];

    constructor(catalogSource?: string | ModelCatalogDocument) {
        this.reload(catalogSource);
    }

    public static resolveDefaultCatalogPath(): string {
        const candidates = [
            process.env['UGONDU_MODEL_CATALOG_PATH'],
            path.resolve(process.cwd(), 'config/model-catalog.json'),
            path.resolve(__dirname, '../../../../config/model-catalog.json'),
            path.resolve(__dirname, '../../../../../config/model-catalog.json'),
        ].filter(Boolean) as string[];

        for (const candidate of candidates) {
            if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
                return candidate;
            }
        }
        return path.resolve(process.cwd(), 'config/model-catalog.json');
    }

    public reload(catalogSource?: string | ModelCatalogDocument): void {
        let parsed: ModelCatalogDocument;
        if (typeof catalogSource === 'object' && catalogSource !== null) {
            parsed = JSON.parse(JSON.stringify(catalogSource)) as ModelCatalogDocument;
        } else {
            const filePath = catalogSource || ModelCatalog.resolveDefaultCatalogPath();
            if (!fs.existsSync(filePath)) {
                throw new AiGatewayError(
                    'CATALOG_INVALID',
                    __t('ai.error.catalog_file_missing'),
                    500,
                    { filePath }
                );
            }
            const raw = fs.readFileSync(filePath, 'utf8');
            parsed = JSON.parse(raw) as ModelCatalogDocument;
        }

        ModelCatalog.validateCatalogDocument(parsed);

        this.document = parsed;
        this.providersById.clear();
        this.modelsByAlias.clear();
        this.scopedDisables.clear();

        for (const provider of parsed.providers) {
            this.providersById.set(provider.providerId, { ...provider });
        }
        for (const model of parsed.models) {
            this.modelsByAlias.set(model.alias, JSON.parse(JSON.stringify(model)));
        }
    }

    public static validateCatalogDocument(doc: ModelCatalogDocument): void {
        if (!doc || typeof doc !== 'object') {
            throw new AiGatewayError('CATALOG_INVALID', __t('ai.error.catalog_invalid_root'), 500);
        }
        if (typeof doc.schemaVersion !== 'string' || !doc.schemaVersion.trim()) {
            throw new AiGatewayError('CATALOG_INVALID', __t('ai.error.catalog_missing_schema_version'), 500);
        }
        if (!Array.isArray(doc.providers) || doc.providers.length === 0) {
            throw new AiGatewayError('CATALOG_INVALID', __t('ai.error.catalog_empty_providers'), 500);
        }
        if (!Array.isArray(doc.models) || doc.models.length === 0) {
            throw new AiGatewayError('CATALOG_INVALID', __t('ai.error.catalog_empty_models'), 500);
        }

        const seenProviders = new Set<string>();
        for (const provider of doc.providers) {
            if (!provider.providerId || typeof provider.providerId !== 'string') {
                throw new AiGatewayError('CATALOG_INVALID', __t('ai.error.catalog_provider_id_invalid'), 500);
            }
            if (seenProviders.has(provider.providerId)) {
                throw new AiGatewayError(
                    'CATALOG_INVALID',
                    __t('ai.error.catalog_duplicate_provider'),
                    500,
                    { providerId: provider.providerId }
                );
            }
            if (!CredentialBroker.isValidCredentialRef(provider.credentialRef)) {
                throw new AiGatewayError(
                    'CATALOG_INVALID',
                    __t('ai.error.catalog_invalid_credential_ref'),
                    500,
                    { providerId: provider.providerId }
                );
            }
            seenProviders.add(provider.providerId);
        }

        const seenAliases = new Set<string>();
        for (const model of doc.models) {
            if (!model.alias || typeof model.alias !== 'string') {
                throw new AiGatewayError('CATALOG_INVALID', __t('ai.error.catalog_model_alias_invalid'), 500);
            }
            if (seenAliases.has(model.alias)) {
                throw new AiGatewayError(
                    'CATALOG_DUPLICATE_ALIAS',
                    __t('ai.error.catalog_duplicate_alias'),
                    500,
                    { alias: model.alias }
                );
            }
            seenAliases.add(model.alias);

            if (!seenProviders.has(model.providerId)) {
                throw new AiGatewayError(
                    'CATALOG_INVALID',
                    __t('ai.error.catalog_unknown_provider_for_model'),
                    500,
                    { alias: model.alias, providerId: model.providerId }
                );
            }
            if (
                typeof model.providerModelIdRef !== 'string' ||
                !model.providerModelIdRef.startsWith('secretless-registry://')
            ) {
                throw new AiGatewayError(
                    'CATALOG_INVALID',
                    __t('ai.error.catalog_invalid_model_id_ref'),
                    500,
                    { alias: model.alias }
                );
            }
            if (!CredentialBroker.isValidCredentialRef(model.credentialRef)) {
                throw new AiGatewayError(
                    'CATALOG_INVALID',
                    __t('ai.error.catalog_invalid_credential_ref'),
                    500,
                    { alias: model.alias }
                );
            }
            if (!['enabled', 'disabled', 'deprecated'].includes(model.status)) {
                throw new AiGatewayError(
                    'CATALOG_INVALID',
                    __t('ai.error.catalog_invalid_status'),
                    500,
                    { alias: model.alias, status: model.status }
                );
            }
            if (
                !Array.isArray(model.allowedRegions) ||
                model.allowedRegions.length === 0 ||
                !Array.isArray(model.dataClassifications) ||
                model.dataClassifications.length === 0 ||
                !Array.isArray(model.environments) ||
                model.environments.length === 0
            ) {
                throw new AiGatewayError(
                    'CATALOG_INVALID',
                    __t('ai.error.catalog_missing_policy_arrays'),
                    500,
                    { alias: model.alias }
                );
            }
            if (
                !model.policy ||
                typeof model.policy.timeoutMs !== 'number' ||
                model.policy.timeoutMs <= 0 ||
                typeof model.policy.maxOutputTokens !== 'number' ||
                model.policy.maxOutputTokens <= 0
            ) {
                throw new AiGatewayError(
                    'CATALOG_INVALID',
                    __t('ai.error.catalog_invalid_policy_limits'),
                    500,
                    { alias: model.alias }
                );
            }
            if (!model.governance || !model.governance.owner || !model.governance.approver) {
                throw new AiGatewayError(
                    'CATALOG_INVALID',
                    __t('ai.error.catalog_missing_governance'),
                    500,
                    { alias: model.alias }
                );
            }
        }
    }

    public getSchemaVersion(): string {
        return this.document.schemaVersion;
    }

    public getIdentityPolicy(): IdentityProtectionPolicy {
        return (
            this.document.identityPolicy || {
                productIdentityName: 'Ugondu Universal Deployment Intelligence Assistant',
                organization: 'Air Roofers Ltd',
                discloseInternalProviderToEndUser: false,
                identityResponseToken: 'ai.identity.product_response',
            }
        );
    }

    public getModel(alias: string): CatalogModelEntry | undefined {
        const entry = this.modelsByAlias.get(alias);
        return entry ? JSON.parse(JSON.stringify(entry)) : undefined;
    }

    public getProvider(providerId: string): CatalogProviderEntry | undefined {
        const entry = this.providersById.get(providerId);
        return entry ? { ...entry } : undefined;
    }

    public listModels(includeDisabled = false): CatalogModelEntry[] {
        const all = Array.from(this.modelsByAlias.values()).map(m => JSON.parse(JSON.stringify(m)));
        if (includeDisabled) {
            return all;
        }
        return all.filter(m => {
            const prov = this.providersById.get(m.providerId);
            return m.status === 'enabled' && prov?.status === 'enabled';
        });
    }

    public listProviders(): CatalogProviderEntry[] {
        return Array.from(this.providersById.values()).map(p => ({ ...p }));
    }

    public isModelScopedDisabled(alias: string, scope: ModelStatusScope): boolean {
        const set = this.scopedDisables.get(alias);
        if (!set || set.size === 0) {
            return false;
        }
        const keysToCheck = [
            scope.productId ? `product:${scope.productId}` : '',
            scope.environment ? `env:${scope.environment}` : '',
            scope.region ? `region:${scope.region}` : '',
            scope.tenantId ? `tenant:${scope.tenantId}` : '',
        ].filter(Boolean);

        return keysToCheck.some(k => set.has(k));
    }

    public activateModel(
        alias: string,
        auth: AdminAuthContext,
        scope?: ModelStatusScope
    ): AdminCatalogChangeEvent {
        return this.setModelStatus(alias, 'enabled', auth, scope);
    }

    public deactivateModel(
        alias: string,
        auth: AdminAuthContext,
        scope?: ModelStatusScope
    ): AdminCatalogChangeEvent {
        return this.setModelStatus(alias, 'disabled', auth, scope);
    }

    public setModelStatus(
        alias: string,
        status: ModelStatus,
        auth: AdminAuthContext,
        scope?: ModelStatusScope
    ): AdminCatalogChangeEvent {
        this.assertAdminAuthorized(auth);

        const model = this.modelsByAlias.get(alias);
        if (!model) {
            throw new AiGatewayError('MODEL_NOT_FOUND', __t('ai.error.model_not_found'), 404, { alias });
        }

        const provider = this.providersById.get(model.providerId);
        if (status === 'enabled') {
            if (!provider || provider.status !== 'enabled') {
                throw new AiGatewayError(
                    'PROVIDER_DISABLED',
                    __t('ai.error.cannot_activate_model_provider_disabled'),
                    409,
                    { alias, providerId: model.providerId }
                );
            }
            if (model.conformance && model.conformance.contractTestsPassed === false) {
                throw new AiGatewayError(
                    'MODEL_CONFORMANCE_FAILED',
                    __t('ai.error.model_conformance_failed'),
                    409,
                    { alias }
                );
            }
        }

        const previousStatus = model.status;
        if (scope && (scope.productId || scope.environment || scope.region || scope.tenantId)) {
            if (!this.scopedDisables.has(alias)) {
                this.scopedDisables.set(alias, new Set());
            }
            const set = this.scopedDisables.get(alias)!;
            const keys = [
                scope.productId ? `product:${scope.productId}` : '',
                scope.environment ? `env:${scope.environment}` : '',
                scope.region ? `region:${scope.region}` : '',
                scope.tenantId ? `tenant:${scope.tenantId}` : '',
            ].filter(Boolean);

            for (const key of keys) {
                if (status === 'disabled') {
                    set.add(key);
                } else {
                    set.delete(key);
                }
            }
        } else {
            model.status = status;
        }

        const event: AdminCatalogChangeEvent = {
            timestamp: new Date().toISOString(),
            actorId: auth.actorId,
            targetType: 'model',
            targetId: alias,
            previousStatus,
            newStatus: status,
            scope,
            reason: auth.reason || 'Administrative status update',
        };
        this.changeHistory.push(event);
        return event;
    }

    public setProviderStatus(
        providerId: string,
        status: ModelStatus,
        auth: AdminAuthContext
    ): AdminCatalogChangeEvent {
        this.assertAdminAuthorized(auth);
        const provider = this.providersById.get(providerId);
        if (!provider) {
            throw new AiGatewayError('PROVIDER_NOT_FOUND', __t('ai.error.provider_not_found'), 404, {
                providerId,
            });
        }
        const previousStatus = provider.status;
        provider.status = status;

        const event: AdminCatalogChangeEvent = {
            timestamp: new Date().toISOString(),
            actorId: auth.actorId,
            targetType: 'provider',
            targetId: providerId,
            previousStatus,
            newStatus: status,
            reason: auth.reason || 'Administrative provider status update',
        };
        this.changeHistory.push(event);
        return event;
    }

    public getChangeHistory(): AdminCatalogChangeEvent[] {
        return [...this.changeHistory];
    }

    private assertAdminAuthorized(auth: AdminAuthContext): void {
        if (!auth || !auth.actorId || auth.role !== 'admin') {
            throw new AiGatewayError(
                'UNAUTHORIZED_ADMIN',
                __t('ai.error.unauthorized_admin'),
                403
            );
        }
    }
}
