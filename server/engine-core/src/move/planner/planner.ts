/******************************************************************************
 * Project        : Ugondu
 * Module         : move/planner
 * File           : planner.ts
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

import { GraphBuilder } from './graph-builder';
import { DependencyOrder } from './dependency-order';
import { StrategySelector, MigrationStrategy } from './strategy-selector';

export interface MigrationTask {
    id: string;
    resourceType: string;
    complexityScore: number;
    dependencies: string[];
}

export class MigrationPlanner {
    private graphBuilder = new GraphBuilder();
    private strategySelector = new StrategySelector();

    plan(tasks: MigrationTask[]): { order: string[], strategies: Record<string, MigrationStrategy> } {
        const strategies: Record<string, MigrationStrategy> = {};
        
        for (const task of tasks) {
            this.graphBuilder.addNode(task.id);
            strategies[task.id] = this.strategySelector.selectStrategy(task.resourceType, task.complexityScore);
            for (const dep of task.dependencies) {
                this.graphBuilder.addEdge(dep, task.id);
            }
        }

        const order = DependencyOrder.topologicalSort(this.graphBuilder);
        return { order, strategies };
    }
}
