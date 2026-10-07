import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import canonicalize from 'canonicalize';

export type TransactionStatus =
    | 'PENDING'
    | 'RUNNING'
    | 'SUCCESS'
    | 'FAILED';

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
    | 'AUTHORIZATION_DENIED'
    | 'DRY_RUN_COMPLETE'
    | 'VERIFICATION_FAILED'
    | 'FAILED';

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
    state?: {
        phase?: TransactionPhase;
        [key: string]: unknown;
    };
    executionReceipt?: unknown;
    certificationReceipt?: unknown;
    updatedAt: string;
}

const VALID_STATUSES =
    new Set<TransactionStatus>([
        'PENDING',
        'RUNNING',
        'SUCCESS',
        'FAILED'
    ]);

const PHASE_ORDER =
    new Map<TransactionPhase, number>([
        ['CREATED', 10],
        ['BASELINED', 20],
        ['PLANNED', 30],
        ['AUTHORIZED', 40],
        ['APPROVED', 50],
        ['EXECUTING', 60],
        ['EXECUTED', 70],
        ['VERIFYING', 80],
        ['VERIFIED', 90],
        ['CERTIFIED', 100]
    ]);

export class TransactionAuthority {
    private static readonly storeDir =
        process.env.UGONDU_TRANSACTION_DIR ||
        path.join(
            process.env.HOME ||
                process.env.USERPROFILE ||
                process.cwd(),
            '.ugondu',
            'state'
        );

    private static readonly lockWaitMs = 25;

    private static readonly lockStaleMs =
        60_000;

    private static ensureDir(): void {
        fs.mkdirSync(
            this.storeDir,
            {
                recursive: true
            }
        );
    }

    private static canonicalIntent(
        intent: unknown
    ): CanonicalIntent {
        if (
            !intent ||
            typeof intent !== 'object'
        ) {
            throw new Error(
                'INVALID_INTENT'
            );
        }

        const value =
            intent as Record<string, unknown>;

        if (
            typeof value.capabilityId !==
                'string' ||
            value.capabilityId.length === 0
        ) {
            throw new Error(
                'INVALID_INTENT_CAPABILITY'
            );
        }

        if (
            typeof value.target !==
                'string' ||
            value.target.length === 0
        ) {
            throw new Error(
                'INVALID_INTENT_TARGET'
            );
        }

        if (
            typeof value.repositoryPath !==
                'string' ||
            value.repositoryPath.length === 0
        ) {
            throw new Error(
                'INVALID_INTENT_REPOSITORY_PATH'
            );
        }

        if (
            !Array.isArray(
                value.authorizedActions
            )
        ) {
            throw new Error(
                'INVALID_INTENT_AUTHORIZED_ACTIONS'
            );
        }

        return {
            capabilityId:
                value.capabilityId,
            target:
                value.target,
            repositoryPath:
                value.repositoryPath,
            authorizedActions:
                Array.from(
                    new Set(
                        value.authorizedActions
                            .map(
                                item =>
                                    String(item)
                            )
                    )
                ).sort()
        };
    }

    public static hashIntent(
        intent: unknown
    ): string {
        const canonical =
            this.canonicalIntent(
                intent
            );

        const serialized =
            canonicalize(canonical);

        if (!serialized) {
            throw new Error(
                'CANONICAL_INTENT_SERIALIZATION_FAILED'
            );
        }

        return crypto
            .createHash('sha256')
            .update(
                serialized,
                'utf8'
            )
            .digest('hex');
    }

    public static create(
        intent: unknown
    ): PersistedTransaction {
        this.ensureDir();

        const canonicalIntent =
            this.canonicalIntent(
                intent
            );

        const intentHash =
            this.hashIntent(
                canonicalIntent
            );

        const id =
            `txn-${crypto.randomBytes(16).toString('hex')}`;

        const txn: PersistedTransaction = {
            schemaVersion: 1,
            id,
            revision: 1,
            status: 'PENDING',
            intent: canonicalIntent,
            intentHash,
            state: {
                phase: 'CREATED'
            },
            updatedAt:
                new Date().toISOString()
        };

        this.writeAtomic(txn);

        return txn;
    }

