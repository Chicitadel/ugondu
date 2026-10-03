/******************************************************************************
 * Project        : Ugondu
 * Module         : engine-core/twin
 * File           : calculator.ts
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

import { DependencyGraph } from '../dependency/graph';

/**
 * @class BlastRadiusCalculator
 * @description Corporate Governed class implementation for BlastRadiusCalculator
 * @classification ENTERPRISE
 */
export class BlastRadiusCalculator {
    constructor(private graph: DependencyGraph) {}

    public calculate(targetId: string): Set<string> {
        const affected = new Set<string>();
        const queue = [targetId];

        while (queue.length > 0) {
            const current = queue.shift()!;
            if (!affected.has(current)) {
                affected.add(current);
                const dependents = this.graph.getDependents(current);
                for (const dep of dependents) {
                    if (!affected.has(dep.sourceId)) {
                        queue.push(dep.sourceId);
                    }
                }
            }
        }

        return affected;
    }
}
