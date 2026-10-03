/******************************************************************************
 * Project        : URRE-2
 * Module         : engine-core/urre/journal
 * File           : integrity.ts
 * Version        : 1.0.0
 * Author         : Air Roofers Engineering Team
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
import * as fs from 'fs';

/**
 * @class IntegrityManager
 * @description Corporate Governed class implementation for IntegrityManager
 * @classification ENTERPRISE
 */
export class IntegrityManager {
    public static generateHash(sequenceNumber: number, timestamp: number, operationType: string, payload: any, previousHash: string = ''): string {
        const data = `${sequenceNumber}:${timestamp}:${operationType}:${JSON.stringify(payload)}:${previousHash}`;
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    public static async safeCommit(tempFilePath: string, targetFilePath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            fs.rename(tempFilePath, targetFilePath, (err) => {
                if (err) return reject(err);
                resolve();
            });
        });
    }

    public static detectCorruption(entries: any[]): boolean {
        let previousHash = '';
        for (const entry of entries) {
            const expectedHash = this.generateHash(
                entry.sequenceNumber,
                entry.timestamp,
                entry.operationType,
                entry.payload,
                previousHash
            );
            if (entry.hash !== expectedHash) {
                return true;
            }
            previousHash = entry.hash;
        }
        return false;
    }
}
