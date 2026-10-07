import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import canonicalize from 'canonicalize';

export type TransactionStatus =
    | 'PENDING'
    | 'RUNNING'
    | 'SUCCESS'
    | 'FAILED' | 'RUNNING' | 'AUTHORIZATION_DENIED' | 'DRY_RUN_COMPLETE' | 'VERIFICATION_FAILED';

export type TransactionPhase =
    | 'CREATED'
    | 'BASELINED'
    | 'PLANNED'
    | 'AUTHORIZED'
    | 'APPROVED'
    | 'EXECUTING'
    | 'EXECUTED'
    | 'VERIFYING'
    | 'VERIFIED'
    | 'CERTIFIED'
    | 'FAILED' | 'RUNNING' | 'AUTHORIZATION_DENIED' | 'DRY_RUN_COMPLETE' | 'VERIFICATION_FAILED';

export interface CanonicalIntent {
    capabilityId: string;
    target: string;
    repositoryPath: string;
    authorizedActions: string[];
}

export interface PersistedTransaction {
    schemaVersion: 1;
    id: string;
    revision: number;
    status: TransactionStatus;
    intent: CanonicalIntent;
    intentHash: string;
    plan?: unknown;
    planHash?: string;
    state?: { phase?: TransactionPhase; [key: string]: any };
    executionReceipt?: unknown;
    certificationReceipt?: unknown;
    updatedAt: string;
}

export class TransactionAuthority {
    private static readonly storeDir =
        process.env.UGONDU_TRANSACTION_DIR ||
        path.join(
            process.env.HOME || process.env.USERPROFILE || process.cwd(),
            '.ugondu',
            'state'
        );

    private static ensureDir(): void {
        fs.mkdirSync(this.storeDir, { recursive: true });
    }

    private static canonicalIntent(intent: any): CanonicalIntent {
        if (!intent || typeof intent !== 'object') {
            throw new Error('INVALID_INTENT');
        }

        if (typeof intent.capabilityId !== 'string' || !intent.capabilityId) {
            throw new Error('INVALID_INTENT_CAPABILITY');
        }

        if (typeof intent.target !== 'string' || !intent.target) {
            throw new Error('INVALID_INTENT_TARGET');
        }

        if (typeof intent.repositoryPath !== 'string' || !intent.repositoryPath) {
            throw new Error('INVALID_INTENT_REPOSITORY_PATH');
        }

        if (!Array.isArray(intent.authorizedActions)) {
            throw new Error('INVALID_INTENT_AUTHORIZED_ACTIONS');
        }

        return {
            capabilityId: intent.capabilityId,
            target: intent.target,
            repositoryPath: intent.repositoryPath,
            authorizedActions: Array.from(new Set(intent.authorizedActions.map((v: unknown) => String(v)))).sort() as string[]
        };
    }

    public static hashIntent(intent: any): string {
        const canonical = this.canonicalIntent(intent);
        const serialized = canonicalize(canonical);

        if (!serialized) {
            throw new Error('CANONICAL_INTENT_SERIALIZATION_FAILED');
        }

        return crypto
            .createHash('sha256')
            .update(serialized, 'utf8')
            .digest('hex');
    }

    public static create(intent: any): PersistedTransaction {
        this.ensureDir();

        const canonicalIntent = this.canonicalIntent(intent);
        const intentHash = this.hashIntent(canonicalIntent);
        const id = `txn-${crypto.randomBytes(16).toString('hex')}`;

        const txn: PersistedTransaction = {
            schemaVersion: 1,
            id,
            revision: 1,
            status: 'PENDING',
            intent: canonicalIntent,
            intentHash,
            state: { phase: 'CREATED' },
            updatedAt: new Date().toISOString()
        };

        this.writeAtomic(txn);
        return txn;
    }

