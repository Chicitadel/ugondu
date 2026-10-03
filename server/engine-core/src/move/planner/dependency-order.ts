/******************************************************************************
 * Project        : Ugondu
 * Module         : move/planner
 * File           : dependency-order.ts
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
// @ts-ignore
import { __t } from '../../../../shared/i18n';


import { GraphBuilder } from './graph-builder';

/**
 * @class DependencyOrder
 * @description Corporate Governed class implementation for DependencyOrder
 * @classification ENTERPRISE
 */
export class DependencyOrder {
    static topologicalSort(graphBuilder: GraphBuilder): string[] {
        const graph = graphBuilder.getGraph();
        const inDegree = new Map<string, number>();
        const queue: string[] = [];
        const result: string[] = [];

        for (const node of graph.keys()) {
            inDegree.set(node, 0);
        }

        for (const edges of graph.values()) {
            for (const dest of edges) {
                inDegree.set(dest, (inDegree.get(dest) || 0) + 1);
            }
        }

        for (const [node, degree] of inDegree.entries()) {
            if (degree === 0) {
                queue.push(node);
            }
        }

        while (queue.length > 0) {
            const current = queue.shift()!;
            result.push(current);

            const neighbors = graph.get(current) || [];
            for (const neighbor of neighbors) {
                inDegree.set(neighbor, inDegree.get(neighbor)! - 1);
                if (inDegree.get(neighbor) === 0) {
                    queue.push(neighbor);
                }
            }
        }

        if (result.length !== graph.size) {
            throw new Error(__t('messages.error.cycle_detected_in_dependency_graph'));
        }

        return result;
    }
}
