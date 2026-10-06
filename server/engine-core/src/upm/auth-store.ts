/******************************************************************************
 * Project        : Ugondu - Universal Delivery Operating System
 * Module         : Server / Engine Core / UPM Auth Store
 * File           : auth-store.ts
 * Version        : 2.0.0
 * Author         : Air Roofers Engineering
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-10-04
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Standards: ISO 27001, SOC 2, OWASP ASVS, NIST
 * Copyright (c) 2026 Air Roofers
 * All Rights Reserved.
 ******************************************************************************/

import { Logger, __t } from '@ugondu/shared';
import * as fs from 'fs';
import * as path from 'path';
import { ExecutionAuthorization } from './policy-gate';

/**
 * 6E - Authorization Persistence
 * Interface for securely storing and retrieving cryptographically sealed execution authorizations.
 * This ensures that resumed executions or split CI/CD pipelines can reload the authorization
 * without requiring the UPM to execute a new interactive Policy Decision gate.
 */
export interface IAuthorizationStore {
    save(auth: ExecutionAuthorization): Promise<void>;
    load(authorizationId: string): Promise<ExecutionAuthorization | undefined>;
    revoke(authorizationId: string): Promise<void>;
}

export class FileAuthorizationStore implements IAuthorizationStore {
    private storeDir: string;

    constructor(baseDir: string = '.ugondu/authorizations') {
        this.storeDir = path.resolve(process.cwd(), baseDir);
        if (!fs.existsSync(this.storeDir)) {
            fs.mkdirSync(this.storeDir, { recursive: true });
        }
    }

    private getFilePath(id: string): string {
        // Enforce safe filename
        const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '');
        return path.join(this.storeDir, `${safeId}.auth.json`);
    }

    public async save(auth: ExecutionAuthorization): Promise<void> {
        const filePath = this.getFilePath(auth.authorizationId);

        const payload = JSON.stringify(auth, null, 2);
        await fs.promises.writeFile(filePath, payload, 'utf8');

        Logger.info(__t('messages.upm.authorization_saved', { id: auth.authorizationId }));
    }

    public async load(authorizationId: string): Promise<ExecutionAuthorization | undefined> {
        const filePath = this.getFilePath(authorizationId);

        if (!fs.existsSync(filePath)) {
            return undefined;
        }

        try {
            const data = await fs.promises.readFile(filePath, 'utf8');
            const auth: ExecutionAuthorization = JSON.parse(data);

            // Rehydrate Date objects
            auth.expiresAt = new Date(auth.expiresAt);
            auth.decision.timestamp = new Date(auth.decision.timestamp);

            return auth;
        } catch (error) {
            Logger.error(__t('messages.error.authorization_load_failed', { id: authorizationId, error: String(error) }));
            return undefined;
        }
    }

    public async revoke(authorizationId: string): Promise<void> {
        const filePath = this.getFilePath(authorizationId);
        if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
            Logger.info(__t('messages.upm.authorization_revoked', { id: authorizationId }));
        }
    }
}
