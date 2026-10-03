/******************************************************************************
 * Project        : Ugondu
 * Module         : engine-core/twin
 * File           : graph.ts
 * Version        : 1.0.0
 * Author         : Air Roofers Engineering
 * Organization   : Air Roofers
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS
 * - NIST
 *
 * Signatures:
 * - Architecture Authority
 * - Security Authority
 * - Governance Authority
 * - Deployment Authority
 *
 * Copyright (c) 2026 Air Roofers
 * All Rights Reserved.
 ******************************************************************************/

export interface DependencyEdge {
    sourceId: string;
    targetId: string;
    type: 'DEPENDS_ON' | 'RUNS_ON';
}

/**
 * @class DependencyGraph
 * @description Corporate Governed class implementation for DependencyGraph
 * @classification ENTERPRISE
 */
export class DependencyGraph {
    private edges: DependencyEdge[] = [];
    private reverseIndex: Map<string, DependencyEdge[]> = new Map();
    private forwardIndex: Map<string, DependencyEdge[]> = new Map();

    public addEdge(edge: DependencyEdge): void {
        this.edges.push(edge);
        
        const fwd = this.forwardIndex.get(edge.sourceId) || [];
        fwd.push(edge);
        this.forwardIndex.set(edge.sourceId, fwd);
        
        const rev = this.reverseIndex.get(edge.targetId) || [];
        rev.push(edge);
        this.reverseIndex.set(edge.targetId, rev);
    }

    public getDependencies(sourceId: string): DependencyEdge[] {
        return this.forwardIndex.get(sourceId) || [];
    }

    public getDependents(targetId: string): DependencyEdge[] {
        return this.reverseIndex.get(targetId) || [];
    }
}