    public static get(
        id: string
    ): PersistedTransaction {
        this.ensureDir();

        if (
            !/^[A-Za-z0-9_-]+$/.test(id)
        ) {
            throw new Error(
                'INVALID_TRANSACTION_ID'
            );
        }

        const file =
            this.filePath(id);

        if (
            !fs.existsSync(file)
        ) {
            throw new Error(
                'TRANSACTION_NOT_FOUND'
            );
        }

        let txn: PersistedTransaction;

        try {
            txn =
                JSON.parse(
                    fs.readFileSync(
                        file,
                        'utf8'
                    )
                ) as PersistedTransaction;
        } catch {
            throw new Error(
                'TRANSACTION_STATE_CORRUPTED'
            );
        }

        this.validate(txn);

        return txn;
    }

    public static update(
        id: string,
        expectedRevision: number,
        updates: Partial<
            Omit<
                PersistedTransaction,
                'id' |
                'revision' |
                'schemaVersion' |
                'intentHash'
            >
        >
    ): PersistedTransaction {
        if (
            !Number.isInteger(
                expectedRevision
            ) ||
            expectedRevision < 1
        ) {
            throw new Error(
                'INVALID_EXPECTED_REVISION'
            );
        }

        return this.withLock(
            id,
            () => {
                const current =
                    this.get(id);

                if (
                    current.revision !==
                    expectedRevision
                ) {
                    throw new Error(
                        'TRANSACTION_REVISION_CONFLICT'
                    );
                }

                if (
                    updates.status
                ) {
                    this.assertStatusTransition(
                        current.status,
                        updates.status
                    );
                }

                const currentPhase =
                    current.state?.phase;

                const nextPhase =
                    updates.state?.phase;

                if (
                    currentPhase &&
                    nextPhase
                ) {
                    this.assertPhaseTransition(
                        currentPhase,
                        nextPhase
                    );
                }

                const next: PersistedTransaction = {
                    ...current,
                    ...updates,
                    revision:
                        current.revision + 1,
                    updatedAt:
                        new Date().toISOString()
                };

                if (
                    next.plan !==
                    undefined
                ) {
                    const serialized =
                        canonicalize(
                            next.plan
                        );

                    if (!serialized) {
                        throw new Error(
                            'TRANSACTION_PLAN_CANONICALIZATION_FAILED'
                        );
                    }

                    next.planHash =
                        crypto
                            .createHash(
                                'sha256'
                            )
                            .update(
                                serialized,
                                'utf8'
                            )
                            .digest('hex');
                }

                this.validate(next);
                this.writeAtomic(next);

                return next;
            }
        );
    }

    private static withLock<T>(
        id: string,
        action: () => T
    ): T {
        this.ensureDir();

        const lock =
            this.lockPath(id);

        const owner =
            `${process.pid}:${crypto.randomUUID()}`;

        const started =
            Date.now();

        while (true) {
            try {
                const fd =
                    fs.openSync(
                        lock,
                        'wx'
                    );

                try {
                    fs.writeFileSync(
                        fd,
                        owner,
                        'utf8'
                    );
                    fs.fsyncSync(fd);
                } finally {
                    fs.closeSync(fd);
                }

                break;
            } catch (error) {
                if (
                    (error as NodeJS.ErrnoException)
                        .code !== 'EEXIST'
                ) {
                    throw error;
                }

                if (
                    this.isStaleLock(lock)
                ) {
                    try {
                        fs.unlinkSync(lock);
                        continue;
                    } catch {
                        continue;
                    }
                }

                if (
                    Date.now() - started >
                    30_000
                ) {
                    throw new Error(
                        'TRANSACTION_LOCK_TIMEOUT'
                    );
                }

                this.sleep(
                    this.lockWaitMs
                );
            }
        }

        try {
            return action();
        } finally {
            try {
                const content =
                    fs.readFileSync(
                        lock,
                        'utf8'
                    );

                if (
                    content === owner
                ) {
                    fs.unlinkSync(
                        lock
                    );
                }
            } catch {
                // Lock already removed.
            }
        }
    }

    private static sleep(
        milliseconds: number
    ): void {
        const shared =
            new SharedArrayBuffer(4);

        const view =
            new Int32Array(shared);

        Atomics.wait(
            view,
            0,
            0,
            milliseconds
        );
    }

    private static isStaleLock(
        lock: string
    ): boolean {
        try {
            const stat =
                fs.statSync(lock);

            return (
                Date.now() -
                stat.mtimeMs >
                this.lockStaleMs
            );
        } catch {
            return false;
        }
    }

