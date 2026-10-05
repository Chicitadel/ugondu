import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { TransactionDag } from './transaction-dag';

export class TransactionStore {
    private readonly stateDir: string;

    constructor(customDir?: string) {
        // Defaults to ~/.ugondu/state/
        this.stateDir = customDir || path.join(os.homedir(), '.ugondu', 'state');
        if (!fs.existsSync(this.stateDir)) {
            fs.mkdirSync(this.stateDir, { recursive: true });
        }
    }

    public async save(tx: TransactionDag): Promise<void> {
        tx.updatedAt = Date.now();
        const file = path.join(this.stateDir, `${tx.id}.json`);
        // Atomic write via a temporary file to prevent corruption on crash
        const tempFile = `${file}.tmp`;
        fs.writeFileSync(tempFile, JSON.stringify(tx, null, 2), 'utf8');
        fs.renameSync(tempFile, file);
    }

    public async load(txId: string): Promise<TransactionDag | null> {
        const file = path.join(this.stateDir, `${txId}.json`);
        if (!fs.existsSync(file)) return null;
        try {
            const data = fs.readFileSync(file, 'utf8');
            return JSON.parse(data) as TransactionDag;
        } catch {
            return null;
        }
    }
}
