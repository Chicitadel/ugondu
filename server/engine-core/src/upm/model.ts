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

export interface UpmComponent {
    id: string;
    name: string;
    type: 'web' | 'api' | 'worker' | 'database' | 'static';
    runtime: string;
}

export interface UpmDependency {
    source: string;
    target: string;
    relation: 'requires' | 'supports' | 'depends-on' | 'conflicts-with';
}

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
            throw new Error(__t('invalid_ctx'));
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
            throw new Error(__t('invalid_ctx'));
        }
        return true;
    }
}
