/******************************************************************************
 * Project        : Ugondu
 * Module         : move/planner
 * File           : graph-builder.ts
 * Version        : 1.0.0
 * Author         : Elite Ugondu Move Engineer
 * Organization   : Air Roofers
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Corporate Governed
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

export class GraphBuilder {
    private graph: Map<string, string[]> = new Map();

    addNode(node: string): void {
        if (!this.graph.has(node)) {
            this.graph.set(node, []);
        }
    }

    addEdge(from: string, to: string): void {
        this.addNode(from);
        this.addNode(to);
        this.graph.get(from)!.push(to);
    }

    getGraph(): Map<string, string[]> {
        return this.graph;
    }
}
