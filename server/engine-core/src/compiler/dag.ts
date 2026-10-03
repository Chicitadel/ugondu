/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Engine Core / Compiler / DAG
 * File           : dag.ts
 * Version        : 2.0.0
 * Author         : Plan Compiler Engineering Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Classification : ENTERPRISE | INTERNAL
 *
 * Standards: ISO 27001, SOC 2, OWASP ASVS, NIST SP 800-53
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

import { createHash } from 'crypto';
import canonicalize from 'canonicalize';
import { __t } from '@ugondu/shared';

/**
 * @interface DagNode
 * @description Corporate Governed interface implementation for DagNode
 * @classification ENTERPRISE
 */
export interface DagNode {
    id: string;
    action: string;
    order: number;
    canRollback: boolean;
    rollbackAction?: string;
    payload: Record<string, any>;
}

/**
 * @interface DagEdge
 * @description Corporate Governed interface implementation for DagEdge
 * @classification ENTERPRISE
 */
export interface DagEdge {
    from: string;
    to: string;
}

/**
 * @interface ExecutionGraphDAG
 * @description Corporate Governed interface implementation for ExecutionGraphDAG
 * @classification ENTERPRISE
 */
export interface ExecutionGraphDAG {
    schemaVersion: '1.0.0';
    graphId: string;
    planHash: string;
    nodes: DagNode[];
    edges: DagEdge[];
    rootNodeId: string;
    terminalNodeIds: string[];
}

/**
 * @class PlanCompiler
 * @description Corporate Governed class implementation for PlanCompiler
 * @classification ENTERPRISE
 */
export class PlanCompiler {
    public static compileExecutionGraph(actions: Array<{ action: string; payload: Record<string, any> }>): ExecutionGraphDAG {
        if (!Array.isArray(actions) || actions.length === 0) {
            throw new Error(__t('error_payload_required'));
        }

        const nodes: DagNode[] = [];
        const edges: DagEdge[] = [];

        actions.forEach((act, idx) => {
            const nodeId = `node_${idx + 1}_${act.action.toLowerCase()}`;
            const canRollback = ['SYNC_ENVIRONMENT', 'SYMLINK', 'SERVICE_RESTART'].includes(act.action);
            const rollbackAction = canRollback ? 'PRUNE_RELEASES' : undefined;

            nodes.push({
                id: nodeId,
                action: act.action,
                order: idx,
                canRollback,
                rollbackAction,
                payload: act.payload
            });

            if (idx > 0) {
                edges.push({
                    from: nodes[idx - 1].id,
                    to: nodeId
                });
            }
        });

        const canonicalPayload = canonicalize(actions) || '[]';
        const planHash = createHash('sha256').update(canonicalPayload).digest('hex');

        return {
            schemaVersion: '1.0.0',
            graphId: `graph_${planHash.substring(0, 16)}`,
            planHash,
            nodes,
            edges,
            rootNodeId: nodes[0].id,
            terminalNodeIds: [nodes[nodes.length - 1].id]
        };
    }
}
