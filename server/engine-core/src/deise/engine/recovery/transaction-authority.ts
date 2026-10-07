import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface PersistedTransaction {
    id: string;
    status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';
    intent: any;
    intentHash: string;
    plan?: any;
    state?: any;
}

export class TransactionAuthority {
    private static storeDir = path.join(process.cwd(), '.ugondu_transactions');

    private static ensureDir() {
        if (!fs.existsSync(this.storeDir)) fs.mkdirSync(this.storeDir, { recursive: true });
    }

    public static create(intent: any): PersistedTransaction {
        this.ensureDir();
        const id = `txn-${crypto.randomBytes(8).toString('hex')}`;
        const pureIntent = { capabilityId: intent.capabilityId, target: intent.target, authorizedActions: intent.authorizedActions };
        const intentHash = crypto.createHash('sha256').update(JSON.stringify(pureIntent)).digest('hex');
        const txn: PersistedTransaction = { id, status: 'PENDING', intent, intentHash };
        this.writeAtomic(id, txn);
        return txn;
    }

    public static get(id: string): PersistedTransaction {
        this.ensureDir();
        const file = path.join(this.storeDir, `${id}.json`);
        if (!fs.existsSync(file)) throw new Error(`Transaction ${id} not found`);
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    }

    public static update(id: string, updates: Partial<PersistedTransaction>): PersistedTransaction {
        const txn = this.get(id);
        Object.assign(txn, updates);
        this.writeAtomic(id, txn);
        return txn;
    }

    private static writeAtomic(id: string, data: any) {
        const file = path.join(this.storeDir, `${id}.json`);
        const tmp = file + '.tmp';
        fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
        fs.renameSync(tmp, file);
    }
}
