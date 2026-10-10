/******************************************************************************
 * Project        : Ugondu
 * Module         : Passport Compiler & Evidence
 * File           : integrity.ts
 * Version        : 1.0.0
 * Author         : Antigravity Autonomous Engineer
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
import { generateDigest, verifyDigest } from './digest';

/**
 * @interface IntegrityManifest
 * @description Corporate Governed interface implementation for IntegrityManifest
 * @classification ENTERPRISE
 */
export interface IntegrityManifest {
    files: Record<string, string>; // path -> hash
    rootHash: string;
}

/**
 * @class IntegrityValidator
 * @description Corporate Governed class implementation for IntegrityValidator
 * @classification ENTERPRISE
 */
export class IntegrityValidator {
    public static generateManifest(fileContents: Record<string, string | Buffer>): IntegrityManifest {
        const files: Record<string, string> = {};
        const hashes: string[] = [];
        const sortedPaths = Object.keys(fileContents).sort();

        for (const path of sortedPaths) {
            const content = fileContents[path];
            const hash = generateDigest(content);
            files[path] = hash;
            hashes.push(`${path}:${hash}`);
        }

        const rootHash = generateDigest(hashes.join('\n'));
        return { files, rootHash };
    }

    public static verifyManifest(manifest: IntegrityManifest, fileContents: Record<string, string | Buffer>): boolean {
        const sortedPaths = Object.keys(manifest.files).sort();
        const hashes: string[] = [];

        for (const path of sortedPaths) {
            if (!(path in fileContents)) return false;
            const content = fileContents[path];
            const hash = generateDigest(content);
            if (hash !== manifest.files[path]) return false;
            hashes.push(`${path}:${hash}`);
        }

        const expectedRootHash = generateDigest(hashes.join('\n'));
        return expectedRootHash === manifest.rootHash;
    }
}