    public static get(id: string): PersistedTransaction {
        this.ensureDir();

        if (!/^[A-Za-z0-9_-]+$/.test(id)) {
            throw new Error('INVALID_TRANSACTION_ID');
        }

        const file = this.filePath(id);

        if (!fs.existsSync(file)) {
            throw new Error(`Transaction ${id} not found`);
        }

        let txn: PersistedTransaction;

        try {
            txn = JSON.parse(fs.readFileSync(file, 'utf8'));
        } catch {
            throw new Error('TRANSACTION_STATE_CORRUPTED');
        }

        this.validate(txn);
        return txn;
    }

    public static update(
        id: string,
        expectedRevision: number,
        updates: Partial<Omit<PersistedTransaction, 'id' | 'revision' | 'schemaVersion' | 'intentHash'>>
    ): PersistedTransaction {
        const current = this.get(id);

        if (current.revision !== expectedRevision) {
            throw new Error('TRANSACTION_REVISION_CONFLICT');
        }

        if (updates.status) {
            this.assertTransition(current.status, updates.status);
        }

        const next: PersistedTransaction = {
            ...current,
            ...updates,
            revision: current.revision + 1,
            updatedAt: new Date().toISOString()
        };

        if (next.plan !== undefined) {
            next.planHash = crypto
                .createHash('sha256')
                .update(canonicalize(next.plan) || '{}', 'utf8')
                .digest('hex');
        }

        this.writeAtomic(next);
        return next;
    }

    private static assertTransition(
        current: TransactionStatus,
        next: TransactionStatus
    ): void {
        if (current === 'SUCCESS') {
            throw new Error('TERMINAL_TRANSACTION_CANNOT_TRANSITION');
        }

        if (current === 'PENDING' && !['RUNNING', 'FAILED'].includes(next)) {
            throw new Error(`INVALID_TRANSACTION_TRANSITION_${current}_TO_${next}`);
        }

        if (current === 'RUNNING' && !['SUCCESS', 'FAILED'].includes(next)) {
            throw new Error(`INVALID_TRANSACTION_TRANSITION_${current}_TO_${next}`);
        }

        if (current === 'FAILED' && next !== 'RUNNING') {
            throw new Error(`INVALID_TRANSACTION_TRANSITION_${current}_TO_${next}`);
        }
    }

    private static validate(txn: PersistedTransaction): void {
        if (
            txn.schemaVersion !== 1 ||
            typeof txn.id !== 'string' ||
            typeof txn.revision !== 'number' ||
            !['PENDING', 'RUNNING', 'SUCCESS', 'FAILED'].includes(txn.status) ||
            !txn.intent ||
            typeof txn.intentHash !== 'string'
        ) {
            throw new Error('INVALID_TRANSACTION_STATE');
        }

        const recalculated = this.hashIntent(txn.intent);

        if (recalculated !== txn.intentHash) {
            throw new Error('TRANSACTION_INTENT_BINDING_BROKEN');
        }

        if (txn.plan !== undefined) {
            if (typeof txn.planHash !== 'string') {
                throw new Error('TRANSACTION_PLAN_HASH_MISSING');
            }

            const serialized = canonicalize(txn.plan);

            if (!serialized) {
                throw new Error('TRANSACTION_PLAN_CANONICALIZATION_FAILED');
            }

            const recalculatedPlan = crypto
                .createHash('sha256')
                .update(serialized, 'utf8')
                .digest('hex');

            if (recalculatedPlan !== txn.planHash) {
                throw new Error('TRANSACTION_PLAN_BINDING_BROKEN');
            }
        }
    }

    private static filePath(id: string): string {
        return path.join(this.storeDir, `${id}.json`);
    }

    private static writeAtomic(txn: PersistedTransaction): void {
        this.ensureDir();

        const file = this.filePath(txn.id);
        const tmp = `${file}.${process.pid}.${crypto.randomBytes(8).toString('hex')}.tmp`;

        const fd = fs.openSync(tmp, 'w');
        try {
            fs.writeSync(fd, JSON.stringify(txn, null, 2), 0, 'utf8');
            fs.fsyncSync(fd);
        } finally {
            fs.closeSync(fd);
        }

        fs.renameSync(tmp, file);
    }
}

