/******************************************************************************
 * Project        : ugondu
 * Module         : engine-core/discovery/orchestrator
 * File           : cancellation.ts
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

export class CancellationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'CancellationError';
    }
}

export class CancellationToken {
    private _isCancelled: boolean = false;
    private listeners: Array<() => void> = [];

    public get isCancelled(): boolean {
        return this._isCancelled;
    }

    public cancel(): void {
        if (this._isCancelled) return;
        this._isCancelled = true;
        for (const listener of this.listeners) {
            listener();
        }
        this.listeners = [];
    }

    public register(listener: () => void): void {
        if (this._isCancelled) {
            listener();
            return;
        }
        this.listeners.push(listener);
    }

    public throwIfCancelled(): void {
        if (this._isCancelled) {
            throw new CancellationError('Operation was cancelled');
        }
    }
}

export class TimeoutManager {
    public static runWithTimeout<T>(
        operation: (token: CancellationToken) => Promise<T>,
        timeoutMs: number,
        parentToken?: CancellationToken
    ): Promise<T> {
        const token = new CancellationToken();
        if (parentToken) {
            parentToken.register(() => token.cancel());
        }

        return new Promise<T>((resolve, reject) => {
            const timer = setTimeout(() => {
                token.cancel();
                reject(new CancellationError(`Operation timed out after ${timeoutMs}ms`));
            }, timeoutMs);

            token.register(() => {
                clearTimeout(timer);
                reject(new CancellationError('Operation was cancelled'));
            });

            operation(token)
                .then((result) => {
                    clearTimeout(timer);
                    resolve(result);
                })
                .catch((err) => {
                    clearTimeout(timer);
                    reject(err);
                });
        });
    }
}
