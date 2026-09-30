/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Engine Core / Migration
 * File           : parsers.ts
 * Version        : 2.0.0
 * Author         : CI/CD Migration Engineering Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Classification : ENTERPRISE | INTERNAL
 *
 * Standards: ISO 27001, SOC 2, OWASP ASVS, NIST SP 800-53
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

import { __t } from '@ugondu/shared';

export interface MigrationPlanResult {
    sourceType: 'jenkins' | 'github-actions' | 'gitlab-ci' | 'docker-compose';
    extractedActions: Array<{ action: string; payload: Record<string, any> }>;
    compatibilityWarnings: string[];
    suggestedStrategy: 'atomic' | 'quota-sync' | 'container-swap';
}

export class MigrationEngine {
    public static parseJenkinsfile(content: string): MigrationPlanResult {
        const warnings: string[] = [];
        const actions: Array<{ action: string; payload: Record<string, any> }> = [];

        actions.push({ action: 'FETCH_REPOSITORY', payload: { branch: 'main' } });

        if (content.includes('npm install') || content.includes('npm ci')) {
            actions.push({ action: 'NODE_INSTALL', payload: { workingDirectory: '.' } });
        }
        if (content.includes('composer install')) {
            actions.push({ action: 'COMPOSER_INSTALL', payload: { workingDirectory: '.' } });
        }
        if (content.includes('sh ') || content.includes('bat ')) {
            warnings.push('LEGACY_SHELL_STEP_CONVERTED_TO_TYPED_ACTION');
        }

        actions.push({ action: 'SYNC_ENVIRONMENT', payload: { strategy: 'atomic' } });
        actions.push({ action: 'PRUNE_RELEASES', payload: { retention: 3 } });

        return {
            sourceType: 'jenkins',
            extractedActions: actions,
            compatibilityWarnings: warnings,
            suggestedStrategy: 'atomic'
        };
    }

    public static parseGitHubActions(yamlContent: string): MigrationPlanResult {
        const warnings: string[] = [];
        const actions: Array<{ action: string; payload: Record<string, any> }> = [];

        actions.push({ action: 'FETCH_REPOSITORY', payload: { branch: 'main' } });

        if (yamlContent.includes('actions/setup-node') || yamlContent.includes('npm')) {
            actions.push({ action: 'NODE_INSTALL', payload: { workingDirectory: '.' } });
        }
        if (yamlContent.includes('shivammathur/setup-php') || yamlContent.includes('composer')) {
            actions.push({ action: 'COMPOSER_INSTALL', payload: { workingDirectory: '.' } });
        }
        if (yamlContent.includes('run:')) {
            warnings.push('RAW_RUN_STEP_MIGRATED_TO_TYPED_ACTION');
        }

        actions.push({ action: 'SYNC_ENVIRONMENT', payload: { strategy: 'atomic' } });
        actions.push({ action: 'PRUNE_RELEASES', payload: { retention: 3 } });

        return {
            sourceType: 'github-actions',
            extractedActions: actions,
            compatibilityWarnings: warnings,
            suggestedStrategy: 'atomic'
        };
    }

    public static parseGitLabCI(yamlContent: string): MigrationPlanResult {
        const warnings: string[] = [];
        const actions: Array<{ action: string; payload: Record<string, any> }> = [];

        actions.push({ action: 'FETCH_REPOSITORY', payload: { branch: 'main' } });

        if (yamlContent.includes('composer')) {
            actions.push({ action: 'COMPOSER_INSTALL', payload: { workingDirectory: '.' } });
        }
        if (yamlContent.includes('npm')) {
            actions.push({ action: 'NODE_INSTALL', payload: { workingDirectory: '.' } });
        }

        actions.push({ action: 'SYNC_ENVIRONMENT', payload: { strategy: 'atomic' } });
        actions.push({ action: 'PRUNE_RELEASES', payload: { retention: 3 } });

        return {
            sourceType: 'gitlab-ci',
            extractedActions: actions,
            compatibilityWarnings: warnings,
            suggestedStrategy: 'atomic'
        };
    }

    public static parseDockerCompose(yamlContent: string): MigrationPlanResult {
        const warnings: string[] = [];
        const actions: Array<{ action: string; payload: Record<string, any> }> = [];

        actions.push({ action: 'FETCH_REPOSITORY', payload: { branch: 'main' } });
        actions.push({
            action: 'SYNC_ENVIRONMENT',
            payload: { strategy: 'container-swap', parsedCompose: true }
        });
        actions.push({ action: 'PRUNE_RELEASES', payload: { retention: 3 } });

        return {
            sourceType: 'docker-compose',
            extractedActions: actions,
            compatibilityWarnings: warnings,
            suggestedStrategy: 'container-swap'
        };
    }
}
