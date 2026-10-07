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
        if (!fs.existsSync(this.storeDir)) {
            fs.mkdirSync(this.storeDir, { recursive: true });
        }
    }

    public static create(intent: any): PersistedTransaction {
        this.ensureDir();
        const id = `txn-${crypto.randomBytes(8).toString('hex')}`;
        const intentHash = crypto.createHash('sha256').update(JSON.stringify(intent)).digest('hex');
        const txn: PersistedTransaction = { id, status: 'PENDING', intent, intentHash };
        fs.writeFileSync(path.join(this.storeDir, `${id}.json`), JSON.stringify(txn, null, 2));
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
        fs.writeFileSync(path.join(this.storeDir, `${id}.json`), JSON.stringify(txn, null, 2));
        return txn;
    }
}
