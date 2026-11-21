/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Engine Core / UPM
 * File           : model.ts
 * Version        : 2.0.0
 * Author         : Universal Project Model Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Classification : ENTERPRISE | INTERNAL
 *
 * Standards: ISO 27001, SOC 2, OWASP ASVS, NIST SP 800-53
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

import { __t } from '@ugondu/shared';

/**
 * @interface UpmComponent
 * @description Corporate Governed interface implementation for UpmComponent
 * @classification ENTERPRISE
 */
export interface UpmComponent {
    id: string;
    name: string;
    type: 'web' | 'api' | 'worker' | 'database' | 'static';
    runtime: string;
}

/**
 * @interface UpmDependency
 * @description Corporate Governed interface implementation for UpmDependency
 * @classification ENTERPRISE
 */
export interface UpmDependency {
    source: string;
    target: string;
    relation: 'requires' | 'supports' | 'depends-on' | 'conflicts-with';
}

/**
 * @interface UniversalProjectModel
 * @description Corporate Governed interface implementation for UniversalProjectModel
 * @classification ENTERPRISE
 */
export interface UniversalProjectModel {
    schemaVersion: '1.0.0';
    projectId: string;
    projectName: string;
    components: UpmComponent[];
    dependencies: UpmDependency[];
    services: string[];
    infrastructure: {
        targetEnvironment: string;
    };
    policies: string[];
}

/**
 * @class UpmManager
 * @description Corporate Governed class implementation for UpmManager
 * @classification ENTERPRISE
 */
export class UpmManager {
    public static createProjectModel(params: {
        projectId: string;
        projectName: string;
        components: UpmComponent[];
        dependencies?: UpmDependency[];
        services?: string[];
        targetEnvironment: string;
        policies?: string[];
    }): UniversalProjectModel {
        if (!params.projectId || !params.projectName || !params.targetEnvironment) {
            throw new Error(__t('msg_invalid_deploymentcontext_missing_requir'));
        }

        return {
            schemaVersion: '1.0.0',
            projectId: params.projectId,
            projectName: params.projectName,
            components: params.components || [],
            dependencies: params.dependencies || [],
            services: params.services || [],
            infrastructure: {
                targetEnvironment: params.targetEnvironment
            },
            policies: params.policies || []
        };
    }

    public static validateModel(model: UniversalProjectModel): boolean {
        if (model.schemaVersion !== '1.0.0') {
            throw new Error(__t('error_schema_invalid'));
        }
        if (!model.projectId || !model.projectName || !model.infrastructure || !model.infrastructure.targetEnvironment) {
            throw new Error(__t('msg_invalid_deploymentcontext_missing_requir'));
        }
        return true;
    }
}
