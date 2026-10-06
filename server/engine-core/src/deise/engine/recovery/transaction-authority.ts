import * as crypto from 'crypto';

export interface PersistedTransaction {
    id: string;
    status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';
    intent: any;
    plan?: any;
    state?: any;
}

export class TransactionAuthority {
    private static store = new Map<string, PersistedTransaction>();

    public static create(intent: any): PersistedTransaction {
        const id = `txn-${crypto.randomBytes(8).toString('hex')}`;
        const txn: PersistedTransaction = { id, status: 'PENDING', intent };
        this.store.set(id, txn);
        return txn;
    }

    public static get(id: string): PersistedTransaction {
        const txn = this.store.get(id);
        if (!txn) throw new Error(`Transaction ${id} not found`);
        return txn;
    }

    public static update(id: string, updates: Partial<PersistedTransaction>): PersistedTransaction {
        const txn = this.get(id);
        Object.assign(txn, updates);
        return txn;
    }
}