/******************************************************************************
 * Project        : Ugondu
 * Module         : Assurance
 * File           : dependency-order.ts
 * Version        : 1.0.0
 * Author         : Enterprise Architecture Team
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

export class DependencyOrderManager {
    private readonly dependencies: Map<string, Set<string>> = new Map();

    public addDependency(resource: string, dependsOn: string): void {
        if (!this.dependencies.has(resource)) {
            this.dependencies.set(resource, new Set());
        }
        this.dependencies.get(resource)!.add(dependsOn);
    }

    public computeRestoreOrder(resources: string[]): string[] {
        const order: string[] = [];
        const visited: Set<string> = new Set();
        const visiting: Set<string> = new Set();

        const visit = (node: string) => {
            if (visited.has(node)) return;
            if (visiting.has(node)) {
                throw new Error(`Circular dependency detected involving resource: ${node}`);
            }

            visiting.add(node);

            const deps = this.dependencies.get(node);
            if (deps) {
                for (const dep of deps) {
                    if (resources.includes(dep)) {
                        visit(dep);
                    }
                }
            }

            visiting.delete(node);
            visited.add(node);
            order.push(node);
        };

        for (const resource of resources) {
            visit(resource);
        }

        return order;
    }
}
