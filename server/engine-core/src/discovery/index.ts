/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Engine Core / Discovery
 * File           : index.ts
 * Version        : 2.1.0
 * Author         : Universal Discovery Engineering Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Last Modified  : 2026-09-30
 * Classification : ENTERPRISE | INTERNAL
 *
 * Standards: ISO 27001, SOC 2, OWASP ASVS, NIST SP 800-53
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

import { __t } from '@ugondu/shared';

export interface DiscoveryEvidence {
    technology: string;
    category: 'language' | 'framework' | 'package-manager' | 'service' | 'ci' | 'port';
    sourceFile: string;
    matchedPattern: string;
    confidence: 'DEFINITIVE' | 'EVIDENCE_BACKED' | 'HEURISTIC';
}

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
    evidence: DiscoveryEvidence[];
}

export class DiscoveryEngine {
    public static inspectFileMap(
        repositoryUrl: string,
        branch: string,
        filePaths: string[],
        fileContents?: Record<string, string>
    ): DiscoveredProject {
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
        const evidence: DiscoveryEvidence[] = [];
        let hasDockerfile = false;

        for (const file of filePaths) {
            const lower = file.toLowerCase();

            // Language & Package Manager detection
            if (lower.endsWith('package.json') || lower.endsWith('package-lock.json')) {
                languages.add('nodejs');
                packageManagers.add('npm');
                evidence.push({
                    technology: 'nodejs',
                    category: 'language',
                    sourceFile: file,
                    matchedPattern: file,
                    confidence: 'DEFINITIVE'
                });
                evidence.push({
                    technology: 'npm',
                    category: 'package-manager',
                    sourceFile: file,
                    matchedPattern: file,
                    confidence: 'DEFINITIVE'
                });

                // Evidence-based framework inspection from actual file content
                if (fileContents && fileContents[file]) {
                    try {
                        const pkg = JSON.parse(fileContents[file]);
                        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
                        if (deps['express']) {
                            frameworks.add('express');
                            evidence.push({ technology: 'express', category: 'framework', sourceFile: file, matchedPattern: 'dependencies.express', confidence: 'DEFINITIVE' });
                        }
                        if (deps['@nestjs/core']) {
                            frameworks.add('nestjs');
                            evidence.push({ technology: 'nestjs', category: 'framework', sourceFile: file, matchedPattern: 'dependencies.@nestjs/core', confidence: 'DEFINITIVE' });
                        }
                        if (deps['fastify']) {
                            frameworks.add('fastify');
                            evidence.push({ technology: 'fastify', category: 'framework', sourceFile: file, matchedPattern: 'dependencies.fastify', confidence: 'DEFINITIVE' });
                        }
                    } catch {}
                } else {
                    // Fallback to convention
                    entrypoints.push('index.js');
                }
            }

            if (lower.endsWith('composer.json') || lower.endsWith('composer.lock')) {
                languages.add('php');
                packageManagers.add('composer');
                evidence.push({ technology: 'php', category: 'language', sourceFile: file, matchedPattern: file, confidence: 'DEFINITIVE' });
                evidence.push({ technology: 'composer', category: 'package-manager', sourceFile: file, matchedPattern: file, confidence: 'DEFINITIVE' });

                if (fileContents && fileContents[file]) {
                    try {
                        const composer = JSON.parse(fileContents[file]);
                        const reqs = { ...composer.require, ...composer['require-dev'] };
                        if (reqs['laravel/framework']) {
                            frameworks.add('laravel');
                            evidence.push({ technology: 'laravel', category: 'framework', sourceFile: file, matchedPattern: 'require.laravel/framework', confidence: 'DEFINITIVE' });
                        }
                    } catch {}
                }
            }

            if (lower.endsWith('requirements.txt') || lower.endsWith('pyproject.toml')) {
                languages.add('python');
                packageManagers.add('pip');
                entrypoints.push('app.py');
                evidence.push({ technology: 'python', category: 'language', sourceFile: file, matchedPattern: file, confidence: 'DEFINITIVE' });
            }

            if (lower.endsWith('go.mod')) {
                languages.add('go');
                packageManagers.add('go-modules');
                entrypoints.push('main.go');
                evidence.push({ technology: 'go', category: 'language', sourceFile: file, matchedPattern: file, confidence: 'DEFINITIVE' });
            }

            // Docker detection
            if (lower.includes('dockerfile')) {
                hasDockerfile = true;
                services.add('container');
                evidence.push({ technology: 'container', category: 'service', sourceFile: file, matchedPattern: file, confidence: 'DEFINITIVE' });

                // Inspect real exposed ports from Dockerfile content
                if (fileContents && fileContents[file]) {
                    const portMatches = fileContents[file].matchAll(/EXPOSE\s+(\d+)/gi);
                    for (const m of portMatches) {
                        const port = parseInt(m[1], 10);
                        if (!isNaN(port)) {
                            exposedPorts.push(port);
                            evidence.push({ technology: `${port}`, category: 'port', sourceFile: file, matchedPattern: m[0], confidence: 'DEFINITIVE' });
                        }
                    }
                }
            }

            if (lower.includes('docker-compose')) {
                services.add('docker-compose');
                evidence.push({ technology: 'docker-compose', category: 'service', sourceFile: file, matchedPattern: file, confidence: 'DEFINITIVE' });
            }

            // CI detection
            if (lower.includes('.github/workflows')) {
                existingCI.push('github-actions');
                evidence.push({ technology: 'github-actions', category: 'ci', sourceFile: file, matchedPattern: file, confidence: 'DEFINITIVE' });
            }
            if (lower.includes('.gitlab-ci.yml')) {
                existingCI.push('gitlab-ci');
                evidence.push({ technology: 'gitlab-ci', category: 'ci', sourceFile: file, matchedPattern: file, confidence: 'DEFINITIVE' });
            }
            if (lower.includes('jenkinsfile')) {
                existingCI.push('jenkins');
                evidence.push({ technology: 'jenkins', category: 'ci', sourceFile: file, matchedPattern: file, confidence: 'DEFINITIVE' });
            }
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
            existingCI: Array.from(new Set(existingCI)),
            evidence
        };
    }
}
