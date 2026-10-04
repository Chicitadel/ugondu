import { Logger } from '@ugondu/shared';
/******************************************************************************
 * Project        : Ugondu
 * Module         : URRE
 * File           : atomic-data.ts
 * Version        : 1.0.0
 * Author         : Architecture Authority
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

// @ts-ignore
import { __t } from '@ugondu/shared';

import * as fs from 'fs';
import * as crypto from 'crypto';
import * as path from 'path';

/**
 * @interface MutationRequest
 * @description Corporate Governed interface implementation for MutationRequest
 * @classification ENTERPRISE
 */
export interface MutationRequest {
    sourcePath: string;
    targetPath: string;
    stagingDir: string;
}

/**
 * @class AtomicDataTransaction
 * @description Corporate Governed class implementation for AtomicDataTransaction
 * @classification ENTERPRISE
 */
export class AtomicDataTransaction {
    /**
     * Generates a SHA-256 hash for the given file.
     */
    private async calculateHash(filePath: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const hash = crypto.createHash('sha256');
            const stream = fs.createReadStream(filePath);
            stream.on('error', err => reject(err));
            stream.on('data', chunk => hash.update(chunk));
            stream.on('end', () => resolve(hash.digest('hex')));
        });
    }

    /**
     * Executes the mandatory transaction protocol for file mutations.
     * Protocol: SOURCE -> STAGING -> TRANSFER -> SIZE VERIFY -> HASH VERIFY -> FSYNC -> ATOMIC COMMIT (rename) -> POST-COMMIT VERIFY
     */
    public async execute(request: MutationRequest): Promise<boolean> {
        const { sourcePath, targetPath, stagingDir } = request;
        const stagingPath = path.join(stagingDir, `${path.basename(targetPath)}.staging.${Date.now()}`);

        try {
            // 1. SOURCE & 2. STAGING
            if (!fs.existsSync(stagingDir)) {
                await fs.promises.mkdir(stagingDir, { recursive: true });
            }

            // 3. TRANSFER
            await fs.promises.copyFile(sourcePath, stagingPath);

            // 4. SIZE VERIFY
            const sourceStat = await fs.promises.stat(sourcePath);
            const stagingStat = await fs.promises.stat(stagingPath);
            
            if (sourceStat.size !== stagingStat.size) {
                throw new Error(__t('messages.error.size_verification_failed_during_transfer'));
            }

            // 5. HASH VERIFY
            const sourceHash = await this.calculateHash(sourcePath);
            const stagingHash = await this.calculateHash(stagingPath);

            if (sourceHash !== stagingHash) {
                throw new Error(__t('messages.error.hash_verification_failed_during_transfer'));
            }

            // 6. FSYNC
            const fd = await fs.promises.open(stagingPath, 'r+');
            await fd.datasync();
            await fd.close();

            // 7. ATOMIC COMMIT (rename)
            await fs.promises.rename(stagingPath, targetPath);

            // 8. POST-COMMIT VERIFY
            if (!fs.existsSync(targetPath)) {
                throw new Error(__t('messages.error.post_commit_verification_failed_target_file_n'));
            }
            
            const targetHash = await this.calculateHash(targetPath);
            if (targetHash !== sourceHash) {
                throw new Error(__t('messages.error.post_commit_verification_failed_hash_mismatch'));
            }

            return true;
        } catch (error) {
            // Cleanup staging if it exists
            if (fs.existsSync(stagingPath)) {
                await fs.promises.unlink(stagingPath).catch((e) => Logger.warn(__t('failed_to_unlink_staging_path') + String(e)));
            }
            throw error;
        }
    }
}
