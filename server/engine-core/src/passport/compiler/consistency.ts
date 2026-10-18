/******************************************************************************
 * Project        : Ugondu
 * Module         : Passport Compiler & Evidence
 * File           : consistency.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-18
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Corporate Policy Governed
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
export interface DependencyManifest {
    componentId: string;
    version: string;
    dependencies: Record<string, string>; // id -> version
}

/**
 * @class ConsistencyChecker
 * @description Corporate Governed class implementation for ConsistencyChecker
 * @classification ENTERPRISE
 */
export class ConsistencyChecker {
    public static checkVersions(manifests: DependencyManifest[]): boolean {
        const resolvedVersions: Record<string, string> = {};

        for (const manifest of manifests) {
            if (resolvedVersions[manifest.componentId] && resolvedVersions[manifest.componentId] !== manifest.version) {
                return false; // Conflicting versions for the same component
            }
            resolvedVersions[manifest.componentId] = manifest.version;
        }

        for (const manifest of manifests) {
            for (const [depId, depVersion] of Object.entries(manifest.dependencies)) {
                if (resolvedVersions[depId] && resolvedVersions[depId] !== depVersion) {
                    return false; // Dependency requirement conflicts with resolved version
                }
            }
        }

        return true;
    }
}
