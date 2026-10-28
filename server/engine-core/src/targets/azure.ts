/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Engine Core / Targets / Azure
 * File           : azure.ts
 * Version        : 1.0.0
 * Author         : Ignatus Chika Ujomor / Air Roofers SASU
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-27
 * Classification : ENTERPRISE
 *
 * Scope: deterministic, validated plan generation only. This adapter does not
 * call Azure APIs or claim live deployment support. Live execution requires
 * separately registered executor handlers and subscription-backed integration
 * evidence. Keep cloud credentials outside this configuration object.
 ******************************************************************************/

import { __t } from '@ugondu/shared';

export type AzureWorkloadKind =
    | 'arm-template'
    | 'bicep'
    | 'terraform'
    | 'app-service'
    | 'container-apps'
    | 'aks'
    | 'functions'
    | 'virtual-machines'
    | 'static-web-apps';

export type AzureIdentityMode = 'managed_identity' | 'workload_federation' | 'service_principal';

export interface AzureTargetConfig {
    targetId: string;
    tenantId: string;
    subscriptionId: string;
    resourceGroup: string;
    location: string;
    deploymentName: string;
    workloadKind: AzureWorkloadKind;
    identityMode: AzureIdentityMode;
    templatePath?: string;
    parametersPath?: string;
    artifactReference?: string;
}

export interface AzureDeploymentStep {
    action: string;
    payload: Record<string, string | boolean>;
}

export interface AzureDeploymentPlan {
    strategy: 'azure-plan-only';
    provider: 'azure';
    targetId: string;
    workloadKind: AzureWorkloadKind;
    steps: AzureDeploymentStep[];
    executionStatus: 'PLANNED_NOT_EXECUTED';
    liveExecutionRequired: true;
}

const WORKLOADS: AzureWorkloadKind[] = [
    'arm-template', 'bicep', 'terraform', 'app-service', 'container-apps',
    'aks', 'functions', 'virtual-machines', 'static-web-apps'
];

const IDENTITIES: AzureIdentityMode[] = [
    'managed_identity', 'workload_federation', 'service_principal'
];

function requireValue(name: string, value: string | undefined): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new Error(__t('azure_target_requires', name));
    }
    return value.trim();
}

function validateRelativePath(name: string, value: string | undefined): void {
    if (value === undefined) return;
    if (value.trim().length === 0 || value.startsWith('/') || value.startsWith('\\') ||
        value.split(/[\\/]+/).some(segment => segment === '..') ||
        /^[a-zA-Z]:/.test(value)) {
        throw new Error(__t('azure_unsafe_relative_path', name));
    }
}

export class AzureTargetAdapter {
    private readonly config: AzureTargetConfig;

    constructor(config: AzureTargetConfig) {
        if (!config || typeof config !== 'object') {
            throw new Error(__t('azure_target_config_required'));
        }
        const workloadKind = config.workloadKind;
        const identityMode = config.identityMode;
        if (!WORKLOADS.includes(workloadKind)) {
            throw new Error(__t('azure_unsupported_workload', String(workloadKind)));
        }
        if (!IDENTITIES.includes(identityMode)) {
            throw new Error(__t('azure_unsupported_identity', String(identityMode)));
        }
        validateRelativePath('templatePath', config.templatePath);
        validateRelativePath('parametersPath', config.parametersPath);
        if ((workloadKind === 'arm-template' || workloadKind === 'bicep') && !config.templatePath) {
            throw new Error(__t('azure_workload_requires_template', String(workloadKind)));
        }
        if (workloadKind === 'terraform' && !config.templatePath) {
            throw new Error(__t('azure_terraform_requires_template'));
        }

        this.config = {
            ...config,
            targetId: requireValue('targetId', config.targetId),
            tenantId: requireValue('tenantId', config.tenantId),
            subscriptionId: requireValue('subscriptionId', config.subscriptionId),
            resourceGroup: requireValue('resourceGroup', config.resourceGroup),
            location: requireValue('location', config.location),
            deploymentName: requireValue('deploymentName', config.deploymentName)
        };
    }

    public getCapabilities(): string[] {
        // Deliberately advertises planning/validation, not live deployment.
        return ['AZURE_TARGET_VALIDATION', 'AZURE_DEPLOYMENT_PLAN', 'AZURE_COST_GATE_REQUIRED', 'AZURE_LIVE_EXECUTION_EVIDENCE_REQUIRED'];
    }

    public validatePreconditions(): boolean {
        if (!/^[A-Za-z0-9][A-Za-z0-9._()-]{0,63}$/.test(this.config.deploymentName)) {
            throw new Error(__t('azure_deployment_name_invalid'));
        }
        if (this.config.resourceGroup.length > 90) {
            throw new Error(__t('azure_resource_group_too_long'));
        }
        return true;
    }

    public generateDeploymentPlan(): AzureDeploymentPlan {
        this.validatePreconditions();
        const base = {
            tenantId: this.config.tenantId,
            subscriptionId: this.config.subscriptionId,
            resourceGroup: this.config.resourceGroup,
            location: this.config.location,
            deploymentName: this.config.deploymentName,
            workloadKind: this.config.workloadKind,
            identityMode: this.config.identityMode
        };
        const steps: AzureDeploymentStep[] = [
            { action: 'AZURE_VALIDATE_CONTEXT', payload: { ...base, readOnly: true } },
            { action: 'AZURE_VALIDATE_CAPABILITIES_AND_QUOTAS', payload: { ...base, readOnly: true } },
            { action: 'AZURE_ESTIMATE_COST_AND_REQUIRE_BUDGET_APPROVAL', payload: { ...base, approvalRequired: true } }
        ];
        if (this.config.templatePath) {
            steps.push({
                action: 'AZURE_VALIDATE_IAC_INPUT',
                payload: { ...base, templatePath: this.config.templatePath, ...(this.config.parametersPath ? { parametersPath: this.config.parametersPath } : {}) }
            });
        }
        if (this.config.artifactReference) {
            steps.push({ action: 'AZURE_VALIDATE_ARTIFACT_PROVENANCE', payload: { ...base, artifactReference: this.config.artifactReference } });
        }
        steps.push(
            { action: 'AZURE_REQUIRE_EXECUTOR_REGISTRATION', payload: { ...base, failClosed: true } },
            { action: 'AZURE_VERIFY_DEPLOYMENT_AND_CAPTURE_EVIDENCE', payload: { ...base, liveEvidenceRequired: true } },
            { action: 'AZURE_VERIFY_CLEANUP_OR_PERSISTENCE_POLICY', payload: { ...base, cleanupMustBeExplicit: true } }
        );
        return {
            strategy: 'azure-plan-only',
            provider: 'azure',
            targetId: this.config.targetId,
            workloadKind: this.config.workloadKind,
            steps,
            executionStatus: 'PLANNED_NOT_EXECUTED',
            liveExecutionRequired: true
        };
    }
}
