/******************************************************************************
 * Project        : Ugondu
 * Module         : move/verification
 * File           : certification.ts
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
import * as crypto from 'crypto';
import { __t } from "@ugondu/shared";

/**
 * @interface MigrationCertificate
 * @description Corporate Governed interface implementation for MigrationCertificate
 * @classification ENTERPRISE
 */
export interface MigrationCertificate {
    id: string;
    timestamp: string;
    evidenceHashes: Record<string, string>;
    signature: string;
}

/**
 * @class CertificationAuthority
 * @description Corporate Governed class implementation for CertificationAuthority
 * @classification ENTERPRISE
 */
export class CertificationAuthority {
    private privateKey: string;

    constructor(privateKey: string) {
        this.privateKey = privateKey;
    }

    public async generateCertificate(evidenceDirectory: string): Promise<MigrationCertificate> {
        // In a complete implementation, this would read files from move/evidence
        // and compute their hashes. We abstract it here.
        const evidenceHashes = await this.compileEvidence(evidenceDirectory);

        const timestamp = new Date().toISOString();
        const id = crypto.randomUUID();

        const payload = JSON.stringify({ id, timestamp, evidenceHashes });
        const signature = this.signPayload(payload);

        return {
            id,
            timestamp,
            evidenceHashes,
            signature
        };
    }

    private async compileEvidence(directory: string): Promise<Record<string, string>> {
        const fs = await import('fs/promises');
        const path = await import('path');
        const crypto = await import('crypto');

        try {
            const files = await fs.readdir(directory);
            const evidenceHashes: Record<string, string> = {};

            for (const file of files) {
                const filePath = path.join(directory, file);
                const stat = await fs.stat(filePath);
                if (stat.isFile()) {
                    const content = await fs.readFile(filePath);
                    evidenceHashes[file] = crypto.createHash('sha256').update(content).digest('hex');
                }
            }

            if (Object.keys(evidenceHashes).length === 0) {
                throw new Error(__t('msg_no_compliance_evidence_files_found_in_th'));
            }

            return evidenceHashes;
        } catch (error: any) {
            throw new Error(`Failed to compile microservices compliance evidence: ${error.message}`);
        }
    }

    private signPayload(payload: string): string {
        const sign = crypto.createSign('SHA256');
        sign.update(payload);
        sign.end();
        return sign.sign(this.privateKey, 'hex');
    }
}
