/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Engine Core / Graph / Knowledge
 * File           : knowledge.ts
 * Version        : 2.0.0
 * Author         : Technology Knowledge Graph Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Classification : ENTERPRISE | INTERNAL
 *
 * Standards: ISO 27001, SOC 2, OWASP ASVS, NIST SP 800-53
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

import { __t } from '@ugondu/shared';

/**
 * @interface TechRelationship
 * @description Corporate Governed interface implementation for TechRelationship
 * @classification ENTERPRISE
 */
export interface TechRelationship {
    source: string;
    target: string;
    type: 'requires' | 'supports' | 'depends-on' | 'conflicts-with' | 'compatible-with' | 'optimized-for';
}

/**
 * @class TechnologyKnowledgeGraph
 * @description Corporate Governed class implementation for TechnologyKnowledgeGraph
 * @classification ENTERPRISE
 */
export class TechnologyKnowledgeGraph {
    private relationships: TechRelationship[] = [];

    constructor() {
        this.bootstrapCoreKnowledge();
    }

    private bootstrapCoreKnowledge(): void {
        this.addRelationship('nodejs', 'NODE_INSTALL', 'requires');
        this.addRelationship('php', 'COMPOSER_INSTALL', 'requires');
        this.addRelationship('cpanel', 'SYNC_ENVIRONMENT', 'requires');
        this.addRelationship('cpanel', 'quota-sync', 'optimized-for');
        this.addRelationship('cpanel', 'atomic', 'conflicts-with');
        this.addRelationship('docker', 'container-swap', 'optimized-for');
        this.addRelationship('kubernetes', 'RollingUpdate', 'optimized-for');
    }

    public addRelationship(source: string, target: string, type: TechRelationship['type']): void {
        this.relationships.push({ source, target, type });
    }

    public resolveRequiredActions(technologies: string[]): string[] {
        const required = new Set<string>(['FETCH_REPOSITORY', 'SYNC_ENVIRONMENT', 'PRUNE_RELEASES']);
        for (const tech of technologies) {
            for (const rel of this.relationships) {
                if (rel.source === tech && rel.type === 'requires') {
                    required.add(rel.target);
                }
            }
        }
        return Array.from(required);
    }

    public detectConflicts(technology: string, strategy: string): boolean {
        return this.relationships.some(
            rel => rel.source === technology && rel.target === strategy && rel.type === 'conflicts-with'
        );
    }
}

export const globalTechnologyGraph = new TechnologyKnowledgeGraph();
