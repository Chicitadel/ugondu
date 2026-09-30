/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Engine Core / Discovery
 * File           : index.ts
 * Version        : 2.0.0
 * Author         : Universal Discovery Engineering Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Classification : ENTERPRISE | INTERNAL
 *
 * Standards: ISO 27001, SOC 2, OWASP ASVS, NIST SP 800-53
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

import { __t } from '@ugondu/shared';

export interface DiscoveredProject {
    schemaVersion: '1.0.0';
    repositoryUrl: string;
    branch: string;
    detectedLanguages: string[];
    frameworks: string[];
    packageManagers: string[];
    entrypoints: string[];
    exposedPorts: number[];
    discoveredServices: string[];
    hasDockerfile: boolean;
    existingCI: string[];
}

export class DiscoveryEngine {
    public static inspectFileMap(repositoryUrl: string, branch: string, filePaths: string[]): DiscoveredProject {
        if (!repositoryUrl || !branch) {
            throw new Error(__t('invalid_ctx'));
        }

        const languages = new Set<string>();
        const frameworks = new Set<string>();
        const packageManagers = new Set<string>();
        const entrypoints: string[] = [];
        const exposedPorts: number[] = [];
        const services = new Set<string>();
        const existingCI: string[] = [];
        let hasDockerfile = false;

        for (const file of filePaths) {
            const lower = file.toLowerCase();

            // Language & Package Manager detection
            if (lower.endsWith('package.json') || lower.endsWith('package-lock.json')) {
                languages.add('nodejs');
                packageManagers.add('npm');
                entrypoints.push('index.js');
                exposedPorts.push(3000);
            }
            if (lower.endsWith('composer.json') || lower.endsWith('composer.lock')) {
                languages.add('php');
                packageManagers.add('composer');
                entrypoints.push('index.php');
                exposedPorts.push(80);
            }
            if (lower.endsWith('requirements.txt') || lower.endsWith('pyproject.toml')) {
                languages.add('python');
                packageManagers.add('pip');
                entrypoints.push('app.py');
                exposedPorts.push(8000);
            }
            if (lower.endsWith('go.mod')) {
                languages.add('go');
                packageManagers.add('go-modules');
                entrypoints.push('main.go');
            }

            // Docker detection
            if (lower.includes('dockerfile')) {
                hasDockerfile = true;
                services.add('container');
            }
            if (lower.includes('docker-compose')) {
                services.add('docker-compose');
            }

            // CI detection
            if (lower.includes('.github/workflows')) {
                existingCI.push('github-actions');
            }
            if (lower.includes('.gitlab-ci.yml')) {
                existingCI.push('gitlab-ci');
            }
            if (lower.includes('jenkinsfile')) {
                existingCI.push('jenkins');
            }
        }

        // Framework heuristics
        if (languages.has('nodejs')) {
            frameworks.add('express');
        }
        if (languages.has('php')) {
            frameworks.add('laravel');
        }

        return {
            schemaVersion: '1.0.0',
            repositoryUrl,
            branch,
            detectedLanguages: Array.from(languages),
            frameworks: Array.from(frameworks),
            packageManagers: Array.from(packageManagers),
            entrypoints,
            exposedPorts: Array.from(new Set(exposedPorts)),
            discoveredServices: Array.from(services),
            hasDockerfile,
            existingCI: Array.from(new Set(existingCI))
        };
    }
}