    private static assertStatusTransition(
        current: TransactionStatus,
        next: TransactionStatus
    ): void {
        if (!VALID_STATUSES.has(next)) {
            throw new Error(
                'INVALID_TRANSACTION_STATUS'
            );
        }

        if (
            current === 'SUCCESS'
        ) {
            throw new Error(
                'TERMINAL_TRANSACTION_CANNOT_TRANSITION'
            );
        }

        if (
            current === 'PENDING' &&
            !['RUNNING', 'FAILED']
                .includes(next)
        ) {
            throw new Error(
                `INVALID_TRANSACTION_TRANSITION_${current}_TO_${next}`
            );
        }

        if (
            current === 'RUNNING' &&
            !['SUCCESS', 'FAILED']
                .includes(next)
        ) {
            throw new Error(
                `INVALID_TRANSACTION_TRANSITION_${current}_TO_${next}`
            );
        }

        if (
            current === 'FAILED' &&
            next !== 'RUNNING'
        ) {
            throw new Error(
                `INVALID_TRANSACTION_TRANSITION_${current}_TO_${next}`
            );
        }
    }

    private static assertPhaseTransition(
        current: TransactionPhase,
        next: TransactionPhase
    ): void {
        if (
            current === next
        ) {
            return;
        }

        const currentOrder =
            PHASE_ORDER.get(
                current
            );

        const nextOrder =
            PHASE_ORDER.get(
                next
            );

        if (
            currentOrder ===
                undefined ||
            nextOrder ===
                undefined
        ) {
            if (
                current !== next
            ) {
                throw new Error(
                    'INVALID_TRANSACTION_PHASE'
                );
            }

            return;
        }

        if (
            nextOrder <
            currentOrder
        ) {
            throw new Error(
                'TRANSACTION_PHASE_REGRESSION'
            );
        }
    }

    private static validate(
        txn: PersistedTransaction
    ): void {
        if (
            txn.schemaVersion !== 1 ||
            typeof txn.id !== 'string' ||
            typeof txn.revision !== 'number' ||
            !Number.isInteger(
                txn.revision
            ) ||
            txn.revision < 1 ||
            !VALID_STATUSES.has(
                txn.status
            ) ||
            !txn.intent ||
            typeof txn.intentHash !==
                'string'
        ) {
            throw new Error(
                'INVALID_TRANSACTION_STATE'
            );
        }

        const recalculated =
            this.hashIntent(
                txn.intent
            );

        if (
            recalculated !==
            txn.intentHash
        ) {
            throw new Error(
                'TRANSACTION_INTENT_BINDING_BROKEN'
            );
        }

        if (
            txn.plan !==
            undefined
        ) {
            if (
                typeof txn.planHash !==
                    'string'
            ) {
                throw new Error(
                    'TRANSACTION_PLAN_HASH_MISSING'
                );
            }

            const serialized =
                canonicalize(
                    txn.plan
                );

            if (!serialized) {
                throw new Error(
                    'TRANSACTION_PLAN_CANONICALIZATION_FAILED'
                );
            }

            const recalculatedPlan =
                crypto
                    .createHash('sha256')
                    .update(
                        serialized,
                        'utf8'
                    )
                    .digest('hex');

            if (
                recalculatedPlan !==
                txn.planHash
            ) {
                throw new Error(
                    'TRANSACTION_PLAN_BINDING_BROKEN'
                );
            }
        }
    }

    private static filePath(
        id: string
    ): string {
        return path.join(
            this.storeDir,
            `${id}.json`
        );
    }

    private static lockPath(
        id: string
    ): string {
        return path.join(
            this.storeDir,
            `${id}.lock`
        );
    }

    private static writeAtomic(
        txn: PersistedTransaction
    ): void {
        this.ensureDir();

        const file =
            this.filePath(
                txn.id
            );

        const temporary =
            `${file}.${process.pid}.${crypto.randomUUID()}.tmp`;

        const fd =
            fs.openSync(
                temporary,
                'w'
            );

        try {
            fs.writeFileSync(
                fd,
                JSON.stringify(
                    txn,
                    null,
                    2
                ),
                'utf8'
            );

            fs.fsyncSync(fd);
        } finally {
            fs.closeSync(fd);
        }

        fs.renameSync(
            temporary,
            file
        );
    }
}
